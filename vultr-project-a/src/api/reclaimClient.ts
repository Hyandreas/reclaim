import type { ApprovalRecord, ClaimMemo, HealthSnapshot, TraceEvent } from "@/lib/reclaim"

export const API_BASE =
  (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ||
  (window.location.port === "8765" ? "" : "http://127.0.0.1:8765")

export function apiUrl(path: string) {
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

export function getHealth() {
  return requestJson<Record<string, unknown>>("/health")
}

export function runCase(caseId: string) {
  return requestJson<{ caseId: string; runId: string; eventsUrl: string }>(`/cases/${encodeURIComponent(caseId)}/run`, {
    method: "POST",
    body: JSON.stringify({ requestedBy: "submission-review" }),
  })
}

export function getCaseEvents(caseId: string) {
  return requestJson<{ caseId: string; events?: TraceEvent[] }>(`/api/cases/${encodeURIComponent(caseId)}/events`)
}

export function getCaseMemo(caseId: string) {
  return requestJson<Partial<ClaimMemo>>(`/api/cases/${encodeURIComponent(caseId)}/memo`)
}

export function approveCase(caseId: string, action: ApprovalRecord["action"], reason: string) {
  return requestJson<ApprovalRecord>(`/cases/${encodeURIComponent(caseId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ action, reason }),
  })
}

export type SystemSnapshot = HealthSnapshot & {
  apiBase: string
}
