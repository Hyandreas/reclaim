# Judge 1 — Round 1 Review: Reclaim (SLA credit-recovery agent)

## TOTAL: 13.5 / 15

- Novelty: **4 / 5**
- Implementation Plan: **4.5 / 5**
- Usefulness / Relevance: **5 / 5**

This is one of the more technically credible and honestly-scoped proposals I could imagine for this track. It is excellent on relevance and implementation, and solidly above-average on novelty. It is held out of the 14.5–15 band by a genuinely thin "planning" leg (the pipeline is a fixed staged orchestrator), by execution risk concentrated in its own signature demo moment, and by an under-specified confidence formula. All are fixable.

---

## Novelty — 4 / 5

The concept is clearly above "solid but expected," short of "strikingly original." What earns the score: (1) the deliberate, well-argued *zag* away from the track's obvious telecom example (real-time repair dispatch) toward the unglamorous, unwatched back-office moment — after-the-fact SLA credit recovery — which is a genuinely different workflow inside the track's spirit; (2) a real insight in mapping the brief's hardest requirement ("retrieve more than once when it needs to") onto an authentic *business* judgment call — the exclusion clause — so the second retrieval is triggered by ambiguity rather than scripted; and (3) a memorable demo hook ("$182,400 in unclaimed credits, with a citation for every dollar"). The "reasoning rail renders only real backend events, so it can't be faked" is a sharp anti-agent-theater argument.

What keeps it from 4.5–5: at its core this is a recognizable assembly — grounded RAG over a contract + deterministic calculators + a reasoning-step sidebar + native citations. None of those techniques is new, and the streaming "reasoning rail" is an increasingly common agent-UI trope. The originality is in domain framing and demo craft, not in mechanism. A more surprising core (e.g., the agent negotiating/reconciling *conflicting* clauses across two documents, or discovering an unclaimed-credit *pattern* the analyst didn't ask about) would push this higher.

## Implementation Plan — 4.5 / 5

This is the proposal's strongest engineering signal and it is unusually concrete. The stack is fully specified and coherent (Next.js + SSE front end, FastAPI staged orchestrator, embedded Chroma + all-MiniLM for zero-network retrieval, SQLite/Postgres audit trace, Docker on Vultr Cloud Compute). The four deterministic tools (uptime, credit, billing cross-check, deadline) are the right call — "the LLM never does arithmetic" is exactly what a revenue team and a judge will trust. The Anthropic API details are accurate and current: prompt caching with `cache_control: ephemeral` and a ≥4096-token prefix verified via `usage.cache_read_input_tokens`, `asyncio.gather` fan-out, strict tool use / `output_config.format` for parseable decisions, and native `citations` returning `cited_text` + `page_location` to drive the chips. Critically, they surface a real constraint — citations can't be combined with structured-output format on one call — and cleanly separate cited-grounding calls from structured-decision calls. That level of API awareness is a strong credibility marker. The real-vs-mocked split is honest (synthetic corpus justified by contract confidentiality; 2–3 circuits deep-run live, the rest pre-scored), risks are enumerated with concrete mitigations (golden-run trace, recorded video, hard scope cut), the Vultr track tech is honored prominently on day 1 (deployed + load-tested) with a Serverless Inference stretch, and the day-by-day plan has realistic milestones.

Why 4.5 and not 5: the feature surface is ambitious for ~2 days even with the scoping, and the riskiest single piece is the *demo's own signature* — the citation chip that "snaps open the exact highlighted line in the source PDF." Rendering `page_location` spans onto a PDF viewer accurately is fiddly UI work; if it slips, the money-shot beat degrades to a plain quote. Second, the orchestration is a hardcoded pipeline; the agentic substance lives *inside* stages, which is a defensible reliability choice but means the "Plan" step (item 1 of the flow) is the least real of the four brief-mandated behaviors. Tightening those two would justify a 5.

## Usefulness / Relevance — 5 / 5

Dead-on the track statement and clearly valuable. It is in an approved vertical (telecom), it grounds every decision in three real document types (MSA, NOC logs, invoices), and it demonstrably satisfies every agentic keyword the brief lists — PLAN per circuit, RETRIEVE more than once (the judgment-triggered exclusion retrieval), call TOOLS (four deterministic ones), make DECISIONS (five-way classification with branching), and produce an OUTCOME a team files Monday (a ranked queue of human-approvable, cited credit memos). SLA credit under-issuance/under-claiming is a genuine, well-documented revenue-assurance gap staffed by real teams (TEM/procurement on the buy side, revenue assurance on the sell side), so the "found money" is quantifiable rather than notional. The dual-market framing (same engine, both directions) is a real adoption story. The co-pilot-not-autopilot boundary — terminate at a reviewable memo, human Approve/Override with a typed reason, always-visible confidence — is exactly the trust posture this finance-adjacent workflow needs, and it doubles as the ethics answer and the "not hallucinating" demo proof. This axis is genuinely excellent.

---

## Strengths (concrete)

- **Satisfies the "true agent" bar structurally, not by assertion.** The exclusion-clause second retrieval is triggered *by the agent judging the first result ambiguous*, and the rail only renders real backend events — so the multi-retrieval / tool-calling behavior is un-fakeable, which is precisely what the brief is testing.
- **Arithmetic is fully deterministic.** Four Python calculators own every dollar; the LLM never emits a figure. This is the right trust architecture and pre-empts the obvious "did it hallucinate the number?" attack.
- **API depth is real and current.** Prompt caching economics, citations vs. structured-output incompatibility, strict tool use, adaptive thinking — these are accurate and show the team knows the platform, which de-risks the build.
- **Honest, disciplined scoping.** Explicit real-vs-mocked table, one-contract-family hard cut, golden-run fallback, recorded video with re-takes. This is exactly how a 2-day demo survives contact with a stage.
- **Vultr is front-and-center on day 1**, not a day-2 afterthought — the right instinct for a sponsor track.
- **The outcome is an artifact, not an answer.** A filable, cited, confidence-scored credit memo in a ranked queue is a concrete deliverable a real team acts on.

## Weaknesses / Gaps (concrete)

- **"Planning" is the weakest of the four agentic legs.** Stage order is hardcoded; step 1 ("Plans the investigation") risks reading as cosmetic. A judge probing "what does the agent actually *plan*?" needs a crisp answer beyond "it runs the fixed pipeline."
- **The signature UI carries the most execution risk.** The PDF-span highlight chip is both the hardest front-end piece and the emotional peak of the demo. No stated fallback for *that specific feature* if the span-to-highlight mapping misbehaves live.
- **Confidence score is asserted as deterministic but never defined.** "Retrieval match strength + residual ambiguity + billing-crosscheck certainty" — how these combine into one number, and where the human-review threshold sits, is unspecified. A visible-but-arbitrary score invites a judge to poke it.
- **Multi-retrieval is guaranteed by corpus design.** Because the demo circuits are "branch-engineered," the impressive second retrieval always fires on cue. Fine for a demo, but a skeptic will note the agency is staged; worth pre-empting.
- **Novelty rests on framing more than mechanism.** The core pattern is familiar; nothing in the technique itself is surprising.

## Prioritized Fixes (to raise the score)

1. **Make "Plan" genuinely agentic and demo-visible (biggest lever, hits Novelty + Implementation).** Have the agent produce a real per-circuit plan the rail renders — e.g., it inspects the case and *decides* which tools/retrievals this circuit needs (skip exclusion check if no ambiguous intervals; skip billing cross-check if invoice history is clean), and *chooses* investigation depth. Even a lightweight "the model selects the next action from a tool menu" loop for one branch converts the weakest leg into a strength and blunts the "it's just a fixed pipeline" critique.
2. **Add a dedicated fallback for the citation-highlight beat.** Pre-render the highlighted-clause image for the 2–3 on-camera circuits so the "snap open the exact line" moment is bulletproof even if live span-mapping fails. Protect your money shot specifically, not just the run in general.
3. **Define the confidence formula concretely.** Publish the exact inputs, weights, and the auto-file-vs-review threshold (even a simple weighted rule), and show one worked example in the memo. This turns a soft spot into a defensible trust feature.
4. **Pre-empt the "staged agency" critique on camera.** Include at least one circuit where the agent *declines* a second retrieval (unambiguous intervals → no exclusion fetch) so the rail visibly shows the judgment call going *both* ways — proof the branching is data-driven, not scripted.
5. **Raise novelty with one surprising beat (optional, for 5s).** Show the agent reconciling two *conflicting* clauses (e.g., a tier table vs. an amendment) or surfacing an unclaimed-credit pattern the analyst never asked to check — a "the agent noticed something I'd have missed" moment that goes beyond assembly.
6. **Name the team roles/coverage explicitly.** The plan references a domain expert, lead dev, and designer; stating this staffing up front reinforces that the ambitious surface is achievable in the window.
