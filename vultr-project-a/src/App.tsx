import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Activity,
  BadgeCheck,
  ClipboardCheck,
  Clock3,
  Database,
  FileCheck2,
  Files,
  Gauge,
  GitBranch,
  LockKeyhole,
  PanelLeft,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react"

import { API_BASE, approveCase, getCaseEvents, getCaseMemo, getHealth, runCase } from "@/api/reclaimClient"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  allRows,
  calculatedExposure,
  creditForCase,
  describeBackendLabel,
  formatCurrency,
  localMemo,
  localTrace,
  normalizeBackendEvent,
  parseHealthSnapshot,
  reclaimData,
  slug,
  type ApprovalRecord,
  type ClaimMemo,
  type DocumentReceipt,
  type HealthSnapshot,
  type PortfolioRow,
  type TraceEvent,
} from "@/lib/reclaim"

type BackendMode = "checking" | "live" | "fallback"
type MobilePane = "queue" | "evidence" | "packet"
type AppRoute = { section: "workbench" | "cases" | "case" | "approvals" | "sources" | "system"; caseId?: string }

function parseRoute(pathname = window.location.pathname): AppRoute {
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length === 0) return { section: "workbench" }
  if (parts[0] === "workbench") return { section: "workbench" }
  if (parts[0] === "cases" && parts[1]) return { section: "case", caseId: decodeURIComponent(parts[1]) }
  if (parts[0] === "cases") return { section: "cases" }
  if (parts[0] === "approvals") return { section: "approvals" }
  if (parts[0] === "sources") return { section: "sources" }
  if (parts[0] === "system") return { section: "system" }
  return { section: "workbench" }
}

function pathForRoute(route: AppRoute) {
  if (route.section === "case" && route.caseId) return `/cases/${encodeURIComponent(route.caseId)}`
  if (route.section === "cases") return "/cases"
  if (route.section === "approvals") return "/approvals"
  if (route.section === "sources") return "/sources"
  if (route.section === "system") return "/system"
  return "/workbench"
}

function App() {
  const rows = useMemo(() => allRows(), [])
  const exposure = useMemo(() => calculatedExposure(), [])
  const [route, setRoute] = useState<AppRoute>(() => parseRoute())
  const [targetRecovery, setTargetRecovery] = useState(exposure)
  const headlineRecovery = targetRecovery
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot>({})
  const [selectedCaseId, setSelectedCaseId] = useState(reclaimData.liveCases[0].id)
  const selectedCase = reclaimData.liveCases.find((item) => item.id === selectedCaseId) || reclaimData.liveCases[0]
  const selectedCredit = creditForCase(selectedCase)
  const sourceReceiptCount = Object.values(localMemo(selectedCase).citations).filter(Boolean).length
  const [events, setEvents] = useState<TraceEvent[]>(() => localTrace(selectedCase))
  const [memo, setMemo] = useState<ClaimMemo>(() => localMemo(selectedCase))
  const [approval, setApproval] = useState<ApprovalRecord | null>(null)
  const [reason, setReason] = useState("")
  const [running, setRunning] = useState(false)
  const [backendMode, setBackendMode] = useState<BackendMode>("checking")
  const [backendLabel, setBackendLabel] = useState("Checking backend")
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null)
  const [formError, setFormError] = useState("")
  const [mobilePane, setMobilePane] = useState<MobilePane>("evidence")
  const [explorerOpen, setExplorerOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [filter, setFilter] = useState("")
  const activeAuditCaseRef = useRef(selectedCaseId)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const filteredRows = useMemo(() => {
    const query = filter.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => [row.id, row.ban, row.store, row.route].some((value) => value.toLowerCase().includes(query)))
  }, [filter, rows])
  const currentRoute = route.section === "case" ? "workbench" : route.section

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", "/workbench")
    }

    function onPopState() {
      setRoute(parseRoute())
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    if (!route.caseId) return
    if (reclaimData.liveCases.some((item) => item.id === route.caseId)) {
      setSelectedCaseId(route.caseId)
    }
  }, [route.caseId])

  function navigate(nextRoute: AppRoute) {
    const path = pathForRoute(nextRoute)
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path)
    }
    setRoute(nextRoute)
  }

  function openCase(caseId: string, mode: "workbench" | "case" = "workbench") {
    setSelectedCaseId(caseId)
    if (mode === "case") {
      navigate({ section: "case", caseId })
    }
  }

  useEffect(() => {
    let active = true
    getHealth()
      .then((health) => {
        if (!active) return
        const snapshot = parseHealthSnapshot(health)
        setBackendMode("live")
        setBackendLabel(describeBackendLabel(snapshot))
        setHealthSnapshot(snapshot)
        setTargetRecovery(snapshot.targetRecovery ?? exposure)
      })
      .catch(() => {
        if (!active) return
        setBackendMode("fallback")
        setBackendLabel("Local deterministic fallback")
        setHealthSnapshot({})
        setTargetRecovery(exposure)
      })
    return () => {
      active = false
    }
  }, [exposure])

  useEffect(() => {
    activeAuditCaseRef.current = selectedCaseId
    setEvents(localTrace(selectedCase))
    setMemo(localMemo(selectedCase))
    setApproval(null)
    setReason("")
    setFormError("")
  }, [selectedCaseId, selectedCase])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA"
      if (event.key === "/" && !isTyping) {
        event.preventDefault()
        filterInputRef.current?.focus()
      }
      if (event.key === "Escape" && selectedCitation) {
        setSelectedCitation(null)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedCitation])

  async function runAudit(mode: "live" | "replay" = "live") {
    const auditCase = selectedCase
    const auditCaseId = auditCase.id
    setRunning(true)
    setFormError("")
    setApproval(null)

    try {
      if (backendMode === "live" && mode === "live") {
        await runCase(auditCaseId)
        const eventPayload = await getCaseEvents(auditCaseId)
        if (activeAuditCaseRef.current !== auditCaseId) return
        const backendEvents = (eventPayload.events || []).map(normalizeBackendEvent)
        setEvents(backendEvents.length ? backendEvents : localTrace(auditCase))

        const memoPayload = await getCaseMemo(auditCaseId)
        if (activeAuditCaseRef.current !== auditCaseId) return
        setMemo(normalizeApiMemoPayload(memoPayload, localMemo(auditCase)))
      } else {
        setEvents(localTrace(auditCase))
        setMemo(localMemo(auditCase))
      }
    } catch (error) {
      setBackendMode("fallback")
      setBackendLabel(error instanceof Error ? error.message : "Backend unavailable")
      if (activeAuditCaseRef.current === auditCaseId) {
        setEvents(localTrace(auditCase))
        setMemo(localMemo(auditCase))
      }
    } finally {
      if (activeAuditCaseRef.current === auditCaseId) setRunning(false)
    }
  }

  async function submitApproval(action: "approve" | "override") {
    if (!reason.trim()) {
      setFormError("Typed reason required before approval is recorded.")
      return
    }

    try {
      let record: ApprovalRecord
      if (backendMode === "live") {
        record = await approveCase(selectedCase.id, action, reason.trim())
      } else {
        record = {
          action,
          reason: reason.trim(),
          timestamp: new Date().toISOString(),
          source: "local",
        }
      }
      setApproval(record)
      setMemo((current) => ({ ...current, approval: record }))
      setFormError("")
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Approval failed.")
    }
  }

  const visibleEvents = events.slice(0, 8)
  const selectedDoc = selectedCitation ? reclaimData.documents[selectedCitation] : null
  const decisionHeadline = compactPlannerHint(selectedCase.plannerHint)

  return (
    <div className="app-shell">
      <header className="app-toolbar">
        <div className="toolbar-brand">
          <div className="brand-mark">R</div>
          <div className="brand-copy">
            <span>Vultr Project A</span>
            <strong>Reclaim</strong>
          </div>
        </div>

        <nav className="app-nav" aria-label="Product navigation">
          <NavButton active={currentRoute === "workbench"} label="Workbench" onClick={() => navigate({ section: "workbench" })} />
          <NavButton active={currentRoute === "cases"} label="Cases" onClick={() => navigate({ section: "cases" })} />
          <NavButton active={currentRoute === "approvals"} label="Approvals" onClick={() => navigate({ section: "approvals" })} />
          <NavButton active={currentRoute === "sources"} label="Sources" onClick={() => navigate({ section: "sources" })} />
          <NavButton active={currentRoute === "system"} label="System" onClick={() => navigate({ section: "system" })} />
        </nav>

        <div className="toolbar-proof" aria-label="Deployment proof">
          <span>{deploymentProofLabel(backendMode, healthSnapshot)}</span>
          <span>{retrievalProofLabel(backendMode, healthSnapshot)}</span>
          <span>{rows.length} imported circuits</span>
        </div>

        <div className="toolbar-actions">
          <span className="runtime-state">
            <span className={cn("runtime-dot", backendMode)} />
            {backendMode === "live" ? "Live" : backendMode === "checking" ? "Checking" : "Fallback"}
          </span>
          <Button aria-label="Replay local trace" className="toolbar-icon-button" variant="ghost" size="icon" onClick={() => runAudit("replay")} disabled={running}>
            <RefreshCcw className="size-4" />
          </Button>
          <Button className="run-audit-button" size="sm" onClick={() => runAudit("live")} disabled={running}>
            <Play className="size-3.5" />
            <span>{running ? "Running" : "Run audit"}</span>
          </Button>
        </div>
      </header>

      <div className="mobile-pane-switcher" role="tablist" aria-label="Review panes">
        <MobilePaneButton active={mobilePane === "queue"} label="Queue" value={String(rows.length)} onClick={() => setMobilePane("queue")} />
        <MobilePaneButton active={mobilePane === "evidence"} label="Evidence" value={String(visibleEvents.length)} onClick={() => setMobilePane("evidence")} />
        <MobilePaneButton active={mobilePane === "packet"} label="Packet" value={formatCurrency(selectedCredit.recoverableAmount)} onClick={() => setMobilePane("packet")} />
      </div>

      {route.section === "cases" ? (
        <CasesRoute rows={filteredRows} selectedCaseId={selectedCaseId} onOpenCase={(caseId) => openCase(caseId, "case")} />
      ) : route.section === "approvals" ? (
        <ApprovalsRoute approval={approval} onOpenCase={(caseId) => openCase(caseId, "case")} />
      ) : route.section === "sources" ? (
        <SourcesRoute onCitation={setSelectedCitation} />
      ) : route.section === "system" ? (
        <SystemRoute backendLabel={backendLabel} backendMode={backendMode} healthSnapshot={healthSnapshot} rows={rows} />
      ) : (
        <main
          className="workbench"
          data-active-pane={mobilePane}
          data-explorer={explorerOpen ? "open" : "closed"}
          data-inspector={inspectorOpen ? "open" : "closed"}
        >
        <nav className="activity-rail" aria-label="Primary tools">
          <ActivityRailButton
            active={explorerOpen}
            label={explorerOpen ? "Hide claims list" : "Show claims list"}
            onClick={() => {
              setMobilePane("queue")
              setExplorerOpen((open) => !open)
            }}
          >
            <PanelLeft />
          </ActivityRailButton>
          <ActivityRailButton
            active={!explorerOpen && !inspectorOpen}
            label="Focus trace"
            onClick={() => {
              setMobilePane("evidence")
              const focus = explorerOpen || inspectorOpen
              setExplorerOpen(!focus)
              setInspectorOpen(!focus)
            }}
          >
            <Activity />
          </ActivityRailButton>
          <ActivityRailButton
            active={inspectorOpen}
            label={inspectorOpen ? "Hide packet" : "Show packet"}
            onClick={() => {
              setMobilePane("packet")
              setInspectorOpen((open) => !open)
            }}
          >
            <ClipboardCheck />
          </ActivityRailButton>
          <ActivityRailButton label="Open receipts" onClick={() => setSelectedCitation("sla-tier")}>
            <Files />
          </ActivityRailButton>
        </nav>

        <aside className="explorer-pane">
          <PaneHeader
            icon={<Files className="size-4" />}
            title="Claims"
            meta={`${filteredRows.length}/${rows.length}`}
            actions={<Badge className="quiet-badge" variant="outline">{formatCurrency(headlineRecovery)}</Badge>}
          />
          <div className="search-row">
            <Search className="size-4" />
            <input
              ref={filterInputRef}
              aria-label="Filter claims"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter circuit, BAN, route"
              type="search"
            />
          </div>
          <div className="explorer-list">
            {filteredRows.map((row) => (
              <CaseInboxRow
                key={row.id}
                row={row}
                selected={row.id === selectedCaseId}
                onSelect={() => row.live && openCase(row.id, route.section === "case" ? "case" : "workbench")}
              />
            ))}
          </div>
          <div className="explorer-footer">
            <InlineMeta label="Live" value={String(reclaimData.liveCases.length)} />
            <InlineMeta label="Imported" value={String(rows.length - reclaimData.liveCases.length)} />
          </div>
        </aside>

        <section className="editor-pane">
          <div className="editor-contextbar">
            <div>
              <span>Trace</span>
              <strong>{selectedCase.id}</strong>
            </div>
            <p>{visibleEvents.length} events / {sourceReceiptCount} receipts / {formatCurrency(selectedCredit.recoverableAmount)}</p>
          </div>

          <div className="case-strip">
            <div className="case-strip-main">
              <div className="case-titleline">
                <span className="mono">{selectedCase.id}</span>
                <strong>{selectedCase.store}</strong>
                <Badge className="status-badge" variant={classificationVariant(selectedCredit.classification)}>
                  {selectedCredit.classification}
                </Badge>
              </div>
              <div className="case-meta-row">
                <InlineMeta label="BAN" value={selectedCase.ban} />
                <InlineMeta label="Carrier" value={selectedCase.carrier} />
                <InlineMeta label="Invoice" value={selectedCase.invoiceMonth} />
                <InlineMeta label="Window" value={`${selectedCase.claimDaysLeft}d`} />
                <InlineMeta label="Confidence" value={`${selectedCredit.confidence.toFixed(2)} / 0.80`} />
              </div>
            </div>

            <Tabs className="case-tabs-root" value={selectedCaseId} onValueChange={(caseId) => openCase(caseId, route.section === "case" ? "case" : "workbench")}>
              <TabsList className="case-tabs">
                {reclaimData.liveCases.slice(0, 3).map((item) => (
                  <TabsTrigger className="case-tab" key={item.id} value={item.id}>
                    {routeTabLabel(item.route)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="decision-line">
            <div className="decision-copy">
              <span>
                <GitBranch className="size-3.5" />
                Route decision
              </span>
              <strong>{decisionHeadline}</strong>
              <p>{selectedCredit.countedMinutes} counted minutes vs {selectedCase.slaTarget}% SLA. Maintenance and billing checked.</p>
            </div>
            <div className="decision-readout">
              <small>Recoverable</small>
              <strong>{formatCurrency(selectedCredit.recoverableAmount)}</strong>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedCitation("maintenance-notice")}>
              <FileCheck2 className="size-3.5" />
              Clause
            </Button>
          </div>

          <div className="trace-board">
            <div className="trace-board-header" aria-hidden="true">
              <span>Step</span>
              <span>Event</span>
              <span>Metric</span>
              <span>Source</span>
            </div>
            <div className="trace-list" key={selectedCaseId}>
              {visibleEvents.map((event, index) => (
                <TraceRow key={`${event.eventName}-${index}`} event={event} index={index} onCitation={setSelectedCitation} />
              ))}
            </div>
          </div>
        </section>

        <aside className="inspector-pane">
          <PaneHeader
            icon={<ClipboardCheck className="size-4" />}
            title="Packet"
            meta={approval?.action === "approve" ? "Locked" : "Human gate"}
            actions={<Badge className="status-badge" variant={approval?.action === "approve" ? "success" : "warning"}>{approval?.action === "approve" ? "Approved" : "Review"}</Badge>}
          />
          <PacketPreview memo={memo} approval={approval} onCitation={setSelectedCitation} />
          <div className="approval-box">
            <label htmlFor="approval-reason">Typed audit reason</label>
            <Textarea
              id="approval-reason"
              className="approval-textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Verified outage record, SLA tier, maintenance notice, deadline, and formula row."
            />
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="approval-actions">
              <Button variant="outline" onClick={() => submitApproval("override")}>
                <RefreshCcw className="size-4" />
                Override
              </Button>
              <Button onClick={() => submitApproval("approve")} disabled={!reason.trim()}>
                <LockKeyhole className="size-4" />
                Approve
              </Button>
            </div>
          </div>
        </aside>
        </main>
      )}

      <StatusBar
        approval={approval}
        backendLabel={backendLabel}
        backendMode={backendMode}
        formError={formError}
        receiptCount={sourceReceiptCount}
        running={running}
        selectedCaseId={selectedCase.id}
      />

      <CitationSheet
        id={selectedCitation}
        doc={selectedDoc}
        supportLine={citationSupportLine(selectedCitation, selectedCase, selectedCredit)}
        onOpenChange={(open) => !open && setSelectedCitation(null)}
      />
    </div>
  )
}

function PaneHeader({
  actions,
  icon,
  meta,
  title,
}: {
  actions?: ReactNode
  icon: ReactNode
  meta: string
  title: string
}) {
  return (
    <div className="pane-header">
      <div className="pane-title">
        <span>{icon}</span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      {actions ? <div className="pane-actions">{actions}</div> : null}
    </div>
  )
}

function NavButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={cn("nav-button", active && "is-active")} type="button" aria-current={active ? "page" : undefined} onClick={onClick}>
      {label}
    </button>
  )
}

function ActivityRailButton({
  active,
  children,
  label,
  onClick,
}: {
  active?: boolean
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button className={cn("rail-button", active && "is-active")} type="button" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  )
}

function RoutePageShell({
  actions,
  children,
  kicker,
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  kicker: string
  title: string
}) {
  return (
    <main className="route-page">
      <header className="route-page-header">
        <div>
          <span>{kicker}</span>
          <h1>{title}</h1>
        </div>
        {actions ? <div className="route-page-actions">{actions}</div> : null}
      </header>
      {children}
    </main>
  )
}

function CasesRoute({
  onOpenCase,
  rows,
  selectedCaseId,
}: {
  onOpenCase: (caseId: string) => void
  rows: PortfolioRow[]
  selectedCaseId: string
}) {
  const liveCount = rows.filter((row) => row.live).length
  const exposure = rows.reduce((sum, row) => sum + row.amount, 0)

  return (
    <RoutePageShell
      kicker="Portfolio"
      title="Cases"
      actions={
        <>
          <Badge className="quiet-badge" variant="outline">{liveCount} live</Badge>
          <Badge className="quiet-badge" variant="outline">{formatCurrency(exposure)}</Badge>
        </>
      }
    >
      <section className="route-grid">
        <div className="route-panel route-panel-wide">
          <div className="case-table-head">
            <span>Circuit</span>
            <span>BAN</span>
            <span>Store</span>
            <span>Route</span>
            <span>Recovery</span>
            <span>Status</span>
          </div>
          <div className="case-table-body">
            {rows.map((row) => (
              <button
                className={cn("case-table-row", row.id === selectedCaseId && "is-selected", !row.live && "is-muted")}
                disabled={!row.live}
                key={row.id}
                onClick={() => row.live && onOpenCase(row.id)}
                type="button"
              >
                <strong className="mono">{row.id}</strong>
                <span>{row.ban}</span>
                <span>{row.store}</span>
                <Badge className="status-badge" variant={classificationVariant(row.route)}>{routeTabLabel(row.route)}</Badge>
                <strong>{formatCurrency(row.amount)}</strong>
                <span>{row.live ? "Live review" : "Preprocessed"}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </RoutePageShell>
  )
}

function ApprovalsRoute({ approval, onOpenCase }: { approval: ApprovalRecord | null; onOpenCase: (caseId: string) => void }) {
  const cases = reclaimData.liveCases.map((item) => ({ item, credit: creditForCase(item) }))

  return (
    <RoutePageShell kicker="Governance" title="Approvals">
      <section className="route-grid two-col">
        <div className="route-panel">
          <h2>Approval queue</h2>
          <div className="approval-list">
            {cases.map(({ item, credit }) => (
              <button className="approval-route-row" key={item.id} onClick={() => onOpenCase(item.id)} type="button">
                <span>
                  <strong className="mono">{item.id}</strong>
                  <small>{item.store} / BAN {item.ban}</small>
                </span>
                <Badge className="status-badge" variant={classificationVariant(credit.classification)}>{credit.classification}</Badge>
                <strong>{formatCurrency(credit.recoverableAmount)}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="route-panel">
          <h2>Latest decision</h2>
          {approval ? (
            <div className="approval-record-card">
              <BadgeCheck className="size-5" />
              <strong>{approval.action === "approve" ? "Approved recovery" : "Override recorded"}</strong>
              <p>{approval.reason}</p>
              <small>{approval.timestamp ? new Date(approval.timestamp).toLocaleString() : "Timestamp pending"}</small>
            </div>
          ) : (
            <div className="empty-state">
              <ClipboardCheck className="size-5" />
              <strong>No approval recorded in this session</strong>
              <p>Open a live case, verify the memo, and type a reason to lock the packet.</p>
            </div>
          )}
        </div>
      </section>
    </RoutePageShell>
  )
}

function SourcesRoute({ onCitation }: { onCitation: (id: string) => void }) {
  return (
    <RoutePageShell kicker="Evidence" title="Sources">
      <section className="route-grid">
        {Object.entries(reclaimData.documents).map(([id, doc]) => (
          <article className="source-card" key={id}>
            <div>
              <FileCheck2 className="size-4" />
              <span>{citationShortLabel(id)}</span>
            </div>
            <h2>{doc.title}</h2>
            <p>{doc.excerpt}</p>
            <small>{doc.page}</small>
            <Button variant="outline" size="sm" onClick={() => onCitation(id)}>
              Open receipt
            </Button>
          </article>
        ))}
      </section>
    </RoutePageShell>
  )
}

function SystemRoute({
  backendLabel,
  backendMode,
  healthSnapshot,
  rows,
}: {
  backendLabel: string
  backendMode: BackendMode
  healthSnapshot: HealthSnapshot
  rows: PortfolioRow[]
}) {
  const items = [
    ["Runtime", backendMode === "live" ? "Live backend" : backendMode === "checking" ? "Checking" : "Fallback"],
    ["Deployment", healthSnapshot.deployment || "local fallback"],
    ["Planner", healthSnapshot.plannerMode || "not reported"],
    ["Retrieval", healthSnapshot.retrievalMode || "not reported"],
    ["API base", API_BASE || "same origin"],
    ["Imported cases", String(rows.length)],
  ]

  return (
    <RoutePageShell kicker="Operations" title="System">
      <section className="route-grid two-col">
        <div className="route-panel">
          <h2>Health proof</h2>
          <div className="system-list">
            {items.map(([label, value]) => (
              <div className="system-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="route-panel system-summary">
          <Database className="size-5" />
          <h2>{backendLabel}</h2>
          <p>Labels come from `/health`; the UI does not claim Vultr services unless the backend reports them.</p>
          <Badge className="status-badge" variant={backendMode === "live" ? "default" : "warning"}>{backendMode}</Badge>
        </div>
      </section>
    </RoutePageShell>
  )
}

function InlineMeta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  )
}

function MobilePaneButton({
  active,
  label,
  value,
  onClick,
}: {
  active: boolean
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button className={cn("mobile-pane-button", active && "is-active")} type="button" role="tab" aria-selected={active} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

function StatusBar({
  approval,
  backendLabel,
  formError,
  receiptCount,
  running,
  selectedCaseId,
}: {
  approval: ApprovalRecord | null
  backendLabel: string
  backendMode: BackendMode
  formError: string
  receiptCount: number
  running: boolean
  selectedCaseId: string
}) {
  const state = formError || (running ? "Audit running" : approval ? "Approval recorded" : "Ready")
  const stackLabel = backendLabel || "Checking backend"

  return (
    <footer className="statusbar">
      <span>{stackLabel}</span>
      <span>{selectedCaseId}</span>
      <span>{receiptCount} receipts</span>
      <strong>{state}</strong>
    </footer>
  )
}

function normalizeApiMemoPayload(payload: Partial<ClaimMemo>, fallback: ClaimMemo): ClaimMemo {
  const source = payload as Record<string, unknown>
  const formula = source.creditFormula && typeof source.creditFormula === "object" ? (source.creditFormula as Record<string, unknown>) : undefined
  const confidence = source.confidence && typeof source.confidence === "object" ? (source.confidence as Record<string, unknown>) : undefined
  const citationIds = Array.isArray(source.citations)
    ? source.citations
        .map((item) => (item && typeof item === "object" ? String((item as Record<string, unknown>).citationId || "") : ""))
        .filter(Boolean)
    : []
  const citationMap = payload.citations && !Array.isArray(payload.citations) ? payload.citations : fallback.citations
  const amount = Number(formula?.recoverableCredit ?? source.amount ?? fallback.amount)
  const uptime = Number(source.actualUptimePct)
  const threshold = Number(source.slaTargetPct)
  const confidenceScore = Number(confidence?.score)
  const confidenceFormula = typeof confidence?.formula === "string" ? confidence.formula : fallback.confidenceLabel

  return {
    ...fallback,
    ...payload,
    caseId: String(source.caseId || fallback.caseId),
    store: String(source.storeName || source.store || fallback.store),
    carrier: String(source.carrier || fallback.carrier),
    ban: String(source.ban || fallback.ban),
    circuit: String(source.circuitId || source.circuit || fallback.circuit),
    invoiceMonth: String(source.invoiceMonth || fallback.invoiceMonth),
    mrc: Number(source.mrc ?? formula?.mrc ?? fallback.mrc),
    tickets: Array.isArray(source.ticketIds) ? source.ticketIds.map(String) : fallback.tickets,
    amount: Number.isFinite(amount) ? amount : fallback.amount,
    availability: Number.isFinite(uptime) && Number.isFinite(threshold) ? `${uptime.toFixed(2)}% actual vs ${threshold}% target` : fallback.availability,
    exclusionDecision: fallback.exclusionDecision,
    deadline: String(source.filingDeadline || fallback.deadline),
    confidenceLabel: Number.isFinite(confidenceScore) ? `${confidenceScore.toFixed(2)} = ${confidenceFormula}` : fallback.confidenceLabel,
    classification: String(source.classification || fallback.classification),
    citations: citationIds.length
      ? {
          availability: citationIds.includes("sla-tier") ? "sla-tier" : citationMap.availability,
          exclusion: citationIds.includes("maintenance-notice") ? "maintenance-notice" : citationMap.exclusion,
          deadline: citationIds.includes("claim-window") ? "claim-window" : citationMap.deadline,
        }
      : citationMap,
  }
}

function CaseInboxRow({ row, selected, onSelect }: { row: PortfolioRow; selected: boolean; onSelect: () => void }) {
  const liveCase = reclaimData.liveCases.find((item) => item.id === row.id)
  const meta = liveCase ? `${row.store} / BAN ${row.ban}` : `${row.store} / imported`

  return (
    <button
      className={cn("case-inbox-row", selected && "is-selected", !row.live && "is-muted")}
      onClick={onSelect}
      disabled={!row.live}
      type="button"
    >
      <span className="case-row-status" data-route={slug(row.route)} />
      <span className="case-row-copy">
        <strong className="mono">{row.id}</strong>
        <small>{meta}</small>
      </span>
      <span className="case-row-amount">
        <strong>{formatCurrency(row.amount)}</strong>
        <small>{routeTabLabel(row.route)}</small>
      </span>
    </button>
  )
}

function TraceRow({ event, index, onCitation }: { event: TraceEvent; index: number; onCitation: (id: string) => void }) {
  return (
    <article className="trace-row" data-kind={event.kind}>
      <div className="trace-step">
        <strong>{String(index + 1).padStart(2, "0")}</strong>
        <span>{traceKindLabel(event.kind)}</span>
      </div>
      <div className="trace-copy">
        <div>
          <h4>{event.title}</h4>
          <Badge className="status-badge" variant={eventVariant(event.kind, event.status)}>{event.status}</Badge>
        </div>
        <p>{event.detail}</p>
      </div>
      <strong className="trace-metric">{event.metric}</strong>
      {event.provenance ? (
        <Badge className="status-badge" variant="outline">
          {event.provenance}
        </Badge>
      ) : null}
      <div className="trace-actions">
        {(event.citationIds || []).map((id) => (
          <button className="citation-link" key={id} type="button" onClick={() => onCitation(id)}>
            <FileCheck2 className="size-3.5" />
            {citationShortLabel(id)}
          </button>
        ))}
      </div>
    </article>
  )
}

function PacketPreview({
  memo,
  approval,
  onCitation,
}: {
  memo: ClaimMemo
  approval: ApprovalRecord | null
  onCitation: (id: string) => void
}) {
  const receiptIds = Object.values(memo.citations).filter(Boolean) as string[]
  const sourceCase = reclaimData.liveCases.find((item) => item.id === memo.caseId)
  const credit = sourceCase ? creditForCase(sourceCase) : null

  return (
    <div className="packet-preview">
      <section className="packet-summary">
        <div>
          <span>Draft packet</span>
          <strong>{memo.store}</strong>
          <small>{memo.caseId} / BAN {memo.ban}</small>
        </div>
        <div className="packet-amount">
          <small>Claim</small>
          <strong>{formatCurrency(memo.amount)}</strong>
        </div>
      </section>

      {sourceCase && credit ? <PacketFormula item={sourceCase} credit={credit} /> : null}

      <section className="inspector-section">
        <div className="section-label">
          <Files className="size-4" />
          <span>{receiptIds.length} receipts</span>
        </div>
        <div className="receipt-list">
          {receiptIds.map((id) => {
            const doc = reclaimData.documents[id]
            return (
              <button className="receipt-row" key={id} type="button" onClick={() => onCitation(id)}>
                <FileCheck2 className="size-3.5" />
                <span>
                  <strong>{citationShortLabel(id)}</strong>
                  <small>{doc.title.replace("Northstar Telecom MSA - ", "")}</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="field-list">
        <PacketField label="Carrier" value={memo.carrier} />
        <PacketField label="Circuit" value={memo.circuit} />
        <PacketField label="Availability" value={memo.availability} citation={memo.citations.availability} onCitation={onCitation} />
        <PacketField label="Exclusion" value={memo.exclusionDecision} citation={memo.citations.exclusion} onCitation={onCitation} />
        <PacketField label="Deadline" value={memo.deadline} citation={memo.citations.deadline} onCitation={onCitation} />
        <PacketField label="Confidence" value={memo.confidenceLabel} />
      </section>

      {approval ? (
        <div className="approval-note">
          <ShieldCheck className="size-4" />
          <span>
            <strong>{approval.action === "approve" ? "Packet locked for filing" : "Override recorded"}</strong>
            <small>
              {approval.timestamp ? new Date(approval.timestamp).toLocaleString() : "Audit timestamp recorded"} / {approval.source || "live backend"}
            </small>
            <em>{approval.reason}</em>
          </span>
        </div>
      ) : null}
    </div>
  )
}

function PacketField({
  label,
  value,
  citation,
  onCitation,
}: {
  label: string
  value: string
  citation?: string
  onCitation?: (id: string) => void
}) {
  return (
    <div className="packet-field">
      <p>{label}</p>
      <strong>{value}</strong>
      {citation && onCitation ? (
        <button type="button" onClick={() => onCitation(citation)}>
          {citationShortLabel(citation)}
        </button>
      ) : null}
    </div>
  )
}

function PacketFormula({ item, credit }: { item: typeof reclaimData.liveCases[number]; credit: ReturnType<typeof creditForCase> }) {
  const tierAmount = item.mrc * 0.1
  const confidenceItems = [
    { label: "Retrieval", value: item.retrievalMatch },
    { label: "Ambiguity", value: item.ambiguityResolution },
    { label: "Billing", value: item.billingCertainty },
  ]

  return (
    <section className="formula-panel">
      <div className="formula-line">
        <Gauge className="size-4" />
        <span>{formatCurrency(item.mrc)} MRC</span>
        <small>x</small>
        <span>10% SLA tier</span>
        <small>=</small>
        <strong>{formatCurrency(tierAmount)}</strong>
      </div>
      <div className="formula-meta">
        <InlineMeta label="Ticket" value={item.intervals[0].ticket} />
        <InlineMeta label="Downtime" value={`${credit.countedMinutes} min`} />
        <InlineMeta label="Uptime" value={`${credit.uptime.toFixed(2)}%`} />
      </div>
      <div className="confidence-list">
        {confidenceItems.map((entry) => (
          <div className="confidence-row" key={entry.label}>
            <span>{entry.label}</span>
            <div><i style={{ width: `${Math.round(entry.value * 100)}%` }} /></div>
            <strong>{entry.value.toFixed(2)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function CitationSheet({
  id,
  doc,
  supportLine,
  onOpenChange,
}: {
  id: string | null
  doc: DocumentReceipt | null
  supportLine: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={Boolean(id)} onOpenChange={onOpenChange}>
      <SheetContent className="source-sheet">
        <SheetHeader className="source-sheet-header">
          <SheetTitle>Source receipt</SheetTitle>
          <SheetDescription>{doc?.title || "Clause evidence"}</SheetDescription>
        </SheetHeader>
        {doc ? (
          <div className="source-sheet-body">
            <div className="support-line">
              <p>Supports memo line</p>
              <strong>{supportLine}</strong>
            </div>
            <div className="receipt-document">
              <img src={`/app/${doc.asset}`} alt={`Highlighted clause from ${doc.title}`} />
              <div>
                <PacketField label="Location" value={doc.page} />
                <PacketField label="Cited text" value={doc.excerpt} />
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function deploymentProofLabel(backendMode: BackendMode, snapshot: HealthSnapshot) {
  if (backendMode === "checking") return "Checking deployment"
  if (backendMode !== "live") return "Local fallback"
  if (snapshot.deployment === "vultr") return "Vultr Compute live"
  if (snapshot.deployment === "local") return "Local server"
  return "Live backend"
}

function retrievalProofLabel(backendMode: BackendMode, snapshot: HealthSnapshot) {
  if (backendMode === "checking") return "Checking retrieval"
  if (backendMode !== "live") return "Local index"
  if (snapshot.retrievalMode === "vultr-embeddings") return "Vultr embeddings"
  if (snapshot.retrievalMode === "local-tfidf") return "Local index"
  return "Live retrieval"
}

function traceKindLabel(kind: TraceEvent["kind"]) {
  if (kind === "retrieval") return "RAG"
  if (kind === "tool") return "Tool"
  if (kind === "memo") return "Memo"
  if (kind === "skip") return "Skip"
  if (kind === "decision") return "Rule"
  return "Plan"
}

function compactPlannerHint(hint: string) {
  const key = slug(hint)
  if (key.includes("scheduled-maintenance")) return "Maintenance lacks required notice. Billing complete."
  if (key.includes("billing-history")) return "Billing history checked. No duplicate credit."
  if (key.includes("prior") || key.includes("credit")) return "Prior credit found. Recovery blocked."
  if (key.includes("clean")) return "Clean SLA breach. Formula ready."
  return hint
}

function citationShortLabel(id: string) {
  if (id === "sla-tier") return "Exhibit B p14"
  if (id === "maintenance-notice") return "MSA 7.3"
  if (id === "claim-window") return "Claim 9.1"
  if (id === "invoice-credit") return "Invoice line 44"
  return id
}

function citationSupportLine(id: string | null, item: typeof reclaimData.liveCases[number], credit: ReturnType<typeof creditForCase>) {
  if (id === "sla-tier") {
    return `${formatCurrency(item.mrc)} MRC x 10% SLA tier = ${formatCurrency(credit.recoverableAmount)}.`
  }
  if (id === "maintenance-notice") {
    return "Maintenance label counts because required 5-day notice is missing."
  }
  if (id === "claim-window") {
    return `${item.claimDaysLeft} days left to file for ${item.invoiceMonth}.`
  }
  if (id === "invoice-credit") {
    return "Prior service-credit line blocks duplicate recovery."
  }
  return "Source receipt supports the selected recovery memo line."
}

function classificationVariant(classification: string) {
  const key = slug(classification)
  if (key.includes("deadline") || key.includes("review")) return "warning"
  if (key.includes("credit-owed")) return "default"
  if (key.includes("already")) return "muted"
  if (key.includes("excluded")) return "muted"
  return "outline"
}

function routeTabLabel(route: string) {
  const key = slug(route)
  if (key.includes("already")) return "credited"
  if (key.includes("deep")) return "deep"
  return route
}

function eventVariant(kind: TraceEvent["kind"], status: string) {
  const key = slug(`${kind}-${status}`)
  if (key.includes("urgent") || key.includes("deadline") || key.includes("review")) return "warning"
  if (key.includes("retrieval") || key.includes("counts")) return "violet"
  if (key.includes("memo") || key.includes("ready")) return "default"
  return "muted"
}

export default App
