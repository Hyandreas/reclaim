# 1. ClaimThread — the claims agent that never makes a disaster victim repeat their story

**One-line pitch:** ClaimThread lets any monolingual intake rep take a First-Notice-of-Loss call from any claimant in any language, holds the entire claim file in persistent memory across days, calls, reps — and even a full process teardown — and, once the file is complete, autonomously clicks through the carrier's API-less claims console to open and update the claim itself.

---

# 2. Track & sponsor

**Track 4 — Google DeepMind.** "Most agents work from a snapshot… and forget it the second the task ends. Build one that CAN'T."

ClaimThread makes **all three** Gemini primitives load-bearing and **causally chained in a single pipeline**, hitting the track's explicit bonus ("a second primitive only fires because the first is already running") — and the chain is enforced *in code*, not just narrated:

- **Live Translate** — the only reason the call can happen at all; a monolingual rep and a Spanish-speaking claimant share no language. Its output — a translated transcript stream — is the *only* input the next stage ever reads.
- **Antigravity (Interactions API)** — consumes that stream, turns it into stamped facts, and is the only reason Thursday's callback isn't a cold start: it holds the claim file continuously, keyed to a durable environment ID that survives process death, a different rep, and a different machine. Call #1 shows Antigravity *holding* state; the teardown-then-Call-#2 sequence is what proves the state is genuinely persistent, not an in-memory convenience.
- **Gemini Computer Use** — has no independent trigger. It fires *only* when a deterministic rule over Antigravity's held state (§6) evaluates to "complete" or "doc received," gated further by a human confirm, then drives a real cursor into the claims console to open/update the record.

Remove any one link and the other two have nothing to act on: no Live Translate, no legible transcript to extract from; no Antigravity, no durable completeness signal to gate on; no Computer Use, and the claim file is accurate but the carrier's system of record never moves. That is the track's shape enforced structurally, not a feature bolted onto a chatbot.

---

# 3. Problem & who it's for

When a hurricane, hailstorm, or wildfire hits, a P&C insurer's call volume spikes **5–10x overnight** and adjuster caseloads jump from ~50–75 files to **150+** during a catastrophe (CAT) event. A large share of those callers are **Limited-English-Proficient** — ACS puts LEP US residents at **25M+**, concentrated in exactly the coastal / Gulf / California metros that get hit hardest.

Today those claimants get bounced to a scarce bilingual rep or a translated voicemail, and — worse — **every callback starts from zero**, because the notes live in a rep's head, not the system of record. The claimant re-tells their disaster story to a stranger each time. That is the *exact* failure the track names, except the forgotten snapshot here is a family's flooded house.

This is a regulated, expensive gap, not an invented one:
- **NAIC Unfair Claims Settlement Practices** requires prompt acknowledgment (commonly **10–15 days**); dropped context causes missed clocks.
- Several states **mandate translated claims materials** — language access is a compliance obligation.
- **J.D. Power Claims Satisfaction** studies consistently name *"having to repeat information"* as a top dissatisfaction driver.

**Who it's for:** the **LEP claimant** (served in-language, no repeating); the **intake rep** (any rep takes any call in any language, with the file pre-briefed); the **carrier** — especially **mid-market carriers** on Guidewire ClaimCenter / Duck Creek whose intake systems genuinely lack accessible APIs, which is why UI automation is the honest integration path, not a shortcut.

---

# 4. What it does — the idea (concrete)

Meet **Maria G.**, whose roof was torn open by wind after a hurricane. She speaks only Spanish.

- **Call #1 (Tuesday).** Maria calls in. The whole conversation runs bidirectionally in Spanish via Live Translate; a monolingual intake rep, **Josh**, takes it in English. ClaimThread walks the FNOL protocol — policy #, peril, loss date, itemized damage, documents needed — and writes each answer as a stamped fact into a persistent claim file. Roof/wind loss logged; **shingle photos flagged outstanding**. Because the file is *intake-complete*, an amber chip appears — *"Open claim in ClaimCenter? peril=wind, loss=roof; missing: shingle photos. Confirm?"* Josh taps it, and **Computer Use** logs into the console, opens a new claim, fills the loss fields, attaches the call summary, and flags the outstanding photos. The claim row goes **"Open — awaiting docs."**
- **THE TEARDOWN.** We kill the process on camera — different rep, different machine, nothing in memory.
- **Call #2 (Thursday).** Maria calls back and reaches a **different rep** entirely. Within two seconds, the claim thread **repopulates from persistent state** and the rep's screen already knows her. He greets her, in Spanish: *"Hi Maria — following up on the roof damage from Tuesday. Did you get those shingle photos?"* She says yes and uploads them. **Computer Use** attaches the photos to the **same** claim record and flips status to **"Ready for adjuster review."**
- **The human gate holds.** A licensed adjuster — never the agent — makes the coverage call. ClaimThread renders a plain-language case summary with a one-tap *"send to adjuster,"* and stops there.

Translate → persistent claim state → teardown → warm callback → computer-use write-back. Three primitives, one causal chain.

---

# 5. Why it's novel / differentiation vs the obvious approach

- **The obvious build is "translate + a chatbot," or an agent that clicks around.** In those, translation *is* the product and Computer Use is the hero, and every call is independent. In ClaimThread, **the memory is the product** — the persistent claim thread is the thing the whole task cannot work without. Most teams will make Computer Use the star; we make statefulness the star, which is what the brief is actually asking for.
- **The second and third primitives only fire because the first ones did.** Computer Use has no trigger without Antigravity reaching "file complete"; Antigravity has nothing to hold without Live Translate making the call legible. Exactly the causal shape the track rewards.
- **The teardown is the unfakeable proof.** We destroy the process on stage and a *different rep on a different machine* resumes the exact claim by environment ID — the literal rebuttal to "forgets the moment the task ends." A "Thursday" title-card can be staged; a killed process resuming server-side state cannot be faked.
- **It reframes "agent memory" as an emotional, universal moment.** Nobody wants to repeat their disaster story to a stranger. That lands with non-technical judges in three seconds, with zero narration — a human hook a reconciliation or helpdesk framing can't reach.
- **Expect convergence on the skeleton; we differentiate on the mechanics, not the vertical.** The brief's own two examples — plus its "resuming via environment ID" language — point almost every team toward the same Translate → Antigravity → Computer Use skeleton with a teardown-and-resume proof beat. A different industry label alone ("it's insurance, not construction") is a weak defense once several teams land on that shape, so ClaimThread's real differentiation is structural: **(1) workforce fungibility, not agent memory.** The provable claim isn't "the same bot remembers" — it's that *any employee* can pick up mid-file. Josh and Thursday's rep are different people, on different machines, who never spoke — the actual staffing problem a CAT-surge carrier has (throw fresh headcount at a spike, not clone one bot). **(2) A multi-step CRUD lifecycle, not one threshold flag.** A claim isn't a single alert — it is *opened*, then *updated* one or more times as documents trickle in over days, then *marked ready*; Computer Use performs three distinct write shapes against the same record, not one fire-and-forget action. **(3) Evidentiary, not just conversational, state.** The completeness gate depends on a physical document (photos) the claimant has to go find in their own time — so persistence has to survive real-world days of delay, not seconds of call-transfer latency.
- **The environment-ID-resume mechanic is close to the brief's own example — on purpose, made harder.** The brief's security-audit example resumes a *scheduled* batch job each morning by environment ID. ClaimThread's resume is strictly harder: it's unscheduled, triggered by an inbound call from an unknown rep at an unpredictable time, and the lookup key isn't the environment ID itself — it's a claimant/policy match spoken live on the phone that has to *resolve to* the right environment ID before the first word of the call, not in a cron job with the ID already in hand.
- **Pre-empting "why not just call the claims API?"** Guidewire ClaimCenter / Duck Creek realistically expose little-to-no intake write access to third parties at the mid-market — enterprise/partner API tiers exist, but not for the BPOs and shared-service centers that actually staff CAT-surge intake — which is *precisely why* UI automation into the documentation screen is the real-world path, mirroring the track's own "staged environment" precedent.

---

# 6. How it works — architecture & agentic flow

**Stack:** a single-page "mission-control" front-end (three synced panels) + a Python orchestrator running a per-claim state machine + three Gemini primitives + a self-built mock ClaimCenter console driven by the Computer Use loop.

### The three panels (everything is witnessed, not narrated)
1. **Live bilingual transcript** — Spanish and English scrolling together, so translation is *seen*, not trusted.
2. **Claim thread + punch-list** — a timeline of stamped fact-chips (*"peril = wind · Call 1 · Tue"*) beside a Kanban of documents (**To Do / Outstanding / Received**) that ticks in real time; state made physically visible.
3. **Mirrored browser pane** — the Computer Use target rendered live, so the cursor's clicks into the console are witnessed.

### Primitives (all load-bearing)
- **Live Translate — the Gemini Live API's real-time, bidirectional speech-to-speech translation mode** (audio-to-audio + streaming transcript). We bind to whichever exact model identifier the hackathon's Gemini access exposes at build time; the architecture depends on the *capability* the track brief names — low-latency two-way speech translation with a text side-channel — not a guessed SDK string. Load-bearing: remove it and the monolingual rep cannot take the call at all. A mistranslated peril or loss date corrupts a regulated record, so translation quality is a correctness property, not a subtitle.
- **Extraction — a Gemini Flash model, function-calling.** Turns transcript deltas into structured FNOL events (`policy_no`, `peril`, `loss_date`, `damage_item`, `doc_needed`, `doc_received`) written into state. This is the only place a model's judgment touches the claim file's *content*; whether that content is *enough to act on* is decided next by a rule, not a model (see Control flow).
- **Memory — Antigravity managed agent via the Interactions API.** One persistent session per claim, addressed by a durable **environment ID**. The claim file *is* the agent's held state: policy/peril/loss, itemized damage, a document checklist, call summaries, and a completeness meter — **append-only, survives process teardown**. It exposes a small typed function interface used identically by voice, tap, and Computer Use: `get_claim(env_id)`, `update_field(name,val)`, `add_call_summary(text)`, `flag_missing_doc(doc)`, `mark_doc_received(doc)`, `mark_ready_to_file()`. Because every mutation goes through these and resume rehydrates from `env_id`, the kill/resume is genuine, not a variable. **Disclosed dependency:** if the hackathon's live Antigravity access doesn't yet expose a documented cross-machine durable store in time, we back the identical `env_id`-keyed interface with our own durable table — the demo's proof point ("genuine durable state survives teardown, addressed by ID") holds either way; only the internal of *which* store holds the bytes could differ, never whether the resume is real.
- **Action — Gemini Computer Use:** screenshot → grounded action proposal → execute → re-screenshot, **capped at 6 steps per write**, against our own mock ClaimCenter. A **constrained, validated action schema** — `search(q)`, `click_row(id)`, `read_field(name)`, `fill_field(name,val)`, `click_button(label)` — is checked against expected DOM/state before executing; on low grounding confidence or a read that mismatches the deterministic backend, it **retries rather than executing blind**. Fires *only* when a deterministic rule (below) says the claim is ready **and** the human-confirm gate passes — the model never decides *whether* to write, only *how* to click.

### Control flow — a plain per-claim state machine (no agent-framework overhead)
`LISTEN → EXTRACT → CHECK(completeness) → CLARIFY(ask back in-language if ambiguous) → CONFIRM(human gate) → ACT(Computer Use) → SPEAK(confirm back in-language)`

**The reliability decision, stated precisely:** only `EXTRACT` (language → structured field) and the Computer Use click-grounding loop touch a model's judgment. `CHECK` is a **deterministic rule** over the required-field set (all of `policy_no` / `peril` / `loss_date` / `damage_item` non-null) and the document checklist (`doc_needed` vs. `doc_received`) — never an LLM guess about "is this claim done." That means the amber "ready to file" chip and the punch-list colors are **guaranteed by code**, exactly like the completeness meter; the only genuinely non-deterministic steps in the whole pipeline are translation quality and click-grounding, and both sit behind a human-confirm gate before anything touches the system of record.

**Retrieval / decision:** on every inbound contact, the claim is looked up by claimant/policy and **loaded from Antigravity by `env_id` before the first word** — that is what makes Thursday's callback warm on a different rep's machine. Extraction appends events; `CHECK` re-reads the accumulated file and decides the next step (need more info → keep call open; intake complete → propose *open claim*; doc received → propose *update record*; all set → *send to adjuster*). Only a *confirmed* "complete" state authorizes a Computer Use write — and coverage/payment is **never** decided by the agent.

**Data:** one seeded claimant (Maria G., wind/roof, policy on file) + a mock FNOL schema modeled on real ClaimCenter / Duck Creek intake fields. No login sprawl, no multi-claim dashboard, no settings.

---

# 7. Buildable-in-2-days plan

**Real (actually running):** bidirectional speech-to-speech translation over the Gemini Live API; Gemini Flash extraction; Antigravity persistent claim state that reloads by `env_id` after a full teardown; the Gemini Computer Use screenshot→action→execute loop with validated retry; the three-panel UI; the state machine; the one-tap legal gate (voice "yes" and tap flow through the *identical* functions).

**Mocked / controlled (honestly):**
- The **ClaimCenter console is our own mock** (Next.js), styled like a real enterprise claims tool but built **for the agent's eyes** — high-contrast, oversized uniquely-labeled targets, shallow DOM, no lazy-load or animation — so Computer Use grounds near-deterministically instead of fighting real DOM churn. Legitimate per the track's "staged environment" precedent.
- The **call is a scripted bilingual conversation performed live** (exact Spanish lines pre-written), so we never depend on open-ended ASR nailing an unrehearsed sentence first try. One **recorded backup** exists for AV failure only.
- **Persistence backing, disclosed.** If live Antigravity access doesn't expose a documented cross-machine durable store in time, we implement the identical `env_id`-keyed function interface over our own durable table instead. The teardown-and-resume proof is unaffected either way; only the internal storage detail could differ.
- **Deterministic backend data** so any wrong Computer Use read is *detectable* and auto-retried, never silently propagated into a regulated record.
- Scope caps: **1–2 claims**, ~5–7 fields per claim, **2–3 click-actions** per fill, no free-text typing by the agent beyond field values already in state.

**Milestones**
- **Day 1 AM — de-risk in parallel.** Three solo spikes: (a) Live API two-way translation; (b) Antigravity write → kill → reload by `env_id`; (c) Computer Use clicking our mock console. Prove each unfamiliar API before wiring.
- **Day 1 PM — build the spine.** Mock ClaimCenter + three-panel UI shell + state-machine skeleton. Wire Live API → extraction → Antigravity claim file.
- **Day 1 EVE — close the loop.** Antigravity "complete" → confirm gate → Computer Use write → spoken confirmation. First end-to-end dry run. **Feature freeze.**
- **Day 2 AM — harden.** Make the Computer Use path deterministic against the one mock console; cap the loop with a scripted fallback; lock the exact Spanish script; test teardown→resume every run.
- **Day 2 PM — rehearse & bank.** Run the literal 60-second path until mechanical; **record the cleanest genuine take** for the 1-minute video submission; keep the fallback clip. Day 2 is rehearsal, not building.

---

# 8. The 1-minute demo script (moment by moment)

| Time | What the judges see |
|---|---|
| **0:00–0:12** | **Call #1, Tuesday.** Maria speaks Spanish into the mic; bilingual transcript scrolls live (Spanish + English together). Josh, monolingual, takes it in English. Fact-chips land: *"peril = wind · Call 1 · Tue," "loss = roof," "photos = OUTSTANDING."* |
| **0:12–0:22** | **First write-back.** The deterministic completeness rule fires (no model judgment call) → amber chip: *"Open claim in ClaimCenter — wind/roof, missing shingle photos. Confirm?"* One tap. Wipe to the mirrored browser: **Computer Use** logs in, opens a new claim, fills the loss fields field-by-field, attaches the call summary. Row: **"Open — awaiting docs."** |
| **0:22–0:30** | **THE TEARDOWN.** We quit the process on camera — terminal closes, screen goes black. On-screen line: *"Different rep. Different machine. We destroyed everything in memory."* |
| **0:30–0:46** | **Call #2, Thursday — warm open.** Maria calls back to a **new rep**. In ~2 seconds the claim thread **repopulates from persistent state** (chips still stamped *Call 1 · Tue*). The rep greets her in Spanish: *"Hi Maria — following up on the roof damage. Did you get those shingle photos?"* — proof it wasn't in RAM. |
| **0:46–0:56** | **Autonomous update.** Maria uploads the photos. **Computer Use** attaches them to the **same** record and flips status to **"Ready for adjuster review."** Punch-list goes green except one row, deliberately red: *"Awaiting licensed adjuster — never auto-approved."* |
| **0:56–1:00** | **Loop closes.** Live Translate speaks back in Spanish: *"An adjuster will review your claim today."* Tagline: **"ClaimThread — it never makes you repeat your story."** |

*Live-demo staging note (if the event also runs an in-person walkthrough alongside video submission):* pre-seed Tuesday's call as existing state and perform the **Thursday callback live** (a state reload + one validated Computer Use fill — our most reliable path); the 1-minute video itself shows both calls compressed.

*Optional trust flourish if a few seconds of slack remain after rehearsal:* tap **PAUSE** mid-fill — everything freezes — **resume** — it continues, proving a human stays in charge and this is no runaway macro. This is the single best insurance against the "agent auto-decides coverage" fear, so it's the first thing to add back in if the cut of the tape runs under 60 seconds, not an afterthought.

---

# 9. Impact & adoption

- **Named regulatory drivers:** NAIC Unfair Claims Settlement Practices prompt-acknowledgment clocks (commonly 10–15 days); state translated-materials mandates. Missed context breaks both — ClaimThread is the system of record for the thread.
- **Named population + economics:** 25M+ LEP US residents concentrated in CAT-prone metros; 5–10x call surges with adjuster loads hitting 150+ during events. ClaimThread turns *any* rep into an any-language intake rep and absorbs surge without hiring bilingual staff overnight.
- **Buyers are obvious:** P&C carriers (especially mid-market on Guidewire/Duck Creek), their BPO / shared-service centers, and TPAs — all already paying for interpreter lines and re-keying, all penalized for slow, low-CSAT claims.
- **Failure modes handled:**
  - *Agent auto-deciding coverage* → never happens. Only a licensed adjuster approves; the one-tap confirm is a **legal requirement**, not just UX. ClaimThread is explicitly an intake/documentation copilot.
  - *Mistranslated peril/loss* → translation is load-bearing and every system-of-record write sits behind a human-confirm gate.
  - *Computer Use missing a click* → self-built stable console, constrained validated action vocab, deterministic backend so wrong reads auto-retry rather than corrupting a claim.
  - *Process death losing state* → that's the entire point; Antigravity persistence-by-`env_id` is what we test hardest.
  - *Trust / privacy* → synthetic claimants and addresses only; pitched as documentation copilot, never a coverage decision-maker.

---

# 10. Risks & mitigations; stretch goals

**Risks & mitigations**
- **Computer Use whiffs a click live (our most visible failure; Demo is 50%).** → Own pixel-stable mock console with oversized, uniquely-labeled fields; constrained validated action schema with retry; rehearse the literal path, not the general capability; bank the cleanest recorded take.
- **Open-ended ASR / translation fails on the first live try.** → Pre-scripted, rehearsed Spanish lines; a visible "translating…" shimmer so residual latency reads as intentional; recorded backup for AV failure only; live demo leans on the reliable Thursday callback while Tuesday is pre-seeded.
- **Three real-time primitives glitching at once.** → The **spine (Antigravity + Computer Use) is fully reliable on its own**; Live Translate degrades gracefully to on-screen text + one-tap down the *identical* code path; nothing auto-commits (the legal gate doubles as the safety net). Feature freeze after Day 1; rehearse until boring.
- **Three unfamiliar SDKs in two days.** → Day-1-morning solo spikes before any wiring; a plain state machine, no agent-framework overhead.
- **"Is the memory real?" skepticism.** → The teardown-and-resume on a different machine proves a genuine environment ID, not session state.

**Stretch goals**
- A **batch/queue** of claims that resumes unattended each morning by `env_id` — the track's overnight-resume pattern, applied to a CAT-event backlog.
- More LEP languages (Mandarin, Vietnamese, Haitian Creole — the real hurricane-metro populations).
- **Voice-cleared exceptions** for reviewers (currency/ambiguity/missing-field), spoken back in-language, written through the same functions.
- An **adjuster-side view**: the licensed adjuster receives the plain-language summary and one-tap approve, closing the regulated loop.
- A damage-line **completeness sparkline** across calls, making "the pattern only memory could see" explicit on screen.
