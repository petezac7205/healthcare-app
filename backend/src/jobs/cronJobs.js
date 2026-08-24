import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendEmail } from '../services/emailService.js';

export const initCronJobs = () => {
  console.log('🕒 Initializing cron jobs...');

  // 1. Release expired holds (every 60 seconds)
  cron.schedule('* * * * *', async () => {
    try {
      const res = await query(`
        UPDATE appointments 
        SET status='expired', updated_at=NOW() 
        WHERE status='held' AND held_until < NOW()
        RETURNING id
      `);
      if (res.rowCount > 0) {
        console.log(`[Cron] Released ${res.rowCount} expired hold(s)`);
      }
    } catch (error) {
      console.error('[Cron Error] release-expired-holds:', error.message);
    }
  });

  // 2. Notification retry sweep (every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    try {
      // Find pending/failed notifications with retry_count < 3
      const res = await query(`
        SELECT n.id, n.user_id, n.appointment_id, n.type, n.channel, n.payload, n.retry_count,
               u.email, u.name
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.status IN ('pending', 'failed') AND n.retry_count < 3
        ORDER BY n.created_at ASC
        LIMIT 50
      `);

      for (const notification of res.rows) {
        try {
          const payload = notification.payload || {};
          const subject = getEmailSubject(notification.type);
          const html = getEmailHtml(notification.type, notification.name, payload);

          const result = await sendEmail(notification.email, subject, html);

          if (result.success) {
            await query(
              `UPDATE notifications SET status = 'sent', retry_count = retry_count + 1 WHERE id = $1`,
              [notification.id]
            );
          } else {
            await query(
              `UPDATE notifications SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2`,
              [result.error, notification.id]
            );
          }
        } catch (err) {
          await query(
            `UPDATE notifications SET retry_count = retry_count + 1, last_error = $1 WHERE id = $2`,
            [err.message, notification.id]
          );
        }
      }

      // Mark permanently failed (retry_count >= 3)
      await query(`
        UPDATE notifications 
        SET status = 'failed'
        WHERE status IN ('pending', 'failed') AND retry_count >= 3
      `);

      if (res.rowCount > 0) {
        console.log(`[Cron] Processed ${res.rowCount} notification(s)`);
      }
    } catch (error) {
      console.error('[Cron Error] notification-retry-sweep:', error.message);
    }
  });

  // 3. Medication reminder scan (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    try {
      const res = await query(`
        SELECT mr.id, mr.drug, mr.dosage, mr.frequency, mr.next_send_at, mr.end_date,
               u.email, u.name
        FROM medication_reminders mr
        JOIN users u ON mr.patient_id = u.id
        WHERE mr.status = 'active' AND mr.next_send_at <= NOW()
        LIMIT 50
      `);

      for (const reminder of res.rows) {
        try {
          const result = await sendEmail(
            reminder.email,
            `💊 Medication Reminder: ${reminder.drug}`,
            getMedicationReminderHtml(reminder)
          );

          if (result.success) {
            // Calculate next send time based on frequency
            const nextSendAt = calculateNextSendAt(reminder.frequency);
            const shouldComplete = reminder.end_date && new Date(nextSendAt) > new Date(reminder.end_date);

            await query(
              `UPDATE medication_reminders SET status = $1, next_send_at = $2 WHERE id = $3`,
              [shouldComplete ? 'completed' : 'active', shouldComplete ? reminder.next_send_at : nextSendAt, reminder.id]
            );
          }
        } catch (err) {
          console.error(`[Cron] Medication reminder ${reminder.id} failed:`, err.message);
        }
      }

      if (res.rowCount > 0) {
        console.log(`[Cron] Processed ${res.rowCount} medication reminder(s)`);
      }
    } catch (error) {
      console.error('[Cron Error] medication-reminder-scan:', error.message);
    }
  });

  console.log('✅ Cron jobs initialized');
};

// Helper functions for email content
function getEmailSubject(type) {
  const subjects = {
    'booking_confirmation': '✅ Appointment Confirmed — HealthSync',
    'cancellation': '❌ Appointment Cancelled — HealthSync',
    'leave_cancellation': '⚠️ Appointment Cancelled Due to Doctor Leave — HealthSync',
    'visit_completed': '📋 Your Visit Summary is Ready — HealthSync',
    'appointment_reminder': '⏰ Appointment Reminder — HealthSync'
  };
  return subjects[type] || 'Notification from HealthSync';
}

function getEmailHtml(type, name, payload) {
  const message = payload?.message || 'You have a new notification from HealthSync.';
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #f8fafc; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #00d4aa, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">HealthSync</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px;">
        <h2 style="color: #00d4aa; margin-bottom: 16px;">${getEmailSubject(type).replace(' — HealthSync', '')}</h2>
        <p style="color: #94a3b8;">Hi ${name},</p>
        <p style="color: #f8fafc; line-height: 1.6;">${message}</p>
      </div>
      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">HealthSync — Healthcare Appointment Manager</p>
    </div>
  `;
}

function getMedicationReminderHtml(reminder) {
  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #f8fafc; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #00d4aa, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">HealthSync</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px;">
        <h2 style="color: #00d4aa;">💊 Medication Reminder</h2>
        <p style="color: #94a3b8;">Hi ${reminder.name}, it's time to take your medication:</p>
        <div style="background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f8fafc; font-size: 18px; font-weight: 600; margin-bottom: 8px;">${reminder.drug}</p>
          ${reminder.dosage ? `<p style="color: #94a3b8;">Dosage: ${reminder.dosage}</p>` : ''}
          <p style="color: #94a3b8;">Frequency: ${reminder.frequency}</p>
        </div>
      </div>
    </div>
  `;
}

function calculateNextSendAt(frequency) {
  const now = new Date();
  const freqLower = (frequency || '').toLowerCase();
  
  if (freqLower.includes('twice') || freqLower.includes('2x') || freqLower.includes('bid')) {
    return new Date(now.getTime() + 12 * 60 * 60000).toISOString();
  } else if (freqLower.includes('three') || freqLower.includes('3x') || freqLower.includes('tid')) {
    return new Date(now.getTime() + 8 * 60 * 60000).toISOString();
  } else if (freqLower.includes('four') || freqLower.includes('4x') || freqLower.includes('qid')) {
    return new Date(now.getTime() + 6 * 60 * 60000).toISOString();
  } else {
    // Default: once daily
    return new Date(now.getTime() + 24 * 60 * 60000).toISOString();
  }
}
