import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const hash = async (pwd) => await bcrypt.hash(pwd, 10);
    
    // Create admin user
    const adminPass = await hash('admin123');
    await client.query(`
      INSERT INTO users (name, email, password_hash, role) 
      VALUES ('Admin', 'admin@healthcare.com', $1, 'admin') 
      ON CONFLICT (email) DO NOTHING
    `, [adminPass]);

    // Create doctor 1 - Dr. Sarah Johnson (Cardiology)
    const doc1Pass = await hash('doctor123');
    const doc1Res = await client.query(`
      INSERT INTO users (name, email, password_hash, phone, role) 
      VALUES ('Dr. Sarah Johnson', 'sarah@healthcare.com', $1, '+1234567890', 'doctor') 
      ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
    `, [doc1Pass]);
    
    // Create doctor 2 - Dr. Michael Chen (Dermatology)
    const doc2Pass = await hash('doctor123');
    const doc2Res = await client.query(`
      INSERT INTO users (name, email, password_hash, phone, role) 
      VALUES ('Dr. Michael Chen', 'michael@healthcare.com', $1, '+1234567891', 'doctor') 
      ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id
    `, [doc2Pass]);

    // Create patient
    const patientPass = await hash('patient123');
    await client.query(`
      INSERT INTO users (name, email, password_hash, phone, role) 
      VALUES ('John Doe', 'john@example.com', $1, '+1234567892', 'patient') 
      ON CONFLICT (email) DO NOTHING
    `, [patientPass]);

    // Create doctor profiles
    if (doc1Res.rows[0]) {
      const doc1Id = doc1Res.rows[0].id;
      const dp1 = await client.query(`
        INSERT INTO doctor_profiles (user_id, specialisation, bio, slot_duration_min)
        VALUES ($1, 'Cardiology', 'Board-certified cardiologist with 15 years of experience in treating cardiovascular diseases.', 30)
        ON CONFLICT (user_id) DO UPDATE SET specialisation=EXCLUDED.specialisation RETURNING id
      `, [doc1Id]);
      
      const pId1 = dp1.rows[0]?.id;
      if (pId1) {
        // Delete existing hours first to make seed idempotent
        await client.query('DELETE FROM doctor_hours WHERE doctor_id = $1', [pId1]);
        // Mon(1) through Fri(5), 09:00-17:00
        for (let i = 1; i <= 5; i++) {
          await client.query(`
            INSERT INTO doctor_hours (doctor_id, day_of_week, start_time, end_time)
            VALUES ($1, $2, '09:00', '17:00')
          `, [pId1, i]);
        }
      }
    }

    if (doc2Res.rows[0]) {
      const doc2Id = doc2Res.rows[0].id;
      const dp2 = await client.query(`
        INSERT INTO doctor_profiles (user_id, specialisation, bio, slot_duration_min)
        VALUES ($1, 'Dermatology', 'Specialized in skin conditions, cosmetic dermatology, and skin cancer screening.', 20)
        ON CONFLICT (user_id) DO UPDATE SET specialisation=EXCLUDED.specialisation RETURNING id
      `, [doc2Id]);
      
      const pId2 = dp2.rows[0]?.id;
      if (pId2) {
        await client.query('DELETE FROM doctor_hours WHERE doctor_id = $1', [pId2]);
        for (let i = 1; i <= 5; i++) {
          await client.query(`
            INSERT INTO doctor_hours (doctor_id, day_of_week, start_time, end_time)
            VALUES ($1, $2, '09:00', '17:00')
          `, [pId2, i]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully');
    console.log('   Admin: admin@healthcare.com / admin123');
    console.log('   Doctor 1: sarah@healthcare.com / doctor123');
    console.log('   Doctor 2: michael@healthcare.com / doctor123');
    console.log('   Patient: john@example.com / patient123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
