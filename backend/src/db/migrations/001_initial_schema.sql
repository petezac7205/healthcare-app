-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Doctor profiles
CREATE TABLE IF NOT EXISTS doctor_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialisation VARCHAR(255) NOT NULL,
  bio TEXT,
  slot_duration_min INTEGER NOT NULL DEFAULT 30
);

-- Doctor working hours
CREATE TABLE IF NOT EXISTS doctor_hours (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(doctor_id, day_of_week)
);

-- Doctor leave days
CREATE TABLE IF NOT EXISTS doctor_leaves (
  id SERIAL PRIMARY KEY,
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  reason TEXT,
  UNIQUE(doctor_id, leave_date)
);

-- Appointments with partial unique index for double-booking prevention
CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  doctor_id INTEGER NOT NULL REFERENCES doctor_profiles(id),
  slot_start TIMESTAMP NOT NULL,
  slot_end TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'confirmed', 'completed', 'cancelled', 'expired')),
  held_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CRITICAL: Partial unique index prevents double-booking
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_slot
ON appointments (doctor_id, slot_start)
WHERE status IN ('held', 'confirmed');

-- Symptom forms
CREATE TABLE IF NOT EXISTS symptom_forms (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  llm_urgency VARCHAR(20) DEFAULT 'Unrated',
  llm_chief_complaint TEXT,
  llm_questions JSONB,
  llm_ok BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Visit notes
CREATE TABLE IF NOT EXISTS visit_notes (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_notes TEXT NOT NULL,
  prescription JSONB,
  llm_patient_summary TEXT,
  llm_ok BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Medication reminders
CREATE TABLE IF NOT EXISTS medication_reminders (
  id SERIAL PRIMARY KEY,
  visit_note_id INTEGER NOT NULL REFERENCES visit_notes(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id),
  drug VARCHAR(255) NOT NULL,
  dosage VARCHAR(255),
  frequency VARCHAR(100) NOT NULL,
  next_send_at TIMESTAMP NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sent', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  appointment_id INTEGER REFERENCES appointments(id),
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  payload JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  google_event_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'deleted', 'failed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- OAuth tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, slot_start);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_medication_reminders_next ON medication_reminders(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialisation ON doctor_profiles(specialisation);
