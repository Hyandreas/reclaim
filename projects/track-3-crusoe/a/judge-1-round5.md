# Judge 1 — Round 5 Review: Air Boss (Track 3, Crusoe)

## TOTAL: 14.0 / 15

- Novelty: **4.5 / 5**
- Implementation Plan: **4.5 / 5**
- Usefulness / Relevance: **5.0 / 5**

---

## Novelty — 4.5 / 5

The single strongest novelty move is the deliberate refusal to touch the three sample scenarios (crowd flow, forklifts, GPU thermal) and instead choose "airspace choreography" — drone light shows. It is a fresh, cinematic, memorable domain that wears the track skeleton exactly (WHERE = 3D formation + geofence, WHEN = seconds-ahead extrapolation, RELATIVE-TO = cross-drone convergence + wind field), and the "Air Boss" framing is a genuinely sticky pitch. There is also a real domain insight, not just a reskin: the model distinguishes a *formation-wide* deviation (a cluster of neighbors sharing a drift = wind) from an *isolated* one (one drone diverging while neighbors stay nominal = motor/GPS fault), and these demand opposite actions — hold/reroute the group vs. send one drone home while the show continues. That is a real, defensible piece of thinking that competitors copying the examples cannot reach.

What holds it back from a 5 is that the underlying *mechanism* — deterministic detector + LLM-as-narrator + append-only override log + preference table — is an increasingly familiar "LLM phrases, never decides" safety pattern. It is executed unusually well here, and the "the LLM never touches a single number" articulation is crisp, but the pattern itself is not itself striking. Novelty is carried almost entirely by the domain pick and the cluster-vs-isolated insight. Notably, that insight — the one thing most distinctive — is relegated to a stretch goal on camera, so what a judge actually *sees* in the 60s is the expected detect → narrate → override loop. Promoting the disambiguation to a shown beat would convert a described insight into a demonstrated one and push this to a 5.

## Implementation Plan — 4.5 / 5

This is one of the more concrete and buildable plans I could ask for. The stack is specific and appropriate (Python + FastAPI world-state service, WebSocket streaming, React SPA on HTML5 Canvas, Web Speech API TTS, Crusoe Managed Inference). The agent loop (perceive → model → detect → retrieve → reason → act → learn) is real and each stage is technically sound: rolling per-drone buffers, short-horizon trajectory extrapolation, pairwise closing rate / predicted min-separation, geofence drift, battery-to-RTL margin, k-NN deviation — all standard, all local, all doable in the time. Crusoe is honored in a genuinely load-bearing *and* safely bounded way: it owns only the sentence + why-chips (each citing a provided signal fact verbatim), with severity/action/colors attached deterministically afterward. Named models (Gemma-3-12B-Instruct primary for latency, Llama-3.3-70B-Instruct fallback), the OpenAI-compatible endpoint, strict JSON mode, and a ~1.5s timeout → templated fallback all show real homework. The masterstroke for buildability is making the learning loop **deterministic** (a preference table read *before* Crusoe is called), which removes the single most demo-fragile feature from the realm of "hope the prompt sways the model." Honest real-vs-mocked scope, a day-by-day plan, replay mode, and a pre-recorded safety-net video round it out.

Three minor gaps keep it at 4.5 rather than 5. (1) "Gorgeous/cinematic" is a load-bearing selling point but gets only "Day 2 PM polish" — rendering 100+ drones holding a *beautiful* formation, plus a reroute animation that *visibly clears* the corridor, is real front-end work that can underdeliver on the beauty promise if left to the last afternoon. (2) The specific Crusoe model IDs and their structured-output support are asserted but unverified; a wrong ID or missing JSON-mode on the chosen model costs integration time (the fallback softens this, but it is worth confirming before the event). (3) Latency and thresholds are qualitative (X m, Y s, ~1.5s) rather than pinned to concrete demo values, so the claim that 1.5s is "comfortable" for two live on-camera calls is assumed rather than measured.

## Usefulness / Relevance — 5.0 / 5

This is the standout axis. The proposal maps onto the track statement almost point-for-point: a live situational model from genuine 10 Hz streaming input; what/where/when *relative to what else is changing* spelled out explicitly; proactive advisories that fire seconds before a human would catch the risk; an operator who is explicitly *not* a swarm engineer; trust (deterministic why-chips, LLM never touches numbers), question (always-visible signal chips that cite the exact facts behind the call), override (one-tap APPROVE/ADJUST/IGNORE + reason chip), and — matching the GPU-thermal example's "learns from each override" language directly — a visible override→adaptation loop as the centerpiece. Every track verb is present and first-class. The real-world grounding is exceptional and, unusually, elevates relevance above the sample scenarios: two real commercial incidents (Melbourne Docklands 2023, Orlando Lake Eola 2024, the latter with an injured child and a suspended FAA waiver) and FAA Part 107.35, which writes the human abort-call *into federal law*. That makes human-in-the-loop override not a UX nicety but the legally adoptable shape of the product — a stronger relevance argument than any of the three examples carries. The buyer (Flight Director / show operator), the beneficiaries (venues, insurers, the crowd), and the value (a decision instead of a data wall; a season-ending waiver protected) are all concrete. The only sliver of imperfection is that the "question" verb is thinner in-core (passive chips; interactive tap-to-query is stretch), but the always-on, fact-citing why-chips genuinely serve interrogation at the decision point, so I do not count it as a notable gap.

---

## Concrete Strengths

- **Near-perfect track fit.** WHERE/WHEN/RELATIVE-TO are explicitly mapped, and all three operator verbs (trust, question, override) plus "learn from overrides" are present and central.
- **Crusoe is load-bearing yet safely bounded.** The LLM owns language only, never a number, action, color, or button — a clean, defensible trust story that pre-answers the fatal judge question ("isn't the AI making up the safety numbers?").
- **The learning loop is guaranteed, not gambled.** A deterministic preference table read before the LLM call makes "visible learning" fire on cue, twice, on camera — de-risking the most fragile demo feature.
- **A genuine domain insight.** Cluster-vs-isolated cause classification drives opposite actions (group HOLD/REROUTE vs. single-drone DESCEND-RTL) — a real idea, not a reskin.
- **Outstanding real-world grounding.** Real incidents + a federal waiver that mandates human override make impact concrete and adoption legally shaped.
- **Honest scope and robust fallbacks.** 1.5s timeout → template, one-keystroke replay mode, pre-recorded safety-net video, hardware-free and judge-interactive (judge injects the gust).

## Weaknesses / Gaps

- **The most distinctive insight is not shown.** The cluster-vs-isolated → single-drone-RTL beat is stretch, so the on-camera demo reads as the now-familiar detect → narrate → override pattern; the thing that would most impress a judge stays on paper.
- **The "gorgeous" claim is under-budgeted.** Beautiful 100+ drone formation rendering + a reroute that visibly clears the corridor is real front-end work with only a Day-2-PM polish slot.
- **Unverified Crusoe model catalog.** Specific model IDs and structured-output support are asserted, not confirmed; wrong IDs cost integration time.
- **Two live inference calls in the 60s money moment.** Mitigated by timeout + replay, but still a live-network dependency during the climax.
- **Qualitative latency/thresholds.** X m / Y s / ~1.5s are placeholders, not measured or tuned demo values, so the timing safety margin is assumed.
- **"Question" is thinner in-core** than trust/override (interactive querying is stretch).

## Prioritized Fixes (to raise the score)

1. **(Novelty → 5) Promote the cluster-vs-isolated beat into the core 60s demo.** Add a scripted moment where one drone throws a motor/GPS fault while neighbors stay nominal, and the system recommends a single-drone DESCEND-RTL *while the show continues* — visibly different from the group HOLD/REROUTE. This shows the one insight competitors literally cannot copy from the crowd/forklift/GPU examples, and it is already in your detector, so only the scripted moment is new.
2. **(Implementation → 5) Verify the exact Crusoe Managed Inference model catalog before the event.** Confirm Gemma-3-12B-Instruct / Llama-3.3-70B-Instruct (or their real equivalents) are actually served and that JSON/structured-output mode works on the chosen model; name the confirmed primary. This removes the biggest integration-time surprise.
3. **(Implementation) Pre-bake the choreography and the reroute path.** Make the formation and the corridor-clearing reroute deterministic and rehearsed rather than computed live, and specify how the sim computes the clean new lane so the corridor reliably blooms red and clears green on cue. This protects the "gorgeous" selling point that currently rides on one polish slot.
4. **(Implementation) Pin concrete latency and threshold numbers.** State the expected {message, why[]} token count and p50/p95 completion time on the chosen Crusoe model to justify the 1.5s timeout, and lock the separation/geofence trigger values (X m, Y s) you will demo with so the advisory fires cleanly.
5. **(Usefulness bulletproofing) Make one "question" affordance first-class in-core.** A simple tap-a-drone/group to reveal its contributing signals promotes the third track verb from stretch to shown, so trust/question/override are all on camera.
6. **(Impact bulletproofing) Add a concrete auditable artifact.** One line on how the override log exports to an incident timeline for venues/insurers turns the "auditable, human-in-the-loop" claim into a pointable deliverable.
