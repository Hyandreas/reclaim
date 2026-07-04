# Reclaim App

Run the root backend to use the complete Reclaim app:

```sh
cd vultr-project-a
python3 backend/server.py --host 127.0.0.1 --port 8765
```

Then open `http://127.0.0.1:8765/`. The backend serves the static app, persists audit runs in SQLite, streams Server-Sent Events, returns memos, and records human approvals. The self-contained deterministic trace is only used when the API is unreachable, when `?fallback` is present, or when the user clicks `Replay`.

The app includes:

- Portfolio queue with live and preprocessed circuits.
- Glass-Box Reasoning Rail with planner, retrieval, deterministic tool, skip, decision, and memo events.
- Deterministic credit, uptime, deadline, billing, and confidence calculations in `app.js`.
- Citation drawer using pre-rendered source-highlight assets in `assets/`.
- Human approval and override flow with required typed reason.
- Live backend mode labels plus local fallback/golden-trace replay labels.
- Backend run, SSE audit events, memo fetch, and approval POST when the API is available.

No dependency install is required for the local full-stack app.

## Backend contract

The frontend supports both the root server on port `8765` and the package backend on port `8000`. It expects:

- `GET /health`
- `POST /run-portfolio` or `POST /cases/{id}/run`
- `GET /cases/{id}/events` as SSE
- `GET /cases/{id}/memo`
- `POST /cases/{id}/approve`

By default, the app tries same-origin first when served over HTTP, then `http://127.0.0.1:8765`, then `http://127.0.0.1:8000` for alternate local backend development. When opened from `file://`, it tries `8765` first.

Use `?api=https://your-api.example.com` to pin a backend:

```text
http://127.0.0.1:8765/?api=http://127.0.0.1:8765
```

Use `?fallback` to force local fallback, or click `Replay` to run the saved golden trace.

## Smoke mode

Open:

```text
http://127.0.0.1:8765/?smoke
```

Smoke mode runs the audit through the live backend if `/health` is reachable; otherwise it runs the local fallback. It verifies the visible mode label, case selection, memo readiness, approval recording, citation drawer, retrieval/skip branches, and counter behavior. Results are written to `window.RECLAIM_SMOKE_RESULT` and shown in the smoke banner.
