# Judge 1 — Round 1 Review: "Taste"

## TOTAL: 13.5 / 15

**Novelty 4.0 · Implementation 4.5 · Usefulness 5.0**

A polished, unusually self-aware proposal that lands dead-on the track statement and pairs one of the tightest, most honestly-scoped 2-day plans I've read with a genuinely creative differentiator (redesign *completion*). It has visibly absorbed prior feedback: the live-vs-replay question is now answered plainly, the API surface is stated as verified, the centerpiece is de-risked to a Day-1 frozen slice, and a fourth genuinely-ambiguous ASK case now proves the system withholds judgment instead of force-fitting a verdict. Its ceiling is novelty: the classifier spine is the track's own example direction almost verbatim, so originality rests on the completion beat, the computed boundary signals, the ASK/refusal feature, and the `.mdc` dual-use — clever, layered additions rather than a strikingly original core.

---

## NOVELTY — 4.0 / 5

The proposal is refreshingly honest that its foundational mechanic — classify a diff as *accidental regression vs. intentional redesign vs. platform constraint and draft fixes* — is quoted almost word-for-word from the track's example directions, and it refuses to lean on that for originality. Four to five real additions sit on top, and they mostly earn their claims:

1. **Completion as a category.** Reframing detection (a solved space: Percy/Chromatic) into *propagation* — "this redesign landed on 5 components and is intentional; here are the 11 still on the old pattern, finish them in one click, gated behind a human confirm" — is a genuine, well-argued insight and a memorable, sound-off-readable centerpiece (the grid snapping into alignment → a real migration PR).
2. **Named, computed boundary signals as cited evidence.** Consistency ratio across the sibling family, git co-commit/same-author clustering, and semantic token-distance — fed to JUDGE as structured numbers the model must cite — is a concrete, auditable answer to "what is the taste, actually," and it's the difference between a real classifier and a threshold-only linter.
3. **The `.cursor/rules/design-system.mdc` dual-use.** One artifact as both the rubric the judge scores against *and* the instruction set the fixer follows is an elegant, non-obvious Cursor integration ("judge and fixer can never disagree about what correct means").
4. **Refusal / ASK as a first-class verdict** when the signals disagree — a sharp, on-statement answer to "does it have taste?" (a reviewer with taste knows when *not* to decide).

Why not higher: the skeleton is the handed-to-you example; the three signals, while well-framed, are close to the natural engineering answer any serious team reaches once it sits down to build the classifier; "propagate a token change across a family" is adjacent to existing codemod/token-migration tooling, so the originality is the *gating* and *packaging*, which are incremental (if clever). Many strong layers on a borrowed spine — a solid, memorable 4, not a strikingly-original 5.

## IMPLEMENTATION PLAN — 4.5 / 5

One of the most concrete and honest plans I could ask for at a hackathon, and it has closed the gaps from the prior round. The stack is specific and the tools are the *correct* real ones: Playwright + pixelmatch/odiff for render-and-localize, **PostCSS AST walk** for CSS custom-property resolution, **ts-morph** over component source for token consumption, DTCG / Tokens Studio JSON for the token format, Next.js + SSE for the live canvas, SQLite/JSON run-log for state. The agentic flow is a named, on-screen-traceable state machine (`WATCH → DIFF → BUILD-EVIDENCE → JUDGE → ROUTE → {FIX | MIGRATE→CONFIRM→ACT | APPROVE | ASK} → VERIFY → LOG`). Cursor is genuinely load-bearing — real `cursor-agent` headless CLI for single-file FIX, the Cursor Background Agent's native PR-on-completion for multi-file MIGRATE, and the dual-use `.mdc` — exactly what the track wants. The evidence graph (token → CSS var → component → interactive state, annotated with usage counts and git blame, from which the three signals are computed) is what makes "taste" auditable rather than vibes, and it's realistic to build on a seeded repo.

Crucially, the two prior implementation knocks are resolved: **live-vs-replay is now stated plainly** (a genuinely-real end-to-end run, timestamped in the run-log, replayed deterministically, with an offer to run live on an unplanted component on request), and the **centerpiece is de-risked to Day 1** (a frozen 2-component MIGRATE slice proves the mechanism before Day 2 scales it to 11), with a single Anthropic-SDK `Edit`/`Write` fallback that explicitly covers the multi-file case and feeds the *same* grid-snap UI. Risk handling is genuinely above average, and the API surface is stated as verified against current docs (adaptive thinking, structured outputs, the `budget_tokens`-would-400 note).

Two things keep it off a 5. First, **breadth**: even though replay means only one golden run must succeed, the team still has to *build* Playwright capture + PostCSS + ts-morph + git-history signals + Claude vision/tool-use + Cursor CLI + Background Agent + Next.js SSE canvas + timeline + four credible scenarios in two days — the single largest residual risk, well-mitigated but real. Second, a small hole in the otherwise-airtight fallback: the SDK path emits the edit list and drives the grid-snap, but the headline "migration **PR** opens on camera" beat depends on the Cursor Background Agent — the fallback isn't described as able to open the PR itself (it would need git branch/commit + `gh pr create` plumbing), so the PR-open moment has thinner backup than the visual does.

## USEFULNESS / RELEVANCE — 5.0 / 5

As on-statement as a submission can be: it directly implements the track's named example and explicitly answers the track's central question ("does it have taste?") with grounded, cited evidence — token name, usage count across the dependency graph, git-blame line, cross-component precedent — rather than keyword matching. The alignment-without-a-sync-meeting framing is nailed literally ("Zero sync meetings"), and the concept covers the interactive surface in its architecture (token → CSS var → component → *interactive states*, touch targets, "past its fortieth state"), not just the visual. The target user is crisp and real (design-eng/DesignOps lead at a 20–200-person org, or an OSS maintainer — Polaris/Spectrum/Atlassian genuinely run standing reconciliation meetings). The value is concrete and layered: engineers get the fix *and* the finished migration; designers drop manual QA syncs; and the WCAG-AA contrast angle turns "nice-to-have consistency" into "measurable compliance / legal exposure" — a strong, defensible impact hook the verify step proves on screen (3.1:1 → 4.6:1, PASSED). The one honest caveat — demonstrated value is on a seeded repo, with generalization to arbitrary repos out of scope — is an implementation-scope matter, not a relevance gap. On concept fit and user value, this is maximal.

---

## STRENGTHS (concrete)

- **Perfect track fit + directly answers "does it have taste?"** with auditable, on-screen evidence and named computed signals (consistency ratio, co-commit clustering, token-distance) rather than a vision model's gut feel.
- **The completion/propagation beat** is a real differentiator and a memorable, sound-off-readable centerpiece (grid of stale components snapping into alignment → real migration PR).
- **ASK / refusal as a first-class verdict**, with a deliberately-planted ambiguous case engineered to trip a threshold-only tool — pre-empts the "three cherry-picked scripted hits" objection and reinforces the taste story.
- **`.mdc` dual-use** makes Cursor load-bearing and structurally guarantees judge/fixer agree on "correct."
- **Honest, de-risked plan**: frozen Day-1 closed-loop MVP *and* a Day-1 2-component migration slice, cached artifacts for replay, live-vs-replay stated plainly, explicit real-vs-mocked table and out-of-scope list.
- **Excellent failure handling**: SDK fallback on the same constitution feeding the identical UI; restraint (APPROVE) call to fight the false-positive death that kills linters; inline human override with visible model update; hard human-confirm gate before any multi-file write.
- **Compliance framing** (WCAG AA contrast, proven restored by the verify loop) elevates impact from cosmetic to measurable.

## WEAKNESSES / GAPS (concrete)

- **Novelty ceiling**: the core classifier is the track's own example; originality is concentrated in the completion beat and a few clever layers. If those don't land visually, it reads as "the obvious solution, executed well."
- **"Interactive surface" is under-demonstrated.** All four planted scenarios are visual (color/contrast, border-radius, touch-target size — a spacing proxy). Nothing exercises a true interactive-behavior drift (focus-ring, hover/disabled state, animation-duration token, state transition), despite the statement naming the interactive surface and the completion beat needing to look like more than a find-and-replace codemod.
- **Breadth risk.** Many real integrations for two days; replay reduces reliability risk but not build-completion risk — you still must build all of it to get one real run.
- **PR-open beat has thinner fallback than the grid-snap.** It leans on the Cursor Background Agent; the SDK fallback produces edits but isn't described as opening the PR itself.
- **Co-commit signal depends on a credibly-seeded git history** (multi-author, multi-PR) that isn't called out as its own Day-1 task — risking the weakest-grounded of the three signals on stage.
- **Decision rule left implicit.** The signals are named but the exact rule that turns them into INTENTIONAL vs. ASK is described qualitatively; making it explicit would harden the "real classifier, not a linter" claim and prove the ambiguous case is engineered to defeat a threshold-only tool.

## PRIORITIZED FIXES (to raise the score)

1. **Add one true interactive-surface scenario** to the planted set (e.g., a focus-ring token drift, a hover/disabled-state inconsistency, or an animation-duration token applied to 5 of 16 components) and make the *completion* beat migrate interactive state, not just border-radius. This is the one prior fix still open; it simultaneously proves the propagate action is more than a codemod (Novelty) and fully covers the "visual **and interactive** surface" of the statement (Usefulness). Highest leverage.
2. **Give the SDK fallback a PR-opening path.** From the same `{file, old, new}[]` edit list, branch + commit + `gh pr create`, so the headline "migration PR opens on camera" beat survives a Background Agent failure — not just the grid-snap. Closes the one hole in an otherwise airtight fallback story. (Implementation)
3. **Show the constitution *learning* on stage.** After a human overrides a verdict or answers the ASK case, show `.mdc` actually gaining a rule/example that flips a *later* verdict within the same 60 seconds. You already log decisions; surfacing "it learned my taste" would push Novelty toward 5 cheaply. (Novelty)
4. **State one concrete decision rule for the signals** (e.g., "consistency ratio ≥ 0.6 AND (co-commit OR token-match) → INTENTIONAL; ratio high but neither → ASK"). An inspectable rule proves the ambiguous case is engineered to defeat a threshold-only tool and hardens the classifier-vs-linter claim. (Novelty + Usefulness)
5. **Budget the seed git-history construction as an explicit Day-1 AM task** (multi-author, multi-PR), since the co-commit signal depends on it; otherwise it risks being the weakest-grounded signal in the demo. (Implementation)
6. **Guard breadth: mark the Drift Timeline dashboard as cut-if-behind.** It's polish, not on the golden path — protecting the one required real run if Day 2 compresses reduces the dominant execution risk. (Implementation)
