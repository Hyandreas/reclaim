# Vultr Project A - Reclaim

Root-level workspace for Track 2 Vultr Project A.

Reclaim is a web-based enterprise agent for telecom SLA credit recovery. It reads contract terms, NOC outage logs, invoice history, and claim windows, then produces a carrier-ready credit memo with deterministic math, citations, confidence terms, and human approval.

## Team

- Product Lead: Aquinas - final proposal, scope, demo narrative, judging strategy.
- Engineering Lead: Anscombe - architecture, agent loop, tools, data model, acceptance criteria.
- Design Lead: James - mission-control UI, reasoning rail, memo/citation experience, 60-second video beats.
- Critiquing Judge and Telecom Domain Specialist: Arendt - scoring risks, domain credibility, Vultr fit, hard corrections.

## Files

- [FINAL_PROPOSAL.md](FINAL_PROPOSAL.md) - the team proposal to execute.
- [EXECUTION_PLAN.md](EXECUTION_PLAN.md) - build architecture, milestones, acceptance criteria.
- [DESIGN_BRIEF.md](DESIGN_BRIEF.md) - UI states, interaction beats, demo-screen requirements.
- [JUDGE_RISK_REGISTER.md](JUDGE_RISK_REGISTER.md) - skeptical judge objections and required counterproof.
- [SOURCES.md](SOURCES.md) - local source files and current Vultr documentation checked for stack claims.
- [app/](app/) - the operational web console.
- [backend/](backend/) - stdlib Python API, SQLite persistence, deterministic tools, SSE streams, memos, and approval storage.

## Run The Full App

```sh
cd vultr-project-a
python3 backend/server.py --host 127.0.0.1 --port 8765
```

Open `http://127.0.0.1:8765/`.

Smoke-test URL:

```text
http://127.0.0.1:8765/?smoke
```

Docker/Vultr-shaped local run:

```sh
docker compose up --build
```

This repo does not provision live Vultr resources without credentials. The local
stack mirrors the intended Vultr shape: Cloud Compute container, SQLite in a
persistent volume for the demo database, object-storage-style citation assets,
and a deterministic retrieval/citation corpus.

## Non-Negotiable Demo Proof

The judged demo must show that the agent changes the backend path it executes:

- One circuit plans a shallow path and explicitly skips exclusion retrieval.
- One circuit plans a deep path, retrieves the exclusion clause, and counts a maintenance outage because required notice is missing.
- One circuit proves operational safety through an already-credited, excluded, deadline-expiring, or low-confidence case.

Every dollar in the memo must come from deterministic tools, not model text.
