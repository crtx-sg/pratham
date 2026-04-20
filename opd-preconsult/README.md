# OPD Pre-Consultation AI Agent

AI-powered OPD system for Indian hospitals. Collects patient history, documents, and vitals DURING the wait, delivers structured reports to doctors, enables prescription writing with drug interaction checks, ambient consultation recording, automated follow-ups, and analytics.

## Why

Indian OPDs see 2,000–15,000 patients/day. Doctors get under 1 minute per patient. Patients wait 2–6 hours. This system turns waiting time into data collection and gives doctors an AI-enriched pre-consultation summary before the patient walks in.

## Features

### Patient Intake & Triage
- **QR-code kiosk entry** — scan at registration desk, begins pre-consultation flow
- **WhatsApp intake** — Twilio webhook enables full questionnaire flow over WhatsApp (dept selection, registration, symptom interview)
- **Multi-lingual** — English, Hindi, Telugu with Web Speech API voice input
- **DPDP consent** — audit-logged data protection consent capture
- **Branching questionnaires** — DAG-based, department-specific, admin-editable
- **Rule-based triage** — RED/AMBER/GREEN with critical vitals detection (BP >180, SpO2 <90, chest pain + radiation)
- **Nursing station alerts** — Server-Sent Events (SSE) push RED triage alerts to connected browsers in real-time via Redis pub/sub
- **ICD-10 coding** — 22 common OPD symptoms auto-mapped to ICD-10 codes in FHIR output

### Document Processing
- **OCR pipeline** — Tesseract with English/Hindi/Telugu models
- **Medication extraction** — 60+ common Indian drugs with dose/frequency parsing
- **Lab value extraction** — PT/INR, HbA1c, FBS, creatinine, hemoglobin, WBC, platelet
- **Abnormal value flagging** — reference ranges applied, `is_abnormal` flag returned for each lab value
- **Document classification** — prescription, lab report, discharge summary, diagnostic report

### AI Reports
- **LLM-powered reports** — Google Gemini (preferred) or Anthropic Claude, with rule-based fallback
- **SOAP-style summary** — merges questionnaire answers + OCR data + vitals
- **FHIR R4 bundles** — Patient, Observation, Condition (ICD-10 coded), MedicationStatement resources
- **Doctor feedback** — accurate/inaccurate rating on generated reports

### Ambient AI Scribe
- **Consultation recording** — MediaRecorder API in doctor dashboard, start/stop button
- **Transcription** — OpenAI Whisper API (POC), zero-retention (audio never persisted to disk)
- **SOAP extraction** — LLM processes transcript into structured Subjective/Objective/Assessment/Plan notes
- **Editable transcript** — doctor can correct before SOAP extraction
- **Stored per session** — SOAP notes linked to session reports

### Prescription & Pharmacy
- **Prescription writing** — drug autocomplete (60+ drugs), dose, frequency, duration, instructions
- **Drug interaction checking** — static matrix of ~50 critical drug-drug interactions for Indian market drugs
- **Allergy cross-referencing** — checks prescribed drugs against patient allergies (sulfa, penicillin, NSAIDs, drug classes)
- **Block/warn system** — hard blocks for contraindicated combinations, warnings for monitoring-required pairs
- **QR digital prescription** — HMAC-signed JSON encoded as QR payload for pharmacy scanning
- **QR verification endpoint** — pharmacy scans QR, verifies signature, retrieves structured prescription

### Clinical Protocols (No-Code Guardrails)
- **Protocol management** — CRUD API + HIS dashboard UI for clinical protocols per department
- **Trigger conditions** — activate protocols based on questionnaire answers (e.g., chest pain → cardiac protocol)
- **Required vitals/tests** — protocols specify what data must be collected (e.g., Cardiology → BP + Lipid Profile)
- **Auto-prompt** — vitals page shows protocol-required fields prominently
- **Pre-visit messages** — multi-lingual patient advisory messages per protocol

### Doctor Workflow
- **PIN login** — 4-6 digit numeric PIN, SHA-256 hashed
- **Triage-prioritized queue** — RED patients first, auto-assign on click
- **Report/Prescribe/Scribe tabs** — three workflows in one dashboard
- **Session reassignment** — unassign, reassign to other doctors in department
- **Consultation history** — view completed sessions with feedback

### Automated Follow-ups
- **Protocol-triggered scheduling** — on session completion, matching protocols schedule follow-up messages
- **Background worker** — 5-minute interval, sends due follow-ups via Twilio WhatsApp/SMS
- **Response handling** — patient replies "better" → case closed, "worse" → flagged for follow-up visit
- **Dry-run mode** — logs messages when Twilio is not configured

### Analytics Dashboard
- **Configurable period** — 6h, 12h, 24h, 48h, 7d views
- **Summary cards** — total sessions, completed, avg total time, triage distribution
- **Department breakdown** — sessions per department with completion rate
- **Doctor breakdown** — sessions per doctor, completed count, RED alert count
- **Session state distribution** — INIT through COMPLETE pipeline visibility
- **Follow-up stats** — pending, sent, responded, closed

### HIS Admin Dashboard
- **Session management** — list, filter by department/doctor/state, reassign
- **Doctor management** — create, deactivate, list by department
- **Department management** — create/delete with referential integrity checks
- **Questionnaire builder** — form-based editor with branching rules, triage flags, multi-lingual text
- **Protocol manager** — create/edit clinical guardrails with trigger conditions and required data
- **Analytics tab** — OPD performance metrics

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), React 18, mobile-first |
| Node backend | Express, PostgreSQL (pg), JWT auth, ioredis |
| Python backend | FastAPI, Gemini/Claude SDK, Tesseract OCR, OpenAI Whisper |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (pub/sub for SSE alerts) |
| Object storage | MinIO (S3-compatible) |
| Gateway | Nginx reverse proxy |
| Messaging | Twilio (WhatsApp sandbox / SMS) |
| Orchestration | Docker Compose (local) / single-container (Railway) |
| Languages | English, Hindi, Telugu |

## Architecture

```
                           ┌──────────┐
                    ┌──────│ Browser  │──────┐
                    │      └──────────┘      │
                    │                        │
               ┌────▼─────┐          ┌───────▼───────┐
               │ Gateway   │          │ Twilio        │
               │ :80       │          │ WhatsApp/SMS  │
               └────┬──────┘          └───────┬───────┘
                    │                         │
   ┌────────────────┼──────────────────┐      │
   ▼                ▼                  ▼      ▼
┌──────────┐ ┌─────────────┐    ┌─────────────────┐
│ Frontend │ │ Node Backend │    │ Python Backend   │
│ :3000    │ │ :4001        │    │ :4002            │
└──────────┘ │ session/q    │    │ llm/triage       │
             │ doctor/HIS   │    │ report/OCR       │
             │ protocol     │    │ scribe           │
             │ prescription │    │ drug interactions │
             │ whatsapp     │    └────────┬─────────┘
             │ alerts (SSE) │             │
             │ followup     │             │
             │ analytics    │             │
             └──────┬───────┘             │
                    │                     │
                    ▼                     ▼
             ┌─────────────────────────────────┐
             │ PostgreSQL · Redis · MinIO      │
             └─────────────────────────────────┘
```

## Project Structure

```
opd-preconsult/
├── docker-compose.yml
├── Dockerfile.railway
├── .env.example
├── db/migrations/
│   ├── 001_sessions.sql          # Core session tables
│   ├── 002_questionnaires.sql    # Questionnaire DAG
│   ├── 003_protocols.sql         # Clinical protocols
│   ├── 004_audit.sql             # Audit logging
│   ├── 005_doctors.sql           # Doctor management
│   ├── 006_departments.sql       # Department master
│   ├── 007_prescriptions.sql     # Prescriptions + allergies
│   ├── 008_followups.sql         # Scheduled follow-ups
│   └── 009_scribe.sql            # Ambient scribe columns
├── services/
│   ├── gateway/nginx.conf
│   ├── node-backend/src/
│   │   ├── routes/
│   │   │   ├── session.js        # Patient session lifecycle
│   │   │   ├── questionnaire.js  # DAG traversal + answers
│   │   │   ├── vitals.js         # Vital signs capture
│   │   │   ├── doctor.js         # Doctor auth + queue
│   │   │   ├── admin.js          # Department + question CRUD
│   │   │   ├── protocol.js       # Protocol CRUD + evaluate
│   │   │   ├── prescription.js   # Rx CRUD + QR + allergies
│   │   │   ├── whatsapp.js       # Twilio WhatsApp webhook
│   │   │   ├── alerts.js         # SSE nursing station alerts
│   │   │   ├── followup.js       # Follow-up scheduling
│   │   │   ├── analytics.js      # OPD analytics queries
│   │   │   └── mock-his.js       # Mock FHIR receiver
│   │   └── workers/
│   │       └── followup-worker.js  # Background follow-up sender
│   └── python-backend/src/
│       ├── routers/
│       │   ├── llm.py            # LLM interview assistant
│       │   ├── triage.py         # Triage evaluation + Redis alerts
│       │   ├── report.py         # Report generation + FHIR + ICD-10
│       │   ├── ocr.py            # OCR + abnormal lab flagging
│       │   ├── prescription.py   # Drug interaction checking
│       │   └── scribe.py         # Ambient scribe (Whisper + SOAP)
│       ├── drug_interactions.py  # Static drug interaction matrix
│       ├── llm_client.py         # Gemini/Claude unified client
│       └── prompts/
│           ├── system_report.txt   # Report generation prompt
│           ├── system_interview.txt  # Interview assistant prompt
│           └── system_scribe.txt   # SOAP extraction prompt
├── frontend/src/app/
│   ├── page.jsx                  # QR scanner home
│   ├── patient/                  # Patient flow (register, consent, documents, interview, vitals, done)
│   ├── doctor/page.jsx           # Doctor dashboard (Report, Prescribe, Scribe tabs)
│   └── his/page.jsx              # HIS admin (Sessions, Doctors, Questions, Departments, Protocols, Analytics)
├── deploy/                       # Railway deployment scripts
└── scripts/generate-qr.js       # QR payload generator
```

## Prerequisites

- Docker and Docker Compose
- (Optional) API keys:
  - `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` — for LLM reports (rule-based fallback works without)
  - `OPENAI_API_KEY` — for Whisper transcription in ambient scribe
  - `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` — for WhatsApp/SMS follow-ups (dry-run mode without)

## Setup

### Local Docker Compose

```bash
cd opd-preconsult

# Copy env template
cp .env.example .env

# Set API keys in .env (all optional — system degrades gracefully)
# GEMINI_API_KEY=AIzaSy...        # LLM reports (preferred)
# ANTHROPIC_API_KEY=sk-ant-...    # LLM reports (fallback)
# OPENAI_API_KEY=sk-...           # Whisper transcription
# TWILIO_ACCOUNT_SID=AC...        # WhatsApp/SMS
# TWILIO_AUTH_TOKEN=...

# Build and start all services
docker compose up --build
```

First-run takes ~5 minutes (image pulls, Tesseract OCR models). Subsequent starts are fast.

All 9 migrations run automatically on startup. 3 demo doctors and 2 departments are seeded.

### Updating After Code Changes

```bash
# After changing Node backend code
docker compose restart node-backend

# After changing Python backend code
docker compose restart python-backend

# After changing frontend code
docker compose restart frontend

# After changing dependencies (requirements.txt, package.json)
docker compose build <service> && docker compose up -d

# After adding new migrations
docker compose exec -T postgres psql -U opd_user -d opd_preconsult < db/migrations/007_prescriptions.sql
docker compose exec -T postgres psql -U opd_user -d opd_preconsult < db/migrations/008_followups.sql
docker compose exec -T postgres psql -U opd_user -d opd_preconsult < db/migrations/009_scribe.sql

# Or restart everything (migrations run on Node backend startup for new tables)
docker compose down && docker compose up --build
```

## Access URLs

| Service | URL |
|---------|-----|
| Patient app | `http://localhost:3000/?qr=<BASE64_QR>` |
| Doctor app | `http://localhost:3000/doctor` |
| HIS admin | `http://localhost:3000/his` |
| Mock HIS FHIR | `http://localhost/his/dashboard` |
| MinIO console | `http://localhost:9001` (minioadmin / changeme_in_production) |

## Demo Credentials

### Doctor Login (`/doctor`)
PIN for all demo doctors: `1234`

| Doctor | Phone | Department |
|--------|-------|-----------|
| Dr. Priya Sharma | 9876500001 | CARD |
| Dr. Anil Reddy | 9876500002 | CARD |
| Dr. Kavitha Menon | 9876500003 | GEN |

### QR Payload for Patient App

```bash
# Cardiology, queue slot 42
echo '{"hospital_id":"demo_hospital_01","department":"CARD","queue_slot":42}' | base64 -w0

# Or use the helper
node scripts/generate-qr.js CARD
```

Quick link: `http://localhost:3000/?qr=eyJob3NwaXRhbF9pZCI6ImRlbW9faG9zcGl0YWxfMDEiLCJkZXBhcnRtZW50IjoiQ0FSRCIsInF1ZXVlX3Nsb3QiOjQyfQ==`

## Testing Each Feature

### 1. Patient Intake (QR)
1. Open patient URL with QR parameter
2. Select language → Register → Consent → Upload documents → Answer questionnaire → Enter vitals
3. Verify: triage badge appears, report is generated, session shows in doctor queue

### 2. WhatsApp Intake
1. Configure Twilio sandbox: set webhook URL to `https://<your-domain>/api/whatsapp/webhook`
2. Send "Hi" to the Twilio sandbox WhatsApp number
3. Verify: bot asks for department, name, age, gender, then runs through questionnaire
4. Check HIS dashboard — session should appear with `input_mode: whatsapp` answers

### 3. Triage & Nursing Alerts
1. Open `http://localhost:3000/his` — sessions tab is the default
2. In another tab, complete a patient flow answering "Yes" to chest pain + radiation
3. Verify: session shows RED triage badge, SSE alert fires to connected HIS browsers
4. To test SSE directly: `curl -N http://localhost/api/alerts/stream`

### 4. Document OCR + Abnormal Highlighting
1. Upload a lab report image during patient flow
2. Verify response includes `is_abnormal: true/false` and `reference_range` for each extracted lab value
3. Example: HbA1c of 7.2 should return `is_abnormal: true, reference_range: "4.0-5.6"`

### 5. Clinical Protocols
1. Go to HIS → Protocols tab → select department → create a protocol:
   - ID: `proto_chest_pain`, Name: "Chest Pain Protocol"
   - Trigger condition: `q_chest_pain` = `yes`
   - Required vitals: `BP, SpO2, Heart Rate`
   - Required tests: `ECG, Troponin, Lipid Profile`
2. Start a patient session, answer "Yes" to chest pain
3. On the vitals page, verify the yellow "Protocol Required" banner appears

### 6. Prescription Writing
1. Login as doctor → select a completed patient → click "Prescribe" tab
2. Add drugs (autocomplete from 60+ drug list), set dose/frequency/duration
3. Click "Check Interactions" — verify warnings appear for known pairs (e.g., Warfarin + Aspirin)
4. Save → verify QR payload is generated
5. Test QR verification: `POST /api/prescription/verify-qr` with the payload

### 7. Drug Interaction Checking
```bash
# Single drug check
curl -X POST http://localhost/api/prescription/check-interactions \
  -H "Content-Type: application/json" \
  -d '{"drug_name":"warfarin","other_drugs":["aspirin","metoprolol"],"patient_allergies":["sulfa"]}'

# Bulk check
curl -X POST http://localhost/api/prescription/check-bulk \
  -H "Content-Type: application/json" \
  -d '{"drugs":["metoprolol","verapamil","warfarin"],"patient_allergies":[]}'
# Expected: BLOCK on metoprolol+verapamil (beta-blocker + non-DHP CCB)
```

### 8. Ambient Scribe
1. Login as doctor → select a patient → click "Scribe" tab
2. Click "Start Recording" → speak a simulated consultation → click "Stop Recording"
3. Verify transcript appears (requires `OPENAI_API_KEY`)
4. Click "Extract SOAP Notes" → verify structured SOAP output
5. Without API key: transcript shows placeholder message, fallback SOAP generated

### 9. Follow-ups
```bash
# Schedule a follow-up manually
curl -X POST http://localhost/api/followup \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<uuid>","patient_phone":"9876543210","message":"How are you feeling? Reply BETTER or WORSE.","send_at":"2026-04-20T10:00:00Z"}'

# Check worker logs
docker compose logs -f node-backend | grep followup-worker
```

### 10. Analytics
1. Go to HIS → Analytics tab
2. Select time period (6h / 12h / 24h / 48h / 7d)
3. Verify: summary cards, department table, doctor table, state distribution
4. API: `GET /api/analytics/summary?hours=24`

## API Reference

### Node Backend (`:4001`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/session/scan` | POST | QR scan → create session |
| `/api/session/register` | POST | Patient registration |
| `/api/session/consent` | POST | DPDP consent |
| `/api/q/next/:session_id` | GET | Next questionnaire question |
| `/api/q/answer` | POST | Submit answer |
| `/api/vitals/:session_id` | POST/GET | Submit/get vitals |
| `/api/doctor/login` | POST | PIN auth |
| `/api/doctor/queue` | GET | Doctor's patient queue |
| `/api/doctor/assign/:id` | POST | Self-assign session |
| `/api/protocol` | GET/POST | List/create protocols |
| `/api/protocol/evaluate/:id` | GET | Evaluate protocols for session |
| `/api/prescription` | POST | Create prescription + QR |
| `/api/prescription/session/:id` | GET | Get prescriptions for session |
| `/api/prescription/verify-qr` | POST | Verify QR prescription |
| `/api/prescription/allergies/:phone` | GET | Get patient allergies |
| `/api/prescription/allergies` | POST | Add allergy |
| `/api/whatsapp/webhook` | POST | Twilio WhatsApp webhook |
| `/api/alerts/stream` | GET | SSE stream for triage alerts |
| `/api/followup` | GET/POST | List/schedule follow-ups |
| `/api/followup/:id/respond` | POST | Record patient response |
| `/api/analytics/summary` | GET | OPD analytics |
| `/api/admin/departments` | GET/POST/DELETE | Department CRUD |
| `/api/admin/questions` | GET/POST/PUT/DELETE | Question CRUD |

### Python Backend (`:4002`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/llm/interview` | POST | LLM-powered follow-up questions |
| `/api/triage/evaluate` | POST | Triage evaluation + Redis alert |
| `/api/report/generate` | POST | Generate report + FHIR bundle |
| `/api/report/:session_id` | GET | Get stored report |
| `/api/ocr/process` | POST | OCR document + abnormal flagging |
| `/api/prescription/check-interactions` | POST | Single drug interaction check |
| `/api/prescription/check-bulk` | POST | Bulk interaction check |
| `/api/scribe/transcribe` | POST | Audio → text (Whisper) |
| `/api/scribe/extract-soap` | POST | Transcript → SOAP notes |
| `/api/scribe/soap/:session_id` | GET | Get stored SOAP notes |

## Production Extensibility

The system is designed as a POC with clear extension points for production:

### Transcription: Whisper → Bhasini
The ambient scribe uses OpenAI Whisper for POC. For production Indian language support:
- **Bhasini API** (bhashini.gov.in) provides ASR for 22 Indian languages
- Replace the `openai.audio.transcriptions.create()` call in `scribe.py` with Bhasini's ASR endpoint
- The rest of the pipeline (SOAP extraction via LLM) works unchanged
- `VoiceButton.jsx` already supports `hi-IN` and `te-IN` via Web Speech API — Bhasini extends this to server-side transcription

### Drug Interactions: Static → DrugBank/Indian Pharmacopoeia
- Current: static JSON matrix of ~50 critical interactions in `drug_interactions.py`
- Production: integrate with DrugBank API, Indian Pharmacopoeia Commission database, or CDSCO drug registry
- The `check_interactions()` / `check_allergies()` interface stays the same

### Prescription QR: Signed JSON → ABDM e-Prescription
- Current: HMAC-signed JSON payload for internal hospital use
- Production: implement ABDM (Ayushman Bharat Digital Mission) e-prescription format
- Replace QR generation in `prescription.js` with ABDM-compliant encoding

### Follow-up Worker: setInterval → Bull/BullMQ
- Current: simple `setInterval` loop in Node process
- Production: Bull job queue on Redis for reliability, retries, dead-letter queues
- Redis is already in the stack; upgrade is a drop-in replacement

### WhatsApp: Twilio Sandbox → Business API
- Current: Twilio sandbox for development
- Production: Twilio WhatsApp Business API (requires Meta Business verification)
- Or integrate with WhatsApp Cloud API directly

### ICD-10: Static Map → FHIR Terminology Server
- Current: 22 common conditions statically mapped in `report.py`
- Production: HAPI FHIR terminology server or WHO ICD API for comprehensive coding
- LLM fallback already handles free-text → ICD-10 mapping

### Authentication: PIN → SSO/ABDM
- Current: SHA-256 hashed PIN, no admin auth on HIS endpoints
- Production: integrate hospital SSO, ABDM Health ID for patients, role-based access control
- JWT infrastructure is already in place

### Analytics: Raw SQL → Materialized Views
- Current: on-demand aggregate queries (fine for <1000 sessions/day)
- Production: PostgreSQL materialized views refreshed periodically, or export to BI tool
- Redis caching of analytics results (5-min TTL) using the existing Redis instance

### Multi-tenancy
- Current: single hospital
- Production: add `hospital_id` scoping to all queries, tenant isolation at DB level

## Environment Variables

See `.env.example`. Key ones:

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | Railway/Heroku-style DB URL | One of DATABASE_URL or POSTGRES_* |
| `POSTGRES_*` | Database connection params | One of DATABASE_URL or POSTGRES_* |
| `REDIS_URL` | Cache + pub/sub for alerts | Optional (SSE alerts need it) |
| `JWT_SECRET` | Auth token signing | Yes |
| `GEMINI_API_KEY` | Google Gemini LLM | Optional (preferred) |
| `ANTHROPIC_API_KEY` | Anthropic Claude LLM | Optional (fallback) |
| `OPENAI_API_KEY` | Whisper transcription | Optional (scribe feature) |
| `TWILIO_ACCOUNT_SID` | Twilio auth | Optional (WhatsApp/SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio auth | Optional |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender number | Optional |
| `TWILIO_SMS_FROM` | SMS sender number | Optional |
| `DEMO_QR_SECRET` | QR/prescription HMAC signing | Yes |
| `PORT` | Nginx listen port (Railway sets this) | Auto |

**LLM provider selection:** Gemini if `GEMINI_API_KEY` set → Claude if `ANTHROPIC_API_KEY` set → rule-based fallback.

**Graceful degradation:** Every external service is optional. Without API keys: reports use rule-based generation, scribe shows placeholder, WhatsApp is disabled, follow-ups run in dry-run mode logging to console.

## Common Commands

```bash
# View logs
docker compose logs -f node-backend
docker compose logs -f python-backend

# Restart after code change
docker compose restart node-backend python-backend

# Rebuild after dependency change
docker compose build node-backend python-backend && docker compose up -d

# Run specific migration
docker compose exec -T postgres psql -U opd_user -d opd_preconsult < db/migrations/009_scribe.sql

# Connect to database
docker compose exec postgres psql -U opd_user -d opd_preconsult

# Stop everything
docker compose down

# Stop + wipe data volumes
docker compose down -v
```

## Deployment (Railway.app)

Single-container build running nginx + node + python + frontend via supervisord.

1. Push to GitHub, create Railway project from repo
2. Set Root Directory = `opd-preconsult`, Dockerfile Path = `Dockerfile.railway`
3. Add PostgreSQL plugin (Redis optional but recommended for SSE alerts)
4. Set env vars:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<random-64-char>
   DEMO_QR_SECRET=<random-string>
   GEMINI_API_KEY=...
   OPENAI_API_KEY=...
   ```
5. Health check path = `/healthz`, timeout = 300s
6. Deploy — migrations run automatically on startup

## Out of Scope

- Live ABHA/ABDM API calls (mocked)
- Real hospital LIS/pharmacy inventory integration
- Locally-hosted LLM (uses API)
- IoT Bluetooth vitals devices (manual entry)
- Offline PWA / Service Worker sync
- Full 22-language support (3 languages implemented)
- NABH reporting
- Production DPDP consent ledger
- Multi-tenant isolation
- Speaker diarization in scribe
- Real-time streaming transcription

## License

POC — not for production use without clinical validation.
