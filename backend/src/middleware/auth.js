import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';

export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(unauthorized('No token provided or invalid format'));
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return next(unauthorized('Invalid or expired token'));
  }
};
