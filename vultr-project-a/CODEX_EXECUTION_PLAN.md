# Codex Execution Plan - Reclaim (finish + verify + deploy)

Self-contained handoff for an execution agent (Codex). No conversation context is
assumed. Work through phases IN ORDER; each task has an acceptance check. Run
checks yourself locally (unit tests + curl) — that is the cheapest verification.

> Invocation (from Claude Code): `/codex:rescue --model gpt-5.5 --effort xhigh
> execute vultr-project-a/CODEX_EXECUTION_PLAN.md phase by phase` — the local
> Codex config also defaults to gpt-5.5 / xhigh / fast service tier.

## Deadline context

Hackathon judging is TODAY (July 5). Demo weight is 50% of score. Time budget
~2 hours. If time runs out, phases are ordered so you can stop after any phase
and the demo still works.

## Current state (verified as of handoff)

- Project root: `F:\csProj\reclaim\reclaim\vultr-project-a\`
- **Canonical stack** (the ONLY one to work on): `backend/server.py` +
  `backend/reclaim_core.py` (stdlib Python, port 8765) serving the vanilla
  frontend in `app/`. IGNORE `backend/reclaim_backend/` (alternate package
  backend) and treat the React app in `src/` as secondary (already updated,
  tsc-clean; do not invest further unless Phase 4).
- **Secrets** in `vultr-project-a/.env` (gitignored — NEVER commit, NEVER print
  values, NEVER copy into any other file):
  - `VULTR_INFERENCE_API_KEY` / `VULTR_INFERENCE_BASE_URL=https://api.vultrinference.com/v1`
    / `VULTR_INFERENCE_MODEL=nvidia/Nemotron-Cascade-2-30B-A3B` — VERIFIED WORKING.
    Note: this is a reasoning model; with small max_tokens the `content` field
    comes back empty. Use max_tokens>=1500 and fall back to
    `message.reasoning_content` when `content` is empty.
  - `NVIDIA_API_KEY` / `NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1`
    / `NVIDIA_MODEL=nvidia/llama-3.1-nemotron-70b-instruct` — VERIFIED WORKING
    (~40 req/min limit).
  - Both endpoints are OpenAI-compatible (`POST {base}/chat/completions`).
- **Vultr Cloud Compute instance** (already provisioned, Running):
  - IP `139.180.201.74` (Tokyo), Ubuntu 26.04, Python 3.14.4 preinstalled.
  - SSH: `ssh -i %USERPROFILE%\.ssh\reclaim_vultr root@139.180.201.74` — verified.
  - Deploy script: `deploy/deploy_vultr.ps1` (packs backend+app+.env, scp,
    installs a systemd unit `reclaim.service` with `DEPLOYMENT_MODE=vultr`,
    opens port 8765). Usage:
    `powershell -File deploy\deploy_vultr.ps1 -Ip 139.180.201.74`
- **Frontend work DONE** (by a prior agent; tsc passes, node --check passes):
  both `app/app.js` and `src/` now (a) derive top-strip labels truthfully from
  /health, (b) compute the recovery counter instead of using a constant,
  (c) render planner/retrieval provenance badges on rail cards. They expect the
  /health and event-payload contract in the next section.
- **Backend work IN FLIGHT** (a prior agent was implementing it and may or may
  not have finished — VERIFY FIRST, Phase 0): new modules `backend/env_config.py`,
  `backend/llm_planner.py`, `backend/retrieval.py` + integration into
  `reclaim_core.py`/`server.py`.

## Contract (both frontends already depend on this — do not change shapes)

`GET /health` returns:
```json
{
  "ok": true, "service": "reclaim", "database": "sqlite",
  "corpusVersion": "corpus-v7",
  "planner":   {"mode": "vultr|nvidia|rules", "model": "<id or null>", "live": true},
  "retrieval": {"mode": "vultr-embeddings|local-tfidf", "live": true},
  "deployment": "local|vultr",
  "targetRecovery": 182400
}
```
- `deployment` comes from env var `DEPLOYMENT_MODE` (default "local").
- `targetRecovery` is the COMPUTED sum (live recoverable + preprocessed rows),
  never a constant emitted directly.
- Plan rail events carry `payload.plan.plannerSource` ("vultr"|"nvidia"|"rules")
  and `plannerModel`; retrieval rail events carry
  `payload.retrieval = {query, topScore, mode, chunkId}`.

## Non-negotiable invariants (from the team's proposal; judges check these)

1. No LLM output is ever the source of a dollar amount, deadline, prior-credit
   determination, or precedence decision. LLM plans; deterministic tools compute.
2. Planner may only ADD stages beyond what deterministic rules require, never
   remove (guard-correct if the model under-plans; append "+guard" to source).
3. Confidence formula fixed: `0.4*retrieval_match + 0.4*ambiguity_resolution +
   0.2*billing_certainty`; < 0.80 routes to "Needs review".
4. Approval/override requires a typed reason; blockers enforced server-side.
5. Every rail card maps to a real SSE event, including explicit skip events.
6. UI must never claim services that aren't running (labels derive from /health).

---

## Phase 0 - Verify/complete the backend upgrade (highest priority)

STATUS AT HANDOFF: **implemented and unit-tested** by a prior agent. All modules
below exist; `python -m unittest test_reclaim_core` = 9 tests OK,
`python -m unittest discover -s tests` = 5 OK, `python test_live_llm.py` = OK,
and the full suite passes with keys unset (rules/tfidf fallback paths).
Live-verified: plannerSource "vultr" via `nvidia/Nemotron-Cascade-2-30B-A3B`
(~8s latency). So Phase 0 for you is a QUICK RE-VERIFY (run the three test
commands once), then move on. Implementation notes that differ from the
original spec (keep these):
- `max_tokens=3000` (at 1600 the Nemotron reasoning trace exhausts the budget
  and content is empty). Vultr returns chain-of-thought in a field named
  `reasoning` (not `reasoning_content`); the empty-content fallback checks it.
- Vultr `/embeddings` returns 404 on this subscription → retrieval runs the
  deterministic TF-IDF fallback (mode "local-tfidf", /health retrieval.live
  false). This is the documented fallback, not a bug. OPTIONAL improvement:
  probe other embedding routes (e.g. model `vultr/VultronRetrieverCore-...` or
  the Vector Store API documented at https://api.vultrinference.com) and if one
  works, switch mode to "vultr-embeddings"; do not spend >20 min.
- Unit tests force the rules planner (empty provider chain in setUp) so the
  suite is deterministic with or without keys; the live path is covered by
  `test_live_llm.py` only. Preprocessed rows never call the LLM.
- **KNOWN DISCREPANCY TO RESOLVE (Phase 3.0):** computed `targetRecovery` is
  now **$231,934**, but FINAL_PROPOSAL.md / demo narrative say **$182,400**.
  Pick ONE: (a) retune seed data (PORTFOLIO_ROWS amounts / live-case MRCs) so
  the computed sum lands at exactly 182400 — preferred, keeps the rehearsed
  pitch line true; or (b) update every doc/narrative mention to the computed
  figure. Never reintroduce a hardcoded counter.

Reference spec for the modules (only needed if a re-verify fails):

### 0.1 `env_config.py`
Parse `KEY=VALUE` lines from `vultr-project-a/.env`; `get(name, default)`;
`os.environ` wins over file. Stdlib only.

### 0.2 `llm_planner.py`
- `plan_case(bundle) -> dict`. Bundle EXCLUDES the seed `route`/`plannerHint`
  fields (plan must derive from evidence: interval tags, notice status,
  invoiceHistory, claimDaysLeft).
- Prompt: telecom SLA audit planner; must return ONLY JSON
  `{"needs_exclusion_review": bool, "needs_billing_crosscheck": bool,
    "rationale": "<=280 chars", "evidence_needed": [..], "stop_condition": ".."}`.
- Chain: Vultr -> NVIDIA -> deterministic rules. urllib.request, 12s timeout,
  strict JSON validation (brace-matching extraction, not regex), per-case
  in-memory cache (repeated SSE replays must not re-bill).
- Output keys: `needsExclusion, needsBilling, rationale, evidence,
  stopCondition, plannerSource, plannerModel, latencyMs, rawResponse`
  (rawResponse truncated to 2000 chars, stored for the audit trail).
- Apply invariant #2 guard.

### 0.3 `retrieval.py`
- Corpus: the 4 `DOCUMENTS` entries in `reclaim_core.py`, split to sentence
  chunks (`"sla-tier#0"` style ids).
- Primary: `POST {VULTR_INFERENCE_BASE_URL}/embeddings` with model
  `vultr/VultronRetrieverFlash-Qwen3.5-0.8B`, input=[texts]. On any error fall
  back to pure-python TF-IDF cosine. `retrieve(query, k=3)` ->
  `[{chunkId, docId, score, text, mode}]`, scores rounded to 3dp, never raises.
- Corpus embedded once and cached in module state; only the query embeds per call.

### 0.4 Integration (`reclaim_core.py` + `server.py`)
- `plan_for_case` calls `llm_planner.plan_case`; plan payload includes
  provenance fields.
- Retrieval events call `retrieve()` with case-derived queries; payloads per
  contract; `retrievalMatch` confidence term = real top score for the tier
  query (clamp 0..1, round 2).
- Timestamps: `datetime.now(timezone.utc)` at event generation (delete the
  frozen `RUN_START` stamping).
- Money: `portfolio()["targetRecovery"]` = computed sum; SSE `counter.update`
  and `run.completed` amounts = computed sum. `TARGET_RECOVERY` constant may
  remain as a seed-design reference but must not be emitted.
- `POST /cases/{id}/run` runs/persists that case only.
- `/health` per contract, with a cheap cached (5-min) reachability probe for
  planner/retrieval `live` flags.

### 0.5 Acceptance (run all)
```sh
cd vultr-project-a/backend
python -m unittest test_reclaim_core          # must pass (update stale asserts:
python -m unittest discover -s tests          #  frozen-timestamp + locked-target
python test_live_llm.py                       #  tests may legitimately change)
```
`test_live_llm.py` (create if missing): plan CKT-ATL-014's bundle, print
plannerSource + rationale + latencyMs, and `retrieve("maintenance notice
exclusion")` top hit. Expect plannerSource "vultr" with keys present; unset the
env keys and re-run to confirm "rules" fallback. ALSO: run the server and curl
`/health`, `POST /cases/CKT-ATL-014/run`, `GET /cases/CKT-ATL-014/events`
(SSE shows plan card with provenance, exclusion retrieval with a real score),
`POST .../approve` without reason (must 400).

## Phase 1 - Local smoke of the full app

```sh
cd vultr-project-a
python backend/server.py --host 127.0.0.1 --port 8765
# browser: http://127.0.0.1:8765/?smoke   -> smoke banner must pass
```
Verify visually (one pass, don't over-test): top strip shows truthful labels
("Local server / Planner: Nemotron on Vultr Inference / Retrieval: ..."),
counter equals the sum of queue rows, Plan card shows "via Vultr Nemotron"
badge, CKT-SEA-009 shows the SKIP card, CKT-ATL-014 shows exclusion retrieval
with a live score, approval requires typed reason.

## Phase 2 - Deploy to Vultr

```powershell
cd F:\csProj\reclaim\reclaim\vultr-project-a
powershell -File deploy\deploy_vultr.ps1 -Ip 139.180.201.74
```
Acceptance: `curl http://139.180.201.74:8765/health` shows
`"deployment": "vultr"` and planner mode "vultr"; open the app in a browser —
top strip must now read "Vultr Compute live". Run one audit end-to-end there.
If scp/ssh fails: key is `%USERPROFILE%\.ssh\reclaim_vultr`, user root.

## Phase 3 - Demo readiness (do these, they're cheap)

1. Golden trace: run the full portfolio once against the Vultr deployment,
   save the SSE stream to `app/golden-trace.json` (there is an existing replay
   mechanism in app.js — keep its format; check `runLocalAudit`/replay code).
2. Re-verify the three on-camera beats still fire: skip branch (SEA), deep
   branch with exclusion counting due to missing notice (ATL), blocked approval
   on already-credited (DEN).
3. Update `backend/README.md` run instructions if endpoints changed.
4. `git add -A` the source changes (NOT .env — verify `git status` shows no
   .env) and commit: `feat: live LLM planner (Vultr/Nemotron), real retrieval,
   truthful labels, computed counter, Vultr deploy`.

## Phase 4 - Only if time remains (strict order)

1. UI first-30-seconds legibility (see `app/ui-critique-notes.md` P0 items 1-2:
   compress top strip, route-comparison band, color semantics).
2. Vultr Object Storage for citation assets + golden trace (S3-compatible);
   update /health objectStore field truthfully.
3. React frontend (`npm run dev`) parity check. Known pre-existing issue:
   `vite build` fails on `@rollup/rollup-win32-x64-msvc` (npm optional-dep bug;
   `npm i` again or ignore — tsc already validates types).
4. Memo export as printable/PDF view.

## Anti-goals (do NOT build)

Chat interface, carrier onboarding, general PDF ingestion, auto-filing,
real billing integrations, multi-contract normalization, FastAPI migration,
touching `backend/reclaim_backend/`.

## Token/cost discipline

- Verify with unit tests + curl, not long interactive sessions.
- The Vultr/NVIDIA calls bill per token: planner cache exists for a reason;
  don't loop live plans in tests (one live call per provider is enough proof).
- Preprocessed portfolio rows must NOT trigger live LLM calls — only the 6
  live cases plan via the model.
