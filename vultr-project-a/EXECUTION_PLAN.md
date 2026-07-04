# Execution Plan

## Architecture

Use a small, bounded system.

- `web`: Next.js mission-control UI.
- `api`: FastAPI service.
- `orchestrator`: Python module inside FastAPI.
- `retrieval`: Vultr Serverless Inference Vector Store preferred; local Chroma mirror for fallback.
- `object_store`: Vultr Object Storage for source docs, logs, invoices, highlight images, and golden traces.
- `database`: Vultr Managed PostgreSQL for cases, audit events, citations, and approvals. SQLite is allowed only for local dev fallback.
- `llm`: model adapter for planning, structured judgment, and cited grounding. Do not make unverified model/API claims in the final demo.
- `deploy`: Docker Compose on Vultr Cloud Compute.

## API Shape

- `GET /health` returns API, DB, retrieval index, object store, corpus version, and deployment mode.
- `POST /run-portfolio` starts the demo run.
- `POST /cases/{id}/run` runs one circuit.
- `GET /cases/{id}/events` streams SSE rail events.
- `GET /cases/{id}/memo` returns memo JSON.
- `POST /cases/{id}/approve` records approval or override with typed reason.

## Data Model

Seed synthetic but telecom-realistic data.

- `documents`: base MSA, SLA tier table, exclusion clauses, claim-deadline clause, invoice samples, optional amendment.
- `chunks`: `chunk_id`, `doc_id`, `section`, `page`, `clause_key`, `text`, `embedding_ref`, `highlight_asset_path`.
- `circuits`: `circuit_id`, `ban`, `store_name`, `region`, `timezone`, `monthly_recurring_charge`, `sla_period`.
- `outage_intervals`: `ticket_id`, `circuit_id`, `start`, `end`, `tag`, `raw_noc_notes`, `maintenance_notice_ref`.
- `invoice_history`: `ban`, `circuit_id`, `period`, `line_item`, `mrc`, `credit_amount`, `credit_reason`.
- `cases`: `case_id`, `plan_json`, `branch_decisions`, `classification`, `confidence_terms`, `memo_amount`.
- `audit_events`: `event_id`, `case_id`, `timestamp`, `stage`, `inputs_summary`, `output_summary`, `citation_ids`, `skipped_reason`.
- `approvals`: `case_id`, `action`, `reason`, `approver`, `timestamp`.

## Seed Cases

Must seed at least:

- Clean credit owed, no exclusion review.
- Ambiguous maintenance that counts because notice was missing.
- Scheduled maintenance excluded because customer approval exists.
- Already credited.
- Deadline expiring.
- Low-confidence needs review.
- 30-40 preprocessed portfolio rows for the counter effect.

Optional:

- Amendment conflict where a signed amendment supersedes the base SLA tier.

## Agent Loop

For each circuit:

1. Build `case_bundle` from circuit, BAN, invoice month, MRC, outage tickets, raw NOC notes, and deadline.
2. Call `planner(case_bundle)`.
3. Planner returns `selected_stages`, `evidence_needed`, `rationale`, and `stop_conditions`.
4. Emit `plan.completed`.
5. Retrieve outage intervals.
6. Run `uptime_calculator`.
7. Retrieve SLA tier and cap clauses.
8. Run cited grounding for clause chips.
9. If needed, retrieve exclusion clause and classify ambiguous intervals.
10. If skipped, emit explicit `exclusion_review.skipped` with reason.
11. Recompute credit.
12. If needed, run billing cross-check.
13. If skipped, emit explicit `billing_crosscheck.skipped` with reason.
14. Run deadline check.
15. Classify the case.
16. Run confidence calculator.
17. Assemble memo.
18. Persist the full audit trace.

## Deterministic Tools

All tools return fixed JSON outputs.

- `uptime_calculator(intervals, period)` returns downtime minutes and uptime percent.
- `credit_calculator(uptime, tier, mrc, exclusions, cap)` returns credit percent and dollars.
- `billing_crosscheck(circuit_id, ban, period)` returns prior-credit status.
- `deadline_check(period_end, claim_window_days, today)` returns days left and status.
- `clause_precedence_resolver(base_clause, amendment_clause)` returns controlling clause.
- `confidence_calculator(terms)` returns score and threshold reason.
- `memo_assembler(case_trace)` returns the human-reviewable claim packet.

Acceptance rule: no LLM output may be the source of a dollar amount, deadline calculation, prior-credit determination, or contract precedence decision.

## Live Demo And Fallback

Live:

- 2-3 circuits run on Vultr with real planner, retrieval, calculators, SSE events, memo assembly, and persisted audit traces.
- One branch fires exclusion retrieval.
- One branch explicitly skips exclusion retrieval.
- One approval requires a typed reason.

Fallback:

- Pre-render highlight images for all on-camera citation chips.
- Preprocess the broader portfolio from the same pipeline.
- Save a golden-run trace in Object Storage.
- Use trace replay only if live API or network conditions fail.

## Milestones

### Day 1 AM

- Synthetic corpus complete.
- Vultr project resources created.
- FastAPI scaffold and health endpoint live.
- Database schema created.
- Deterministic tools implemented and unit checked.
- Next.js shell renders sample rail events.
- Object Storage bucket contains corpus and highlight assets.

### Day 1 PM

- SSE works end to end.
- One clean breach circuit runs live.
- Planner controls at least one skipped stage.
- Memo shows amount, citations, and confidence terms.
- First Vultr Cloud Compute deployment is reachable.

### Day 2 AM

- Core branch cases implemented.
- Approval and override require typed reason.
- Pre-rendered citation highlights wired.
- Confidence threshold routes `< 0.80` to `Needs review`.
- Ten repeated demo runs complete without manual DB surgery.

### Day 2 PM

- Optional amendment case only if core is stable.
- Corpus and `$182,400` total locked.
- Golden trace recorded.
- 60-second video rehearsed and recorded.

## Engineering Acceptance Criteria

- `docker compose up` starts web and API.
- `/health` reports DB, object store, retrieval index, corpus version, and deploy mode.
- Demo portfolio emits real SSE events for every rail card, including skipped cards.
- At least six seeded cases classify correctly.
- At least one case triggers second retrieval.
- At least one case visibly skips second retrieval.
- Every memo dollar comes from `credit_calculator`.
- Every memo line has a citation id and live span metadata or a pre-rendered highlight asset.
- Confidence matches the published formula.
- Approval cannot complete without typed reason.
- Audit trace stores planner decision, retrievals, tool calls, skipped stages, citations, confidence terms, and approval.
- 2-3 live deep circuits complete within 15 seconds, or trace replay is available.
