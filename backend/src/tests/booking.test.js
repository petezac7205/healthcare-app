/**
 * Booking Engine Integration Tests
 * Requires: running server on localhost:5000, seeded database
 * Run with: node --test src/tests/booking.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const API = 'http://localhost:5000/api';

let patientToken = '';
let adminToken = '';
let doctorId = null; // doctor_profiles.id

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    ...options,
    headers: undefined,
  });
  // Refine: reattach headers
  const res2 = await fetch(`${API}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body,
  });
  const data = await res2.text();
  return { status: res2.status, data: data ? JSON.parse(data) : {} };
}

// Simpler helper
async function api(method, endpoint, body, token) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API}${endpoint}`, opts);
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : {} };
}

describe('Booking Engine Tests', () => {
  before(async () => {
    // Login as patient
    const patientRes = await api('POST', '/auth/login', {
      email: 'john@example.com',
      password: 'patient123',
    });
    assert.strictEqual(patientRes.status, 200, 'Patient login should succeed');
    patientToken = patientRes.data.token;

    // Login as admin
    const adminRes = await api('POST', '/auth/login', {
      email: 'admin@healthcare.com',
      password: 'admin123',
    });
    assert.strictEqual(adminRes.status, 200, 'Admin login should succeed');
    adminToken = adminRes.data.token;

    // Get first doctor's profile id
    const doctorsRes = await api('GET', '/doctors', null, patientToken);
    assert.ok(doctorsRes.data.doctors.length > 0, 'Should have at least one doctor');
    doctorId = doctorsRes.data.doctors[0].id;
  });

  describe('Test 1: Concurrency — 10 simultaneous holds', () => {
    it('should allow exactly 1 hold and reject 9', async () => {
      // Use a future date slot to avoid conflicts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      // Set to Monday if it falls on weekend
      while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      const slotStart = new Date(tomorrow);
      slotStart.setHours(10, 0, 0, 0);

      const promises = Array.from({ length: 10 }, () =>
        api('POST', '/appointments/hold', {
          doctor_id: doctorId,
          slot_start: slotStart.toISOString(),
        }, patientToken)
      );

      const results = await Promise.all(promises);
      const successes = results.filter(r => r.status === 201);
      const conflicts = results.filter(r => r.status === 409);

      console.log(`  Successes: ${successes.length}, Conflicts: ${conflicts.length}`);
      
      assert.strictEqual(successes.length, 1, 'Exactly 1 should succeed');
      assert.strictEqual(conflicts.length, 9, 'Exactly 9 should get 409');

      // Cancel the successful hold for cleanup
      if (successes[0]) {
        const aptId = successes[0].data.appointment?.id;
        if (aptId) {
          await api('POST', `/appointments/${aptId}/cancel`, null, patientToken);
        }
      }
    });
  });

  describe('Test 2: Rebooking — cancel and rebook same slot', () => {
    it('should allow rebooking a cancelled slot', async () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      while (nextWeek.getDay() === 0 || nextWeek.getDay() === 6) {
        nextWeek.setDate(nextWeek.getDate() + 1);
      }
      const slotStart = new Date(nextWeek);
      slotStart.setHours(11, 0, 0, 0);

      // Hold
      const holdRes = await api('POST', '/appointments/hold', {
        doctor_id: doctorId,
        slot_start: slotStart.toISOString(),
      }, patientToken);
      assert.strictEqual(holdRes.status, 201, 'Initial hold should succeed');
      const aptId = holdRes.data.appointment.id;

      // Confirm
      const confirmRes = await api('POST', `/appointments/${aptId}/confirm`, null, patientToken);
      assert.strictEqual(confirmRes.status, 200, 'Confirm should succeed');

      // Cancel
      const cancelRes = await api('POST', `/appointments/${aptId}/cancel`, null, patientToken);
      assert.strictEqual(cancelRes.status, 200, 'Cancel should succeed');

      // Rebook the same slot
      const rebookRes = await api('POST', '/appointments/hold', {
        doctor_id: doctorId,
        slot_start: slotStart.toISOString(),
      }, patientToken);
      assert.strictEqual(rebookRes.status, 201, 'Rebooking the same slot should succeed');

      // Cleanup
      const newAptId = rebookRes.data.appointment.id;
      await api('POST', `/appointments/${newAptId}/cancel`, null, patientToken);
    });
  });

  describe('Test 3: Leave Cascade', () => {
    it('should cancel appointments when doctor leave is marked', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      const dateStr = futureDate.toISOString().split('T')[0];

      // Create 2 appointments
      const slot1 = new Date(futureDate);
      slot1.setHours(9, 0, 0, 0);
      const slot2 = new Date(futureDate);
      slot2.setHours(10, 0, 0, 0);

      const hold1 = await api('POST', '/appointments/hold', {
        doctor_id: doctorId,
        slot_start: slot1.toISOString(),
      }, patientToken);
      assert.strictEqual(hold1.status, 201);
      await api('POST', `/appointments/${hold1.data.appointment.id}/confirm`, null, patientToken);

      const hold2 = await api('POST', '/appointments/hold', {
        doctor_id: doctorId,
        slot_start: slot2.toISOString(),
      }, patientToken);
      assert.strictEqual(hold2.status, 201);
      await api('POST', `/appointments/${hold2.data.appointment.id}/confirm`, null, patientToken);

      // Mark leave
      const leaveRes = await api('POST', `/admin/doctors/${doctorId}/leave`, {
        leave_date: dateStr,
        reason: 'Personal leave - test',
      }, adminToken);
      
      assert.strictEqual(leaveRes.status, 200, 'Leave should be marked successfully');
      assert.strictEqual(leaveRes.data.affectedAppointments, 2, 'Should affect 2 appointments');
    });
  });

  describe('Test 4: Slot Generation', () => {
    it('should return available slots excluding booked ones', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 21);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      const dateStr = futureDate.toISOString().split('T')[0];

      // Get initial slots
      const slotsRes = await api('GET', `/doctors/${doctorId}/slots?date=${dateStr}`, null, patientToken);
      assert.strictEqual(slotsRes.status, 200);
      const initialCount = slotsRes.data.slots.length;
      assert.ok(initialCount > 0, 'Should have available slots');

      // Book one slot
      const slotToBook = new Date(futureDate);
      slotToBook.setHours(9, 0, 0, 0);
      const holdRes = await api('POST', '/appointments/hold', {
        doctor_id: doctorId,
        slot_start: slotToBook.toISOString(),
      }, patientToken);
      assert.strictEqual(holdRes.status, 201);

      // Check slots again - should be one fewer
      const slotsRes2 = await api('GET', `/doctors/${doctorId}/slots?date=${dateStr}`, null, patientToken);
      assert.strictEqual(slotsRes2.data.slots.length, initialCount - 1, 'Should have one fewer slot');

      // Cleanup
      await api('POST', `/appointments/${holdRes.data.appointment.id}/cancel`, null, patientToken);
    });
  });

  describe('Test 5: LLM Failure Handling', () => {
    it('should handle symptoms submission even if LLM fails', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 28);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      const slotStart = new Date(futureDate);
      slotStart.setHours(14, 0, 0, 0);

      // Hold and confirm
      const holdRes = await api('POST', '/appointments/hold', {
        doctor_id: doctorId,
        slot_start: slotStart.toISOString(),
      }, patientToken);
      assert.strictEqual(holdRes.status, 201);
      const aptId = holdRes.data.appointment.id;

      // Submit symptoms (LLM may or may not be configured)
      const symptomRes = await api('POST', `/appointments/${aptId}/symptoms`, {
        raw_text: 'I have been experiencing severe headaches for the past 3 days, accompanied by nausea and sensitivity to light.',
      }, patientToken);
      
      assert.strictEqual(symptomRes.status, 201, 'Symptom submission should succeed regardless of LLM status');
      assert.ok(symptomRes.data.symptomForm.raw_text, 'Raw symptoms should be preserved');
      assert.ok(symptomRes.data.symptomForm.llm_urgency, 'Urgency should exist (even if Unrated)');

      // Cleanup
      await api('POST', `/appointments/${aptId}/cancel`, null, patientToken);
    });
  });
});
