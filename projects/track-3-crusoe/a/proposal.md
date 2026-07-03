# 1. Air Boss — the flight-director copilot for drone light shows

**One-line pitch:** Every aircraft carrier has an Air Boss watching the sky and calling the danger before it happens — we built one for the hundreds of drones lighting up the sky over your crowd.

---

## 2. Track & sponsor

**Track 3 — Crusoe.** Agents in physical/operational environments that build a live situational model from streaming inputs and drive proactive, trustworthy, overridable actions for a non-technical operator. Model-serving runs on **Crusoe Managed Inference** (load-bearing — see §6).

---

## 3. Problem & who it's for

Drone light shows are a fast-growing live-event category: 100–1000+ synchronized aircraft flown over dense crowds at festivals, stadiums, and city celebrations (Intel, Sky Elements, Verge Aero, and dozens more). They are also a **flight-over-people** operation, authorized under the FAA's **Part 107.35 multiple-aircraft waiver** — the Certificate of Waiver itself specifies the UAS failure thresholds and the abort action required when they're crossed. That's the same human-in-the-loop mandate the track is built around, except here it's written into federal law, not a UX choice.

Our operator is the **Flight Director**: the on-site safety officer who must call a HOLD the instant something looks unsafe. **They are not a swarm engineer.** Today their only tool is a wall of raw per-drone telemetry — dozens of scrolling rows of position, battery, and GPS-fix numbers. A human cannot fuse 80 trajectories, a wind gust, and a crowd geofence into a decision in the 6 seconds they have. This gap is not hypothetical, and it produces exactly our two failure modes: at Melbourne's Docklands show (Jul 2023), wind near the drones' operating limit cascaded into mid-air collisions that dropped 427 of 500 aircraft into the harbor; at Orlando's Lake Eola show (Dec 2024), an unnoticed 7° formation offset silently shifted the safety geofence and a falling drone struck a 7-year-old — the FAA has since suspended the operator's show waiver. One is a wind/separation failure, the other a geofence failure: the exact two things Air Boss's situational model watches for.

**Who benefits:** show operators and their Flight Directors, venues, event insurers, and the crowd underneath. The buyer is obvious and the job already exists.

---

## 4. What it does — the idea

Air Boss ingests the **same live telemetry stream** the Flight Director sees and continuously maintains a **live situational model** of the whole formation — per-drone position, velocity, wind drift, and battery, plus derived cross-drone features (predicted minimum separation, group-lane convergence, drift toward the crowd geofence, battery-to-RTL margin, and whether a drift is shared across a cluster of neighbors or isolated to one drone).

All collision and separation math is **deterministic local code**, extrapolating trajectories a few seconds ahead — fast and trustworthy, never guessed. When that math predicts a threshold breach, the agent produces **one plain-language advisory at a time** for the Flight Director's screen:

> "Wind gust pushing drones 40–52 into Formation B's lane — predicted separation breach toward the crowd line in ~6s. **Recommend HOLD both groups 6s.**"

Under it: **signal-chips showing exactly WHY** (drift vector, predicted min-separation, geofence proximity) — never a black-box "what" without a "why" — and one-tap **APPROVE / ADJUST / IGNORE** with a one-word reason chip. The advisory is also spoken aloud (TTS) because the Director's eyes are on the sky.

**The killer feature — visible learning, live.** The operator overrides a HOLD with a REROUTE ("prefer reroute for wind"). Seconds later a second gust fires — and now **REROUTE is the first recommendation**, with an inspectable reason: *"learned: you prefer reroutes for wind events — adapted from your last override."* This isn't a hope that the model "remembers": the preference is written to a timestamped log that a local ranker reads before Crusoe is ever called, so the swap is **guaranteed to happen on cue** — not a stochastic bet on a few-shot prompt. Crusoe's job is to phrase and justify the swap in the Director's language, never to decide whether it happens. This override-to-visible-adaptation loop is the beating heart of the track, and it's the one thing all four of our brainstorms independently converged on.

---

## 5. Why it's novel / differentiation

**Every other Track-3 team will reach straight for the three sample scenarios** — crowd flow, forklifts, GPU thermal. We deliberately don't. Air Boss is **airspace choreography**: a fresh, cinematic domain wearing the track's exact skeleton — WHERE (3D formation + geofence), WHEN (seconds-ahead trajectory extrapolation), and RELATIVE-TO-what-else (cross-drone convergence + wind field). Judges will have seen four crowd dashboards before they see ours.

Differentiation vs. the obvious approach:
- **Novel domain, exact-fit skeleton** — maximum Creativity without straying from the brief.
- **Gorgeous *and* safe to demo** — the rare Track-3 idea that is fully software-simulatable (zero hardware risk in a 2-day build) yet genuinely beautiful on screen: dots holding formation, a red risk corridor blooming, one tap, a resolved show.
- **A genuine domain insight, not just a domain reskin** — the model tells a *formation-wide* event from an *isolated* one: many neighboring drones sharing a deviation is wind; one drone diverging while its neighbors stay nominal is a motor/GPS fault. The two need opposite fixes — hold/reroute the group, or send one drone home while the show goes on — which is why the action set is HOLD / REROUTE / DESCEND-RTL, not an alarm with two buttons.
- **Trust by construction, not by claim** — physics, severity, cause, and the action ranking are all deterministic code; Crusoe only turns the result into a sentence. This directly answers the fatal judge question "isn't the AI just making up the safety numbers?" — no, the LLM never touches a single number.
- **The learning loop is *provably* real, not just plausible** — the preference swap is deterministic-by-construction (a local ranker, not a prompt-injection gamble), so overrides visibly reorder the very next recommendation, on camera, twice in 60 seconds.

---

## 6. How it works — architecture & agentic flow

**Stack:** Python + FastAPI (world-state service), WebSocket streaming, a single-page React console rendering the formation on HTML5 Canvas, the browser's Web Speech API for TTS, and **Crusoe Managed Inference** as the reasoning layer.

**The agent loop (perceive → model → detect → retrieve → reason → act → learn):**

1. **Perceive (streaming input).** A synthetic telemetry generator simulates 60–120 drones flying a choreographed formation, emitting per-drone JSON at ~10 Hz: `id, x, y, z, velocity vector, battery%, gps_fix, motor_status`. A scriptable/injectable **wind field** can push a gust vector over a region. This is genuine streaming data, not a replay file — and it's choreographable for the demo.
2. **Model (the live situational model).** The FastAPI service keeps rolling per-drone position/velocity buffers and computes **deterministic** derived features: short-horizon trajectory extrapolation (~3–6s), pairwise closing rate + predicted minimum separation, group-lane convergence, drift toward the crowd geofence, battery-to-RTL margin, and each drone's **deviation vector relative to its k-nearest neighbors** (the input to the cause classification below). *This is the situational model, and it is all local math.*
3. **Detect (cheap trigger pre-filter).** A rule-based detector fires only when the deterministic model predicts a threshold breach (min-separation < X m within Y s; drift crossing the geofence; battery below return margin) — and it classifies the *cause* just as deterministically: a deviation shared by a cluster of neighboring drones is a formation-wide event (wind); one drone diverging while its neighbors stay nominal is an isolated fault. The two demand opposite actions — hold/reroute the *group*, or send *one drone* home (RTL) while the show continues — so the recommended action type is already correct before any inference happens, and this keeps Crusoe calls **sparse, meaningful, and low-latency**.
4. **Retrieve (memory) & rank (deterministic).** On a trigger, the agent pulls the relevant slice of the **append-only override log** for this risk type, and a local **preference table** built from that log re-ranks the candidate action list *before Crusoe is ever called* — even a single override (e.g., one REROUTE call on a wind-drift event) is enough to bump it to rank #1 next time. (A production version would weight count and recency; the demo's one-shot flip is the legible version of the same rule.) This is the step that makes the learning loop **guaranteed, not a stochastic bet on a prompt**.
5. **Reason (Crusoe Managed Inference — load-bearing).** Severity, the cause, and the ranked action are already decided by local code. We send those facts + the retrieved override history to a **Crusoe-hosted open instruct model — Gemma-3-12B-Instruct as the primary path (lowest latency, since the whole warning window is ~6s), Llama-3.3-70B-Instruct as a quality fallback** — via Crusoe's OpenAI-compatible endpoint (`api.inference.crusoecloud.com`) in strict JSON/structured-output mode. Crusoe's job is language, full stop: it returns `{message (one plain-language sentence), why[] (2–3 chips, each citing one provided signal fact verbatim — it cannot invent a signal or a number)}`. The backend attaches its own deterministic `severity` and `recommended_action` to Crusoe's output before the advisory reaches the console, so the UI's buttons and colors are never driven by anything Crusoe said. A **~1.5s client-side timeout** falls back to a templated sentence built from the same structured facts — never a blank screen. This is exactly why Crusoe is load-bearing: it owns the one thing local code can't do — turning ranked facts into the sentence a stressed human trusts in six seconds, in the Director's own words, naming the adaptation when memory is relevant ("learned: you prefer reroutes for wind events") — and exactly why it's safe: it never owns the thing that would be dangerous to get wrong.
6. **Act (operator loop).** The single-screen console renders the live formation, blooms the predicted risk corridor red, shows the advisory + why-chips, speaks it (TTS), and offers one-tap APPROVE / ADJUST / IGNORE + reason chip. Approve/Adjust commands the simulation (hold/reroute the affected group, or RTL the single drone); the corridor clears back to green.
7. **Learn (state/memory).** Every decision + reason appends to the override log and updates the preference table step 4 reads — a real, pointable state change, not a hope that a reinjected prompt happens to sway the model. Crusoe narrates the change; the table guarantees it happens.

**Data & state:** streaming telemetry (ephemeral rolling buffers) + derived situational model (in-memory) + an append-only override log and the deterministic preference table derived from it (the only persistent state). No auth, no DB beyond a JSON log.

---

## 7. Buildable-in-2-days plan (honest scope)

**Day 1 AM** — Telemetry generator + one choreographed formation + injectable wind gust. World-state service: rolling buffers, trajectory extrapolation, deterministic risk detector + cluster-vs-isolated cause classification. *(All real.)*
**Day 1 PM** — Crusoe integration: `{message, why[]}` from ranked local facts, hard ~1.5s timeout → templated fallback. Console skeleton: canvas rendering the live stream + advisory banner.
**Day 2 AM** — Override buttons + reason chips + the **override-preference table (the learning loop, deterministic by construction)**. TTS. Risk color grammar (green/amber/red) + predictive time-scrubber (forecast vs. now). Wire the one scripted conflict: wind-shear convergence toward the crowd line.
**Day 2 PM** — Polish 60s choreography; build one-keystroke **replay-mode fallback**; **record the safety-net demo video Saturday night**; rehearse until boring.

**Real vs. mocked (stated honestly):**
- **Real:** streaming telemetry at 10 Hz, *all* collision/trajectory/separation math (deterministic), the live Crusoe inference call, the override-preference table + memory reinjection, and the full operator UI.
- **Simulated:** the drones themselves (no hardware — like every team's sensors here, ours are synthetic, and we'll say so). "Reroute/hold" actuation is commanded into the sim. Wind is scripted/injectable.
- **Explicitly out of scope:** multi-vendor drone SDKs, historical analytics, auth, real hardware, anything not on camera.

---

## 8. The 1-minute demo script (moment by moment)

- **0:00–0:08** — *"Every aircraft carrier has an Air Boss watching the sky, calling the danger before it happens. We built one for the drones lighting up yours."* Console: 80 drones holding a formation over a marked crowd line, telemetry streaming, everything green.
- **0:08–0:18** — Operator (or a **judge**) taps **Inject Gust**. Drones 40–52 begin drifting; the situational model's predicted trajectories fan out and a **red risk corridor blooms** toward Formation B's lane and the crowd geofence — seconds before a human would catch it.
- **0:18–0:32** — Advisory banner appears and is **spoken aloud** (live Crusoe call): *"Wind gust pushing drones 40–52 into Formation B's lane — separation breach toward the crowd line in ~6s. Recommend HOLD both groups 6s."* Signal-chips show WHY (drift vector • predicted min-separation • geofence).
- **0:32–0:40** — Operator **OVERRIDES**: taps **Adjust → Reroute**, reason chip *"prefer reroute for wind."* Sim reroutes; corridor clears to green.
- **0:40–0:52** — A **second** gust hits **drones 15–22 near Gate C** — a different lane, same risk type. Because the preference table already ranks REROUTE first for wind-drift events, the advisory's **first** recommendation is REROUTE on arrival, and it says why: *"learned: you prefer reroutes for wind events — adapted from your last override."* One tap **APPROVE**. Resolved.
- **0:52–1:00** — Pull back to the full show, holding, all green. *"Live situational model. Plain-language calls. You stay in command. That's Air Boss."*

Everything the track asks for — live model, WHERE/WHEN/RELATIVE-TO, proactive advisory, plain language, inspectable trust, override, and **visible learning (twice)** — lands in 60 seconds.

---

## 9. Impact & adoption

**Real-world grounding.** Drone light shows are a real, growing, multi-million-dollar category flown directly over crowds — and the two failure modes in our demo aren't invented; both have already happened in commercial shows (see §3). FAA Part 107.35 show waivers already put a human abort call inside the Certificate of Waiver itself, and the agency has already suspended at least one operator's waiver after a mishap, so advisory-plus-override isn't a UX nicety — it's the legally adoptable shape of the product, and the commercial stakes (a suspended waiver is a canceled season) are real. Today that operator reads raw telemetry; Air Boss is the missing judgment layer, with a straight path to real drone-telemetry ingestion (MAVLink) as the hardware step.

**Failure modes handled (on purpose):**
- *Telemetry dropout* on a drone → flagged as degraded, never silently dropped.
- *Alert fatigue* → sparse deterministic triggering + override memory dampens flags the operator has repeatedly dismissed.
- *Model latency / API hiccup* → severity, action, and why-facts are decided locally and render **instantly**; Crusoe's sentence fills in a beat later, or a **~1.5s timeout** swaps in a templated one from the same facts — safety never blocks on the network.

**Who benefits:** Flight Directors and show operators (a decision instead of a data wall), venues and insurers (auditable, human-in-the-loop safety), and the crowd (the corridor that clears before it becomes a headline).

---

## 10. Risks & mitigations; stretch goals

| Risk | Mitigation |
|---|---|
| Judges discount it as "just simulated drones" | Say it upfront — every team's sensors here are synthetic, and the two scripted failure modes are drawn from real 2023/2024 drone-show incidents (§3), not invented. Make the stream *and* the Crusoe call **genuinely live and interactive** (judge injects the gust). Keep collision math local/instant so only the language rides on the model. |
| "Isn't the AI making up the safety numbers?" | It never touches them. Physics, separation, timing, severity, and the action ranking are **all deterministic code**; Crusoe only turns the result into a sentence. Less for the model to get right, not more — more trustworthy *and* easier to build in 2 days. |
| Crusoe latency spike mid-demo | Deterministic facts (severity, action, why-signals) render immediately; Crusoe's sentence follows a beat later; a **~1.5s timeout** swaps in a templated sentence from the same facts if needed. Safety is never gated on the call. |
| Live-demo fragility | One-keystroke **replay mode**; **record the safety-net video Saturday night** regardless of live confidence. |
| Scope creep | 2D-first; **one** scripted conflict; cut 3D and extra groups *before* the learning loop — the loop is the differentiator and ships no matter what. |

**Stretch goals:** true 3D formation view; multiple simultaneous conflicts; an operator-tunable trigger threshold via override ("wait for a tighter margin before flagging Gate…"); a dedicated on-camera beat for the isolated-fault action (DESCEND/RTL) — the formation-vs-isolated disambiguation that drives it is already in the core detector (§6), only the scripted moment is stretch; an interactive tap-to-query on any drone or group, beyond the always-visible why-chips; real MAVLink telemetry ingestion to prove the hardware path on camera.
