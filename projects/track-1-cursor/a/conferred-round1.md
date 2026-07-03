# Conferred Review — Round 1

**Proposal:** Taste — the design-system vibe check inside Cursor
**Track:** 1 (Cursor) — AI-native design system with taste
**Head-judge conferral of Judge 1 and Judge 2.**

---

## Final scores

| Axis | Judge 1 | Judge 2 | **Conferred** |
|---|---|---|---|
| Novelty | 4.5 | 4.5 | **4.5** |
| Implementation | 5.0 | 4.5 | **4.5** |
| Usefulness / Relevance | 4.5 | 4.5 | **4.5** |
| **TOTAL** | 14.0 | 13.5 | **13.5 / 15** |

---

## Per-axis reasoning

### Novelty — 4.5 (both judges agreed)

No disagreement; affirmed. The proposal's central move is a genuine, memorable insight: **authorship-time inversion** — intervene inside the tool that *causes* the drift (Cursor's own agent), before drift ever reaches a diff, rather than auditing it after the fact on CI or post-merge. That is the sharpest available reading of the brief and the most on-brand move for a Cursor-sponsored track. The **"promote to system" reverse loop** ("a rule engine enforces; taste knows when the rule is stale") is a second distinct insight that goes beyond every example direction in the prompt.

Capped at 4.5 (not 5) because the three-way verdict taxonomy — accidental regression / intentional redesign / platform constraint — is lifted almost verbatim from the track's example directions, and the IDE-linter substrate (save hook → underline → hover → quick-fix) is familiar. The originality lives in the two framing inversions, not the classification core. Both judges reached this independently; settled at **4.5**.

### Implementation — 4.5 (resolving Judge 1's 5 vs Judge 2's 4.5)

This is the only axis in dispute, and it is a narrow one — both judges call the plan "exceptionally concrete." What tips it to 4.5:

**Why it is nearly a 5 (Judge 1's case, which is largely correct):** The architecture is unusually specific and technically sound — correct VS Code extension surface (`onDidSaveTextDocument`, `createDiagnosticCollection`, `registerHoverProvider`, `registerCodeActionsProvider`), a correct and *current* Anthropic API stack (`claude-opus-4-8`, `cache_control` ephemeral prompt caching with the right ~0.1x cache-read economics, `output_config` json_schema structured outputs, adaptive thinking, 1M context, streaming, optional fast mode), and — decisively for a live hackathon demo — a **deterministic-detector / LLM-judgment split** that guarantees the underline always fires on camera regardless of model latency. Judge 2 independently verified every API claim against the authoritative reference and found all correct; that is a strong, concrete signal, not a vibe. The real/scoped/cut scope table and the day-by-day plan are honest and correctly timeboxed. A capable team could clearly ship this.

**Why it is not a clean 5 (Judge 2's case, which I verified and adopt):** The rubric reserves 5 for a demo a team could "clearly ship" with no notable gaps, and the implementation axis explicitly rewards *honest real-vs-mocked scope* and a *working* 60-second demo. Two real defects sit on the proposal's most important beat:

1. **Verified numeric inconsistency on the punchline.** At 0:08–0:20 the seeded agent writes `padding: 13px` (line 107); at 0:45–0:58 the promote verdict says "This 12px step appears in 3 new components... promote it as `--space-3` (12px)" (line 110). 13px and 12px cannot both be the hovered value — the closer beat is internally incoherent as written. I confirmed this directly in the script. Judge 1 did not catch it; Judge 2 did. On the single beat the whole pitch rests on, this is a notable gap.
2. **Undisclosed pre-seeding dependency.** The "appeared in 3 new components this week" verdict requires the drift ledger to be pre-seeded (dated commits / prior 12px occurrences). The honest-scope section (§7) is otherwise exemplary — it discloses the seeded repo, the committed `tokens.json`, and the cut items — but it omits *this specific* dependency, which is exactly the kind of thing that section exists to surface. Both judges' fix lists independently call for disclosing it, which confirms it is a genuine hole in the "honest scope" the axis rewards, not a nitpick.

Both defects are one-line fixes, and a revised draft that fixes them would earn a 5. But scoring the proposal *as written*, a 5 (no notable gaps) is not defensible when the flagship beat has a verified inconsistency and an undisclosed dependency. Judge 2's 4.5 is the fairer read. **Resolved to 4.5**, leaning on the concrete verification rather than splitting the difference.

### Usefulness / Relevance — 4.5 (both judges agreed)

No disagreement; affirmed. The proposal is dead-on the track's core: drift detection, reconciliation (one-click token fix + promote-to-system), and **designer-engineer alignment without a sync meeting** via a visible `tokens.json` source of truth. Crucially it demonstrates *taste as restraint* — the iOS safe-area platform-constraint case shows the system knows when **not** to fire, which is the hardest and most convincing part of the brief. Target user (Priya, design engineer, human bottleneck between four vibe-coding squads) is credible, and the industry grounding (Figma Variables/Tokens Studio → W3C tokens → Style Dictionary → visual-regression → human triage) is accurate.

Capped at 4.5 because the track statement asks for reasoning across a product's "visual **and interactive** surface," and the proposal leans almost entirely on **visual/token drift on a single file per save** — interactive-surface drift (motion durations, focus/hover/disabled states) and genuine cross-surface/holistic reasoning are thin. A residual "it's just an IDE linter" perception risk remains. Both judges landed here independently; settled at **4.5**.

---

## Where the judges differed and how it was resolved

- **Only real divergence: Implementation (5 vs 4.5).** Judge 1 scored on the strength of the architecture, API correctness, and buildability — all valid. Judge 2 scored the same strengths but docked half a point for a demo-script numeric inconsistency and an undisclosed pre-seeding dependency. I read the proposal to adjudicate, **confirmed the 13px/12px inconsistency (lines 107 vs 110) and the omission in §7**, and resolved to **4.5**: a 5 requires no notable gaps, and a verified incoherence on the punchline beat plus a hole in the "honest scope" the axis explicitly rewards are notable. This is a decision on evidence, not a mechanical average.
- **Novelty and Usefulness:** identical (4.5 / 4.5) with substantively identical reasoning; affirmed without change.
- **Net effect on total:** conferred **13.5/15**, matching Judge 2. The gap between the judges was one defensible half-point on one axis, and the concrete verification favored the lower call.

---

## Consolidated prioritized TOP FIXES

1. **Fix the punchline numeric inconsistency (highest priority — it is the flagship beat).** Make the emergent-pattern padding consistent end-to-end: the agent writes `padding: 12px` and the verdict promotes `--space-3: 12px`. (If you deliberately want two paddings — an off-grid 13px *regression* plus a recurring 12px *promotion* — script them as two clearly distinct underlines so nothing reads as self-contradiction on camera.)
2. **Add one interactive / cross-surface beat** to answer the track's "visual **AND** interactive surface" and kill the "just a visual-token linter" critique — the single highest-leverage usefulness fix. E.g. a raw transition/motion-duration off the motion scale, or an un-tokenized focus/hover/disabled-state color, each with its own verdict. Strongest version: a true cross-file "same token drifted in 3 files this session" claim to demonstrate holistic reasoning, not per-file linting.
3. **Disclose the drift-ledger pre-seeding in §7, and specify the promote heuristic.** State plainly that the ledger is pre-seeded (dated commits / prior occurrences) so "appeared in 3 new components this week" fires deterministically — this turns a hidden dependency into demonstrated honesty. Then specify the occurrence threshold + time window **and the guard that distinguishes an emergent convention from a repeated mistake**, so the promote punchline reads as designed rather than as institutionalizing drift.
4. **Show restraint and the designer half in the 60-second script.** Add a ~3s beat where a coherent system-wide change is correctly **NOT** flagged (intentional-redesign / iOS platform-constraint) — precision is the most convincing proof of taste, and the current script only ever shows the tool firing. Add ~2s of a `tokens.json` diff being approved so "designers and engineers aligned without a meeting" is *demonstrated*, not asserted.
5. **Ground or drop the 94% confidence number.** Either compute confidence from contrast delta + token-distance + git recency (and say so), or remove the fabricated percentage from the verdict card so nothing on screen looks invented.
6. **De-risk the live model call on camera.** Script the exact Cursor agent prompt that reliably emits the seeded drift, with a typed fallback (noting the deterministic detector fires identically either way), and specify an explicit latency-threshold fallback that renders the cached verdict for the seeded case if the live call is slow/unavailable.
7. **Preempt "it's just a linter" and clarify the streaming mechanic.** Name closest prior art (Stylelint token plugins, design-lint, Tokens Studio linting) and state precisely what they can't do (grounded three-way judgment + promote loop). Separately, clarify how the `reasoning` field streams live to the hover card under a strict `json_schema` output (stream reasoning first, or parse partial JSON).

---

## FINAL TOTAL: **13.5 / 15**

A strong, near-top-tier proposal: a genuinely novel authorship-time inversion with a standout promote-to-system loop, an exceptionally concrete and API-accurate build plan, and dead-on relevance including the hard "taste as restraint" case. Held just below the top by a verified numeric inconsistency on the punchline beat, an undisclosed pre-seeding dependency, and thin coverage of the track's interactive surface — all fixable in a revision, which would credibly push this to 14.5+.
