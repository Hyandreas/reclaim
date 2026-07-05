from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import time
from urllib.parse import parse_qs, unquote, urlparse

from reclaim_core import (
    DOCUMENTS,
    ROOT,
    health_payload,
    init_db,
    persist_run,
    persist_run_for_case,
    portfolio,
    record_approval,
    stored_events_for_case,
    stored_memo,
    stream_messages_for_run,
)


APP_DIR = ROOT / "app"


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
                self.write_json(health_payload())
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
                self.serve_static(path)
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
                run_id = persist_run_for_case(case_id)
                self.write_json(
                    {"caseId": case_id, "runId": run_id, "eventsUrl": f"/cases/{case_id}/events"}
                )
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

    def serve_static(self, path: str) -> None:
        if path == "/":
            path = "/index.html"
        safe_path = Path(unquote(path.lstrip("/")))
        file_path = (APP_DIR / safe_path).resolve()
        if not str(file_path).startswith(str(APP_DIR.resolve())) or not file_path.is_file():
            self.write_error(404, "file not found")
            return
        content = file_path.read_bytes()
        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


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
