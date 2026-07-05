# Improvement Roadmap - Reclaim (execute in order)

Judging is **today (July 5)**. This plan is ordered by judge-scoring leverage per
hour. Each item states the change, the file(s), the acceptance check, and what to
say on camera. Stop at any point and the demo is still coherent — never start an
item you cannot finish.

Ground rule (keep, from EXECUTION_PLAN): no LLM output may ever be the source of
a dollar amount, deadline, prior-credit determination, or precedence decision.
The LLM plans, classifies ambiguity, and explains; deterministic tools compute.

---

## P0 — Make the agent real (est. 3-5h total)

### P0.1 Real LLM planner (1.5-2h) — the single highest-leverage change

**Change:** Replace the if-statement planner with a model call that receives the
case bundle (circuit, intervals with raw NOC notes, invoice history, deadline —
but NOT the `route` field) and returns a JSON plan:
`{selected_stages, evidence_needed, rationale, stop_conditions}`.

- Add `backend/reclaim_backend/llm.py`: one `plan_case(bundle) -> dict` function.
  Use Vultr Serverless Inference if an API key is available (OpenAI-compatible
  endpoint, `https://api.vultrinference.com/v1/chat/completions`) — this also
  makes Vultr load-bearing. Any other available model API is acceptable for the
  demo; name it honestly.
- Validate the returned JSON against the stage whitelist; on parse failure or
  timeout (>8s), fall back to the current deterministic rules and emit
  `plan.completed` with `"source": "fallback-rules"` — honest and demo-safe.
- **Delete the `route` field from planner input.** The plan must be derivable
  from evidence (ambiguous tag, missing notice, prior credit line), or the
  agency is still fake. Keep `route` only as a UI hint for preprocessed rows.
- Persist the raw model request/response into `audit_events` so you can open it
  live when a judge asks.

**Accept:** Run CKT-SEA-009 and CKT-ATL-014; the model (not the seed) selects
skip vs deep; the rail card shows model-generated rationale; pulling the API key
makes the label change to fallback-rules.
**On camera:** "The planner is a live model call on Vultr Serverless Inference;
here's the raw trace. Every dollar still comes from deterministic tools."

### P0.2 Real retrieval over the clause corpus (1-1.5h)

**Change:** The corpus is small (~10 clauses/documents) — real retrieval is cheap.

- Chunk the MSA clauses (already in `DOCUMENTS` + seed corpus in
  `reclaim_backend/seed_data.py`) and embed them: Vultr Serverless Inference
  embeddings if available, else a local embedding, else TF-IDF cosine — all are
  *real* search, unlike a dict lookup.
- `retrieve(query, k)` returns scored chunks; rail retrieval events show the
  actual query and actual scores; `retrievalMatch` in the confidence formula
  becomes the real top-hit score instead of a hand-typed constant.
- Keep the pre-rendered highlight SVGs as the *display* layer (that fallback
  design is good — keep it).

**Accept:** `exclusion_review.retrieved` shows a live similarity score that
changes if you edit the query; confidence inputs trace to retrieval output.
**On camera:** "Second retrieval fires only because the plan called for it —
watch the score."

### P0.3 Deploy to Vultr and stop over-claiming (1h)

**Change:**
- `docker compose up` on a Vultr Cloud Compute instance; put the clause assets +
  golden trace in Vultr Object Storage (S3-compatible; boto3 or plain presigned
  URLs) and serve citation SVGs from it.
- Fix `src/App.tsx:116` and the health endpoint: report *actual* mode. Label
  reads `Vultr Compute <region> / Object Storage / SQLite audit DB` only when
  true; locally it must say `local mirror`. A truthful "local fallback" label
  costs nothing; a false "Vultr live" label can cost the track.
- `/health` should return real checks: object-store reachability, model
  endpoint reachability, corpus version.

**Accept:** Demo URL is a Vultr IP; health JSON shows real service statuses;
turning off the network flips labels honestly.

### P0.4 Compute the money, unfreeze time (0.5-1h)

**Change:**
- Counter = sum of `recoverableAmount` across processed cases. If you want the
  $182,400 headline, make the seed data produce it — never emit the constant.
  Generate `PORTFOLIO_ROWS` amounts by running each row through
  `credit_calculator` once at seed time ("preprocessed from the same pipeline"
  becomes true).
- Replace `RUN_START`-based fake timestamps with `datetime.now()` at emit time.
- `POST /cases/{id}/run` must run *that* case.

**Accept:** Two consecutive runs show different timestamps; deleting a case
changes the final counter; the sum on screen equals the sum of memo amounts.

### P0.5 Pick ONE frontend and ONE backend (0.5h decision + wiring)

**Change:** Choose the demo stack and park the other. Recommendation: keep
`backend/server.py` + the vanilla `app/` **if** time is short (it is the one
wired end-to-end with smoke mode); switch to the React/shadcn `src/` app only if
P0.1-P0.4 land early. Move the unused pair to `attic/` with a README line so the
repo tells one story. Do not demo a repo where the judge can open two different
apps.

---

## P1 — Sharpen the demo (est. 2-3h)

1. **First-30-seconds legibility** (from ui-critique-notes P0s not yet fully
   landed): compress top strip, make the three-route comparison band the first
   thing visible, ensure `Plan completed` + skip/retrieve cards visible without
   scrolling at 720p.
2. **Color semantics:** green = approved recovery only; blue = citations/current;
   amber = risk; gray = skipped/excluded (ui-critique-notes has the full map).
3. **Approval finality:** `Calculated exposure` (graphite/blue, counting) vs
   `Approved recovery` (green, locked) — this is your emotional ending; it must
   be triggered by the approval POST, not by run completion.
4. **Record the 60s video** against the live Vultr deployment, following the
   FINAL_PROPOSAL beat sheet (it is good). Rehearse the two judge questions:
   "where does the model run?" → show trace; "what's synthetic?" → "the data is
   synthetic; the planning, retrieval, math, and audit trail are real."
5. **Golden trace re-record** from a real run (now that timestamps are real) and
   keep Replay as the visible fallback.

## P2 — Only if everything above is done

- Derive `ambiguityResolution`/`billingCertainty` from pipeline signals instead
  of seeds.
- The amendment-precedence case (`clause_precedence_resolver`) — a strong
  creativity beat if live.
- Mobile task tabs (ui-critique-notes P2).
- Export memo as PDF ("carrier-ready packet" that literally downloads).

## Anti-goals (unchanged from FINAL_PROPOSAL — do not do these today)

Chat interface; arbitrary carrier onboarding; general PDF ingestion; auto-filing;
real billing integrations; multi-contract normalization.

## Pitch adjustments

- Lead with: "Reclaim decides how deeply to investigate each circuit — live model
  planning, live retrieval, deterministic dollars, human approval."
- Disclose synthetic data proactively (Risk 4 line is right — use it).
- Show, don't narrate: raw plan JSON, retrieval scores, the approval blocker
  rejecting an "Already credited" approval. Judges reward things they can poke.
