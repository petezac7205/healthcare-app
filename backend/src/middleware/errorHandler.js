import { AppError } from '../utils/errors.js';
import { config } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  if (config.nodeEnv === 'development') {
    console.error(err);
  }

  // Handle PostgreSQL unique violation
  if (err.code === '23505') {
    const message = err.constraint === 'uniq_active_slot' 
      ? 'Slot no longer available. Someone else has already booked this time.'
      : 'A duplicate record already exists.';
    return res.status(409).json({
      error: {
        message,
        code: 'CONFLICT'
      }
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code || 'APP_ERROR'
      }
    });
  }

  // Generic 500 error
  res.status(500).json({
    error: {
      message: config.nodeEnv === 'development' ? err.message : 'Internal Server Error',
      code: 'SERVER_ERROR'
    }
  });
};
