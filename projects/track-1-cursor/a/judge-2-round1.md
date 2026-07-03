# Judge 2 — Round 1 Review: "Taste — the design-system vibe check inside Cursor"

## TOTAL: 13.5 / 15

A strong, unusually well-researched proposal that reads as excellent on all three axes with only a few concrete, fixable gaps. It lands the sharpest reading of the track brief (move the judgment call *left*, to authorship time) and backs it with a technically accurate, genuinely buildable plan. It falls short of the 14.5–15 band because of a visible demo-script inconsistency, one under-stated honesty gap in the demo dependencies, and coverage of the track's "interactive surface / cross-surface consistency" that is thinner than the pure visual-token drift story.

---

## NOVELTY — 4.5 / 5

The central insight is real and well-articulated: every obvious approach (and every one of the track's own example directions) audits drift *after the fact* — a CLI on CI, a visual-regression tool post-merge. Taste inverts this to intercept drift **at the moment of authorship, inside the tool (Cursor) that is causing it**. Framing it as "we built a Cursor, pointed at your design tokens instead of your code" is a crisp, on-brand articulation for a Cursor-sponsored track, and "vibe coding needs a vibe check" is a memorable pitch line.

The single strongest novel beat is the **promote-to-system loop**: Taste sometimes says the *opposite* of a linter — "this 12px step appears in 3 new components this week; propose promoting it as `--space-3`." "A rule engine enforces; taste knows when the rule is stale" is the sharpest expression of the "taste" the prompt explicitly asks for, and it closes the loop back toward design rather than just code. That is a genuine insight, not a repackaging of the examples.

What holds it back from a 5: the three-way verdict taxonomy (accidental regression / intentional redesign / platform constraint) is lifted almost verbatim from the track's own example direction, so that classification is expected rather than original. And the substrate — an IDE linter that flags hardcoded hex / off-grid spacing and offers a token fix — is a known category (stylelint/ESLint design-token rules exist). The novelty is the *combination* (authorship-time + LLM taste-judgment + promote loop), which is a strong evolution of a familiar category rather than a wholly new paradigm.

## IMPLEMENTATION PLAN — 4.5 / 5

This is the standout axis. The architecture is concrete and the separation of concerns is exactly right for a demo judged 50% on "does it actually work": a **deterministic detector** (regex + `@babel/parser`/`postcss` AST) owns detection and is guaranteed by code, so the underline always fires on camera; the LLM owns *only* classification + explanation. That means the wow-moment never depends on the model behaving, and the model's job is a prompting/curation problem — correctly identified as fitting a 2-day timebox.

I verified the Anthropic API claims against the current API reference, and they are accurate and *current* (not stale), which is rare:
- `claude-opus-4-8` — correct current model ID.
- 1M-token context window to inline the whole token library + brand doc + exemplars with zero RAG — correct capability.
- Prompt caching via `cache_control: {type: "ephemeral"}`, with the reasoning that repeat classifications become `cache_read` at ~0.1x cost — correct syntax and correct economics; genuinely the right lever for a per-save live loop.
- Structured outputs via `output_config: {format: {type: "json_schema", schema}}` + `additionalProperties: false` — correct, and notably they used the *current* parameter, not the deprecated `output_format`.
- `thinking: {type: "adaptive"}` — correct for Opus 4.8 (the deprecated `budget_tokens` form would have 400'd).
- Fast mode `speed:"fast"` + beta `fast-mode-2026-02-01` — correct, and correctly scoped to Opus 4.8 as the fast-capable tier.
- Vision at 2576px long edge with 1:1 pixel coordinates — correct high-res-vision spec.

The VS Code/Cursor extension hooks (`onDidSaveTextDocument`, `createDiagnosticCollection`, `registerHoverProvider`, `registerCodeActionsProvider`) are all real and correctly matched to their roles. The mandated technology (Cursor) is honored as the *product surface*, not bolted on. Day-1/Day-2 milestones are realistic, real-vs-mocked is clearly delineated, and stretch goals (Background-Agent PR, Playwright/pixelmatch/vision) are explicitly cordoned off as non-load-bearing.

Why not a 5 — small but real gaps, mostly in the demo:
1. **Numeric inconsistency in the demo script.** At 0:08 Cursor's agent writes `padding: 13px`; at 0:45 the promote verdict is about a "12px step [that] appears in 3 new components." 13 ≠ 12. If the flagged padding is 13px, the promote should be about 13px (or the fix should snap to 12); if the intended emergent pattern is 12px, the seeded code should say 12px. As written this reads as a visible glitch on the exact beat billed as "the punchline."
2. **The promote punchline depends on pre-seeded ledger state.** "Appeared in 3 new components this week" requires the drift ledger to already contain those prior occurrences in a fresh demo repo. The plan implies the ledger surfaces this organically but never states in the honest-scope section that the ledger is pre-seeded — that belongs in "real vs mocked."
3. The `confidence: 0.94` figure is an LLM self-reported number and is uncalibrated; fine as demo dressing but slightly oversold as evidence.

## USEFULNESS / RELEVANCE — 4.5 / 5

Squarely on the core of the track statement. Detecting drift: yes. Proposing reconciliation: yes (one-click fix + promote-to-system diff). Keeping designers and engineers aligned without a sync meeting: yes, and this is handled explicitly — `tokens.json` (W3C Design Tokens, as exported by Tokens Studio from Figma) is the visible shared source of truth, and the promote move drafts a real diff to it for the designer to approve. Enough taste to know when something is wrong: yes — the three-way verdict, plus the iOS safe-area case that proves the system knows when *not* to fire, plus the promote case that proves it knows when the *rule* is stale.

The target user (Priya, a design engineer owning one shared library touched by four squads) is realistic and specific, and the industry grounding (Figma Variables/Tokens Studio → W3C tokens → Style Dictionary → CSS → components → visual regression → a human triaging bug-vs-redesign; Airbnb DLS / Polaris / Atlassian staffing exactly that judgment step) is credible. The "AI codegen makes this compound, not shrink" durability argument is sound.

Why not a 5: the track asks for a system that "reasons about consistency across a product's **visual and interactive** surface." Taste reasons almost entirely about **visual/static token drift in a single changed file** (color, spacing, radii, shadows, font-size). The *interactive* surface — interaction states, motion, behavioral consistency — is essentially untouched, and truly holistic cross-surface reasoning is thin, riding entirely on the ledger's "3 components this week" signal rather than any product-wide model. The proposal also has to spend real effort rebutting the "it's just an IDE linter" critique; the rebuttal is good (tokens.json central, promote loop closes to design), but the residual narrowness is what separates this from a dead-on 5.

---

## Concrete STRENGTHS
- **The sharpest reading of the brief**: authorship-time interception is a genuine inversion of every example direction, and it is defensible (the problem compounds as AI codegen spreads).
- **The promote-to-system loop** is the single best "taste" beat in the concept and is the thing that makes it a design-system tool rather than a linter.
- **Deterministic-detection / LLM-judgment split** is the correct architecture for a reliable on-camera demo — detection can't flake, and the model does only the part that's a prompting problem.
- **API claims are accurate and current** (prompt caching, structured outputs, adaptive thinking, fast mode, 1M context, high-res vision) — signals a team that actually knows the stack.
- **Honest, well-scoped 2-day plan** with clear real-vs-mocked lines and non-load-bearing stretch goals.
- **Demo is legible on mute** (System Health badge in color/motion) — good for a 1-minute video judged heavily on the demo.

## Concrete WEAKNESSES / GAPS
- **Demo-script 13px vs 12px inconsistency** on the punchline beat (Section 8) — a visible glitch waiting to happen.
- **Ledger pre-seeding is an unstated demo dependency** — the promote verdict cannot fire without prior ledger entries, which must be seeded; not disclosed in the honest-scope section.
- **"Interactive surface" is largely unaddressed** — the tool is a visual/token-drift detector; interaction states, motion, and behavioral consistency are out of scope, which under-serves the full track statement.
- **Cross-surface / holistic reasoning is thin** — everything operates per-save on a single changed file plus a flat ledger; there's no product-wide consistency model beyond the "3 components" count.
- **Residual "IDE linter" perception risk** — mitigated but not eliminated; a skeptical Impact judge may still discount it.
- **Uncalibrated confidence scores** presented as if load-bearing evidence.

## Prioritized FIXES (highest leverage first)
1. **Fix the demo-script numbers.** Make the seeded emergent-pattern padding `12px` end to end (agent writes `padding: 12px`, verdict promotes `--space-3: 12px`), OR introduce two distinct paddings and script both beats separately. This is the punchline; it must be internally consistent on camera. (Cheap, high impact.)
2. **State the ledger seeding in "real vs mocked."** One sentence: "we pre-seed the drift ledger with the prior 12px occurrences so the promote verdict fires deterministically." Turns a hidden dependency into demonstrated honesty and defends the Demo score.
3. **Add one interactive/cross-surface beat to broaden past 'linter.'** Even a small one — e.g., detect an un-tokenized hover/focus state color, a raw transition duration off the motion scale, or flag that the same token drifted in 3 files this session (a true cross-file consistency claim, not per-literal). This directly answers "visual *and* interactive surface" and materially lifts both Usefulness and Novelty.
4. **Ground or drop the confidence number.** Either compute confidence from the evidence (e.g., contrast delta magnitude + token-distance + git recency) so it's defensible, or present the verdict without a fabricated percentage.
5. **Show the designer half of the loop for ~2 seconds.** The pitch is "designers and engineers aligned without a meeting," but the demo is entirely engineer-side. A one-shot cut of the `tokens.json` diff being approved (even a static frame) would make the design-loop-closure claim visible rather than asserted, and defend the Impact/Usefulness axis against the linter critique.
6. **Name the fallback if the live model is slow/unavailable on camera.** You mention cache pre-warming and fast mode; add an explicit "if the API call exceeds N ms we render the cached verdict for the seeded case" so the reliability story is airtight for a recorded take.
