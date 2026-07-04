"""HTTP route layer for the stdlib Reclaim backend."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urlparse

from . import orchestrator, seed_data, storage


JSON_HEADERS = {"Content-Type": "application/json; charset=utf-8"}
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
}


@dataclass
class ApiResponse:
    status: int
    headers: dict[str, str]
    body: bytes = b""
    stream_chunks: list[bytes] = field(default_factory=list)
    stream_delay_ms: int = 0

    def with_cors(self) -> "ApiResponse":
        self.headers = {**self.headers, **CORS_HEADERS}
        return self

    def body_bytes(self) -> bytes:
        if self.stream_chunks:
            return b"".join(self.stream_chunks)
        return self.body


class ReclaimAPI:
    def __init__(self, db_path: str | None = None) -> None:
        self.db_path = db_path
        storage.init_db(db_path)

    def handle(
        self,
        method: str,
        raw_path: str,
        body: bytes = b"",
        headers: dict[str, str] | None = None,
    ) -> ApiResponse:
        del headers
        method = method.upper()
        parsed = urlparse(raw_path)
        path = parsed.path.rstrip("/") or "/"
        query = parse_qs(parsed.query)

        if method == "OPTIONS":
            return ApiResponse(204, {}).with_cors()

        try:
            if method == "GET" and path == "/health":
                return self._json(self.health())
            if method == "GET" and path == "/cases":
                return self._json(storage.list_cases(self.db_path))
            if method == "GET" and path == "/corpus":
                return self._json(storage.corpus(self.db_path))
            if method == "GET" and path == "/approvals":
                case_id = query.get("caseId", [None])[0]
                return self._json({"approvals": storage.approvals(case_id, self.db_path)})
            if method == "POST" and path == "/run-portfolio":
                payload = self._body_json(body)
                result = orchestrator.run_portfolio(
                    case_ids=payload.get("caseIds"),
                    requested_by=payload.get("requestedBy", "local-demo"),
                    db_path=self.db_path,
                )
                return self._json(result, 201)

            case_route = self._case_route(path)
            if case_route:
                case_id, suffix = case_route
                return self._handle_case_route(method, case_id, suffix, body, query)

            return self._json({"error": "not_found", "message": "Route not found."}, 404)
        except orchestrator.NotFoundError as exc:
            return self._json({"error": "not_found", "message": str(exc)}, 404)
        except orchestrator.ApprovalError as exc:
            return self._json({"error": "approval_rejected", "message": str(exc)}, 422)
        except ValueError as exc:
            return self._json({"error": "bad_request", "message": str(exc)}, 400)

    def health(self) -> dict[str, Any]:
        counts = storage.db_counts(self.db_path)
        db_path = os.path.abspath(str(self.db_path or storage.DEFAULT_DB_PATH))
        return {
            "status": "ok",
            "api": {
                "name": "reclaim-local-backend",
                "version": "0.1.0",
                "runtime": "python-stdlib",
            },
            "database": {
                "status": "ok",
                "engine": "sqlite",
                "path": db_path,
                "counts": counts,
            },
            "retrievalIndex": {
                "status": "ok",
                "mode": "local-seeded-corpus",
                "corpusVersion": seed_data.CORPUS_VERSION,
                "chunkCount": counts["chunks"],
            },
            "objectStore": {
                "status": "local",
                "bucket": "app/assets",
                "note": "Vultr Object Storage adapter placeholder for local demo.",
            },
            "deployment": {
                "mode": os.environ.get("RECLAIM_DEPLOY_MODE", "local"),
                "providerTarget": "vultr-cloud-compute",
            },
        }

    def _handle_case_route(
        self,
        method: str,
        case_id: str,
        suffix: str,
        body: bytes,
        query: dict[str, list[str]],
    ) -> ApiResponse:
        if method == "POST" and suffix == "run":
            payload = self._body_json(body)
            result = orchestrator.run_case(
                case_id=case_id,
                requested_by=payload.get("requestedBy", "local-demo"),
                db_path=self.db_path,
            )
            return self._json(result, 201)

        if method == "GET" and suffix == "events":
            orchestrator.ensure_case_run(case_id, self.db_path)
            events = storage.get_events(
                case_id=case_id,
                run_id=query.get("runId", [None])[0],
                db_path=self.db_path,
            )
            delay_ms = int(query.get("delayMs", ["0"])[0])
            return self._sse(case_id, events, delay_ms)

        if method == "GET" and suffix == "memo":
            orchestrator.ensure_case_run(case_id, self.db_path)
            memo = storage.get_memo(case_id, self.db_path)
            if memo is None:
                raise orchestrator.NotFoundError(f"Unknown case id: {case_id}")
            return self._json(memo)

        if method == "POST" and suffix == "approve":
            payload = self._body_json(body)
            approval = orchestrator.record_approval(
                case_id=case_id,
                action=payload.get("action", "approve"),
                reason=payload.get("reason", ""),
                approver=payload.get("approver", "local-reviewer"),
                db_path=self.db_path,
            )
            return self._json(approval, 201)

        if method == "GET" and suffix == "approvals":
            return self._json({"approvals": storage.approvals(case_id, self.db_path)})

        return self._json({"error": "not_found", "message": "Route not found."}, 404)

    def _json(self, payload: dict[str, Any], status: int = 200) -> ApiResponse:
        return ApiResponse(
            status=status,
            headers=JSON_HEADERS.copy(),
            body=json.dumps(payload, indent=2, sort_keys=True).encode("utf-8"),
        ).with_cors()

    def _sse(
        self, case_id: str, events: list[dict[str, Any]], delay_ms: int = 0
    ) -> ApiResponse:
        chunks = [sse_comment(f"reclaim stream for {case_id}")]
        for event in events:
            chunks.append(sse_event(event["eventName"], event, event_id=str(event["seq"])))
        chunks.append(
            sse_event(
                "stream.closed",
                {"caseId": case_id, "eventCount": len(events)},
                event_id=str(len(events)),
            )
        )
        return ApiResponse(
            status=200,
            headers={
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "close",
            },
            stream_chunks=chunks,
            stream_delay_ms=delay_ms,
        ).with_cors()

    def _body_json(self, body: bytes) -> dict[str, Any]:
        if not body:
            return {}
        try:
            parsed = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON body: {exc.msg}") from exc
        if not isinstance(parsed, dict):
            raise ValueError("JSON body must be an object.")
        return parsed

    def _case_route(self, path: str) -> tuple[str, str] | None:
        parts = [part for part in path.split("/") if part]
        if len(parts) != 3 or parts[0] != "cases":
            return None
        return parts[1], parts[2]


def sse_comment(message: str) -> bytes:
    return f": {message}\n\n".encode("utf-8")


def sse_event(event_name: str, payload: dict[str, Any], event_id: str | None = None) -> bytes:
    lines = []
    if event_id is not None:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event_name}")
    data = json.dumps(payload, sort_keys=True)
    for line in data.splitlines():
        lines.append(f"data: {line}")
    lines.append("")
    lines.append("")
    return "\n".join(lines).encode("utf-8")
