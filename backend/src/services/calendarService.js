import { google } from 'googleapis';
import { config } from '../config/env.js';
import { query } from '../config/db.js';

export const getOAuthClient = () => {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
};

export const getAuthUrl = (userId) => {
  const oauth2Client = getOAuthClient();
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: JSON.stringify({ userId }),
    prompt: 'consent'
  });
};

export const handleCallback = async (code, userId) => {
  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    
    const expiry = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000);
    
    await query(
      `INSERT INTO oauth_tokens (user_id, access_token, refresh_token, expiry) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET access_token = EXCLUDED.access_token, 
                     refresh_token = COALESCE(EXCLUDED.refresh_token, oauth_tokens.refresh_token), 
                     expiry = EXCLUDED.expiry`,
      [userId, tokens.access_token, tokens.refresh_token, expiry]
    );

    return { success: true };
  } catch (error) {
    console.error('Error handling Google callback:', error.message);
    return { success: false, error: error.message };
  }
};

export const createCalendarEvent = async (userId, appointmentDetails) => {
  try {
    const { rows } = await query('SELECT access_token, refresh_token, expiry FROM oauth_tokens WHERE user_id = $1', [userId]);
    if (rows.length === 0) {
      return { success: false, error: 'User not connected to Google Calendar' };
    }

    const tokens = rows[0];
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: new Date(tokens.expiry).getTime()
    });

    // Refresh if token is about to expire
    if (Date.now() > new Date(tokens.expiry).getTime() - 60000) {
      if (tokens.refresh_token) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        const newExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600000);
        await query(
          'UPDATE oauth_tokens SET access_token = $1, expiry = $2 WHERE user_id = $3',
          [credentials.access_token, newExpiry, userId]
        );
      } else {
        return { success: false, error: 'Token expired and no refresh token available' };
      }
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { summary, description, start, end, appointmentId } = appointmentDetails;

    const event = {
      summary,
      description,
      start: { dateTime: start, timeZone: 'UTC' },
      end: { dateTime: end, timeZone: 'UTC' }
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    const googleEventId = res.data.id;

    await query(
      `INSERT INTO calendar_events (appointment_id, user_id, google_event_id, status)
       VALUES ($1, $2, $3, 'created')`,
      [appointmentId, userId, googleEventId]
    );

    return { success: true, eventId: googleEventId };
  } catch (error) {
    console.error('Error creating calendar event:', error.message);
    try {
      if (appointmentDetails?.appointmentId) {
        await query(
          `INSERT INTO calendar_events (appointment_id, user_id, status)
           VALUES ($1, $2, 'failed')`,
          [appointmentDetails.appointmentId, userId]
        );
      }
    } catch (dbError) {
      console.error('Error recording calendar event failure:', dbError.message);
    }
    return { success: false, error: error.message };
  }
};

export const deleteCalendarEvent = async (userId, appointmentId) => {
  try {
    const { rows: eventRows } = await query(
      `SELECT google_event_id FROM calendar_events WHERE user_id = $1 AND appointment_id = $2 AND status = 'created'`,
      [userId, appointmentId]
    );

    if (eventRows.length === 0) {
      return { success: false, error: 'Event not found or already deleted' };
    }

    const { google_event_id } = eventRows[0];

    const { rows: tokenRows } = await query('SELECT access_token, refresh_token, expiry FROM oauth_tokens WHERE user_id = $1', [userId]);
    if (tokenRows.length === 0) {
      return { success: false, error: 'User not connected to Google Calendar' };
    }

    const tokens = tokenRows[0];
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: new Date(tokens.expiry).getTime()
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: google_event_id
    });

    await query(
      `UPDATE calendar_events SET status = 'deleted' WHERE user_id = $1 AND appointment_id = $2`,
      [userId, appointmentId]
    );

    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error.message);
    return { success: false, error: error.message };
  }
};
