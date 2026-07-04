# Design Brief

## Product Feel

Reclaim should feel like a revenue-assurance workbench, not an AI chat app. It should be dense, operational, and receipt-heavy. Every dollar needs to visibly connect to a backend event, a cited clause, and a human approval action.

Avoid dark cyber dashboards, generic AI glow, and marketing-page composition. Use an enterprise palette: warm off-white surface, graphite text, cool gray panels, amber for review/deadline risk, and green only for approved recovery.

## Layout

Use a single-screen three-pane layout.

### Left Pane - Circuit Queue

Show roughly 40 rows, with 2-3 live rows clearly distinguished from preprocessed rows.

Each row should include:

- Circuit id
- BAN/account
- Store/location
- Billing month
- MRC
- Status
- Recovery amount
- Route chip: `clean`, `deep review`, `already credited`, `deadline`, or `needs review`

### Center Pane - Glass-Box Reasoning Rail

This is the signature surface. Cards appear as real pipeline events arrive.

Required cards:

- Plan
- Retrieve logs
- Compute uptime
- Retrieve SLA tier
- Exclusion review
- Exclusion review skipped
- Billing cross-check
- Billing cross-check skipped
- Deadline
- Decision
- Memo assembled

Each card should include timestamp, stage name, source/tool badge, short output, confidence or status badge, and citation chip when applicable.

### Right Pane - Credit Memo

The memo should feel exportable and carrier-ready.

Include:

- Customer
- Carrier
- BAN/account
- Circuit id
- Invoice month
- Ticket IDs
- Counted downtime
- SLA target and actual uptime
- Credit formula
- Credit amount
- Filing deadline
- Citations
- Confidence formula inputs
- Approval or override controls
- Typed reason history

### Top Strip

Keep it compact but visible:

- `Deployed on Vultr`
- Run timer
- Corpus version
- Retrieval mode
- Live recovery counter

## Interaction Beats

1. Priya clicks `Run audit`.
2. Queue rows begin routing through `Plan`.
3. One row shows `skip - clean`; another shows `deep - review needed`.
4. Camera settles on the flagged circuit.
5. Rail builds step by step.
6. Uptime calculator emits `99.80% vs 99.9% SLA`.
7. Citation chip opens the SLA tier clause.
8. Ambiguous maintenance interval triggers second retrieval.
9. Agent decides `notice missing - downtime counts`.
10. Counter jumps.
11. Billing cross-check excludes an already-credited circuit.
12. Deadline card flags a three-day filing window.
13. Top memo opens.
14. Confidence `0.97` expands into formula terms.
15. Priya approves, types a reason, and the counter freezes green.

## States

Design these explicitly:

- `Idle`: imported portfolio ready, counter at `$0`.
- `Running`: rail cards streaming, queue statuses changing.
- `Planning`: first card shows selected stages and evidence needed.
- `Skipped`: dimmed card with reason.
- `Ambiguous`: amber decision card before second retrieval.
- `Needs review`: unresolved or low-confidence case.
- `Excluded`: already credited or excluded by contract.
- `Deadline expiring`: urgent filing window.
- `Approved`: memo locked, reason attached, counter frozen green.
- `Fallback`: citation chip opens pre-rendered highlighted clause image instantly.

## Citation Experience

The citation chip is the money shot. It must open instantly for demo circuits.

The source drawer should show:

- Document name
- Page or section
- Highlighted clause
- The memo line supported by that clause

Use pre-rendered highlight assets for on-camera circuits. Live span mapping is a stretch, not a dependency for the recorded demo.

## Motion And Timing

Motion should feel operational, not theatrical.

- Rail cards reveal in 150-250 ms.
- Event-to-card latency should feel immediate.
- Counter increments in short stepped bursts, then settles.
- Citation drawer opens instantly.
- Approval freezes the counter green in under 250 ms.
- Respect reduced motion with opacity-only transitions.

## 60-Second Video Checklist

The final video must show:

- Vultr deployment visible in product chrome.
- Imported telecom portfolio, not a blank shell.
- `Run audit`.
- Plan stage routing one circuit deep and one shallow.
- Explicit skipped card.
- Deterministic uptime or credit calculator card.
- Second retrieval triggered by ambiguity.
- Citation chip opening a highlighted contract clause.
- Already-credited, excluded, or deadline-expiring safety case.
- Ranked memo queue.
- Confidence formula inputs.
- Human approval or override with typed reason.
- Final `$182,400` counter frozen green.
