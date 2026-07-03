# 1. FIREBREAK

**One-line pitch:** FIREBREAK fuses live fire-spread, wind, and crew-GPS telemetry into a single spatial situational model, and turns it into *one sentence* an incident commander can trust in six seconds — and its judgment measurably sharpens every time they override it, even on hazards they never touched.

---

# 2. Track & sponsor

**Track 3 — Crusoe.** Agents deployed in physical/operational field environments that build a live situational model from streaming inputs and drive proactive, trustworthy, overridable action for a non-technical operator.

**Sponsor tech (load-bearing):** **Crusoe Managed Inference**, running **Llama-3.3-70B-Instruct** behind Crusoe's OpenAI-compatible endpoint (named fallback: **Llama-3.1-8B-Instruct**, identical contract, swapped in if the 70B's measured p95 runs hot on event Wi-Fi), is the reasoning and translation layer. On the timing-critical countdown path it receives one fully-grounded JSON state blob per tick and returns one JSON advisory in **JSON mode** — zero tool round-trips gambled against the clock. Genuine multi-step **function-calling** is reserved for the operator-initiated "Why?" / "what about X?" path, where a 2–3 s budget is affordable and true agentic tool use is demonstrable on camera without risking the six-second promise. Every model claim is grounded in live state either way; Crusoe does the judgment, prioritization, and adaptation that make the operator loop trustworthy.

---

# 3. Problem & who it's for

**User:** an **Incident Commander or Division Supervisor** on a wildland fire — someone with a radio, under stress, watching wind and fire behavior change by the minute. Not a GIS analyst at a desk.

**The failure mode is not missing data — it is translation latency.** On a fire there are too many feeds (weather, spotters, dispatch, GPS) and not enough *trusted judgment delivered fast enough to act on*. The single deadliest event in the loop is a **wind shift that invalidates an escape route faster than radio chatter can track it**.

This is exactly what killed 19 Granite Mountain Hotshots at the **Yarnell Hill Fire (June 30, 2013)**: a thunderstorm outflow reversed the wind, the fire cut off their escape route to a ranch safety zone, and situational awareness lagged behind the fire. FIREBREAK is built for that six minutes.

**Buyers / beneficiaries:** federal & state fire agencies (USFS, CAL FIRE), county Emergency Operations Centers, and — because the engine is a generic "streaming telemetry → trusted spatial advisory → override" loop — adjacent field ops: utility storm crews, search-and-rescue, and large-event security.

---

# 4. What it does — the idea (concrete)

FIREBREAK ingests **three live streams**:

1. **Wind/weather telemetry** — speed + bearing, updating over time (a *wind shift* is the demo's inciting event).
2. **A fire-perimeter growth model** — a wind-, fuel-, and slope-driven **cellular automaton** spread, plus an independent, low-probability **ember-cast spot-fire generator** gated on wind speed (deliberately *not* a research-grade physics engine, but two distinct hazard mechanisms, not one).
3. **Crew & vehicle GPS beacons** — icons moving along trails/roads with a current planned egress.

It fuses them into **one continuously updated spatial graph — the situational model**: trail/road **segments** (nodes/edges) each carrying a live **time-to-impact** from the nearest active hazard (front or spot fire), crew **positions** with **egress travel time**, the fire **front bearing/rate-of-spread**, and the wind vector.

The agent watches this model and **stays silent until risk crosses a threshold** (time-to-impact − egress-time < safety margin). Then — and only then — it surfaces **ONE Situation Card**, never a dashboard, never a notification stack:

> **RISK** — "Wind shifted SW; fire crosses Ridge Trail (Crew Alpha's egress) in ~6 min."
> **ACTION** — "Recommend Crew Alpha egress via East Ridge now."
> **WHY** — (one tap) grounded numbers: ROS, distance to front, egress ETA. Tap any segment to ask a scoped follow-up — *"what about Canyon Road?"* — answered from the same grounded state.
> **⏱ 6:00** countdown · big **APPROVE / OVERRIDE**

The commander taps **APPROVE** (route is set) or **OVERRIDE** and taps a one-word reason chip ("ROUTE BLOCKED"). The agent recomputes **live**, and the *next* advisory visibly shifts — a different route, an earlier warning — so the trust loop is literal and legible on screen, not buried in a log.

**The learning generalizes, not just memorizes.** Blocking one route is the obvious adaptation — any team building this track's brief will show that much. FIREBREAK's override also recalibrates a **hazard-agnostic safety-margin bias** for that crew. So when a *second, categorically different* hazard appears later in the scenario — an ember-cast spot fire igniting ahead of the crew's *new* route, not the original front — the agent fires the warning **earlier than its default threshold**, and says so on screen: *"Spot fire ahead on Canyon Road — flagging 90s earlier than default (Crew Alpha's margin is still widened from the last override)."* That is the visible, provable difference between *remembering one fact* (this route is blocked) and *adapting a policy* (I now speak sooner for this crew, on anything) — demonstrated in under ten seconds of screen time.

**Killer feature — the Glass-Box Override.** Every advisory is spatially wired to the map. As the sentence streams in from Crusoe, the *exact* fire cells, the threatened trail segment, and the crew that triggered it **pulse in sync**. When the commander overrides, the map reroutes within a second. *See the AI think, then watch it listen* — the track's trust/question/override mandate made physical and filmable in one unbroken shot.

---

# 5. Why it's novel / differentiation vs the obvious approach

**The obvious build is a wildfire dashboard** — stacked map layers, live feeds, an alert list, a GIS analyst pane — or a chatbot you query. Both dump the *translation burden* back onto a stressed commander. FIREBREAK inverts it: **interface radicalism** — one map, one sentence, one tap. The agent decides what matters and says only that.

**We take the "this is just the track's own template" critique head-on.** The literal loop — stream → model → advisory → override → adapt — is mandated by the brief; pretending otherwise would be dishonest. But look at *what* the brief's own examples adapt: the festival agent reroutes the same crush corridor next time, the warehouse agent reroutes the same forklift next time, the GPU agent migrates to a different rack next time — in every worked example, the override changes *the next instance of the same decision*. FIREBREAK's override changes a **decision-policy parameter that transfers across hazard types**: a route-block override widens a safety margin that later triggers an *early warning on an unrelated hazard* (spot fire, not front advance) the commander never touched. That is a qualitatively harder claim — generalization, not memorization — and it is the one part of this build a pattern-cloner doesn't get for free by copying the brief's own phrasing.

**Differentiation:**

- **The override is a visible training signal that generalizes.** Most "human-in-the-loop" demos log the correction invisibly, and the ones that don't usually only replay the identical decision. FIREBREAK reshapes the very next recommendation *on camera* in under 15 seconds — and then reshapes a *different* recommendation, on a *different* hazard, proving the learning isn't a lookup table.
- **Grounded, not hallucinated.** Detection is deterministic and local (reliability); Crusoe reasons over *tool-grounded* live state, so it never invents a risk — it prioritizes, phrases, and adapts real ones.
- **We don't clone the spoon-fed scenarios.** The brief's examples (festival, warehouse, GPU rack) will be built by many teams; those read as color tiles or numbers on a 60-second video. FIREBREAK takes the identical trustworthy-operator loop into **wildland fire — a "field site" the brief names outright** — where a *growing fire advancing on firefighters with a ticking countdown* is instantly legible to any human with zero domain briefing, and more visceral than any density heatmap.

We adopt the exact interaction consensus our team converged on — *one map, one card, one tap, visible adaptation* — and push it one level past the brief's own examples: adaptation that transfers, not just repeats.

---

# 6. How it works — architecture & agentic flow

**Design principle:** local code owns the *physics and detection* (so nothing can hallucinate a risk or stall the demo); **Crusoe Managed Inference owns the *judgment, prioritization, plain-language reasoning, and adaptation*** (which is what the track grades) — split across two call patterns so agentic depth never gambles against the countdown.

### Stack
- **Backend:** Python + **FastAPI**, streaming situational-model state to the UI over **WebSockets** (~1–2 s tick).
- **Situational-model engine (pure Python, deterministic, seeded):**
  - Fire spread = **cellular automaton** on a terrain grid; per-cell ignition probability from burning neighbors weighted by **wind alignment (∝ cosine of angle to wind bearing)**, **fuel load**, and **slope (upslope run acceleration)** — weights grounded in the Rothermel surface-fire model family and standard upslope rules of thumb.
  - A **second, independent hazard generator**: a low-probability, wind-speed-gated **ember-cast spot fire** ahead of the front — a distinct code path from front-advance, so a margin learned from one cannot be mistaken for hard-coding a canned response to the other.
  - Per-segment **time-to-impact** = distance from the nearest active hazard (front or spot fire) to segment ÷ directional rate-of-spread.
  - Per-crew **egress time** = path length ÷ crew move speed.
  - **Risk trigger** = `time_to_impact − egress_time − safety_margin < 0`, where `safety_margin` carries a per-crew bias learned from prior overrides (see State/memory).
- **LLM layer — Crusoe Managed Inference, two distinct call patterns:**
  - **Critical path (every threshold crossing):** ONE request, no tool round-trips. The local orchestrator pre-fetches all grounding state itself and injects it as a structured JSON blob into a single prompt to **Llama-3.3-70B-Instruct**, **JSON mode** (`response_format: {"type": "json_object"}`), token-streamed for on-screen aliveness. Budget: **≤600 ms p50 / ≤900 ms p95** for the model call, leaving headroom inside the hard 1.2 s end-to-end timeout (§10). **Named fallback:** if the 70B's measured p95 runs hot on event Wi-Fi (checked Day 1 AM, not discovered Day 2), swap to **Llama-3.1-8B-Instruct** on the identical endpoint/contract — same schema, faster, flatter phrasing is an acceptable trade on the critical path over a missed countdown.
  - **Off-critical path ("Why?" tap / tap-a-segment question):** true multi-round **function-calling** against the tool set below, budget 2–3 s. This is where FIREBREAK is *demonstrably, verifiably* agentic — the model chooses which tools to call and in what order — decoupled from the six-second promise so a slow or flaky tool round-trip can never threaten the demo's spine.
- **Frontend:** single-page app (React + HTML5 Canvas) — ambient live map behind, exactly **one Situation Card** in front; thumb-sized three-state control; Glass-Box pulse synced to the stream; tap-a-segment question affordance.

### Tools
Critical-path calls receive these as **pre-fetched JSON fields** baked into the single prompt (tools become cached reads, not round-trips). The off-critical-path "Why?"/question flow exposes the same set as real callable functions the model invokes itself: `get_situation_summary()` · `get_crew(crew_id)` · `get_segment(segment_id)` · `get_wind()` · `get_fire_state()` · `get_recent_history(entity)` · `get_override_log()`

### Strict LLM output contract (hard caps, no jargon) — identical on both paths
```json
{ "severity": "advisory|urgent|critical",
  "target": "Crew Alpha",
  "risk":  "<=90 chars",
  "action":"<=80 chars",
  "why":   "<=120 chars",
  "recommended_route": "East Ridge",
  "eta_impact_sec": 360,
  "hazard_type": "front_advance|spot_fire" }
```

### Agentic loop (plan → retrieve → decide → act → remember)
1. **Plan/monitor:** the local engine recomputes the situational model each tick and flags threshold crossings — front-advance and spot-fire are independent hazard generators, both feeding the same trigger.
2. **Retrieve:** on a crossing, the orchestrator assembles the grounded JSON state blob (critical path); on an operator question, the model calls tools itself (off-critical path).
3. **Decide:** Crusoe reasons over state **and prior overrides** and emits ONE JSON advisory (what to say, to whom, which route, how urgent, which hazard type).
4. **Act:** UI renders the single card + Glass-Box pulse, streaming the phrasing; operator taps **APPROVE** (route committed) or **OVERRIDE + reason chip**.
5. **Remember:** the override + reason is written to **override memory**: it flags the dismissed route as blocked (hazard-specific) **and** widens a **per-crew, hazard-agnostic safety-margin bias** (see below). The *next* invocation reads it — on the *same* hazard type, that means a rerouted, sharper advisory; on a *different* hazard type, it means an earlier warning the commander never explicitly asked for. That is the trust loop, closed, legible, and generalizing.

### State / memory
- **Situational model** — in-memory, per tick.
- **Override log** — persisted (SQLite/JSON): `{ts, crew, dismissed_route, reason, margin_delta, hazard_type}` → derives two things the next Crusoe call consumes: a **per-route blocked flag** (hazard-specific) and a **per-crew `safety_margin_bias`** (hazard-agnostic, so it applies the next time *any* hazard type threatens that crew).

---

# 7. Buildable-in-2-days plan (honest scope)

**Real (built during the event):** the situational-model engine (fire CA, independent spot-fire generator, wind, crew ETA, time-to-impact, threshold detection); the FastAPI/WebSocket pipeline; the full **Crusoe integration** on both call patterns (single-shot JSON-mode critical path + function-calling "Why?"/question path); override memory with the **hazard-agnostic margin bias** + visible adaptation on two distinct hazard types; the single-card map UI with **Glass-Box** pulse and the three-state override control.

**Mocked / simulated (stated plainly in the pitch):** the three input *streams* are simulated — we have no live fire. But the wind/fire/crew data flows through the **real pipeline exactly as real telemetry would**; the constants (rate-of-spread vs. wind & slope, crew move speeds, safety margins, spot-fire probability) are grounded in **published wildland-fire figures (Rothermel model family, LCES doctrine)**; the input adapter is a thin shim we could swap for a real GPS/weather feed. The scenario is **scripted and seeded** for a coherent, reliable story rather than an arbitrary random walk — including *when* the spot fire ignites, so the second adaptation beat is reliable on camera, not a dice roll.

**Model-fidelity honesty:** the on-screen numbers demonstrate *relative* dynamics — which crew's margin is shrinking fastest, relative to which hazard, on what timescale — not calibrated absolute ETAs a real IC could stake a life on today. A production version would validate the CA's constants against NIFC incident data and live RAWS weather feeds before touching real dispatch, and would stay behind the same advise-only, human-approves posture described in §9.

**Hard scope line (held all weekend):** one fire with **two distinct hazard mechanisms** (front advance + ember-cast spot fire), one crew at risk, one override, **two** advisories where the second proves the learned margin transferred. No multi-crew, no historical analytics, no agent-based crowd/physics accuracy race — ever.

| Phase | Deliverable |
|---|---|
| **Day 1 AM** | Freeze the 60-sec shot list + scenario script (including the spot-fire transfer beat). Lock situational-model schema, LLM output contract (incl. `hazard_type`), tool signatures. **Build the graded loop FIRST against STATIC fake state:** one card rendering from Crusoe via the single-shot JSON-mode critical path on **Llama-3.3-70B-Instruct**, with APPROVE/OVERRIDE. Benchmark real p95 against 20+ sample states *now* — if it or the JSON-parse success rate misses budget, drop to the **Llama-3.1-8B-Instruct** fallback same-day, not on Day 2. |
| **Day 1 PM** | Real fire-CA + wind + crew-ETA engine emitting state over WebSocket, **plus the independent spot-fire generator**. Map rendering (fire, wind vector, crews, segment coloring). Override memory (blocked-route flag + hazard-agnostic margin bias). **Coarse Glass-Box pulled forward from Day 2:** segment + crew flash in sync with card appearance (token-level polish deferred, not the effect itself). |
| **Day 2 AM** | Glass-Box **polish** (token-stream-synced pulse, refining the coarse version already live). Wire the off-critical-path **function-calling "Why?" / tap-a-segment** question flow. Script and rehearse the **second-advisory transfer beat** (spot fire, earlier trigger, on-screen "flagged Xs early" delta). Latency hardening: **hard ~1.2 s timeout → templated fallback** built from the same structured state, pre-warmed connection, measured p95 on the named model. Plain-English-test every string on someone outside the team. |
| **Day 2 PM** | Rehearse to known p95 latency; tune scenario for drama + legibility; shoot the 1-min video (multiple takes) + **record a backup take**. Buffer. |

**Fallback (de-risks the fire sim):** if the live CA isn't visually convincing by midday Day 2, drop in a **pre-authored spread replay** that still drives the *real* pipeline and *real* inference — just not physically simulated. **Fallback (de-risks Crusoe):** the model swap above is a same-code-path, same-contract config change decided from Day 1 AM benchmark data, not a demo-day scramble. Judges score the situational-model-plus-override loop, not fire physics or model size.

---

# 8. The 1-minute demo script (moment by moment)

- **0:00–0:07 — Calm.** Terrain map; a contained fire (orange) to the NW; wind arrow blowing *NE, away from crews*; **Crew Alpha** (blue, 6 pax) working a line on **Ridge Trail**, planned egress **East Ridge** shown as a green dashed route. HUD: "Incident: Granite Ridge · Crew Alpha · Status **NOMINAL**." No card. Tickers quietly update (wind 12 mph NE, ROS 8 ch/hr).
- **0:07–0:16 — The turn.** Wind vector swings **NE → SW** (red "WIND SHIFT" flash). Fire accelerates toward Ridge Trail; segments recolor amber → red as time-to-impact drops. No words needed — tension builds visually.
- **0:16–0:27 — The advisory.** ONE Situation Card slides in, streaming from Crusoe token-by-token; in sync, the triggering **fire cells + Ridge Trail segment + Crew Alpha pulse** (Glass-Box). RISK / ACTION shown; **countdown 6:00** ticking; big **APPROVE / OVERRIDE**. (A quick "Why?" tap reveals grounded ROS/distance/ETA.)
- **0:27–0:35 — The override.** Commander taps **OVERRIDE**, taps reason chip **"ROUTE BLOCKED"** (East Ridge is smoked in). Card acknowledges. The human corrects; the machine listens.
- **0:35–0:44 — Adaptation #1 (the reroute).** Agent recomputes live. East Ridge greys out (flagged blocked); a **new egress, Canyon Road, lights up**; countdown recomputes: *"Understood — East Ridge flagged blocked. Next safe egress: Canyon Road."* Crew icon starts moving along Canyon Road.
- **0:44–0:53 — Adaptation #2 (the proof — money shot).** An **ember-cast spot fire** ignites ahead on Canyon Road — a hazard the commander never touched. Because the margin is still widened from the last override, the agent fires **early**: *"Spot fire ahead on Canyon Road — flagging 90s earlier than default. Margin still widened from your last override."* On-screen delta stamp: **"90s EARLIER."** This is the beat that proves generalization, not memorization.
- **0:53–1:00 — Resolution + tagline.** Crew Alpha reaches the safety zone (icon → SAFE); fire crosses the now-empty trails behind them. Tagline: *"FIREBREAK — fire-and-wind telemetry into one sentence a chief can trust in six seconds. And it gets sharper every time they override it — even on hazards they never touched."*

---

# 9. Impact & adoption

FIREBREAK's central bet is that "trust, question, override" only means something if the override provably changes future behavior **beyond the single fact corrected** — which is exactly what the spot-fire transfer beat (§4) demonstrates on camera, not just asserts in a pitch.

- **Real-world grounding:** the wind-shift-invalidates-escape-route failure mode is the textbook wildland-firefighter killer (**Yarnell Hill, 2013 — 19 dead**), codified in **LCES** (Lookouts, Communication, Escape routes, Safety zones) and the 10 Standard Fire Orders. FIREBREAK operationalizes *escape-time vs. rate-of-spread* — the exact math that doctrine says keeps crews alive.
- **Who benefits:** IC/Division Sups first; then utility storm crews, SAR, and event security — anyone running the **advise-a-named-authority, never-auto-actuate** command model (a decision *support* tool, not an autonomous actuator, which is precisely why one-tap override is load-bearing for real adoption, not cosmetic).
- **Honesty on model fidelity:** the on-screen numbers show *relative* dynamics — which crew, relative to which hazard, on what timescale — not calibrated absolute ETAs a real IC could stake a life on today. Production deployment would validate the CA against NIFC/Rothermel-calibrated spread data and live RAWS weather feeds before it touched real dispatch, while keeping the same advise-only posture.
- **Failure modes handled:** model latency/outage → hard timeout + templated fallback from local state; hallucinated risk → impossible (detection is local, LLM claims are tool-grounded); alert fatigue → silent until threshold, exactly one card; wrong recommendation → one-tap override that immediately reshapes the next advisory, on any hazard type.

---

# 10. Risks & mitigations; stretch goals

| Risk | Mitigation |
|---|---|
| **Legibility in 60 silent seconds** (biggest risk) | Script the video hour one; plain-English-test every string on an outsider; lean on the fact that *fire advancing on people + a countdown* needs zero domain literacy. One map, one card, one action visible at any instant. |
| **Fire-sim looks janky** | Time-box it; fall back to live-pipeline authored replay. Judges grade the loop, not fire physics. |
| **Crusoe latency / mid-demo hiccup** | Named model (**Llama-3.3-70B-Instruct**) benchmarked for real p95 on Day 1 AM; named same-contract fallback (**Llama-3.1-8B-Instruct**) swapped same-day if budget is missed. Critical-path call is single-shot JSON-mode — exactly one network hop to budget, not an open-ended tool chain. Hard ~1.2 s timeout + templated fallback from the same structured state, pre-warmed connection, rehearsed p95, **recorded backup take** for the 50% Demo score. |
| **Crusoe function-calling / JSON-mode support unverified** | Removed from the critical path entirely — the six-second countdown never depends on tool-calling. JSON mode (the more reliably-supported half) is the only Crusoe feature the countdown depends on, and it's verified against real sample states on Day 1 AM before anything else is built on top of it. True function-calling is confined to the optional, untimed "Why?"/question path — if it underperforms, it's cut, not the show. |
| **Scope creep toward accuracy over legibility** | One fire / one crew / one override, enforced. Two hazard *types* (front + spot fire) because that's what proves generalization — not two crews, not multi-region. Simple in/out spread accounting, not agent-based modeling. |
| **"Is the LLM doing anything?"** | It fuses multi-stream state into a single prioritized judgment on the critical path, and separately runs genuine multi-step tool-calling on the operator-initiated question path. It reasons over the override to choose a new route **and** to recalibrate a hazard-agnostic margin that changes *when* it speaks on a later, different hazard — that cross-hazard transfer is the substantive agentic work the demo proves on screen, not just phrasing. |

**Stretch goals (only after the core is bullet-proof):** multiple crews with cross-crew prioritization (the natural next generalization axis after cross-hazard); a spotter/dispatch text feed as a fourth stream the model reconciles; an after-action timeline replaying every advisory + override; voice-out of the advisory for a hands-on-radio commander; promote the off-critical-path function-calling onto the critical path once measured latency headroom allows it.
