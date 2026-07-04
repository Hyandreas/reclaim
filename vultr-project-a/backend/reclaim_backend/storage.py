"""SQLite persistence for the Reclaim local backend."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from . import seed_data


DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "reclaim.sqlite3"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect(db_path: str | os.PathLike[str] | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path or DEFAULT_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def session(db_path: str | os.PathLike[str] | None = None) -> Any:
    conn = connect(db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: str | os.PathLike[str] | None = None) -> None:
    with session(db_path) as conn:
        _create_schema(conn)
        document_count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        if document_count == 0:
            _seed(conn)


def _create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS documents (
          doc_id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          page TEXT NOT NULL,
          asset TEXT NOT NULL,
          excerpt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chunks (
          chunk_id TEXT PRIMARY KEY,
          doc_id TEXT NOT NULL REFERENCES documents(doc_id),
          section TEXT NOT NULL,
          page TEXT NOT NULL,
          clause_key TEXT NOT NULL,
          text TEXT NOT NULL,
          embedding_ref TEXT NOT NULL,
          highlight_asset_path TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS circuits (
          circuit_id TEXT PRIMARY KEY,
          ban TEXT NOT NULL,
          store_name TEXT NOT NULL,
          carrier TEXT NOT NULL,
          region TEXT NOT NULL,
          timezone TEXT NOT NULL,
          invoice_month TEXT NOT NULL,
          monthly_recurring_charge REAL NOT NULL,
          period_minutes INTEGER NOT NULL,
          sla_target REAL NOT NULL,
          claim_days_left INTEGER NOT NULL,
          route TEXT NOT NULL,
          planner_hint TEXT NOT NULL,
          retrieval_match REAL NOT NULL,
          ambiguity_resolution REAL NOT NULL,
          billing_certainty REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS outage_intervals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          circuit_id TEXT NOT NULL REFERENCES circuits(circuit_id),
          ticket_id TEXT NOT NULL,
          minutes INTEGER NOT NULL,
          tag TEXT NOT NULL,
          notice TEXT NOT NULL,
          raw_noc_notes TEXT NOT NULL,
          maintenance_notice_ref TEXT
        );

        CREATE TABLE IF NOT EXISTS invoice_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          circuit_id TEXT NOT NULL REFERENCES circuits(circuit_id),
          ban TEXT NOT NULL,
          period TEXT NOT NULL,
          line_item TEXT NOT NULL,
          mrc REAL NOT NULL,
          credit_amount REAL NOT NULL,
          credit_reason TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS portfolio_rows (
          circuit_id TEXT PRIMARY KEY,
          ban TEXT NOT NULL,
          store_name TEXT NOT NULL,
          route TEXT NOT NULL,
          amount REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cases (
          case_id TEXT PRIMARY KEY,
          plan_json TEXT,
          branch_decisions_json TEXT,
          classification TEXT,
          confidence_terms_json TEXT,
          memo_amount REAL,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS runs (
          run_id TEXT PRIMARY KEY,
          requested_by TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          summary_json TEXT
        );

        CREATE TABLE IF NOT EXISTS audit_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          run_id TEXT NOT NULL REFERENCES runs(run_id),
          case_id TEXT NOT NULL,
          seq INTEGER NOT NULL,
          event_name TEXT NOT NULL,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          detail TEXT NOT NULL,
          metric TEXT NOT NULL,
          citation_ids_json TEXT NOT NULL,
          skipped_reason TEXT,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_audit_events_case_run
          ON audit_events(case_id, run_id, seq);

        CREATE TABLE IF NOT EXISTS memos (
          case_id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL REFERENCES runs(run_id),
          memo_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS approvals (
          approval_id INTEGER PRIMARY KEY AUTOINCREMENT,
          case_id TEXT NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('approve', 'override')),
          reason TEXT NOT NULL,
          approver TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          memo_snapshot_json TEXT NOT NULL
        );
        """
    )


def _seed(conn: sqlite3.Connection) -> None:
    for doc_id, doc in seed_data.DOCUMENTS.items():
        conn.execute(
            """
            INSERT INTO documents (doc_id, title, page, asset, excerpt)
            VALUES (?, ?, ?, ?, ?)
            """,
            (doc_id, doc["title"], doc["page"], doc["asset"], doc["excerpt"]),
        )
        conn.execute(
            """
            INSERT INTO chunks (
              chunk_id, doc_id, section, page, clause_key, text,
              embedding_ref, highlight_asset_path
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"{doc_id}:chunk-001",
                doc_id,
                doc["title"].split(" - ")[-1],
                doc["page"],
                doc_id,
                doc["excerpt"],
                f"local://{seed_data.CORPUS_VERSION}/{doc_id}:chunk-001",
                doc["asset"],
            ),
        )

    for item in seed_data.LIVE_CASES:
        conn.execute(
            """
            INSERT INTO circuits (
              circuit_id, ban, store_name, carrier, region, timezone,
              invoice_month, monthly_recurring_charge, period_minutes,
              sla_target, claim_days_left, route, planner_hint,
              retrieval_match, ambiguity_resolution, billing_certainty
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["ban"],
                item["store"],
                item["carrier"],
                item["region"],
                item["timezone"],
                item["invoiceMonth"],
                item["mrc"],
                item["periodMinutes"],
                item["slaTarget"],
                item["claimDaysLeft"],
                item["route"],
                item["plannerHint"],
                item["retrievalMatch"],
                item["ambiguityResolution"],
                item["billingCertainty"],
            ),
        )
        conn.execute(
            """
            INSERT INTO cases (
              case_id, plan_json, branch_decisions_json, classification,
              confidence_terms_json, memo_amount, updated_at
            )
            VALUES (?, NULL, NULL, 'seeded', NULL, 0, ?)
            """,
            (item["id"], utc_now()),
        )
        for interval in item["intervals"]:
            conn.execute(
                """
                INSERT INTO outage_intervals (
                  circuit_id, ticket_id, minutes, tag, notice,
                  raw_noc_notes, maintenance_notice_ref
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    interval["ticket"],
                    interval["minutes"],
                    interval["tag"],
                    interval["notice"],
                    interval["notes"],
                    "maintenance-notice"
                    if interval["tag"] == "scheduled maintenance"
                    else None,
                ),
            )
        for invoice in item["invoiceHistory"]:
            conn.execute(
                """
                INSERT INTO invoice_history (
                  circuit_id, ban, period, line_item, mrc, credit_amount,
                  credit_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    item["ban"],
                    item["invoiceMonth"],
                    invoice["invoiceLine"],
                    item["mrc"],
                    invoice["amount"],
                    invoice["reason"],
                ),
            )

    conn.executemany(
        """
        INSERT INTO portfolio_rows (circuit_id, ban, store_name, route, amount)
        VALUES (?, ?, ?, ?, ?)
        """,
        seed_data.PORTFOLIO_ROWS,
    )


def db_counts(db_path: str | os.PathLike[str] | None = None) -> dict[str, int]:
    with session(db_path) as conn:
        return {
            "documents": conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
            "chunks": conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0],
            "live_cases": conn.execute("SELECT COUNT(*) FROM circuits").fetchone()[0],
            "portfolio_rows": conn.execute(
                "SELECT COUNT(*) FROM portfolio_rows"
            ).fetchone()[0],
            "audit_events": conn.execute(
                "SELECT COUNT(*) FROM audit_events"
            ).fetchone()[0],
            "approvals": conn.execute("SELECT COUNT(*) FROM approvals").fetchone()[0],
        }


def corpus(db_path: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    with session(db_path) as conn:
        docs = [_document_from_row(row) for row in conn.execute("SELECT * FROM documents")]
        chunks = [
            dict(row)
            for row in conn.execute("SELECT * FROM chunks ORDER BY chunk_id")
        ]
    return {
        "version": seed_data.CORPUS_VERSION,
        "documents": docs,
        "chunks": chunks,
    }


def documents_by_id(db_path: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    with session(db_path) as conn:
        rows = conn.execute("SELECT * FROM documents ORDER BY doc_id").fetchall()
    return {row["doc_id"]: _document_from_row(row) for row in rows}


def list_cases(db_path: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    with session(db_path) as conn:
        live = []
        for row in conn.execute(
            """
            SELECT c.*, cases.classification, cases.memo_amount
            FROM circuits c
            LEFT JOIN cases ON cases.case_id = c.circuit_id
            ORDER BY c.circuit_id
            """
        ):
            live.append(_circuit_summary(row))
        portfolio = [
            {
                "id": row["circuit_id"],
                "ban": row["ban"],
                "store": row["store_name"],
                "route": row["route"],
                "amount": row["amount"],
                "live": False,
            }
            for row in conn.execute("SELECT * FROM portfolio_rows ORDER BY amount DESC")
        ]
    return {
        "targetRecovery": seed_data.TARGET_RECOVERY,
        "liveCases": live,
        "portfolioRows": portfolio,
    }


def get_case_bundle(
    case_id: str, db_path: str | os.PathLike[str] | None = None
) -> dict[str, Any] | None:
    with session(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM circuits WHERE circuit_id = ?", (case_id,)
        ).fetchone()
        if row is None:
            return None
        intervals = [
            {
                "ticket": item["ticket_id"],
                "minutes": item["minutes"],
                "tag": item["tag"],
                "notice": item["notice"],
                "notes": item["raw_noc_notes"],
                "maintenanceNoticeRef": item["maintenance_notice_ref"],
            }
            for item in conn.execute(
                """
                SELECT * FROM outage_intervals
                WHERE circuit_id = ?
                ORDER BY id
                """,
                (case_id,),
            )
        ]
        invoices = [
            {
                "amount": item["credit_amount"],
                "reason": item["credit_reason"],
                "invoiceLine": item["line_item"],
            }
            for item in conn.execute(
                """
                SELECT * FROM invoice_history
                WHERE circuit_id = ?
                ORDER BY id
                """,
                (case_id,),
            )
        ]
    return {
        "id": row["circuit_id"],
        "ban": row["ban"],
        "store": row["store_name"],
        "carrier": row["carrier"],
        "region": row["region"],
        "timezone": row["timezone"],
        "invoiceMonth": row["invoice_month"],
        "mrc": row["monthly_recurring_charge"],
        "periodMinutes": row["period_minutes"],
        "slaTarget": row["sla_target"],
        "claimDaysLeft": row["claim_days_left"],
        "route": row["route"],
        "plannerHint": row["planner_hint"],
        "intervals": intervals,
        "invoiceHistory": invoices,
        "retrievalMatch": row["retrieval_match"],
        "ambiguityResolution": row["ambiguity_resolution"],
        "billingCertainty": row["billing_certainty"],
    }


def create_run(
    case_ids: Iterable[str],
    requested_by: str = "local-demo",
    db_path: str | os.PathLike[str] | None = None,
) -> str:
    del case_ids
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    with session(db_path) as conn:
        conn.execute(
            """
            INSERT INTO runs (run_id, requested_by, status, started_at)
            VALUES (?, ?, 'running', ?)
            """,
            (run_id, requested_by, utc_now()),
        )
    return run_id


def complete_run(
    run_id: str,
    summary: dict[str, Any],
    db_path: str | os.PathLike[str] | None = None,
) -> None:
    with session(db_path) as conn:
        conn.execute(
            """
            UPDATE runs
            SET status = 'completed', completed_at = ?, summary_json = ?
            WHERE run_id = ?
            """,
            (utc_now(), json.dumps(summary, sort_keys=True), run_id),
        )


def save_case_result(
    run_id: str,
    case_id: str,
    plan: dict[str, Any],
    credit: dict[str, Any],
    events: list[dict[str, Any]],
    memo: dict[str, Any],
    db_path: str | os.PathLike[str] | None = None,
) -> None:
    with session(db_path) as conn:
        conn.execute(
            """
            INSERT INTO cases (
              case_id, plan_json, branch_decisions_json, classification,
              confidence_terms_json, memo_amount, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(case_id) DO UPDATE SET
              plan_json = excluded.plan_json,
              branch_decisions_json = excluded.branch_decisions_json,
              classification = excluded.classification,
              confidence_terms_json = excluded.confidence_terms_json,
              memo_amount = excluded.memo_amount,
              updated_at = excluded.updated_at
            """,
            (
                case_id,
                json.dumps(plan, sort_keys=True),
                json.dumps(plan.get("branchDecisions", {}), sort_keys=True),
                credit["classification"],
                json.dumps(credit["confidenceTerms"], sort_keys=True),
                credit["recoverableAmount"],
                utc_now(),
            ),
        )
        for event in events:
            conn.execute(
                """
                INSERT INTO audit_events (
                  run_id, case_id, seq, event_name, kind, title, status,
                  detail, metric, citation_ids_json, skipped_reason,
                  payload_json, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    case_id,
                    event["seq"],
                    event["eventName"],
                    event["kind"],
                    event["title"],
                    event["status"],
                    event["detail"],
                    event["metric"],
                    json.dumps(event.get("citationIds", [])),
                    event.get("skippedReason"),
                    json.dumps(event, sort_keys=True),
                    utc_now(),
                ),
            )
        conn.execute(
            """
            INSERT INTO memos (case_id, run_id, memo_json, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(case_id) DO UPDATE SET
              run_id = excluded.run_id,
              memo_json = excluded.memo_json,
              created_at = excluded.created_at
            """,
            (case_id, run_id, json.dumps(memo, sort_keys=True), utc_now()),
        )


def latest_run_for_case(
    case_id: str, db_path: str | os.PathLike[str] | None = None
) -> str | None:
    with session(db_path) as conn:
        row = conn.execute(
            """
            SELECT run_id
            FROM audit_events
            WHERE case_id = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (case_id,),
        ).fetchone()
    return None if row is None else row["run_id"]


def get_events(
    case_id: str,
    run_id: str | None = None,
    db_path: str | os.PathLike[str] | None = None,
) -> list[dict[str, Any]]:
    run_id = run_id or latest_run_for_case(case_id, db_path)
    if run_id is None:
        return []
    with session(db_path) as conn:
        rows = conn.execute(
            """
            SELECT payload_json
            FROM audit_events
            WHERE case_id = ? AND run_id = ?
            ORDER BY seq
            """,
            (case_id, run_id),
        ).fetchall()
    return [json.loads(row["payload_json"]) for row in rows]


def get_memo(
    case_id: str, db_path: str | os.PathLike[str] | None = None
) -> dict[str, Any] | None:
    with session(db_path) as conn:
        row = conn.execute(
            "SELECT memo_json FROM memos WHERE case_id = ?", (case_id,)
        ).fetchone()
    return None if row is None else json.loads(row["memo_json"])


def save_approval(
    case_id: str,
    action: str,
    reason: str,
    approver: str,
    memo: dict[str, Any],
    db_path: str | os.PathLike[str] | None = None,
) -> dict[str, Any]:
    approval = {
        "caseId": case_id,
        "action": action,
        "reason": reason,
        "approver": approver,
        "timestamp": utc_now(),
    }
    with session(db_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO approvals (
              case_id, action, reason, approver, timestamp, memo_snapshot_json
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                case_id,
                action,
                reason,
                approver,
                approval["timestamp"],
                json.dumps(memo, sort_keys=True),
            ),
        )
        approval["approvalId"] = cursor.lastrowid
    return approval


def approvals(
    case_id: str | None = None, db_path: str | os.PathLike[str] | None = None
) -> list[dict[str, Any]]:
    sql = """
        SELECT approval_id, case_id, action, reason, approver, timestamp
        FROM approvals
    """
    params: tuple[Any, ...] = ()
    if case_id:
        sql += " WHERE case_id = ?"
        params = (case_id,)
    sql += " ORDER BY approval_id"
    with session(db_path) as conn:
        rows = conn.execute(sql, params).fetchall()
    return [
        {
            "approvalId": row["approval_id"],
            "caseId": row["case_id"],
            "action": row["action"],
            "reason": row["reason"],
            "approver": row["approver"],
            "timestamp": row["timestamp"],
        }
        for row in rows
    ]


def _document_from_row(row: sqlite3.Row) -> dict[str, str]:
    return {
        "id": row["doc_id"],
        "title": row["title"],
        "page": row["page"],
        "asset": row["asset"],
        "excerpt": row["excerpt"],
    }


def _circuit_summary(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["circuit_id"],
        "ban": row["ban"],
        "store": row["store_name"],
        "carrier": row["carrier"],
        "region": row["region"],
        "timezone": row["timezone"],
        "invoiceMonth": row["invoice_month"],
        "mrc": row["monthly_recurring_charge"],
        "periodMinutes": row["period_minutes"],
        "slaTarget": row["sla_target"],
        "claimDaysLeft": row["claim_days_left"],
        "route": row["route"],
        "classification": row["classification"],
        "memoAmount": row["memo_amount"],
        "live": True,
    }
