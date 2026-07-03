# 1. Handoff — the care agent that never starts over

**One-line pitch:** The single biggest cause of preventable patient harm is a bad handoff. Handoff is a multilingual care-coordination agent that hears a caregiver in any language, remembers across every shift and caller, and drives the chart itself — so a flag raised at 3am in Spanish is still alive two days later when a different aide calls in Mandarin.

---

# 2. Track & sponsor

**Track 4 — Google DeepMind.** "Build an agent that can't forget its snapshot." Handoff makes a genuine causal cascade of three Gemini primitives — **Live Translate → Antigravity (Interactions API) → Gemini Computer Use** — where each later primitive fires *only because* the earlier one already established state, and the loop closes back into Live Translate. Persistent memory across time, language, and personnel is not a feature here; it is the entire product.

---

# 3. Problem & who it's for

**The user:** the lone coordinator at a home-health / shift-based care desk (equally an in-hospital charge nurse or facilities night desk). They are not a trained interpreter, they work alone across a shift, and they share no language with the frontline caregivers phoning in status on vulnerable patients. Today they triage by sticky note and a phone translation app, and **anything unresolved when their shift ends is effectively forgotten by morning** — the exact failure the track brief names.

**Why it matters (grounded, defensible):**
- ~**25 million** US residents have limited English proficiency (LEP); **Title VI** and **ACA §1557** already legally require federally-funded care to provide qualified interpretation.
- The **Joint Commission** repeatedly names **communication failure as the top root cause** in sentinel-event reviews.
- The **I-PASS handoff study (NEJM, 2014)** showed a *standardized* handoff bundle cut medical errors by **~23%** across nine hospitals — proof that fixing the handoff measurably reduces harm.
- **CMS financially penalizes** hospitals for preventable 30-day readmissions, many tied to a status change that nobody carried forward.

A forgotten flag in this world is not an inconvenience — it is a health risk with regulatory and financial teeth. The home-health workforce is large, immigrant-heavy, multilingual, and coordinates the most vulnerable patients through software built decades ago.

---

# 4. What it does — the idea (concrete)

A caregiver calls the desk. **Live Translate** carries the conversation both directions in real time — Spanish/Mandarin/Tagalog in, English out, and back. As they speak, **Antigravity** silently extracts each clinically meaningful fact (pain score, BP, med taken/missed, wound status) into a **persistent case record** — one structured card per fact, each card stamped with the *exact translated clause it came from* so every entry is auditable, not asserted.

The moment Antigravity's **diff** detects a status change or an actionable, unaddressed item — and *only* then — the coordinator taps **one** confirm button, and **Gemini Computer Use** visibly takes the mouse and drives our (deliberately legacy-styled) care-management portal: it logs in, finds the patient, and **drafts** the note / flag / escalation, shown as a before/after diff. Nobody touches the mouse. Nothing auto-commits.

**The killer beat — the callback.** Two days later (compressed to ~15s on stage) a *different* caregiver calls about the *same* patient, in a *different* language. Before they finish the sentence, Handoff speaks back **in their language** — *"This is a repeat: Mr. Delgado's BP was flagged Monday, MD callback still pending. Is it still elevated?"* — surfacing Monday's cards unprompted, then one-taps Computer Use to escalate the still-open item live. A snapshot chatbot physically cannot produce that moment. Only a system that genuinely held state across two separate, differently-languaged calls can — the whole track thesis staged as one unmistakable beat instead of argued in a pitch.

---

# 5. Why it's novel / differentiation

**Versus the obvious "translate + a chatbot" approach:** a translated call alone is just subtitles that vanish when the call ends. Our differentiation is a **true causal chain, not three features bolted together**:

1. **Translate produces facts** (not just captions).
2. **Memory decides relevance** — the *diff* between new facts and held state is the decision engine; a translated sentence that changes nothing triggers nothing.
3. **Only a relevant diff fires the autonomous action** — this is exactly the track's stated bonus: *"a second primitive only fires because the first is already running."* We go one hop further than the brief's own example combos: after the human tap, the loop **closes back into Live Translate**, speaking the next clarifying question in the caller's language.

**Creativity that lands in the room:** the two-calls / days-apart / different-languages / same-patient structure is a *staged narrative device*, not a slide. And the visual contrast — a warm, human call UI next to a beige, tiny-font, Web-1.0 legacy portal being driven by an autonomous cursor — sells "why this needs an agent" in two seconds with no voiceover. Elder/home care is a sharper, less-expected vertical than the construction/security framings in the brief, so it reads as our own idea while reusing the validated primitive cascade.

---

# 6. How it works — architecture & agentic flow

**Load-bearing primitive chain (Track 4 mandate):**

```
 CALLER (Spanish/Mandarin/Tagalog audio)
        │
        ▼
 [1] GEMINI LIVE TRANSLATE  ── bidirectional speech↔speech + live captions
        │  translated transcript (with source-language clause)
        ▼
 [2] ANTIGRAVITY / INTERACTIONS API  ── long-running agent, PERSISTENT case state
        │  • Gemini extracts structured facts (each carries evidence clause)
        │  • merges into durable per-patient record (survives call end / shift / days)
        │  • DIFF ENGINE decides: new? status-change? repeat of an OPEN item?
        │  emits trigger  →  {status_change | actionable | repeat_detected}
        ▼  (fires ONLY on a relevant diff)
 [3] GEMINI COMPUTER USE  ── screenshots + plans + clicks OUR legacy portal
        │  login → find patient → DRAFT note/flag/escalation → before/after diff
        ▼
   HUMAN ONE-TAP CONFIRM  (safety gate — nothing commits without it)
        │  commit
        ▼
 [1] LIVE TRANSLATE (loop closes)  ── speaks next question back in caller's language
```

**Specific stack / models / APIs:**
- **Live Translate:** Gemini **Live API** (native-audio, bidirectional streaming). We feed pre-recorded caller audio *through the genuinely live session* (mitigating venue-mic chaos) so the translation is really produced by the API, emitting translated audio + text captions both directions.
- **Antigravity / Interactions API:** one long-running **Interactions API session per patient**, reopened by **patient id** on every inbound call regardless of which caregiver or language is on the line — the same resumable-session mechanic as the track brief's own security-audit example ("resumes by environment ID"). The session owns the **Case State**: structured JSON (patient id, open items, a timeline of facts each with its evidence clause, and status), mirrored to a small durable store (SQLite/Postgres) so state outlives process restarts, not just in-session idle time. Fact extraction and the next-question composer run on **Gemini**; a deterministic **diff evaluator** compares new facts to prior state and emits the action triggers. This is the memory backbone: it survives call end, process idle, reconnection, and personnel change.
- **Gemini Computer Use:** the **Gemini 2.5 Computer Use model**, on trigger, in a tight screenshot → action → execute loop: it sees the current portal screenshot, returns one predefined UI function (e.g. `click_at`, `type_text_at`, `key_combination`), our runner executes it and screenshots again, repeating until the model signals done. Because the DOM is **ours and small**, a full draft (open patient → write field → toggle flag, already authenticated) is a **~4–6 action loop**; a pure status-escalation on a chart that's already open is shorter still — which is what keeps both demo beats fast enough for their time budget and reliable enough not to wander. Constrained action space = high reliability.
- **Targets & data:** our own **deliberately legacy-styled** care-management portal (Next.js/plain HTML, seeded fake patients, OASIS/nursing-flowsheet-style field taxonomy so it reads credible to clinicians). Operator console is a **three-panel** Next.js app: *call + live captions* / *persistent case timeline* / *legacy portal with a visibly moving cursor* — so judges watch **causation**, not logs.

**Agentic decision steps:** perceive (translate) → extract (facts + evidence) → remember/diff (merge + relevance decision) → decide (only relevant diff, or a **patient-name match** on an incoming call → `repeat_detected`) → act (Computer Use drafts) → confirm (human tap) → speak back (Live Translate). The **callback** branch is the `repeat_detected` path: the instant a caller names a patient who has an open item in held state, Antigravity resumes that patient's session — which is what lets Handoff reply mid-sentence, before the caregiver has described anything new.

---

# 7. Buildable-in-2-days plan (honest scope)

**Real vs mocked:** Live Translate = **real** Gemini Live API. Antigravity memory + diff = **real** (state genuinely persists between call 1 and call 2). Computer Use = **real** unscripted GUI automation — pointed at **our own** portal, not the open web. Mocked/controlled: the portal itself (we build it), the caller audio (pre-recorded, run through the real pipeline), and the seeded patient data. Everything a judge *sees happen* is real and un-fakeable.

- **Day 0 (setup):** repo + keys (Live API / Computer Use / Interactions API); three-service skeleton; build the beige legacy-portal shell with seeded patients.
- **Day 1 AM:** Live Translate session manager — real bilingual streaming with captions. Antigravity Case State object + Gemini fact-extraction (with evidence clause) writing into it.
- **Day 1 PM:** Computer Use worker driving the portal reliably (log in once and stay authenticated → find patient → draft field → before/after diff, ~4–6 actions). Wire Antigravity diff → Computer Use trigger, hard-gated behind the confirm tap.
- **Day 2 AM:** callback logic (`repeat_detected` patient-name match), speak-back via Live Translate, three-panel operator UI with visible cursor + "2 days later" time-jump card.
- **Day 2 PM:** rehearse the 60s script relentlessly; record the clean backup take; reliability layer (visible "thinking" states so latency reads intentional).

**Scope cut (locked):** one patient, one recurring issue, two calls, rehearsed cold. No auth, no multi-tenant, no real EHR/PMS, no free-form conversation — tightly directed bilingual lines through real APIs. A razor-sharp fully-working core beats a broad half-working system.

---

# 8. The 1-minute demo script (moment by moment)

- **0:00–0:08 — Cold open.** Three panels: warm call UI (left), empty case timeline (center), beige Web-1.0 portal (right). A phone rings: *"Incoming — Rosa, home health aide."* Rosa speaks **Spanish**. English captions stream live, both ways. *(Primitive 1 visible instantly.)*
- **0:08–0:20 — Memory builds itself.** As Rosa speaks (*"Mr. Delgado's pressure is high again, 168 over 95, and he skipped his morning pill"*), the center timeline populates: cards **"BP 168/95 — elevated"**, **"Med missed — lisinopril AM"**, each showing the exact translated clause it came from. *(Primitive 2 visible — auditable memory.)*
- **0:20–0:30 — Autonomous action.** Antigravity's diff flags *status change, MD not yet notified*; one card lights up. Coordinator taps **one** button. The right-panel cursor moves on its own — Computer Use logs into the desk portal, opens Delgado's chart, and drafts a nursing note + MD-callback flag in a handful of visible clicks, shown as a before/after diff. Nobody touches the mouse. *(Primitive 3 — fires only because the diff said so.)*
- **0:30–0:33 — Time jump.** A card fills the screen: **"2 days later."** (Reads even on mute.)
- **0:33–0:48 — HERO BEAT (the callback).** Phone rings: *"Incoming — Mei, night aide."* Mei speaks **Mandarin**: *"I'm calling about Mr. Delgado in 4B, his—"* — and before she names the symptom, Antigravity has already matched "Delgado" to the open item, and Handoff **cuts in, speaking Mandarin** (captioned): *"This is a repeat — his BP was flagged Monday, MD callback still pending. Is it still elevated?"* The timeline pulls up Monday's cards. Different language, different caller, days apart, remembered **unprompted**. *(All three primitives + the persistence thesis, proven not argued.)*
- **0:48–0:57 — Loop closes.** Mei confirms it's worse. Diff escalates → one tap → the still-open portal session (no re-login) jumps straight to Delgado's chart and escalates it to **urgent MD callback** in a couple of clicks, diff commits → Live Translate speaks the next question back in Mandarin.
- **0:57–1:00 — Close.** *"Handoff — the care agent that never starts over. No forgotten flag, no matter the language, the shift, or who's on call."*

---

# 9. Impact & adoption

**Who benefits:** LEP patients (safety), the multilingual frontline workforce (instant fluency and perfect memory for whoever happens to be on shift — no need to hire a dedicated interpreter-dispatcher), the lone coordinator (cognitive load lifted at 3am), and agencies/hospitals (fewer errors, fewer CMS penalties, Title VI / §1557 alignment). **Generalizes cleanly** to any shift-based, multilingual, low-margin frontline operation — in-hospital I-PASS handoffs, hospitality/facilities night desks, disaster response.

**Failure modes handled by design:**
- **"Is this safe?"** — Handoff **drafts and flags; it never diagnoses, orders medication, or submits without the human tap.** Every write is a staged before/after diff behind one confirm/dismiss. This kills the objection before it's asked — critical for a healthcare-adjacent pitch.
- **Trust** — every extracted card carries its **evidence clause**; nothing is asserted.
- **Lost context at shift end** — persistence *is* the product; the case record outlives the call, the shift, and the person.

---

# 10. Risks & mitigations; stretch goals

- **Chaining three real-time AI systems live is high-variance** → rehearse the full loop many times, **submit the cleanest recorded take as the demo video**, keep the identical script runnable live if judges ask.
- **Computer Use flakiness / open-web gambling** → point it **only at our own deliberately-simple, high-contrast legacy portal** (short, deterministic click path, controlled DOM); **hard-gate** the trigger behind the explicit confirm tap so there's zero ambiguity about when it fires.
- **Live mic chaos in a loud venue** → run clean **pre-recorded caller lines through the real Live Translate pipeline** rather than a floor microphone; keep one fully recorded backup take as insurance.
- **Model latency reading as "broken"** → a visible **"thinking"** state so any latency reads as intentional.
- **A mistranslation could inject a wrong clinical fact** (a flipped digit in a BP reading, a missed negation on "medication NOT given") → this is exactly what the **evidence clause** is for: every card shows the source-language clause beside the English fact, so the one-tap confirm is a human sanity-check on the *translation*, not just the *action*. The same gate that stops Computer Use from acting alone doubles as the mistranslation net — the failure mode most specific to a translation-driven clinical product is caught by the design, not bolted on after.

**Stretch goals (only if core is rock-solid):**
1. **Verify-by-sight** — after a write, Computer Use *reads the portal back* to visually confirm the entry landed before speaking success (trusts nothing until it has seen it).
2. Three+ languages in a single session; auto-generated end-of-shift summary handed to the next coordinator.
3. Real system-of-record path (e.g., a FHIR sandbox) as the post-hackathon integration story.
