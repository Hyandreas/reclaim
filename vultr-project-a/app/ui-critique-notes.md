# Designer 3 UI Critique - Reclaim

Scope: demo app UI only. Runtime files were inspected but not edited.

Evidence reviewed:

- `README.md`, `DESIGN_BRIEF.md`, `FINAL_PROPOSAL.md`, `EXECUTION_PLAN.md`, `JUDGE_RISK_REGISTER.md`
- `app/README.md`, `app/visual-design-notes.md`, `app/demo-polish-notes.md`
- `app/index.html`, `app/styles.css`, `app/app.js`, `app/data.js`
- Rendered screenshots: idle desktop, replay desktop, citation-drawer replay, mobile-width idle

Automated detector note: I did not use `npx impeccable detect`; the sandbox blocked npm registry access, and the escalated run was rejected because it would fetch and execute third-party code against the workspace.

## Blunt Verdict

The app has the right story architecture: three panes, a circuit queue, a reasoning rail, deterministic tool cards, citations, safety cases, and human approval. That foundation is worth keeping.

The visual execution is not yet sharp enough for the judged demo. It reads more like an editorial prototype or styled grant-dashboard than a revenue-assurance workbench. The first impression is the large Reclaim brand, serif display type, beige texture, and card chrome. The proof that matters most, "the plan changes the backend path and every dollar has receipts," is present but not visually dominant enough.

Design health score: 24/40. Good concept, shaky demo legibility.

## What Is Working

- The three-pane structure matches the product promise. Queue, rail, and memo are all visible in one desktop viewport.
- The rail includes the right evidence types: plan, retrieval, deterministic tools, skipped stages, decision, memo assembly.
- The demo data feels telecom-specific enough: circuit IDs, BANs, tickets, MRC, claim windows, invoice history, confidence inputs.
- The app avoids the worst AI-demo traps: no chat box, no purple glow, no dark cyber dashboard, no generic hero page.
- The citation drawer has actual pre-rendered clause art, which is the right fallback for a 60-second video.

## Highest-Priority Fixes

### P0 - Make the Planning Proof Dominate the First View

Problem: At 1440x900, the top bar, proof strip, spotlight grid, and pane headers consume so much vertical space that only the first two rail cards are fully visible. At 1280x720, the drawer and smoke banner can obscure most of the proof surface. The judge should immediately see the branch difference, but the screen first reads as "nice dashboard with many cards."

Fix:

- Compress the top strip to 52-60px. Shrink the `R` mark, reduce the `Reclaim` wordmark, and put Vultr services, timer, counter, and actions on one disciplined row.
- Collapse the three proof cards into a single compact route comparison band: `SEA clean -> skips exclusion`, `ATL deep -> retrieves exclusion`, `DEN credited -> blocks duplicate`.
- Shrink the spotlight grid from six equal mini-cards into a 32-40px selected-case fact row. Do not let `CKT-ATL-014`, `INC-10422`, or `BAN 88321` truncate.
- Ensure the first three rail events are visible without scrolling on a 720p recording frame: `Plan completed`, `Exclusion skipped` for clean, and `Exclusion retrieved` for deep.
- Make the center rail the visual center of gravity. The left queue and right memo should support it, not compete with it.

### P0 - Fix Color Semantics

Problem: Green currently means selected row, clean route, control proof, safe status, and approved recovery. Amber means risk, deep review, citation, strategy, and deadline. Red appears for `needs review`, even though the design brief says amber. This muddies the story.

Fix:

- Reserve green only for approved recovery, final locked counter, and approval history.
- Use primary blue or cool steel for selected/current/live states.
- Use neutral gray for `clean`, `already credited`, `excluded`, and skipped states.
- Use amber only for ambiguous maintenance, deadline, needs review, and other human-attention risks.
- Use citation blue for citation chips and source drawer links. Citation is evidence, not warning.
- Remove the warm grid-paper background. It adds texture but lowers enterprise clarity.

### P0 - Replace Editorial Typography With Product Typography

Problem: The serif logo, serif pane titles, serif counters, and large clamp-sized type make the app feel art-directed instead of operational. Product UI should feel trusted and scannable, not literary.

Fix:

- Use one UI family for the product surface: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`.
- Keep the serif only inside the brand mark if you want a tiny bit of identity.
- Replace `h1 { font-size: clamp(28px, 4vw, 44px); }` with fixed product scale. Suggested: wordmark 24-28px, pane title 18-20px, section labels 11-12px, body 13-14px.
- Use `font-variant-numeric: tabular-nums` for money, timers, uptime, confidence, minutes, and MRC.
- Increase camera-critical labels by 1-2px: route chips, status chips, event names, tool outputs, memo amount.

### P1 - Turn the Queue From Cards Into an Operational List

Problem: The queue says it represents roughly 43 cases, but the visible design shows only a few chunky cards. It does not feel like a portfolio audit table. The three summary cards eat vertical space that should belong to case rows.

Fix:

- Replace card rows with dense 48-52px table-like rows.
- Use stable columns: circuit, BAN, store, month, MRC, route, status, amount.
- Keep live rows distinguished with a small `live` chip and a strong but neutral selected border.
- Move `3 live / 40 preprocessed / 1 urgent` into a compact header line or micro status strip.
- Do not let row labels wrap unpredictably. Circuit ID, status, amount, and route must remain readable during camera zoom.

### P1 - Make the Rail Less Verbose and More Receipt-Like

Problem: The rail cards are structurally correct but too prose-heavy. The important facts are buried in sentences: selected stages, skip reason, uptime result, clause basis, and dollar source.

Fix:

- Give each rail card a hard visual pattern: stage number, event name, source/tool badge, one-line finding, one proof metric, citation chip.
- Split long plan prose into short rows:
  - `Selected: logs, uptime, SLA tier, exclusion`
  - `Skipped: invoice cross-check`
  - `Stop: memo has amount, citations, confidence, approval`
- Make calculator outputs impossible to miss: `87 min`, `99.80% vs 99.9%`, `$124.00`, `10% MRC`.
- Keep skipped cards visible, but make them compact and gray. They should read as deliberate routing, not inactive clutter.

### P1 - Keep the Memo and Citation Connected

Problem: The citation drawer is strong in isolation, but it covers the memo and much of the rail at 1280x720. The user loses the line that the evidence supports exactly when the receipt opens.

Fix:

- Dock the source receipt inside the right pane or cap it around 420px so the rail remains visible.
- Put the supported memo line directly under the highlighted clause, above metadata.
- Add linked backend identifiers in the drawer: citation id, event id, tool call id, case id.
- Make citation chips blue and label them as sources: `MSA 4.2`, `Notice 7.3`, `Claim 9.1`.
- The close button should look like a standard close icon/button, not a tiny textual `x`.

### P1 - Make Approval Control Visibly Final

Problem: The counter can reach `$182,400` before the approval moment is visually complete. The label says `Recoverable exposure`, but the story wants the number to freeze green only after human approval. In the replay screenshot, the approval controls are partly below the fold.

Fix:

- Distinguish `Calculated exposure` from `Approved recovery`.
- During run: counter can count in graphite or blue as calculated exposure.
- After approval: counter turns green, lock appears, label changes to `Approved recovery`.
- Keep approval textarea and primary action visible in the right pane at desktop demo size.
- Disable or de-emphasize `Approve memo` until the selected memo is approval-ready and the typed reason is present.

### P2 - Reduce Beige-On-Beige and Card Monotony

Problem: The surface is dominated by cream, tan, amber, and beige. The grid texture, large shadows, and repeated cards create a vintage paper feel. That fights the desired revenue-assurance workbench mood.

Fix:

- Use warm off-white for the page only.
- Use cool gray for panel chrome, sidebars, and inactive rows.
- Use white or near-white for memo/document surfaces.
- Reduce shadows. Use 1px borders, subtle selected backgrounds, and density.
- Avoid repeated equal cards for summary, proof, spotlight, memo queue, and empty states. If everything is a card, nothing feels important.

### P2 - Fix Mobile Responsiveness

Problem: Mobile collapses into a long stacked page. The top bar consumes almost the entire first screen before the user sees the queue. This does not match the design brief's task-tab model.

Fix:

- Add task tabs under the compact top strip: `Queue`, `Trace`, `Memo`.
- Keep run button and current counter sticky/reachable.
- Do not show the full brand lockup and all Vultr pills above the task on mobile.
- Convert queue rows into compact summaries. Do not squeeze the desktop card pattern into a phone viewport.
- Citation drawer should become a full-screen source sheet with close first in tab order.

## Specific UI Nits

- `deep review`, `clean`, and `already credited` tabs should include circuit IDs or store names. Route alone is not enough orientation.
- The spotlight grid truncates critical demo facts (`CKT-AT...`, `INC-1...`). These are proof objects, not decoration.
- `Recovered exposure` is a weak label. Use `Calculated exposure` before approval and `Approved recovery` after approval.
- The memo confidence line is too long. Use three stacked rows: retrieval match, ambiguity resolution, billing certainty.
- Ranked memo rows look clickable, but non-live rows do not open. Either make them real or remove button styling for non-live rows.
- The smoke banner should never appear in a recorded demo. It covers bottom-left proof.
- Empty states are visually too large for this product. Idle should show the imported portfolio and next action, not a poster-sized placeholder.
- Hover lift on many controls feels decorative. Product motion should confirm state, not make buttons bob.

## Cognitive Load

Current load: high-moderate, roughly 4 failures on the 8-point checklist.

Failures:

- Single focus: queue, proof strip, spotlight, rail, memo, counter, and actions all compete.
- Visual hierarchy: the brand and chrome are louder than the agentic proof.
- Minimal choices: header, tabs, proof cards, queue rows, memo queue, approval, and replay all appear at once.
- Progressive disclosure: the UI exposes summary cards, proof cards, spotlight cards, rail cards, and memo fields simultaneously.

Fix the first 30 seconds by sequencing attention:

1. Imported portfolio and `Run audit`.
2. Route comparison: clean skip vs deep retrieval.
3. Deterministic calculator and citation.
4. Memo and approval.

## Heuristic Snapshot

| Heuristic | Score | Main issue |
| --- | ---: | --- |
| Visibility of system status | 3 | Good live states, but too many simultaneous statuses |
| Match to real world | 3 | Strong telecom language, but UI styling feels less enterprise than intended |
| User control and freedom | 2 | Replay, close, and approval exist; undo/cancel/state recovery are thin |
| Consistency and standards | 2 | Color meanings and typography vocabulary drift |
| Error prevention | 3 | Approval reason validation and blockers are good |
| Recognition over recall | 2 | Route-only tabs and truncated identifiers force memory |
| Flexibility and efficiency | 1 | Demo path is fixed; limited keyboard/power-user affordance |
| Aesthetic and minimalist design | 2 | Too much chrome, texture, and repeated card structure |
| Error recovery | 3 | Inline approval errors are clear |
| Help and documentation | 3 | Demo copy explains many states, but not always in the right place |

Total: 24/40.

## Highest-Leverage Implementation Order

1. Compress top strip, proof strip, and spotlight so the rail cards are visible immediately.
2. Re-map colors so green means approved, amber means risk, blue means citation/current action.
3. Replace serif/product typography with one product UI sans scale.
4. Convert queue cards into dense rows and prevent proof identifier truncation.
5. Redesign citation drawer so it keeps the supported memo line and rail context visible.
6. Make calculated exposure vs approved recovery visually distinct.
7. Add mobile task tabs and shrink the mobile top bar.

If only two things can change before judging, do items 1 and 2. They will make the demo legible faster than any new feature.
