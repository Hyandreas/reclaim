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
  formatCurrency,
  localMemo,
  localTrace,
  normalizeBackendEvent,
  reclaimData,
  slug,
  type ApprovalRecord,
  type ClaimMemo,
  type DocumentReceipt,
  type PortfolioRow,
  type TraceEvent,
} from "@/lib/reclaim"

type BackendMode = "checking" | "live" | "fallback"
type MobilePane = "queue" | "evidence" | "packet"

const API_BASE =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ||
  (window.location.port === "8765" ? "" : "http://127.0.0.1:8765")

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${response.status}`)
  }
  return body as T
}

function App() {
  const rows = useMemo(() => allRows(), [])
  const exposure = useMemo(() => calculatedExposure(), [])
  const headlineRecovery = reclaimData.targetRecovery || exposure
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

  useEffect(() => {
    let active = true
    requestJson<Record<string, unknown>>("/health")
      .then((health) => {
        if (!active) return
        const retrievalIndex = typeof health.retrievalIndex === "object" && health.retrievalIndex
          ? health.retrievalIndex as { corpusVersion?: unknown }
          : null
        const corpus = String(health.corpusVersion || retrievalIndex?.corpusVersion || "corpus-v7")
        setBackendMode("live")
        setBackendLabel(`Vultr Compute live / Object Storage receipts / ${corpus} / audit DB`)
      })
      .catch(() => {
        if (!active) return
        setBackendMode("fallback")
        setBackendLabel("Local deterministic fallback")
      })
    return () => {
      active = false
    }
  }, [])

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
        await requestJson(`/cases/${encodeURIComponent(auditCaseId)}/run`, {
          method: "POST",
          body: JSON.stringify({ requestedBy: "submission-review" }),
        })
        const eventPayload = await requestJson<{ events?: TraceEvent[] }>(
          `/api/cases/${encodeURIComponent(auditCaseId)}/events`,
        )
        if (activeAuditCaseRef.current !== auditCaseId) return
        const backendEvents = (eventPayload.events || []).map(normalizeBackendEvent)
        setEvents(backendEvents.length ? backendEvents : localTrace(auditCase))

        const memoPayload = await requestJson<Partial<ClaimMemo>>(
          `/api/cases/${encodeURIComponent(auditCaseId)}/memo`,
        )
        if (activeAuditCaseRef.current !== auditCaseId) return
        setMemo({ ...localMemo(auditCase), ...memoPayload })
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
        record = await requestJson<ApprovalRecord>(`/cases/${encodeURIComponent(selectedCase.id)}/approve`, {
          method: "POST",
          body: JSON.stringify({ action, reason: reason.trim() }),
        })
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

        <div className="toolbar-proof" aria-label="Deployment proof">
          <span>Deployed on Vultr</span>
          <span>Vector receipts</span>
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
                onSelect={() => row.live && setSelectedCaseId(row.id)}
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

            <Tabs className="case-tabs-root" value={selectedCaseId} onValueChange={setSelectedCaseId}>
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
  backendMode,
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
  const stackLabel =
    backendMode === "live"
      ? "Vultr Compute + receipt store"
      : backendMode === "checking"
        ? "Checking backend"
        : "Local deterministic fallback"

  return (
    <footer className="statusbar">
      <span>{stackLabel}</span>
      <span>{selectedCaseId}</span>
      <span>{receiptCount} receipts</span>
      <strong>{state}</strong>
    </footer>
  )
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
