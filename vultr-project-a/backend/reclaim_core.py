from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "backend" / "var" / "reclaim.sqlite"
CORPUS_VERSION = "corpus-v7"
# TARGET_RECOVERY is the seed-design goal only; the live counter is computed
# from real case amounts (see computed_target_recovery). Never emitted as the counter.
TARGET_RECOVERY = 182400
# Queries used for real retrieval over the clause corpus.
TIER_QUERY = "monthly availability below 99.9% service credit recurring charge circuit"
EXCLUSION_QUERY = "scheduled maintenance excluded written notice business days approved window"


DOCUMENTS: dict[str, dict[str, Any]] = {
    "sla-tier": {
        "title": "Northstar Telecom MSA - Service Level Exhibit",
        "page": "Exhibit B, page 14",
        "asset": "assets/clause-sla-tier.svg",
        "excerpt": (
            "If monthly availability falls below 99.9% and is at least 99.0%, "
            "customer receives a credit equal to 10% of the monthly recurring "
            "charge for the affected circuit."
        ),
    },
    "maintenance-notice": {
        "title": "Northstar Telecom MSA - Maintenance Exclusions",
        "page": "Section 7.3, page 19",
        "asset": "assets/clause-maintenance-notice.svg",
        "excerpt": (
            "Scheduled maintenance is excluded only when carrier gives at least "
            "five business days of written notice and performs the work inside "
            "the approved window."
        ),
    },
    "claim-window": {
        "title": "Northstar Telecom MSA - Credit Claim Procedure",
        "page": "Section 9.1, page 22",
        "asset": "assets/clause-claim-window.svg",
        "excerpt": (
            "Customer must submit service-credit claims within thirty calendar "
            "days after the end of the billing month."
        ),
    },
    "invoice-credit": {
        "title": "Northstar Invoice Extract - BAN 77104",
        "page": "June 2026 invoice, line 44",
        "asset": "assets/clause-invoice-credit.svg",
        "excerpt": "SLA service credit, circuit CKT-DEN-031, applied for June billing period.",
    },
}


# Imported after DOCUMENTS so retrieval can pull the corpus without a cycle.
import env_config  # noqa: E402
import llm_planner  # noqa: E402
import retrieval  # noqa: E402


@lru_cache(maxsize=1)
def _tier_hit() -> dict[str, Any]:
    """Top retrieval hit for the SLA tier query (cached; shared by all cases)."""
    hits = retrieval.retrieve(TIER_QUERY, k=1)
    return hits[0] if hits else {"score": 0.0, "mode": "local-tfidf", "chunkId": None, "docId": None, "text": ""}


def tier_retrieval_match() -> float:
    """Real top tier-query score, clamped to 0..1 and rounded to 2 decimals."""
    return round(min(max(_tier_hit()["score"], 0.0), 1.0), 2)


LIVE_CASES: list[dict[str, Any]] = [
    {
        "id": "CKT-ATL-014",
        "ban": "88321",
        "store": "Atlanta Midtown",
        "carrier": "Northstar Telecom",
        "region": "Southeast",
        "timezone": "America/New_York",
        "invoiceMonth": "June 2026",
        "mrc": 3900,
        "periodMinutes": 43200,
        "slaTarget": 99.9,
        "claimDaysLeft": 3,
        "route": "deep review",
        "plannerHint": "1 scheduled-maintenance interval has no notice artifact. Billing history is complete.",
        "intervals": [
            {
                "ticket": "INC-10422",
                "minutes": 87,
                "tag": "scheduled maintenance",
                "notice": "missing",
                "notes": "Maintenance label present, but no 5-day pre-notice attached to the ticket.",
            }
        ],
        "invoiceHistory": [],
        "retrievalMatch": 0.93,
        "ambiguityResolution": 1,
        "billingCertainty": 1,
    },
    {
        "id": "CKT-SEA-009",
        "ban": "64018",
        "store": "Seattle Ballard",
        "carrier": "Northstar Telecom",
        "region": "Northwest",
        "timezone": "America/Los_Angeles",
        "invoiceMonth": "June 2026",
        "mrc": 38900,
        "periodMinutes": 43200,
        "slaTarget": 99.9,
        "claimDaysLeft": 18,
        "route": "clean",
        "plannerHint": "Unplanned outage tag, complete invoices, no exclusion terms implicated.",
        "intervals": [
            {
                "ticket": "INC-09611",
                "minutes": 64,
                "tag": "unplanned outage",
                "notice": "not applicable",
                "notes": "Fiber cut confirmed by carrier NOC. No maintenance or customer-caused markers.",
            }
        ],
        "invoiceHistory": [],
        "retrievalMatch": 0.91,
        "ambiguityResolution": 1,
        "billingCertainty": 1,
    },
    {
        "id": "CKT-DEN-031",
        "ban": "77104",
        "store": "Denver Cherry Creek",
        "carrier": "Northstar Telecom",
        "region": "Mountain",
        "timezone": "America/Denver",
        "invoiceMonth": "June 2026",
        "mrc": 18400,
        "periodMinutes": 43200,
        "slaTarget": 99.9,
        "claimDaysLeft": 11,
        "route": "already credited",
        "plannerHint": "Outage breached SLA, but invoice summary shows a prior June SLA credit.",
        "intervals": [
            {
                "ticket": "INC-10102",
                "minutes": 102,
                "tag": "unplanned outage",
                "notice": "not applicable",
                "notes": "Access aggregation outage acknowledged by carrier incident report.",
            }
        ],
        "invoiceHistory": [
            {"amount": 1840, "reason": "SLA service credit", "invoiceLine": "June invoice line 44"}
        ],
        "retrievalMatch": 0.89,
        "ambiguityResolution": 1,
        "billingCertainty": 1,
    },
    {
        "id": "CKT-PHX-022",
        "ban": "55290",
        "store": "Phoenix Camelback",
        "carrier": "Northstar Telecom",
        "region": "Southwest",
        "timezone": "America/Phoenix",
        "invoiceMonth": "June 2026",
        "mrc": 61200,
        "periodMinutes": 43200,
        "slaTarget": 99.9,
        "claimDaysLeft": 3,
        "route": "deadline",
        "plannerHint": "Clean SLA breach with claim window closing in 3 days.",
        "intervals": [
            {
                "ticket": "INC-10371",
                "minutes": 79,
                "tag": "unplanned outage",
                "notice": "not applicable",
                "notes": "Core router failure, no exclusion markers.",
            }
        ],
        "invoiceHistory": [],
        "retrievalMatch": 0.88,
        "ambiguityResolution": 1,
        "billingCertainty": 1,
    },
    {
        "id": "CKT-MIA-020",
        "ban": "44817",
        "store": "Miami Brickell",
        "carrier": "Northstar Telecom",
        "region": "Southeast",
        "timezone": "America/New_York",
        "invoiceMonth": "June 2026",
        "mrc": 21600,
        "periodMinutes": 43200,
        "slaTarget": 99.9,
        "claimDaysLeft": 16,
        "route": "excluded",
        "plannerHint": "Maintenance tag includes a customer-approved work order.",
        "intervals": [
            {
                "ticket": "INC-09988",
                "minutes": 141,
                "tag": "scheduled maintenance",
                "notice": "customer approved",
                "notes": "Customer approval CRQ-4417 attached. Work completed inside the approved window.",
            }
        ],
        "invoiceHistory": [],
        "retrievalMatch": 0.87,
        "ambiguityResolution": 1,
        "billingCertainty": 1,
    },
    {
        "id": "CKT-BOS-018",
        "ban": "90812",
        "store": "Boston Seaport",
        "carrier": "Northstar Telecom",
        "region": "Northeast",
        "timezone": "America/New_York",
        "invoiceMonth": "June 2026",
        "mrc": 47200,
        "periodMinutes": 43200,
        "slaTarget": 99.9,
        "claimDaysLeft": 9,
        "route": "needs review",
        "plannerHint": "Ticket notes conflict with invoice export; route to human review.",
        "intervals": [
            {
                "ticket": "INC-10015",
                "minutes": 55,
                "tag": "customer-caused",
                "notice": "unclear",
                "notes": "NOC marks customer power, store log says carrier handoff was down.",
            }
        ],
        "invoiceHistory": [],
        "retrievalMatch": 0.71,
        "ambiguityResolution": 0,
        "billingCertainty": 0.5,
    },
]


PORTFOLIO_ROWS = [
    ["CKT-NYC-044", "19902", "New York Herald Sq", "deadline", 17700],
    ["CKT-CHI-038", "25518", "Chicago Loop", "credit owed", 13600],
    ["CKT-LAX-017", "31170", "Los Angeles Fairfax", "credit owed", 12700],
    ["CKT-DAL-027", "41890", "Dallas Knox", "credit owed", 11800],
    ["CKT-SFO-011", "88140", "San Francisco Union", "deep review", 11500],
    ["CKT-AUS-006", "50731", "Austin Lamar", "credit owed", 10600],
    ["CKT-PDX-015", "77892", "Portland Pearl", "credit owed", 9500],
    ["CKT-MSP-010", "71990", "Minneapolis North", "already credited", 0],
    ["CKT-RDU-032", "61907", "Raleigh Cameron", "credit owed", 7500],
    ["CKT-ORL-013", "37190", "Orlando Park", "credit owed", 7100],
    ["CKT-SLC-005", "66011", "Salt Lake Central", "needs review", 0],
    ["CKT-SAN-008", "43310", "San Diego Mission", "credit owed", 6400],
    ["CKT-CLT-039", "98311", "Charlotte Tryon", "credit owed", 6100],
    ["CKT-DET-029", "99018", "Detroit Midtown", "credit owed", 5900],
    ["CKT-NASH-021", "27290", "Nashville Green", "credit owed", 5400],
    ["CKT-CMH-036", "55010", "Columbus Easton", "excluded", 0],
    ["CKT-SAT-004", "47300", "San Antonio River", "credit owed", 5000],
    ["CKT-PIT-012", "12871", "Pittsburgh Strip", "credit owed", 4500],
    ["CKT-LV-003", "81908", "Las Vegas Summerlin", "credit owed", 4000],
    ["CKT-KC-016", "73829", "Kansas City Plaza", "credit owed", 3700],
    ["CKT-IND-023", "89102", "Indianapolis North", "clean", 0],
    ["CKT-CLE-034", "36444", "Cleveland West", "credit owed", 3500],
    ["CKT-MKE-028", "74820", "Milwaukee Third Ward", "credit owed", 3300],
    ["CKT-RIC-019", "31808", "Richmond Short Pump", "credit owed", 3000],
    ["CKT-OMA-026", "64091", "Omaha Westroads", "credit owed", 2700],
    ["CKT-TUL-025", "54019", "Tulsa Woodland", "clean", 0],
    ["CKT-BOI-030", "11908", "Boise Towne", "credit owed", 2500],
    ["CKT-MEM-035", "20391", "Memphis Poplar", "credit owed", 2300],
    ["CKT-NOLA-041", "63392", "New Orleans Canal", "credit owed", 2200],
    ["CKT-HOU-033", "17290", "Houston Galleria", "deep review", 2000],
    ["CKT-CIN-024", "93111", "Cincinnati Hyde", "credit owed", 1900],
    ["CKT-ABQ-037", "70291", "Albuquerque Uptown", "credit owed", 1700],
    ["CKT-TUC-040", "60201", "Tucson Foothills", "clean", 0],
    ["CKT-OKC-045", "41098", "Oklahoma City Penn", "credit owed", 1400],
    ["CKT-JAX-046", "76019", "Jacksonville Town", "credit owed", 1300],
    ["CKT-BUF-047", "18290", "Buffalo Elmwood", "credit owed", 1200],
    ["CKT-FRES-048", "31099", "Fresno River", "excluded", 0],
]


def case_by_id(case_id: str) -> dict[str, Any]:
    for item in LIVE_CASES:
        if item["id"] == case_id:
            return item
    raise KeyError(case_id)


def format_currency(value: float) -> str:
    return f"${value:,.0f}" if value == int(value) else f"${value:,.2f}"


def format_percent(value: float) -> str:
    return f"{value:.2f}%"


def counted_intervals(case: dict[str, Any]) -> list[dict[str, Any]]:
    counted: list[dict[str, Any]] = []
    for interval in case["intervals"]:
        counts = True
        reason = "Carrier-responsible downtime counts against SLA."
        if interval["tag"] == "scheduled maintenance" and interval["notice"] == "customer approved":
            counts = False
            reason = "Customer-approved maintenance is excluded."
        if interval["tag"] == "customer-caused" and interval["notice"] == "unclear":
            counts = False
            reason = "Conflicting evidence stays in human review."
        if interval["tag"] == "scheduled maintenance" and interval["notice"] == "missing":
            counts = True
            reason = "Maintenance label counts because required 5-day notice is missing."
        counted.append({**interval, "counts": counts, "reason": reason})
    return counted


def credit_for_case(case: dict[str, Any]) -> dict[str, Any]:
    intervals = counted_intervals(case)
    counted_minutes = sum(item["minutes"] for item in intervals if item["counts"])
    uptime = ((case["periodMinutes"] - counted_minutes) / case["periodMinutes"]) * 100
    breach = uptime < case["slaTarget"]
    credit_percent = 0.1 if breach else 0
    gross_credit = round(min(case["mrc"] * credit_percent, case["mrc"]), 2)
    already_credited = sum(item["amount"] for item in case.get("invoiceHistory", []))
    # retrieval_match is the real top clause-retrieval score; the other two terms
    # stay seeded because they encode ticket/invoice data quality, not retrieval.
    retrieval_match = tier_retrieval_match()
    confidence = round(
        0.4 * retrieval_match
        + 0.4 * case["ambiguityResolution"]
        + 0.2 * case["billingCertainty"],
        2,
    )

    classification = "Credit owed" if breach else "Excluded"
    recoverable = gross_credit
    if already_credited > 0:
        classification = "Already credited"
        recoverable = 0
    elif case["route"] == "excluded":
        classification = "Excluded"
        recoverable = 0
    elif confidence < 0.8:
        classification = "Needs review"
        recoverable = 0
    elif case["claimDaysLeft"] <= 3 and gross_credit > 0:
        classification = "Deadline expiring"

    return {
        "countedIntervals": intervals,
        "countedMinutes": counted_minutes,
        "uptime": uptime,
        "breach": breach,
        "creditPercent": credit_percent,
        "grossCredit": gross_credit,
        "alreadyCredited": already_credited,
        "recoverableAmount": recoverable,
        "confidence": confidence,
        "classification": classification,
        "confidenceTerms": {
            "retrieval_match": retrieval_match,
            "ambiguity_resolution": case["ambiguityResolution"],
            "billing_certainty": case["billingCertainty"],
            "score": confidence,
            "threshold": 0.8,
            "formula": "0.4 * retrieval_match + 0.4 * ambiguity_resolution + 0.2 * billing_certainty",
        },
    }


def _bundle_for_case(case: dict[str, Any]) -> dict[str, Any]:
    """Evidence-only bundle for the planner. Excludes seed route/plannerHint."""
    return {
        "circuit": case["id"],
        "ban": case["ban"],
        "mrc": case["mrc"],
        "invoiceMonth": case["invoiceMonth"],
        "claimDaysLeft": case["claimDaysLeft"],
        "intervals": [
            {key: iv[key] for key in ("ticket", "minutes", "tag", "notice", "notes")}
            for iv in case["intervals"]
        ],
        "invoiceHistory": case.get("invoiceHistory", []),
    }


def plan_for_case(case: dict[str, Any]) -> dict[str, Any]:
    plan = llm_planner.plan_case(_bundle_for_case(case))
    needs_exclusion = plan["needsExclusion"]
    needs_billing = plan["needsBilling"]
    selected_stages = [
        "retrieve outage records",
        "calculate uptime",
        "retrieve SLA tier",
        "retrieve exclusion clause" if needs_exclusion else "skip exclusion clause",
        "cross-check invoice history" if needs_billing else "skip invoice cross-check",
        "check filing deadline",
        "assemble memo",
    ]
    return {
        "needsExclusion": needs_exclusion,
        "needsBilling": needs_billing,
        "selectedStages": selected_stages,
        "evidence": [
            case["id"],
            f"BAN {case['ban']}",
            f"MRC {format_currency(case['mrc'])}",
            f"Ticket {case['intervals'][0]['ticket']}",
            f"{case['claimDaysLeft']} days left",
        ],
        "rationale": plan["rationale"],
        "stopCondition": plan["stopCondition"],
        "plannerSource": plan["plannerSource"],
        "plannerModel": plan["plannerModel"],
        "rawResponse": plan["rawResponse"],
    }


def rail_events_for_case(case: dict[str, Any]) -> list[dict[str, Any]]:
    plan = plan_for_case(case)
    credit = credit_for_case(case)
    tier_hit = _tier_hit()
    ticket_list = ", ".join(item["ticket"] for item in case["intervals"])
    total_raw = sum(item["minutes"] for item in case["intervals"])
    stage_reason = " | ".join(plan["selectedStages"])
    events: list[dict[str, Any]] = [
        {
            "id": "plan",
            "kind": "model",
            "eventName": "plan.completed",
            "source": "planner",
            "title": "Plan completed",
            "status": "strategy",
            "detail": f"{plan['rationale']} Selected stages: {stage_reason}.",
            "metric": " / ".join(plan["evidence"]),
            "payload": {"plan": plan},
        },
        {
            "id": "retrieve-logs",
            "kind": "retrieval",
            "eventName": "outage_records.retrieved",
            "source": "retrieval",
            "title": "Outage records retrieved",
            "status": "source",
            "detail": f"Matched {ticket_list} to {case['id']} and BAN {case['ban']}.",
            "metric": f"{total_raw} raw outage minutes",
            "payload": {"tickets": [item["ticket"] for item in case["intervals"]]},
        },
        {
            "id": "uptime",
            "kind": "tool",
            "eventName": "uptime.calculated",
            "source": "tool",
            "title": "Uptime calculated",
            "status": "deterministic",
            "detail": (
                f"uptime_calculator counted {credit['countedMinutes']} minutes "
                f"against the {case['invoiceMonth']} SLA period."
            ),
            "metric": f"{format_percent(credit['uptime'])} actual vs {case['slaTarget']}% target",
            "payload": {"uptime": credit["uptime"], "countedMinutes": credit["countedMinutes"]},
        },
        {
            "id": "tier",
            "kind": "retrieval",
            "eventName": "sla_tier.retrieved",
            "source": "retrieval",
            "title": "SLA tier retrieved",
            "status": "citation",
            "detail": "Matched the availability tier and MRC cap from the MSA service-level exhibit.",
            "metric": (
                f"{round(credit['creditPercent'] * 100)}% of MRC when monthly availability is "
                f"below 99.9% (retrieval top score {tier_hit['score']} via {tier_hit['mode']})"
            ),
            "citationIds": ["sla-tier"],
            "payload": {
                "document": DOCUMENTS["sla-tier"],
                "retrieval": {
                    "query": TIER_QUERY,
                    "topScore": tier_hit["score"],
                    "mode": tier_hit["mode"],
                    "chunkId": tier_hit["chunkId"],
                },
            },
        },
    ]

    if plan["needsExclusion"]:
        interval = credit["countedIntervals"][0]
        exclusion_hit = retrieval.retrieve(EXCLUSION_QUERY, k=1)
        exclusion_top = exclusion_hit[0] if exclusion_hit else {"score": 0.0, "mode": "local-tfidf", "chunkId": None}
        events.append(
            {
                "id": "exclusion",
                "kind": "retrieval",
                "eventName": "exclusion_review.retrieved",
                "source": "retrieval",
                "title": "Exclusion clause retrieved",
                "status": "counts" if interval["counts"] else "excluded",
                "detail": interval["reason"],
                "metric": (
                    f"{interval['ticket']}: {interval['minutes']} minutes, {interval['tag']} "
                    f"(retrieval top score {exclusion_top['score']} via {exclusion_top['mode']})"
                ),
                "citationIds": ["maintenance-notice"],
                "payload": {
                    "interval": interval,
                    "document": DOCUMENTS["maintenance-notice"],
                    "retrieval": {
                        "query": EXCLUSION_QUERY,
                        "topScore": exclusion_top["score"],
                        "mode": exclusion_top["mode"],
                        "chunkId": exclusion_top["chunkId"],
                    },
                },
            }
        )
    else:
        events.append(
            {
                "id": "exclusion-skip",
                "kind": "skip",
                "eventName": "exclusion_review.skipped",
                "source": "planner",
                "title": "Exclusion review skipped",
                "status": "skipped",
                "detail": "Planner found no maintenance, force-majeure, or customer-caused interval.",
                "metric": "No second retrieval needed",
                "payload": {"skippedReason": "no ambiguous downtime interval"},
            }
        )

    events.append(
        {
            "id": "credit",
            "kind": "tool",
            "eventName": "credit.calculated",
            "source": "tool",
            "title": "Credit recalculated",
            "status": "deterministic",
            "detail": "credit_calculator used counted downtime, SLA tier, MRC, and cap. The model did not emit the dollar amount.",
            "metric": f"{format_currency(credit['grossCredit'])} gross service credit",
            "payload": {
                "mrc": case["mrc"],
                "creditPercent": credit["creditPercent"],
                "grossCredit": credit["grossCredit"],
                "recoverableAmount": credit["recoverableAmount"],
            },
        }
    )

    if plan["needsBilling"]:
        already = credit["alreadyCredited"]
        events.append(
            {
                "id": "billing",
                "kind": "tool",
                "eventName": "billing_crosscheck.completed",
                "source": "tool",
                "title": "Invoice history cross-checked",
                "status": "safe",
                "detail": f"billing_crosscheck found {format_currency(already)} already issued for {case['invoiceMonth']}.",
                "metric": "Do not double count" if already > 0 else "No prior credit found",
                "citationIds": ["invoice-credit"] if already > 0 else [],
                "payload": {"alreadyCredited": already},
            }
        )
    else:
        events.append(
            {
                "id": "billing-skip",
                "kind": "skip",
                "eventName": "billing_crosscheck.skipped",
                "source": "planner",
                "title": "Billing cross-check skipped",
                "status": "skipped",
                "detail": "Planner found complete invoice history with no prior-credit markers.",
                "metric": "Skip reason recorded in audit trace",
                "payload": {"skippedReason": "no prior-credit marker"},
            }
        )

    events.extend(
        [
            {
                "id": "deadline",
                "kind": "tool",
                "eventName": "deadline.checked",
                "source": "tool",
                "title": "Claim deadline checked",
                "status": "urgent" if case["claimDaysLeft"] <= 3 else "clear",
                "detail": f"deadline_check calculated {case['claimDaysLeft']} days left in the claim window.",
                "metric": "File now" if case["claimDaysLeft"] <= 3 else "Inside claim window",
                "citationIds": ["claim-window"],
                "payload": {"daysLeft": case["claimDaysLeft"]},
            },
            {
                "id": "decision",
                "kind": "decision",
                "eventName": "case.classified",
                "source": "classifier",
                "title": "Case classified",
                "status": credit["classification"].lower().replace(" ", "-"),
                "detail": f"classification = {credit['classification']}. confidence_calculator returned {credit['confidence']:.2f}.",
                "metric": f"{format_currency(credit['recoverableAmount'])} recoverable",
                "payload": {"classification": credit["classification"], "confidence": credit["confidence"]},
            },
            {
                "id": "memo",
                "kind": "memo",
                "eventName": "memo.assembled",
                "source": "memo",
                "title": "Memo assembled",
                "status": "ready",
                "detail": "memo_assembler created a carrier-ready packet with account, circuit, ticket IDs, clause citations, amount, and approval state.",
                "metric": "Ready for human review",
                "payload": {"memoId": f"memo-{case['id']}"},
            },
        ]
    )

    stamped: list[dict[str, Any]] = []
    for seq, event in enumerate(events):
        stamped.append(
            {
                "caseId": case["id"],
                "seq": seq,
                "at": datetime.now(timezone.utc).isoformat(),
                "citationIds": [],
                **event,
            }
        )
    return stamped


def memo_for_case(case: dict[str, Any], include_live_trace: bool = True) -> dict[str, Any]:
    credit = credit_for_case(case)
    events = rail_events_for_case(case) if include_live_trace else []
    needs_exclusion = any(
        interval["tag"] in {"scheduled maintenance", "customer-caused"}
        for interval in case["intervals"]
    )
    citations = []
    for citation_id in ["sla-tier", "maintenance-notice", "claim-window"]:
        if citation_id == "maintenance-notice" and not needs_exclusion:
            continue
        citations.append({"citationId": citation_id, **DOCUMENTS[citation_id]})
    if credit["alreadyCredited"] > 0:
        citations.append({"citationId": "invoice-credit", **DOCUMENTS["invoice-credit"]})
    return {
        "memoId": f"memo-{case['id']}",
        "caseId": case["id"],
        "classification": credit["classification"],
        "customer": "Northstar Retail Group",
        "carrier": case["carrier"],
        "ban": case["ban"],
        "circuitId": case["id"],
        "storeName": case["store"],
        "invoiceMonth": case["invoiceMonth"],
        "ticketIds": [item["ticket"] for item in case["intervals"]],
        "countedDowntimeMinutes": credit["countedMinutes"],
        "slaTargetPct": case["slaTarget"],
        "actualUptimePct": credit["uptime"],
        "creditFormula": {
            "mrc": case["mrc"],
            "creditPct": credit["creditPercent"],
            "grossCredit": credit["grossCredit"],
            "cap": case["mrc"],
            "priorCredit": credit["alreadyCredited"],
            "recoverableCredit": credit["recoverableAmount"],
        },
        "filingDeadline": f"{case['claimDaysLeft']} days left",
        "daysLeft": case["claimDaysLeft"],
        "citations": citations,
        "confidence": credit["confidenceTerms"],
        "auditEventIds": [event["eventName"] for event in events],
        "approval": None,
    }


def computed_target_recovery() -> float:
    """Live counter value: sum of live-case recoverable + preprocessed row amounts."""
    live = sum(credit_for_case(item)["recoverableAmount"] for item in LIVE_CASES)
    preprocessed = sum(row[4] for row in PORTFOLIO_ROWS)
    return live + preprocessed


def portfolio() -> dict[str, Any]:
    live_rows = []
    for item in LIVE_CASES:
        credit = credit_for_case(item)
        live_rows.append(
            {
                "id": item["id"],
                "ban": item["ban"],
                "store": item["store"],
                "route": item["route"],
                "amount": credit["recoverableAmount"],
                "classification": credit["classification"],
                "live": True,
            }
        )
    preprocessed = [
        {
            "id": row[0],
            "ban": row[1],
            "store": row[2],
            "route": row[3],
            "amount": row[4],
            "classification": row[3].title(),
            "live": False,
        }
        for row in PORTFOLIO_ROWS
    ]
    return {
        "targetRecovery": computed_target_recovery(),
        "corpusVersion": CORPUS_VERSION,
        "retrievalMode": retrieval.mode_info()["mode"],
        "documents": DOCUMENTS,
        "liveCaseIds": [item["id"] for item in LIVE_CASES],
        "cases": live_rows + preprocessed,
    }


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.executescript(
            """
            create table if not exists runs (
              run_id text primary key,
              created_at text not null,
              status text not null
            );
            create table if not exists cases (
              case_id text primary key,
              payload text not null,
              memo text not null
            );
            create table if not exists audit_events (
              id integer primary key autoincrement,
              run_id text,
              case_id text,
              seq integer,
              event_name text,
              payload text not null
            );
            create table if not exists approvals (
              id integer primary key autoincrement,
              case_id text not null,
              action text not null,
              reason text not null,
              created_at text not null,
              payload text not null
            );
            """
        )
        for case in LIVE_CASES:
            conn.execute(
                """
                insert into cases(case_id, payload, memo)
                values(?, ?, ?)
                on conflict(case_id) do update set payload = excluded.payload, memo = excluded.memo
                """,
                (case["id"], json.dumps(case), json.dumps(memo_for_case(case, include_live_trace=False))),
            )


def persist_run() -> str:
    init_db()
    run_id = uuid.uuid4().hex
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "insert into runs(run_id, created_at, status) values(?, ?, ?)",
            (run_id, datetime.now(timezone.utc).isoformat(), "running"),
        )
        conn.execute("delete from audit_events where run_id = ?", (run_id,))
        seq = 0
        for case in LIVE_CASES:
            for event in rail_events_for_case(case):
                conn.execute(
                    """
                    insert into audit_events(run_id, case_id, seq, event_name, payload)
                    values(?, ?, ?, ?, ?)
                    """,
                    (run_id, case["id"], seq, event["eventName"], json.dumps(event)),
                )
                seq += 1
    return run_id


def persist_run_for_case(case_id: str) -> str:
    """Persist a run for ONE case only (used by POST /cases/{id}/run)."""
    init_db()
    case = case_by_id(case_id)  # raises KeyError -> 404 for unknown case
    run_id = uuid.uuid4().hex
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "insert into runs(run_id, created_at, status) values(?, ?, ?)",
            (run_id, datetime.now(timezone.utc).isoformat(), "running"),
        )
        conn.execute("delete from audit_events where run_id = ?", (run_id,))
        for seq, event in enumerate(rail_events_for_case(case)):
            conn.execute(
                """
                insert into audit_events(run_id, case_id, seq, event_name, payload)
                values(?, ?, ?, ?, ?)
                """,
                (run_id, case["id"], seq, event["eventName"], json.dumps(event)),
            )
    return run_id


def health_payload() -> dict[str, Any]:
    """Real backend state for /health - no false 'live' claims when keys are absent."""
    planner = llm_planner.probe_planner()
    retrieval_mode = retrieval.mode_info()
    return {
        "ok": True,
        "service": "reclaim",
        "database": "sqlite",
        "corpusVersion": CORPUS_VERSION,
        "planner": {"mode": planner["mode"], "model": planner["model"], "live": planner["live"]},
        "retrieval": {"mode": retrieval_mode["mode"], "live": retrieval_mode["live"]},
        "deployment": env_config.get("DEPLOYMENT_MODE", "local"),
        "targetRecovery": computed_target_recovery(),
    }


def stored_events_for_case(case_id: str) -> list[dict[str, Any]]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        latest = conn.execute(
            """
            select run_id from audit_events
            where case_id = ?
            order by id desc
            limit 1
            """,
            (case_id,),
        ).fetchone()
        if not latest:
            return rail_events_for_case(case_by_id(case_id))
        rows = conn.execute(
            """
            select payload from audit_events
            where case_id = ? and run_id = ?
            order by seq, id
            """,
            (case_id, latest[0]),
        ).fetchall()
    return [json.loads(row[0]) for row in rows]


def stored_memo(case_id: str) -> dict[str, Any]:
    init_db()
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute("select memo from cases where case_id = ?", (case_id,)).fetchone()
        approval = conn.execute(
            "select payload from approvals where case_id = ? order by id desc limit 1",
            (case_id,),
        ).fetchone()
    memo = json.loads(row[0]) if row else memo_for_case(case_by_id(case_id))
    if approval:
        memo["approval"] = json.loads(approval[0])
    return memo


def record_approval(case_id: str, action: str, reason: str) -> dict[str, Any]:
    if action not in {"approve", "override"}:
        raise ValueError("action must be approve or override")
    if not reason.strip():
        raise ValueError("reason is required")
    memo = stored_memo(case_id)
    classification = memo["classification"]
    score = memo["confidence"]["score"]
    if action == "approve" and (score < 0.8 or classification in {"Already credited", "Excluded", "Needs review"}):
        raise ValueError(f"{classification} cannot be approved; use override with a typed reason")
    payload = {
        "caseId": case_id,
        "action": action,
        "reason": reason.strip(),
        "approver": "Priya Shah",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "eventName": "human_approval.recorded",
    }
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            insert into approvals(case_id, action, reason, created_at, payload)
            values(?, ?, ?, ?, ?)
            """,
            (case_id, action, reason.strip(), payload["timestamp"], json.dumps(payload)),
        )
    return payload


def stream_messages_for_run(run_id: str) -> list[dict[str, Any]]:
    atl = case_by_id("CKT-ATL-014")
    target = computed_target_recovery()
    messages: list[dict[str, Any]] = [
        {"type": "run.started", "runId": run_id, "targetRecovery": target},
        {"type": "proof.active", "index": 0},
        {"type": "case.status", "caseId": "CKT-SEA-009", "status": "skip - clean"},
        {"type": "proof.active", "index": 1},
        {"type": "active.case", "caseId": atl["id"]},
        {"type": "case.status", "caseId": atl["id"], "status": "deep review"},
    ]
    for event in rail_events_for_case(atl):
        messages.append({"type": "rail.event", "caseId": atl["id"], "event": event})
    messages.extend(
        [
            {"type": "memo.ready", "caseId": atl["id"], "memo": memo_for_case(atl)},
            {"type": "proof.active", "index": 2},
            {"type": "case.status", "caseId": "CKT-DEN-031", "status": "already credited"},
            {"type": "case.status", "caseId": "CKT-PHX-022", "status": "deadline expiring"},
            {"type": "case.status", "caseId": "CKT-MIA-020", "status": "excluded"},
            {"type": "case.status", "caseId": "CKT-BOS-018", "status": "needs review"},
            {"type": "counter.update", "amount": target},
            {"type": "run.completed", "runId": run_id, "amount": target},
        ]
    )
    return messages
