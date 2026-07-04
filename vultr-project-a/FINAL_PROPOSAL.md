# Reclaim - Final Proposal

## One-Line Pitch

Reclaim is a web-based enterprise agent that audits telecom SLA credits by planning a case-specific investigation for each circuit, retrieving the contract clauses and operational records it needs, using deterministic tools for every dollar, and producing a human-approvable credit memo with receipts attached.

## Track And Sponsor Fit

Track 2 - Vultr asks for a web-based enterprise agent that grounds decisions in documents, plans, retrieves more than once when needed, calls tools, makes decisions, and produces an outcome a real team could use.

Reclaim fits the telecommunications vertical. It is not a chat-with-your-contract demo. It is a bounded enterprise workflow for telecom expense management: identify service-credit opportunities hidden across a Master Service Agreement, NOC outage tickets, maintenance notices, invoice lines, and filing deadlines.

Vultr is load-bearing in the demo architecture:

- Vultr Cloud Compute hosts the Next.js web app and FastAPI orchestrator.
- Vultr Object Storage stores the synthetic MSA, invoice extracts, NOC logs, pre-rendered citation highlights, and golden traces.
- Vultr Managed PostgreSQL stores circuits, cases, audit events, citations, confidence terms, and approval history.
- Vultr Serverless Inference Vector Store is the preferred retrieval layer for clause embeddings and semantic search. A local Chroma mirror remains a judging fallback if provisioning or venue network risk appears.

## Product Framing

Many enterprise telecom SLAs create service-credit rights, often subject to claim windows, monthly recurring charge caps, maintenance exclusions, force-majeure language, and filing rules. The hard work is not simply asking whether an outage happened. The hard work is joining the right circuit, account, MRC invoice line, ticket, time zone, maintenance notice, billing period, clause, exclusion, and deadline.

The primary user is Priya, a telecom-expense analyst at a 2,000-store retailer. Every store has a circuit. Each circuit can have different outage intervals, monthly recurring charges, ticket notes, prior credits, and claim windows. Today, those credits are often missed because auditing each case manually is too slow.

The product promise:

**Reclaim found $182,400 in unclaimed SLA credits, with a citation for every dollar.**

## What The Agent Does

Priya imports the telecom portfolio and clicks `Run audit`. Reclaim works each circuit as a case.

1. Plan the investigation. The planner reads a case bundle and emits a visible strategy: selected stages, evidence needed, reasons, and stop conditions.
2. Retrieve outage intervals and ticket notes for the circuit.
3. Compute uptime using deterministic date and interval math.
4. Retrieve the SLA tier and credit-cap clauses.
5. If the plan calls for it, retrieve exclusion clauses and classify ambiguous downtime as `counts`, `excluded`, or `needs review`.
6. Recompute credit after exclusions.
7. If the plan calls for it, cross-check invoice history for prior credits.
8. Check claim deadline and urgency.
9. Classify the case as `Credit owed`, `Needs review`, `Excluded`, `Already credited`, or `Deadline expiring`.
10. Assemble a carrier-ready memo with amount, account, circuit, ticket IDs, invoice month, counted downtime, citations, confidence score, and approval history.

The agentic proof is concrete: the plan changes the backend path. One circuit skips exclusion retrieval. Another circuit triggers a second retrieval because the NOC note says `scheduled maintenance` but the contract requires five days of notice and the notice evidence is missing.

## Worked Example

Case `CKT-ATL-014`:

- BAN/account: `88321`
- Store: Atlanta Midtown
- Billing month: June 2026
- Monthly recurring charge: `$1,240`
- Ticket: `INC-10422`
- Raw tag: `scheduled maintenance`
- Counted downtime after review: `87 minutes`
- SLA target: `99.9%`
- Calculated uptime: `99.80%`
- Credit tier: `10% of MRC`
- Credit cap: monthly MRC
- Filing deadline: `3 days left`
- Exclusion decision: outage counts because no valid five-day pre-notice was found
- Credit: `$124.00`
- Confidence: `0.97`

Confidence formula:

```text
confidence = 0.4 * retrieval_match + 0.4 * ambiguity_resolution + 0.2 * billing_certainty
```

Anything below `0.80` routes to `Needs review` instead of an approval-ready memo.

## Visual Signature

The product's signature is the Glass-Box Reasoning Rail. It is not decorative. It is the proof surface.

Every rail card is driven by a real backend event:

- `Plan completed`
- `Outage records retrieved`
- `Uptime calculated`
- `SLA tier retrieved`
- `Exclusion review retrieved`
- `Exclusion review skipped`
- `Billing cross-check completed`
- `Billing cross-check skipped`
- `Deadline checked`
- `Memo assembled`
- `Human approval recorded`

Skipped steps remain visible as dimmed cards with reasons, because "the agent decided not to do this" is as important as "the agent did this."

## Demo Narrative

The one-minute video should be legible without a slide deck.

**0:00-0:07 - Hook**  
Priya opens a portfolio of telecom circuits. The recovery counter is `$0`. The top strip shows Vultr deployment status. She clicks `Run audit`.

**0:07-0:22 - Planning proof**  
The queue shows three traces side by side: one `skip - clean`, one `deep - review needed`, one `deadline / prior-credit check`. The Plan card shows selected stages, evidence needed, and stop conditions.

**0:22-0:40 - Star agent beat**  
The flagged circuit hits `scheduled maintenance`. Reclaim retrieves the exclusion clause, compares it to the ticket notes, decides the maintenance window counts because required notice is missing, and the counter jumps.

**0:40-0:52 - Trust and control**  
Another circuit is already credited and is excluded. Another has three days left to file and is flagged urgent. The memo queue ranks the cases.

**0:52-1:00 - Outcome**  
Priya opens the top memo, clicks citation chips, sees the confidence formula inputs, approves with a typed reason, and the counter freezes green at `$182,400`.

## What The Team Should Build

Build one polished workflow, not a general telecom contract platform.

Must ship:

- Three-pane web app: circuit queue, Glass-Box Reasoning Rail, credit memo.
- FastAPI staged agent with a planner that controls optional stages.
- Real SSE events for every rail card, including skips.
- Deterministic tools for uptime, credit, prior-credit cross-check, deadline, confidence, and memo assembly.
- Vultr-hosted demo using Compute, Object Storage, and a persisted audit database.
- 2-3 live deep-run circuits plus preprocessed portfolio rows from the same pipeline.
- Pre-rendered citation highlight images for on-camera clauses.
- Golden-run trace from a successful live run.

Must not build:

- A chat interface.
- Arbitrary carrier onboarding.
- General PDF ingestion.
- Auto-filing claims.
- Real billing integrations.
- Multi-contract normalization.

## Hard Scope Cuts

Cut in this order if time slips:

1. Conflicting amendment-vs-base-clause reconciliation.
2. Vultr Serverless Inference for high-volume model calls.
3. Broad portfolio live processing beyond 2-3 circuits.
4. Any carrier or contract generalization.

Never cut:

- Both branch paths on camera.
- Deterministic dollar math.
- Citation-backed memo lines.
- Confidence formula and threshold.
- Human approval or override with typed reason.

## Winning Position

The pitch is not "we built RAG for contracts." The pitch is:

**We built an enterprise agent that decides how deeply to investigate each telecom circuit, retrieves the exact clauses and records it needs, uses deterministic tools for every dollar, and produces a carrier-ready credit memo a human can approve.**
