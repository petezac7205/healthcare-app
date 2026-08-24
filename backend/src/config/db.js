import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

const isRemoteDb = config.dbUrl && !config.dbUrl.includes('localhost') && !config.dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: config.dbUrl,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {})
});

export const query = (text, params) => pool.query(text, params);

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export default pool;
