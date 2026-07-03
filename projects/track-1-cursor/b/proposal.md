# 1. Driftline — the design-system reviewer that never gets tired

**One-line pitch:** Driftline treats your Figma tokens and your code as two branches of one truth, semantically diffs them on every pull request, and — instead of just flagging a delta — returns a *reasoned verdict* (accidental regression vs. intentional redesign vs. platform-mandated exception vs. orphaned token) with a one-click, byte-grounded fix. Unlike a linter, it also knows *which side to fix*: patch the code, or tell the designer the token itself has gone stale.

---

# 2. Track & sponsor

**Track 1 — Cursor.** AI-native design system that reasons about consistency across a product's visual and interactive surface: detecting drift, classifying it with taste, proposing reconciliation, and keeping designers and engineers aligned without a sync meeting.

We take "visual **and interactive** surface" literally: static token drift (color, spacing, radii, type) and interaction-state drift (focus rings, hover/disabled contrast) run through the same pipeline, not a bolted-on afterthought. And "keeping designers and engineers aligned" is bidirectional in our build — reconciliation isn't always "fix the code": when the evidence shows code moved on purpose, Driftline proposes updating the *token* instead, so the design side of the room gets pulled back into the loop, not just engineering.

We honor the sponsor tech directly: Driftline's engine is exposed as a **Model Context Protocol (MCP) server** that Cursor calls natively, so a developer can ask *"why is this button off-brand?"* in-editor and get a sourced answer, or *"fix my drift"* and get a real patch applied to the file they're looking at.

---

# 3. Problem & who it's for (usefulness / relevance)

Static design tokens and component libraries are brittle contracts. The moment a brand color shifts in Figma, a new engineer hardcodes `#1e40af` under deadline, or a migration to an 8px radius stops at 38 of 40 components, the system quietly fractures. Nobody notices in Figma. It breaks in **pull request #4,127 that nobody reviewed closely** — and surfaces three weeks later as a customer screenshot or, worse, an accessibility-compliance ticket.

The fracture isn't only static values, either. A focus ring that quietly drops to 2:1 contrast, or a disabled-state color nobody re-checked after a rebrand, is invisible in a design file and fails an accessibility audit in production. That's exactly the "interactive surface" the brief names, and exactly where a static linter stops looking.

**The buyer is exact and real:** a platform / design-systems engineer at a 50–1,000-person product org who owns the token pipeline and today catches this drift by manual review or not at all. Two things make this a budgeted problem, not a nice-to-have:

- **It is a trust problem between two roles.** Designers don't know when code has silently diverged from the source of truth; engineers don't know whether a mismatch is a bug or a deliberate override — and today the "fix" always defaults to changing the code, even when the code is the one that's right. Driftline is the shared referee, and unlike a linter, it can tell either side to move.
- **It is a risk problem.** A drifted color that drops below WCAG 2.1 contrast is ADA legal exposure — thousands of web-accessibility suits are filed yearly. Driftline ties every color verdict, static or interactive, to real contrast math, converting "aesthetics" into risk mitigation.

Crucially, **this is a CI gate, not a workflow change.** Nobody adopts a new tool or plugin — it runs on the next PR, or on-demand from the dashboard, or inside Cursor. That's the most "would ship Monday morning" interpretation of the brief.

---

# 4. What it does — the idea (concrete)

Driftline ingests two inputs and treats them as two representations of one design system:

1. A **design-token source** — a W3C Design Tokens JSON file exported from Figma (colors, spacing, radii, type scale, semantic roles like `color/primary/700`).
2. A **real codebase** — a Tailwind config, CSS custom properties, and React/TSX component source.

It then runs a two-layer pipeline:

**Layer 1 — deterministic detection (pure code, zero LLM).** Find every discrepancy with hard evidence: perceptual color distance (CIELAB ΔE, not hex-string equality), numeric thresholds for spacing/radii/type scale, hardcoded values where a matching token exists, orphaned tokens, and semantic-vs-raw hierarchy violations. This layer also checks **interaction-state tokens** — `hover:`, `focus:`, `focus-visible:`, `disabled:` variants — against WCAG 2.1 SC 1.4.11 non-text contrast (3:1 minimum for UI components and focus indicators), so the interactive half of "visual and interactive surface" is a first-class check, not an afterthought. WCAG contrast is computed here as a *fact*, not a guess.

Layer 1 also computes three **corroborating signals**, purely from data, that Layer 2 argues from instead of vibes:

| Signal | What it measures | Computed from |
|---|---|---|
| **Migration ratio** | Share of usages already on the new value | Matching-vs-drifted usage counts for the same semantic role, repo-wide |
| **Commit corroboration** | Whether a token change accompanies the code change | Git blame + whether the token file changed in the same or an adjacent commit |
| **Recurrence** | Whether the same "wrong" value shows up repeatedly | Count of distinct components/commits sharing an identical drifted value |

**Layer 2 — the Verdict (the taste layer).** Every discrepancy is classified into a **closed taxonomy** so the "taste" output is bounded and testable, not open-ended vibes:

| Verdict | Meaning | Example | Typical fix direction |
|---|---|---|---|
| **Accidental Regression** | Drift that should be fixed | Hardcoded `#1e40af` bypassing `--color-primary-700` | Patch code |
| **Intentional Redesign** | Code moved deliberately, or an incomplete migration | 38/40 components moved to 8px radius; 2 stragglers | Patch the stragglers — or **update the token** if corroboration is high |
| **Platform Constraint** | A justified exception | 44pt iOS tap target vs. 48dp Material token | No fix — excluded by rule |
| **Orphaned Token** | Structural dead weight | Token defined but never used, or used but absent from the code | Flag for removal (human decides) |

The classifier doesn't invent this judgment from nothing — it's handed the three signals above plus platform/folder context (`ios/`, `android/`, `web/`) and reasons against stated thresholds: migration ratio ≥ 80% *and* recurrence ≥ 3 both push toward Intentional Redesign; commit corroboration present pushes the same way even at a lower ratio; no corroborating signal at all caps the verdict at Accidental Regression. **Confidence is grounded, not asserted:** High = 2+ signals corroborate the verdict, Medium = exactly 1, Low = the classifier's read against contradicting or absent signals — every confidence label traces back to a specific count, not a vibe.

Critically, a verdict can **flip** the deterministic layer's naive read. Layer 1 might flag a value purely on ΔE distance as a candidate regression; if commit corroboration and migration ratio both corroborate intent, Layer 2 overturns it to Intentional Redesign on screen — visible proof that classification is *reasoning over evidence*, not a lookup table keyed on which folder the file lives in.

Each finding renders as a **diff card** with reasoning *before* verdict: the real rendered UI (the actual button, not a swatch), one plain-English causal sentence, a classification chip, the confidence band above, a **blast-radius chip** (how many components a fix touches), and the raw values shown next to the verdict so the reasoning is *checkable, not asserted*.

**Fixes are bidirectional — this is the part a plain linter can't do.** Most drift tools assume code is always wrong. Driftline asks *which side moved on purpose* and fixes that side:

- **Patch code** (the common case, Accidental Regression): a real unified diff grounded to an exact `file:line` span, with the invariant preserved (e.g., "still 4.6:1 contrast on white").
- **Update the source** (Intentional Redesign with high corroboration, or recurrence ≥ 3 across distinct components): instead of "leave it alone," Driftline drafts a structured **token-change proposal** — old value, new value, every affected component, one-sentence rationale — a shareable artifact a designer can paste into Figma or a ticket. This turns `Promote to token` from a manual escape hatch into a data-driven recommendation, and it's the concrete moment a *designer*, not just an engineer, is pulled into the loop.

Override actions — **Approve fix / Promote to token / Dismiss with reason** — write to an audit trail; a dismissal suppresses that finding in future runs (false-positive-fatigue insurance). Neither fix direction ever auto-applies without a click: Driftline drafts, a human approves, and nothing reaches Figma or `main` silently.

---

# 5. Why it's novel / differentiation vs. the obvious approach

We'll say the quiet part first: a token-vs-code diff engine with a redesign/regression/platform-constraint taxonomy is close to an example direction the brief itself hands you. Restating the brief's example well isn't the novelty claim. Four things we built *on top of* that the brief doesn't mention:

1. **Verdicts flip on evidence, live, on screen.** Layer 1 can flag a value as a candidate regression purely on distance (ΔE, numeric threshold). Layer 2 doesn't just relabel it with a fancier word — it **overturns** the naive read when commit corroboration and migration ratio both point the other way, and the card shows the reversal happening: "this looked like drift; here's the evidence it's actually the new standard." A static taxonomy sorts findings into four buckets. A system with taste changes its mind when the evidence tells it to — that distinction between classification and reasoning is the single most convincing thing we can put in front of a skeptical judge.
2. **Fixes are bidirectional — Driftline will tell the designer they're wrong, not just the engineer.** Every framing of this brief we've seen, including its own named examples, assumes the fix always flows one way: code conforms to the token. We flip that when the evidence says code is the new intent — instead of a patch, Driftline drafts a **token-change proposal** aimed at the design side of the room for once. This is also the concrete mechanism that answers "keeping designers and engineers aligned": a designer-facing artifact, not just an engineer-facing CI check.
3. **Drift has velocity, and Driftline notices patterns a human reviewer wouldn't.** The same off-token value showing up in three or more unrelated components isn't three bugs — it's the codebase voting for a token that doesn't exist yet. Recurrence is a pure-code aggregation (group by resolved value, count distinct components/commits) that auto-surfaces "Candidate New Token," turning `Promote to token` from a button someone has to remember to click into a recommendation the system volunteers.
4. **The reasoning is grounded, and the fix is structurally safe in both directions.** Detection is deterministic (ΔE, numeric thresholds, WCAG math — now including interaction-state contrast), so the model never invents a delta. The fix generator is constrained to the scanner's verified byte range and emits a unified diff, so the LLM **cannot** freely rewrite code or touch anything outside the flagged span — a hallucinated patch is structurally impossible, not merely unlikely. The `update_source` direction inherits the same discipline: it is always a drafted artifact, never a silent write to Figma.

Versus the two other obvious builds in this brief: a screenshot-based visual-regression tool lives or dies on pixel noise and rendering environments on stage (high demo risk); a pure chat interface has no verifiable ground truth. Driftline's deterministic core makes the demo reproducible to the second, the verdict-flip makes the reasoning visible instead of assumed, and the bidirectional fix makes the brief's "alignment" claim literal instead of aspirational.

---

# 6. How it works — architecture & agentic flow

**Stack:** TypeScript end-to-end. Vite + React + Tailwind for both the dashboard and the seeded demo app. Node scanner using PostCSS (CSS custom properties + Tailwind config) and `ts-morph` — walking the real TypeScript compiler AST, not regex — for JSX `className` and inline-style extraction with exact `file:line:col` spans. `culori` for CIELAB ΔE and WCAG contrast. `better-sqlite3` for the session/audit store. `@anthropic-ai/sdk` for Claude. `@modelcontextprotocol/sdk` for the Cursor-facing MCP server.

**Models / APIs:** **Claude Opus 4.8** (`claude-opus-4-8`) with **adaptive thinking** (`thinking: { type: "adaptive" }`), structured outputs via `output_config.format` with a `json_schema`, and `strict: true` tool schemas — verified against the current Anthropic SDK reference before it went into this document, not assumed. The LLM touches only two steps — classification and fix-copy — and both are schema-valid every time by construction.

**Pipeline (deterministic core → LLM reasoning → grounded apply):**

1. **`scan_tokens`** — parse the W3C Design Tokens JSON into a normalized token graph (name, value, type, semantic role). Loaded from a pre-cached offline snapshot; a live Figma REST pull is an optional flourish, never a demo dependency.
2. **`scan_repo`** — AST + PostCSS scan of the repo → every token usage and every raw literal, each with an exact byte span (`file`, `start`, `end`). Token resolution is the fiddliest real step, so it's fully specified rather than assumed: (a) parse `tailwind.config` into a flat `value → token-name` reverse map at startup; (b) resolve palette classes (`bg-blue-800`) and arbitrary-value classes (`bg-[#1e40af]`, `text-[14px]`) by extracting the literal and matching it against the reverse map via ΔE/numeric distance; (c) pseudo-class variants (`hover:`, `focus:`, `focus-visible:`, `disabled:`) resolve the same way and get tagged `interactive: true`, feeding the WCAG non-text contrast check. **Explicit scope line:** dynamically constructed classNames (`clsx(...)`, template literals, computed strings) are detected but flagged `needs-manual-review` rather than auto-resolved or auto-fixed — declared out of scope for Day 1 rather than discovered live on stage. This grounding is what makes fixes safe.
3. **`diff`** — pure-code diff engine: CIELAB ΔE for colors, numeric thresholds for spacing/radii/type, structural checks (hardcoded-where-token-exists, orphaned, semantic-vs-raw, interactive-state contrast below 3:1). It also computes the three corroborating signals from §4 — migration ratio, commit corroboration, recurrence — as pure aggregation, still **zero LLM**. Emits candidate discrepancies, each carrying both values, ΔE/delta, the matching token candidate, computed WCAG contrast, the byte span, and the three signals.
4. **`classify`** — Claude Opus 4.8 with `output_config.format` bound to a JSON schema whose `verdict` field is an enum of the four taxonomy values, plus `confidence` (High/Med/Low, derived from signal-corroboration count), `fix_direction` (`patch_code` | `update_source`), a one-sentence `rationale`, and the `rule` cited (WCAG contrast, HIG/Material tap-target minimum, semantic hierarchy). Input is each discrepancy plus the three deterministic signals and platform/folder context. The closed enum plus grounded confidence makes the "taste" output bounded, testable, and able to flip the Layer-1 guess when the signals disagree with it.
5. **`propose_fix`** — branches on `fix_direction`. For `patch_code`, Claude returns a structured `{ token_name, replacement_string }` constrained to the scanner's verified byte span; our code — not the model — applies it as a unified diff, so the edit cannot escape the flagged range. For `update_source`, Claude drafts a structured token-change proposal (`{ token_name, old_value, new_value, affected_components[], rationale }`) — a designer-facing artifact, never a direct Figma write. Strict tool schemas (`strict: true`) guarantee valid parameters in both branches.
6. **`apply_fix`** — for `patch_code`, writes the unified diff to the working tree; the demo app's Vite HMR re-renders so the before/after is visible live. For `update_source`, renders the token proposal as a shareable card/markdown snippet — nothing is written back to Figma automatically. Override actions (Approve / Promote to token / Dismiss-with-reason) write to the SQLite audit trail; dismissals are consulted on the next run to suppress known-intentional findings.

**Orchestration & agentic surface.** The six steps are explicit, individually callable tools exposed two ways: (a) our own control loop, which drives the dashboard, and (b) an **MCP server**, built on `@modelcontextprotocol/sdk` and registered in the demo repo's `.cursor/mcp.json` as a local stdio server, that Cursor calls directly — the honor-the-track move. In Cursor, "why is this button off-brand?" routes to `scan → diff → classify` and returns a sourced verdict, fix direction included; "fix my drift" routes through `propose_fix → apply_fix` and applies the patch in-editor when the direction is `patch_code`.

**State / memory.** A session JSON/SQLite cache makes reruns incremental (the CI story: only re-classify what changed) and persists the decision audit trail, so nothing silently mutates code — or Figma — and repeat runs stay fast and reproducible.

---

# 7. Buildable-in-2-days plan: milestones, real vs. mocked, honest scope

**Scope line (defended hard):** one token format (W3C/Figma export), one code target (Tailwind + CSS custom properties + React/TSX), no live Figma API in the demo path, no multi-repo, no auth, no computer-vision / pixel-diff. High-confidence deterministic checks only. The interactive-surface check is scoped narrowly to one rule — non-text contrast on `hover`/`focus`/`focus-visible`/`disabled` variants — not a general interaction-state framework. The bidirectional `update_source` fix is always a drafted proposal artifact, never a live write to Figma.

**Day 1 — the spine.**
- Freeze a seeded offline demo repo with realistic commit history (see §8) *before* touching anything creative.
- Build `scan_tokens` + `scan_repo` with real `file:line:col` grounding. **Gate check by midday:** resolve two real Tailwind arbitrary-value cases (`bg-[#hex]`, a palette class) plus one dynamic/templated className end-to-end before building anything further on top — this is the step most likely to eat the schedule, so it's proven early instead of assumed. Dynamic classNames get the declared `needs-manual-review` fallback, not silence.
- Build the deterministic `diff` engine: ΔE, numeric thresholds, structural checks, WCAG math, the interactive-state contrast rule, and the three corroborating signals (migration ratio, commit corroboration, recurrence) — all pure aggregation, no new dependency risk. Ends Day 1 producing a correct, ranked drift list — including interactive findings — against our repo. This alone is a demoable fallback.

**Day 2 AM — reasoning + safe, bidirectional fixes.**
- `classify` with Claude Opus 4.8 structured output over the closed taxonomy, now including `fix_direction`, grounded confidence, and the verdict-flip case (deterministic layer suspects regression; signals corroborate intent; classifier overturns it).
- `propose_fix`: `patch_code` branch constrained to scanner byte ranges → unified diff; `update_source` branch (recurrence ≥ 3, or high-corroboration redesign) → structured token-change proposal artifact.

**Day 2 PM — surface + polish + rehearsal (deliberately trimmed).**
- **One** dashboard screen: drift feed + a single expandable diff-card component reused for every verdict, including the flip case and the token-proposal artifact — no separate views to build, which is what makes this achievable in an afternoon.
- MCP wrapper as a thin closing layer calling the same six tools, not a second UI.
- Plant 6–7 marquee drift bugs (one flip case, one recurrence case, one interactive-state case) on top of the corpus's organic drift so the ranked feed lands at the demo's 14 findings; pin the exact reasoning output as a verified fallback; rehearse the 60-second cut only against the planted-bug repo.

**Real vs. mocked:** detection, diff, classification (including fix-direction and grounded confidence), fix generation in both directions, apply, and the audit trail are all **real**. Mocked/deferred: live Figma API (cached snapshot instead), an actual Figma write-back for `update_source` (proposal artifact only), multi-framework support, multi-repo, auth. The 1-minute video is scripted against the seeded repo so issue count and timing match every take.

---

# 8. The 1-minute demo script (moment by moment)

*Cold open — the first 3s of the 0:00–0:07 beat below: split screen, Figma tokens on the left, the running seeded demo app on the right.*

- **0:00–0:07** — "Design systems don't break in Figma. They break in the pull request nobody read closely." We run `driftline scan`. The dashboard populates instantly with a ranked drift feed — 14 findings, color-coded by verdict.
- **0:07–0:17** — Click the top card. The **real rendered button** appears side-by-side (drifted vs. token-true). Verdict chip: **Accidental Regression, High confidence.** Reasoning sentence: *"This `#1e40af` is ΔE 1.2 from `--color-primary-700` but was hand-typed on `Button.tsx:42` — no accompanying token change, contrast unchanged at 4.6:1."* Click **Apply fix** — the diff applies, the demo app hot-reloads, the button snaps to brand blue. Blast-radius chip: 1 component touched.
- **0:17–0:32** — **The taste beat, and the whole pitch.** Second card opens *mid-reasoning*: Layer 1 flagged it as a candidate regression (ΔE 8.4). The verdict chip **flips on screen** to **Intentional Redesign, High confidence** — reasoning sentence: *"38 of 40 usages already moved to 8px radius, and the token file changed three commits ago. This isn't drift — the codebase already agrees with itself."* Instead of "ignore it," click **Promote to token**: a structured proposal card appears — old value, new value, the 38 components already using it, one sentence a designer could paste straight into a Figma comment. This is the verdict that argues with itself, and the fix that points at the design file instead of the code.
- **0:32–0:40** — Third card: a `focus-visible` ring color drifted to 2.1:1 — below the 3:1 non-text minimum. Verdict: **Accidental Regression, interactive state.** Apply fix live; the focus ring snaps back on screen. *(The "visual and interactive" half of the brief, shown on camera, not just claimed in the doc.)*
- **0:40–0:48** — Credibility beat: cut to a real terminal, `git log` on the exact commit range behind the flipped card — the evidence lives outside our own app, not just inside it. Fast flash: **Platform Constraint** chip — *"44pt iOS tap target vs. 48dp Material — HIG-mandated, correctly excluded."* Overlay: "click any of the other 10 — they're all real."
- **0:48–1:00** — Honor-the-track close: flip to **Cursor**, type *"why is this badge off-brand?"* — Driftline's MCP server returns the sourced verdict, fix direction included, inline. Tagline: **"We built the reviewer that never gets tired — and it knows which side is wrong."**

*Every beat is deterministic: we control the seeded repo and the injected bugs — including the flip case and the recurrence case — and the exact reasoning is pinned as a fallback, so the clip is reproducible to the second with zero live-AI flakiness.*

---

# 9. Impact & adoption

**Real-world grounding.** The demo corpus is built from a real public token set (Polaris / IBM Carbon / Atlassian-style) paired with a small matching component repo, so the "before" state reads like an actual mid-size company's system, not a toy. Every verdict is defensible against a published rule: WCAG 2.1 contrast math (text and the 3:1 non-text minimum for interactive states), iOS HIG 44pt vs. Material 48dp minimums, and semantic-vs-raw token hierarchy.

**Who benefits — both roles, not just engineering.** Platform/design-systems engineers get a CI gate that catches drift, visual and interactive, before users do; designers get an actual artifact — the token-change proposal from a flipped verdict — instead of a vague promise that "code still matches the source of truth"; eng leaders get accessibility risk caught at PR time instead of in a lawsuit. The close-out metric judges care about: *"14 inconsistencies surfaced, 3 auto-fixed forward into code, 1 flipped and fixed backward into a drafted token proposal, ~40 minutes of design QA saved — on one PR."*

**Failure modes handled.** False-positive fatigue is the #1 killer of real design-lint tools, so we scope to high-confidence deterministic checks, ground every confidence band in a stated signal count instead of a vibe, and ship one-click **Dismiss-with-reason** that suppresses future noise. Hallucinated patches are structurally impossible in both fix directions: `patch_code` is constrained to verified byte ranges, and `update_source` never writes to Figma on its own. Nothing mutates code — or a design file — silently: every action writes to an audit trail.

**Adoption story.** It lives in existing CI as a PR check (or a nightly Slack digest), plugs into Cursor via MCP, and requires no token-format migration and no rip-and-replace — it treats Figma and code as co-equal sources of truth, and for the first time gives the *design* side of that equality a concrete, occasionally-correct vote.

---

# 10. Risks & mitigations; stretch goals

**Risk: live-demo fragility (network / flaky AI on stage).** *Mitigation:* freeze a single seeded offline demo repo before building anything creative; cache the Figma snapshot behind an env flag; pin the exact classification/fix output — including the flip case — as a verified fallback; hard-constrain the LLM to scanner-verified byte ranges so a bad patch can't render; rehearse only against the planted-bug repo so issue count and timing match every take.

**Risk: Tailwind resolution is harder than the milestones imply.** *Mitigation:* the algorithm is fully specified in §6 (theme reverse-map + arbitrary-value extraction + tagged pseudo-class variants), gated at midday on Day 1 against real cases before anything else is built on top of it, with dynamic/templated classNames getting an explicit `needs-manual-review` fallback instead of a silent miss or a stage surprise.

**Risk: false-positive fatigue.** *Mitigation:* deterministic high-confidence checks only (contrast math, structural hierarchy — no fuzzy visual similarity), confidence bands grounded in a stated signal count, and Dismiss-to-suppress.

**Risk: judges assume the reasoning is a hardcoded string.** *Mitigation:* the demo script now includes a live terminal cut to the real commit range behind the flipped verdict (§8, 0:40–0:48) — the evidence lives outside our own app on camera, not just in a fallback plan; a judge can point at *any* of the ~14 findings live, not just the ones we rehearsed; raw values sit next to every verdict so it's checkable, not asserted.

**Risk: bidirectional fixes read as scope creep or feel risky to a skeptical judge ("you're rewriting Figma?").** *Mitigation:* `update_source` never writes to Figma — it always renders a drafted, human-readable proposal that goes through the same Approve/Dismiss audit trail as a code fix, and we say so explicitly on camera.

**Risk: over-scoping the input matrix.** *Mitigation:* the scope line in §7 is fixed; every additional input format (live Figma API, styled-components, multiple CSS frameworks, screenshot diffing, a general interaction-state framework beyond the one focus/hover contrast rule) is explicit backlog.

**Stretch goals (only after the core is rock-solid):** live Figma REST/Variables pull as an on-stage flourish, paired with a webhook or nightly re-snapshot so the cached token source doesn't go stale between demos; a real GitHub PR-comment bot (the "<15 seconds after push" moment); `Promote to token` writing back an actual token-file change instead of just the proposal artifact; extending the interactive-surface check to motion/transition tokens; styled-components as a second code target; a nightly Slack drift digest.
