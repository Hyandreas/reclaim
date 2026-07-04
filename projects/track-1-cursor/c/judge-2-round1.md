# Judge 2 — Round 1 Review: "Taste"

## Total: 13.5 / 15

A strong, visibly-revised proposal that is excellent on buildability and relevance and genuinely insightful on novelty. It answers the track's "does it have taste?" question more concretely than a naive version of this idea would, it honors Cursor as load-bearing rather than cosmetic, and it has clearly incorporated prior feedback — the accidental-vs-intentional signal is now named and computed, the MIGRATE centerpiece is de-risked into Day 1, the fallback explicitly covers the multi-file case, and an adversarial ambiguous scenario is planted. It stops just short of the 14.5–15 band because the headline taxonomy is the track's own example by the team's own admission, the designer↔engineer *alignment* surface is thinner than the detection/remediation engine, and the one component on the critical path for the whole novelty story (the evidence graph) is the single fragile piece still left without a fallback.

---

## Novelty — 4.5 / 5

The proposal is disarmingly honest that its three-bucket taxonomy (regression / redesign / platform constraint) is "the track's own example direction, almost verbatim," and it explicitly declines to lean on that for the pitch. That admission is the only thing keeping this axis under a 5 — the *spine* was handed to the team. But the layering on top is not packaging; it is real, and it pulls the exact lever needed to demonstrate taste rather than assert it:

- **Completion, not detection, as the centerpiece.** "Finish the in-flight redesign everywhere it hasn't landed yet, in one click, gated behind a human confirm" is a genuinely fresh reframe — it turns the tool from a smarter diff viewer into an actor, and it occupies a feature category no shipping tool (Percy/Chromatic/Stylelint) does. This is the strongest, most memorable idea in the proposal, and the "grid of 11 stale components visibly snapping into alignment, ending on a real Cursor-opened PR" reads with the sound off.
- **A named, computed answer to "what is taste."** The three boundary signals — consistency ratio across the sibling family, git co-commit/same-author clustering, semantic token-distance — are the difference between a real classifier and a threshold-only linter, and JUDGE must cite them as structured facts rather than infer from pixels. This is a crisp, testable answer to the track's central question.
- **Refusal/deferral as a first-class fourth bucket, proven adversarially.** The AMBIGUOUS/ASK verdict ("knows when *not* to decide") is closer to what taste actually means than a system that is confident 100% of the time — and the team plants a case *engineered to fool a threshold tool* (high consistency ratio, no co-commit link, no token match) and shows the system refusing to force a verdict. Demonstrating restraint under conflicting evidence, rather than claiming it, is a sophisticated move and exactly the kind of thing that converts "packaged the example well" into "showed real taste."
- **The `.mdc` dual-use** (same constitution grades the diff *and* drives the fix, so judge and fixer can't disagree about "correct") is an elegant, Cursor-specific integration insight.

What holds it just under 5: the novelty is a set of (excellent) extensions on an example-provided spine, and propagating a known-good change across N files is a fairly natural agentic extension once the classification exists. To reach a clean 5, the surprise needs to live in the spine itself — most credibly by closing the LOG → constitution learning loop *on camera* so the system demonstrably gets more tasteful as it is used (see Fixes).

## Implementation Plan — 4.5 / 5

The proposal's strongest axis and among the most concrete plans I have seen for this track — specific where it matters and honest about scope.

- **Named, real stack throughout:** Playwright + `pixelmatch`/`odiff` for render/localize before paying for a vision call; a PostCSS AST walk for CSS custom-property resolution plus `ts-morph` over component source; DTCG / Tokens Studio JSON as the real token interchange format; Next.js + SSE for the live canvas; SQLite/flat-JSON run-log. A hand-rolled TS state machine with named, on-screen steps (WATCH → DIFF → BUILD-EVIDENCE → JUDGE → ROUTE → ACT → VERIFY → LOG), with a reasoned decision *not* to pull in LangGraph.
- **API diligence that actually checks out.** The proposal stakes credibility on "verified against current Anthropic API docs, not assumed." I checked those claims against the current API surface and they are correct: `thinking:{type:"adaptive"}` is right for `claude-opus-4-8` and the deprecated `budget_tokens` form does return a 400; `output_config.effort` and `output_config.format` are the correct current nesting (the old top-level `output_format` is deprecated); both `claude-opus-4-8` and the `claude-sonnet-5` production-swap ID exist and are active; and vision + tool use + structured outputs coexist in one Messages call. Getting these right is rare and is a real signal the team can ship the JUDGE step as written.
- **Deep, load-bearing Cursor integration:** `cursor-agent` CLI in headless `-p`/`--print` mode for the single-file FIX; the cloud-hosted Background Agent (native PR-on-completion) for multi-file MIGRATE; and the `.mdc` as the shared contract between judge and fixer.
- **Genuinely good risk handling:** every fragile ACT call has an Anthropic-SDK `Edit`/`Write` fallback that emits the *same* `{file, old, new}[]` edit list feeding the *same* grid-snap UI — so the visual centerpiece is identical regardless of which backend fired, explicitly covering MIGRATE, not just FIX. The milestone plan de-risks the centerpiece twice: a 2-component migration proven and frozen by end of Day 1, then *scaled* (not rebuilt) to 11 on Day 2.
- **Honest scope:** real vs. curated vs. explicitly-out-of-scope (Figma OAuth, GitHub webhooks, arbitrary repos) is laid out plainly, and the live-vs-replay section states clearly that the judged 60s is a real, pre-captured run replayed deterministically, with a live-on-request option.

Two things keep it off a flawless 5. First, the **evidence graph is the tall pole and the one un-hedged risk**: the `ts-morph` + PostCSS + git-blame join plus the three computed signals is fiddly, sits directly on the critical path for the entire novelty story ("cite real numbers, not vibes"), and — unlike every ACT-layer call — has no stated fallback if it slips. Second, the **total surface for two days is very ambitious**; the seeded-repo scoping and golden-path replay mitigate this well, but it remains a lot of distinct machinery to stand up.

## Usefulness / Relevance — 4.5 / 5

Squarely on the track statement. It reasons about consistency across the visual *and* interactive surface (components × states × viewports), detects drift, proposes reconciliation (revert and migrate), and is framed explicitly as "we killed the sync meeting." It executes example direction #2 and extends it.

The real-user case is grounded, not hand-waved: named personas (design-engineering lead, DesignOps, OSS maintainer), named orgs that actually run standing reconciliation meetings (Polaris, Spectrum, Atlassian), a compliance edge with teeth (a contrast regression dropping below WCAG AA is real ADA exposure, and the VERIFY loop proves the fix restored conformance — "3.1:1 → 4.6:1, PASSED"), and a failure-mode analysis that shows the team understands *why* real tools in this space fail ("false positives kill lint tools → the restraint call keeps it trustworthy"). The completion feature is genuine user value, not a stage trick — half-finished migrations are a real, recurring pain.

Two things hold it at 4.5 rather than 5. First, the track explicitly names *keeping designers and engineers aligned*, and in practice this is an engineer/CI-centric tool: the designer-facing surface is an inline override control and the ASK prompt, not a genuinely two-sided bridge (there is no designer-intent input, and the DTCG/Figma side is present mainly as a parsed artifact rather than the designer's live half of the contract). Second, value is demonstrated on a seeded repo with arbitrary customer repos explicitly out of scope — a defensible hackathon boundary, but one that bounds the "real user" demonstration to curated conditions.

---

## Concrete Strengths

- **The completion/migration beat** is a category-creating idea with a demo that lands visually and ends on a real Cursor-opened PR.
- **The three computed signals + planted adversarial case** are a concrete, auditable, *testable* answer to "what is taste," and the refusal-under-conflicting-evidence beat demonstrates restraint rather than asserting it.
- **Verified, accurate API specifics** (confirmed against the current Anthropic surface) — a rare credibility signal that the JUDGE step is buildable as written.
- **Airtight ACT-layer risk handling:** unified `{file, old, new}[]` edit list + SDK fallback means the centerpiece visual survives a flaky Cursor call, for MIGRATE as well as FIX.
- **De-risked milestones:** the migration *mechanism* is frozen by end of Day 1, so Day 2 is a scaling task, not a from-scratch bet.
- **Honesty throughout:** real-vs-mocked, live-vs-replay, and what-isn't-novel are all stated plainly, and the MIGRATE guardrail (explicit human confirm before any multi-file PR) is made explicit.

## Concrete Weaknesses / Gaps

- **The evidence graph is the single un-hedged risk on the critical path.** If the `ts-morph`/PostCSS/git-blame join or the three signals are shaky, the "cite real numbers, not vibes" pitch — the whole novelty story — weakens, and it is the one component with no stated fallback.
- **The rule that turns three signals into a verdict + confidence is unspecified.** The signals are computed as structured numbers, but how JUDGE weights/combines them and where the ASK threshold sits is left inside the LLM call. This quietly risks relocating "the taste" back into an opaque model judgment — the exact thing the proposal claims to avoid.
- **The designer↔engineer *alignment* half of the track statement is thin.** In practice this is an engineer/CI tool with a human override; there is no designer-intent affordance.
- **The judged 60 seconds is a deterministic replay.** Honestly disclosed and sensible for a recorded video, but the "Demo 50% — does it actually work" axis is *asserted* live-on-request rather than *shown* live on tape.
- **LOG → constitution is described but never closed on camera.** The run-log is called "future signal for the constitution," yet the demo never shows the system actually getting more tasteful from a logged human decision — a missed chance to prove the "taste" claim dynamically (and the clearest path to lifting novelty to a 5).

## Prioritized Fixes to Raise the Score

1. **(Implementation, highest impact) Give the evidence graph an explicit fallback.** State that if the full `ts-morph`+PostCSS graph slips, the team hand-authors the dependency-graph JSON *and* the three signal values for the four planted scenarios, so JUDGE still reasons over real structured evidence. This closes the one fragile piece on the critical path and would push this axis to a 5.
2. **(Novelty, path to 5) Close the learning loop on camera.** You already LOG accepted/overruled verdicts; show *one* logged human decision visibly updating the `.mdc` constitution so the next classification changes ("treating this pattern as intentional now — written to the constitution"). "The system gets more tasteful as you use it" would put originality into the spine, not just the layering.
3. **(Novelty + Usefulness) Make the decision rule legible and on-screen.** Specify how the three signals combine into `{classification, confidence}` and where the ASK threshold sits — even a small, human-readable scoring rule — and render the cited numbers → verdict mapping on the canvas, so "taste, not a vibe" is airtight and not quietly delegated to an opaque LLM call.
4. **(Usefulness, path to 5) Add the designer's half of the bridge.** Introduce a lightweight designer-intent input (per example direction #3 — "state your intent, see which tokens/components satisfy vs. conflict") or foreground the DTCG/Figma token side as the designer's live contract, so the tool is demonstrably a two-sided alignment surface rather than an engineer-only linter.
5. **(Demo) Prove liveness on tape.** Commit to running one beat truly live on an *unplanted* component within the recorded minute (not merely "on request"), so the recording demonstrates the pipeline works rather than asserting it — directly strengthening the 50%-weighted Demo criterion.
6. **(Minor, API precision) Use `effort: "xhigh"` for the JUDGE reasoning pass.** It exists on Opus 4.8 and is the recommended setting for agentic/coding-adjacent reasoning; a small touch that continues the proposal's already-strong API diligence.
