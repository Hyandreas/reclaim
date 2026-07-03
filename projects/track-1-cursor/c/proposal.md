# Taste — the design-system reviewer that knows when something's wrong, and finishes the fix

> **One-line pitch:** Taste watches your component library and, on every diff, answers the one question a senior designer asks in review — *"is this wrong, or is this intentional?"* — then closes the loop: it reverts real regressions, fans out across the whole library to finish the migration nobody had time to finish, and — when the evidence itself is genuinely split — says so instead of guessing.

---

## 2. Track & sponsor

**Track 1 — Cursor.** An AI-native design system that reasons about consistency across a product's visual and interactive surface: detecting drift, classifying it with taste, and keeping designers and engineers aligned without a sync meeting.

**Cursor is load-bearing, not cosmetic.** A single artifact — `.cursor/rules/design-system.mdc` — is *both* the rubric our LLM judge scores against *and* the instruction set Cursor's own agent follows when it writes the fix. One file, two consumers. The remediation is executed by a real Cursor agent editing real files and opening a real commit/PR on camera.

---

## 3. Problem & who it's for (usefulness / relevance)

Static design tokens and component libraries are brittle contracts. The moment a brand evolves, a new team ships a component, or an interaction grows past its fortieth state, the system quietly fractures — a hardcoded `#3B82F6` where `--color-primary` belonged, a border-radius bumped 4px→8px in five components but not the other eleven, an iOS-only touch target that *looks* like a spacing violation but isn't.

**Who it's for:** a design-engineering lead or DesignOps person at a 20–200-person product org, or an OSS design-system maintainer (Polaris, Spectrum, and Atlassian all run standing design/eng sync meetings purely to reconcile this drift).

**Why the existing tools don't solve it:**
- **Percy / Chromatic** dump every pixel diff onto a human with zero judgment — no notion of *why* something changed, and no fix.
- **Figma plugins** only see the design file; they never see shipped code.
- **Linters (Stylelint/ESLint)** flag string patterns with no taste — teams mute them the moment false positives climb.

Taste is the reasoning-plus-remediation layer none of them offer. And there's a compliance edge that makes it more than nice-to-have: a contrast-ratio regression that silently drops below WCAG AA is real legal exposure (ADA/accessibility suits) — Taste catches it and proves the fix restored conformance.

---

## 4. What it does — the idea (concrete)

On every diff to a component library, Taste runs a pipeline: **render → localize drift → build evidence → judge → route → act → verify.**

The core insight — the "taste" — is a **four-way classification**, because each bucket has a *different correct action*, and because a reviewer with real taste knows when *not* to decide:

| Verdict | What it means | What Taste does (the loop) |
|---|---|---|
| **ACCIDENTAL REGRESSION** | A value drifted off-system by mistake | Drafts a one-click revert (token-reference swap / CSS rewrite), applies it via a **Cursor agent**, then **re-renders and re-judges** to prove the fix worked ("PASSED — contrast now 4.6:1") |
| **INTENTIONAL REDESIGN** | A change applied consistently across a component family — a deliberate evolution | **Completion.** Fans out across the *whole* library, finds every other place still on the old pattern, and proposes to **migrate all of them at once** — the redesign nobody finished — but only *executes* after an explicit human confirm (guardrail, §6) |
| **PLATFORM CONSTRAINT** | A platform-imposed value that only looks like drift (iOS safe-area inset, HIG 44px touch target) | **Restraint.** Confidently approves it — *not* a wall of red |
| **AMBIGUOUS / LOW-CONFIDENCE** | The evidence signals disagree (e.g. 3 of 11 siblings changed — a redesign just starting, or three separate mistakes?) | **Defers.** Taste doesn't force a guess — it surfaces its two competing hypotheses, cites the evidence for each, and asks the human to pick |

**What actually tips the accidental-vs-intentional call — the signal, not a vibe.** This boundary is where the whole pitch lives or dies, so it's made explicit and auditable instead of left to a vision model's gut feel. Three concrete, computed signals feed the JUDGE step as structured evidence, not prose:
1. **Consistency ratio** — `siblings already on the new value ÷ siblings in the same component family`. High ratio (5 of 5 already moved) reads as a rollout in progress; a lone outlier (1 of 16) reads as a mistake.
2. **Git co-commit clustering** — did the changed siblings land in the same PR / same author / same commit window? Coordinated changes read as deliberate; one stray commit reads as drift.
3. **Semantic token-distance** — is the new value already a *named, first-class token* elsewhere in the system (a rename/adoption — intentional) or a bare literal with no token match anywhere in the graph (a hand-typed accident)?

No single signal is trusted alone — a high consistency ratio with **no** co-commit link and **no** token match is exactly the **AMBIGUOUS** case above, and Taste says so on screen instead of confidently guessing. This is the difference between a real classifier and a threshold-only linter, and it's our concrete answer to "what is the taste, actually."

**The killer feature is completion, not detection.** Detecting drift is table stakes — Percy/Chromatic solved that category years ago. "Finish my half-done redesign everywhere it hasn't landed yet" is a feature category that does not exist in any shipping tool. On stage, that's a grid of stale components **visibly snapping into alignment on one click**, ending on a real migration PR opened by a Cursor agent.

**Human control is a first-class beat, and MIGRATE is explicitly gated by it.** Every flagged diff has inline accept / override controls, and "Finish this redesign" *never* fires a multi-file PR without one explicit human confirm click first — no silent auto-migration, full stop. A human can also overrule any verdict without leaving the canvas, and the model visibly updates ("got it — treating this pattern as intentional now"). The same mechanism handles the AMBIGUOUS case: Taste literally asks, the human decides, the model logs the answer and moves on. This proves Taste augments designer judgment rather than replacing it.

---

## 5. Why it's novel / differentiation vs the obvious approach

**We're upfront about what isn't novel:** the three-bucket taxonomy (regression / redesign / platform constraint) is the track's own example direction, almost verbatim. Shipping that alone would be "the obvious solution, executed well" — a smarter diff viewer with no judgment behind it. That's not where we think this proposal's originality lives, so we don't lean on it for the pitch. Five things sit on top of the given taxonomy, and that's where the actual novelty is:

- **A named, computed signal for the hardest call — not a vibe.** The accidental-vs-intentional boundary is where every naive version of this idea fails silently. We answer it with three auditable signals (consistency ratio across the sibling family, git co-commit/same-author clustering, semantic token-distance) the model must cite, not infer from pixels alone. That's what separates "taste" from "a vision model's guess" — and it's testable on stage: we plant a case engineered to fool a threshold-only tool (high consistency ratio, but no co-commit link and no token match) and show Taste correctly refusing to force a verdict, deferring to a human instead.
- **The router, not the label.** The taxonomy isn't classification for its own sake — it's wired to four genuinely different actions (revert / propagate / leave alone / ask), and gating the propagate action behind the classification is the actual novel move. Nobody ships the propagate action.
- **Completion is a new category, not a bigger detector.** §4 makes the full case; the one-line version: nobody ships "finish the in-flight redesign across the library in one click, gated behind a human confirm." That's our creativity story and our demo centerpiece.
- **The `.mdc` dual-use is a genuinely elegant Cursor integration** — the same constitution grades the diff *and* drives the fix, so the judge and the fixer can never disagree about what "correct" means.
- **Restraint and refusal, together, as the feature.** A confident "this is fine, it's a platform constraint" *and* an honest "I'm not sure, you decide" are what separate a trustworthy reviewer from a noisy linter — and both directly answer the track's own question: *does it have taste?* Our answer is a system that acts decisively when it has grounds to and visibly withholds judgment when it doesn't — closer to what "taste" actually means than a system that's confident 100% of the time.

---

## 6. How it works — architecture & agentic flow

**Stack:** TypeScript monorepo. Next.js + SSE for the live canvas/dashboard; Playwright for render/capture; a seeded Storybook (or small component gallery) as the target repo; SQLite/flat-JSON run-log for state.

**Control flow — a hand-rolled TS state machine** (named steps give us a visible on-screen trace; no LangGraph overhead needed at this scale):

```
WATCH → DIFF → BUILD-EVIDENCE → JUDGE → ROUTE → { FIX | MIGRATE→CONFIRM→ACT | APPROVE | ASK } → VERIFY → LOG
```

1. **WATCH / DIFF (render + cheap filter).** Playwright screenshots each component × state × viewport. `pixelmatch`/`odiff` produce a pixel diff with bounding boxes — this localizes *where* something changed before we pay for a vision call.
2. **BUILD-EVIDENCE (the grounding layer — concretely specified, scope bounded).** Two named parsers, run only over the seeded repo (arbitrary customer code is explicitly out of scope — §7):
   - **Tokens:** parse the real interchange format teams use — **W3C Design Tokens Community Group / Tokens Studio JSON**.
   - **Components:** a **PostCSS AST walk** over compiled CSS to resolve custom-property usage, plus **`ts-morph`** (the TypeScript compiler API) over component source to resolve which component/prop/state consumes which token.
   - These join into a dependency graph — `tokens → CSS custom properties → components → interactive states` — annotated with usage counts and git blame.
   - This same pass computes the **three boundary signals from §4** (consistency ratio, co-commit clustering, semantic token-distance) as structured numbers, not prose, so JUDGE reasons over facts, not just pixels.
3. **JUDGE (the taste engine).** **Claude Opus 4.8** (`claude-opus-4-8`) with **vision + tool use** and **adaptive thinking** (`thinking: {type: "adaptive"}`, `output_config.effort: "high"`). It receives the flagged-region screenshots, the evidence graph (including the three boundary signals), and the `.cursor/rules/design-system.mdc` constitution, and returns a structured verdict — `{classification, confidence, reasoning, cited_evidence[], proposed_fix}` — via structured outputs (`output_config.format`). Below a confidence threshold, or when the boundary signals disagree with each other, `classification` comes back `ASK` instead of a forced guess. Vision reads the rendered pixels; tool-use calls query the token graph / git blame so the model cites real numbers, not vibes. *(Parameter names and model IDs verified against current Anthropic API docs, not assumed: `thinking:{type:"adaptive"}` is correct for Opus 4.8 — the deprecated `budget_tokens` field would 400 — and `output_config.effort`/`output_config.format` are the correct current nesting. Production swap: **Claude Sonnet 5**, `claude-sonnet-5`, for the high-res vision localization pass at lower latency/cost — the demo runs Opus for maximum reasoning quality on a fixed scenario set.)*
4. **ROUTE.** The verdict selects one of four actions — including `ASK`, which routes to a UI prompt, not code.
5. **ACT.**
   - **FIX →** the **`cursor-agent` CLI** in headless mode (`-p`/`--print` for non-interactive scripting, `CURSOR_API_KEY` for auth) with the repo path, the violated rule from the `.mdc`, and the proposed fix — synchronous and single-file, fast enough to sit inline in the demo.
   - **MIGRATE → CONFIRM → ACT.** The multi-file case hands off to the **Cursor Background Agent** instead of the CLI — a separate, cloud-hosted surface with its own sandboxed checkout of the repo, built to touch many files without racing the local working tree — and Background Agents are built to open a pull request when the task completes, which is exactly the "migration PR opens on camera" beat. **Hard-gated**: the diff list previews every file Taste intends to touch, and nothing is dispatched to the Background Agent until a human clicks confirm. This is the explicit guardrail against a wrong auto-migration opening an incorrect PR. *(Cursor mechanics verified, not assumed: `cursor-agent` is the real headless CLI, non-interactive via `-p`/`--print`; the Background Agent is a distinct, real, cloud-hosted surface with native PR-on-completion; `.cursor/rules/*.mdc` is Cursor's actual rules format.)*
   - **Both FIX and MIGRATE share one fallback:** the identical prompt via the Anthropic SDK tool-use loop (`Edit`/`Write`), looped once per affected file for the multi-file case — so a flaky Cursor CLI or Background Agent call never stalls us on stage, and this explicitly covers MIGRATE, not just FIX. Whichever backend executes, it emits the same `{file, old, new}[]` edit list, which is what the grid-snap UI actually renders from — so the visual centerpiece is identical regardless of which path fired.
   - **APPROVE →** record the "this is fine" verdict with its reasoning; no code changes.
   - **ASK →** render both competing hypotheses with their evidence side by side; block on a human pick; log the decision as future signal for the constitution. (No new infrastructure — it reuses the same verdict-card UI and JUDGE call; only the branching logic differs.)
6. **VERIFY.** Re-capture → re-diff → re-judge the changed region → emit pass/fail with the concrete metric ("contrast 3.1:1 → 4.6:1, PASSED").
7. **LOG.** Append to the run-log → powers a live **Drift Timeline** dashboard, so the product feels lived-in (history, not a one-shot script) and doubles as retrieval for a stretch chat panel.

**State / memory:** the run-log (SQLite/JSON) is the single source of truth for the timeline and the verify loop. **The constitution (`.cursor/rules/design-system.mdc`) is the shared memory between judge and fixer.**

**Live vs. replay — stated plainly, not left ambiguous.** The recorded minute replays a **genuinely real, end-to-end run**: every screenshot, evidence-graph number, Claude verdict, and Cursor/SDK edit on screen was actually produced by the live pipeline earlier that day, timestamped in the run-log — then replayed deterministically for the camera so a flaky venue connection can't sink the take. Nothing is faked output typed to look like a model result; it's a real result, captured once for reliability, not re-rolled live during recording. If a judge wants to see it live, the identical pipeline runs on request against an unplanted component from the seeded repo in real time — same code path, just not the one on tape.

---

## 7. Buildable-in-2-days plan: milestones, real vs mocked, honest scope

**Day 1 AM — the stage.** Seed the demo repo: Storybook/component gallery, a DTCG token file, the `.cursor/rules/design-system.mdc` constitution, and **four** planted scenarios (regression, redesign, platform constraint, and one genuinely ambiguous case). Get Playwright capture + pixelmatch bounding boxes working end-to-end, and start the evidence-graph parsers (PostCSS AST for CSS custom properties, `ts-morph` for component source) plus the three boundary-signal computations (consistency ratio, co-commit clustering, token-distance). *(Vision/Domain own the seed data; it has to be credible enough that the classifier must actually discriminate — not everything flagged, and the ambiguous case must be genuinely hard, not a softball.)*

**Day 1 PM — the brain, then freeze the loop *and* a minimal migration.** Wire the JUDGE step: Claude vision + tool-use against the evidence graph + constitution, producing the four-way verdict with cited evidence on the seeded cases. **Non-negotiable MVP by end of Day 1 (widened in response to feedback — this used to be FIX-only, so the centerpiece was a Day-2-only bet; now it isn't):**
1. One component, one regression, fully closed-loop (detect → judge → Cursor fix → verify), frozen and deterministic.
2. One redesign classification that fans out and migrates a **small, real 2-component slice** (not the full 11 yet) via the Cursor/SDK path — so the migration *mechanism*, not just its scale, is proven and cached by end of Day 1.

**Day 2 AM — scale the centerpiece, then the remaining routes.** Scale MIGRATE from the proven 2-component slice to the full 11-component grid-snap (now a scaling task, not a from-scratch build). Build APPROVE (the restraint beat) and ASK (the defer-to-human beat on the ambiguous case — cheap to add, since it reuses JUDGE + the verdict-card UI). Cache every intermediate artifact for instant replay; timeout-guard both the single-file Cursor call and the multi-file case with the Anthropic-SDK fallback (§6).

**Day 2 PM — polish + record.** The canvas (color-coded overlays, critique-style reasoning panel, override control, the ASK side-by-side view), the Drift Timeline, rehearse the 60-second golden path, capture the real end-to-end run that becomes the replay (§6, "live vs. replay"), record the 1-minute video.

**Real vs mocked (honest):**
- **Real:** Playwright capture, pixel diff, the token dependency graph (PostCSS + ts-morph, named parsers), git blame, the three boundary signals, the Claude classification + cited reasoning, the actual code edits (Cursor agent or SDK fallback, both single- and multi-file), the verify re-check.
- **Curated, not mocked:** the target repo is seeded, not an arbitrary customer repo — the evidence graph is explicitly scoped to it, not a general-purpose parser.
- **Explicitly out of scope:** live Figma OAuth, real GitHub webhooks, handling arbitrary customer repos. Integrations can exist in the codebase for credibility, but **nothing in the judged 60 seconds waits on a live network call** — it replays a genuinely real, pre-captured run (§6). Chat panel is stretch.

---

## 8. The 1-minute demo script — moment by moment

Built to read with the sound off. Timing is deliberately weighted toward the centerpiece — judge feedback was explicit that the completion beat carries the novelty payload and needed more air, so the platform-constraint/override beat is compressed and doubled up instead of padded.

- **0:00–0:07 — Establish.** A PR lands on the seeded design system. The Taste canvas lights up: *"4 changes detected"* — three colored chips (red / amber / green) plus one greyed **"?"** chip. The Drift Timeline in the background shows prior history — this is a product with a past, not a one-shot script.
- **0:07–0:20 — Classification, with the hard call shown, not just the easy ones.** Three verdicts pin onto the canvas with staggered red / amber / green reveals, each citing checkable evidence — token name, usage count, git-blame line. On the amber (redesign) card specifically, the caption shows *why* it isn't a guess: *"5/16 siblings already match · same PR, same author · new value is already a named token → INTENTIONAL, unfinished."* That's the non-obvious signal, on screen, not asserted.
- **0:20–0:33 — REGRESSION → fix + verify (the compliance beat).** Click the red one. Reasoning: *"Hardcoded `#3B82F6` breaks contrast 3.1:1 < 4.5:1 (WCAG AA). `--color-primary` is the intended token — used in 47 other places."* One click → a **Cursor agent** patches the token → re-render → the overlay clears red→green → **"PASSED — contrast 4.6:1."** Detection, remediation, and proof, closed.
- **0:33–0:53 — REDESIGN → completion (the centerpiece — the biggest beat, on purpose).** *"border-radius 4→8px, applied consistently across 5 components — intentional. 11 other components still on 4px."* One click, **"Finish this redesign"** → a confirm prompt flashes and is accepted (the guardrail, visible for one beat, not hidden) → a grid of 11 stale components **visibly snaps into alignment**, and a Cursor agent opens the migration PR on camera. This is the beat no other tool can show, and it finally gets room to land.
- **0:53–1:00 — Restraint, the honest "I don't know," and close.** *"44px touch target — iOS HIG minimum, not drift. Approved"* (fast, confident, half a beat). Then the grey **"?"** chip from 0:00 resolves: *"Confidence 54% — could be either. Your call."* A hand picks one; the model updates its stance live, on the same override control. Close on the summary chip: **"1 fixed · 11 migrated · 1 approved · 1 asked, not guessed. Zero sync meetings."**

---

## 9. Impact & adoption

- **Real-world grounding.** Any org past the solo-founder stage — the moment design and engineering are different people — bleeds hours to silent drift; large design systems (Polaris, Spectrum, Atlassian) run standing reconciliation meetings. Taste is naturally a CI check / PR bot / Cursor extension that lives in every PR going forward — the long-term story writes itself: *"we didn't build a linter, we killed the sync meeting."*
- **Who benefits.** Designers stop doing manual QA syncs; engineers get the fix drafted *and* the migration finished; the org gets brand consistency and WCAG compliance as a byproduct.
- **Failure modes handled.**
  - *False positives kill lint tools* → the mandatory restraint call ("this is fine") keeps it trustworthy, not noisy.
  - *"Taste" reading as a gimmick* → every verdict cites specific, checkable evidence on screen, including the named boundary signals (consistency ratio, co-commit clustering, token-distance); it's auditable, never hand-wavy.
  - *AI overreach* → inline override on every diff, with the model visibly updating its stance; MIGRATE specifically can never write a multi-file PR without an explicit human confirm.
  - *Confidently wrong beats honestly unsure* → when the boundary signals disagree, Taste asks instead of guessing — ASK is a product feature, not a punt.
  - *Compliance exposure* → contrast regressions are caught and the fix is proven against the WCAG threshold.

---

## 10. Risks & mitigations; stretch goals

**Risks & mitigations**
- **Live multi-service orchestration flaking on venue wifi** → the judged 60 seconds replays a genuinely real, pre-captured run (§6, "live vs. replay") with **no live network call gating the recording**; every intermediate artifact is cached for instant replay; the full scenario set is frozen by end of Day 1.
- **The migration centerpiece specifically flaking mid-demo — the single biggest risk, since it's both the hardest beat and the headline** → de-risked twice: (1) a minimal 2-component migration is proven and frozen by **end of Day 1**, not Day 2, so scaling to 11 on Day 2 repeats a working path instead of building new territory under time pressure; (2) the Anthropic-SDK fallback explicitly covers the multi-file case (looped `Edit`/`Write` per file) and feeds the *same* grid-snap UI, so the centerpiece visual is identical whether Cursor or the SDK executed it.
- **Cursor CLI flaking on the single-file fix** → timeout-guarded, with an Anthropic-SDK tool-use (`Edit`/`Write`) fallback driven by the *same* `.mdc`, so the fix still lands identically.
- **Classifier misfiring live, or the demo reading as three cherry-picked, scripted hits** → the fourth, genuinely ambiguous case (ASK) is deliberately planted to prove the system doesn't force-fit everything into a confident verdict; the graph stays queryable after the recording, and the identical pipeline runs on an unplanted component in real time on request — a described mechanism, not just an assertion.
- **Wrong auto-migration** (the model calls INTENTIONAL when it shouldn't) → MIGRATE is hard-gated behind an explicit human confirm that previews every file before anything is written; there is no code path from verdict straight to a multi-file commit.
- **Screenshot misalignment / latency** → deterministic viewports, pre-warmed pipeline, cached golden path.

**Stretch goals (garnish, never on the critical path)**
- Live Figma / deployed-site pull as an *unscripted* flex if a judge asks.
- Real GitHub webhook → PR-bot mode.
- A chat panel ("show me everything that drifted from brand this sprint") powered by run-log retrieval.
- Packaging as a Cursor / VS Code extension; generalizing to arbitrary repos.
