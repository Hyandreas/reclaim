# Graph Report - .  (2026-07-05)

## Corpus Check
- 102 files · ~255,323 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 549 nodes · 1015 edges · 30 communities (25 shown, 5 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 78 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Vanilla App Frontend Logic|Vanilla App Frontend Logic]]
- [[_COMMUNITY_Track 2 Vultr Proposals|Track 2 Vultr Proposals]]
- [[_COMMUNITY_Reclaim Core Demo Engine|Reclaim Core Demo Engine]]
- [[_COMMUNITY_Package Backend API Layer|Package Backend API Layer]]
- [[_COMMUNITY_Hackathon Brief & Demo Docs|Hackathon Brief & Demo Docs]]
- [[_COMMUNITY_Track 1 Cursor Proposals|Track 1 Cursor Proposals]]
- [[_COMMUNITY_React Frontend Dependencies|React Frontend Dependencies]]
- [[_COMMUNITY_Package Backend Orchestrator|Package Backend Orchestrator]]
- [[_COMMUNITY_Package Backend Storage|Package Backend Storage]]
- [[_COMMUNITY_React Data Layer|React Data Layer]]
- [[_COMMUNITY_shadcn UI Primitives|shadcn UI Primitives]]
- [[_COMMUNITY_TypeScript App Config|TypeScript App Config]]
- [[_COMMUNITY_React App Shell|React App Shell]]
- [[_COMMUNITY_shadcn Components Config|shadcn Components Config]]
- [[_COMMUNITY_Track 4 DeepMind Proposals|Track 4 DeepMind Proposals]]
- [[_COMMUNITY_Deployment Docs & Clause Assets|Deployment Docs & Clause Assets]]
- [[_COMMUNITY_SaaS Design Research|SaaS Design Research]]
- [[_COMMUNITY_TypeScript Node Config|TypeScript Node Config]]
- [[_COMMUNITY_Card Component|Card Component]]
- [[_COMMUNITY_Table Component|Table Component]]
- [[_COMMUNITY_TypeScript Root Config|TypeScript Root Config]]
- [[_COMMUNITY_React Queue Helpers|React Queue Helpers]]
- [[_COMMUNITY_Crusoe & DeepMind Track Statements|Crusoe & DeepMind Track Statements]]
- [[_COMMUNITY_Graphify Rules|Graphify Rules]]
- [[_COMMUNITY_Cursor Track Statement|Cursor Track Statement]]
- [[_COMMUNITY_Vultr Cloud Compute Concept|Vultr Cloud Compute Concept]]
- [[_COMMUNITY_Vultr Managed PostgreSQL Concept|Vultr Managed PostgreSQL Concept]]

## God Nodes (most connected - your core abstractions)
1. `runBackendAudit()` - 19 edges
2. `session()` - 18 edges
3. `compilerOptions` - 18 edges
4. `cn()` - 16 edges
5. `ReclaimAPI` - 15 edges
6. `App()` - 15 edges
7. `runLocalAudit()` - 14 edges
8. `ReclaimHandler` - 14 edges
9. `renderAll()` - 13 edges
10. `rail_events_for_case()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Judge Risk Register (8 Objections with Counterproofs)` --conceptually_related_to--> `Hackathon Judging Criteria (Impact 25%, Demo 50%, Creativity 15%, Pitch 10%)`  [INFERRED]
  vultr-project-a/JUDGE_RISK_REGISTER.md → INSTRUCTIONS.md
- `Claim Window Clause Highlight (MSA Section 9.1, 30-day claim window, citation id claim-window)` --conceptually_related_to--> `Reclaim API Endpoints (health, cases, corpus, run-portfolio, run, events SSE, memo, approve, approvals)`  [INFERRED]
  vultr-project-a/app/assets/clause-claim-window.svg → vultr-project-a/backend/README.md
- `Invoice Credit Line Highlight (BAN 77104, prior SLA credit -$1,840 for CKT-DEN-031, citation id invoice-credit)` --conceptually_related_to--> `Reclaim API Endpoints (health, cases, corpus, run-portfolio, run, events SSE, memo, approve, approvals)`  [INFERRED]
  vultr-project-a/app/assets/clause-invoice-credit.svg → vultr-project-a/backend/README.md
- `App()` --calls--> `setBackendMode()`  [INFERRED]
  vultr-project-a/src/App.tsx → vultr-project-a/app/app.js
- `App()` --calls--> `runAudit()`  [INFERRED]
  vultr-project-a/src/App.tsx → vultr-project-a/app/app.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-Pane Revenue-Assurance Workbench** — vultr_project_a_app_index_queue_panel, vultr_project_a_app_index_rail_panel, vultr_project_a_app_index_memo_panel, vultr_project_a_app_index_citation_drawer, vultr_project_a_app_index_approval_form [EXTRACTED 1.00]
- **Load-Bearing Vultr Service Stack** — vultr_project_a_final_proposal_vultr_cloud_compute, vultr_project_a_final_proposal_vultr_object_storage, vultr_project_a_final_proposal_vultr_managed_postgresql, vultr_project_a_final_proposal_vultr_vector_store [EXTRACTED 1.00]
- **Design Iteration Pipeline (Brief to Critique)** — vultr_project_a_design_brief_three_pane_layout, vultr_project_a_app_visual_design_notes_visual_system, vultr_project_a_app_demo_polish_notes_demo_polish, vultr_project_a_app_ui_critique_notes_ui_critique [INFERRED 0.85]
- **Deterministic Core / Bounded-LLM Design Pattern** — projects_track_1_cursor_a_proposal_deterministic_detector_llm_split, projects_track_1_cursor_b_proposal_deterministic_core_bounded_llm, projects_track_2_vultr_a_proposal_deterministic_calculators, projects_track_3_crusoe_a_proposal_llm_never_touches_numbers, projects_track_4_deepmind_b_proposal_deterministic_completeness_rule [INFERRED 0.85]
- **Gemini Three-Primitive Causal Chain (Track 4 shape)** — projects_track_4_deepmind_a_proposal_primitive_causal_chain, projects_track_4_deepmind_b_proposal_claimthread, projects_track_4_deepmind_c_proposal_handoff [INFERRED 0.90]
- **Track 1a Round 1 Judging Process (two judges + head-judge conferral)** — projects_track_1_cursor_a_proposal_taste, projects_track_1_cursor_a_judge_1_round1_review, projects_track_1_cursor_a_judge_2_round1_review, projects_track_1_cursor_a_conferred_round1_review [EXTRACTED 1.00]
- **Reclaim Contract Citation Evidence Assets** — vultr_project_a_app_assets_clause_claim_window_claim_window_clause_highlight, vultr_project_a_app_assets_clause_invoice_credit_invoice_credit_line_highlight, vultr_project_a_app_assets_clause_maintenance_notice_maintenance_notice_clause_highlight, vultr_project_a_app_assets_clause_sla_tier_sla_tier_clause_highlight [INFERRED 0.90]
- **Reclaim Local Deployment Stack (stdlib server, SQLite, Docker Compose)** — vultr_project_a_backend_readme_primary_full_stack_server, vultr_project_a_backend_readme_reclaim_sqlite_store, vultr_project_a_docker_compose_reclaim_service, vultr_project_a_docker_compose_reclaim_data_volume [INFERRED 0.85]
- **Reclaim Frontend Design Research Flow** — vultr_project_a_research_saas_screenshots_readme_saas_visual_reference_board, vultr_project_a_research_saas_screenshots_index_saas_reference_board_page, vultr_project_a_research_saas_screenshots_readme_reclaim_redesign_implications [EXTRACTED 1.00]

## Communities (30 total, 5 thin omitted)

### Community 0 - "Vanilla App Frontend Logic"
Cohesion: 0.09
Nodes (65): animateCounter(), apiUrl(), BackendHttpError, buildLocalMemo(), checkHealthCandidate(), citationChip(), closeBackendStream(), compactValue() (+57 more)

### Community 1 - "Track 2 Vultr Proposals"
Cohesion: 0.06
Nodes (42): Judge 1 Round 1 Review: Reclaim (13.5/15), clause_precedence_resolver (amendment supersedes base term), Published Confidence Formula (0.4 retrieval + 0.4 ambiguity + 0.2 billing), Deterministic Python Calculators (LLM never does arithmetic), Judgment-Triggered Exclusion-Clause Second Retrieval, Glass-Box Reasoning Rail, Plan-Gated Conditional Pipeline, Reclaim (SLA Credit-Recovery Agent) (+34 more)

### Community 2 - "Reclaim Core Demo Engine"
Cohesion: 0.13
Nodes (20): ThreadingHTTPServer, case_by_id(), counted_intervals(), credit_for_case(), format_currency(), format_percent(), init_db(), memo_for_case() (+12 more)

### Community 3 - "Package Backend API Layer"
Cohesion: 0.10
Nodes (13): BaseHTTPRequestHandler, ApiResponse, Any, HTTP route layer for the stdlib Reclaim backend., ReclaimAPI, sse_comment(), sse_event(), Handler (+5 more)

### Community 4 - "Hackathon Brief & Demo Docs"
Cohesion: 0.07
Nodes (36): Hackathon Judging Criteria (Impact 25%, Demo 50%, Creativity 15%, Pitch 10%), Statement Two: Vultr Track (Web-Based Enterprise Agent), raisehack-ideation Repository, Designer 2 Demo Polish Blueprint (Camera Path, Microcopy), Approval Form with Typed Audit Reason (#approvalForm), Citation Drawer (#citationDrawer, Source Receipt), Credit Memo Panel (#memo), Portfolio Queue Panel (#portfolio) (+28 more)

### Community 5 - "Track 1 Cursor Proposals"
Cohesion: 0.10
Nodes (33): 13px/12px Punchline Numeric Inconsistency, Conferred Review Round 1: Taste (13.5/15), Judge 1 Round 1 Review: Taste (14.0/15), Judge 2 Round 1 Review: Taste (14.0/15), Authorship-Time Inversion, Claude Opus 4.8 (claude-opus-4-8) reasoning engine, Deterministic Detector / LLM Judgment Split, Drift Ledger (pre-seeded, dated verdict log) (+25 more)

### Community 6 - "React Frontend Dependencies"
Cohesion: 0.06
Nodes (30): dependencies, class-variance-authority, clsx, @fontsource-variable/inter, @fontsource-variable/jetbrains-mono, lucide-react, @radix-ui/react-dialog, @radix-ui/react-separator (+22 more)

### Community 7 - "Package Backend Orchestrator"
Cohesion: 0.16
Nodes (26): Exception, Local backend for the Reclaim SLA credit recovery demo., approval_blocker(), ApprovalError, billing_crosscheck(), build_trace(), confidence_calculator(), credit_calculator() (+18 more)

### Community 8 - "Package Backend Storage"
Cohesion: 0.23
Nodes (26): Connection, PathLike, Row, approvals(), _circuit_summary(), complete_run(), connect(), corpus() (+18 more)

### Community 9 - "React Data Layer"
Cohesion: 0.13
Nodes (23): App(), citationSupportLine(), PacketFormula(), allRows(), ApprovalRecord, calculatedExposure(), CaseCredit, ClaimMemo (+15 more)

### Community 10 - "shadcn UI Primitives"
Cohesion: 0.12
Nodes (17): ActivityRailButton(), MobilePaneButton(), Badge(), BadgeProps, badgeVariants, Button, ButtonProps, buttonVariants (+9 more)

### Community 11 - "TypeScript App Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx (+12 more)

### Community 12 - "React App Shell"
Cohesion: 0.14
Nodes (13): apiUrl(), BackendMode, citationShortLabel(), eventVariant(), MobilePane, PacketField(), PacketPreview(), requestJson() (+5 more)

### Community 13 - "shadcn Components Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 14 - "Track 4 DeepMind Proposals"
Cohesion: 0.14
Nodes (17): Antigravity / Interactions API Persistent Casefile, CHF Red-Flag Protocol (weight gain, orthopnea thresholds), Cold-Restart Persistence Proof (the kill on camera), Gemini Computer Use SBAR Write-Back, Continuum (Multilingual Post-Discharge Care Agent), Gemini Live Translate (bidirectional speech), Three-Primitive Causal Chain (Live Translate → Antigravity → Computer Use), ClaimThread (FNOL Claims Agent with Persistent Claim File) (+9 more)

### Community 15 - "Deployment Docs & Clause Assets"
Cohesion: 0.18
Nodes (14): Claim Window Clause Highlight (MSA Section 9.1, 30-day claim window, citation id claim-window), Invoice Credit Line Highlight (BAN 77104, prior SLA credit -$1,840 for CKT-DEN-031, citation id invoice-credit), Maintenance Notice Clause Highlight (MSA Section 7.3, five business day notice rule, citation id maintenance-notice), SLA Tier Clause Highlight (MSA Exhibit B, 99.9% availability tier, 10% MRC credit, citation id sla-tier), Reclaim API Endpoints (health, cases, corpus, run-portfolio, run, events SSE, memo, approve, approvals), Northstar Telecom MSA (contract corpus), Package Backend (reclaim_backend.server, port 8000), Primary Full-Stack Server (backend/server.py, port 8765) (+6 more)

### Community 16 - "SaaS Design Research"
Cohesion: 0.23
Nodes (14): Reclaim Favicon (circular R mark), Reclaim Frontend Entry (index.html, /src/main.tsx), SaaS Reference Board HTML Page, Attio Homepage Screenshot, Clerk Homepage Screenshot, Linear Homepage Screenshot, Mercury Homepage Screenshot, Ramp Homepage Screenshot (unusable capture) (+6 more)

### Community 17 - "TypeScript Node Config"
Cohesion: 0.17
Nodes (11): compilerOptions, allowSyntheticDefaultImports, baseUrl, composite, module, moduleResolution, paths, skipLibCheck (+3 more)

### Community 18 - "Card Component"
Cohesion: 0.29
Nodes (6): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle

### Community 19 - "Table Component"
Cohesion: 0.29
Nodes (6): Table, TableBody, TableCell, TableHead, TableHeader, TableRow

### Community 20 - "TypeScript Root Config"
Cohesion: 0.29
Nodes (6): compilerOptions, baseUrl, paths, files, @/*, references

### Community 21 - "React Queue Helpers"
Cohesion: 0.50
Nodes (5): CaseInboxRow(), classificationVariant(), compactPlannerHint(), routeTabLabel(), slug()

## Knowledge Gaps
- **133 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `React Data Layer` to `Vanilla App Frontend Logic`, `shadcn UI Primitives`, `React App Shell`, `React Queue Helpers`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `setBackendMode()` connect `Vanilla App Frontend Logic` to `React Data Layer`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `Local backend for the Reclaim SLA credit recovery demo.`, `HTTP route layer for the stdlib Reclaim backend.`, `Deterministic Reclaim agent orchestration.  The "agent" here is intentionally` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Vanilla App Frontend Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `Track 2 Vultr Proposals` be split into smaller, more focused modules?**
  _Cohesion score 0.06387921022067364 - nodes in this community are weakly interconnected._
- **Should `Reclaim Core Demo Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.13240418118466898 - nodes in this community are weakly interconnected._
- **Should `Package Backend API Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.10365853658536585 - nodes in this community are weakly interconnected._