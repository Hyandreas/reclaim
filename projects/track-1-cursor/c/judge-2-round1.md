# Judge 2 — Round 1 Review: "Taste"

## TOTAL: 13.5 / 15

A strong, well-revised proposal that is excellent on usefulness and implementation and good-but-not-striking on novelty. It sits at the top of the typical first-draft band; the ceiling is held down by a taxonomy handed to it by the track prompt and by one ambition risk in the buildable plan.

---

## NOVELTY — 4.0 / 5

The core three-way classification (accidental regression / intentional redesign / platform constraint) is **taken almost verbatim from the track's own example direction** ("classifies diffs as intentional redesign vs accidental regression vs platform constraint and drafts fixes"). That is the single biggest cap on this axis — the foundational idea was given to the team, so it cannot score as "strikingly original."

What lifts it above "expected" are three genuine insights layered on top:
- **Completion as a distinct action, not just a label.** Reframing the taxonomy as a *router* that triggers three different actions — and specifically the "fan out and finish the half-done migration across the whole library" action — is a real, memorable idea. The claim that "detect drift" is crowded but "complete an in-flight redesign in one click" is empty is credible, and the grid-of-components-snapping-into-alignment is a strong, sound-off demo beat.
- **The dual-use `.cursor/rules/design-system.mdc`.** One file that is both the rubric the LLM judge scores against *and* the instruction set the Cursor agent follows to fix it — so judge and fixer can't disagree about "correct" — is an elegant, non-obvious Cursor integration.
- **Restraint as a feature.** A confident "this is fine, it's a platform constraint" verdict directly answers the track's literal question ("does it have taste?") and is what separates a reviewer from a linter.

Why not higher: propagating a known-good change across N more files is a fairly natural agentic extension once you already have the classification, and the dual-use `.mdc`, while clever, is a modest structural trick. The concept is well-packaged rather than conceptually surprising.

## IMPLEMENTATION PLAN — 4.5 / 5

This is the proposal's strongest axis. The architecture is concrete and technically sound end-to-end: a hand-rolled TS state machine (WATCH → DIFF → BUILD-EVIDENCE → JUDGE → ROUTE → {FIX|MIGRATE|APPROVE} → VERIFY → LOG) with named, on-screen steps; Playwright + pixelmatch/odiff for capture and cheap localization before paying for a vision call; a real token dependency graph over W3C DTCG / Tokens Studio JSON; and Cursor as genuinely load-bearing remediation with an Anthropic-SDK tool-use fallback.

I verified the Claude API specifics against the current reference and they are accurate — not hand-waved: `claude-opus-4-8` and `claude-sonnet-5` are real model IDs; `thinking: {type: "adaptive"}` is the correct current thinking config for Opus 4.8 (the deprecated `budget_tokens` would 400); `output_config.effort: "high"` is the correct nesting; `output_config.format` is the right structured-outputs parameter; and both Opus 4.8 and Sonnet 5 support vision + tool use. Getting these right signals the team understands the real API surface.

The scoping discipline is exemplary: an honest real-vs-mocked table, "nothing in the judged 60 seconds waits on a network call," a **non-negotiable single closed loop frozen by end of Day 1**, cached artifacts for instant replay, and a layered risk list (venue wifi, Cursor CLI flaking, classifier misfire, screenshot latency) each with a specific mitigation.

Why not 5: the surface area is large for two days — Playwright capture, pixel diff, a real token→CSS→component→state dependency graph *with git-blame and cross-component precedent*, a vision+tool-use judge, single-file FIX, multi-file MIGRATE, the grid-snap UI, the verify loop, the canvas, and the Drift Timeline. Two specific soft spots: (1) the **evidence/dependency graph** is the least-specified "real" component and is non-trivial even on a seeded repo — no concrete parser is named; and (2) **MIGRATE is simultaneously the demo centerpiece and the riskiest Day-2-AM item** (multi-file Cursor agent + grid-snap), and the described SDK fallback is framed around FIX — the grid-snap UI's data source when the live multi-file agent flakes isn't spelled out.

## USEFULNESS / RELEVANCE — 5.0 / 5

Dead-on the track statement and clearly valuable. It is literally named "Taste" and answers the prompt's framing question ("you asked; here it is"); "we didn't build a linter, we killed the sync meeting" maps directly to the track's "without a synchronization meeting"; and it hits the exact example direction and then exceeds it. The target users are real and well-chosen (DesignOps / design-engineering leads at 20–200-person orgs, OSS design-system maintainers who run standing reconciliation meetings), and the WCAG-contrast / ADA-exposure angle adds concrete, provable value ("3.1:1 → 4.6:1, PASSED") rather than a vibes-based claim. The completion feature is genuine user value, not just a stage trick — half-finished migrations are a real, recurring pain. The only mild caveat is that the judged demo runs on a seeded repo (arbitrary-repo generalization is explicitly out of scope), but that is a defensible demo-scope decision, not a limitation of the concept's usefulness.

---

## CONCRETE STRENGTHS
- **Correct, current Claude API usage** (adaptive thinking, `output_config.effort`, structured outputs, real model IDs, vision+tool-use) — technical soundness is real, not decorative.
- **Cursor is load-bearing**, and the dual-use `.mdc` is an elegant, on-theme integration that also guarantees judge/fixer agreement.
- **The completion beat** is a memorable, sound-off demo centerpiece and a defensible "new category" claim.
- **Exemplary buildable-in-2-days discipline**: frozen Day-1 MVP, honest real-vs-mocked, 100%-local critical path, cached replay, and specific fallbacks.
- **Evidence-grounded verdicts** (token name, usage count, git-blame line, cross-component precedent) plus **restraint** and **inline human override** together make the "taste" claim defensible rather than gimmicky.

## WEAKNESSES / GAPS
- **Novelty is capped by the track prompt**: the taxonomy is the example direction, so the originality rests entirely on the actions (propagate/restraint) and the `.mdc` trick.
- **The evidence graph is under-specified** — the one "real" component whose difficulty is glossed. No parser/approach named; building a credible token→component→state graph with git-blame is real work.
- **MIGRATE is the riskiest beat but also the headline** — it lands Day 2 AM, and the fallback story is written for FIX. If the multi-file Cursor agent flakes, the centerpiece (grid-snap + migration PR) has no explicitly described deterministic path.
- **The ACCIDENTAL-vs-INTENTIONAL boundary is where "taste" is won or lost, and the signal isn't specified.** Everything rests on the model reliably distinguishing "5-of-16 components changed = intentional-but-unfinished" from "5-of-16 = accidental drift," yet the proposal doesn't say what evidence tips that call.
- **No stated guardrail against a wrong auto-migration** — a false "INTENTIONAL → migrate all" could open an incorrect 12-file PR; human control is mentioned but MIGRATE-gating isn't made explicit.

## PRIORITIZED FIXES (to raise the score)
1. **(Novelty +, biggest lever) Make the classifier's hard call the star.** Plant one genuinely ambiguous scenario (a partly-consistent change that a naive consistency threshold would misfile) and show the judge resolving it via a *non-obvious* signal. This converts "packaged the example well" into "demonstrated real taste," which is the only way novelty moves toward 4.5–5.
2. **(Implementation +) Specify the evidence graph concretely and bound it.** Name the parser (e.g., PostCSS/AST for CSS custom properties + `ts-morph` or a scoped regex over the seeded Storybook source) and state that the graph is built only over the seeded repo. This removes the one component whose buildability currently reads as assumed.
3. **(Implementation +) De-risk the MIGRATE centerpiece.** Pull a minimal MIGRATE into the Day-1 frozen path *or* pre-cache the migration diff so the grid-snap replays deterministically, and explicitly extend the SDK fallback (and the grid-snap's data source) to the multi-file case — not just FIX.
4. **(Novelty/Implementation +) State the ACCIDENTAL-vs-INTENTIONAL signal.** Spell out what the model weighs at that boundary (consistency ratio across the family, git co-commit / same-author-same-PR, semantic token match) so the "taste" claim is auditable, and plant a case that would fool a threshold-only tool.
5. **(Usefulness/trust +, small) Make the MIGRATE guardrail explicit.** One line that "Finish this redesign" is gated behind explicit human confirmation before any multi-file PR opens — this hardens the trust and compliance narrative you already lean on.
