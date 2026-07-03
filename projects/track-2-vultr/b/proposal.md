# 1. Redline

**An agentic covenant-monitoring analyst for private-credit and commercial-lending teams. It reads the credit agreement *and* the real amendment that later rewrote it, computes the ratio itself, works out which document's terms actually govern the quarter, and shows its receipts — flagging a near-breach in under a minute.**

One-line hook for judges: *"We gave it the original credit agreement and the real amendment filed a year later. It had to figure out, on its own, which one governed the quarter we tested — and it flagged the exact deterioration that amendment was negotiated to fix."*

---

## 2. Track & sponsor

**Track 2 — Vultr.** Web-based Enterprise Agent for a real-world workflow, grounded in documents, in **Finance**. The system plans, retrieves more than once **across two different real, dated legal documents** — not the same PDF re-read twice (see §5 for why that distinction is the whole novelty argument) — calls deterministic tools for every number and every governing-date decision, makes a decision, and produces an outcome a real credit team could act on today.

Sponsor technology is load-bearing, not cosmetic: the app runs on **Vultr Cloud Compute**, and the precedent store is **Vultr Managed Database for PostgreSQL with the pgvector extension** ([Vultr's own docs confirm native pgvector support](https://docs.vultr.com/ai-powered-search-with-pgvector-and-vultr-managed-database-for-postgresql)).

---

## 3. Problem & who it's for (usefulness / relevance)

**The user:** a credit / portfolio-surveillance analyst at a private-credit fund, a BDC portfolio-monitoring desk, or a bank leveraged-lending team.

**The pain:** every quarter, they re-derive covenant compliance by hand — cross-referencing an 80–150 page credit agreement's *idiosyncratic* defined terms and carve-outs against the borrower's latest financials. The catch that makes this hard, and makes a toy useless: real deals redefine "Consolidated EBITDA" with 10–20 negotiated add-backs. **GAAP EBITDA is not what the covenant actually tests.** Getting that one definition right is the whole job. It is slow, expensive, and error-prone — a tired analyst skims the carve-out language and misses a breach, or misses that a breach is curable via an add-back.

**It gets worse over the life of a deal, and this is the part a toy skips:** active credits get amended — a waiver, a repricing, a covenant reset — and each amendment *legally supersedes* part of the original definition, often without restating the whole document. A real analyst's actual first question every quarter isn't just "what does the agreement say" — it's **"which vintage of the agreement governs, as of this test date?"** That's the specific nuance every single-document RAG demo skips, because it requires tracking two documents against a calendar, not just reading one document well.

**Why it's real, not hypothetical:** firms already pay for this. Covenant Review, Reorg/Debtwire, and Allvue sell slices of exactly this workflow — the budget exists and is spent today. Redline compresses the quarterly ritual into a **cited, auditable, sub-minute check**, and catches the nuance humans skim — including which document's fine print currently controls.

**Value:** hours → under a minute per borrower per quarter; breaches caught *before* default; a defensible audit trail for the credit officer's sign-off.

---

## 4. What it does — the idea (concrete)

You click a borrower flagged amber — **"cushion shrinking."** On one screen, you watch the agent work:

1. **PLAN** which covenants apply this quarter — a real lookup against the covenant schedule, not a fixed list. (In our rehearsed scenario, Interest Coverage is correctly **skipped this quarter** because the schedule shows it's tested annually, not quarterly — the agent visibly declining to act is proof the plan step is data-driven, not scripted.)
2. **RETRIEVE** from the *original* credit agreement the exact covenant threshold **and its bespoke EBITDA add-back / carve-out language** — not just the number, the exceptions.
3. **CALL a calculator tool** that computes Debt/EBITDA in real Python — **zero LLM arithmetic** — with headroom (cushion) % and a quarter-over-quarter trend.
4. **DECIDE**: the ratio is inside the tolerance band of the threshold. Cushion is shrinking.
5. **CALL `resolve_governing_document`** — a second deterministic tool, not the LLM — checks the test date against a small effective-dates table and finds that a **real amendment to this agreement** is in force for the quarter being tested.
6. **RETRIEVE AGAIN — from the amendment, not the original.** The money moment. The agent pulls the amendment's redefinition of the add-back, pulls the quarter's financial line items to find *what drove the deterioration* (e.g. a debt-funded acquisition or a one-time charge), and cross-checks the driver against the amended language: *"covered under the amended add-back → pro-forma recompute 4.4x."* Confidence drops — **Monitor**, not Clear.
7. **LOOK UP PRECEDENT** (pgvector) for how similar near-breaches were historically resolved.
8. **OUTPUT** a one-page escalation memo — **Clear / Monitor / Escalate**, a confidence score with its deductions itemized, ratio, threshold, cushion %, trend, and a cited root cause **naming which document (original or amendment) governs**. **Every figure is a clickable chip that jumps to the exact PDF page or the exact filing line it came from.**

A human stays in control: an action bar offers **Approve / Escalate to Credit Committee / Request More Data**.

Hard scope (non-negotiable): **one borrower, one credit agreement plus the one real amendment that governs it, up to three covenants, no multi-tenant dashboard, no live upload.** Two documents, hand-validated, beats a platform that reads none of them carefully.

---

## 5. Why it's novel / differentiation vs the obvious approach

**Let's address this head-on: covenant monitoring is the track brief's own Finance example.** That's not a coincidence — it means this is squarely the problem the track wants solved — but it does mean "we built the example" is not, by itself, a novelty claim. Judges will have read that same paragraph. Here is what goes beyond it, in order of importance:

- **Two documents that disagree, not one document read twice.** The obvious build — and the one the brief's own wording nudges everyone toward — is a single static agreement plus a calculator. Redline's defining beat is **cross-document reconciliation under a real legal-effective-date constraint**: the original agreement says one thing, a real amendment filed later says another, and the agent has to determine — with a deterministic date check, not a vibe — *which one legally governs the quarter being tested* before it can even compute the "right" answer. Re-reading a document to verify a fact discovered elsewhere is the textbook line between RAG and an agent; reconciling **two different real documents against a calendar** is a harder, more surprising version of that same line, and it's legible on screen.
- **It's a real backtest, not a scripted gotcha.** Because both documents and the near-breach are genuine SEC filings on a company that *actually later amended its loan*, we can freeze the agent's context at a real historical date and check its verdict against what actually happened next — the way you'd backtest a trading strategy, not stage a demo. A hand-engineered scenario built to have a satisfying answer can't make that claim; ours is checkable against the public record after the fact.
- **The core cannot hallucinate.** The ratio, the cushion, the trend, *and* the governing-document decision are all computed by deterministic Python tools, not the model. A judge can challenge any figure live — we show the citation *and* the recomputation instantly. Reliability is designed in, not hoped for.

Pitch line: **"An analyst that reads the agreement, reads the amendment, works out which one counts, checks the math, and shows its receipts."**

---

## 6. How it works — architecture & AGENTIC flow

### Stack
- **Frontend:** Next.js "Agent Cockpit" — a two-pane live screen (agent-trace timeline + PDF viewer with highlight-on-citation), served from **Vultr Cloud Compute**.
- **Backend:** FastAPI on the same Vultr instance, streaming the agent's every step to the UI over **SSE** (Server-Sent Events).
- **Precedent store:** **Vultr Managed Database for PostgreSQL + pgvector** — memos embedded via Voyage AI (Anthropic's recommended embeddings provider) and queried by cosine similarity, surfacing how similar near-breaches were historically resolved.

### Model & API (Anthropic)
- **`claude-sonnet-5`** as the driver — near-Opus agentic quality at materially lower latency and cost (`$3`/`$15` per 1M tokens, intro `$2`/`$10` through 2026-08-31, vs. Opus's `$5`/`$25`), which matters for a live demo that makes several tool-call round trips. (Drop-in `claude-opus-4-8` for the final memo synthesis if we want extra reasoning depth; both are 1M-context.) Adaptive thinking (`thinking: {type: "adaptive", display: "summarized"}`) streamed into the trace so judges see the agent reason. `output_config: {effort: "high"}` per step, bumped to `{effort: "xhigh"}` for the memo synthesis — Sonnet 5 supports the full effort range up to `xhigh`/`max`.
- **Native document input + citations for free.** The credit agreement, the amendment, and the filings are each uploaded once via the **Files API** (`files-api-2025-04-14`) and referenced by `file_id` in a `document` content block with `citations: {enabled: true}` — no custom RAG/chunking to build or debug under time pressure. Claude returns text blocks carrying **page-anchored citations** (1-indexed PDF page ranges) tagged with *which* document they came from, so every quoted figure already knows its source page *and* its source vintage. Each document block also carries `cache_control: {type: "ephemeral"}`, so the ~100-page agreement and its amendment are cached once and read from cache on every later tool-call round trip in the session instead of being re-priced from scratch. (Note: citations are deliberately kept separate from structured-output formatting, which is mutually exclusive with them; the memo is assembled by the UI from the agent's cited blocks + tool outputs.)

### Control flow — a manual agentic loop (not the opaque tool-runner)
Every step is interceptable and streamable to the cockpit. **The first hop is forced** — `tool_choice: {type: "tool", name: "retrieve_agreement"}` — so the opening beat is 100% repeatable on demo day. After that, `tool_choice: auto` drives the genuine branch (dig deeper vs. clear, original vs. amended). Deterministic where it must be, agentic where it should be.

### Tools
1. **`retrieve_agreement`** — cited pull of a covenant clause / the Consolidated-EBITDA definition / add-back carve-outs, parameterized by *which document* (original agreement or a named amendment) to read from (page-anchored citations).
2. **`calc_ratio`** — real Python: computes the covenant ratio, cushion %, and quarter-over-quarter trend. **The LLM never does arithmetic.**
3. **`resolve_governing_document`** — **deterministic, not the LLM.** Given a covenant and the fiscal period being tested, looks up a small curated effective-dates table and returns which document version's language is legally in force for that period. Getting this wrong flips the whole verdict, so it's arithmetic on dates, not a judgment call — the same trust rule as the ratio itself.
4. **`query_financials`** — structured query over the borrower's XBRL line items (loaded from SEC into Vultr Postgres); surfaces the quarter's mover behind a ratio change.
5. **`retrieve_filing_narrative`** — cited pull of MD&A / footnotes from the 10-Q to explain *why* a figure moved (the loop-back evidence).
6. **`lookup_precedent`** — pgvector similarity search over prior covenant memos (Vultr Managed Postgres).

Every tool schema sets **`strict: true`** (`additionalProperties: false` plus a full `required` list), so `tool_use.input` is guaranteed to validate exactly before it ever reaches our Python — a malformed date or a hallucinated field name fails at the schema boundary, not inside the calculator.

### Planning / retrieval / decision, end to end
`PLAN covenants` (queries the covenant schedule — a covenant that's genuinely not tested this quarter is skipped on screen, not silently omitted) → **retrieve_agreement** (original threshold + add-back language, cited) → **calc_ratio** (deterministic) → **DECIDE**: near threshold? → **resolve_governing_document** (deterministic date check — is an amendment in force?) → **retrieve_agreement AGAIN, this time against the amendment** (the redefinition, cross-checked against the driver found via `query_financials`) → **calc_ratio** (pro-forma recompute under the governing definition) → **lookup_precedent** → **synthesize** the escalation memo. Retrieval happens **more than once, against two different real documents**, and the second read is *triggered by a deterministic tool result*, not scripted — the agentic requirement, satisfied visibly and non-negotiably.

### Data
- **Real:** one borrower's actual original credit agreement *and* the actual subsequent amendment that redefines the covenant math (both real EDGAR exhibits, free, no auth), 3–4 quarters of actual 10-Q filings, and real XBRL financial facts (SEC `companyfacts` API). The borrower is chosen precisely because it later needed a covenant waiver/amendment — so the deterioration, and its real fix, are both *in the data we feed it*.
- **Curated, not synthetic:** the only hand-built artifact is a tiny effective-dates lookup table (which document governs which period), transcribed from the amendment's own cover page — a fact, not an invention.
- **State / memory:** conversation + tool results held per session in the backend and streamed to the UI; the pgvector precedent set is the only long-lived store. Confidence is computed by backend logic from those same operational signals — retrieval-match scores, date-resolution certainty, data completeness — never self-reported by the model (formula and worked example below).

### Confidence score (concrete, not a vibe)
Starts at **100** and is docked by fixed, disclosed penalties — every deduction shows up in the memo as a labeled line, not just a final number: **−20** if the test date sits in a residual dating-ambiguity window relative to an amendment's own "effective as of" language (even after `resolve_governing_document` names which document governs); **−15** for each add-back/carve-out invoked that required judgment rather than a bright-line dollar test; **−15** if a required XBRL line item was missing or estimated rather than directly tagged; **−10** if a cited clause's retrieval-match score falls below threshold. **≥80 → Clear** (memo drafts, no action needed); **55–79 → Monitor**; **<55 → Escalate**, which blocks on human sign-off regardless of what the ratio's own color says. Worked example, matching the demo run: **100 − 20** (the amendment's own "effective as of" language leaves a residual dating question even after `resolve_governing_document` names it as controlling) **− 15** (the amended add-back that qualifies the debt-funded acquisition required judgment, not a bright-line dollar test) **= 65 → Monitor**, not Clear — the itemized math a credit officer would actually want before signing off. A dropped score is the explicit trigger for **human review**, which is what makes this adoptable in regulated finance rather than a black box.

---

## 7. Buildable-in-2-days plan (milestones, real vs mocked, honest scope)

**Freeze rule:** the document set and the single demo path are frozen by **Day 1 midday**. After that, any new feature is *blocked* until the one path runs end-to-end with no human nudging it.

**Team (3):** a domain owner (sources and hand-validates the credit agreement, the amendment, and the filings), a developer (agentic backend, tools, Vultr deploy), and a designer (cockpit UI, citation and confidence components).

- **Day 1 AM** — Domain owner sources & hand-validates **one borrower with both** a real original credit agreement (Exhibit 10.1) **and** a real subsequent amendment to it (Exhibit 10.x) — EDGAR full-text search on 8-K covenant-waiver disclosures narrows this to a short list fast, since a waiver is usually followed within days by the amendment itself — plus 10-Qs and XBRL, and pre-validates the specific add-backs, thresholds, and the amendment's effective date. Dev stands up FastAPI on Vultr and gets the manual agentic loop running end-to-end on **3 simple tools** (`retrieve_agreement`, `calc_ratio`, `resolve_governing_document` — the last is a small lookup table plus a date comparison, not new complexity) with the forced first call.
- **Day 1 PM** — Full happy path on the one borrower across **both documents**; page-anchored citations rendering with a visible document-source tag; SSE trace streaming. Designer builds the cockpit shell (two-pane grammar, state tokens `safe/near-breach/breach` + `pending/active/done/flagged`, citation-chip and confidence-badge components).
- **Day 2 AM** — Add `query_financials`, `retrieve_filing_narrative` (the loop-back into the amendment), and `lookup_precedent` (pgvector on Vultr); wire the itemized confidence score; memo assembles live with clickable citations; action bar. Pre-render the highlighted-page image for every citation used in the frozen scenario, so the signature "click a figure, jump to the exact page" beat never depends on a live coordinate-mapping call.
- **Day 2 PM** — Tune 2–3 scripted scenarios (clean / near-breach-cured-by-amendment / genuine breach), pre-warm the prompt cache, over-rehearse the 60-second path, **record the fallback video**, deploy on Vultr.

**Real:** both agreements (original + amendment), the filings, the XBRL numbers, Claude's citations, the deterministic calc, the effective-date resolution, the pgvector search on Vultr. **Curated (honest):** the precedent memos in pgvector are a small hand-authored set of realistic covenant memos (real internal bank memos aren't obtainable), and the effective-dates lookup table is manually transcribed from the amendment's cover page — this is the one deliberately-synthetic component, and it's not load-bearing to the core beat. **Pre-rendered for reliability, real underneath:** the highlighted-page image behind each on-camera citation chip is painted ahead of time from that citation's real page — the citation itself is genuine Claude output; only the PDF-to-image rendering is pre-baked so the signature click-to-source beat can't stall live (risk detail in §10). **Not built:** multi-tenant dashboard, live document upload, portfolio-wide trends, and — critically — **any attempt to generalize extraction across arbitrary companies.** Narrow and bulletproof beats broad and flaky when you get one shot on stage.

---

## 8. The 1-minute demo script (moment by moment)

Designed to be legible **with the sound off** — a ratio turns red, the trace runs step by step, the memo fills with clickable proof, a human clicks a decision.

- **0:00–0:07** — Cockpit opens on a watchlist row: **[Borrower], amber, "cushion shrinking."** Analyst clicks it. (Persona + problem established in one glance.)
- **0:07–0:18** — Left pane lights node by node: **PLAN** — Interest Coverage flashes and is correctly **skipped** ("tested annually, not this quarter") before Net Leverage is selected — then **RETRIEVE agreement**: the bespoke Consolidated-EBITDA definition *with its original add-backs* and the Debt/EBITDA threshold. A citation chip pops, tagged **"Original Agreement, p.61"**; the right pane opens the highlighted page.
- **0:18–0:29** — **CALL calc_ratio**: deterministic Python returns **Debt/EBITDA = 4.7x vs 4.5x covenant → cushion −0.2x, RED**, with a trend sparkline. (Judge can challenge the number; we show the recompute + the cited line items.)
- **0:29–0:46** — The agent **DECIDES** the cushion shrank, **CALLS `resolve_governing_document`** — a date-check chip flashes *"Amendment No. 1 in force for this quarter"* — and **RETRIEVES AGAIN, from the amendment**: the widened add-back, tagged **"Amendment No. 1, p.4."** `query_financials` surfaces the driver (a debt-funded acquisition); the agent cross-checks it against the amended language — *"covered under the amended add-back → pro-forma 4.4x, confidence 65/100 → Monitor."* (Two real documents, one deterministic date check — the RAG-vs-agent moment.)
- **0:46–0:55** — Right pane: the **one-page escalation memo** has assembled itself — ratio, threshold, cushion %, trend, cited root cause, which document governs, and an itemized confidence badge. Every figure is a chip → click jumps to the exact 10-Q page / agreement or amendment clause.
- **0:55–1:00** — Analyst clicks **"Escalate to Credit Committee."** Closing card: *"Redline read the original agreement and the real amendment that followed it — and flagged the deterioration the amendment was written to fix. It checks the math and shows its receipts."*

---

## 9. Impact & adoption

- **Real-world grounding:** covenant monitoring is manual, quarterly, high-stakes Excel-and-email work inside bank loan-ops teams, private-credit/BDC surveillance desks, and borrower treasury/FP&A groups preparing compliance certificates. Commercial vendors already monetize slices of it — the budget is proven. And every one of those desks manages *portfolios of amended deals*, not single static agreements — the two-document reconciliation mechanism isn't a demo flourish, it's arguably the more realistic case, not the exception.
- **Who benefits:** the analyst (hours → a minute), the credit officer (an auditable, cited memo to sign that names which document governs), the fund (breaches caught before default).
- **Failure modes handled:** the model never does arithmetic or effective-date judgment (both are deterministic tools); every claim is traceable to a source page *and* a source document (citations); judgment calls *lower confidence and route to a human* instead of asserting a false number; the tool honestly says when a figure needed judgment.
- **Adoption narrative:** this **augments, never replaces**, the credit officer's sign-off. No regulated-finance stakeholder adopts a black-box number on a live credit decision — the visible trace, the citations, and the human action bar are precisely what make it deployable rather than a demo toy.

---

## 10. Risks & mitigations; stretch goals

**Risks & mitigations**
- **Can't find one borrower with both a real near-breach *and* a real amendment on EDGAR in time.** → This is the single biggest new risk this design adds, so it's front-loaded to Day 1 AM, not discovered on Day 2: domain owner pre-screens 2–3 candidate borrowers *before* committing, using EDGAR full-text search for 8-K covenant-waiver/amendment disclosures (leveraged borrowers that need a waiver almost always file the amendment as an exhibit within days, so the two documents are usually a package, not a needle in a haystack). Fallback: if no clean pair is found by late Day 1 AM, degrade to the single-document version (re-reading the original agreement's own carve-out) — strictly a subset of the same architecture, so nothing already built is wasted.
- **Live agent-trajectory flakiness (wrong tool order, weak citation match) reads as "broken."** → Force the first tool call; over-rehearse 2–3 scripted scenarios until the trajectory is stable; pre-warm the prompt cache before going on stage; keep a **recorded fallback video** in hand (only a 1-minute video is ultimately submitted anyway).
- **The signature "click a figure, jump to the exact highlighted page" moment is the hardest UI to get right live.** → Pre-render the highlighted-page image for every citation used in the frozen scenario (Day 2 AM), so the money-shot beat never depends on a live PDF-coordinate mapping call succeeding on stage.
- **Over-scoping into a "platform"** (multi-borrower, trend charts, integrations) that ends broad and fragile. → Freeze to one borrower/two documents by Day 1 midday; treat any new feature as blocked until the single path runs clean end-to-end.
- **Real filings are messy** (inconsistent XBRL tags, 100+ page agreements, non-standard tables). → Hard-scope to one borrower and hand-validate the whole pipeline well before demo day; **never live-generalize** the add-back logic.
- **A slow tool call or retry looks like a crash.** → Design every intermediate state — including retries — as an intentional, animated part of the cockpit (reads as "thorough," not "broken"), never a bare spinner or stack trace.

**Stretch goals (only after the single path is bulletproof)**
- A second covenant type (interest-coverage) on the same borrower.
- A second amendment (Amendment No. 2) to show the governing-document logic generalizes past one hop.
- A read-only portfolio view with 2–3 borrowers.
- Live "what-if": toggle an add-back and watch the cushion recompute.
- Export the escalation memo to PDF.
- Mirror the precedent-embedding step onto **Vultr Serverless Inference** as a self-hosted fallback path — deepens sponsor-stack usage beyond Compute + Managed Database without touching the reasoning core.
