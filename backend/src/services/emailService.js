import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: parseInt(config.email.port) || 587,
      secure: false,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }
  return transporter;
};

export const sendEmail = async (to, subject, html) => {
  try {
    if (!config.email.user || !config.email.pass) {
      console.log(`[Email] Skipped (not configured): ${subject} -> ${to}`);
      return { success: true }; // Don't fail if email isn't configured
    }
    const transport = getTransporter();
    await transport.sendMail({
      from: config.email.from || config.email.user,
      to,
      subject,
      html
    });
    console.log(`[Email] Sent: ${subject} -> ${to}`);
    return { success: true };
  } catch (err) {
    console.error(`[Email] Failed: ${subject} -> ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

export const sendBookingConfirmation = async (patientEmail, doctorEmail, appointmentDetails) => {
  const { date, time, patientName, doctorName } = appointmentDetails;
  const subject = `Booking Confirmation - Appointment on ${date} at ${time}`;
  
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #f8fafc; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #00d4aa, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">HealthSync</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px;">
        <h2 style="color: #22c55e; margin-bottom: 16px;">✅ Appointment Confirmed</h2>
        <p style="color: #94a3b8;">Your appointment has been successfully booked.</p>
        <div style="background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f8fafc;"><strong>Date:</strong> ${date}</p>
          <p style="color: #f8fafc;"><strong>Time:</strong> ${time}</p>
          <p style="color: #f8fafc;"><strong>Patient:</strong> ${patientName}</p>
          <p style="color: #f8fafc;"><strong>Doctor:</strong> ${doctorName}</p>
        </div>
      </div>
      <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">HealthSync — Healthcare Appointment Manager</p>
    </div>
  `;

  await sendEmail(patientEmail, subject, html);
  await sendEmail(doctorEmail, `New Appointment: ${patientName} on ${date}`, html);
};

export const sendCancellationNotification = async (email, appointmentDetails, reason) => {
  const { date, time, patientName, doctorName } = appointmentDetails;
  const subject = `Appointment Cancelled - ${date} at ${time}`;
  
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #f8fafc; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #00d4aa, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">HealthSync</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px;">
        <h2 style="color: #ef4444; margin-bottom: 16px;">❌ Appointment Cancelled</h2>
        <p style="color: #94a3b8;">Your appointment has been cancelled.</p>
        <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f8fafc;"><strong>Date:</strong> ${date}</p>
          <p style="color: #f8fafc;"><strong>Time:</strong> ${time}</p>
          <p style="color: #f8fafc;"><strong>Patient:</strong> ${patientName}</p>
          <p style="color: #f8fafc;"><strong>Doctor:</strong> ${doctorName}</p>
          ${reason ? `<p style="color: #f8fafc;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
};

export const sendMedicationReminder = async (email, drug, dosage, frequency) => {
  const subject = `💊 Medication Reminder: ${drug}`;
  
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #f8fafc; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #00d4aa, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">HealthSync</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px;">
        <h2 style="color: #00d4aa; margin-bottom: 16px;">💊 Medication Reminder</h2>
        <p style="color: #94a3b8;">It's time to take your medication.</p>
        <div style="background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f8fafc; font-size: 18px; font-weight: 600;">${drug}</p>
          <p style="color: #94a3b8;">Dosage: ${dosage}</p>
          <p style="color: #94a3b8;">Frequency: ${frequency}</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
};

export const sendAppointmentReminder = async (email, appointmentDetails) => {
  const { date, time, doctorName } = appointmentDetails;
  const subject = `⏰ Appointment Reminder - ${date} at ${time}`;
  
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e27; color: #f8fafc; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #00d4aa, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">HealthSync</h1>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px;">
        <h2 style="color: #0ea5e9; margin-bottom: 16px;">⏰ Upcoming Appointment</h2>
        <p style="color: #94a3b8;">This is a reminder for your upcoming appointment.</p>
        <div style="background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.3); border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f8fafc;"><strong>Date:</strong> ${date}</p>
          <p style="color: #f8fafc;"><strong>Time:</strong> ${time}</p>
          <p style="color: #f8fafc;"><strong>Doctor:</strong> ${doctorName}</p>
        </div>
        <p style="color: #94a3b8; margin-top: 16px;">Please arrive 10 minutes early.</p>
      </div>
    </div>
  `;

  await sendEmail(email, subject, html);
};
