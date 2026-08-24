import bcrypt from 'bcrypt';
import { query, getClient } from '../config/db.js';
import { badRequest, notFound } from '../utils/errors.js';

export const createDoctor = async (req, res) => {
  const { name, email, password, phone, specialisation, bio, slot_duration_min } = req.body;
  if (!name || !email || !password) {
    throw badRequest('Name, email and password are required');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw badRequest('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role',
      [name, email, hashedPassword, phone, 'doctor']
    );
    const userId = userResult.rows[0].id;

    const profileResult = await client.query(
      'INSERT INTO doctor_profiles (user_id, specialisation, bio, slot_duration_min) VALUES ($1, $2, $3, $4) RETURNING id, specialisation, bio, slot_duration_min',
      [userId, specialisation, bio, slot_duration_min]
    );

    await client.query('COMMIT');
    res.status(201).json({
      doctor: {
        ...userResult.rows[0],
        profile: profileResult.rows[0]
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listDoctors = async (req, res) => {
  const result = await query(`
    SELECT dp.id, u.id as user_id, u.name, u.email, u.phone, 
           dp.specialisation, dp.bio, dp.slot_duration_min
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    WHERE u.role = 'doctor'
  `);
  res.json({ doctors: result.rows });
};

export const getDoctor = async (req, res) => {
  const { id } = req.params;
  const result = await query(`
    SELECT dp.id, u.id as user_id, u.name, u.email, u.phone, 
           dp.specialisation, dp.bio, dp.slot_duration_min
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    WHERE dp.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    throw notFound('Doctor not found');
  }
  res.json({ doctor: result.rows[0] });
};

export const updateDoctor = async (req, res) => {
  const { id } = req.params;
  const { name, phone, specialisation, bio, slot_duration_min } = req.body;
  
  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    const profileCheck = await client.query('SELECT user_id FROM doctor_profiles WHERE id = $1', [id]);
    if (profileCheck.rows.length === 0) {
      throw notFound('Doctor not found');
    }
    const userId = profileCheck.rows[0].user_id;

    if (name || phone) {
      await client.query(
        'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3',
        [name, phone, userId]
      );
    }
    
    const profileUpdate = await client.query(`
      UPDATE doctor_profiles 
      SET specialisation = COALESCE($1, specialisation), 
          bio = COALESCE($2, bio), 
          slot_duration_min = COALESCE($3, slot_duration_min)
      WHERE id = $4
      RETURNING id, specialisation, bio, slot_duration_min
    `, [specialisation, bio, slot_duration_min, id]);

    await client.query('COMMIT');
    res.json({ message: 'Doctor updated successfully', profile: profileUpdate.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const deleteDoctor = async (req, res) => {
  const { id } = req.params;
  const profileCheck = await query('SELECT user_id FROM doctor_profiles WHERE id = $1', [id]);
  if (profileCheck.rows.length === 0) {
    throw notFound('Doctor not found');
  }
  
  // CASCADE will delete doctor_profile
  await query('DELETE FROM users WHERE id = $1', [profileCheck.rows[0].user_id]);
  res.json({ message: 'Doctor deleted successfully' });
};

export const setDoctorHours = async (req, res) => {
  const { id } = req.params;
  const hours = req.body; 
  
  if (!Array.isArray(hours)) {
    throw badRequest('Expected an array of working hours');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM doctor_hours WHERE doctor_id = $1', [id]);
    
    for (const h of hours) {
      await client.query(
        'INSERT INTO doctor_hours (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [id, h.day_of_week, h.start_time, h.end_time]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Doctor hours set successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getDoctorHours = async (req, res) => {
  const { id } = req.params;
  const result = await query(
    'SELECT day_of_week, start_time, end_time FROM doctor_hours WHERE doctor_id = $1 ORDER BY day_of_week',
    [id]
  );
  res.json({ hours: result.rows });
};

export const markDoctorLeave = async (req, res) => {
  const { id } = req.params;
  const { leave_date, reason } = req.body;
  if (!leave_date) {
    throw badRequest('leave_date is required');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    
    await client.query(
      'INSERT INTO doctor_leaves (doctor_id, leave_date, reason) VALUES ($1, $2, $3)',
      [id, leave_date, reason]
    );

    // Cancel appointments
    // Find and cancel appointments on the leave date
    const appointmentsResult = await client.query(
      `UPDATE appointments 
       SET status = 'cancelled', updated_at = NOW()
       WHERE doctor_id = $1 
         AND slot_start::date = $2::date 
         AND status IN ('held', 'confirmed') 
       RETURNING id, patient_id`,
      [id, leave_date]
    );

    // Create notification records for affected patients
    for (const appt of appointmentsResult.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, appointment_id, type, channel, payload, status) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          appt.patient_id, 
          appt.id, 
          'leave_cancellation', 
          'email',
          JSON.stringify({ message: `Your appointment on ${leave_date} has been cancelled due to doctor leave.` }),
          'pending'
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ 
      message: 'Leave marked and appointments cancelled', 
      affectedAppointments: appointmentsResult.rowCount 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getDoctorLeaves = async (req, res) => {
  const { id } = req.params;
  const result = await query(
    'SELECT id, leave_date, reason FROM doctor_leaves WHERE doctor_id = $1 ORDER BY leave_date',
    [id]
  );
  res.json({ leaves: result.rows });
};

export const getNotifications = async (req, res) => {
  const { status } = req.query;
  let q = `
    SELECT n.*, u.name as recipient_name, u.email as recipient_email
    FROM notifications n
    JOIN users u ON n.user_id = u.id
  `;
  const params = [];
  
  if (status) {
    q += ' WHERE n.status = $1';
    params.push(status);
  }
  
  q += ' ORDER BY n.created_at DESC';
  
  const result = await query(q, params);
  res.json({ notifications: result.rows });
};
