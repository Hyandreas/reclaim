# Reclaim - Hackathon Project (Track 2: Vultr)

Reclaim is a web-based enterprise agent that audits telecom SLA credits and
produces human-approvable credit memos with citations. Built for a hackathon
judged July 5, 2026 (criteria: Impact 25%, Demo 50%, Creativity 15%, Pitch 10%).
Track statement and all four tracks: `INSTRUCTIONS.md`.

## Repo map

- `vultr-project-a/` — the actual project.
  - `backend/server.py` + `backend/reclaim_core.py` — **canonical demo stack**:
    stdlib-only HTTP server (port 8765) serving `app/` and the `/api/*` + SSE
    endpoints, SQLite persistence in `backend/var/`.
  - `backend/reclaim_backend/` — alternate package backend (port 8000), same
    frontend contract; used for isolated API tests.
  - `app/` — vanilla JS frontend served by the canonical server (three-pane:
    circuit queue / Glass-Box Reasoning Rail / credit memo).
  - `src/` — newer React + shadcn/Tailwind frontend (Vite, `npm run dev`);
    talks to the same backend contract. Only one frontend should be demoed.
  - `FINAL_PROPOSAL.md`, `EXECUTION_PLAN.md`, `DESIGN_BRIEF.md`,
    `JUDGE_RISK_REGISTER.md` — the plan of record.
  - `JUDGE_VERDICT.md`, `IMPROVEMENT_ROADMAP.md` — current judge critique and
    the prioritized fix list. **Read these before changing anything.**
- `projects/` — earlier per-track proposals and judge notes (context only).

## Run and test

```sh
cd vultr-project-a
python backend/server.py --host 127.0.0.1 --port 8765   # full app on :8765
# smoke test: open http://127.0.0.1:8765/?smoke
cd backend && python -m unittest discover -s tests       # package backend tests
cd backend && python -m unittest test_reclaim_core       # core tests
cd vultr-project-a && npm run dev                        # React frontend (Vite)
docker compose up --build                                # container run
```

## Non-negotiable invariants

- **No LLM output may be the source of a dollar amount, deadline calculation,
  prior-credit determination, or precedence decision.** Deterministic tools
  (`uptime_calculator`, `credit_calculator`, `billing_crosscheck`,
  `deadline_check`, `confidence_calculator`, `memo_assembler`) own all math.
- Confidence formula is published and fixed:
  `0.4*retrieval_match + 0.4*ambiguity_resolution + 0.2*billing_certainty`;
  score < 0.80 routes to `Needs review`.
- Approval/override requires a typed reason; blockers are enforced server-side.
- Every rail card maps to a real SSE backend event, including skipped stages.
- Never display claims the code can't back (e.g. "Vultr live" labels when
  running locally). Truthful fallback labels are always acceptable; false
  capability labels are never acceptable.

## Working rules (Karpathy guidelines)

- **Think before coding.** State assumptions; if a case/branch is ambiguous,
  ask — don't silently pick. If a simpler approach exists, say so.
- **Simplicity first.** This is a demo judged in one minute. No speculative
  abstractions, no config surface nobody asked for, no error handling for
  impossible inputs. If 200 lines could be 50, rewrite.
- **Surgical changes.** Two frontends and two backends exist; touch only the
  stack you're asked to change, and don't drift the shared API contract
  (`/health`, `/run-portfolio`, `/cases/{id}/run|events|memo|approve`).
- **Goal-driven.** Every change gets a verifiable check: run the unittest
  suites, then hit `?smoke` and confirm the rail, memo, approval, and counter
  behave. A change without a demo-visible or test-visible effect is suspect.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community
structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when
  graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for focused concepts. These
  return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw
  grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of
  raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when
  query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current
  (AST-only, no API cost).
