import { query } from '../config/db.js';
import { badRequest, notFound } from '../utils/errors.js';

export const searchDoctors = async (req, res) => {
  const { specialisation } = req.query;
  let q = `
    SELECT dp.id, u.name, dp.specialisation, dp.bio, dp.slot_duration_min
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    WHERE u.role = 'doctor'
  `;
  const params = [];

  if (specialisation) {
    q += ' AND dp.specialisation ILIKE $1';
    params.push(`%${specialisation}%`);
  }

  const result = await query(q, params);
  res.json({ doctors: result.rows });
};

export const getDoctorDetail = async (req, res) => {
  const { id } = req.params;
  
  const docResult = await query(`
    SELECT dp.id, u.name, dp.specialisation, dp.bio, dp.slot_duration_min
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    WHERE dp.id = $1
  `, [id]);

  if (docResult.rows.length === 0) {
    throw notFound('Doctor not found');
  }

  const hoursResult = await query(
    'SELECT day_of_week, start_time, end_time FROM doctor_hours WHERE doctor_id = $1 ORDER BY day_of_week',
    [id]
  );

  res.json({ 
    doctor: docResult.rows[0],
    hours: hoursResult.rows
  });
};

export const getAvailableSlots = async (req, res) => {
  const { id } = req.params;
  const { date } = req.query; // YYYY-MM-DD
  
  if (!date) {
    throw badRequest('date query parameter is required');
  }

  const queryDate = new Date(date);
  if (isNaN(queryDate.getTime())) {
    throw badRequest('Invalid date format');
  }

  const docResult = await query('SELECT slot_duration_min FROM doctor_profiles WHERE id = $1', [id]);
  if (docResult.rows.length === 0) {
    throw notFound('Doctor not found');
  }
  const slotDuration = docResult.rows[0].slot_duration_min || 30;

  const leaveResult = await query('SELECT id FROM doctor_leaves WHERE doctor_id = $1 AND leave_date = $2', [id, date]);
  if (leaveResult.rows.length > 0) {
    return res.json({ slots: [] }); // Doctor is on leave
  }

  const dayOfWeek = queryDate.getDay(); // 0 (Sunday) to 6 (Saturday)
  const hoursResult = await query(
    'SELECT start_time, end_time FROM doctor_hours WHERE doctor_id = $1 AND day_of_week = $2',
    [id, dayOfWeek]
  );

  if (hoursResult.rows.length === 0) {
    return res.json({ slots: [] }); // No working hours
  }

  const apptsResult = await query(
    `SELECT slot_start, slot_end FROM appointments 
     WHERE doctor_id = $1 AND slot_start::date = $2::date AND status IN ('held', 'confirmed')`,
    [id, date]
  );
  const existingAppts = apptsResult.rows;

  let availableSlots = [];
  const now = new Date();
  const isToday = queryDate.toDateString() === now.toDateString();
  
  for (const period of hoursResult.rows) {
    let current = new Date(`${date}T${period.start_time}`);
    const end = new Date(`${date}T${period.end_time}`);
    
    while (current < end) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60000);
      if (slotEnd > end) break; 

      // Skip past slots if date is today
      if (!isToday || current > now) {
        const overlap = existingAppts.some(appt => {
          const apptStart = new Date(appt.slot_start).getTime();
          const apptEnd = new Date(appt.slot_end).getTime();
          return (current.getTime() < apptEnd && slotEnd.getTime() > apptStart);
        });
        
        if (!overlap) {
          availableSlots.push({ 
            start: current.toISOString(), 
            end: slotEnd.toISOString() 
          });
        }
      }
      current = slotEnd;
    }
  }

  res.json({ slots: availableSlots });
};
