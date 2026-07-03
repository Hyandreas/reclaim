# Judge 2 — Round 1 Review: Driftline

## Total: 12.5 / 15

Driftline is a semantic diff engine that treats Figma design tokens and a real codebase as two branches of one truth, runs a deterministic detection layer, then classifies every discrepancy into a closed four-verdict taxonomy (Accidental Regression / Intentional Redesign / Platform Constraint / Orphaned Token) and drafts a byte-grounded fix. It is exposed both as a dashboard and as an MCP server that Cursor calls natively. This is a polished, disciplined, well-de-risked proposal that lands squarely on the track statement. Its ceiling is capped mainly because the headline taxonomy is drawn straight from the brief's own example direction, and because a couple of load-bearing pieces (the scanner's literal-to-token resolution, and the deterministic signals that feed the "taste" classifier) are asserted rather than specified.

---

## Novelty — 3.5 / 5

The core concept is a strong, thoughtful execution of an example the brief hands the team: the track statement explicitly names a tool that "classifies diffs as intentional redesign vs accidental regression vs platform constraint and drafts fixes." Driftline's four-verdict taxonomy is almost a verbatim instantiation of that sentence, applied to token-vs-code diffing (example direction #1) rather than screenshot visual regression. So at the concept level this is "solid but somewhat expected," not "strikingly original."

What lifts it above a flat 3 is genuine insight in the *architecture*, not the pitch. The deterministic-detection / LLM-reasoning split — CIELAB ΔE, numeric thresholds and WCAG math compute the delta as a fact so "the model never invents a delta" — is a real and memorable idea for making "taste" testable and demo-safe. The fix generator constrained to the scanner's verified byte range, emitting a unified diff applied by their own code, so "a hallucinated patch is structurally impossible, not merely unlikely," is the single most original and quotable claim in the document. The closed taxonomy ("bounded and testable, not open-ended vibes"), reasoning-before-verdict, and showing raw values next to the verdict so it is "checkable, not asserted" are all tasteful touches. These are insights about *how* to build a trustworthy taste engine, layered on top of a direction the brief provided — which is exactly what a 3.5 looks like. To reach 4+, the team needs one idea the brief did not hand them (see fixes).

## Implementation Plan — 4.5 / 5

This is the strongest axis and one of the more buildable plans I could imagine for this track. The stack is concrete and appropriate end-to-end (TypeScript, Vite/React/Tailwind, PostCSS + ts-morph/Babel AST for `file:line:col` grounding, `culori` for ΔE/WCAG, `better-sqlite3`, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`). I verified the Anthropic API specifics against current reference and they are correct, not hand-wavy: `claude-opus-4-8` is a real current model; `thinking: { type: "adaptive" }` is the correct adaptive-thinking form; structured outputs via `output_config.format` with a `json_schema` is the canonical field (they avoided the deprecated top-level `output_format`); and `strict: true` on the tool definition is real and correctly placed. Confining the LLM to just two steps (classify + fix-copy) with schema-valid structured outputs is a sound, minimal-surface design.

The de-risking is exemplary: six explicit, individually callable tools; a Day-1 deterministic core that is a demoable fallback on its own; a seeded offline repo with real git history and planted bugs; pinned classification/fix outputs as a verified fallback; a cached Figma snapshot behind an env flag; and an honest §7 scope line naming exactly what is real (detection, diff, classify, fix, apply, audit) vs. mocked/deferred (live Figma API, multi-framework, multi-repo, auth). Honoring the track via an MCP server that reuses the same six tools is concrete and not bolted on.

Two things keep this off a 5. First, the scanner is treated as more settled than it is: mapping a hardcoded `#1e40af`, or a Tailwind arbitrary value like `bg-[#1e40af]`, back to "a matching token exists" requires resolving the Tailwind theme and the semantic-role graph — this is central to the whole product and is more than the afternoon the milestones imply. Second, the deterministic signals that feed the *taste* verdicts (the "38/40 usages → migration" ratio threshold, the `ios/` folder-path heuristic, git-blame recency, "an accompanying token change exists") are asserted but never specified, even though they are the crux of the classification claim and the demo's credibility beat.

## Usefulness / Relevance — 4.5 / 5

This is about as on-statement as a submission can be: it detects drift, proposes reconciliation, classifies with taste, and pitches itself as the "shared referee" that keeps designers and engineers aligned "without a sync meeting" — and it honors Cursor directly. The buyer is precisely drawn (a platform/design-systems engineer at a 50–1,000-person org who owns the token pipeline), and the value framing is unusually sharp: WCAG/ADA legal exposure converts "aesthetics" into budgeted risk mitigation, the "CI gate, not a workflow change" adoption story is the most "would ship Monday" reading of the brief, and the false-positive-fatigue handling (confidence bands, Dismiss-with-reason that suppresses future noise) plus an audit trail show real product maturity. The close-out metric ("14 inconsistencies surfaced, 3 auto-fixed, 1 promoted, ~40 minutes saved — on one PR") is exactly what a judge wants.

Two modest gaps hold it below 5. The brief asks about consistency across the "visual and interactive surface," but Driftline is purely a static token/style consistency tool — colors, spacing, radii, type scale. Interaction states, focus/hover, motion, and component-variant behavior are untouched. And while the pitch leans on aligning *both* roles, the demonstrated product is entirely engineer/CI/Cursor-facing; designers are passive beneficiaries with no surface of their own, and the live Figma loop is deferred to a cached snapshot (which goes stale the moment a designer edits Figma). The designer half of "keep designers and engineers aligned" is asserted more than shown.

---

## Concrete Strengths

- **Deterministic spine + LLM reasoning split.** Detection is pure code (ΔE, WCAG math, AST byte spans); the LLM only classifies and writes fix-copy. Makes "taste" testable, the demo reproducible, and guarantees the model never fabricates a delta.
- **Structurally-impossible hallucination framing.** The fix generator is bounded to the scanner's verified byte range and applied as a unified diff by their code, not the model — a genuinely strong, memorable trust argument.
- **Closed taxonomy.** Four bounded verdicts make the "taste" output enumerable and testable instead of open-ended, and map cleanly to the track's own examples.
- **Correct, current Anthropic API usage** (verified): `claude-opus-4-8`, adaptive thinking, `output_config.format` structured outputs, `strict: true` tool schemas — all accurate, which materially de-risks the two LLM calls.
- **Exceptional demo de-risking.** Day-1 deterministic fallback, seeded repo with real git history, planted bugs, pinned outputs, cached Figma snapshot — a plan explicitly engineered to be "reproducible to the second."
- **Honors the track concretely.** MCP server reusing the same six tools; "why is this button off-brand?" answered in-editor in Cursor.
- **Real-user grounding.** Precise buyer, WCAG/ADA risk framing, false-positive-fatigue mitigations, audit trail, and a judge-friendly close-out metric.
- **Tasteful UI stance.** Real rendered component (not a swatch), reasoning-before-verdict, raw values next to the verdict, confidence bands (no fake decimal precision), blast-radius chip.

## Concrete Weaknesses / Gaps

- **Novelty is capped by the brief.** The four-verdict taxonomy is lifted almost verbatim from the track's example #2; the originality is in execution, not concept.
- **"Interactive surface" is untouched.** This is a static token/style tool only — no interaction states, focus/hover, motion, or variant behavior — a real gap against "visual AND interactive surface."
- **Designer side of the loop is thin.** The demo is entirely engineer/CI/Cursor-facing; "keeping designers and engineers aligned" is asserted, with no designer-facing surface or moment.
- **Scanner complexity underestimated.** Resolving a hardcoded hex or a Tailwind arbitrary value back to a candidate token requires resolving the Tailwind theme and semantic-role graph — central, fiddly, and more than the milestones imply.
- **Taste signals are unspecified.** The deterministic inputs that drive Intentional Redesign / Platform Constraint (migration-ratio threshold, `ios/` path heuristic, git-blame, "accompanying token change") are named but not defined, even though they are the heart of the "not a hardcoded string" credibility claim.
- **Live Figma sync deferred.** The cached-snapshot source of truth goes stale on any Figma edit, weakening the designer-alignment story in practice.

## Prioritized Fixes (to raise the score)

1. **Add one insight the brief didn't hand you (Novelty).** e.g. a drift-*velocity* signal ("this token drifted in 3 of the last 5 PRs → systemic; escalate or enforce"), *bidirectional* reconciliation (when code is the intentional source of truth, propose the Figma/token change rather than always fixing code), or auto-deriving a new semantic token when N components share the same off-token value. Any one gives Driftline a point of view beyond the example direction.
2. **Specify (and engineer) the deterministic signals feeding the classifier (Implementation + Novelty).** State the migration-ratio threshold, the folder-path/HIG heuristic, git-blame recency, and the "same-PR token change" check; mark which are computed facts vs. LLM inference; and engineer the seeded repo's git history so these signals are genuinely present. This directly answers the "judges assume the verdict is hardcoded" risk you already raised.
3. **Add a concrete designer-facing beat (Usefulness).** A lightweight designer view of the same verdict feed, or a "Promote to token" action that writes back a shareable proposed token/Figma change, so both roles visibly appear in the loop instead of only the engineer.
4. **De-risk the scanner on Day 1 (Implementation).** Prove Tailwind-arbitrary-value + inline-style → candidate-token resolution on two real cases early, and state the fallback if theme resolution is incomplete (e.g. flag only exact hex literals, defer arbitrary-value classes) so the spine can't sink the demo.
5. **Gesture at the interactive surface (Usefulness).** Include one finding on an interactive token — a focus-ring or disabled-state color failing contrast — so the demo touches "visual and interactive," not just static color/spacing.
6. **Name how the live Figma loop closes (Usefulness).** Even as an explicit stretch: a webhook/nightly re-snapshot that keeps the token source of truth fresh, so the cached snapshot doesn't read as the ceiling.
