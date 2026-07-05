import "../data/reclaim-data.js"

declare global {
  interface Window {
    RECLAIM_DATA: ReclaimData
  }
}

export type Interval = {
  ticket: string
  minutes: number
  tag: string
  notice: string
  notes: string
}

export type InvoiceLine = {
  amount: number
  reason: string
  invoiceLine: string
}

export type LiveCase = {
  id: string
  ban: string
  store: string
  carrier: string
  region: string
  timezone: string
  invoiceMonth: string
  mrc: number
  periodMinutes: number
  slaTarget: number
  claimDaysLeft: number
  route: string
  initialStatus: string
  plannerHint: string
  intervals: Interval[]
  invoiceHistory: InvoiceLine[]
  retrievalMatch: number
  ambiguityResolution: number
  billingCertainty: number
}

export type DocumentReceipt = {
  title: string
  page: string
  asset: string
  excerpt: string
}

export type ReclaimData = {
  targetRecovery: number
  documents: Record<string, DocumentReceipt>
  liveCases: LiveCase[]
  portfolioRows: [string, string, string, string, number][]
}

export type CaseCredit = {
  counted: Array<Interval & { counts: boolean; reason: string }>
  countedMinutes: number
  uptime: number
  breach: boolean
  rawCredit: number
  alreadyCredited: number
  recoverableAmount: number
  confidence: number
  classification: string
  confidenceTerms: {
    retrievalMatch: number
    ambiguityResolution: number
    billingCertainty: number
    formula: string
  }
}

export type PortfolioRow = {
  id: string
  ban: string
  store: string
  route: string
  amount: number
  live: boolean
}

export type TraceEvent = {
  eventName: string
  title: string
  kind: "model" | "retrieval" | "tool" | "skip" | "decision" | "memo"
  status: string
  detail: string
  metric: string
  citationIds?: string[]
}

export type ClaimMemo = {
  caseId: string
  store: string
  carrier: string
  ban: string
  circuit: string
  invoiceMonth: string
  mrc: number
  tickets: string[]
  amount: number
  availability: string
  exclusionDecision: string
  deadline: string
  confidenceLabel: string
  classification: string
  citations: {
    availability: string
    exclusion?: string
    deadline: string
  }
  approval?: ApprovalRecord | null
}

export type ApprovalRecord = {
  action: "approve" | "override"
  reason: string
  timestamp?: string
  source?: string
}

export const reclaimData = window.RECLAIM_DATA

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value || 0)
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}

export function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export function countedIntervals(item: LiveCase): CaseCredit["counted"] {
  return item.intervals.map((interval) => {
    let counts = true
    let reason = "Carrier-responsible downtime counts against SLA."

    if (interval.tag === "scheduled maintenance" && interval.notice === "customer approved") {
      counts = false
      reason = "Customer-approved maintenance is excluded."
    }

    if (interval.tag === "customer-caused" && interval.notice === "unclear") {
      counts = false
      reason = "Conflicting evidence stays in human review."
    }

    if (interval.tag === "scheduled maintenance" && interval.notice === "missing") {
      counts = true
      reason = "Maintenance label counts because required 5-day notice is missing."
    }

    return { ...interval, counts, reason }
  })
}

export function creditForCase(item: LiveCase): CaseCredit {
  const counted = countedIntervals(item)
  const countedMinutes = counted.reduce((sum, row) => sum + (row.counts ? row.minutes : 0), 0)
  const uptime = ((item.periodMinutes - countedMinutes) / item.periodMinutes) * 100
  const retrievalMatch = item.retrievalMatch
  const ambiguityResolution = item.ambiguityResolution
  const billingCertainty = item.billingCertainty
  const confidence = 0.4 * retrievalMatch + 0.4 * ambiguityResolution + 0.2 * billingCertainty
  const alreadyCredited = item.invoiceHistory.reduce((sum, line) => sum + line.amount, 0)
  const breach = uptime < item.slaTarget
  const rawCredit = breach ? Math.min(item.mrc * 0.1, item.mrc) : 0
  let classification = breach ? "Credit owed" : "Excluded"
  let recoverableAmount = rawCredit

  if (alreadyCredited > 0) {
    classification = "Already credited"
    recoverableAmount = 0
  } else if (item.route === "excluded") {
    classification = "Excluded"
    recoverableAmount = 0
  } else if (confidence < 0.8) {
    classification = "Needs review"
    recoverableAmount = 0
  } else if (item.claimDaysLeft <= 3 && rawCredit > 0) {
    classification = "Deadline expiring"
  }

  return {
    counted,
    countedMinutes,
    uptime,
    breach,
    rawCredit,
    alreadyCredited,
    recoverableAmount,
    confidence,
    classification,
    confidenceTerms: {
      retrievalMatch,
      ambiguityResolution,
      billingCertainty,
      formula: "0.4 retrieval + 0.4 ambiguity + 0.2 billing",
    },
  }
}

export function allRows(): PortfolioRow[] {
  return [
    ...reclaimData.liveCases.map((item) => ({
      id: item.id,
      ban: item.ban,
      store: item.store,
      route: item.route,
      amount: creditForCase(item).recoverableAmount,
      live: true,
    })),
    ...reclaimData.portfolioRows.map(([id, ban, store, route, amount]) => ({
      id,
      ban,
      store,
      route,
      amount,
      live: false,
    })),
  ]
}

export function calculatedExposure() {
  return allRows().reduce((sum, row) => sum + row.amount, 0)
}

export function localTrace(item: LiveCase): TraceEvent[] {
  const credit = creditForCase(item)
  const needsExclusion = item.intervals.some((interval) => interval.tag === "scheduled maintenance" || interval.tag === "customer-caused")
  const hasPriorCredit = item.invoiceHistory.length > 0
  const events: TraceEvent[] = [
    {
      eventName: "plan.completed",
      kind: "model",
      title: "Planner selected route",
      status: item.route,
      detail: item.plannerHint,
      metric: `${item.id} / BAN ${item.ban} / ${item.claimDaysLeft} days left`,
    },
    {
      eventName: "outage_records.retrieved",
      kind: "retrieval",
      title: "Outage record matched",
      status: "source",
      detail: `Matched ${item.intervals[0].ticket} to ${item.id} and BAN ${item.ban}.`,
      metric: `${item.intervals.reduce((sum, row) => sum + row.minutes, 0)} raw outage minutes`,
    },
    {
      eventName: "uptime.calculated",
      kind: "tool",
      title: "Uptime calculated",
      status: "deterministic",
      detail: `Counted ${credit.countedMinutes} minutes against the ${item.invoiceMonth} SLA period.`,
      metric: `${formatPercent(credit.uptime)} actual vs ${item.slaTarget}% target`,
    },
    {
      eventName: "sla_tier.retrieved",
      kind: "retrieval",
      title: "SLA tier retrieved",
      status: "citation",
      detail: "Matched the availability tier and monthly recurring charge cap.",
      metric: "10% of MRC below 99.9% availability",
      citationIds: ["sla-tier"],
    },
  ]

  if (needsExclusion) {
    events.push({
      eventName: "exclusion_review.retrieved",
      kind: "retrieval",
      title: "Exclusion clause checked",
      status: credit.recoverableAmount > 0 ? "counts" : "excluded",
      detail: credit.counted[0].reason,
      metric: `${item.intervals[0].ticket}: ${item.intervals[0].minutes} minutes, ${item.intervals[0].tag}`,
      citationIds: ["maintenance-notice"],
    })
  } else {
    events.push({
      eventName: "exclusion_review.skipped",
      kind: "skip",
      title: "Exclusion retrieval skipped",
      status: "clean",
      detail: "No maintenance, force-majeure, or customer-caused interval was detected.",
      metric: "Planner skip recorded",
    })
  }

  events.push({
    eventName: "credit.calculated",
    kind: "tool",
    title: "Credit calculated",
    status: "deterministic",
    detail: "The dollar amount comes from counted downtime, SLA tier, MRC, billing history, and confidence threshold.",
    metric: `${formatCurrency(credit.recoverableAmount)} recoverable`,
  })

  if (hasPriorCredit) {
    events.push({
      eventName: "billing_crosscheck.retrieved",
      kind: "retrieval",
      title: "Prior credit found",
      status: "already credited",
      detail: "Invoice history shows a service credit for the same billing period.",
      metric: `${formatCurrency(credit.alreadyCredited)} already credited`,
      citationIds: ["invoice-credit"],
    })
  } else {
    events.push({
      eventName: "billing_crosscheck.skipped",
      kind: "skip",
      title: "Billing cross-check skipped",
      status: "clear",
      detail: "Complete invoice history has no prior-credit marker.",
      metric: "No double-count risk found",
    })
  }

  events.push(
    {
      eventName: "deadline.checked",
      kind: "tool",
      title: "Claim deadline checked",
      status: item.claimDaysLeft <= 3 ? "urgent" : "inside window",
      detail: `Claim window closes in ${item.claimDaysLeft} days for ${item.invoiceMonth}.`,
      metric: item.claimDaysLeft <= 3 ? "File now" : "Inside window",
      citationIds: ["claim-window"],
    },
    {
      eventName: "memo.assembled",
      kind: "memo",
      title: "Draft packet assembled",
      status: "ready",
      detail: "Memo includes account, circuit, ticket, citations, formula row, amount, and approval gate.",
      metric: "Ready for human review",
    },
  )

  return events
}

export function localMemo(item: LiveCase): ClaimMemo {
  const credit = creditForCase(item)
  const needsExclusion = item.intervals.some((interval) => interval.tag === "scheduled maintenance" || interval.tag === "customer-caused")
  return {
    caseId: item.id,
    store: item.store,
    carrier: item.carrier,
    ban: item.ban,
    circuit: item.id,
    invoiceMonth: item.invoiceMonth,
    mrc: item.mrc,
    tickets: item.intervals.map((row) => row.ticket),
    amount: credit.recoverableAmount,
    availability: `${formatPercent(credit.uptime)} actual vs ${item.slaTarget}% target`,
    exclusionDecision: credit.counted[0].reason,
    deadline: `${item.claimDaysLeft} days left to file`,
    confidenceLabel: `${credit.confidence.toFixed(2)} = ${credit.confidenceTerms.formula}`,
    classification: credit.classification,
    citations: {
      availability: "sla-tier",
      exclusion: needsExclusion ? "maintenance-notice" : undefined,
      deadline: "claim-window",
    },
  }
}

export function normalizeBackendEvent(event: Partial<TraceEvent> & Record<string, unknown>): TraceEvent {
  return {
    eventName: String(event.eventName || event.kind || "event"),
    kind: (event.kind as TraceEvent["kind"]) || "tool",
    title: String(event.title || event.eventName || "Trace event"),
    status: String(event.status || "recorded"),
    detail: String(event.detail || ""),
    metric: String(event.metric || ""),
    citationIds: Array.isArray(event.citationIds) ? event.citationIds.map(String) : [],
  }
}
