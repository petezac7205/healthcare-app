# System Design Write-up — HealthSync

## Overview

HealthSync is a healthcare appointment platform handling concurrent bookings, doctor schedules, AI-powered summaries, and multi-channel notifications. This document covers the core design decisions addressing slot conflicts, leave management, notification reliability, and the slot hold mechanism.

## 1. Double-Booking Prevention

The most critical requirement is preventing two patients from booking the same doctor at the same time. We solve this at the **database level** using a PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX uniq_active_slot
ON appointments (doctor_id, slot_start)
WHERE status IN ('held', 'confirmed');
```

This index only considers rows where `status` is `held` or `confirmed`. Cancelled, expired, and completed appointments are excluded, allowing those slots to be rebooked.

When two concurrent requests attempt to insert an appointment for the same doctor and time, PostgreSQL guarantees that only one will succeed — the other receives error code `23505` (unique violation), which our error handler converts to HTTP 409 "Slot no longer available."

**Why not application-level locking?** Application-level `SELECT ... FOR UPDATE` or distributed locks add complexity and still risk race conditions in multi-instance deployments. The database index is the strongest guarantee because it operates at the storage level regardless of how many application instances are running.

**Concurrency test:** We validate this by firing 10 simultaneous hold requests for the same slot. Exactly 1 returns 201, exactly 9 return 409, and the database contains exactly one active appointment.

## 2. Slot Hold Mechanism

To prevent a patient from holding a slot indefinitely while filling out the symptom form, we implement a **5-minute hold** with automatic expiry:

1. Patient selects a slot → system inserts appointment with `status='held'` and `held_until = NOW() + 5 minutes`
2. Patient fills symptom form and confirms → `status` changes to `confirmed`, `held_until` is cleared
3. If patient doesn't confirm within 5 minutes → the hold expires

**Expiry mechanism:** A cron job runs every 60 seconds:
```sql
UPDATE appointments SET status='expired'
WHERE status='held' AND held_until < NOW();
```

This means there's up to ~60 seconds of bounded delay before an expired hold is cleaned up. During this window, the partial unique index still prevents double-booking. A new patient trying to book the expired-but-not-yet-cleaned slot will get a 409, but will succeed on retry after the cron runs.

**Design tradeoff:** We chose a simple cron-based approach over real-time expiry (e.g., per-row timers or a queue system) because the bounded delay is acceptable for a clinic system, and it dramatically reduces infrastructure complexity. No Redis, no message queues — just PostgreSQL and a periodic cleanup.

## 3. Doctor Leave Conflict Handling

When an admin marks a doctor on leave for a date with existing appointments, we must atomically cancel those appointments and notify patients. This requires a **database transaction**:

```
BEGIN
  1. INSERT into doctor_leaves
  2. UPDATE appointments SET status='cancelled'
     WHERE doctor_id = X AND slot_start::date = leave_date AND status IN ('held', 'confirmed')
  3. For each affected appointment:
     INSERT notification record (status='pending')
COMMIT
```

The transaction ensures atomicity: either all changes succeed or none do. After the transaction commits, the notification system processes the pending notifications asynchronously. This separation is deliberate — we don't want email delivery failures to prevent the leave from being recorded.

**Calendar event cleanup:** After the DB transaction, we attempt to delete Google Calendar events for affected appointments. Calendar failures are recorded but do not block the leave operation.

## 4. Slot Generation (No Permanent Slots Table)

We do **not** maintain a permanent table of available slots. Instead, slots are computed on-the-fly:

1. Look up the doctor's working hours for the requested day of week
2. Check if the doctor is on leave for that date
3. Fetch existing `held` and `confirmed` appointments for that date
4. Generate slots based on working hours and `slot_duration_min`
5. Subtract booked/held slots from generated slots
6. Exclude past slots if querying today

This approach avoids the complexity of maintaining a separate slots table that needs syncing with appointments, leaves, and schedule changes.

## 5. Notification Failure Handling

Email and calendar operations are inherently unreliable. Our design ensures they never break the core booking flow:

**Decoupled notifications:** When an appointment is confirmed or cancelled, we insert a notification record with `status='pending'` into the database. The actual email sending happens asynchronously via a cron job.

**Retry mechanism:** A cron job runs every 5 minutes:
- Finds notifications with `status IN ('pending', 'failed')` and `retry_count < 3`
- Attempts to send each notification
- On success: `status='sent'`
- On failure: increments `retry_count`, stores `last_error`
- After 3 failures: permanently marks `status='failed'`

**Admin visibility:** Failed notifications are visible to admins in the admin portal, allowing manual follow-up.

**Calendar failures:** Google Calendar event creation/deletion uses the same fire-and-record pattern. If OAuth tokens are expired or the API is down, we record the failure in `calendar_events` with `status='failed'`. The appointment remains valid.

## 6. LLM Failure Handling

LLM API calls (OpenAI/Claude) for pre-visit and post-visit summaries use a defensive pattern:

- **8-second timeout** via AbortController
- **try/catch** wrapping with JSON validation
- **Never throws** — always returns a result object
- On failure: `llm_ok=false`, fallback urgency is `Unrated`
- Patient's raw symptoms are always preserved
- Doctor sees "AI summary unavailable — review manually"

The booking and visit-note workflows continue normally regardless of LLM status. This ensures a $0.01 API failure never blocks a real medical appointment.

## 7. Rescheduling

Rescheduling is implemented as **cancel + new hold**. There is no separate "rescheduled" status. This keeps the state machine simple (held → confirmed → completed, with cancel and expired as terminal states) while allowing the same slot to be rebooked by the same or a different patient.

The partial unique index naturally supports this: cancelling an appointment removes it from the index, freeing the slot.

## 8. Medication Reminders

When a doctor submits visit notes with prescriptions, the system creates medication reminder records with calculated `next_send_at` timestamps based on the prescribed frequency. A cron job scans every 15 minutes for due reminders and sends email notifications. Each reminder's `next_send_at` is recalculated after sending, continuing until the `end_date` is reached.

## Summary

The architecture prioritizes **correctness over complexity**: PostgreSQL's partial unique index for concurrency, database transactions for atomic operations, cron-based async processing for notifications, and defensive error handling for external services. Every external failure (LLM, email, calendar) is contained and never breaks the core booking workflow.
