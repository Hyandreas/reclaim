# 1. RackSentinel — the thermal-throttle copilot for GPU-cluster shift engineers

**One-line pitch:** RackSentinel watches a live GPU cluster, predicts *which rack will thermally throttle 5–10 minutes before it happens and why*, tells the overnight shift engineer the one **safe** fix in plain English — including when the safest fix is to do nothing — and visibly, *verifiably* gets smarter every time they override it.

---

# 2. Track & sponsor

**Track 3 — Crusoe.** "Build an agent on Crusoe Managed Inference that constructs a live situational model from streaming inputs and drives proactive, context-sensitive actions a non-technical operator can trust, question, and override."

**Crusoe Managed Inference is load-bearing:** it is the reasoning layer that turns a fused, already-grounded telemetry snapshot into the causal narrative, the human-readable justification for a constraint-safe action, and the plain-English adaptation story. Every *number* the operator relies on — the countdown, the candidate actions, the confidence score — is computed locally and deterministically (§6), so Crusoe's job is judgment and language, never arithmetic it could get wrong live on stage. No Crusoe call, no causal story, no advisory. Endpoint: OpenAI-compatible `api.inference.crusoecloud.com`.

We start from the track's own worked example (c) — a GPU-cluster thermal-throttle copilot that learns from overrides — because it is *literally Crusoe's operational reality*, so "fit to the problem statement" and "useful, for whom" answer themselves. But the brief is a seed, not the pitch. What we actually built past it is four things a generic reading of the example wouldn't hand you for free: (1) a **causal disambiguation** engine that tells pump failure from load from a signal-*shape* read a threshold alarm structurally cannot make; (2) a constraint-aware action set where the correct answer is sometimes **to do nothing**; (3) **cross-rack contagion foresight** — the fix chosen for one rack is scored on the cooling headroom it frees for its neighbor on the same loop; and (4) a learning loop that is **deterministic by construction**, not an LLM hoping to notice a pattern on cue. Those four are the actual pitch; the domain is just where we chose to prove them.

---

# 3. Problem & who it's for

**The operator:** a solo overnight NOC / shift engineer at a GPU cloud. No ML background, no thermodynamics background — they know their runbook, not a heat-balance equation, and they shouldn't have to. Covering thousands of GPUs alone at 3 a.m., they cannot babysit two hundred rack graphs, and by the time a red number appears on a dashboard the throttle is *already happening*. That's why the product's hard design contract (§6) is that the operator-facing surface is **plain English only** — every DCGM field name and delta-T stays inside the engine, never required reading on their screen.

**The pain, in Crusoe's own P&L terms:** every GPU-minute lost to thermal throttling is **compute the operator already sold** — plus SLA credits owed, shortened GPU lifespan / warranty exposure, and customer churn. Throttling is not a hypothetical; it is directly wasted revenue on the exact infrastructure Crusoe runs. A copilot that catches it *before* it hits is deployable-Monday-morning infrastructure, not a toy.

**Why an agent, not a dashboard:** dashboards are reactive and demand a human read hundreds of metrics. The situational-model agent is proactive — it fuses signals across racks, forecasts forward, attributes root cause, and hands the engineer *one decision*, not two hundred graphs.

**Why this domain, honestly:** we chose GPU racks over the festival-crowd and warehouse-forklift variants because server telemetry is something everyone already accepts is monitored exactly this way, which buys a judge instant credibility and a 100%-repeatable, hardware-free demo — and because a data center is where Crusoe itself runs, so guarding one with Crusoe is a satisfying, load-bearing loop rather than a coincidence. But the novelty case doesn't rest on the domain pick; it rests on the four insights in §2 and the deterministic learning loop in §6, which is where a skeptical domain judge's toughest questions actually land.

---

# 4. What it does — the idea (concrete)

RackSentinel fuses **three streaming signals per rack** into one live situational model, forecasts thermal throttle, and surfaces **exactly one advisory at a time**:

1. **GPU telemetry** — power draw (`DCGM_FI_DEV_POWER_USAGE`), core/memory temperature, throttle-violation counter (`DCGM_FI_DEV_THERMAL_VIOLATION`).
2. **Cooling-loop telemetry** — coolant supply/return **delta-T** and flow rate per loop (PDU/CDU-style).
3. **Scheduler queue** — per-job identity, estimated remaining runtime, **checkpoint-ability**, and customer **SLA tier**.

From these it builds a **topology graph** (cooling loops → racks → nodes → jobs), computes each rack's **time-to-throttle**, and — for every candidate fix — how much cooling headroom it frees for *other racks sharing the same loop*. That last number is what makes cross-rack contagion foresight a real, computed claim instead of a narrative flourish. When risk crosses a threshold, it emits **one card, plain English first, technical grounding one tap away**:

> **Rack 14 will throttle in about 6 minutes.** It looks like a failing pump on Loop B, not extra work — the coolant has stopped carrying heat away even though the rack's job load hasn't changed. The job running there (`train-7b`, ~12 min left) can't be safely moved without losing its progress, so **the safe fix is to cap Rack 14's power by 15%** — which also buys **Rack 15** next door some breathing room on the same loop. **Confidence: 0.82**, computed from how much margin is left before throttle and how much cooling headroom the fix frees up.   **[Apply]  [Why?]  [Override ▾]**

The card carries a plain-language headline, a **countdown-to-throttle** (not a raw probability), and a confidence number the operator can trust *because it's arithmetic, not a model's self-report* (§6). Tapping **[Why?]** expands three signal traces, each led by a **plain-English caption** — "coolant isn't carrying heat away," "job load is flat," "job is nearly done" — with the underlying DCGM field name and units shown only as a small secondary label for anyone who wants it. Nobody has to read a metric to trust or act on the card. Two actions are always exactly one tap away: **[Apply]** and **[Override, because: <reason chip>]**.

**The killer feature — a learning loop that is deterministic, not hopeful.** When the engineer overrides with a one-tap reason ("job nearly done — leave it"), that reason isn't just logged as a memory the model *might* notice next time — it's parsed into a **structured preference rule** (e.g., *near-complete, non-checkpointed jobs → prefer hold/power-cap over migrate*) and written into the **local candidate-action ranker** that every future event passes through *before* Crusoe is ever called. The next time a matching situation occurs — even one with a **genuinely different root cause** (see the named alternate incident in §8) — the ranker has already promoted the learned action to the top of the safe candidate list and adjusted its confidence, and the *orchestrator* (not the model) stamps the card **"adapted after your last override."** Crusoe's job at that point is to narrate the decision, not decide whether to remember it. That's the difference between a demo that's *supposed* to learn and one that's *guaranteed* to — the trust → question → override contract is undeniable in sixty seconds because the mechanism makes it so, not the model's mood.

---

# 5. Why it's novel / differentiation vs the obvious approach

The naive threshold alarm below is the fastest way to show the shape of the problem, but it's an easy strawman — the fairer, harder bar is a *careful* on-call engineer's own instinct, or a hand-authored expert-rules system, and RackSentinel is built to clear that bar too. A human under time pressure defaults to "just migrate it"; a hand-authored rules file can only encode the edge cases its author thought of in advance. RackSentinel's constraint policy is **learned from real operator judgment calls**, not from gut instinct or a rule-writer's foresight ceiling.

| The obvious hackathon build | RackSentinel |
|---|---|
| `temp > X → alert` (single-metric threshold alarm) | **Causal cross-signal foresight:** distinguishes *pump degradation* from *load* by reading delta-T rising while GPU temp is still nominal |
| Fires *after* the incident | Forecasts **5–10 min ahead** via temperature-slope extrapolation vs throttle threshold + cross-rack cooling headroom |
| Always says "migrate it" | **Constraint-aware action:** sometimes migrate, sometimes **power-cap**, sometimes **do nothing** — because a non-checkpointed / high-SLA job *can't* be safely moved |
| Optimizes the one rack in front of you | **Cross-rack contagion foresight:** the chosen fix is scored partly on the cooling headroom it frees for racks sharing the same loop, not just the rack that triggered it |
| Static rules, capped by a rule-writer's foresight | **Learned, not authored, constraint policy:** each reason-coded override becomes a structured preference the local ranker deterministically re-applies — including to a *differently-caused* future incident |
| "Trust the number because the model said so" | **Confidence you can recompute by hand:** derived from forecast margin + cooling headroom + override precedent, not an LLM's self-report (§6) |
| Generic alerting | **Recursive hook:** an agent running on Crusoe inference, guarding Crusoe-style racks — memorable and self-explaining |

The differentiator judges will feel: root-cause attribution plus a safe action under real operational constraints, **learned deterministically from the operator** rather than hardcoded or hoped-for — not a threshold alarm wearing an LLM costume, and not an LLM wearing a rules-engine costume either.

---

# 6. How it works — architecture & agentic flow

Three services, one screen. Streaming is plain **WebSocket/SSE** — we explicitly reject Kafka/Flink-style pipelines as over-engineering that only adds live-demo failure surface.

```
┌─────────────┐  telemetry frames   ┌──────────────────────┐  situational state  ┌──────────────┐
│  Simulator  │  (1–2s, WebSocket)  │  State/Forecast svc  │   (WebSocket/SSE)   │ Mission      │
│  (Python)   │ ──────────────────▶ │  (FastAPI, LOCAL)    │ ──────────────────▶ │ Control UI   │
│ physics +   │                     │ graph + risk math +  │                     │ (React)      │
│ incident    │                     │ constraint logic     │ ◀── Apply/Override ─ │              │
│ script      │                     └──────────┬───────────┘   (reason chip)      └──────────────┘
└─────────────┘                     threshold  │  crossed → ONE call
                                                ▼
                                   ┌──────────────────────────┐
                                   │  Agent layer             │
                                   │  Crusoe Managed Inference │  strict JSON out
                                   │  (Gemma 3 12B / Llama 3.3)│  + episodic memory
                                   └──────────────────────────┘
```

**Service 1 — Simulator (Python).** A physically-modeled capacity simulator, not a number player. Per rack, per tick: `dTemp/dt = (power_draw − cooling_capacity) / thermal_mass`, where `cooling_capacity = flow_rate × ΔT_design × pump_health`. `pump_health` decays from 1.0 toward ~0.4 over the scripted incident window — that decay **is** the coolant delta-T drift the model detects, mechanically, not scripted as a separate fact. Throttle timing is never hardcoded: it falls out of when accumulated `Temp` crosses the DCGM-documented onset band (measurable compute loss beginning around an ~80 °C-class core / mid-80s memory for this GPU generation, worsening past that). Two racks sharing a loop share the same `cooling_capacity` pool, which is *what makes contagion real* rather than asserted — capping one rack's power mechanically frees capacity the model can compute for its neighbor. It runs a **seeded incident script** (pump degradation on Loop B → delta-T drift → predicted throttle on Rack 14, with Rack 15 on the same loop trending amber a beat behind), but a judge can perturb an input — trigger a load spike — and watch the physics respond on its own timing.

**Service 2 — State/Forecast service (FastAPI). This is the situational model.** Ingests frames into the live topology graph and runs **all risk math, classification, ranking, and scoring locally and deterministically — no LLM anywhere in this service:**
- **Forecast:** temperature-slope extrapolation per rack → **time-to-throttle** countdown.
- **Root-cause pre-classification (grounding, not guessing):** compares the slope of coolant flow/delta-T against the slopes of temp and power — `Δcoolant high AND Δtemp ≈ flat` tags `pump_suspected`; `Δtemp AND Δpower rising together` tags `load_suspected`. This tag is handed to Crusoe as grounding evidence; Crusoe turns it into the specific plain-English narrative, but the classification itself is arithmetic a judge can check by hand.
- **Headroom & contagion:** cross-rack / cross-loop cooling headroom for migration targets, and — for every candidate fix — the `cooling_capacity` it frees for other racks on the same loop.
- **Constraint eligibility:** for each at-risk job, is it checkpointed? runtime remaining? SLA tier? → the *set of safe candidate actions* (migrate-to-Rack-N / power-cap-X% / hold).
- **Structured-preference ranker:** every override is parsed into a rule keyed by a **situation signature** — `(root_cause_tag, checkpointable: bool, sla_tier, remaining_runtime_bucket)`, e.g. `(pump_suspected, not_checkpointed, gold, <15min)` → *prefer hold/power-cap over migrate*. A new event matches on the full signature first, falling back to just the job-constraint flags if no root-cause match exists — which is exactly what lets a preference learned on a *pump-driven* incident generalize to a *load-driven* one (§8). This re-ranking runs **before** Crusoe is called, so the promoted action is already decided by the time the model sees the event.
- **Confidence — computed, not authored:** `confidence = clamp(w1·margin_score + w2·headroom_score + w3·precedent_boost)`, where `margin_score` comes from how far/fast the forecast crosses the threshold, `headroom_score` from the cooling headroom the chosen fix frees, and `precedent_boost` from how many past operator decisions agree with this situation signature (an exact signature match contributes more than a fallback constraint-only match, so confidence rises less on a genuinely novel-but-related case than on a near-repeat). Crusoe never sets this number; it only explains it.
- **Threshold gate:** only when forecasted risk crosses a threshold does it invoke the agent. This guarantees the demo fires on time regardless of model latency.

**Service 3 — Agent layer (Crusoe Managed Inference).** Fires **exactly one** inference call per event, for judgment and language — never arithmetic:
- **Input:** a compact structured JSON snapshot — the already-computed countdown, headroom/contagion numbers, confidence, the root-cause tag, the fused signal trends, the **already-ranked safe candidate actions** with the top pick pre-selected by the local ranker, and the original override reason text as narrative flavor (so the model can echo "you said this job was nearly done" back to the operator).
- **Task:** turn the root-cause tag into a specific, plain-English causal narrative; justify *why* the pre-selected action is safe under this job's exact constraints; and phrase the one advisory, including the adaptation tag when the ranker's pick was preference-boosted.
- **Output:** strict **JSON mode** — `{ headline, root_cause_narrative, reasoning, evidence_signals[], flagged_disagreement }`. Note what's **absent**: `action`, `target_id`, and `confidence` are *not* LLM outputs — they're echoed from Service 2's decision, and the UI renders them from there. `flagged_disagreement` is a boolean the model may set if something in the narrative context makes it think the pre-selected action is unsafe; on a flag, the UI still **ships the local decision** and separately surfaces the model's objection for the engineer to read. Crusoe can raise a hand; it cannot overrule the safety-vetted candidate set. The "adapted after your last override" tag is stamped by the orchestrator whenever the ranker's pick was preference-boosted — never something the model has to remember to say. The UI never parses free text for a number that matters.
- **Model:** **Gemma 3 12B Instruct** as primary (lowest latency for structured phrasing on Crusoe) with **Llama 3.3 70B Instruct** as a quality fallback — latency and reliability beat eloquence here. OpenAI-compatible client against `api.inference.crusoecloud.com`, bearer-token auth.

**The agentic loop (perceive → model → decide → explain → act → learn):**
1. **Perceive** — stream telemetry frames.
2. **Model** — maintain the live situational graph + forecast (local).
3. **Decide** — threshold gate; local root-cause tag; local constraint-eligibility and structured-preference ranking down to a single top candidate action; local confidence score. All of this happens before any model call.
4. **Explain** — the Crusoe call turns the tag and the already-decided action into a causal narrative and a justified, plain-English advisory. This is where language and judgment happen, not arithmetic.
5. **Act / override** — operator taps Apply, or Override with a one-tap reason chip.
6. **Learn** — the override `(situation-signature, recommended action, operator decision, reason)` is parsed into a **structured preference rule** and persisted; the *very next* matching event — regardless of root cause — is re-ranked by that rule **before** Crusoe is called. This is a real, pointable state change in a database row, not a canned line of dialogue, and it is **guaranteed** to fire, not merely likely to. (Scoped correctly for two days as a small local rule table, *not* live fine-tuning.)

**State & memory:** live graph state in the FastAPI service; the structured-preference rule table (keyed by situation signature) in a small persisted store (SQLite/JSON), consulted by the local ranker on every event.

**Demo-safety engineering (protects the 50% Demo score):** detection, countdown, root-cause tagging, candidate-action ranking, preference learning, and confidence are **100% local and deterministic**; the LLM only ever affects the causal narrative and the phrasing, and — thanks to the echo-and-guardrail contract above — it structurally cannot change the safety-vetted action or the confidence number even if it tried. A hard **~1.5 s client-side timeout** falls back to a deterministic templated sentence built from the *same* local decision, so an inference hiccup degrades to "plainer text, identical safe action," **never a blank dashboard and never a different decision.**

**Why this is less work, not more:** moving action-selection and confidence out of the LLM and into a small local rule table plus a scoring function removes the hardest part of any 2-day LLM build — making prompted behavior reliable enough to demo on cue — and replaces it with arithmetic we fully control. The Crusoe call gets *simpler* (pure narration over a decision that's already made) even though the system as a whole got smarter.

**Frontend — single-screen "Mission Control" (React):** a live rack-hall grid (~60% of frame) pulsing color on composite risk; a right-rail **Advisory Feed showing exactly one active card**, plain English on its face, always; a **[Why?] panel** whose three signal traces are each led by a plain-English caption, with the raw DCGM field name shown only as a small secondary label for anyone who wants it; a bottom **Decision Log** strip showing recent overrides, the structured preference rule each one produced, and how confidence and the top-ranked action shifted in response. Strict color discipline: calm blue/green at rest, amber for "watching," **red pulse reserved only for the single live advisory** so red never becomes noise. Reads clearly with the sound off.

---

# 7. Buildable-in-2-days plan

**Real (fully built during the event):**
- The simulator's capacity model (heat-balance ODE, shared cooling-loop limits, queue pressure) with emergent event timing.
- The local forecast + root-cause tagging + constraint-eligibility + contagion-headroom risk engine (the situational model).
- The **structured-preference ranker**: override → parsed rule → persisted → deterministically reapplied on the next matching event, demonstrated across **two named incidents with different root causes** (§8) so it's visibly generalization, not replay.
- The locally-computed confidence formula (margin + headroom + precedent).
- The live Crusoe Managed Inference call with strict JSON contract, the action/confidence echo-and-guardrail, and timeout/fallback.
- WebSocket/SSE streaming and the single-screen Mission Control UI, with a plain-English-first [Why?] panel.
- A **judge-triggerable live load-spike** control to prove it isn't canned.

**Mocked / synthetic (honest):**
- Telemetry is **synthetic but DCGM-accurate** — no real racks, DCGM exporter, or Slurm/K8s integration.
- Actions are **recommendation + simulated effect** — RackSentinel does not execute real migrations/power caps; the simulator reflects the applied action so recovery is visible.

**Scope caps (hard — the antidote to scope creep):** ~8 racks, 2 cooling loops, **two named incident scripts reusing the same racks/loops** (pump-driven on Rack 14, load-driven on Rack 15 — no new geometry), one clean recovery animation, one advisory format. **No** multi-datacenter, cost dashboards, real fine-tuning, or 3D visuals until the core loop is bulletproof.

**Milestones:**
- **Day 1 AM:** simulator emits DCGM-shaped frames (heat-balance ODE) over WebSocket; FastAPI ingests into the topology graph.
- **Day 1 PM:** local forecast (time-to-throttle), root-cause tagging, contagion headroom, and constraint eligibility; Mission Control grid renders live risk. *Milestone: risk visibly builds on screen with zero LLM, and the "also protects Rack 15" headroom number is already on screen.*
- **Day 2 AM:** structured-preference ranker wired end-to-end (override → rule → persisted → re-applied); Crusoe call wired with JSON contract + echo-and-guardrail + timeout/fallback; advisory card with plain-English [Why?] and [Apply]/[Override]. *Milestone: end-to-end advisory fires live with a locally-computed confidence number.*
- **Day 2 midday:** override on the Rack 14 (pump) incident → judge-triggered load spike on the Rack 15 (load) incident → adapted advisory + Decision Log showing the exact rule that fired. *Milestone: the learning beat fires deterministically, twice, across two different root causes.*
- **Day 2 PM:** rehearse the 60-second script to know p95 latency cold; record the backup take.

---

# 8. The 1-minute demo script (moment by moment)

*Single screen throughout. Live simulator running the whole time.*

- **0:00–0:10 — Calm baseline.** Mission Control shows 8 racks in steady blue/green, telemetry ticking. Narration: *"3 a.m., one engineer, one screen — everything's fine."*
- **0:10–0:22 — Risk builds on its own.** Loop B's coolant flow starts degrading; Rack 14 shifts amber ("watching"), and Rack 15 — sharing the same loop — trends amber a beat behind it. No alert yet; the forecast is working silently.
- **0:22–0:32 — The advisory fires.** Rack 14 pulses red; **one** card appears, plain English first: *"Rack 14 will throttle in about 6 minutes. Looks like a failing pump on Loop B, not extra work. Its job can't be safely moved, so cap Rack 14's power by 15% — which also buys Rack 15 headroom on the same loop. Confidence 0.82."* Narration: *"It saw it six minutes early, named the cause, and the fix protects the rack next to it too."*
- **0:32–0:42 — Question, then override.** Engineer taps **[Why?]** → three signal traces expand, each captioned in plain English ("coolant isn't carrying heat away," "load is flat," "job is nearly done"), DCGM fields visible only as small secondary labels. Engineer taps **[Override ▾] → "job nearly done — leave it."** The Decision Log logs the reason **and the rule it just created**: *"near-complete, non-checkpointed jobs → prefer hold."*
- **0:42–0:52 — It visibly, deterministically learns — on a different failure.** A judge triggers a live load spike on **Rack 15**. This is a genuinely different root cause (load-driven, not a pump — temp and power climbing together), and the card correctly names it as such. But Rack 15's at-risk job is also near-complete and non-checkpointed, so the rule just taught applies: the local ranker has already promoted **hold** before Crusoe is even called, and the card arrives tagged **"adapted after your last override"** with a shifted confidence. Narration: *"Different failure, same lesson — it applied what I taught it without being told to."*
- **0:52–1:00 — Recovery + the line.** Engineer taps **[Apply]** on a genuinely safe one; the rack cools back to green live. Close: *"Every rack that throttles is compute you already sold. RackSentinel stops it before it happens, protects the rack next door too — and never moves a job without your yes."*

The three proof-points that kill "it's canned": the **judge-triggered live spike**, the **visibly different root cause** it's triggered on, and the fact that a **persisted rule — not the model's memory** — is what's driving the next real recommendation.

---

# 9. Impact & adoption

**Real-world grounding:** this maps 1:1 onto Crusoe's commercial reality. Throttling = lost sold compute-hours + SLA credits + shortened GPU lifespan + churn. The buyer ("shift engineer / NOC lead at a GPU cloud") is precise and credible; the operator-facing surface is plain English by design (§6), while the reasoning engine underneath still uses real DCGM field names an infra judge will recognize instantly.

**Who benefits:** the overnight shift engineer (fewer 3 a.m. surprises, one decision instead of 200 graphs, in language that never requires a physics background), the NOC lead (an auditable, reason-coded override trail where every rule the system learned is a readable row, not a black box), and the operator's margin (recovered compute-hours, now partly protected on neighboring racks too via contagion-aware fixes).

**Failure modes handled:**
- *LLM latency/hiccup* → local detection + 1.5 s timeout + deterministic safe-default fallback; never a blank screen, never a changed decision.
- *LLM disagrees with the safety-vetted action* → the local decision still ships; the model's objection is surfaced separately for the engineer to read, never silently overridden and never silently suppressed.
- *False positive* → one-tap override with a reason; the ranker adapts — guaranteed, not just likely.
- *Un-migratable job* (checkpoint/runtime/SLA) → recommends power-cap or hold, never an unsafe migration.
- *Autonomy fear* → **never a silent autonomous action on a customer's paid job** — every action requires the operator's yes, with an explainable, recomputable evidence trail.

**Adoption path (deployable Monday):** swap the simulator for a real DCGM exporter + Slurm/K8s connector reading live nodes; the situational model, the structured-preference ranker, and the override loop are unchanged. Obvious next steps: LLM-assisted refinement layered on top of the deterministic confidence baseline, predictive maintenance (pump degradation is *already* being inferred), and power-capping / migration executors.

---

# 10. Risks & mitigations; stretch goals

**Risks**
1. **"It's a fake dashboard playing scripted numbers"** (guts Impact + Creativity). → A real, continuously-running simulator with an actual heat-balance model so events emerge on their own timing; a **judge-triggered live load-spike** in the rehearsed run; and the override's effect on the next threshold is a **genuinely persisted rule we point to in a log** — never canned dialogue, and structurally incapable of being coincidence because the ranker applies it *before* the model is even called.
2. **Live-inference hiccup on stage** (hits the 50% Demo score). → Detection, ranking, and confidence are 100% local/deterministic; the LLM only narrates the cause and phrases the advisory, and cannot overrule the safety-vetted action even if it tries; hard timeout + templated fallback; rehearse until p95 latency is known cold; hold a **recorded backup take** as insurance.
3. **"The learning is just an LLM noticing a pattern, which might not happen on cue"** (the sharpest possible judge objection, and the one we designed hardest against). → It doesn't rely on that at all: overrides are parsed into structured preference rules consulted by the **local ranker before Crusoe is called**, so the adapted action and confidence are guaranteed — and we demo the guarantee across **two differently-caused incidents** (pump-driven, then load-driven) so it reads as generalization, not replay.
4. **"Threshold alert in an LLM costume"** (a domain-expert judge's instinct). → Every advisory cites the specific fused signals behind a locally-computed root-cause tag; confidence is an auditable formula, not a claimed number; the constraint logic is defensible under questioning (DCGM fields, realistic onset, checkpoint/SLA rules, contagion headroom).
5. **Scope creep** (3D, real fine-tuning, N-rack topology, cost dashboards). → Hard caps: ~8 racks, 2 loops, two named incident scripts reusing the same racks, one advisory format, one recovery animation — core loop bulletproof before anything else.

**Stretch goals (only after the core is rock-solid):**
- Real DCGM exporter / Slurm connector reading one live node.
- LLM-refined confidence calibration layered on top of the deterministic baseline (the baseline itself ships in the core build, not as a stretch).
- Carbon-aware action ranking (cheapest-carbon safe migration target).
- Multi-loop contagion visualization extended beyond a single pair of racks (a whole loop's health rendered as a shared resource).
- Power-cap simulation that shows *recovered throughput* in dollars, closing the P&L loop on stage.
