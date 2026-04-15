# OPD Pre-Consultation AI Agent — POC

AI-powered pre-consultation system for Indian hospital OPDs. Collects patient history, documents, and vitals DURING the wait, and delivers a structured summary to the doctor BEFORE the patient walks in.

## Why

Indian OPDs see 2,000–15,000 patients per day. Doctors get under 1 minute per patient. Patients wait 2–6 hours. This system turns that waiting time into useful data collection — multi-lingual symptom interviews, document OCR, vitals capture, and LLM-generated pre-consultation reports with FHIR-compliant output.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), React 18, mobile-first PWA |
| Node backend | Express, PostgreSQL (pg), JWT auth |
| Python backend | FastAPI, Claude / Gemini SDK, Tesseract OCR, psycopg2 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Object storage | MinIO (S3-compatible) |
| Gateway | Nginx reverse proxy |
| Orchestration | Docker Compose (local) / single-container Dockerfile (Railway) |
| Languages | English, Hindi, Telugu |

## Architecture

```
┌──────────┐    ┌─────────────┐
│ Browser  │───▶│ Gateway :80 │
└──────────┘    └──────┬──────┘
                       │
      ┌────────────────┼────────────────┐
      ▼                ▼                ▼
┌──────────┐    ┌─────────────┐   ┌─────────────┐
│ Frontend │    │ Node Backend│   │ Py Backend  │
│ :3000    │    │ :4001       │   │ :4002       │
└──────────┘    │ session/q/  │   │ llm/triage/ │
                │ doctor/HIS  │   │ report/OCR  │
                └──────┬──────┘   └──────┬──────┘
                       │                 │
                       ▼                 ▼
                ┌─────────────────────────────┐
                │ PostgreSQL · Redis · MinIO  │
                └─────────────────────────────┘
```

## Project Structure

```
opd-preconsult/
├── docker-compose.yml           # 7-service local stack
├── Dockerfile.railway           # Single-container build for Railway
├── railway.toml / railpack.json # Railway deployment config
├── .env.example
├── db/migrations/               # 5 SQL migrations (auto-run on startup)
├── services/
│   ├── gateway/nginx.conf
│   ├── node-backend/            # Express: session, questionnaire, doctor, HIS
│   └── python-backend/          # FastAPI: LLM, triage, report, OCR
├── frontend/                    # Next.js app with /patient, /doctor, /his routes
├── deploy/                      # Railway deploy scripts (nginx + supervisord + start.sh)
├── start.sh                     # Railway entry point (delegates to deploy/start.sh)
└── scripts/generate-qr.js       # Helper to generate QR payloads
```

## Prerequisites

- Docker and Docker Compose
- (Optional) Gemini or Anthropic API key for LLM-generated reports — the system has a rule-based fallback that works without it

## Setup (Local Docker Compose)

```bash
git clone <repo>
cd opd-preconsult

# Copy env template and edit
cp .env.example .env

# Set your LLM API key in .env (optional — fallback works without it)
# GEMINI_API_KEY=AIzaSy...        (preferred)
# or ANTHROPIC_API_KEY=sk-ant-...

# Build and start all services
docker compose up --build
```

First-run takes ~5 minutes (pulls images, builds containers, installs Tesseract OCR models). Subsequent starts are fast.

The migrations auto-run on first startup. 3 demo doctors are seeded.

## Access URLs

Once running:

| Service | URL |
|---------|-----|
| Patient app | `http://localhost:3000/?qr=<BASE64_QR>` |
| Doctor app | `http://localhost:3000/doctor` |
| HIS admin dashboard | `http://localhost:3000/his` |
| Mock HIS FHIR receiver | `http://localhost/his/dashboard` |
| MinIO console | `http://localhost:9001` (minioadmin / changeme_in_production) |

## Demo Credentials

### Doctor Login (`/doctor`)
PIN for all demo doctors: `1234`

| Doctor | Phone | Department |
|--------|-------|-----------|
| Dr. Priya Sharma | 9876500001 | CARD |
| Dr. Anil Reddy | 9876500002 | CARD |
| Dr. Kavitha Menon | 9876500003 | GEN |

### Generating a QR Payload for the Patient App

The patient app expects a base64-encoded JSON payload containing hospital + department context.

**Quick copy-paste (Cardiology, queue slot 42):**

```
http://localhost:3000/?qr=eyJob3NwaXRhbF9pZCI6ImRlbW9faG9zcGl0YWxfMDEiLCJkZXBhcnRtZW50IjoiQ0FSRCIsInF1ZXVlX3Nsb3QiOjQyfQ==
```

**Generate your own:**

```bash
# Cardiology
echo '{"hospital_id":"demo_hospital_01","department":"CARD","queue_slot":42}' | base64 -w0

# General Medicine
echo '{"hospital_id":"demo_hospital_01","department":"GEN","queue_slot":15}' | base64 -w0
```

**Or use the helper script:**

```bash
node scripts/generate-qr.js CARD    # prints QR + full URL
node scripts/generate-qr.js GEN
```

## Demo Flow

1. Open patient URL → select language (English/Hindi/Telugu)
2. Register: Name + Phone + Age + Gender
3. Give DPDP consent
4. Upload documents (prescription, lab report, etc.) — Tesseract OCR extracts medications + lab values; patient confirms each
5. Answer symptom questionnaire (one question per screen, voice input supported). Chest pain + radiation → RED triage alert
6. Enter vitals: BP, weight, SpO2, heart rate, temperature
7. Pre-consultation report auto-generated — LLM merges questionnaire answers + document OCR data + vitals into a SOAP-style summary with FHIR R4 bundle
8. Doctor logs in → sees triage-prioritized queue → clicks patient → reviews enriched report → gives feedback
9. HIS admin view — all sessions, filter by doctor/dept/state, reassign patients

## Key Features

- **Multi-lingual**: English, Hindi, Telugu (Web Speech API for voice input)
- **Configurable questionnaires**: DAG stored in DB, admin-editable
- **Branching logic**: Answer YES to chest pain → follow-up on radiation → RED triage
- **OCR pipeline**: Tesseract with English/Hindi/Telugu models, extracts meds + lab values, classifies doc type
- **Triage engine**: Rule-based RED/AMBER/GREEN evaluation
- **LLM reports**: Claude or Gemini integration merges questionnaire + OCR + vitals, with rule-based fallback when no API key is set
- **FHIR R4 output**: Patient, Observation, Condition, MedicationStatement resources
- **Doctor workflow**: PIN login, department-scoped queue, auto-assign on click, unassign/reassign
- **HIS dashboard**: Per-doctor stats, patient filtering, reassignment

## Common Commands

```bash
# View logs
docker compose logs -f [service]

# Restart a service after code change
docker compose restart node-backend

# Rebuild after dependency change
docker compose build <service> && docker compose up -d

# Run a migration against running DB
docker compose exec -T postgres psql -U opd_user -d opd_preconsult < db/migrations/005_doctors.sql

# Stop everything
docker compose down

# Stop + wipe data volumes
docker compose down -v
```

## Deployment (Railway.app)

The project includes Railway-ready configs — a single-container build that runs nginx + node-backend + python-backend + frontend together via supervisord.

**Files:**
- `Dockerfile.railway` — multi-stage build
- `railway.toml` — deploy config
- `railpack.json` — alternate build config (if using Railpack instead of Dockerfile)
- `start.sh` — root entrypoint shim
- `deploy/start.sh` — main startup script (runs migrations, sets up nginx, starts supervisord)
- `deploy/nginx.conf` — reverse proxy (listens on `$PORT`)
- `deploy/supervisord.conf` — process manager template

**Steps:**
1. Push code to GitHub, create Railway project from the repo
2. Set **Root Directory** = `opd-preconsult`, **Dockerfile Path** = `Dockerfile.railway`, leave Build Command empty
3. Add PostgreSQL plugin (Redis is optional)
4. Set env vars in your app service (Variables → Raw Editor):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<random-64-char-string>
   GEMINI_API_KEY=AIzaSy...   # or ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Set health check path = `/healthz` and timeout = 300s in Service Settings
6. Deploy — Railway builds, runs migrations, starts all services on a single public port

The app auto-detects `DATABASE_URL` (Railway/Heroku style) or individual `POSTGRES_*` vars.

## Out of Scope for This POC

- Live ABHA/ABDM API calls (mocked)
- Real hospital LIS integration (upload only)
- Locally-hosted LLM (uses Claude or Gemini API)
- IoT Bluetooth vitals devices (manual entry)
- Offline PWA / Service Worker sync
- Full 22-language support
- NABH reporting
- Production DPDP consent ledger
- Multi-tenant isolation (single hospital only)

## Environment Variables

See `.env.example`. Key ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Railway/Heroku-style DB URL (takes precedence if set) |
| `POSTGRES_*` | Database connection (used if `DATABASE_URL` not set) |
| `REDIS_URL` | Cache (optional) |
| `MINIO_*` | Object storage (optional, not currently used) |
| `JWT_SECRET` | Auth token signing |
| `GEMINI_API_KEY` | Google Gemini — preferred LLM if set |
| `GEMINI_MODEL` | Override default `gemini-2.0-flash-exp` |
| `ANTHROPIC_API_KEY` | Claude LLM — used if Gemini key not set |
| `ANTHROPIC_MODEL` | Override default `claude-sonnet-4-20250514` |
| `TWILIO_*` | WhatsApp/SMS (optional) |
| `DEMO_HOSPITAL_ID` | Default hospital for QR codes |
| `PORT` | Port nginx listens on (Railway sets this automatically) |

**LLM provider selection:** If `GEMINI_API_KEY` is set, Gemini is used. Otherwise, if `ANTHROPIC_API_KEY` is set, Claude is used. If neither is set, a rule-based fallback generates the report.

## License

POC — not for production use without clinical validation.
