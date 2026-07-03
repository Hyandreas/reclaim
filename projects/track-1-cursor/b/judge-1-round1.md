# Judge 1 — Round 1 Review: Driftline

## TOTAL: 12.5 / 15

Driftline is a token-vs-code semantic drift reviewer that classifies every discrepancy into a closed verdict taxonomy (Accidental Regression / Intentional Redesign / Platform Constraint / Orphaned Token), grounds detection in deterministic math (CIELAB ΔE, WCAG contrast, numeric thresholds), and constrains fixes to scanner-verified byte ranges so a hallucinated patch is structurally impossible. It is exposed both as a dashboard and an MCP server for Cursor. This is a polished, disciplined, buildable proposal that is strongest on implementation and usefulness and merely solid on novelty.

---

## NOVELTY — 3.5 / 5

The core concept — a CLI/engine that diffs Figma tokens against deployed CSS/code and proposes semantic-mismatch fixes — is one of the three example directions the brief explicitly names, which caps how original the underlying idea can read. What lifts this above "yet another linter" is the framing insight: turning "taste" into a **bounded, testable closed taxonomy** rather than open-ended vibes, and pairing it with a **deterministic spine so the LLM can never invent a delta** and **byte-range-constrained fixes so a bad patch cannot render**. That "structurally impossible to hallucinate" architecture is a genuinely mature insight, and the **Platform Constraint** verdict (iOS HIG 44pt vs. Material 48dp as a *justified* exception, not drift) is a memorable, taste-forward detail that most teams would miss. The presentation touches — reasoning-before-verdict, confidence bands with no fake decimal precision, a blast-radius chip — are thoughtful. But the four-verdict partition is a fairly natural carving of the space once you frame the problem, and nothing here is *strikingly* original; it is an unusually well-executed version of an expected direction. That is a strong 3.5, not a 4.

## IMPLEMENTATION PLAN — 4.5 / 5

This is the proposal's standout axis. The stack is concrete and appropriate end to end (TypeScript, Vite/React/Tailwind, PostCSS + ts-morph/Babel AST for `file:line:col` grounding, `culori` for ΔE/WCAG, `better-sqlite3`, `@anthropic-ai/sdk`, `@modelcontextprotocol/sdk`). The agentic flow is real and well-decomposed: six individually-callable tools (`scan_tokens → scan_repo → diff → classify → propose_fix → apply_fix`) with a clean, correct separation — a deterministic core with **zero LLM**, an LLM layer restricted to just classification and short fix-copy under structured outputs, and a code-owned apply step. That is exactly the right shape: it shrinks the model's job to something small and schema-bounded and makes the demo reproducible. The scope line is disciplined and the real-vs-mocked table is honest (real: detect/diff/classify/fix/apply/audit; deferred: live Figma API, multi-framework, multi-repo, auth). The risk section is specific and the milestone sequencing is fallback-first — the deterministic drift list is demoable by end of Day 1 even if the LLM layer slips, which is the single best de-risking move in the plan. It honors the track tech directly via a working MCP server. Deductions: (1) the breadth is ambitious for two days — a "Linear/Vercel-grade" dashboard AND an MCP server AND a full six-tool pipeline AND a realistic seeded repo with authored git history is a lot, and Day 2 PM is overloaded; (2) the one genuinely fiddly *real* component is Tailwind `className` → token resolution (arbitrary values `bg-[#hex]`, palette classes `bg-blue-800`, dynamic `clsx`/template-literal classNames) with exact byte spans — easy to underestimate and the likeliest time sink; (3) a couple of SDK-surface claims (`thinking: { type: "adaptive" }`, `output_config.format`) are load-bearing for "schema-valid every time" and should be verified against the current SDK. None of these threaten shippability, hence 4.5 rather than 4.

## USEFULNESS / RELEVANCE — 4.5 / 5

Dead-on the primary thrust of the statement: it detects drift, *reasons* about it (the verdict taxonomy is a direct answer to the brief's crux — "enough TASTE to know when something is wrong"), proposes grounded reconciliation, and frames itself as the "shared referee" that keeps designers and engineers aligned without a sync meeting. It hits the exact named example (Figma tokens vs. CSS/code with semantic-mismatch fixes). The real-user value is unusually well-argued: a specific buyer (platform/design-systems engineer at a 50–1,000-person org), a genuinely budgeted problem (role-to-role trust + WCAG/ADA legal exposure — converting "aesthetics" into risk mitigation is a strong, defensible impact framing), a zero-friction CI-gate adoption story, and a concrete close-out metric (14 surfaced, 3 auto-fixed, 1 promoted, ~40 min saved on one PR). The one gap holding it off a 5: the brief asks for consistency across the visual **and interactive** surface, and Driftline is almost entirely static-value/token drift — interaction states (hover/focus/disabled), focus rings, and motion consistency are absent. The "visual" side is well covered (tokens + real rendered components), but the "interactive" half of the statement is underserved.

---

## STRENGTHS (concrete)

- **Deterministic spine → the model can't invent a delta.** ΔE, numeric thresholds, and WCAG math are computed in pure code; the LLM only classifies and writes short fix-copy. This is the right architecture and the main reason the demo can be reproducible to the second.
- **Byte-range-constrained fixes → hallucinated patch is structurally impossible.** `propose_fix` returns `{ token_name, replacement_string }` bound to a scanner-verified span; code applies the unified diff. Genuinely safe, and a strong story for skeptical judges.
- **Closed verdict taxonomy makes "taste" bounded and testable.** The enum (Regression / Redesign / Platform Constraint / Orphaned) is the brief's crux answered concretely, and the Platform Constraint case (HIG 44pt vs. Material 48dp) is a memorable taste signal.
- **Exemplary scope discipline and honesty.** The fixed scope line and the real-vs-mocked table are exactly what a 2-day plan should look like.
- **Fallback-first milestones.** A demoable deterministic drift list by end of Day 1 protects the demo regardless of LLM-layer risk.
- **Impact framing.** WCAG → ADA legal exposure, exact buyer, and a quantified close-out metric make the value legible to a non-technical judge in seconds.
- **Track tech honored.** The MCP server is a real, in-editor Cursor beat, not a bolt-on.

## WEAKNESSES / GAPS (concrete)

- **Novelty is capped by the brief.** The direction is explicitly named as an example; the differentiation is execution and framing, not a fundamentally new idea.
- **Interactive surface is missing.** All findings are static values/tokens; hover/focus/disabled states, focus rings, and motion are not addressed, leaving half of "visual and interactive" untouched.
- **"Taste" is demonstrated on a self-authored ground truth.** Because the seeded repo and its git history are yours, a skeptical judge can read the verdicts as canned. §10 mitigations exist but are framed as defenses, not as a scripted proof beat.
- **Confidence band is LLM-asserted, not grounded.** Everything else is grounded in math; High/Med/Low is not tied to any stated signal, which undercuts the "no fake precision" pitch.
- **Tailwind className→token grounding is the fiddliest real component** and is easy to underestimate (arbitrary values, palette-vs-token classes, dynamic className construction).
- **Day 2 PM is overloaded** (polished dashboard + MCP + bug-planting + fallback-pinning + rehearsal), risking the 60-second cut's polish.

## PRIORITIZED FIXES (do these to raise the score)

1. **Cover the interactive surface (raises Usefulness toward 5, adds Novelty).** Add at least one interaction-state verdict to the taxonomy demo — e.g., a hover/focus/disabled color that drifted below WCAG in that state, or a missing/overridden focus-ring token. This closes the "visual *and interactive*" gap the brief names and differentiates you from a pure static linter.
2. **Show a verdict that FLIPS on evidence (raises Novelty).** Script one case where the deterministic layer flags a suspicious delta but the classifier correctly *reclassifies* it as Intentional Redesign using git-blame + an accompanying token change — a case where a naive linter would false-positive. A visible verdict flip proves "taste" is reasoning, not a lookup, and is far more memorable than three static verdicts.
3. **Make the ground-truth external in the demo (defends against "it's canned").** Elevate the §10 mitigation into a scripted beat: show the actual git terminal for the "redesign" commit range live, so the evidence behind a verdict lives outside your own app. Pair with the existing "click any finding" invitation.
4. **De-risk the Tailwind AST grounding (protects the Day 1 spine).** Specify exactly how you resolve `className` → value → token candidate → byte span, and constrain the seeded repo to className patterns your scanner provably handles (declare arbitrary-value and dynamic-className handling in or out of scope explicitly).
5. **Ground the confidence band.** State what drives High/Med/Low (e.g., ΔE magnitude + presence/absence of corroborating signals like an accompanying token change or blame recency), so confidence is grounded like the rest of the system rather than another vibe.
6. **Verify the exact Claude SDK surface before it goes in copy.** Confirm the extended-thinking config (`thinking` shape) and the structured-outputs / tool `strict` schema fields against the current `@anthropic-ai/sdk`; "schema-valid every time" depends on getting these right.
7. **Trim Day 2 PM.** Reduce the dashboard to one polished screen (drift feed + one expanded diff card), keep MCP as the closing beat only, and push everything else to the stretch list to protect the 60-second cut.
