# Reclaim — the SLA credit-recovery agent that shows its work

**One-line pitch:** Reclaim is a web-based enterprise agent that reads a telecom SLA contract, NOC outage logs, and invoice history, **plans a bespoke investigation for every circuit — deciding what it needs to check and what it can skip** — and retrieves fine print *again* whenever a judgment call demands it, returning a ranked queue of human-approvable credit memos with a clause-level citation and a confidence score behind every dollar.

---

## 2. Track & sponsor

**Track 2 — Vultr.** Web-based Enterprise Agent for a real-world workflow, grounded in documents, in **Telecommunications**. The whole app is containerized and deployed on **Vultr Cloud Compute** (deployed and load-tested day one, not day two). Reasoning runs on Claude (Anthropic API); document retrieval runs fully in-process so nothing depends on venue wifi at judging time. Stretch: mirror the per-clause reasoning onto **Vultr Serverless Inference** as a self-hosted fallback, doubling our visible use of the sponsor stack.

This is an **agent**, not a retrieve-then-answer bot: per circuit it **PLANS** an investigation — a structured Claude call reads the case and decides which optional stages this specific circuit actually needs, so a clean circuit and a messy one visibly take different paths through the same pipeline — **RETRIEVES** more than once (a second/third retrieval is *triggered by a real judgment call*, not scripted), calls deterministic **TOOLS**, makes **DECISIONS** with branching, and produces an **OUTCOME** a real revenue team files on Monday.

---

## 3. Problem & who it's for

Every enterprise telecom contract carries an uptime SLA with **automatic credit obligations** — miss the uptime tier, owe the customer a credit. Almost nobody enforces them correctly. Reconciling outage tickets against contract fine print is slow, manual, and thankless, so carriers under-issue credits and enterprise buyers never audit their own bills. The money just evaporates.

**Primary persona — Priya, a telecom-expense analyst at a 2,000-store retail chain.** Every store is a circuit. She has the carrier's Master Service Agreement (uptime tiers, credit formulas, exclusion clauses, claim deadlines), a firehose of NOC outage/incident logs, and months of invoices. She has no time to cross-reference a 40-page contract against thousands of outage minutes per circuit, so she doesn't — and the chain silently eats every uncredited breach.

**Same engine, mirror market:** a **carrier's revenue-assurance team** runs Reclaim in the opposite direction — proactively self-issuing owed credits to cut billing disputes, churn, and regulatory exposure. Two adoption paths, one product. Judges instantly see who clicks "Run audit" Monday morning, and why.

---

## 4. What it does — the idea (concrete)

Priya imports a portfolio (invoices + NOC logs + the MSA) and clicks **Run audit**. Reclaim works each circuit as a case:

1. **Plans the investigation — a real decision, not a checklist.** A structured Claude call reads the circuit's case bundle (interval tags, the NOC ticket's raw free-text notes, an invoice-history summary, days-to-deadline) and returns `{needs_exclusion_review, needs_billing_crosscheck, rationale}`. It's reading messy notes, not just checking a tag: a ticket tagged "unplanned outage" whose notes reference an unlogged change request still trips `needs_exclusion_review`; a ticket tagged "scheduled maintenance" whose notes cite a signed customer approval does not. Circuits where both flags come back false skip straight to the credit math; circuits needing one or both checks go deep. The rail renders this plan as the very first card — visible proof the agent is scoping its own work, not running the same five steps on autopilot every time.
2. **Retrieves** the circuit's outage intervals from the log store.
3. **Computes** actual uptime for the SLA period with a deterministic calculator.
4. **Retrieves** the matching SLA tier clause to find the applicable credit %. For the handful of store groups with a signed amendment on file, this pulls *both* the base tier table and the amendment; if they disagree, a deterministic `clause_precedence_resolver` applies standard contract precedence (amendment supersedes base term) and the memo cites both documents with a one-line note on which one controls and why.
5. **Branches on ambiguity — the killer feature, now gated by a real decision.** This stage only runs when the Plan flagged `needs_exclusion_review`. When it runs and hits a downtime interval tagged "scheduled maintenance," "customer-caused," or "force majeure," it does **not** guess: it fires a fresh, judgment-triggered retrieval of the specific exclusion clause, reads it, and decides whether that downtime even counts (e.g. "maintenance wasn't pre-notified per the contract's 5-day rule → it counts"). When the Plan found nothing ambiguous, the rail shows this stage as **explicitly skipped** instead of silently absent — the same branch, visibly taken both ways.
6. **Recomputes** the credit with excluded intervals removed (a no-op when nothing was excluded).
7. **Cross-checks invoice history — runs only when `needs_billing_crosscheck` was flagged, otherwise the rail marks it skipped with its reason.** When it runs, it makes sure Reclaim never double-counts a credit already issued.
8. **Checks** the claim-filing deadline and **classifies** the case: `Credit owed` / `Needs review` / `Excluded` / `Already credited` / `Deadline expiring`.
9. **Outputs** a cited **credit memo** — dollar amount, per-line citation chip, a confidence score with its inputs shown (formula in §6) — into a ranked queue, and ticks a **live money counter** upward as it works the portfolio.

**The product's single visual signature:** a **Glass-Box Reasoning Rail** down the center of the screen renders each agent step as a card *the instant the backend actually performs it* — including a dimmed **skipped** card with its one-line reason, so "the agent decided this circuit didn't need it" is exactly as visible as a step that fires. Each card carries a confidence badge and a clickable citation chip that snaps open the exact highlighted line in the source PDF. Beside it, a **dollar counter climbs in real time** and **freezes green** the moment a human approves. Nothing appears in a memo without a visible source pin. The pitch is one visual beat: the counter stops, the memo appears, receipts attached.

---

## 5. Why it's novel / differentiation

The track's telecom example is real-time **incident dispatch** (fix the outage). We deliberately zag to the **back-office, after-the-fact** moment nobody watches: revenue that was contractually owed and quietly lost. "Our agent read three enterprise documents and found **$182,400 in unclaimed SLA credits — and can show which clause and which outage justifies every dollar**" is a sharper, more original hook than another chat-with-your-PDF bot, and a genuinely different workflow inside the track's spirit.

That framing is only half the story — the rest has to live in the mechanism, not just the domain. Four things make it un-fakeable as an agent:

- **A real per-circuit plan gates the pipeline instead of narrating it.** The Plan step reads noisy NOC free text plus the tag data and *decides* which of two optional stages this specific circuit needs — so a clean circuit and a messy one take visibly different paths through the same rail. That's the model choosing its own next actions from a menu, not a hardcoded checklist wearing a "Plan" label.
- **The reasoning rail structurally forces multi-step, multi-retrieval, tool-calling behavior** — the UI literally renders each real backend event, including skips, so a single retrieve-then-answer call *cannot* make the screen look right. The engineering has to be genuinely agentic.
- **The exclusion-clause beat now runs both ways on camera.** A second retrieval that fires only when the plan judged the case ambiguous — and, just as visibly, doesn't fire when it isn't. That symmetry is what proves the branching is data-driven, not staged for the demo.
- **Clause reconciliation goes beyond lookup.** When a store's amendment overrides the base tier table, Reclaim doesn't just retrieve a clause — it retrieves two documents that disagree, applies precedence, and cites both. That's closer to how a real contracts analyst reasons than a single-shot RAG answer, and it's the one beat where the agent surfaces something the analyst didn't think to ask about.

Versus the obvious approach ("summarize this contract" / "did we breach SLA?"), Reclaim decides its own investigation depth, branches both ways on real judgment calls, reconciles conflicting sources, verifies with tools, and lands on a filable artifact with a dollar figure and an audit trail — an outcome, not an answer.

---

## 6. How it works — architecture & agentic flow

**Frontend — three-pane mission control (Next.js).** Left: portfolio/case-queue feed. Center: the Glass-Box Reasoning Rail, cards driven by a live **Server-Sent Events** stream (one typed event per real backend action) — Plan, Retrieve #1, Calc, Retrieve #2 (or a dimmed "skipped — no ambiguous intervals" card), Cross-check (or its own skipped variant), Decision — each with a confidence badge and a citation chip. The Plan card renders the model's own rationale string (e.g. *"1 interval tagged maintenance, ticket notes silent on notice → exclusion review needed; no prior credits on file → billing cross-check skipped"*), so the planning step is legible, not just present. Right: the output credit memo, styled like something a revenue-assurance team would actually file. The live **exposure/recovery counter** with color states (calm → amber → green-on-approval), plus an **Approve / Override** control that requires a typed reason, so it reads as a real audit artifact, not a toy button.

**Backend — explicit staged orchestrator (FastAPI), with a real planner at its head.** Not a black-box agent framework: the stage *sequence* is fixed (plan → retrieve logs → compute uptime → retrieve tier → **[conditional] exclusion review** → recompute → **[conditional] billing cross-check** → check deadline → decide → assemble memo), but *which* of the two conditional stages actually execute is not hardcoded — it's the output of the Plan call, a structured Claude decision made per circuit from that circuit's tags, free-text NOC notes, and billing summary. That's the one design choice that turns "Plan" from a label into a load-bearing control-flow decision, without giving up the reliability of a bounded, enumerable pipeline — still no open-ended agent loop that could wander off-script live on stage. Each real action — including an explicit *skip* — emits an SSE event → the rail. State/memory: a datastore (SQLite/Postgres) holding the case queue plus a full **audit trace** — every retrieval, tool call, plan decision, branch taken or skipped, citation, confidence, and timestamp — which doubles as the compliance artifact.

**Reasoning model — Claude Opus 4.8 (`claude-opus-4-8`)** via the Anthropic API (1M-token context; adaptive thinking `thinking: {type: "adaptive"}`; effort via `output_config: {effort: "high"}`). Three distinct call types, each using the right primitive — plus one cost lever applied across all of them:
- **Investigation planning** — one structured call per circuit, `output_config.format` json-schema, over the case's interval tags + raw NOC free text + billing summary → `{needs_exclusion_review: bool, needs_billing_crosscheck: bool, rationale: string}`. This is the call that decides the circuit's path through the rest of the pipeline; it's cheap (small context — the cached MSA isn't even needed yet) and runs first so the rail can show it before anything else fires.
- **Structured extraction & per-interval verdicts** (`COUNTS` / `EXCLUDED` / `AMBIGUOUS→fetch-clause`, and the tier decision) via **strict tool use** (`strict: true`) or `output_config.format` json-schema → guaranteed-parseable output, no regex-scraping the model.
- **Grounded clause answers** via **native citations** (`citations: {enabled: true}` on the contract document block) → the response returns `cited_text` with exact `page_location` spans that *directly power the citation chips*. For the amendment-conflict case, this call runs twice against two document blocks (base MSA + amendment), and `clause_precedence_resolver` — deterministic, not model-decided — resolves which one controls. (Design note: citations and `output_config.format` can't be combined on one call, so the pipeline cleanly separates the *cited-grounding* calls from the *structured-decision* calls — a real constraint we designed around from the start, not one we discovered mid-build.)
- **Cost/latency control:** the big MSA + logs are **prompt-cached** (`cache_control: {type: "ephemeral"}`, ≥4096-token prefix on Opus 4.8) so the dozens of per-clause calls read from cache (~0.1× cost, verified via `usage.cache_read_input_tokens`) instead of re-paying for the contract every time; calls fan out with `asyncio.gather`. For high-volume per-interval verdicts, and for the planning call itself (small schema, doesn't need Opus-level reasoning), we can drop to Claude Sonnet 5 / Haiku 4.5 as a pure cost lever. This — plus the Plan call actively skipping stages a clean circuit doesn't need — is what makes the whole portfolio finish on screen in ~10 seconds.

**Retrieval — embedded Chroma + a local sentence-transformer** (e.g. all-MiniLM). Zero external retrieval dependency; the corpus is pre-ingested and pre-embedded at deploy, so nothing about retrieval can stall on venue wifi. For a subset of store groups the corpus also includes a signed amendment alongside the base MSA — the second document behind the conflicting-clause case — indexed and retrieved through the exact same path as the base contract, no special-cased plumbing.

**Deterministic tools (plain Python — the LLM never does arithmetic *or* adjudicates precedence):** `uptime_calculator` (intervals → downtime → uptime %), `credit_calculator` (uptime % + tier table + exclusions → $), `billing_crosscheck` (structured query over invoice history), `deadline_check` (date math against the contract's claim window), and `clause_precedence_resolver` (document type + effective date → which of two conflicting clauses controls, per standard "amendment supersedes base contract" contract law). Judges trust a calculator; they don't trust an LLM's mental math or its opinion on which contract wins — and neither do revenue teams. The model's job stays reading and citing; every decision with a rule behind it runs in Python.

**Confidence score is a named, published formula, not an LLM vibe:** `confidence = 0.4 × retrieval_match + 0.4 × ambiguity_resolution + 0.2 × billing_certainty`, each term 0–1. `retrieval_match` is the top clause chunk's normalized similarity score; `ambiguity_resolution` is 1.0 if an exclusion-clause check (when run) cleanly resolved the interval, 0.6 if it resolved with an inferred gap (e.g. the notice date is missing from the NOC log, so the agent applies the contract's stated default), and 0.0 if it stayed genuinely ambiguous after retrieval; `billing_certainty` is 1.0 when invoice history for the period is complete, 0.5 when it's partial. Worked example: a near-exact clause match (0.93) + a cleanly-resolved exclusion (1.0) + complete billing data (1.0) scores **0.97** and auto-queues as `Credit owed`; anything under **0.80** routes to `Needs review` with the weakest term named in the memo instead of being auto-filed. That published threshold, plus the memo's one-line "why this score," is what makes the number defensible under questioning instead of just displayed.

**Documents** — ingested via base64 `document` blocks / the Files API (`files-api-2025-04-14`), the same pathway whether it's the MSA, an amendment, invoices, or logs. **Hosting:** Docker on **Vultr Cloud Compute**.

---

## 7. Buildable-in-2-days plan

**Team (3):** a domain expert (telecom SLA subject-matter knowledge; owns the document corpus, including the one amendment used for the conflicting-clause case), a lead developer (backend orchestrator, agent/tool calls, Vultr deploy), and a designer (frontend rail, motion, the memo view). Each part of the plan below has a clear owner.

**Day 1 AM** — Domain expert hand-authors the document corpus (below), including one store group's amendment. Lead dev scaffolds the FastAPI staged orchestrator, Chroma ingest, and the five deterministic tools (including `clause_precedence_resolver`); ships a container to Vultr and load-tests it. Designer builds the three-pane shell, the rail-card component (including its dimmed "skipped" state), and the money counter.

**Day 1 PM** — Wire SSE end-to-end, including the Plan call gating the two conditional stages. Get **one circuit (clean breach)** running live through the full pipeline with real citation chips rendering from Claude's citation spans. First green-path deploy on Vultr.

**Day 2 AM** — Add the branch cases: exclusion review firing, exclusion review explicitly skipped, already-credited, deadline-expiring. Wire deterministic confidence scoring to the published formula. Approve/Override with typed reason. **Pre-render the citation-highlight image for every on-camera circuit**, so the money-shot chip plays instantly regardless of live span-mapping. Polish rail iconography + counter color states.

**Day 2 PM** — Build the conflicting-clause case *only if* Day 2 AM finished on schedule (first thing cut if behind — see hard scope cut, below). Lock the demo portfolio, rehearse, record the **golden-run trace** as an instant fallback, and shoot the 1-minute video (re-take until timing is clean).

**Real vs mocked (honest):**
- **Real:** the full multi-step pipeline including the planning call, real Claude calls (planning, extraction, per-clause judgment, cited grounding), real Chroma retrieval, real Python calculators, real native citations, real SSE-driven UI, real Vultr deployment.
- **Scoped/mocked:** the corpus is **hand-authored synthetic** (necessary — real SLA contracts are confidential, and generic synthetic data reads as fake to anyone who's seen one). On camera, **2–3 circuits are deep-run live** while the rest of the portfolio is shown pre-scored ("processed moments ago") to keep the cut tight. The citation-highlight image for on-camera circuits is **pre-rendered**, not computed live, so that one beat can't fail on stage.
- **Hard scope cut, in priority order:** (1) the conflicting-clause case is the first thing dropped if Day 2 runs long — the five-case core (`owed` / `needs review` / `excluded` / `already credited` / `deadline expiring`) stands on its own without it; (2) ONE contract template family, ONE tier structure, regardless. We generalize to more contracts/carriers **only after** the rehearsed run is bulletproof.

---

## 8. The 1-minute demo script (moment by moment)

- **0:00–0:07 — Hook.** Mission-control dashboard: ~40 store circuits imported from carrier invoices + NOC logs. Money counter at **$0**. Caption: *"Every enterprise overpays its carrier. Nobody has time to audit. Watch Reclaim do it."* Priya clicks **Run audit**.
- **0:07–0:25 — The loop, made visible — both branches, before we even zoom in.** Circuits stream through the Plan stage in the left-pane queue; a two-second montage shows some tagged **"skip — clean"** and others **"deep — review needed,"** proof the branch runs both ways before the demo commits to one. The camera settles on a flagged circuit and the rail fires: `Plan → Retrieve outage logs → Compute uptime 99.1% (SLA 99.9%) → Retrieve tier clause (10% credit)`. Counter starts climbing. A citation chip appears; one click snaps open the highlighted contract clause.
- **0:25–0:40 — The star beat (real second retrieval).** The interval the Plan flagged is tagged **"scheduled maintenance."** A DECISION card appears: *"Ambiguous — checking exclusion clause."* A **second retrieval fires**, the agent reads the exclusion, and decides the window **wasn't pre-notified per the 5-day rule → it counts.** Counter jumps. This is the "real agent, not retrieve-then-answer" proof.
- **0:40–0:52 — Judgment & care.** Cross-check billing catches a circuit **already credited → EXCLUDED**, no double-count. Another circuit's claim deadline is **3 days out → flagged red, "file now."** Counter settles at **$182,400**; the ranked memo queue fills.
- **0:52–1:00 — The outcome.** Priya opens the top memo — dollar amount, every line with a citation chip, and a confidence score of **0.97** with its one-line "why" (near-exact clause match, exclusion cleanly resolved, billing clean). She clicks **Approve**, types a reason; the **counter freezes green**. Caption: *"Reclaim found $182,400 — with a citation for every dollar."* Cut.

**If pacing allows on the final rehearsal (cut first if not):** a 4–5s insert between 0:40 and 0:52 on the conflicting-clause circuit, paid for by trimming ~5s off the 0:07–0:25 montage so the cut still lands at 60s — the MSA and an amendment both light up on the rail, a DECISION card reads *"Amendment supersedes base tier — 15% applies, not 10%,"* and both citations sit side by side in the memo. It's the one moment that says "the agent found something you didn't ask about" — upside, not load-bearing.

Legible in 60 seconds with almost no narration: the plan decides, the clock stops, the packet appears.

---

## 9. Impact & adoption

- **Real-world grounding.** Uptime SLAs with automatic credit obligations are standard in enterprise telecom MSAs; under-issuance and under-claiming are a well-documented revenue-assurance gap. This is quantifiable found money for a back-office function that both telcos and their enterprise customers actually staff.
- **Who benefits, both directions.** Enterprise TEM/procurement recovers real overpayments; carrier revenue-assurance teams proactively self-issue credits to cut disputes, churn, and regulatory risk. Same engine → two markets → a genuine long-term-adoption story, not a toy.
- **Failure modes handled by design:** hallucination → every claim carries a native citation to the exact clause, and a deterministic calculator does **all** arithmetic (the LLM never emits a dollar figure); double-counting → billing cross-check; over-claiming excluded downtime → judgment-triggered exclusion-clause retrieval; conflicting contract terms → deterministic precedence resolution, not a model guess; missed windows → deadline check; uncertainty → low-confidence cases route to human review against a published threshold.
- **Trust boundary = safety story = demo proof.** Reclaim is a **co-pilot, not an autopilot.** It terminates at a **human-reviewable memo**, never auto-files a claim; the analyst Approves/Overrides with a typed reason; the confidence score is always visible **and always explained** — every memo shows the three inputs behind its number, not just the number itself. That framing is simultaneously our ethics answer and the demo's best "this isn't hallucinating" beat — every dollar is checkable, not just assertable.

---

## 10. Risks & mitigations; stretch goals

**Risks & mitigations**
- **"Agent theater"** (animations that are secretly canned) — every rail card, including a skip, is driven by a *real* backend SSE event (an actual retrieval, an actual tool call, an actual decision not to act); it's un-fakeable and, conveniently, *less* work than choreographing a fake sequence.
- **"The branching looks staged"** (the sharpest skeptical-judge question) — pre-empted on camera, not just in this writeup: 0:07–0:25 explicitly shows the Plan stage routing one circuit deep and another shallow, so the exclusion check firing later isn't the only data point on screen — its *not* firing, on a different circuit, is shown too.
- **The citation-highlight chip is the single riskiest UI element** — the emotional peak of the demo and the fiddliest span-to-PDF mapping. Mitigated with a fallback specific to *that* feature, not just the general golden-run trace: the highlighted-clause view for every on-camera circuit is pre-rendered ahead of time, so "snap open the exact line" plays instantly regardless of how live span-mapping behaves that day.
- **Latency** (dozens of LLM calls turning a 60-second demo into a 3-minute wait) — prompt-cache the contract+logs, fan out with `asyncio.gather`, cap the on-camera deep-dive to 2–3 circuits (rest pre-scored). The Plan call itself also *removes* latency by skipping stages a clean circuit doesn't need. Portfolio finishes in ~10s.
- **Live API / wifi hiccup on stage** — retrieval is fully local (Chroma, no network); we keep a recorded **golden-run trace** to replay instantly; and we submit a **recorded video**, so we re-take until pacing is clean rather than betting on one live moment.
- **Scope creep** ("handle any contract, any carrier") — hard scope to one contract family + one tier table, backed by the domain expert's branch-engineered corpus; the conflicting-clause case is explicitly the first thing cut if Day 2 runs long (§7). Generalize only after the exact run is bulletproof.
- **Citations vs. structured-output incompatibility** — designed around from the start: cited-grounding calls and structured-decision calls are separate API calls.

**Stretch goals**
- **Vultr Serverless Inference** hosting an open model for the high-volume per-interval verdicts — deepens sponsor-stack usage and removes even the external-API dependency.
- **Outbound action capstone** — email/dispatch the *approved* memo packet to the carrier account manager or the internal AP queue: a literal "produces an outcome a team can act on."
- **Real-corpus ingestion** — drop in redacted real MSAs; multi-contract portfolio import; per-tier structure auto-detection.
- **Deeper reconciliation** — beyond one amendment vs. one base tier table, handle multi-amendment chains and *flag* (rather than silently resolve) genuinely contradictory clauses that need a human call.
