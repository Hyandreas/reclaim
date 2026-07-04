# Judge Risk Register

## Risk 1 - "This is just RAG with a nice sidebar."

Counterproof:

- The planner emits selected stages, evidence needed, reasons, and stop conditions.
- The executed path changes based on that plan.
- The demo shows one skipped retrieval and one triggered retrieval.
- SSE trace proves every rail card maps to a backend event.

Required line:

> The plan changes the backend path, not just the narration.

## Risk 2 - "The telecom claims are too broad."

Counterproof:

- Say "many enterprise telecom SLAs create service-credit rights" instead of "every contract carries automatic credits."
- Show claim windows, caps, exclusions, MRC limits, and filing urgency.
- Use realistic identifiers: circuit id, BAN, MRC, outage ticket, invoice month, time zone, notice evidence.

Required line:

> Reclaim calculates credits from MRC, SLA tier, counted downtime, caps, exclusions, and claim deadlines.

## Risk 3 - "Vultr is only a hosting label."

Counterproof:

- Cloud Compute hosts the app and orchestrator.
- Object Storage holds documents, logs, invoices, highlight assets, and golden traces.
- Managed PostgreSQL holds audit state and approvals.
- Serverless Inference Vector Store is the preferred semantic retrieval layer.

Required line:

> Vultr stores, serves, searches, and audits the corpus; it is not just where the Docker container happens to run.

## Risk 4 - "Synthetic data makes the agency staged."

Counterproof:

- Synthetic corpus is disclosed as necessary because real telecom contracts and invoices are confidential.
- The branch cases are realistic and rerunnable.
- Include a case where the agent declines a second retrieval.
- Keep golden trace timestamps from real successful runs.

Required line:

> The data is synthetic; the control flow, retrieval, calculations, citations, and audit trace are real.

## Risk 5 - "The citation chip fails and the demo peak collapses."

Counterproof:

- Pre-render highlighted clause images for every on-camera circuit.
- Keep live citation metadata when available.
- Treat live PDF span mapping as a stretch.

Required line:

> Demo citation highlights are pre-rendered from the same cited clauses so the receipt moment is bulletproof.

## Risk 6 - "Confidence looks arbitrary."

Counterproof:

- Publish the formula.
- Show inputs next to the memo.
- Route low confidence to `Needs review`.

Formula:

```text
confidence = 0.4 * retrieval_match + 0.4 * ambiguity_resolution + 0.2 * billing_certainty
```

Required line:

> Confidence is a thresholded routing rule, not an LLM vibe.

## Risk 7 - "The live run is too ambitious."

Counterproof:

- Run only 2-3 circuits live.
- Show the broader portfolio as preprocessed from the same pipeline.
- Keep a golden trace in Object Storage.

Required line:

> The demo proves the workflow with 2-3 live deep cases; the portfolio scale is shown through preprocessed rows.

## Risk 8 - "The output is just a dashboard card."

Counterproof:

- The memo includes account, circuit, invoice month, ticket IDs, clauses, credit amount, confidence terms, filing deadline, and approval history.
- Approval/override requires a typed reason.

Required line:

> The output is a carrier-ready claim packet, not an answer.

## Likely Score If Addressed

- Novelty: 4/5
- Implementation: 4.5/5
- Usefulness: 4.5-5/5

The highest-leverage scoring improvement is not adding more features. It is making the planning, branching, telecom identifiers, and Vultr services visible in the first 30 seconds.
