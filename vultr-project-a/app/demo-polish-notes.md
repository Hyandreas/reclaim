# Demo Polish Notes

Designer 2 blueprint for Reclaim. This is intentionally scoped to the demo surface: make the agentic proof, telecom credibility, Vultr fit, deterministic math, citations, and approval impossible to miss in 60 seconds.

## Design Register

Product UI, not brand page. The screen should feel like a revenue-assurance workbench: dense, operational, calm, and receipt-heavy. Use warm off-white content surfaces, graphite text, cool gray rails, amber only for risk or review, and green only after approval or finalized recovery.

## Designer 2 Delta From Current Build

Fix or narrate around these first. They are the things a judge can miss in a paused frame:

1. Literal Vultr proof needs to live in the top strip. `Vultr Project A` is too internal; use visible labels like `Deployed on Vultr`, `Retrieval: Vultr Vector Store`, `Object Storage: citation highlights`, and `Vultr Compute + Postgres audit DB`.
2. The first proof strip currently explains the shallow path, but the rail must show it or the presenter must click the `clean` trace tab. If the camera only sees the deep case rail, "the plan changes the backend path" is implied, not proven.
3. The citation drawer should read as a source receipt, not a generic citation viewer. The current minimum is a highlighted clause plus document/location/excerpt; the next owner should add the supported memo line and retrieval/tool ids inside the drawer.
4. The approval reason should use the exact final-demo sentence: `Reviewed outage, notice missing, approved for carrier memo.` This makes the human gate legible without narration.
5. Treat the counter as `recoverable exposure` until approval. The number can animate during the trace, but do not call it recovered cash until the approval state turns it green and records a reason.
6. The route taxonomy must stay stable: `clean`, `deep review`, `already credited`, `deadline expiring`, `needs review`, `excluded`, `approved`. Do not swap in synonyms for variety.

## One-Minute Narration Spine

Use this if the video gets only one take:

1. `We imported a telecom portfolio and run the audit on Vultr: compute executes it, object storage holds the highlighted source receipts, the vector store retrieves contract clauses, and Postgres keeps the audit trail.`
2. `Watch the planner split cases: clean circuits skip exclusion retrieval, ambiguous maintenance triggers a second contract lookup, and already credited cases get blocked.`
3. `The model does not invent the dollars. The calculator counts 87 minutes, compares 99.80% actual uptime against the 99.9% SLA, and applies the cited 10% MRC tier.`
4. `Every memo line can open the source receipt that supports it.`
5. `The final packet only becomes approved after Priya types a reason, so the trace closes with a human audit trail.`

## 60-Second Camera Path

| Time | Camera | Screen action | Judge proof |
| --- | --- | --- | --- |
| 0:00-0:04 | Full app, top strip in frame | Imported portfolio is already loaded. Counter reads `$0`. Top strip shows `Deployed on Vultr`, `Corpus v2026.07.04`, `Retrieval: Vultr Vector Store`, `DB: Managed PostgreSQL`, `Object Storage: citations ready`. | This is a deployed enterprise workflow, not a blank prototype. |
| 0:04-0:07 | Slight zoom to Run control | Priya clicks `Run audit`. Timer starts. 2-3 live rows receive `live` badges while the rest are visibly preprocessed rows. | Live scope is honest and controlled. |
| 0:07-0:14 | Three-pane view, center weighted | Three selected rows enter planning: `clean`, `deep review`, `already credited/deadline`. The Plan card opens with selected stages, evidence needed, and stop conditions. | The planner is visible before retrieval. |
| 0:14-0:21 | Center rail and selected queue rows | Clean case shows `Exclusion review skipped` as a dimmed card with reason `No maintenance tag or ambiguous downtime`. Deep case keeps `Exclusion review` active. | The plan changes the backend path. |
| 0:21-0:30 | Tight on deep case rail | `Compute uptime` emits `87 min counted, 99.80% vs 99.9% SLA`. `Retrieve SLA tier` shows a citation chip. Click chip and open drawer instantly. | Deterministic tool output plus cited contract basis. |
| 0:30-0:40 | Drawer plus rail | Drawer shows highlighted SLA tier. Then ambiguous maintenance triggers `Second retrieval: exclusion clause`. Decision card states `Notice missing, downtime counts`. Counter steps up by `$124.00`. | The agent retrieved again only because the case needed it. |
| 0:40-0:48 | Queue and memo ranking | Already-credited row flips to `Excluded`. Deadline row shows `3 days left`. Memo queue ranks `Credit owed`, `Deadline expiring`, `Needs review`, `Excluded`. | Operational safety: it declines unsafe or duplicate claims. |
| 0:48-0:55 | Right memo pane | Open top memo. Show account, circuit, ticket, invoice month, counted downtime, formula, credit amount, confidence `0.97`, and formula terms. | Output is a claim packet, not a dashboard card. |
| 0:55-1:00 | Approval area and top counter | Priya types `Reviewed outage, notice missing, approved for carrier memo` and clicks `Approve memo`. Counter freezes green at `$182,400`. Approval history receives timestamp and approver. | Human control closes the loop. |

## Citation Drawer Content

Open the drawer from citation chips in rail cards and memo lines. It should feel instant, narrow enough to preserve context, and receipt-first.

Required drawer sections:

- Header: `Source receipt`
- Source summary: document name, section/page, corpus version, retrieval mode, citation id
- Highlight panel: pre-rendered highlighted clause image for on-camera circuits
- Supported memo line: the exact memo sentence or formula row this evidence supports
- Extracted clause data: clause key, SLA target, credit tier, cap, notice requirement, or claim window
- Linked backend events: rail event id, tool call id, retrieval id, case id
- Fallback badge when relevant: `Pre-rendered from cited clause`

On-camera drawer examples:

| Chip | Drawer title | Highlight | Supported memo line |
| --- | --- | --- | --- |
| `SLA tier 99.9%` | `MSA SLA Table, Section 4.2` | `99.9% monthly uptime, 10% MRC credit when actual uptime is below target` | `Credit tier: 10% of $1,240 MRC = $124.00` |
| `Maintenance notice` | `MSA Exclusions, Section 7.1` | `Scheduled maintenance is excluded only with five days of customer notice` | `Outage counts because no valid five-day notice was found` |
| `Ticket INC-10422` | `NOC log, INC-10422` | `Scheduled maintenance tag, 87 minutes, no notice reference` | `Counted downtime: 87 minutes` |
| `Invoice MRC` | `Invoice June 2026, BAN 88321` | `Circuit CKT-ATL-014 monthly recurring charge: $1,240` | `Credit amount calculated from MRC, not model text` |
| `Claim window` | `MSA Claims, Section 9.3` | `Claims due within 30 days of billing close` | `Filing deadline: 3 days left` |

Do not make the drawer read like a PDF viewer. It is a proof drawer: evidence at top, memo implication directly under it, metadata below.

## Microcopy

Top strip:

- `Deployed on Vultr`
- `Run 00:12`
- `Corpus v2026.07.04`
- `Retrieval: Vultr Vector Store`
- `Object Storage: citation highlights ready`
- `Audit DB: Managed PostgreSQL`
- `Recovered: $182,400`

Primary actions:

- `Run audit`
- `Open memo`
- `Approve memo`
- `Override decision`
- `View source`
- `Replay golden trace`

Queue chips:

- `live`
- `preprocessed`
- `clean`
- `deep review`
- `already credited`
- `deadline`
- `needs review`
- `approved`

Rail card copy:

- Plan: `Selected stages: logs, uptime, SLA tier. Stop if no ambiguity.`
- Skipped exclusion: `Skipped: no maintenance tag or ambiguous downtime.`
- Deep retrieval: `Triggered: maintenance tag requires exclusion review.`
- Uptime tool: `Tool result: 87 min downtime, 99.80% uptime.`
- Credit tool: `Tool result: 10% MRC credit, $124.00.`
- Billing check: `Prior credit found, duplicate claim blocked.`
- Deadline: `3 days left to file.`
- Decision: `Credit owed. Notice missing, downtime counts.`
- Memo assembled: `Carrier-ready memo ready for human approval.`

Confidence copy:

- `Confidence 0.97`
- `0.4 retrieval match`
- `0.4 ambiguity resolution`
- `0.2 billing certainty`
- `Below 0.80 routes to Needs review`
- `Confidence is a routing rule, not a vibe`

Approval copy:

- Placeholder: `Type the approval reason for the audit trail`
- Success: `Approved with reason. Memo locked.`
- Validation: `Approval requires a typed reason.`
- History row: `Priya Shah approved at 10:42 AM: Reviewed outage, notice missing, approved for carrier memo.`

Judge-facing one-liners to surface in narration or tiny screen annotations:

- `The plan changes the backend path, not just the narration.`
- `Every dollar comes from deterministic tools.`
- `The data is synthetic; the control flow, retrieval, calculations, citations, and audit trace are real.`
- `Vultr stores, serves, searches, and audits the corpus.`
- `The output is a carrier-ready claim packet, not an answer.`

## Empty, Running, Approved, and Risk States

Empty or idle:

- Portfolio rows are visible, not an empty shell.
- Counter reads `$0`.
- Top strip confirms Vultr deployment and corpus readiness.
- Center rail placeholder: `Select a circuit or run the audit to see the investigation path.`
- Right memo placeholder: `Memos appear after deterministic tools calculate recovery and citations are attached.`

Running:

- Queue rows update status in place, no layout jumps.
- Live rows have a small `live` chip and timer.
- Rail cards stream from real events with timestamps.
- Cards that are skipped still appear dimmed with a reason.
- Counter increments only when a calculator-backed memo amount is assembled.
- Citation chips are clickable as soon as their supporting event lands.

Planning:

- First card must show `selected stages`, `evidence needed`, and `stop conditions`.
- It must name the optional stages that will be skipped or triggered.
- It should visually connect to route chips in the queue.

Ambiguous:

- Amber status only.
- Copy: `Maintenance tag found. Checking notice evidence before credit decision.`
- Next visible action must be `Retrieve exclusion clause`.

Skipped:

- Dimmed card remains in the rail.
- Copy format: `Skipped: [stage] because [specific condition].`
- Use this state for clean exclusion skip and billing skip.

Needs review:

- Amber memo status.
- Copy: `Confidence below 0.80 or unresolved evidence. Human review required.`
- Disable `Approve memo`; enable `Override decision` with typed reason.

Excluded or already credited:

- Neutral gray status, not green.
- Copy: `Duplicate claim blocked. Prior credit found on invoice history.`
- Recovery amount remains `$0`.
- Keep citation chip for invoice evidence.

Deadline expiring:

- Amber status with strong time text: `3 days left`.
- Memo ranks above ordinary credit owed if filing urgency is the story beat.

Approved:

- Memo locks in place.
- Counter freezes green in under 250 ms.
- Approval history appears immediately.
- Action button becomes `Approved`, disabled.
- Show audit trail fields: approver, timestamp, typed reason, case id.

Fallback:

- Citation drawer opens a pre-rendered highlight instantly.
- Badge: `Fallback highlight from cited clause`
- Do not apologize in UI. Keep it framed as a reliability path.

## Impossible To Miss For Judges

1. Top strip says Vultr does real work: Compute, Object Storage, Managed PostgreSQL, Vector Store.
2. The first 15 seconds show one shallow path and one deep path.
3. Skipped cards remain visible with reasons.
4. The deep case triggers a second retrieval because of `scheduled maintenance`.
5. `99.80% vs 99.9% SLA`, `87 minutes`, and `$124.00` are visibly tool results.
6. Citation drawer opens a highlighted clause while the relevant memo line stays visible.
7. Safety cases are shown: already credited, deadline expiring, needs review, or excluded.
8. Confidence formula inputs are visible next to the memo.
9. Approval requires typed human reason.
10. Final `$182,400` counter freezes green only after approval.

## Priority If Time Slips

Keep:

- Three-pane shell with top Vultr strip
- Three live rows with route chips
- Reasoning rail events, including skipped cards
- One citation drawer with pre-rendered highlight
- Deterministic calculator cards
- Memo with confidence formula and typed approval

Cut:

- Fancy charting
- PDF-like document browsing
- Broad live portfolio processing
- Amendment conflict UI
- Decorative animation
