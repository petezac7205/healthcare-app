import { query, getClient } from '../config/db.js';
import { notFound, badRequest, forbidden } from '../utils/errors.js';
import { generatePreVisitSummary, generatePostVisitSummary } from '../services/llmService.js';

export const holdSlot = async (req, res) => {
  const { doctor_id, slot_start } = req.body;
  if (!doctor_id || !slot_start) {
    throw badRequest('doctor_id and slot_start are required');
  }

  // Get doctor's slot_duration_min
  const doctorRes = await query('SELECT slot_duration_min FROM doctor_profiles WHERE id = $1', [doctor_id]);
  if (doctorRes.rows.length === 0) {
    throw notFound('Doctor not found');
  }
  const duration = doctorRes.rows[0].slot_duration_min || 30;

  // Calculate slot_end
  const slotStartDate = new Date(slot_start);
  const slotEndDate = new Date(slotStartDate.getTime() + duration * 60000);

  // Insert appointment - PostgreSQL partial unique index will prevent double-booking (throws 23505)
  const result = await query(
    `INSERT INTO appointments (patient_id, doctor_id, slot_start, slot_end, status, held_until)
     VALUES ($1, $2, $3, $4, 'held', NOW() + INTERVAL '5 minutes')
     RETURNING *`,
    [req.user.id, doctor_id, slotStartDate.toISOString(), slotEndDate.toISOString()]
  );

  res.status(201).json({ appointment: result.rows[0] });
};

export const confirmAppointment = async (req, res) => {
  const { id } = req.params;
  
  const aptRes = await query('SELECT * FROM appointments WHERE id = $1', [id]);
  if (aptRes.rows.length === 0) throw notFound('Appointment not found');
  
  const apt = aptRes.rows[0];
  if (apt.patient_id !== req.user.id) throw forbidden('Not your appointment');
  if (apt.status !== 'held') throw badRequest('Appointment is not in held status');
  if (new Date(apt.held_until) < new Date()) throw badRequest('Hold has expired');

  const updateRes = await query(
    `UPDATE appointments SET status = 'confirmed', held_until = NULL, updated_at = NOW() 
     WHERE id = $1 RETURNING *`,
    [id]
  );
  
  // Get doctor's user_id for notification
  const doctorRes = await query('SELECT user_id FROM doctor_profiles WHERE id = $1', [apt.doctor_id]);
  const doctorUserId = doctorRes.rows[0]?.user_id;

  // Create notification records for both patient and doctor
  if (doctorUserId) {
    await query(
      `INSERT INTO notifications (user_id, appointment_id, type, channel, status) VALUES 
       ($1, $2, 'booking_confirmation', 'email', 'pending'),
       ($3, $2, 'booking_confirmation', 'email', 'pending')`,
      [req.user.id, id, doctorUserId]
    );
  }

  res.json({ appointment: updateRes.rows[0] });
};

export const cancelAppointment = async (req, res) => {
  const { id } = req.params;
  
  const aptRes = await query(`
    SELECT a.*, dp.user_id as doctor_user_id 
    FROM appointments a
    JOIN doctor_profiles dp ON a.doctor_id = dp.id
    WHERE a.id = $1
  `, [id]);
  
  if (aptRes.rows.length === 0) throw notFound('Appointment not found');
  const apt = aptRes.rows[0];
  
  const isPatient = req.user.id === apt.patient_id;
  const isDoctor = req.user.id === apt.doctor_user_id;
  
  if (!isPatient && !isDoctor && req.user.role !== 'admin') {
    throw forbidden('Not authorized to cancel this appointment');
  }

  if (apt.status !== 'held' && apt.status !== 'confirmed') {
    throw badRequest('Appointment cannot be cancelled');
  }

  const updateRes = await query(
    `UPDATE appointments SET status = 'cancelled', updated_at = NOW() 
     WHERE id = $1 RETURNING *`,
    [id]
  );

  // Notify other party
  const notifyUserId = isPatient ? apt.doctor_user_id : apt.patient_id;
  if (notifyUserId) {
    await query(
      `INSERT INTO notifications (user_id, appointment_id, type, channel, status) VALUES 
       ($1, $2, 'cancellation', 'email', 'pending')`,
      [notifyUserId, id]
    );
  }

  res.json({ appointment: updateRes.rows[0] });
};

export const getMyAppointments = async (req, res) => {
  const result = await query(`
    SELECT a.*, u.name as doctor_name, dp.specialisation, sf.llm_urgency
    FROM appointments a
    JOIN doctor_profiles dp ON a.doctor_id = dp.id
    JOIN users u ON dp.user_id = u.id
    LEFT JOIN symptom_forms sf ON a.id = sf.appointment_id
    WHERE a.patient_id = $1
    ORDER BY a.slot_start DESC
  `, [req.user.id]);
  
  res.json({ appointments: result.rows });
};

export const getDoctorAppointments = async (req, res) => {
  const doctorRes = await query('SELECT id FROM doctor_profiles WHERE user_id = $1', [req.user.id]);
  if (doctorRes.rows.length === 0) throw notFound('Doctor profile not found');
  const doctorId = doctorRes.rows[0].id;

  const { date } = req.query;
  
  let text = `
    SELECT a.*, u.name as patient_name, u.email as patient_email, 
           sf.llm_urgency, sf.llm_chief_complaint, sf.raw_text as symptoms
    FROM appointments a
    JOIN users u ON a.patient_id = u.id
    LEFT JOIN symptom_forms sf ON a.id = sf.appointment_id
    WHERE a.doctor_id = $1
  `;
  const values = [doctorId];

  if (date) {
    text += ` AND a.slot_start::date = $2::date`;
    values.push(date);
  }

  text += ` ORDER BY a.slot_start ASC`;
  
  const result = await query(text, values);
  res.json({ appointments: result.rows });
};

export const getAppointmentDetail = async (req, res) => {
  const { id } = req.params;

  const result = await query(`
    SELECT a.*, 
           dp.user_id as doctor_user_id, dp.specialisation,
           du.name as doctor_name,
           pu.name as patient_name, pu.email as patient_email,
           sf.id as sf_id, sf.raw_text, sf.llm_urgency, sf.llm_chief_complaint, sf.llm_questions, sf.llm_ok as sf_llm_ok,
           vn.id as vn_id, vn.doctor_notes, vn.prescription, vn.llm_patient_summary, vn.llm_ok as vn_llm_ok
    FROM appointments a
    JOIN doctor_profiles dp ON a.doctor_id = dp.id
    JOIN users du ON dp.user_id = du.id
    JOIN users pu ON a.patient_id = pu.id
    LEFT JOIN symptom_forms sf ON a.id = sf.appointment_id
    LEFT JOIN visit_notes vn ON a.id = vn.appointment_id
    WHERE a.id = $1
  `, [id]);

  if (result.rows.length === 0) throw notFound('Appointment not found');
  const row = result.rows[0];

  if (req.user.id !== row.patient_id && req.user.id !== row.doctor_user_id && req.user.role !== 'admin') {
    throw forbidden('Not authorized to view this appointment');
  }

  // Structure the response
  const appointment = {
    id: row.id,
    patient_id: row.patient_id,
    doctor_id: row.doctor_id,
    slot_start: row.slot_start,
    slot_end: row.slot_end,
    status: row.status,
    held_until: row.held_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    doctor_name: row.doctor_name,
    patient_name: row.patient_name,
    patient_email: row.patient_email,
    specialisation: row.specialisation
  };

  const symptomForm = row.sf_id ? {
    id: row.sf_id,
    raw_text: row.raw_text,
    llm_urgency: row.llm_urgency,
    llm_chief_complaint: row.llm_chief_complaint,
    llm_questions: row.llm_questions,
    llm_ok: row.sf_llm_ok
  } : null;

  const visitNotes = row.vn_id ? {
    id: row.vn_id,
    doctor_notes: row.doctor_notes,
    prescription: row.prescription,
    llm_patient_summary: row.llm_patient_summary,
    llm_ok: row.vn_llm_ok
  } : null;

  res.json({ appointment, symptomForm, visitNotes });
};

export const submitSymptoms = async (req, res) => {
  const { id } = req.params;
  const { raw_text } = req.body;

  if (!raw_text || !raw_text.trim()) {
    throw badRequest('Symptoms description is required');
  }

  const aptRes = await query('SELECT patient_id, status FROM appointments WHERE id = $1', [id]);
  if (aptRes.rows.length === 0) throw notFound('Appointment not found');
  
  const apt = aptRes.rows[0];
  if (apt.patient_id !== req.user.id) throw forbidden('Not your appointment');
  if (apt.status !== 'held' && apt.status !== 'confirmed') throw badRequest('Invalid appointment status');

  // Check if symptom form already exists
  const existing = await query('SELECT id FROM symptom_forms WHERE appointment_id = $1', [id]);
  if (existing.rows.length > 0) {
    // Update existing and re-run LLM
    const llmResult = await generatePreVisitSummary(raw_text);
    const result = await query(
      `UPDATE symptom_forms SET raw_text = $1, llm_urgency = $2, llm_chief_complaint = $3, llm_questions = $4, llm_ok = $5
       WHERE appointment_id = $6 RETURNING *`,
      [raw_text, llmResult.urgency, llmResult.chief_complaint, JSON.stringify(llmResult.questions), llmResult.ok, id]
    );
    return res.json({ symptomForm: result.rows[0] });
  }

  // Generate LLM pre-visit summary (never throws)
  const llmResult = await generatePreVisitSummary(raw_text);

  const result = await query(`
    INSERT INTO symptom_forms (appointment_id, raw_text, llm_urgency, llm_chief_complaint, llm_questions, llm_ok)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [id, raw_text, llmResult.urgency, llmResult.chief_complaint, JSON.stringify(llmResult.questions), llmResult.ok]);

  res.status(201).json({ symptomForm: result.rows[0] });
};

export const submitVisitNotes = async (req, res) => {
  const { id } = req.params;
  const { doctor_notes, prescription } = req.body;

  if (!doctor_notes || !doctor_notes.trim()) {
    throw badRequest('Doctor notes are required');
  }

  const aptRes = await query(`
    SELECT a.*, dp.user_id as doctor_user_id 
    FROM appointments a
    JOIN doctor_profiles dp ON a.doctor_id = dp.id
    WHERE a.id = $1
  `, [id]);
  if (aptRes.rows.length === 0) throw notFound('Appointment not found');
  
  const apt = aptRes.rows[0];
  if (req.user.id !== apt.doctor_user_id) throw forbidden('Not your appointment');
  if (apt.status !== 'confirmed') throw badRequest('Appointment must be confirmed to submit notes');

  // Generate LLM post-visit summary (never throws)
  const llmResult = await generatePostVisitSummary(doctor_notes, prescription);

  // Use transaction for status update + notes insertion
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    await client.query(
      `UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [id]
    );
    
    const noteRes = await client.query(`
      INSERT INTO visit_notes (appointment_id, doctor_notes, prescription, llm_patient_summary, llm_ok)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [id, doctor_notes, JSON.stringify(prescription || []), llmResult.summary, llmResult.ok]);

    // Create notification for patient
    await client.query(
      `INSERT INTO notifications (user_id, appointment_id, type, channel, status)
       VALUES ($1, $2, 'visit_completed', 'email', 'pending')`,
      [apt.patient_id, id]
    );

    await client.query('COMMIT');
    res.status(201).json({ visitNote: noteRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
