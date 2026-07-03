# Judge 1 — Round 1 Review: "Taste"

## TOTAL: 13.5 / 15

A polished, unusually self-aware proposal that lands dead-on the track statement and pairs a strong, honestly-scoped implementation plan with one genuinely creative differentiator (completion/propagation). Its ceiling is novelty: the three-way classifier at its core is verbatim the track's own example direction, so the originality rests almost entirely on the "finish the migration everywhere" beat and the `.mdc` dual-use insight. Excellent on buildability and relevance, with a novelty gap that keeps it just out of the top band.

---

## NOVELTY — 4 / 5

The foundational mechanic — classifying a visual diff as *accidental regression vs. intentional redesign vs. platform constraint and drafting fixes* — is quoted almost word-for-word from the track's example directions. Built on that alone, this would be a 3 (solid but expected). Two real insights lift it above that:

1. **Completion as a category.** Reframing detection (a solved space: Percy/Chromatic) into *propagation* — "this redesign was applied to 5 components and is intentional; here are the 11 that still haven't been migrated, do them all in one click" — is a genuine, well-argued insight. Gating the propagate action on the taste classification is the actual novel move, and the grid-snap visual is a memorable, camera-ready centerpiece no shipping tool demonstrates.
2. **The `.cursor/rules/design-system.mdc` dual-use.** One artifact serving as both the rubric the judge scores against *and* the instruction set the fixer follows is an elegant, non-obvious Cursor integration — "the judge and the fixer can never disagree about what correct means." That is a real design insight, not decoration.

Why not higher: the skeleton is the handed-to-you example, and "propagate a token change across a component family" is adjacent to existing codemod/token-migration tooling; the originality is the *gating* and the *packaging*, which are incremental (if clever) rather than strikingly original. "Restraint as a feature" is nice but is itself part of the example (the platform-constraint bucket). Strong, memorable, but not 5-level original.

## IMPLEMENTATION PLAN — 4.5 / 5

One of the most concrete and honest plans I could ask for at a hackathon. Specific, coherent stack (TS monorepo, Next.js + SSE canvas, Playwright capture, pixelmatch/odiff for cheap pre-vision localization, seeded Storybook target, SQLite/JSON run-log). A real agentic flow with named, on-screen-traceable steps (WATCH → DIFF → BUILD-EVIDENCE → JUDGE → ROUTE → {FIX | MIGRATE | APPROVE} → VERIFY → LOG). Cursor is genuinely load-bearing (real agent editing real files, real commit/PR on camera), which is exactly what the track wants. The evidence/grounding layer (DTCG / Tokens Studio JSON parsed into a token→CSS-var→component→state dependency graph with usage counts and git-blame) is what makes the "taste" auditable rather than vibes, and it's realistic to build. Risk handling is above average: the Cursor-CLI-flaking mitigation via an Anthropic-SDK `Edit`/`Write` fallback *driven by the same `.mdc`* is smart, as is freezing one deterministic closed-loop scenario by end of Day 1. The real-vs-mocked table is refreshingly honest (real capture/diff/graph/classification/edits/verify; curated seed repo; explicitly out-of-scope Figma OAuth, GitHub webhooks, arbitrary repos).

Two things keep it off a 5. First, an internal tension: the plan asserts the judged 60 seconds has "zero external API in the critical path… 100% local," yet also lists "real Claude classification" and "real Cursor agent edits" as on-path — both are network calls. The reconciliation is presumably cache-and-replay of genuinely-real results, which is legitimate demo practice, but the proposal should say plainly whether the recorded minute is live or a replay of pre-computed real runs. Second, the centerpiece — 11–12 components reliably snapping into alignment via a real multi-file agentic migration — is the hardest thing here to make clean and repeatable, and the entire "wow" rests on it; even seeded and cached, it needs one flawless generated take, and the plan crams MIGRATE + APPROVE + canvas + timeline into Day 2. De-risked well, but it is the load-bearing risk.

## USEFULNESS / RELEVANCE — 5 / 5

As on-statement as a submission can be: it directly implements the track's named example, and it explicitly answers the track's central question ("does it have taste?") with grounded, cited evidence rather than keyword matching. The alignment-without-a-sync-meeting framing is nailed literally ("Zero sync meetings"). The target user is crisp and real (design-eng/DesignOps lead at a 20–200-person org, or an OSS design-system maintainer — Polaris/Spectrum/Atlassian genuinely run standing reconciliation meetings). The value is concrete and layered: engineers get the fix *and* the finished migration; designers drop manual QA syncs; and the WCAG-AA contrast angle turns "nice-to-have consistency" into "measurable compliance/legal-exposure" — a strong, defensible impact hook that the verify step (3.1:1 → 4.6:1, PASSED) proves on screen. The one honest caveat — demonstrated value is on a seeded repo, with real-world payoff depending on the out-of-scope generalization to arbitrary repos — is an implementation-scope matter, not a relevance gap. On concept fit and user value, this is maximal.

---

## STRENGTHS (concrete)

- **Perfect track fit + directly answers "does it have taste?"** with auditable, on-screen evidence (token name, usage count across the dep graph, git-blame line, cross-component precedent).
- **The completion/propagation beat** is a real differentiator and a genuinely memorable, sound-off-readable demo centerpiece (grid of stale components snapping into alignment → real migration PR).
- **`.mdc` dual-use** makes Cursor load-bearing and structurally guarantees judge/fixer agreement on "correct."
- **Honest, de-risked plan**: frozen Day-1 closed-loop MVP, cached artifacts for replay, explicit real-vs-mocked table, explicit out-of-scope list.
- **Excellent failure handling**: SDK fallback on the same constitution; restraint (APPROVE) call to fight the false-positive death that kills linters; inline human override with visible model update.
- **Compliance framing** (WCAG AA contrast, proven restored by the verify loop) elevates impact from cosmetic to measurable.

## WEAKNESSES / GAPS (concrete)

- **Novelty ceiling**: the core classifier is the track's own example; the proposal's originality is concentrated in two features (completion, `.mdc` dual-use). If those don't land visually, it reads as "the obvious solution, executed well."
- **Critical-path inconsistency**: "zero external API / 100% local" vs. "real Claude + real Cursor edits" are in tension; unclear whether the recorded minute is live or a replay of cached real runs.
- **Centerpiece execution risk**: reliable multi-file agentic migration across ~12 components is the hardest and most demo-defining step, and it's back-loaded into Day 2.
- **Scripted-feel risk**: three pre-planted scenarios; the "judge can click anything / graph is queryable" defense is asserted but not demonstrated as a beat in the 60-second script.
- **Packed timeline in the video**: fix+verify in ~16s, migration in ~14s, platform+override+summary in ~8s — risks feeling rushed and hard to read silently, diluting the very centerpiece that carries novelty.
- **Unverified API specifics**: `thinking: {type:"adaptive"}`, `output_config.effort:"high"`, structured-output `format`, and the exact model IDs are stated as fact; these should be confirmed against the current Anthropic API so a live run doesn't error on a bad parameter.

## PRIORITIZED FIXES (to raise the score)

1. **Make the centerpiece breathe and prove it's not scripted (biggest lever).** Give the completion beat more of the 60 seconds; trim or overlap the platform-constraint/override beat. Add one *live, unplanted* classification (a judge-clicked component off the walked path) to convert the "graph is queryable" claim into a visible robustness proof — this simultaneously attacks the scripted-feel risk and strengthens the "it has taste" story. (Novelty + Implementation)
2. **Resolve the live-vs-replay ambiguity in one sentence.** State explicitly that the recorded minute replays *genuinely-real, pre-computed* classifications/edits for reliability, or that it runs live with cached fallback — and make the run-log/timeline show real timestamps so "real, just cached" is credible. (Implementation)
3. **Lean the novelty framing entirely onto completion.** Explicitly demote detection/classification to "table stakes (Percy solved this)" in the pitch and spend the differentiation on the propagate action doing something detection tools structurally *cannot* — ideally show the migration touching interactive state, not just border-radius, so it's clearly more than a find-and-replace codemod. (Novelty)
4. **Show a borderline/low-confidence case that defers to the human.** One verdict where confidence is low and Taste asks rather than acts would prove judgment (and non-overreach) far more than three high-confidence hits, directly reinforcing "taste, not keyword-matching." (Novelty + Usefulness)
5. **Pre-generate and freeze the 12-component migration take now, via the SDK fallback path**, so the centerpiece never depends on a live Cursor call landing cleanly; keep the live Cursor run as the on-camera default with the frozen take as the guaranteed replay. (Implementation)
6. **Verify the exact Anthropic API parameter names/values and model IDs** before demo day so no live call fails on a stale/incorrect field. (Implementation)
