# Judge Verdict - Reclaim (Track 2: Vultr)

Written as a skeptical technical judge scoring against the published criteria:
Impact 25% / Demo 50% / Creativity 15% / Pitch 10%. Judging is July 5.

## TL;DR

Reclaim has a winning *story* and a losing *implementation gap*. The UI, narrative,
scope discipline, deterministic dollar math, human approval flow, and audit-trail
concept are genuinely strong — better than most hackathon entries. But the system
as built is a **simulation of an agent, not an agent**, and the track statement
says explicitly: *"The keyword is agent. A single retrieve-then-answer call is not
enough."* Reclaim currently has **zero** retrieve-then-answer calls — there is no
model and no retrieval at all. One probing question from a judge ("show me where
the model plans") collapses the demo's central claim.

The gap is closable in hours, not days, because the event architecture is already
excellent. See IMPROVEMENT_ROADMAP.md.

## What a probing judge finds in 10 minutes

### Finding 1 (fatal if unaddressed): There is no LLM anywhere

- `backend/reclaim_core.py` and `backend/reclaim_backend/orchestrator.py` contain
  no model call, no API client, no inference of any kind. A repo-wide grep for
  llm/openai/anthropic/inference/embedding returns nothing in runtime code.
- The "planner" (`plan_for_case`, `planner`) is a pair of if-statements over
  seeded fields — including a literal `route` field on each case
  (`"route": "deep review"`, `"route": "already credited"`) that **pre-labels the
  outcome in the seed data**. The plan does not decide the path; the data author did.
- `requirements.txt` says it plainly: stdlib only.

The team's own JUDGE_RISK_REGISTER Risk 1 ("this is just RAG with a nice sidebar")
is optimistic — it is not even RAG. The counterproof line "the plan changes the
backend path, not just the narration" is currently false in the strong sense:
both the plan and the path are authored constants.

### Finding 2 (fatal if unaddressed): There is no retrieval

- "Outage records retrieved", "SLA tier retrieved", "Exclusion clause retrieved"
  rail events are dict lookups into the hardcoded `DOCUMENTS` table
  (`reclaim_core.py:19-55`). No vector store, no Chroma, no embeddings, no search
  of any kind. `retrievalMatch` scores (0.93, 0.91, ...) are hand-typed constants.
- The health endpoint honestly reports `"retrievalMode": "local deterministic
  vector mirror"` — a phrase a judge will ask about.

### Finding 3 (credibility risk): Vultr is claimed but absent

- The proposal claims Cloud Compute + Object Storage + Managed PostgreSQL +
  Serverless Inference Vector Store as "load-bearing". The code has: one Docker
  container, SQLite, local SVG files, and no Vultr SDK or API usage at all.
- Worse, the React UI hardcodes the label **"Vultr Compute live / Object Storage
  receipts / audit DB"** after a successful health check against localhost
  (`src/App.tsx:116`). Displaying claims of cloud services that do not exist is
  the kind of thing that turns a skeptical judge hostile. Risk 3 in the team's
  own register ("Vultr is only a hosting label") is currently *worse* than
  described: it is a label without the hosting.

### Finding 4: The headline number is hardcoded

- `TARGET_RECOVERY = 182400` is a constant. The SSE stream ends with
  `{"type": "counter.update", "amount": TARGET_RECOVERY}` — the counter does not
  sum anything. The 37 portfolio rows and their dollar amounts are a hardcoded
  array (`PORTFOLIO_ROWS`), not output of the pipeline ("preprocessed from the
  same pipeline" is claimed but not true).
- Event timestamps are frozen at `RUN_START = 2026-07-04 16:00 UTC`
  (`reclaim_core.py:16`) — every "live" run emits identical timestamps, which
  contradicts the golden-trace rule in the risk register ("keep golden trace
  timestamps from real successful runs") and is easy for a judge to notice by
  running the audit twice.
- `POST /cases/{id}/run` ignores the case id and replays the same scripted
  portfolio run (`server.py:101-104`). `stream_messages_for_run` is a fully
  pre-authored narrative, always starring CKT-ATL-014.

### Finding 5: Split builds dilute the demo

There are two frontends (vanilla `app/` served by `backend/server.py`; a newer
React/shadcn app in `src/` with a committed `dist/`) and two backends
(`backend/server.py` + `reclaim_core.py`; `backend/reclaim_backend/` package).
They implement the same contract with subtle drift (different memo shapes,
different event timestamps). Judges see one app for one minute — every hour spent
maintaining the second copy is an hour not spent making the first one real.

## What is genuinely strong (keep and showcase)

- **Glass-Box Reasoning Rail with visible skips.** "The agent decided not to do
  this" as a first-class dimmed card is a creative, differentiating idea.
- **Deterministic tools for every dollar.** The acceptance rule "no LLM output may
  be the source of a dollar amount" is exactly the right enterprise instinct and
  survives scrutiny — once there is an LLM for it to constrain.
- **Human approval with typed reason + approval blockers** (`approval_blocker`)
  — real safety logic, correctly enforced server-side, with tests.
- **SSE architecture.** Real server-sent events driving every rail card; the
  contract (event names, skips, citations) is well-designed and already tested
  (13/13 tests pass).
- **Scope discipline and docs.** FINAL_PROPOSAL / EXECUTION_PLAN /
  JUDGE_RISK_REGISTER are better planning artifacts than most teams produce.
- **Design iteration.** The three-designer critique loop shows; typography and
  tabular-nums fixes landed in both frontends.

## Scores as it stands today

| Criterion | Weight | Score | Notes |
|---|---|---|---|
| Impact | 25% | 6.5/10 | Telecom SLA credit recovery is a real, monetizable enterprise pain; but single hardcoded carrier/contract limits the growth story |
| Demo | 50% | 4/10 | Polished and reliable, but the core claim (agentic planning + grounded retrieval) is simulated; Vultr claims unsubstantiated; judges explicitly probe demos |
| Creativity | 15% | 7.5/10 | Glass-box rail + visible skips + approval blockers are distinctive |
| Pitch | 10% | 8/10 | Narrative, worked example, and risk framing are excellent |
| **Weighted** | | **~5.5/10** | Mid-pack. Not winning the Vultr track as-is |

## The verdict

A winning Vultr-track entry must survive: *"show me the plan being generated,
show me a retrieval happening, show me Vultr doing something."* Today Reclaim
fails all three. The good news: the scripted skeleton is exactly the right shape
to make real — the planner interface, event stream, tools, and UI are done. Swap
the if-statement planner for a real model call, the dict lookup for a real vector
search, deploy the container to a real Vultr instance, and compute the counter
from the pipeline — and this jumps from ~5.5 to a genuine contender (~8+),
because everything *around* the agent is already stronger than the field.

Priority-ordered fixes with time estimates: see IMPROVEMENT_ROADMAP.md.
