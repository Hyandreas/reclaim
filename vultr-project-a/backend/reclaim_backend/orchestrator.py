"""Deterministic Reclaim agent orchestration.

The "agent" here is intentionally bounded: planning chooses branches, retrieval
returns seeded citations, and all monetary/deadline/confidence outputs come
from deterministic tools.
"""

from __future__ import annotations

from typing import Any

from . import seed_data, storage


DEMO_EVENT_START = "2026-07-04T16:00"


class NotFoundError(Exception):
    """Raised when a requested case does not exist."""


class ApprovalError(Exception):
    """Raised when an approval request fails audit rules."""


def format_currency(value: float) -> str:
    if value == int(value):
        return f"${int(value):,}"
    return f"${value:,.2f}"


def format_percent(value: float) -> str:
    return f"{value:.2f}%"


def get_counted_intervals(item: dict[str, Any]) -> list[dict[str, Any]]:
    counted = []
    for interval in item["intervals"]:
        counts = True
        reason = "Carrier-responsible downtime counts against SLA."

        if (
            interval["tag"] == "scheduled maintenance"
            and interval["notice"] == "customer approved"
        ):
            counts = False
            reason = "Customer-approved maintenance is excluded."

        if interval["tag"] == "customer-caused" and interval["notice"] == "unclear":
            counts = False
            reason = "Conflicting evidence stays in human review."

        if (
            interval["tag"] == "scheduled maintenance"
            and interval["notice"] == "missing"
        ):
            counts = True
            reason = (
                "Maintenance label counts because required 5-day notice is missing."
            )

        enriched = dict(interval)
        enriched["counts"] = counts
        enriched["reason"] = reason
        counted.append(enriched)
    return counted


def uptime_calculator(item: dict[str, Any]) -> dict[str, Any]:
    counted = get_counted_intervals(item)
    counted_minutes = sum(row["minutes"] for row in counted if row["counts"])
    uptime = ((item["periodMinutes"] - counted_minutes) / item["periodMinutes"]) * 100
    return {
        "tool": "uptime_calculator",
        "counted": counted,
        "countedMinutes": counted_minutes,
        "periodMinutes": item["periodMinutes"],
        "uptime": uptime,
        "slaTarget": item["slaTarget"],
        "breach": uptime < item["slaTarget"],
    }


def confidence_calculator(item: dict[str, Any]) -> dict[str, Any]:
    terms = {
        "retrievalMatch": item["retrievalMatch"],
        "ambiguityResolution": item["ambiguityResolution"],
        "billingCertainty": item["billingCertainty"],
    }
    score = (
        0.4 * terms["retrievalMatch"]
        + 0.4 * terms["ambiguityResolution"]
        + 0.2 * terms["billingCertainty"]
    )
    return {
        "tool": "confidence_calculator",
        "terms": terms,
        "formula": (
            "0.4 * retrievalMatch + 0.4 * ambiguityResolution + "
            "0.2 * billingCertainty"
        ),
        "score": score,
        "threshold": 0.8,
        "passesThreshold": score >= 0.8,
    }


def billing_crosscheck(item: dict[str, Any]) -> dict[str, Any]:
    already_credited = sum(row["amount"] for row in item["invoiceHistory"])
    return {
        "tool": "billing_crosscheck",
        "alreadyCredited": already_credited,
        "invoiceLines": item["invoiceHistory"],
        "status": "prior_credit_found" if already_credited else "clear",
    }


def deadline_check(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "tool": "deadline_check",
        "claimDaysLeft": item["claimDaysLeft"],
        "status": "urgent" if item["claimDaysLeft"] <= 3 else "inside_window",
        "claimWindowDays": 30,
    }


def credit_calculator(item: dict[str, Any]) -> dict[str, Any]:
    uptime = uptime_calculator(item)
    confidence = confidence_calculator(item)
    billing = billing_crosscheck(item)
    breach = uptime["breach"]
    credit_percent = 0.1 if breach else 0
    raw_credit = min(item["mrc"] * credit_percent, item["mrc"])
    classification = "Credit owed" if breach else "Excluded"
    recoverable_amount = raw_credit

    if billing["alreadyCredited"] > 0:
        classification = "Already credited"
        recoverable_amount = 0
    elif item["route"] == "excluded":
        classification = "Excluded"
        recoverable_amount = 0
    elif confidence["score"] < confidence["threshold"]:
        classification = "Needs review"
        recoverable_amount = 0
    elif item["claimDaysLeft"] <= 3 and raw_credit > 0:
        classification = "Deadline expiring"

    return {
        "tool": "credit_calculator",
        "counted": uptime["counted"],
        "countedMinutes": uptime["countedMinutes"],
        "uptime": uptime["uptime"],
        "breach": breach,
        "creditPercent": credit_percent,
        "rawCredit": raw_credit,
        "alreadyCredited": billing["alreadyCredited"],
        "recoverableAmount": recoverable_amount,
        "confidence": confidence["score"],
        "confidenceTerms": confidence,
        "classification": classification,
    }


def planner(item: dict[str, Any]) -> dict[str, Any]:
    has_ambiguous = any(
        interval["tag"] in ("scheduled maintenance", "customer-caused")
        for interval in item["intervals"]
    )
    has_prior_credit = bool(item["invoiceHistory"])
    needs_review = item["route"] == "needs review"
    needs_billing = has_prior_credit or item["route"] == "already credited"
    needs_exclusion = has_ambiguous or needs_review
    selected_stages = [
        "retrieve outage records",
        "calculate uptime",
        "retrieve SLA tier",
        "retrieve exclusion clause"
        if needs_exclusion
        else "skip exclusion clause",
        "cross-check invoice history"
        if needs_billing
        else "skip invoice cross-check",
        "check filing deadline",
        "assemble memo",
    ]
    branch_decisions = {
        "needsExclusion": needs_exclusion,
        "needsBilling": needs_billing,
        "hasAmbiguousInterval": has_ambiguous,
        "hasPriorCredit": has_prior_credit,
        "skippedExclusionReason": None
        if needs_exclusion
        else "No maintenance, force-majeure, or customer-caused interval.",
        "skippedBillingReason": None
        if needs_billing
        else "No prior-credit marker in complete invoice history.",
    }
    return {
        "tool": "planner",
        "selectedStages": selected_stages,
        "evidenceNeeded": [
            item["id"],
            f"BAN {item['ban']}",
            f"MRC {format_currency(item['mrc'])}",
            f"Ticket {item['intervals'][0]['ticket']}",
            f"{item['claimDaysLeft']} days left",
        ],
        "rationale": item["plannerHint"],
        "stopCondition": (
            "Stop at Needs review if ambiguity remains unresolved."
            if needs_review
            else (
                "Stop when memo has amount, citations, confidence terms, "
                "and approval state."
            )
        ),
        "branchDecisions": branch_decisions,
    }


def build_trace(
    item: dict[str, Any],
    plan: dict[str, Any],
    credit: dict[str, Any],
) -> list[dict[str, Any]]:
    ticket_list = ", ".join(interval["ticket"] for interval in item["intervals"])
    stage_reason = " | ".join(plan["selectedStages"])
    events: list[dict[str, Any]] = [
        {
            "id": "plan",
            "kind": "model",
            "title": "Plan completed",
            "status": "strategy",
            "detail": f"{plan['rationale']} Selected stages: {stage_reason}.",
            "metric": " / ".join(plan["evidenceNeeded"]),
            "payload": {
                "selectedStages": plan["selectedStages"],
                "branchDecisions": plan["branchDecisions"],
            },
        },
        {
            "id": "retrieve-logs",
            "kind": "retrieval",
            "title": "Outage records retrieved",
            "status": "source",
            "detail": f"Matched {ticket_list} to {item['id']} and BAN {item['ban']}.",
            "metric": (
                f"{sum(interval['minutes'] for interval in item['intervals'])} "
                "raw outage minutes"
            ),
            "payload": {"tickets": [row["ticket"] for row in item["intervals"]]},
        },
        {
            "id": "uptime",
            "kind": "tool",
            "title": "Uptime calculated",
            "status": "deterministic",
            "detail": (
                "uptime_calculator counted "
                f"{credit['countedMinutes']} minutes against the "
                f"{item['invoiceMonth']} SLA period."
            ),
            "metric": (
                f"{format_percent(credit['uptime'])} actual vs "
                f"{item['slaTarget']}% target"
            ),
            "payload": {
                "tool": "uptime_calculator",
                "countedMinutes": credit["countedMinutes"],
                "uptime": credit["uptime"],
                "breach": credit["breach"],
            },
        },
        {
            "id": "tier",
            "kind": "retrieval",
            "title": "SLA tier retrieved",
            "status": "citation",
            "detail": (
                "Matched the availability tier and MRC cap from the MSA "
                "service-level exhibit."
            ),
            "metric": (
                f"{round(credit['creditPercent'] * 100)}% of MRC when monthly "
                "availability is below 99.9%"
            ),
            "citationIds": ["sla-tier"],
        },
    ]

    if plan["branchDecisions"]["needsExclusion"]:
        interval = credit["counted"][0]
        events.append(
            {
                "id": "exclusion",
                "kind": "retrieval",
                "title": "Exclusion clause retrieved",
                "status": "counts" if interval["counts"] else "excluded",
                "detail": interval["reason"],
                "metric": (
                    f"{interval['ticket']}: {interval['minutes']} minutes, "
                    f"{interval['tag']}"
                ),
                "citationIds": ["maintenance-notice"],
                "payload": {
                    "tool": "exclusion_classifier",
                    "interval": interval,
                },
            }
        )
    else:
        skipped = plan["branchDecisions"]["skippedExclusionReason"]
        events.append(
            {
                "id": "exclusion-skip",
                "kind": "skip",
                "title": "Exclusion review skipped",
                "status": "skipped",
                "detail": "Planner found no maintenance, force-majeure, or customer-caused interval.",
                "metric": "No second retrieval needed",
                "skippedReason": skipped,
            }
        )

    events.append(
        {
            "id": "credit",
            "kind": "tool",
            "title": "Credit recalculated",
            "status": "deterministic",
            "detail": (
                "credit_calculator used counted downtime, SLA tier, MRC, and "
                "cap. The model did not emit the dollar amount."
            ),
            "metric": f"{format_currency(credit['rawCredit'])} gross service credit",
            "payload": {
                "tool": "credit_calculator",
                "mrc": item["mrc"],
                "creditPercent": credit["creditPercent"],
                "rawCredit": credit["rawCredit"],
                "recoverableAmount": credit["recoverableAmount"],
            },
        }
    )

    if plan["branchDecisions"]["needsBilling"]:
        events.append(
            {
                "id": "billing",
                "kind": "tool",
                "title": "Invoice history cross-checked",
                "status": "safe",
                "detail": (
                    "billing_crosscheck found "
                    f"{format_currency(credit['alreadyCredited'])} already "
                    f"issued for {item['invoiceMonth']}."
                ),
                "metric": (
                    "Do not double count"
                    if credit["alreadyCredited"] > 0
                    else "No prior credit found"
                ),
                "citationIds": ["invoice-credit"]
                if credit["alreadyCredited"] > 0
                else [],
                "payload": {
                    "tool": "billing_crosscheck",
                    "alreadyCredited": credit["alreadyCredited"],
                    "invoiceHistory": item["invoiceHistory"],
                },
            }
        )
    else:
        skipped = plan["branchDecisions"]["skippedBillingReason"]
        events.append(
            {
                "id": "billing-skip",
                "kind": "skip",
                "title": "Billing cross-check skipped",
                "status": "skipped",
                "detail": "Planner found complete invoice history with no prior-credit markers.",
                "metric": "Skip reason recorded in audit trace",
                "skippedReason": skipped,
            }
        )

    deadline = deadline_check(item)
    events.extend(
        [
            {
                "id": "deadline",
                "kind": "tool",
                "title": "Claim deadline checked",
                "status": "urgent" if item["claimDaysLeft"] <= 3 else "clear",
                "detail": (
                    f"deadline_check calculated {item['claimDaysLeft']} days "
                    "left in the claim window."
                ),
                "metric": "File now" if item["claimDaysLeft"] <= 3 else "Inside claim window",
                "citationIds": ["claim-window"],
                "payload": deadline,
            },
            {
                "id": "decision",
                "kind": "decision",
                "title": "Case classified",
                "status": slug(credit["classification"]),
                "detail": (
                    f"classification = {credit['classification']}. "
                    "confidence_calculator returned "
                    f"{credit['confidence']:.2f}."
                ),
                "metric": f"{format_currency(credit['recoverableAmount'])} recoverable",
                "payload": {
                    "classification": credit["classification"],
                    "confidence": credit["confidence"],
                },
            },
            {
                "id": "memo",
                "kind": "memo",
                "title": "Memo assembled",
                "status": "ready",
                "detail": (
                    "memo_assembler created a carrier-ready packet with "
                    "account, circuit, ticket IDs, clause citations, amount, "
                    "and approval state."
                ),
                "metric": "Ready for human review",
                "payload": {"tool": "memo_assembler"},
            },
        ]
    )

    event_names = {
        "plan": "plan.completed",
        "retrieve-logs": "outage_records.retrieved",
        "uptime": "uptime.calculated",
        "tier": "sla_tier.retrieved",
        "exclusion": "exclusion_review.retrieved",
        "exclusion-skip": "exclusion_review.skipped",
        "credit": "credit.calculated",
        "billing": "billing_crosscheck.completed",
        "billing-skip": "billing_crosscheck.skipped",
        "deadline": "deadline.checked",
        "decision": "case.classified",
        "memo": "memo.assembled",
    }

    for seq, event in enumerate(events):
        event["seq"] = seq
        event["eventName"] = event_names.get(event["id"], event["id"])
        event["at"] = f"{DEMO_EVENT_START}:{seq:02d}.000Z"
        event.setdefault("citationIds", [])
    return events


def memo_assembler(
    item: dict[str, Any],
    plan: dict[str, Any],
    credit: dict[str, Any],
    events: list[dict[str, Any]],
    documents: dict[str, Any],
) -> dict[str, Any]:
    ticket_ids = [interval["ticket"] for interval in item["intervals"]]
    confidence_label = (
        f"{credit['confidence']:.2f} = 0.4 retrieval "
        f"({item['retrievalMatch']:.2f}) + 0.4 ambiguity "
        f"({item['ambiguityResolution']:.2f}) + 0.2 billing "
        f"({item['billingCertainty']:.2f})"
    )
    lines = [
        {
            "label": "Availability",
            "value": (
                f"{format_percent(credit['uptime'])} actual vs "
                f"{item['slaTarget']}% target"
            ),
            "citationIds": ["sla-tier"],
        },
        {
            "label": "Exclusion decision",
            "value": credit["counted"][0]["reason"],
            "citationIds": ["maintenance-notice"]
            if plan["branchDecisions"]["needsExclusion"]
            else [],
        },
        {
            "label": "Deadline",
            "value": f"{item['claimDaysLeft']} days left to file",
            "citationIds": ["claim-window"],
        },
        {
            "label": "Credit calculation",
            "value": (
                f"{format_currency(item['mrc'])} MRC x "
                f"{round(credit['creditPercent'] * 100)}% = "
                f"{format_currency(credit['rawCredit'])} gross"
            ),
            "citationIds": ["sla-tier"],
        },
        {
            "label": "Confidence",
            "value": confidence_label,
            "citationIds": [],
        },
        {
            "label": "Classification",
            "value": credit["classification"],
            "citationIds": [],
        },
    ]
    return {
        "memoId": f"memo-{item['id']}",
        "caseId": item["id"],
        "approvalState": "pending_human_review",
        "carrier": item["carrier"],
        "ban": item["ban"],
        "circuit": item["id"],
        "store": item["store"],
        "invoiceMonth": item["invoiceMonth"],
        "mrc": item["mrc"],
        "ticketIds": ticket_ids,
        "classification": credit["classification"],
        "recoverableAmount": credit["recoverableAmount"],
        "grossCredit": credit["rawCredit"],
        "alreadyCredited": credit["alreadyCredited"],
        "confidence": credit["confidence"],
        "confidenceTerms": credit["confidenceTerms"],
        "selectedStages": plan["selectedStages"],
        "branchDecisions": plan["branchDecisions"],
        "lines": lines,
        "citations": {
            doc_id: documents[doc_id]
            for doc_id in sorted({cid for line in lines for cid in line["citationIds"]})
            if doc_id in documents
        },
        "deterministicTools": [
            "uptime_calculator",
            "credit_calculator",
            "billing_crosscheck",
            "deadline_check",
            "confidence_calculator",
            "memo_assembler",
        ],
        "eventNames": [event["eventName"] for event in events],
    }


def run_case(
    case_id: str,
    run_id: str | None = None,
    requested_by: str = "local-demo",
    db_path: str | None = None,
) -> dict[str, Any]:
    item = storage.get_case_bundle(case_id, db_path)
    if item is None:
        raise NotFoundError(f"Unknown case id: {case_id}")

    owns_run = run_id is None
    run_id = run_id or storage.create_run([case_id], requested_by, db_path)
    docs = storage.documents_by_id(db_path)
    plan = planner(item)
    credit = credit_calculator(item)
    events = build_trace(item, plan, credit)
    memo = memo_assembler(item, plan, credit, events, docs)
    storage.save_case_result(run_id, case_id, plan, credit, events, memo, db_path)

    summary = {
        "runId": run_id,
        "caseId": case_id,
        "classification": credit["classification"],
        "recoverableAmount": credit["recoverableAmount"],
        "eventCount": len(events),
        "memo": memo,
        "events": events,
    }
    if owns_run:
        storage.complete_run(run_id, summary, db_path)
    return summary


def run_portfolio(
    case_ids: list[str] | None = None,
    requested_by: str = "local-demo",
    db_path: str | None = None,
) -> dict[str, Any]:
    case_ids = case_ids or [item["id"] for item in seed_data.LIVE_CASES]
    run_id = storage.create_run(case_ids, requested_by, db_path)
    results = []
    for case_id in case_ids:
        results.append(run_case(case_id, run_id=run_id, requested_by=requested_by, db_path=db_path))

    summary = {
        "runId": run_id,
        "caseIds": case_ids,
        "caseCount": len(results),
        "targetRecovery": seed_data.TARGET_RECOVERY,
        "liveRecoverableAmount": sum(item["recoverableAmount"] for item in results),
        "eventCount": sum(item["eventCount"] for item in results),
        "classifications": {
            item["caseId"]: item["classification"] for item in results
        },
    }
    storage.complete_run(run_id, summary, db_path)
    return {"runId": run_id, "summary": summary, "cases": results}


def ensure_case_run(case_id: str, db_path: str | None = None) -> None:
    if storage.get_events(case_id, db_path=db_path):
        return
    run_case(case_id, db_path=db_path)


def approval_blocker(memo: dict[str, Any]) -> str:
    if memo["confidence"] < 0.8:
        return "Confidence below 0.80 routes this case to Needs review."
    if memo["classification"] == "Already credited":
        return "Already credited cases cannot be approved for recovery."
    if memo["classification"] == "Excluded":
        return "Excluded cases require override, not approval."
    if memo["classification"] == "Needs review":
        return "Needs review cases require override, not approval."
    return ""


def record_approval(
    case_id: str,
    action: str,
    reason: str,
    approver: str = "local-reviewer",
    db_path: str | None = None,
) -> dict[str, Any]:
    if action not in {"approve", "override"}:
        raise ApprovalError("Action must be either 'approve' or 'override'.")
    if not reason.strip():
        raise ApprovalError("Typed reason required for the audit trail.")
    ensure_case_run(case_id, db_path)
    memo = storage.get_memo(case_id, db_path)
    if memo is None:
        raise NotFoundError(f"Unknown case id: {case_id}")
    blocker = approval_blocker(memo)
    if action == "approve" and blocker:
        raise ApprovalError(blocker)
    approval = storage.save_approval(
        case_id=case_id,
        action=action,
        reason=reason.strip(),
        approver=approver or "local-reviewer",
        memo=memo,
        db_path=db_path,
    )
    approval["memo"] = dict(memo)
    approval["memo"]["approvalState"] = "approved" if action == "approve" else "overridden"
    return approval


def slug(value: str) -> str:
    return "".join(ch if ch.isalnum() else "-" for ch in value.lower()).strip("-")

