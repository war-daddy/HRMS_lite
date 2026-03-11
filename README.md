# HRMS Lite

Lightweight Human Resource Management System for:

- Employee management (add, list, delete)
- Daily attendance tracking (mark Present/Absent, view records, date filtering, summary counts)

## Tech stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy
- **Database**: SQLite

## Project structure

- `backend/` – FastAPI app (`backend/app/main.py`)
- `frontend/` – React app (`frontend/src/`)

## Features implemented (per assignment)

- **Employee Management**
  - Add employee (unique `employee_id`, required fields, valid email)
  - List all employees
  - Delete employee
  - Duplicate handling with `409 Conflict`
- **Attendance Management**
  - Mark attendance (date + Present/Absent)
  - Prevent duplicates per employee/date (`409 Conflict`)
  - View attendance per employee
  - **Bonus**: filter by date range + summary totals (present/absent/total)
- **UX**
  - Clean, consistent UI with loading/empty/error states
  - Reusable UI patterns and minimal, readable code

## Run locally

### Backend

```bash
cd backend
python3 -m venv ../.venv
source ../.venv/bin/activate
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --trusted-host pypi.python.org -r requirements.txt
uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8000
```

Backend health check: `http://127.0.0.1:8000/health`  
API docs (Swagger): `http://127.0.0.1:8000/docs`

Optional env (`backend/.env`):

```bash
APP_NAME="HRMS Lite API"
DATABASE_URL="sqlite:///./hrms_lite.sqlite3"
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend: `http://127.0.0.1:5173`

To point the UI at a deployed backend, set:

```bash
VITE_API_BASE_URL="https://YOUR-BACKEND-URL"
```

## API endpoints (summary)

- `GET /health`
- `POST /employees`
- `GET /employees`
- `DELETE /employees/{employee_id}`
- `POST /attendance`
- `GET /employees/{employee_id}/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /employees/{employee_id}/attendance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`

## Deployment (mandatory for submission)

This repo is deployment-ready; you only need to publish the two apps and configure env vars.

For a step-by-step first-time push + deploy guide, see `DEPLOY_AND_GIT.md`.

### Backend deployment (Render example)

- **Build command**:

```bash
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org --trusted-host pypi.python.org -r backend/requirements.txt
```

- **Start command**:

```bash
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT
```

- **Environment variables**:
  - `CORS_ORIGINS`: your frontend URL (e.g. `https://your-frontend.vercel.app`)
  - `DATABASE_URL`: for SQLite on a persistent disk, e.g. `sqlite:////data/hrms_lite.sqlite3`

Notes:
- If you deploy on a platform with an **ephemeral filesystem**, SQLite may reset on redeploy. Prefer a platform that supports a **persistent disk** (or switch to Postgres for production persistence).

### Frontend deployment (Vercel example)

- Set env var `VITE_API_BASE_URL` to your backend public URL.
- Deploy the `frontend/` directory.

## Assumptions / limitations

- Single admin user; **no authentication** (as requested).
- Departments are free-text (can be switched to a fixed dropdown easily).
- Attendance is unique per employee per date (can be expanded to clock-in/out if needed).

