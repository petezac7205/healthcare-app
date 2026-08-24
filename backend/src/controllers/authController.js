import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { badRequest, unauthorized, notFound } from '../utils/errors.js';
import { config } from '../config/env.js';

export const register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  
  if (!name || !email || !password) {
    throw badRequest('Name, email and password are required');
  }
  if (password.length < 6) {
    throw badRequest('Password must be at least 6 characters long');
  }

  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw badRequest('Email already in use');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await query(
    'INSERT INTO users (name, email, password_hash, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role',
    [name, email, hashedPassword, phone || null, 'patient']
  );

  const user = result.rows[0];
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.status(201).json({ user, token });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw badRequest('Email and password are required');
  }

  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) {
    throw unauthorized('Invalid credentials');
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw unauthorized('Invalid credentials');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  const { password_hash, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token });
};

export const getMe = async (req, res) => {
  const result = await query(
    'SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  
  if (result.rows.length === 0) {
    throw notFound('User not found');
  }
  
  res.json({ user: result.rows[0] });
};
