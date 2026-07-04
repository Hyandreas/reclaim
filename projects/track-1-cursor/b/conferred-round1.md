# Conferred Review — Round 1

**Project:** Driftline — the design-system reviewer that never gets tired
**Track:** 1 (Cursor) — AI-native design system that reasons about consistency across visual and interactive surface
**Head-judge conferral of Judge 1 and Judge 2**

| Axis | Judge 1 | Judge 2 | **Conferred** |
|---|---|---|---|
| Novelty | 4.0 | 4.0 | **4.0** |
| Implementation | 4.5 | 4.5 | **4.5** |
| Usefulness | 4.5 | 5.0 | **4.5** |
| **Total** | 13.0 | 13.5 | **13.0 / 15** |

---

## Final per-axis scores with reasoning

### Novelty — 4.0
Both judges landed here independently, with converging reasoning, and I concur. The proposal itself says the quiet part out loud (§5): a token-vs-code diff engine with a redesign/regression/platform-constraint taxonomy *is* the brief's own named example, so the spine cannot carry a novelty claim. What genuinely lifts it above the obvious build is real and memorable — (a) verdicts that **flip on screen** when evidence overturns the naive read, distinguishing reasoning from a lookup table; (b) **bidirectional reconciliation** that will tell the *designer* they're wrong via a drafted token-change proposal, not just the engineer; and (c) **recurrence-as-vote** ("the same off-token value in three unrelated components is the codebase voting for a token that doesn't exist yet"). These are insightful and demo-worthy but incremental on top of a scaffold the brief hands you — there is no category-defining reframe. The honest ceiling both judges identified is the same one I see: the "taste" layer is ultimately threshold-driven rules (migration ratio ≥ 80%, recurrence ≥ 3, corroboration present) with an LLM narrating the rationale. That is a defensible, testable design — but it is not yet a system whose judgment exceeds what its thresholds already decided. 4.0 is fair and unanimous.

### Implementation — 4.5
Unanimous and correct; this is the proposal's standout axis. The stack is concrete and appropriate (TypeScript end-to-end, `ts-morph` walking the real TS AST rather than regex, PostCSS for Tailwind/CSS custom properties, `culori` for CIELAB ΔE and WCAG math, `better-sqlite3` for the audit store, MCP SDK for the Cursor surface). The deterministic-core / bounded-LLM split is the architectural crux: detection is zero-LLM so the model can never invent a delta, and the fix generator is constrained to the scanner's verified byte range, making a hallucinated patch **structurally impossible** rather than merely unlikely. Six individually callable tools, honest real-vs-mocked scope (§7), a midday Day-1 gate on the single riskiest step (Tailwind resolution), and per-milestone fallbacks all signal a team that has actually thought about shipping.

I give particular weight to Judge 1's verification work: all four Anthropic API claims (`claude-opus-4-8`, `thinking: { type: "adaptive" }`, `output_config.format`, `strict: true`) were checked against the current reference and confirmed correct. That substantiates the proposal's "verified, not assumed" claim and effectively closes Judge 2's fix #3 before build even starts (see resolution below). The axis is held from 5.0 by one real thing both judges named: a high ambition-to-time ratio — six tools + a seeded git-history corpus + bidirectional fixes + a dashboard + an MCP wrapper + an audit trail is a large 2-day surface, and residual ts-morph/Tailwind-resolution risk remains even with the midday gate. 4.5.

### Usefulness — 4.5 (the one axis the judges split on)
This is the most literal and complete reading of the track statement I could expect from any plausible build in this track: the interactive surface is a first-class pipeline check rather than a bolt-on (WCAG 2.1 SC 1.4.11 non-text contrast on `hover`/`focus`/`focus-visible`/`disabled`); "keeping designers and engineers aligned" is made *literal* by the bidirectional token-change proposal; the value is framed as budgeted ADA/WCAG legal risk with a specific buyer (a platform/design-systems engineer at a 50–1,000-person org who owns the token pipeline) and a concrete close-out metric ("14 inconsistencies surfaced, 3 fixed forward, 1 flipped and fixed backward, ~40 min of design QA saved on one PR"); and the CI-gate framing means near-zero adoption friction ("ships Monday morning"). On the "clearly valuable to a real user" half of the axis, this is unambiguously a 5.

I resolved the split to **4.5**, siding with Judge 1's specific reasoning over Judge 2's fuller score (detailed resolution below).

---

## Where the judges differed and how I resolved it

### Disagreement 1 — Usefulness: 4.5 vs 5.0 (the only score gap)
Judge 2 scored 5.0, emphasizing that the proposal is dead-on the statement and clearly valuable — specific buyer, legal-risk framing, quantified savings, both surfaces covered. Judge 1 scored 4.5, held from 5 because "interactive coverage is one contrast rule (honestly scoped but narrow)."

**Resolution: 4.5.** The usefulness/relevance axis blends two things — how *squarely* it answers the statement and how *valuable* it is to a real user. On value, I agree with Judge 2 that it is a clean 5. But the track statement makes "visual **and interactive** surface" a co-equal headline pairing, and the proposal answers the interactive half with exactly one rule — a point the team itself concedes twice ("scoped narrowly to one rule … not a general interaction-state framework," §7). A full 5.0 on this axis should have no identifiable gap to point at; here there is one, it is real, and it sits on a clause the statement deliberately foregrounds. The decisive tell is that Judge 1's own usefulness fix ("add one more interaction-state check … so the interactive surface *feels delivered rather than demonstrated*") is cheap, concrete, and would itself move the score to 5.0 — that is the textbook signature of a 4.5 held from 5 by a single small, actionable gap, not a 5 already earned. I therefore adopt Judge 1's score, but on explicitly reasoned grounds rather than by splitting the difference. The total is **13.0**, matching Judge 1.

### Disagreement 2 — a substantive conflict *between the fix lists* (not scores) worth surfacing
The judges' top fixes contain a direct technical contradiction the team must not resolve naively:
- **Judge 1 (Implementation fix)** wants the marquee verdict-flip made **deterministic** — when migration ratio ≥ 80% AND recurrence ≥ 3, compute the "Intentional Redesign" verdict *in code* and let the LLM write only the rationale sentence, so the hero beat is 100% reproducible when a judge points at it live.
- **Judge 2 (Novelty fix)** wants a case where the taste layer does a job the deterministic signals **cannot** — an *ambiguous* finding where migration ratio and commit corroboration conflict, forcing the classifier to genuinely reason to a verdict thresholds alone can't reach (the lever to push novelty past 4.0).

Taken literally, one says "take the LLM out of the flip decision" and the other says "put the LLM in charge of a decision it can't derive from thresholds." **Resolution:** these are not mutually exclusive — they apply to *different findings*, and doing both is the strongest move. Make the **marquee** flip deterministic (safe, reproducible hero beat for the 0:17–0:32 money moment), and add **one additional** finding where the two signals genuinely conflict so the classifier must adjudicate — the case that proves the taste layer earns its keep and is the single most credible novelty lever. This synthesis is reflected as items 2 and 3 in the consolidated fix list.

### Point of agreement I am formally closing
Judge 2's fix #3 (verify the exact Anthropic API param shapes before build) is **already satisfied**: Judge 1 verified all four claims against the current reference and they are correct. The team should keep the single pre-build re-check as cheap insurance, but this is no longer an open risk.

---

## Consolidated top fixes (prioritized)

**Priority 1 — Novelty is the capped axis; the two fixes below are the highest-leverage changes.**

1. **Reframe the headline identity around your two genuinely original ideas, and demote the taxonomy to table stakes.** Lead with recurrence-as-token-vote ("the codebase is voting for a token that doesn't exist yet") paired with bidirectional reconciliation — a system that *proposes new semantic tokens from evidence and tells the design side it's wrong* is more original than diff-and-classify. The 4-way taxonomy is the brief's own example; stop letting it front the pitch. (Judge 1 novelty fix — biggest single lever.)

2. **Give the taste layer a job the thresholds cannot do.** Add one finding where migration ratio and commit corroboration **conflict** (e.g., high migration ratio but a code change that landed *before* any token change, or corroboration present at a low ratio), so the classifier must reason to a defensible verdict no threshold rule alone reaches. This directly answers the shared "taste = thresholds + narrator" critique and is the credible path from Novelty 4.0 toward 4.5+. (Judge 2 novelty fix.)

**Priority 2 — Protect the demo; these guarantee the hero beats survive contact with the stage.**

3. **Make the *marquee* verdict-flip deterministic (and pair it with fix 2).** When migration ratio ≥ 80% AND recurrence ≥ 3, compute "Intentional Redesign" in code and use the LLM only for the rationale sentence, so the 0:17–0:32 money beat is 100% reproducible when a judge points at it live. Keep the *one* ambiguous case from fix 2 as the place taste is proven — this resolves the Judge 1 / Judge 2 tension by applying each to a different finding. (Judge 1 implementation fix, synthesized.)

4. **Author the seeded repo's git history on Day 1 with the exact token-change-adjacent-to-code commits the flip case needs, and state the fallback in writing.** The 0:40–0:48 "real `git log` on the exact commit range" credibility beat depends entirely on that history existing and parsing cleanly; commit `blame` parsing is flaky. Declare that migration ratio + recurrence alone can carry the flip verdict if corroboration parsing fails, so the marquee beat can't be sunk by one brittle signal. (Judge 2 implementation fix.)

5. **Write an explicit cut-order across the six tools, and specify the midday-gate failure branch concretely.** State that the two hero beats (verdict-flip and interactive-state) are guaranteed shippable and that lower-priority pieces (the MCP wrapper, then the `update_source` branch) are the first cut under time pressure. For the Day-1 Tailwind-resolution gate, name the fallback: drop `bg-[#hex]` arbitrary-value resolution, fall back to CSS-custom-property + Tailwind-palette-class resolution only, and keep the deterministic list intact. Together these cap the ambition-to-time risk that holds Implementation at 4.5. (Merges Judge 2 cut-order fix + Judge 1 gate-fallback fix.)

**Priority 3 — Convert Usefulness from 4.5 to 5.0; cheap, high-return.**

6. **Add one more interaction-state check so the "interactive surface" half feels delivered, not just demonstrated.** Focus-ring visibility/offset or hover-state contrast is nearly free — the pipeline already tags interactive variants. This is the specific, single change that closes the one gap holding Usefulness at 4.5. (Judge 1 usefulness fix — the direct lever to 5.0.)

7. **Land the designer-facing artifact where designers actually work, and pre-empt the messy-Figma objection.** Render the token-change proposal in a paste-ready format for the designer's tool (Figma comment / Linear / GitHub issue) and show that in the 0:17–0:32 beat — turning "we generate a card" into "the designer receives it where they live." Add one sentence acknowledging that orgs without a clean W3C token export need a one-time normalization step, and that the pipeline-owning buyer is exactly who can provide it — closing the main adoption gap a judge might poke at. (Merges Judge 1 + Judge 2 usefulness/adoption fixes.)

> Already resolved in conferral (no action beyond a final pre-build sanity re-check): the Anthropic API param shapes (`thinking`, `output_config.format`, `strict`, model id `claude-opus-4-8`) were verified correct against the current reference.

---

## Final total

**Novelty 4.0 + Implementation 4.5 + Usefulness 4.5 = 13.0 / 15**

A polished, unusually self-aware, demo-ready proposal whose implementation rigor is its strongest suit. The path to a higher score is narrow and clear: novelty is the capped axis, and the team is one reframe (lead with recurrence-as-token-vote + bidirectional reconciliation) and one genuinely ambiguous, thresholds-can't-decide finding away from 4.5 there; usefulness is a single cheap interaction-state check away from 5.0.
