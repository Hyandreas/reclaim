# Judge 1 — Round 1 Review: "Taste — the design-system vibe check inside Cursor"

## TOTAL: 14.0 / 15

Novelty 4.5 · Implementation Plan 4.5 · Usefulness/Relevance 5.0

An exceptionally polished, technically literate, and honestly-scoped proposal. It reads the brief more completely than the brief's own examples do — covering both the visual *and* the interactive surface, demonstrating (not asserting) the designer/engineer alignment loop, and de-risking the demo with rare discipline. The remaining gaps are genuine but narrow: the headline classifier is lifted straight from a brief example (novelty ceiling), and two scripted UI beats fight VS Code's actual affordances (implementation soft spot). It is clearly excellent, and just short of the 14.5+ "no notable gaps" tier.

---

## NOVELTY — 4.5 / 5

Three distinct differentiators, one of them genuinely original. First, the **authorship-time inversion**: every obvious reading of this track (and all three brief examples) is *audit-time* — a CLI diffing on CI, a visual-regression tool flagging post-merge, a chat you visit. Taste intervenes inside the AI coding loop, on save, *before* drift reaches a diff. That is the most on-brand move for a Cursor-sponsored track ("we built a Cursor, pointed at your design tokens instead of your code") and a defensible durable wedge as codegen spreads. Second, the **promote-to-system** move — detecting an emergent convention (a 12px step recurring across three components, none reverted) and drafting a *new token* back to the source of truth — is the single sharpest answer to the track's actual question ("does the system have enough taste to know when something is wrong"), because it shows taste knowing when the *rule itself* is stale, not just when code breaks a rule. "A rule engine enforces; taste knows when the rule is stale" is the thesis, and it lands. Third, first-class coverage of the **interactive surface** (motion/transition durations, focus/hover/disabled colors) directly answers the half of the track statement most competitors will skip.

What caps it at 4.5: the load-bearing three-way classification — *accidental regression vs intentional redesign vs platform constraint* — is drawn almost verbatim from one of the brief's own examples. So the classification engine itself is expected; the originality lives in the placement (inline, at authorship), the reverse loop, and the surface breadth. Those are real insights, but the core mechanism is a given, which keeps this off a 5.

## IMPLEMENTATION PLAN — 4.5 / 5

The strongest axis, and near-exemplary. The architecture is concrete and technically sound, and — notably — the Anthropic API usage is accurate against the *current* surface, which is a strong credibility signal:

- Model `claude-opus-4-8` via `@anthropic-ai/sdk` — correct.
- Prompt caching via `cache_control: {type: "ephemeral"}`, with a cached prefix (full token library + brand doc + rules + ~12 exemplars) comfortably above Opus 4.8's 4096-token caching minimum, so caching will actually engage; the ~0.1x cache-read economics are right for a per-save loop.
- Structured output via `output_config: {format: {type: "json_schema", schema}}` with `additionalProperties: false` — correct, and pointedly *not* the deprecated `output_format`.
- `thinking: {type: "adaptive"}` — the correct adaptive-thinking config for Opus 4.8.
- Fast mode with the exact `fast-mode-2026-02-01` beta flag and top-level `speed: "fast"` — correct.
- High-res vision at 2576px long edge with 1:1 pixel coordinates — correct.

The agentic loop (plan → retrieve → decide → act → remember) has the right factoring for a live demo: **the deterministic layer owns detection, evidence, and the confidence arithmetic; the LLM owns only classification, explanation, and bounded confidence calibration.** Because detection is code (`onDidSaveTextDocument` + `createDiagnosticCollection` + `@babel/parser`/`postcss`), the underline always appears on camera regardless of model latency — this is the demo-reliability decision most teams miss. Confidence being computed from on-screen evidence fields (with the model adjusting only within a bounded range) defuses the "fabricated percentage" objection. De-risking is genuinely best-in-class: a disclosed seeded repo, a **pre-seeded dated drift ledger** so the promote threshold trips honestly, 4 curated cases mapped to the 4 verdicts, a fixed/rehearsed Cursor-agent prompt with a typed-keystroke fallback, and a 2-second latency threshold falling back to a pre-computed verdict. Real / scoped-but-bounded / explicitly-cut is delineated in a table, with the fragile async pieces (Background-Agent PR, vision path) demoted to pre-verified bonus cuts. Day-1/Day-2 milestones are realistic and the 60-second script is timestamped.

Why not 5.0: two scripted UI beats are optimistic about VS Code's actual affordances. (1) The script (0:18–0:32) says the verdict card **"streams in"** on **hover**, but `HoverProvider.provideHover` resolves *once* — VS Code hovers do not re-render as a stream arrives, so token-by-token streaming into a displayed hover is not a native capability. The partial-JSON parser is real and correct, but the streaming target (a hover) is wrong; this beat would need a webview/side panel to actually stream, or a resolve-once fallback. (2) The **"top-right System Health badge"** is not a native editor affordance either — status bar (bottom) or a webview overlay is the real home. Neither breaks the core demo (the cached verdict resolves fast; the badge can live in a webview), but they are concrete described-vs-platform mismatches on the marquee visuals, which is exactly what separates 4.5 from 5.0. The sheer part-count for 2 days is also ambitious, though each piece is individually sound.

## USEFULNESS / RELEVANCE — 5.0 / 5

Dead-on the track statement, and arguably more complete than the statement's own examples. Mapping phrase-by-phrase: "reasons about consistency" — the verdict is a judgment, not boolean matching ✔; "visual **and interactive** surface" — genuinely both, with motion/focus/hover/disabled as first-class detector targets and an on-camera interactive-regression beat (0:32–0:40), which most competitors will drop ✔; "detecting drift" — deterministic detector ✔; "proposing reconciliation" — one-click fix plus the promote-to-tokens diff ✔; "keeping designers and engineers aligned without a synchronization meeting" — the promote loop with an inline "Approve" *demonstrates* alignment rather than claiming it ✔; "enough TASTE to know when something is wrong" — the redesign stand-down and the iOS safe-area platform-constraint case prove the system knows when *not* to fire (the thing that separates taste from linting), and promote proves it knows when the rule is stale ✔.

The value proposition is compelling and precise: automate the expensive human *judgment* ("bug vs redesign vs platform quirk"), not the cheap diffing, and move it left to authorship. The real-world grounding is accurate and fluent (Figma Variables / Tokens Studio → W3C Design Tokens → Style Dictionary → CSS/Tailwind → visual-regression → a human triaging in a Slack thread), the Priya persona (design engineer, human bottleneck across four squads) is concrete and credible, and the "problem compounds as AI codegen spreads" impact framing is coherent. The "just an IDE linter" risk is anticipated and rebutted on its merits (visible `tokens.json` as source of truth + the design-loop closure + the grounded three-way judgment none of the named prior art produces). Scoping the demo to a committed `tokens.json` (a real W3C Design Tokens export) with live Figma sync as a disclosed pre-verified stretch is a reasonable, honest choice, not a value deficiency. This is as on-statement and as clearly valuable as the axis asks for.

---

## CONCRETE STRENGTHS

- **Authorship-time inversion** — the sharpest reading of the brief and the most on-brand move for a Cursor track.
- **Promote-to-system reverse loop** — the single most original element and the sharpest expression of "taste" in the track: the system proposing a new token because the rule is stale, gated by an explicit, deterministic heuristic (≥3 distinct components in a rolling 7-day window, none reverted, not already rejected).
- **Deterministic detection vs LLM classification split** — the underline is guaranteed by code; the model only does the curated explanation. This is what keeps it from being flaky on the fifth take.
- **Both surfaces covered** — visual *and* interactive drift, with an interactive-regression beat on camera; directly answers the half of the statement most teams miss.
- **Grounded, anti-hallucination verdicts** — every number (WCAG contrast, 8pt-grid delta, motion-scale delta, cross-file recurrence, token lineage) is computed, and confidence itself is derived from those fields, not invented.
- **Accurate, current API usage** — VS Code extension APIs and Anthropic features (prompt caching above the model's minimum, 1M context for zero-RAG grounding, structured outputs via `output_config`, adaptive thinking, the exact fast-mode beta flag, high-res vision specs) are named correctly and used for the right reasons.
- **Best-in-class, disclosed de-risking** — seeded repo, pre-seeded dated ledger, four curated cases, rehearsed agent prompt with typed-keystroke fallback, latency-threshold cached fallback; fragile async pieces demoted to bonus cuts.
- **Restraint proven on camera** — the redesign stand-down and the iOS safe-area case demonstrate precision (knowing when *not* to fire), the hardest and most convincing part of "taste."
- **A tight, silent-legible 60-second narrative** (harmony → drift across two surfaces → restraint → diagnosis-and-cure → design-loop closure → harmony restored).

## CONCRETE WEAKNESSES / GAPS

- **Novelty ceiling from the brief.** The regression/redesign/platform classification is lifted almost verbatim from a brief example, so the concept's originality rests on the inversion, the promote loop, and the surface breadth rather than the core mechanism.
- **Hover-streaming fights the VS Code API.** `provideHover` resolves once; "verdict card streams in" on hover is not a native capability. The partial-JSON parser is fine, but the streaming *target* is wrong — it needs a webview/side panel, or the beat should be downgraded to resolve-once.
- **The "top-right System Health badge" placement is not a native affordance.** It needs a webview overlay or a status-bar item; the doc asserts an editor location VS Code doesn't hand you for free.
- **The Cursor Background Agent stretch is named but not pinned.** "Cursor Background Agent SDK" without a concrete invocation point makes the "pre-verified bonus" slightly aspirational.
- **Design side is a committed file in the demo,** not a live Figma/Tokens Studio pull — well-defended and disclosed, but it leaves a sliver of the "is this a design system or a reviewer of one?" critique open in the demoed form.

## PRIORITIZED FIXES (to raise the score)

1. **(Implementation → 5.0) Fix the streaming target.** Move the streamed verdict to a **webview or side panel** where token-by-token rendering is native, or explicitly state the hover **resolves once** with the cached verdict and drop "streams in" from the script. Do the same for the health badge — specify the real render mechanism (status-bar item vs webview overlay vs editor decoration). Closing these two affordance mismatches removes the only genuine technical friction and takes implementation to 5.
2. **(Novelty → 5.0) Lead with the promote loop and add one reasoning move the classifier alone can't do.** Reframe the pitch so the emergent-token discovery is the headline (it's your most original element; the three-way verdict is the brief's example). Then add a move that only an evidence+LLM system produces — e.g., inferring a *semantic name/intent* for the promoted token (`--space-3` chosen because…), or clustering same-session drift into a single "redesign in progress" narrative instead of per-file verdicts. That pushes past the example directions and lifts novelty toward 5.
3. **(Polish) Pin the Cursor Background Agent invocation** — name the concrete entry point / API call for the stretch PR beat so "pre-verified bonus" is credible rather than aspirational.
4. **(Polish) Show one live design-side beat** — even a single canned Tokens Studio / Figma refresh, or visibly writing the promoted token back into the *exported* `tokens.json` so the round-trip completes on screen — to fully close the "design system, not linter" framing in the demoed form.
5. **(Polish) Surface team-scale value** — a static per-squad drift-feed / promote-candidate panel would make the "40-person, four-squad" impact legible on screen rather than argued, reinforcing why authorship-time beats a dashboard nobody opens.
