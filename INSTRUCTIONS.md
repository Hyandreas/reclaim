## **Problem Statement & Example Projects** 

Your project must build in at least **one** of the four required tracks.\
\
**Statement One: \[Cursor\]**

Static design tokens and component libraries are brittle contracts: the moment a brand evolves, a new team ships a component, or an interaction grows past its fortieth branching state, the system quietly fractures. Build an AI-native design system that reasons about consistency across a product's visual and interactive surface — detecting drift, proposing reconciliation, and keeping designers and engineers aligned without a synchronization meeting. The question isn't whether the model can read your tokens or trace a state graph; it's whether the system has enough taste to know when something is wrong.

**Example projects**

- A CLI that diffs your Figma token file against your deployed CSS and surfaces semantic mismatches with proposed fixes.

- A visual regression tool that classifies diffs as intentional redesigns, accidental regressions, or platform-imposed constraints — explaining its reasoning and drafting a fix for anything flagged as a regression.

- A chat interface where a designer describes an intent and the system shows which existing tokens and components satisfy it versus which ones conflict.

**Statement Two: \[Vultr\]**

Build a web-based Enterprise Agent for a real-world workflow that grounds its decisions in documents. The keyword is agent. A single retrieve-then-answer call is not enough. Show a multi-step workflow where the system plans, retrieves more than once when it needs to, calls tools, makes decisions, and produces an outcome a real enterprise team could actually use. Transform agentic operations and future of work in industries like Telecommunications, Healthcare, Finance, Hospitality.\
\
**Example Projects**

- Telecommunications: A network operations agent that ingests tower maintenance logs, outage reports, and vendor SLAs, then plans repair dispatch sequences, retrieves historical incident data to predict root causes, calls scheduling tools to book field crews, and generates a prioritized action report with cited documentation.

- Healthcare: A healthcare clinical-trial matching agent that reads a patient's chart, checks each eligibility criterion against the record, and — where a required record or test result is missing or outdated — retrieves the most recent version if one exists or flags it as an outstanding item to request, calls a drug-interaction tool to check exclusions, and ranks eligible trials with per-criterion citations.

- Finance: A finance covenant-monitoring agent that flags loan ratios drifting toward breach, retrieves the credit agreement and prior filings to check trend, calls a calculation tool to re-verify the ratio, cross-checks recent transactions for a cause, and outputs an escalation memo with a citation trail and a confidence score reflecting how many of the flagged transactions were matched to a clear cause versus left unexplained.

- Hospitality:** A revenue management agent that reads booking patterns, competitor pricing sheets, and event calendars, plans dynamic rate adjustments, retrieves historical occupancy data, calls pricing tools to update rates across channels, flags anomalies like sudden demand spikes, and delivers a revenue strategy brief with cited market intelligence.

**Statement Three: \[Crusoe\]**

Agents deployed in physical or operational environments — warehouses, field sites, live events — must understand not just what is happening but where, when, and relative to what else is changing around it. Build an agent on Crusoe Managed Inference that constructs a live situational model from streaming inputs and uses that model to drive proactive, context-sensitive actions a non-technical operator can trust, question, and override in the moment. 

**Example Projects**

- A festival operations agent that ingests live wristband scan rates, stage capacity sensors, and scheduled set times to model crowd flow in real time — flagging crush risk corridors to a site manager as a single plain-language advisory with a one-tap override that feeds back into the next recommendation.

- A warehouse agent that tracks forklift positions and inventory status, flags predicted aisle conflicts, and pages a floor supervisor with a one-tap override before rerouting.

- A GPU cluster agent that fuses power draw, cooling telemetry, and scheduler queues to predict rack-level thermal throttling before it hits specific racks — surfacing a one-tap migration recommendation to a shift engineer that learns from each override.

**Statement Four: \[Google Deepmind / Google for startups\]**

Most agents work from a snapshot — a screenshot, a transcript, a paused moment — and forget it the second the task ends. Build one that can't get away with that: seeing and clicking through Gemini's Computer Use, holding state across a long task through the Interactions API's Antigravity agent, or talking across languages mid-conversation through Live Translate. The primitive you pick should be load-bearing — the thing the task can't work without — not a feature added on top of a normal chatbot. Stronger still if the second primitive only fires because the first is already running.

**Example Projects**

- A construction-site agent that fuses live Swahili status calls via Live Translate with an Antigravity-held punch-list to model which tasks are blocked in real time — surfacing a single plain-language update to the site office as each call comes in, with a one-tap "mark resolved" that drives Gemini Computer Use to update the dashboard directly and queues the agent's next clarifying question to be spoken back to the engineer over the same Live Translate channel.

- A security-audit agent whose scan priorities are set through a config the audit lead maintains, fusing that with Gemini Computer Use's crawl of a staged vulnerable test environment to flag likely vulnerable endpoints as it finds them — surfacing each one to the audit lead as a single plain-language finding with a one-tap "confirm/dismiss" that updates the Antigravity vulnerability log and retunes what the next overnight run prioritizes, resuming via environment ID each morning.


Judging will be taking place on **Sunday, July 5th**. These judges are evaluating your **technical demos** in the following categories. *Show us what you have built* to solve our problem statements. Please **do not** show us a presentation. We'll be checking to ensure your project was built **entirely during the event**; no previous work is allowed. 

**|** **Teams should submit here when they have completed hacking. In the submission form, you will have to submit a short one minute demo video.** This should be a video of what you have built, uploaded to Youtube, Loom, or somewhere else.

**Judging Criteria**

1. **Impact (25%) —** What is the project’s long-term potential for success, growth and impact? Does it fit into one of the problem statements listed above? Is the project useful, and for who?

2. **Demo (50%) —** How well has the team implemented the idea? Does it work?

3. **Creativity (15%) —** Is the project’s concept innovative? Is their demo unique?

4. **Pitch (10%) *—*** How effectively does the team present their project?