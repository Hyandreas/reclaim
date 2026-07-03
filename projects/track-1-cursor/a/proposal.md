# 1. Taste — the design-system vibe check inside Cursor

**One-line pitch:** Taste is an authorship-time design-system guardian that lives inside Cursor and catches drift — visual or interactive — the instant you (or Cursor's own agent) write it: telling you in plain, evidence-grounded language whether a change is a bug, a redesign, or a platform quirk, fixing it in one click, and promoting genuinely new patterns back into your tokens. *Vibe coding needs a vibe check.*

---

# 2. Track & sponsor

**Track 1 — Cursor.** AI-native design system that reasons about consistency across a product's visual and interactive surface, with enough *taste* to know when something is wrong. Cursor is load-bearing: Taste ships as a Cursor/VS Code extension (the product *is* an authorship-time layer inside Cursor), and the stretch closure dispatches Cursor's Background Agent to open a real PR. The reasoning engine is **Claude Opus 4.8** (`claude-opus-4-8`).

---

# 3. Problem & who it's for (usefulness / relevance)

AI pair programmers made shipping UI ~10x faster — and in doing so made design systems fracture ~10x faster, because Cursor/Copilot happily write *plausible* CSS that is blind to your tokens, your 8pt spacing grid, your motion scale, and your component conventions. A hardcoded `#1a73e8` that's 3 shades off `--color-primary` passes code review, passes tests, and ships — and so does a hover transition hardcoded to `250ms ease` instead of `var(--transition-fast)`. Multiply that across four squads all vibe-coding into one shared component library, and drift outpaces any human reviewer on **both** surfaces the track names: the visual one (color, spacing, radius) and the interactive one (motion, focus, hover, disabled states).

Every existing tool audits drift *after the fact* — a CLI that diffs tokens on CI, a visual-regression tool that flags pixels post-merge. That's triage after the bleeding. The actual bottleneck isn't the diffing (cheap, already solved); it's the **judgment call** — "bug, intentional redesign, or platform quirk?" — which today is a human staring at two screenshots in a Slack thread before anyone touches code.

**Target user — Priya**, a design engineer at a ~40-person startup. She owns one shared component library touched daily by four squads, all coding with AI. Drift arrives faster than she can review it, and she's the human bottleneck between "design intent" and "shipped code." Taste gives her taste-grounded review *inline, in real time, at the moment of authorship* — without slowing the velocity causing the fragmentation, and without a sync meeting. It serves both sides of the aisle: designers see drift before it calcifies into forty components; engineers get an explainable reviewer instead of a blunt CI failure.

---

# 4. What it does — the idea (concrete)

Taste watches code as it's written in Cursor. The moment a file is saved — whether a human typed it or Cursor's agent generated it — Taste:

1. **Flags violations live, on visual and interactive surfaces alike.** A hardcoded hex, an off-grid padding value, or a hardcoded transition/animation duration all get underlined in the editor, and a top-right **System Health** badge (100% → drops → recovers) carries the state in color and motion, legible from the back of the room even on mute.
2. **Delivers a grounded, three-way TASTE verdict on hover** — not "violates rule #12," but a plain-language judgment backed by real computed evidence, on any surface:
   - *Accidental regression, visual* — "This hardcodes `#1a73e8`; your `--color-primary` is `#1a4fd6` — a 5.2:1 → 4.9:1 contrast shift — and this same literal now shows up in 2 other files touched this session. Reads as spreading drift, not a redesign."
   - *Accidental regression, interactive* — "This `transition: 250ms ease` isn't on your motion scale; the nearest token is `--transition-fast` (150ms), and every other transition in this component already uses it."
   - *Intentional redesign* — recognizes a coherent, system-wide change (e.g., a batch of spacing edits landing across three files today) and stands down — no underline, no noise.
   - *Platform constraint* — e.g. an iOS safe-area spacing override that must *not* be flagged (proving taste, not just diffing).
3. **Fixes it in one click.** Accept swaps the literal for the correct token reference; the underline clears and the health badge climbs back toward 100%.
4. **Closes the loop back to design — the punchline.** Sometimes Taste says the *opposite* of a linter: "This 12px step has now appeared in 3 components this week, and none were later reverted — it isn't a bug, propose promoting it as `--space-3` into your token file." One click drafts a real diff to the token source of truth, and a designer approves it inline. **A rule engine enforces; taste knows when the rule is stale.**

Every number on the card is computed, not invented: contrast ratios from WCAG math, grid/motion deltas from the 8pt and motion scales, recurrence counts from the drift ledger, and a confidence score blended from all three plus the model's calibrated self-assessment — shown in the evidence object, never a bare unexplained percentage (see §6).

The literal source of truth is a visible **Figma tokens export** (`tokens.json`, W3C Design Tokens format) that Taste diffs against — so design stays legitimately in the loop and Taste is a design-system tool, not "just an IDE linter."

---

# 5. Why it's novel / differentiation vs the obvious approach

Every other team on this track will build some flavor of the given examples — a diff-checker that audits drift *after* it lands. **Taste is the inversion: catch drift at the moment of authorship, inside the tool causing it.** That's the sharpest reading of the brief and the most on-brand move for a Cursor-sponsored track — we built a Cursor, pointed at your design tokens instead of your code.

Four things make it defensibly novel:

- **We know the closest prior art, and exactly where it stops.** Stylelint token plugins and `design-lint` catch a raw hex via static regex; Tokens Studio's Figma-side linting flags token drift before export. All three are boolean rule-matchers on the visual surface only. None render a grounded three-way judgment (regression vs redesign vs platform constraint) with cited evidence, none watch the interactive surface (motion, focus, hover, disabled states) alongside the visual one, none live inside the loop where AI agents are generating the code, and none close the loop back to design with a promote proposal. Taste isn't a stricter linter — it's the judgment layer none of them have.
- **Authorship-time, not audit-time.** We intervene in the AI coding loop itself, before drift ever reaches a diff. The problem *compounds* as AI codegen spreads, so this is a durable wedge (Chromatic/Zeroheight own pixels and docs; Taste owns *reasoning* at the point of creation).
- **Taste, not linting.** The system automates the expensive human *judgment* step (regression vs redesign vs platform quirk) across both visual and interactive surfaces, grounded in objective evidence — WCAG contrast math, 8pt-grid deltas, motion-scale deltas, token lineage, cross-file recurrence, git recency — not a boolean pass/fail and not an unexplained confidence number.
- **It closes the loop toward design, not just code.** The "promote to system" move — proposing a new token when it detects emergent taste, gated by an explicit occurrence-and-recency heuristic (§6) rather than a vibe — is the single sharpest expression of "taste" the prompt asks for: the system knows when the rule itself is stale.

Pitch line: **"Vibe coding needs a vibe check."**

---

# 6. How it works — architecture & AGENTIC flow

**Stack**
- **Surface:** Cursor/VS Code extension (TypeScript). Uses `onDidSaveTextDocument` (trigger), `createDiagnosticCollection` (underlines), `registerHoverProvider` (verdict card), `registerCodeActionsProvider` (one-click fix). *Cursor is the product surface — mandated-tech honored.*
- **Reasoning engine:** **Claude Opus 4.8** (`claude-opus-4-8`) via `@anthropic-ai/sdk`.
- **Source of truth:** `tokens.json` (W3C Design Tokens, as exported by Tokens Studio from Figma, spanning color/spacing/radius/motion scales) + a one-page brand doc.
- **Stretch actuator:** Cursor Background Agent SDK (opens a real draft PR); Playwright + pixelmatch + Opus vision (rendered before/after classification).

**The agentic loop — plan → retrieve → decide → act → remember**

1. **Plan (deterministic trigger — never fails on camera).** On save, a deterministic detector parses the changed file (regex + lightweight AST via `@babel/parser`/`postcss`) for hardcoded hex, off-grid `px` (not a multiple of 4/8), raw font sizes, un-tokenized radii/shadows, **hardcoded transition/animation durations and easing curves off the motion scale, and un-tokenized focus/hover/disabled-state colors** — covering the interactive surface, not just the visual one. It emits candidate *drift events* with exact source ranges. Detection is guaranteed by code, not by the model — so the underline always appears, on any surface.
2. **Retrieve (grounding).** For each candidate, Taste assembles evidence: the nearest matching token(s) and their values, the closest exemplar component, **a same-session cross-file scan for the identical literal or an equivalent drift in other files touched today** (this is what lets a verdict claim "this also drifted in file X" instead of reasoning file-by-file in isolation), `git blame` / today's diffs (what else changed), and computed numbers — WCAG 2.1 contrast ratio, 8pt-grid delta, motion-scale delta, token lineage. This makes every claim citation-backed rather than hallucinated.
3. **Decide (the taste — where the wow lives).** Opus 4.8 classifies and explains.
   - *Caching & context:* the system prompt is prompt-cached (`cache_control: {type: "ephemeral"}`) and holds the *entire* token library + brand doc + WCAG/8pt/motion-scale rules + ~12 hand-curated "good-taste" judgment exemplars — the **1M-token context window** lets us stuff all of it inline with zero RAG. The volatile candidate + evidence go in the user turn, after the cache breakpoint.
   - *Structured output:* constrained via `output_config: {format: {type: "json_schema", schema: {…}}}`, `additionalProperties: false`, schema keys ordered `verdict` → `reasoning` → `evidence` → `confidence` → `proposed_fix` → `promote_proposal` — the shape below.

   ```json
   {
     "verdict": "accidental_regression | intentional_redesign | platform_constraint | promote_candidate",
     "reasoning": "plain-language, one or two sentences",
     "evidence": { "contrast_before": 0, "contrast_after": 0, "grid_delta_px": 0, "motion_delta_ms": 0, "cross_file_recurrence": 0, "token_lineage": "" },
     "confidence": 0.0,
     "proposed_fix": { "range": [0,0], "replacement": "var(--color-primary)" },
     "promote_proposal": { "token_name": "--space-3", "value": "12px", "occurrences": 3, "window_days": 7 }
   }
   ```

   - *Confidence is computed, not invented:* a weighted blend of the deterministic `evidence` fields (contrast-delta magnitude, token-distance, cross-file-recurrence count), with the model's calibrated self-assessment (`thinking: {type: "adaptive"}`) only adjusting it within a bounded range — every percentage on the hover card (`Math.round(confidence * 100)`%) traces back to a number already on screen, never a bare unexplained figure.
   - *Streaming:* `verdict` resolves almost instantly (a short enum), `reasoning` streams next, and the hover card renders it via a parse-tolerant partial-JSON parser reading the growing buffer — prose appears token-by-token while `evidence`/`confidence`/`proposed_fix` resolve a beat later, so nothing waits on the full object.
   - *Latency:* prompt caching makes every subsequent classification a `cache_read` (~0.1x cost, near-instant) — critical for a live per-save loop; optional fast mode (`speed: "fast"`, beta `fast-mode-2026-02-01`) trims it further on camera.
   - *De-risking the live call:* the Cursor agent prompt used in the demo is fixed and rehearsed ahead of time (exact wording in §8) to reliably emit the seeded literals, with a typed-keystroke fallback that reproduces the identical edit if the agent call stalls (the deterministic detector fires identically either way), and a 2-second latency threshold falls back to a pre-computed cached verdict for that exact seeded case — so the hover card never stalls on camera.

   The LLM owns only explanation, classification, and confidence calibration; the deterministic layer owns detection, evidence, and the confidence arithmetic.
4. **Act (closure).** Inline Quick Fix applies `proposed_fix` (deterministic string replacement — reliable). A `promote_candidate` verdict drafts a diff to `tokens.json`, shown inline for one-click designer approval. **Stretch:** a high-confidence `accidental_regression` dispatches Cursor's Background Agent to open a real draft PR (pre-verified, shown as a bonus cut — never the backbone).
5. **Remember (state / memory).** A flat JSON **drift ledger** records every verdict, timestamped. The promote heuristic is explicit and deterministic, not a vibe: **promote when the same value appears in ≥3 distinct components within a rolling 7-day window, AND none of those occurrences were subsequently reverted or "fixed" back to an existing token (i.e., it's accreting, not being corrected), AND it isn't already a rejected proposal in the ledger** — the guard that separates an emergent convention from a repeated mistake. Accepted/overridden verdicts are appended to the next system prompt as calibration exemplars — cheap continual tuning with zero fine-tuning.

**Vision path (secondary/stretch):** Playwright headless renders the component before/after; pixelmatch localizes the diff to a crop; Opus 4.8 high-resolution vision (up to 2576px long edge, 1:1 pixel coordinates) classifies the rendered diff. This strengthens the intentional-redesign call but is not on the critical path of the live demo.

---

# 7. Buildable-in-2-days plan: milestones, real vs mocked, honest scope

**Day 1 — the taste core (must fully work).**
- Cursor extension skeleton: save hook, diagnostics (underline), hover provider, code-action (fix).
- Deterministic detector for hex / off-grid spacing / raw font-size / **hardcoded transition-duration and un-tokenized focus-hover-disabled colors**, emitting ranged drift events across both visual and interactive surfaces.
- Seed the demo repo:
  - `tokens.json` (Figma export, including a small motion scale, e.g. `--transition-fast: 150ms`) + a small React component library (~15–20 tokens/components — enough to feel real, small enough to stay fast and reliably renderable).
  - A **pre-seeded drift ledger** (dated commits simulating 2 prior occurrences of a `12px` spacing value earlier this week, so the live 3rd occurrence trips the promote threshold honestly rather than requiring the model to fabricate history).
  - 4 hand-seeded cases mapped to the four verdicts: a hardcoded hex (visual regression), a hardcoded `250ms` transition (interactive regression), a batch of coherent spacing edits across three files (intentional redesign — must NOT flag), and a legit iOS safe-area override (platform constraint — must NOT flag).
- Opus 4.8 classification loop: cached system prompt (token library + WCAG + 8pt + motion-scale + curated exemplars), strict JSON verdict with computed confidence, streamed reasoning. This is a prompting/curation problem, not an ML problem — exactly right for the timebox.

**Day 2 — closure, polish, rehearsal.**
- AM: one-click fix end-to-end on both surfaces; "promote to system" drafts a `tokens.json` diff with a one-click designer-approve stamp; the System Health badge (blue/amber/red, plain SVG/CSS — no exotic physics graph) wired to live state.
- PM: drift ledger + calibration feedback; harden the four curated demo cases to near-zero false positives; rehearse the fixed Cursor-agent prompt (§8) until it reliably emits the seeded literals, with a typed-keystroke fallback verified as a backup; record 2–3 clean 60-second takes.
- If time remains (stretch, pre-verified): Cursor Background Agent draft-PR beat; Playwright/pixelmatch/Opus-vision before/after classification.

**Real vs mocked**
- **Real:** the extension, the deterministic detector (visual and interactive), the Opus 4.8 taste verdict grounded in real computed numbers including confidence, the one-click fix, the promote-to-system diff, the drift ledger.
- **Scoped to a seeded local repo (not mocked, but bounded, and disclosed):** we diff against a committed `tokens.json` rather than a live Figma API; we pre-seed 4 curated violations (visual regression, interactive regression, a restraint/redesign case, a platform-constraint case) known to produce sharp verdicts rather than trusting the model to improvise live; **the drift ledger is pre-seeded with dated prior commits so the "3rd occurrence" promote trigger fires honestly on camera** — stated here plainly rather than left implicit.
- **Explicitly cut:** live Figma API sync, real GitHub automation as the backbone, multi-framework support, auth. The Background-Agent PR and the vision path are stretch bonus beats, not the core.

---

# 8. The 1-minute demo script — moment by moment

- **0:00–0:06** — Cursor open on the seeded repo. Top-right **System Health: 100%**, calm blue. A `tokens.json` pane is visible: "your Figma tokens — the source of truth," including a small motion-scale block.
- **0:06–0:18** — Cursor's own agent runs one rehearsed prompt — *"Add a primary Button with a blue background, and align the Modal's transition to the design"* — and writes it all at once: `background:#1a73e8` and `transition: 250ms ease` in two files, a batch of coherent spacing edits across three other files belonging to a redesign already underway this session, and `padding: 12px` in one more file — its third occurrence this week. Two red underlines appear (hex, transition); the health badge drops to 85% and pulses amber. The redesign batch gets **no underline** — a small inline tag flashes *"recognized as today's redesign — standing down,"* proving restraint on screen, not just asserting it in a doc. The `12px` edit gets a third, quieter dotted underline instead — a trend mark, held for the punchline.
- **0:18–0:32** — Hover the hex underline. Verdict card streams in: **"Accidental regression — 94% confidence.** *Contrast 5.2:1 → 4.9:1, token-distance high, and this same `#1a73e8` now appears in 2 other files touched this session — spreading, not an isolated typo.*" Buttons: **Fix · Override · Ask.** Click **Fix** — code swaps to `var(--color-primary)`, underline clears, badge climbs to 91%.
- **0:32–0:40** — Hover the transition underline. Verdict: **"Same story, different surface — 90% confidence.** `250ms` isn't on your motion scale; the nearest token is `--transition-fast` (150ms), and every other transition in this component already uses it." Click **Fix** — badge climbs to 96%, pulse calming toward blue. *(The interactive-surface beat — proof Taste isn't only a color linter.)*
- **0:40–0:54 (the punchline)** — Back to that dotted `padding: 12px` underline, waiting since 0:06 — a trend mark, not a red flag. Hover it: **"Not a bug.** This 12px step has now appeared in 3 components this week, and none were later reverted — propose promoting it as `--space-3` (12px)." Click **Promote** → a `tokens.json` diff appears inline; a one-click **"Approve"** stamp (standing in for the designer) lands it — *demonstrating* design-engineer alignment with no meeting, not just claiming it.
- **0:54–1:00** — Badge hits **100%**, calm blue. Closing card: **"Taste. Vibe coding needs a vibe check."**

*(De-risking note, not part of the visible cut: the agent prompt above is fixed and rehearsed to reliably emit the seeded literals; a typed-keystroke fallback reproduces the identical edit if the live agent call stalls, and a 2-second latency threshold falls back to a pre-computed cached verdict for this exact seeded case — so nothing on screen depends on an unrehearsed live call.)*

The whole arc — harmony → drift across two surfaces → restraint proven live → diagnosis-and-cure → design-loop closure → harmony restored — reads in silence via color and motion, and lands three beats no other team will show: a system that catches interactive drift as fluently as visual drift, that visibly *doesn't* fire on a coherent redesign, and that proposes a *new* token because it has the taste to know the rule was stale.

---

# 9. Impact & adoption

**Real-world grounding.** The industry workflow is Figma Variables / Tokens Studio → W3C Design Tokens JSON (color, spacing, radius, motion) → Style Dictionary → platform CSS/Tailwind → components → visual-regression snapshots → *a human triaging "bug vs redesign vs platform quirk" before code changes.* Every org running a design system at scale (Airbnb DLS, Shopify Polaris, Atlassian) staffs people for exactly that judgment step. Taste automates the expensive judgment, not the cheap diffing — and moves it left, to authorship time.

**Who benefits.** Design engineers (Priya) stop being the human bottleneck; designers see drift before it calcifies; engineers get an explainable reviewer instead of a blunt CI red X, across both the visual and interactive surface. As AI codegen becomes universal, the problem compounds rather than shrinks — a durable wedge.

**Failure modes handled.**
- *"Just an IDE linter."* — The visible Figma `tokens.json` is the literal source of truth we diff against; the "promote to system" loop closes back to design; and unlike Stylelint/`design-lint`/Tokens Studio linting (see §5), Taste renders a grounded three-way judgment across visual *and* interactive surfaces, not a boolean rule match. It's a design-system tool that happens to live where drift is born.
- *Hallucinated verdicts.* — Every claim, including the confidence score itself, is grounded in a computed number (contrast ratio, grid/motion delta, cross-file recurrence, token lineage); the LLM classifies, explains, and calibrates — it doesn't invent the evidence or the percentage.
- *False positives destroy trust.* — The legit iOS safe-area case and the live "recognized as today's redesign" beat prove Taste knows when *not* to fire, on both visual and interactive surfaces; the demo cases are curated to near-zero false positives, and the human always holds Fix / Override / Ask.
- *Flaky on the fifth take.* — A deterministic detector is the trigger, so detection never fails on camera; the on-camera agent prompt is fixed and rehearsed with a typed-keystroke fallback (§8); the LLM owns only the (grounded, pre-verified) explanation.

**Adoption story.** It lives inside the tool developers already use (Cursor), enforces at authorship instead of adding a dashboard nobody opens, keeps an audit trail (the drift ledger), and self-calibrates from accept/override decisions.

---

# 10. Risks & mitigations; stretch goals

**Risks & mitigations**
- *Reads as a linter, loses Impact points for straying from the design layer.* → Keep `tokens.json` (Figma export) visibly central; name the closest prior art and what it can't do (§5); lead the demo with the WCAG-grounded verdict and the interactive-surface beat; land "promote to system" as the closer that proves design-loop closure.
- *Live LLM latency on a per-save loop.* → Prompt caching makes every classification a `cache_read` (~0.1x, fast); pre-warm the cache before recording; optional fast mode; a 2-second latency threshold falls back to a pre-computed cached verdict for the seeded demo case; the deterministic underline appears instantly regardless of model latency.
- *Model improvises a weak verdict on camera.* → Pre-seed 4 curated violations (visual regression, interactive regression, restraint/redesign, platform constraint) with known-sharp, rehearsed verdicts; strict JSON schema constrains output; the on-camera agent prompt is fixed and rehearsed (§8) with a typed-keystroke fallback; adaptive thinking + curated exemplars in the cached prompt keep judgments calibrated.
- *Confidence number looks fabricated.* → Confidence is computed from the `evidence` fields already shown on the card (contrast delta, token-distance, cross-file recurrence), with the model only calibrating within a bounded range — never an unexplained figure (§6).
- *Promote loop institutionalizes a mistake instead of a convention.* → The promote heuristic requires ≥3 occurrences across distinct components within a rolling 7-day window AND none subsequently reverted; a value that's being fixed elsewhere never trips it (§6).
- *Chaining async systems (PR / cloud VM) is fragile live.* → The backbone (detect → verdict → inline fix → promote-diff) is fully local and deterministic-triggered. The Cursor Background-Agent PR is a pre-verified bonus cut, never the thing the demo depends on.

**Stretch goals (all pre-verified, none load-bearing)**
1. **Cursor Background Agent PR** — high-confidence regressions dispatch a real draft PR (detect → judge → *act*), honoring the Cursor track end-to-end.
2. **Vision path** — Playwright + pixelmatch + Opus 4.8 high-res vision (2576px, 1:1 coords) classifies rendered before/after component diffs, strengthening the redesign-vs-regression call.
3. **Live Figma sync** — swap the committed `tokens.json` for a live Figma Variables / Tokens Studio pull, shown once as a bonus beat.
4. **Team drift dashboard** — aggregate the ledger into a per-squad drift feed and promote-candidate queue for Priya.
5. **Deeper interactive coverage** — extend the detector to easing curves, z-index scale, and disabled-state opacity, beyond the motion-duration and focus/hover color already in the core build.
