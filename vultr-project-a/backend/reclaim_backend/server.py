"""Run the Reclaim backend with Python's stdlib HTTP server."""

from __future__ import annotations

import argparse
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import cast

from .api import ApiResponse, ReclaimAPI


class ReclaimHTTPServer(ThreadingHTTPServer):
    api: ReclaimAPI


class Handler(BaseHTTPRequestHandler):
    server_version = "ReclaimLocalBackend/0.1"

    def do_GET(self) -> None:
        self._dispatch("GET")

    def do_POST(self) -> None:
        self._dispatch("POST")

    def do_OPTIONS(self) -> None:
        self._dispatch("OPTIONS")

    def _dispatch(self, method: str) -> None:
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length) if length else b""
        server = cast(ReclaimHTTPServer, self.server)
        response = server.api.handle(method, self.path, body, dict(self.headers))
        self._send(response)

    def _send(self, response: ApiResponse) -> None:
        self.send_response(response.status)
        for key, value in response.headers.items():
            self.send_header(key, value)
        if not response.stream_chunks:
            self.send_header("Content-Length", str(len(response.body)))
        self.end_headers()

        if response.stream_chunks:
            for chunk in response.stream_chunks:
                self.wfile.write(chunk)
                self.wfile.flush()
                if response.stream_delay_ms > 0:
                    time.sleep(response.stream_delay_ms / 1000)
            return

        if response.body:
            self.wfile.write(response.body)

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} - {fmt % args}")


def run(host: str, port: int, db_path: str | None) -> None:
    api = ReclaimAPI(db_path=db_path)
    server = ReclaimHTTPServer((host, port), Handler)
    server.api = api
    print(f"Reclaim backend listening on http://{host}:{port}")
    print("Health: GET /health")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Reclaim backend")
    finally:
        server.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Reclaim local backend")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--db", default=None, help="Path to SQLite database")
    args = parser.parse_args()
    run(args.host, args.port, args.db)


if __name__ == "__main__":
    main()

