# PRAANA

PRAANA is a patient-first low back pain screening and clinician decision-support platform built by SMIT x SMIMS (Sikkim).

It provides two focused flows:

1. Patient screening flow using Oswestry-style disability questions and VAS pain score.
2. Doctor-only clinical prediction flow using biomarker inputs, model confidence, SHAP-driven top features, and LLM explanation.

## Product Flows

### Patient flow (public)

- Route: `/`
- Primary CTA: `Check My Back Pain`
- Questionnaire route: `/screening`
- Results route: `/screening/results`
- Data saved to backend research table through: `POST /api/screening-data`

### Doctor flow (direct portal)

- Route: `/doctor`
- Results route: `/doctor/results`
- Prediction endpoint: `POST /predict`

## Tech Stack

- Frontend: React + Vite + Tailwind CSS + Framer Motion
- Backend: FastAPI + SQLAlchemy
- Model: XGBoost with SHAP explanations
- LLM explanations: Groq API
- Database:
  - Production: PostgreSQL via `DATABASE_URL`
  - Local fallback: SQLite (`backend/screening_data.db`)

## API Endpoints

- `GET /health`
- `GET /dataset-stats`
- `POST /predict`
- `POST /api/screening-data`
- `GET /api/screening-stats`

## Environment Configuration

Copy `.env.example` to `.env` at repository root and fill values.

Required:

- `GROQ_API_KEY`

Recommended:

- `GROQ_MODEL`
- `GROQ_MODEL_FALLBACKS`
- `DATABASE_URL` (production PostgreSQL or Supabase pooler)
- `CORS_ORIGINS`
- `VITE_API_URL`

Notes:

- If `DATABASE_URL` is empty, backend uses local SQLite automatically.
- If model artifacts are missing, backend startup attempts artifact generation from dataset.

## Local Development

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend setup (new terminal)

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run dev:local
```

### 3. One-command local launch (Windows)

From repository root:

```powershell
.\run-local.ps1
```

## Deployment

### Backend (Render)

- Config file: `backend/render.yaml`
- Build command trains model artifacts during deploy.

### Frontend (Netlify)

- Config file: `frontend/netlify.toml`
- SPA redirect rule included.

## Data Schema

`screening_responses` table columns:

- `id`
- `oswestry_score`
- `vas_score`
- `severity_label`
- `patient_age` (optional)
- `patient_sex` (optional)
- `timestamp`

## Clinical Disclaimer

PRAANA is a screening and decision-support tool. Final diagnosis and management decisions must be made by qualified clinicians using full clinical context, imaging, and examination.