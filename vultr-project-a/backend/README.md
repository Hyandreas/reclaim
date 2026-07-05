# Reclaim Backend

Stdlib Python backend for the complete Reclaim local app. No FastAPI or external
packages are required.

## API server

Use this path for the backend API:

```sh
cd vultr-project-a
python3 backend/server.py --host 127.0.0.1 --port 8765
```

Open the frontend separately at `http://127.0.0.1:5173/`.

The `8765` server is API-only. It persists runs and approvals in
`backend/var/reclaim.sqlite`, and supports the `/api/*` aliases used by
Docker/Vultr-style deployments. It has no static frontend fallback.

## Credentials

The backend can load optional provider keys from `../.env`; copy
`../.env.example` to `../.env` and fill the values when credentials are ready.
Secrets remain server-side. The frontend only receives configured/missing
metadata from `GET /api/integrations`.

`POST /cases/{case_id}/run` uses Vultr Serverless Inference when
`VULTR_SERVERLESS_INFERENCE_API_KEY` is configured. The model receives
server-side audit tool definitions, calls those tools, then writes a bounded
planner-note trace event from the tool results. Deterministic tools still own
uptime, credit math, classification, citations, and approval rules.

Expected future live variables:

- `VULTR_API_KEY`
- `VULTR_SERVERLESS_INFERENCE_API_KEY`
- `VULTR_SERVERLESS_INFERENCE_BASE_URL`
- `VULTR_SERVERLESS_INFERENCE_MODEL`
- `VULTR_OBJECT_STORAGE_ACCESS_KEY`
- `VULTR_OBJECT_STORAGE_SECRET_KEY`
- `VULTR_OBJECT_STORAGE_ENDPOINT`
- `VULTR_OBJECT_STORAGE_BUCKET`
- `DATABASE_URL`

Keep `VULTR_SERVERLESS_INFERENCE_MODEL=kimi-k2-instruct` for this tool-calling
path; other Vultr inference models may not return tool calls.

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
- `GET /integrations`
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
