# HealthSync — Healthcare Appointment & Follow-up Manager

A full-featured healthcare appointment platform with separate portals for **Patients**, **Doctors**, and **Admins**. Built with React, Node.js/Express, and PostgreSQL.

## Website Link 

https://healthcare-l6m0hjbz1-peter-c694.vercel.app/

## 🌟 Features

### Patient Portal
- **Search doctors** by specialisation
- **Book appointments** with available time slots
- **Submit symptoms** before visit (AI-powered pre-visit summary)
- **View appointment history** and post-visit summaries
- **Google Calendar** integration for appointment events

### Doctor Portal
- **Today's queue** with patient appointments
- **AI pre-visit symptom summary** with urgency levels (Low/Medium/High)
- **Submit visit notes** and prescriptions
- **AI-generated patient-friendly summaries** from clinical notes

### Admin Portal
- **Manage doctor profiles** (create, edit, delete)
- **Configure working hours** per doctor
- **Mark doctor leave** (with automatic appointment cascade cancellation)
- **Monitor failed notifications**

### System Features
- 🔒 **JWT role-based authentication** (patient/doctor/admin)
- 🛡️ **Double-booking prevention** via PostgreSQL partial unique index
- ⏱️ **5-minute hold mechanism** with automatic expiry
- 🤖 **LLM integration** (OpenAI/Claude) with graceful failure handling
- 📧 **Email notifications** with retry logic (3 attempts)
- 📅 **Google Calendar** event creation/deletion
- 💊 **Medication reminders** based on prescription frequency

## 🏗️ Architecture

```
healthcare-app/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # Database & environment config
│   │   ├── controllers/      # Route handlers
│   │   ├── db/               # Migrations & seed data
│   │   ├── jobs/             # Cron jobs (holds, notifications, medication)
│   │   ├── middleware/       # Auth, authorization, error handling
│   │   ├── routes/           # Express routes
│   │   ├── services/         # LLM, email, calendar services
│   │   ├── tests/            # Integration tests
│   │   └── utils/            # Error classes, async handler
│   └── package.json
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/       # Shared components (Layout, Toast, etc.)
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Patient, Doctor, Admin portals
│   │   ├── styles/           # Additional CSS
│   │   └── utils/            # API fetch wrapper
│   └── package.json
└── README.md
```

## 🚀 Setup Guide

### Prerequisites
- **Node.js** v18+ 
- **PostgreSQL** 14+
- **npm** v8+

### 1. Clone & Install

```bash
git clone <repository-url>
cd healthcare-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb healthcare_db

# Or via psql:
psql -U postgres -c "CREATE DATABASE healthcare_db;"
```

### 3. Environment Configuration

```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

**Required environment variables:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `LLM_PROVIDER` | `openai` or `anthropic` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) |
| `ANTHROPIC_API_KEY` | Anthropic API key (if using Claude) |
| `EMAIL_HOST` | SMTP host (e.g., smtp.gmail.com) |
| `EMAIL_PORT` | SMTP port (e.g., 587) |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password/app password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL |

### 4. Run Migrations & Seed

```bash
cd backend
npm run migrate    # Creates all database tables
npm run seed       # Seeds admin, doctors, and patient data
```

**Seed credentials:**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@healthcare.com | admin123 |
| Doctor | sarah@healthcare.com | doctor123 |
| Doctor | michael@healthcare.com | doctor123 |
| Patient | john@example.com | patient123 |

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev        # Starts on port 5000

# Terminal 2: Frontend
cd frontend
npm run dev        # Starts on port 5173
```

Visit **http://localhost:5173** to access the application.

### 6. Run Tests

```bash
cd backend
npm test           # Runs booking engine integration tests
```

## 📧 Email Configuration

### Gmail App Password
1. Enable 2-Step Verification in Google Account
2. Go to Security → App passwords
3. Generate an app password for "Mail"
4. Use this as `EMAIL_PASS`

### SendGrid (Alternative)
1. Sign up at sendgrid.com
2. Set `EMAIL_HOST=smtp.sendgrid.net`, `EMAIL_PORT=587`
3. Use API key as `EMAIL_PASS`

## 📅 Google Calendar Setup

### 1. Create OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URI: `http://localhost:5000/api/oauth/google/callback`
7. Copy Client ID and Client Secret to `.env`

### 2. Configure Consent Screen
1. Go to **OAuth consent screen**
2. Set to **External** (or Internal for Workspace)
3. Add required scopes: `calendar.events`
4. Add test users during development

### 3. Usage
1. Log in as a patient
2. Navigate to appointments
3. Click "Connect Google Calendar"
4. Authorize the application
5. Calendar events are auto-created on booking confirmation

## 🔌 API Documentation

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new patient | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |

### Doctors (Public)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/doctors?specialisation=` | Search doctors | ❌ |
| GET | `/api/doctors/:id` | Get doctor detail | ❌ |
| GET | `/api/doctors/:id/slots?date=` | Get available slots | ✅ |

### Appointments
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/appointments/hold` | Hold a slot (5 min) | Patient |
| POST | `/api/appointments/:id/confirm` | Confirm appointment | Patient |
| POST | `/api/appointments/:id/cancel` | Cancel appointment | Patient/Doctor |
| GET | `/api/appointments/my` | My appointments | Patient |
| GET | `/api/appointments/doctor?date=` | Doctor's appointments | Doctor |
| GET | `/api/appointments/:id` | Appointment detail | Patient/Doctor |
| POST | `/api/appointments/:id/symptoms` | Submit symptoms | Patient |
| POST | `/api/appointments/:id/notes` | Submit visit notes | Doctor |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/doctors` | Create doctor | Admin |
| GET | `/api/admin/doctors` | List all doctors | Admin |
| PUT | `/api/admin/doctors/:id` | Update doctor | Admin |
| DELETE | `/api/admin/doctors/:id` | Delete doctor | Admin |
| POST | `/api/admin/doctors/:id/hours` | Set working hours | Admin |
| POST | `/api/admin/doctors/:id/leave` | Mark leave | Admin |
| GET | `/api/admin/notifications?status=` | View notifications | Admin |

### Google OAuth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/oauth/google` | Get OAuth URL | ✅ |
| GET | `/api/oauth/google/callback` | Handle callback | ❌ |
| GET | `/api/oauth/google/status` | Check connection | ✅ |

## 🗄️ Database Schema

### Core Tables
- **users** — All user accounts with role-based access
- **doctor_profiles** — Doctor specialisation, bio, slot duration
- **doctor_hours** — Working hours per day of week
- **doctor_leaves** — Leave days with cascade appointment cancellation

### Appointment Tables
- **appointments** — Booking with status lifecycle (held → confirmed → completed)
- **symptom_forms** — Patient symptoms + AI pre-visit summary
- **visit_notes** — Doctor notes + prescription + AI post-visit summary

### Notification Tables
- **notifications** — Email notifications with retry logic
- **medication_reminders** — Prescription-based medication reminders
- **calendar_events** — Google Calendar event tracking

### Auth Tables
- **oauth_tokens** — Google OAuth refresh tokens

### Critical Index
```sql
CREATE UNIQUE INDEX uniq_active_slot
ON appointments (doctor_id, slot_start)
WHERE status IN ('held', 'confirmed');
```
This partial unique index prevents double-booking at the database level.

## 🤖 LLM Prompts

### Pre-Visit Summary
```
Analyse these symptoms and return a JSON object with exactly these fields:
urgency (one of: Low, Medium, High),
chief_complaint (string),
questions (array of exactly 3 strings - suggested questions for the doctor).
Symptoms: <patient symptoms>
```

### Post-Visit Summary
```
Convert these clinical notes into a patient-friendly summary. Include:
1) A clear summary of what was discussed/found during the visit
2) A medication schedule table showing each drug, dosage, frequency, and duration
3) Follow-up steps the patient should take.
Clinical notes: <doctor notes>. Prescription: <prescription JSON>
```

## 🚢 Deployment

### Backend (Render/Railway)
1. Set build command: `npm install`
2. Set start command: `npm start`
3. Add all environment variables
4. Use a managed PostgreSQL service (Neon/Supabase/Railway)

### Frontend (Vercel)
1. Set root directory: `frontend`
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL=<backend-url>`
