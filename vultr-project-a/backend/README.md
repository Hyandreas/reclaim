# Reclaim Backend

Stdlib Python backend for the complete Reclaim local app. No FastAPI or external
packages are required.

## Primary full-stack server

Use this path for the app you should demo:

```sh
cd vultr-project-a
python3 backend/server.py --host 127.0.0.1 --port 8765
```

Open `http://127.0.0.1:8765/`. This server hosts `app/`, persists runs and
approvals in `backend/var/reclaim.sqlite`, and supports the `/api/*` aliases
used by Docker/Vultr-style deployments.

## Package backend

```sh
cd vultr-project-a/backend
python3 -m reclaim_backend.server --host 127.0.0.1 --port 8000
```

This alternate server exposes the same frontend contract on port `8000` for
isolated API tests. It creates `reclaim.sqlite3` on first boot and seeds the
local corpus, six live cases, 37 preprocessed portfolio rows, audit tables, memo
storage, and approval storage.

## Endpoints

- `GET /health`
- `GET /cases`
- `GET /corpus`
- `POST /run-portfolio`
- `POST /cases/{case_id}/run`
- `GET /cases/{case_id}/events` as Server-Sent Events
- `GET /cases/{case_id}/memo`
- `POST /cases/{case_id}/approve`
- `GET /cases/{case_id}/approvals`
- `GET /approvals?caseId={case_id}`

Example:

```sh
curl -s http://127.0.0.1:8000/health
curl -s -X POST http://127.0.0.1:8000/cases/CKT-ATL-014/run
curl -N http://127.0.0.1:8000/cases/CKT-ATL-014/events
curl -s -X POST http://127.0.0.1:8000/cases/CKT-ATL-014/approve \
  -H 'Content-Type: application/json' \
  -d '{"action":"approve","reason":"Verified outage count and citations."}'
```

## Test

```sh
cd vultr-project-a/backend
python3 -m unittest discover -s tests
```
