# 1. Continuum — the care agent that never re-meets a patient for the first time

**One-line pitch:** Continuum is a multilingual post-discharge care agent that talks to non-English-speaking cardiac patients in their own language, holds each patient's red-flag protocol in persistent memory across every call — and even a full app restart — and autonomously files the urgent clinician callback itself the instant a symptom crosses the line.

---

# 2. Track & sponsor

**Track 4 — Google DeepMind.** "Most agents work from a snapshot… and forget it the second the task ends. Build one that CAN'T."

Continuum makes **all three** Gemini primitives load-bearing and **causally chained**, hitting the track's explicit bonus ("a second primitive only fires because the first is already running"):

- **Live Translate** — the only reason the conversation can happen at all (agent and patient share no language).
- **Antigravity (Interactions API)** — the only reason Call #2 isn't a cold start; it holds the patient's protocol state continuously, surviving process death.
- **Gemini Computer Use** — fires *only* because Antigravity's red-flag meter crossed threshold, then drives a real cursor to write the clinical note.

---

# 3. Problem & who it's for

Every US hospital runs mandatory 48-hour / 7-day / 30-day follow-up calls for CMS-tracked conditions (heart failure, COPD, pneumonia, AMI, CABG, hip/knee). This isn't optional: the **Hospital Readmissions Reduction Program (HRRP)** docks up to **3% of a hospital's total Medicare payments** for excess 30-day readmissions. Catching fluid overload on day 7 instead of in the ER on day 9 is the entire game.

Those calls run through an overworked nurse line. For the **~68 million US residents who don't speak English at home**, they route through a slow third-party interpreter service (Language Line, CyraCom) whose output evaporates into a log **nobody rereads before the next call**. So Call #2 starts from zero — the exact failure the track names, except here the forgotten snapshot is *a cardiac patient's fluid status*. Language access is also legally mandated (Title VI of the Civil Rights Act; ACA §1557), so this is a compliance gap, not just a nicety.

**Who it's for:** the patient (safer, in-language care); the nurse (routine calls offloaded, a structured note pre-filled); the hospital/health system, payer, and home-health agency (readmission-penalty avoidance + documented language-access compliance).

---

# 4. What it does — the idea (concrete)

Meet **Rosa Ramirez**, discharged after a heart-failure admission. She speaks only Spanish.

- **Call #1 (Day 1, 48h post-discharge).** Continuum calls Rosa. The whole conversation runs bidirectionally in Spanish via Live Translate. It walks the CHF red-flag protocol — daily weight, breathing, swelling, medications, whether her 7-day appointment is booked — and writes each answer as a stamped fact into her persistent casefile. Today she's stable. Baseline weight logged.
- **The app is killed. Cold restart. Day 7.** Nothing is in memory.
- **Call #2 (Day 7).** Within two seconds of picking up, Continuum greets Rosa **by name, in Spanish, already knowing** her Day-1 baseline — because Antigravity held her state through the shutdown. She reports she's gained **3 lb since yesterday** and **can't breathe lying flat** (orthopnea). The red-flag checklist visibly lights up; the fluid-overload meter crosses threshold.
- **Autonomous write-back.** Continuum surfaces a plain-language confirm chip — *"Flag urgent MD callback: suspected fluid overload. Confirm?"* On confirm, **Gemini Computer Use takes the cursor**, opens the nursing-documentation portal, clicks into the fields, and files a structured **SBAR note** plus an **"urgent MD callback"** flag.
- **The loop closes.** Live Translate speaks back to Rosa, in Spanish: *"A doctor will call you today about your breathing. Please weigh yourself again tonight."*

Translate → persistent state → computer-use write-back → spoken confirmation. Three primitives, one causal chain, inside one minute.

---

# 5. Why it's novel / differentiation vs the obvious approach

- **The obvious build is "translate + a chatbot" or a live status dashboard.** In those, translation *is* the product and each turn is independent. In Continuum, **the memory is the product** — no single call is ever the trigger. A stable Day-1 weight and a 3-lb Day-7 weight are each unremarkable; the *decline between them* is only visible to a listener that was present for both. Continuum is that listener.
- **The second primitive only fires because the first did.** Computer Use has no trigger without Antigravity's threshold; the spoken confirmation has nothing to say without Computer Use's success. This is the exact shape the track rewards, not a feature bolted onto a chatbot.
- **The cold restart is the unfakeable proof.** We destroy the process on stage and the agent resumes from persistent state — the literal rebuttal to "forgets the moment the task ends." A title-card "Day 2" can be staged; a killed process cannot be faked.
- **New canvas.** The track's own examples are construction and security. Continuum is clinical — a genuinely different application of the same causal shape, not a reskin.
- **Pre-empting "why not just call the EHR API?"** External call-center / RPA vendors realistically get little-to-no write access to clinical documentation systems. That is *precisely why* healthcare is already one of the largest live markets for screen-level automation — Computer Use writing into a documentation UI is the real-world integration path, not a demo shortcut.

---

# 6. How it works — architecture & agentic flow

**Stack:** single-page web front-end (three synced panels) + a Python orchestrator running a per-patient state machine + three Gemini primitives + a self-built mock nursing portal driven by Playwright.

### The three panels (everything is witnessed, not narrated)
1. **Live bilingual captions** — original Spanish and English translation scrolling together, so the translation is *seen*, not just trusted.
2. **Casefile timeline** — a thread of fact-chips, each stamped with which call/day captured it (state made physically visible: *"Weight 142 lb · Call 1 · Day 1"*).
3. **Mirrored browser pane** — the Computer Use target rendered live, so the cursor's clicks are witnessed.

### Primitives (all load-bearing)
- **Live Translate — Gemini Live API** (native-audio, real-time, bidirectional speech + transcript). Load-bearing: remove it and agent and patient cannot communicate. A mistranslated symptom is a readmission or worse, so translation quality is a safety property, not a subtitle gimmick.
- **Extraction — Gemini 2.5 Flash, function-calling.** Turns transcript deltas into structured clinical events (`weight`, `dyspnea`, `orthopnea`, `edema`, `adherence`, `appointment_booked`) appended to state.
- **Memory — Antigravity agent via the Interactions API.** Persistent per-patient protocol state keyed by `patient_id` + `session_id`: weight trend, med adherence, red-flag checklist, callback history, and a running red-flag/completeness meter. Append-only events; **survives process restart**. This is the load-bearing memory — the whole product.
- **Action — Gemini Computer Use loop:** screenshot → grounded action proposal → Playwright execution → re-screenshot, **capped at N steps**, against our own mock nursing-documentation portal. Fires *only* when the red-flag threshold is crossed *and* the human-confirm gate passes.

### Control flow — a plain per-patient state machine (no agent-framework overhead)
`LISTEN → EXTRACT → CHECK(threshold) → CLARIFY(ask back in-language if ambiguous) → CONFIRM(human gate) → ACT(Computer Use) → SPEAK(confirm back in-language)`

**Retrieval/decision:** on every call, state is *loaded from Antigravity by `patient_id`* before the first word (that's what makes Call #2 warm). Extraction writes events; CHECK re-reads the accumulated checklist and compares against the CHF protocol thresholds (weight gain ≥3 lb/day or ≥5 lb/week; new orthopnea/PND; worsening dyspnea/edema; missed meds; no 7-day appointment). Only a *confirmed* threshold crossing authorizes the Computer Use action.

**Data:** one seeded patient (Rosa Ramirez, CHF, discharge day 0) and the CHF red-flag protocol. No login, no multi-patient dashboard, no settings.

---

# 7. Buildable-in-2-days plan

**Real (actually running):** Gemini Live API bilingual speech translation; Gemini 2.5 Flash extraction; Antigravity persistent state that reloads after a cold restart; the Gemini Computer Use screenshot→action→execute loop; the three-panel UI; the state machine; the CHF protocol logic.

**Mocked / controlled (honestly):**
- The **nursing-documentation portal is our own mock**, not a real EHR (Epic/Cerner are inaccessible and too fragile in 2 days). Justified above and legitimate per the track's own "staged test environment" precedent — with **oversized, uniquely-labeled targets** so Computer Use is near-deterministic.
- The **call is a scripted bilingual conversation performed live** (exact Spanish lines pre-written) so we never depend on open-ended ASR nailing an unrehearsed sentence first try. One **recorded backup** exists for AV failure only.
- **Belt-and-suspenders on state:** we mirror the state we write to Antigravity into a local store so the cold-restart reload is deterministic on stage even if the network hiccups.

**Milestones**
- **Day 1 AM — de-risk in parallel.** Three solo spikes: (a) Live API two-way translation; (b) Antigravity write → kill → reload; (c) Computer Use clicking our mock form. Prove each unfamiliar API before wiring.
- **Day 1 PM — build the spine.** Mock nursing portal + three-panel UI shell + state machine skeleton. Wire Live API → extraction → Antigravity casefile.
- **Day 1 EVE — close the loop.** Antigravity threshold → confirm gate → Computer Use → spoken confirmation. First end-to-end dry run. **Feature freeze.**
- **Day 2 AM — harden.** Make the Computer Use path deterministic against the one mock form; cap the loop with a scripted fallback; lock the exact Spanish script.
- **Day 2 PM — rehearse.** Run the literal 60-second path until it's mechanical; record the backup; polish caption/timeline legibility. Day 2 is rehearsal, not building.

---

# 8. The 1-minute demo script (moment by moment)

| Time | What the judges see |
|---|---|
| **0:00–0:10** | **Call #1, Day 1.** Rosa speaks Spanish into the mic; bilingual captions scroll live (Spanish + English together). Continuum runs the CHF protocol in Spanish. Two fact-chips land in the casefile: *"Weight 142 lb · Call 1 · Day 1,"* *"Breathing OK · Call 1."* |
| **0:10–0:18** | **THE KILL.** We quit the app on camera — terminal closes, screen goes black. On-screen line: *"We just destroyed everything in memory."* Relaunch cold. |
| **0:18–0:28** | **Call #2, Day 7 — cold open.** Within 2 seconds Continuum greets Rosa by name *in Spanish* and references her Day-1 weight. The casefile timeline **repopulates from persistent state**, chips still stamped *Call 1 · Day 1*. (Proof it wasn't in RAM.) |
| **0:28–0:38** | Rosa reports **+3 lb since yesterday** and **can't breathe lying flat**. The red-flag checklist **lights up**; the fluid-overload meter crosses threshold. A confirm chip appears: *"Flag urgent MD callback — suspected fluid overload. Confirm?"* — one tap. |
| **0:38–0:52** | **Autonomous action.** Wipe to the mirrored browser. **Gemini Computer Use takes the cursor**, opens the portal, fills the SBAR fields, sets *urgent MD callback*, submits. Green submission banner. |
| **0:52–0:60** | **Loop closes.** Live Translate speaks back in Spanish: *"A doctor will call you today about your breathing."* Tagline: **"Continuum — it never re-meets a patient for the first time."** |

*Optional trust flourish if rehearsal time allows:* tap **PAUSE** mid-fill — everything freezes — tap **resume** — it continues, proving a human stays in charge and this is no runaway macro.

---

# 9. Impact & adoption

- **Named federal driver:** HRRP penalizes up to 3% of total Medicare payments for excess readmissions — a direct, quantified reason hospitals buy.
- **Named legal mandate + huge population:** Title VI and ACA §1557 require language access for ~68M non-English-speaking US residents; today it's served by slow interpreter lines with no memory.
- **Buyers are obvious:** hospitals/health systems, payers/insurers, home-health agencies — all already paying for follow-up calls and interpreter services, and all penalized for readmissions.
- **Failure modes handled:**
  - *Mistranslated symptom* → translation is load-bearing + a human-confirm gate sits in front of every urgent flag.
  - *Silently auto-closing a cardiac alert* → never happens: pre-action plain-language chip, one-tap confirm, always-on pause/override. Clinicians adopt a tool they can veto, not one that acts behind them.
  - *Computer Use missing a click* → self-built stable target, capped action loop with scripted fallback so it never visibly hangs.
  - *Process death losing state* → that's the entire point; Antigravity persistence is what we test hardest.

---

# 10. Risks & mitigations; stretch goals

**Risks & mitigations**
- **Computer Use whiffs a click live (our most visible failure; Demo is 50%).** → Build our own pixel-stable mock with oversized, uniquely-labeled fields; cap the loop with a scripted fallback; rehearse the literal path, not the general capability. Script exactly one self-correcting stumble so it reads as genuine perception, not a canned macro.
- **Open-ended ASR/translation fails on the first live try.** → Pre-scripted, rehearsed Spanish lines; recorded backup for AV failure only, while we still perform live.
- **Three unfamiliar SDKs across two days.** → Day-1-morning solo spikes before any wiring; a plain state machine, no agent-framework overhead.
- **The cold restart doesn't actually reload state.** → Tested every rehearsal; state keyed by `patient_id` and mirrored locally so the reload is deterministic on stage.
- **Chasing three real-time primitives that glitch simultaneously.** → One bulletproof path, feature freeze after Day 1, rehearse until boring. Narrow that never fails beats broad that sometimes works.

**Stretch goals**
- Weight-trend sparkline across three calls, making "the pattern only memory could see" explicit on screen.
- The scripted PAUSE-mid-fill trust beat.
- A second patient language to demonstrate generality.
- Auto-queue the next scheduled (30-day) call after the action.
- Auto-generated nurse shift-handoff summary from the casefile.
