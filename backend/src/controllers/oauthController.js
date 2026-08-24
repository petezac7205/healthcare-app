import * as calendarService from '../services/calendarService.js';
import { query } from '../config/db.js';
import { config } from '../config/env.js';

export const getAuthUrl = (req, res) => {
  const userId = req.user.id;
  const url = calendarService.getAuthUrl(userId);
  res.json({ url });
};

export const handleCallback = async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(`${config.frontendUrl}/auth/login?error=calendar_failed`);
  }

  try {
    const parsedState = JSON.parse(state);
    const userId = parsedState.userId;

    const result = await calendarService.handleCallback(code, userId);

    if (result.success) {
      res.redirect(`${config.frontendUrl}/patient/appointments?calendar=connected`);
    } else {
      res.redirect(`${config.frontendUrl}/patient/appointments?calendar=error`);
    }
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    res.redirect(`${config.frontendUrl}/patient/appointments?calendar=error`);
  }
};

export const checkStatus = async (req, res) => {
  const userId = req.user.id;
  const { rows } = await query('SELECT expiry FROM oauth_tokens WHERE user_id = $1', [userId]);
  
  if (rows.length === 0) {
    return res.json({ connected: false });
  }

  res.json({ 
    connected: true, 
    expiry: rows[0].expiry,
    valid: new Date(rows[0].expiry) > new Date()
  });
};
