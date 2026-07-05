from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import time
from urllib.parse import parse_qs, unquote, urlparse

from reclaim_core import (
    CORPUS_VERSION,
    DOCUMENTS,
    TARGET_RECOVERY,
    init_db,
    persist_run,
    portfolio,
    record_approval,
    stored_events_for_case,
    stored_memo,
    stream_messages_for_run,
)
from reclaim_keys import integration_status


class ReclaimHandler(BaseHTTPRequestHandler):
    server_version = "ReclaimHTTP/1.0"

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        try:
            if path in {"/api/health", "/health"}:
                integrations = integration_status()
                self.write_json(
                    {
                        "ok": True,
                        "service": "reclaim",
                        "database": "sqlite",
                        "corpusVersion": CORPUS_VERSION,
                        "retrievalMode": "local deterministic vector mirror",
                        "objectStore": "local object-storage mirror",
                        "targetRecovery": TARGET_RECOVERY,
                        "integrations": integrations["summary"],
                    }
                )
            elif path in {"/api/integrations", "/integrations"}:
                self.write_json(integration_status())
            elif path in {"/api/portfolio", "/portfolio"}:
                self.write_json(portfolio())
            elif path.startswith("/api/cases/") and path.endswith("/events"):
                case_id = unquote(path.split("/")[3])
                self.write_json({"caseId": case_id, "events": stored_events_for_case(case_id)})
            elif path.startswith("/cases/") and path.endswith("/events"):
                case_id = unquote(path.split("/")[2])
                fast = query.get("fast", ["0"])[0] == "1"
                self.write_case_sse(case_id, fast=fast)
            elif path.startswith("/api/cases/") and path.endswith("/memo"):
                case_id = unquote(path.split("/")[3])
                self.write_json(stored_memo(case_id))
            elif path.startswith("/cases/") and path.endswith("/memo"):
                case_id = unquote(path.split("/")[2])
                self.write_json(stored_memo(case_id))
            elif path.startswith("/api/citations/"):
                citation_id = unquote(path.rsplit("/", 1)[-1])
                if citation_id not in DOCUMENTS:
                    self.write_error(404, "unknown citation")
                else:
                    self.write_json({"citationId": citation_id, **DOCUMENTS[citation_id]})
            elif path.startswith("/api/runs/") and path.endswith("/events"):
                run_id = unquote(path.split("/")[3])
                fast = query.get("fast", ["0"])[0] == "1"
                self.write_sse(run_id, fast=fast)
            else:
                self.write_error(404, "unknown endpoint")
        except KeyError as exc:
            self.write_error(404, f"not found: {exc}")
        except ValueError as exc:
            self.write_error(400, str(exc))

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path in {"/api/run-portfolio", "/run-portfolio"}:
                run_id = persist_run()
                self.write_json({"runId": run_id, "eventsUrl": f"/api/runs/{run_id}/events"})
            elif path.startswith("/cases/") and path.endswith("/run"):
                case_id = unquote(path.split("/")[2])
                persist_run([case_id])
                self.write_json({"caseId": case_id, "eventsUrl": f"/cases/{case_id}/events"})
            elif path.startswith("/api/cases/") and path.endswith("/approve"):
                case_id = unquote(path.split("/")[3])
                body = self.read_json()
                payload = record_approval(
                    case_id=case_id,
                    action=body.get("action", "approve"),
                    reason=body.get("reason", ""),
                )
                self.write_json(payload)
            elif path.startswith("/cases/") and path.endswith("/approve"):
                case_id = unquote(path.split("/")[2])
                body = self.read_json()
                payload = record_approval(
                    case_id=case_id,
                    action=body.get("action", "approve"),
                    reason=body.get("reason", ""),
                )
                self.write_json(payload)
            else:
                self.write_error(404, "unknown endpoint")
        except KeyError as exc:
            self.write_error(404, f"not found: {exc}")
        except ValueError as exc:
            self.write_error(400, str(exc))

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def write_json(self, payload: object, status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def write_error(self, status: int, message: str) -> None:
        self.write_json({"ok": False, "error": message}, status=status)

    def write_sse(self, run_id: str, fast: bool = False) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            for message in stream_messages_for_run(run_id):
                event_name = message["type"]
                body = json.dumps(message)
                self.wfile.write(f"event: {event_name}\n".encode("utf-8"))
                self.wfile.write(f"data: {body}\n\n".encode("utf-8"))
                self.wfile.flush()
                if not fast:
                    time.sleep(0.22)
            self.wfile.write(b"event: done\n")
            self.wfile.write(b"data: {\"done\": true}\n\n")
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        self.close_connection = True

    def write_case_sse(self, case_id: str, fast: bool = False) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            for event in stored_events_for_case(case_id):
                body = json.dumps(event)
                self.wfile.write(f"event: {event['eventName']}\n".encode("utf-8"))
                self.wfile.write(f"data: {body}\n\n".encode("utf-8"))
                self.wfile.flush()
                if not fast:
                    time.sleep(0.22)
            self.wfile.write(b"event: done\n")
            self.wfile.write(b"data: {\"done\": true}\n\n")
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        self.close_connection = True

def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Reclaim full-stack app")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    args = parser.parse_args()
    init_db()
    server = ThreadingHTTPServer((args.host, args.port), ReclaimHandler)
    print(f"Reclaim running at http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
