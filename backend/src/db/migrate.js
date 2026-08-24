import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
      
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const file of files) {
        console.log(`Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await client.query(sql);
      }
      
      await client.query('COMMIT');
      console.log('All migrations executed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error executing migrations, rolling back:', err);
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    pool.end();
  }
}

runMigrations();
