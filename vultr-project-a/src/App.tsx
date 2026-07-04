import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  LockKeyhole,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
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

const API_BASE = window.location.port === "8765" ? "" : "http://127.0.0.1:8765"

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
  const [selectedCaseId, setSelectedCaseId] = useState(reclaimData.liveCases[0].id)
  const selectedCase = reclaimData.liveCases.find((item) => item.id === selectedCaseId) || reclaimData.liveCases[0]
  const selectedCredit = creditForCase(selectedCase)
  const [events, setEvents] = useState<TraceEvent[]>(() => localTrace(selectedCase))
  const [memo, setMemo] = useState<ClaimMemo>(() => localMemo(selectedCase))
  const [approval, setApproval] = useState<ApprovalRecord | null>(null)
  const [reason, setReason] = useState("")
  const [running, setRunning] = useState(false)
  const [backendMode, setBackendMode] = useState<BackendMode>("checking")
  const [backendLabel, setBackendLabel] = useState("Checking backend")
  const [selectedCitation, setSelectedCitation] = useState<string | null>(null)
  const [formError, setFormError] = useState("")

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
        setBackendLabel(`Live backend, ${corpus}`)
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
    setEvents(localTrace(selectedCase))
    setMemo(localMemo(selectedCase))
    setApproval(null)
    setReason("")
    setFormError("")
  }, [selectedCaseId, selectedCase])

  async function runAudit(mode: "live" | "replay" = "live") {
    setRunning(true)
    setFormError("")
    setApproval(null)

    try {
      if (backendMode === "live" && mode === "live") {
        await requestJson(`/cases/${encodeURIComponent(selectedCase.id)}/run`, {
          method: "POST",
          body: JSON.stringify({ requestedBy: "submission-review" }),
        })
        const eventPayload = await requestJson<{ events?: TraceEvent[] }>(
          `/api/cases/${encodeURIComponent(selectedCase.id)}/events`,
        )
        const backendEvents = (eventPayload.events || []).map(normalizeBackendEvent)
        setEvents(backendEvents.length ? backendEvents : localTrace(selectedCase))

        const memoPayload = await requestJson<Partial<ClaimMemo>>(
          `/api/cases/${encodeURIComponent(selectedCase.id)}/memo`,
        )
        setMemo({ ...localMemo(selectedCase), ...memoPayload })
      } else {
        setEvents(localTrace(selectedCase))
        setMemo(localMemo(selectedCase))
      }
    } catch (error) {
      setBackendMode("fallback")
      setBackendLabel(error instanceof Error ? error.message : "Backend unavailable")
      setEvents(localTrace(selectedCase))
      setMemo(localMemo(selectedCase))
    } finally {
      setRunning(false)
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

  const visibleEvents = events.slice(0, 7)
  const selectedDoc = selectedCitation ? reclaimData.documents[selectedCitation] : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="review-topbar">
        <div className="flex items-center gap-3">
          <div className="brand-tile">R</div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Vultr Project A</p>
            <h1 className="text-lg font-semibold leading-none">Reclaim</h1>
          </div>
        </div>
        <nav className="hidden items-center gap-1 rounded-md border border-border bg-card p-1 md:flex">
          <a className="nav-pill is-active" href="#review">Review desk</a>
          <a className="nav-pill" href="#evidence">Evidence</a>
          <a className="nav-pill" href="#packet">Packet</a>
        </nav>
        <div className="flex items-center gap-2">
          <Badge variant={backendMode === "live" ? "success" : backendMode === "checking" ? "muted" : "warning"}>
            {backendMode === "live" ? "Live backend" : backendMode === "checking" ? "Checking" : "Fallback"}
          </Badge>
          <Button className="mobile-secondary-action" variant="outline" size="sm" onClick={() => runAudit("replay")} disabled={running}>
            <RefreshCcw className="size-3.5" />
            Replay
          </Button>
          <Button size="sm" onClick={() => runAudit("live")} disabled={running}>
            <Play className="size-3.5" />
            {running ? "Running" : "Run audit"}
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1540px] gap-4 px-4 py-4 md:px-6">
        <section className="command-strip" id="review">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Active recovery review</p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{selectedCase.store}</h2>
              <Badge variant={classificationVariant(selectedCredit.classification)}>
                {selectedCredit.classification}
              </Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {selectedCase.id}, BAN {selectedCase.ban}. {selectedCase.plannerHint}
            </p>
          </div>
          <div className="command-metrics">
            <CommandMetric label="Calculated exposure" value={formatCurrency(exposure)} />
            <CommandMetric label="This packet" value={formatCurrency(selectedCredit.recoverableAmount)} />
            <CommandMetric label="Deadline" value={`${selectedCase.claimDaysLeft}d`} />
            <CommandMetric label="Confidence" value={selectedCredit.confidence.toFixed(2)} />
          </div>
        </section>

        <section className="review-grid">
          <aside className="review-panel min-h-0 overflow-hidden" id="portfolio">
            <PanelHeader
              eyebrow={`${rows.length} circuits`}
              title="Claim queue"
              right={<Badge variant="outline">{formatCurrency(exposure)}</Badge>}
            />
            <div className="search-row">
              <Search className="size-4 text-muted-foreground" />
              <span>Filter by circuit, BAN, route</span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {rows.map((row) => (
                <CaseInboxRow
                  key={row.id}
                  row={row}
                  selected={row.id === selectedCaseId}
                  onSelect={() => row.live && setSelectedCaseId(row.id)}
                />
              ))}
            </div>
          </aside>

          <section className="review-panel min-h-0 overflow-hidden" id="evidence">
            <PanelHeader
              eyebrow="Deterministic trace"
              title="Evidence dossier"
              right={
                <Tabs value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <TabsList className="h-8">
                    {reclaimData.liveCases.slice(0, 3).map((item) => (
                      <TabsTrigger className="h-6 px-2 text-xs" key={item.id} value={item.id}>
                        {item.route}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              }
            />
            <div className="case-dossier">
              <DossierFact label="Circuit" value={selectedCase.id} />
              <DossierFact label="Ticket" value={selectedCase.intervals[0].ticket} />
              <DossierFact label="Counted" value={`${selectedCredit.countedMinutes} min`} />
              <DossierFact label="MRC" value={formatCurrency(selectedCase.mrc)} />
              <DossierFact label="Uptime" value={`${selectedCredit.uptime.toFixed(2)}%`} />
              <DossierFact label="Route" value={selectedCase.route} />
            </div>
            <TracePath events={visibleEvents} />
            <div className="source-row">
              <SourceReceipt id="sla-tier" onOpen={setSelectedCitation} />
              {selectedCase.intervals.some((interval) => interval.tag === "scheduled maintenance") ? (
                <SourceReceipt id="maintenance-notice" onOpen={setSelectedCitation} />
              ) : (
                <SourceSkip />
              )}
              <SourceReceipt id="claim-window" onOpen={setSelectedCitation} />
            </div>
            <div className="trace-list">
              {visibleEvents.map((event, index) => (
                <TraceRow key={`${event.eventName}-${index}`} event={event} index={index} onCitation={setSelectedCitation} />
              ))}
            </div>
          </section>

          <aside className="review-panel min-h-0 overflow-hidden" id="packet">
            <PanelHeader
              eyebrow={approval?.action === "approve" ? "Approval recorded" : "Human gate"}
              title="Claim packet"
              right={<Badge variant={approval?.action === "approve" ? "success" : "warning"}>{approval?.action === "approve" ? "Approved" : "Review"}</Badge>}
            />
            <PacketPreview memo={memo} approval={approval} onCitation={setSelectedCitation} />
            <div className="approval-box">
              <label className="text-sm font-medium" htmlFor="approval-reason">Typed audit reason</label>
              <Textarea
                id="approval-reason"
                className="mt-2 min-h-[92px] resize-none"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Verified outage record, SLA tier, maintenance notice, deadline, and formula row."
              />
              {formError ? <p className="mt-2 text-sm text-destructive">{formError}</p> : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => submitApproval("override")}>
                  <RefreshCcw className="size-4" />
                  Override
                </Button>
                <Button onClick={() => submitApproval("approve")}>
                  <LockKeyhole className="size-4" />
                  Approve
                </Button>
              </div>
            </div>
          </aside>
        </section>
      </main>

      <CitationSheet id={selectedCitation} doc={selectedDoc} onOpenChange={(open) => !open && setSelectedCitation(null)} />
    </div>
  )
}

function PanelHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string
  title: string
  right?: ReactNode
}) {
  return (
    <div className="panel-header">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
        <h3 className="mt-1 truncate text-base font-semibold">{title}</h3>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

function CommandMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="command-metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function CaseInboxRow({ row, selected, onSelect }: { row: PortfolioRow; selected: boolean; onSelect: () => void }) {
  return (
    <button
      className={cn("case-inbox-row", selected && "is-selected", !row.live && "is-muted")}
      onClick={onSelect}
      type="button"
    >
      <span className="min-w-0">
        <span className="mono block truncate text-sm font-semibold">{row.id}</span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">{row.store}</span>
      </span>
      <span className="grid justify-items-end gap-2">
        <span className="tabular text-sm font-semibold">{formatCurrency(row.amount)}</span>
        <Badge variant={routeVariant(row.route)}>{row.route}</Badge>
      </span>
    </button>
  )
}

function DossierFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="dossier-fact">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  )
}

function TracePath({ events }: { events: TraceEvent[] }) {
  return (
    <div className="trace-path" aria-label="Trace path">
      {events.slice(0, 6).map((event, index) => (
        <div className="trace-node" key={`${event.eventName}-${index}`}>
          <div className={cn("trace-node-dot", event.kind)}>{index + 1}</div>
          <p>{traceShortName(event.eventName)}</p>
        </div>
      ))}
    </div>
  )
}

function SourceReceipt({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const doc = reclaimData.documents[id]
  return (
    <button className="source-card" type="button" onClick={() => onOpen(id)}>
      <BookOpen className="size-4 text-primary" />
      <span>
        <strong>{doc.page}</strong>
        <small>{doc.title.replace("Northstar Telecom MSA - ", "")}</small>
      </span>
    </button>
  )
}

function SourceSkip() {
  return (
    <div className="source-card is-passive">
      <CheckCircle2 className="size-4 text-emerald-700" />
      <span>
        <strong>Exclusion skipped</strong>
        <small>No ambiguous maintenance interval.</small>
      </span>
    </div>
  )
}

function TraceRow({ event, index, onCitation }: { event: TraceEvent; index: number; onCitation: (id: string) => void }) {
  return (
    <article className="trace-row">
      <div className="trace-index">{String(index + 1).padStart(2, "0")}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4>{event.title}</h4>
          <Badge variant={eventVariant(event.kind, event.status)}>{event.status}</Badge>
        </div>
        <p>{event.detail}</p>
        <strong>{event.metric}</strong>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        {(event.citationIds || []).map((id) => (
          <Button key={id} variant="outline" size="sm" onClick={() => onCitation(id)}>
            <FileCheck2 className="size-3.5" />
            {reclaimData.documents[id]?.page || id}
          </Button>
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
  return (
    <div className="packet-preview">
      <div className="packet-cover">
        <div>
          <p>Draft packet</p>
          <h3>{memo.store}</h3>
        </div>
        <strong>{formatCurrency(memo.amount)}</strong>
      </div>
      <PacketField label="Carrier" value={memo.carrier} />
      <PacketField label="Circuit" value={memo.circuit} />
      <PacketField label="Availability" value={memo.availability} citation={memo.citations.availability} onCitation={onCitation} />
      <PacketField label="Exclusion" value={memo.exclusionDecision} citation={memo.citations.exclusion} onCitation={onCitation} />
      <PacketField label="Deadline" value={memo.deadline} citation={memo.citations.deadline} onCitation={onCitation} />
      <PacketField label="Confidence" value={memo.confidenceLabel} />
      {approval ? (
        <div className="approval-note">
          <ShieldCheck className="size-4" />
          <span>{approval.reason}</span>
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
          Receipt
        </button>
      ) : null}
    </div>
  )
}

function CitationSheet({
  id,
  doc,
  onOpenChange,
}: {
  id: string | null
  doc: DocumentReceipt | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={Boolean(id)} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Source receipt</SheetTitle>
          <SheetDescription>{doc?.title || "Clause evidence"}</SheetDescription>
        </SheetHeader>
        {doc ? (
          <div className="flex-1 overflow-auto px-6 pb-6">
            <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
              <img className="w-full border-b border-border bg-background" src={`/app/${doc.asset}`} alt={`Highlighted clause from ${doc.title}`} />
              <div className="grid gap-4 p-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Location</p>
                  <p className="mt-1 text-sm font-semibold">{doc.page}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Cited text</p>
                  <p className="mt-1 text-sm leading-6">{doc.excerpt}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function traceShortName(eventName: string) {
  if (eventName.includes("plan")) return "Plan"
  if (eventName.includes("outage")) return "Outage"
  if (eventName.includes("uptime")) return "Uptime"
  if (eventName.includes("sla")) return "SLA"
  if (eventName.includes("exclusion")) return "Clause"
  if (eventName.includes("credit")) return "Credit"
  return "Memo"
}

function classificationVariant(classification: string) {
  const key = slug(classification)
  if (key.includes("deadline")) return "warning"
  if (key.includes("credit-owed")) return "success"
  if (key.includes("already")) return "muted"
  if (key.includes("review")) return "violet"
  return "outline"
}

function routeVariant(route: string) {
  const key = slug(route)
  if (key.includes("deadline")) return "warning"
  if (key.includes("deep")) return "violet"
  if (key.includes("credit")) return "success"
  return "muted"
}

function eventVariant(kind: TraceEvent["kind"], status: string) {
  const key = slug(`${kind}-${status}`)
  if (key.includes("urgent") || key.includes("deadline")) return "warning"
  if (key.includes("retrieval") || key.includes("counts")) return "violet"
  if (key.includes("memo") || key.includes("ready") || key.includes("clear")) return "success"
  return "muted"
}

export default App
