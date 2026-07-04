import json
import tempfile
import unittest
from pathlib import Path

from reclaim_backend.api import ReclaimAPI


class ReclaimBackendTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.tmpdir.name) / "reclaim-test.sqlite3")
        self.api = ReclaimAPI(db_path=self.db_path)

    def tearDown(self):
        self.tmpdir.cleanup()

    def request(self, method, path, payload=None):
        body = b""
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
        response = self.api.handle(method, path, body)
        content_type = response.headers.get("Content-Type", "")
        if content_type.startswith("application/json"):
            parsed = json.loads(response.body.decode("utf-8"))
        else:
            parsed = response.body_bytes().decode("utf-8")
        return response, parsed

    def test_health_reports_seeded_sqlite_corpus(self):
        response, payload = self.request("GET", "/health")
        self.assertEqual(response.status, 200)
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["database"]["engine"], "sqlite")
        self.assertEqual(payload["database"]["counts"]["live_cases"], 6)
        self.assertGreaterEqual(payload["database"]["counts"]["portfolio_rows"], 30)
        self.assertEqual(payload["retrievalIndex"]["chunkCount"], 4)

    def test_clean_case_skips_exclusion_review_and_streams_sse(self):
        response, payload = self.request("POST", "/cases/CKT-SEA-009/run", {})
        self.assertEqual(response.status, 201)
        self.assertEqual(payload["classification"], "Credit owed")
        self.assertIn("exclusion_review.skipped", payload["memo"]["eventNames"])
        self.assertNotIn("exclusion_review.retrieved", payload["memo"]["eventNames"])

        response, stream = self.request("GET", "/cases/CKT-SEA-009/events")
        self.assertEqual(response.status, 200)
        self.assertIn("text/event-stream", response.headers["Content-Type"])
        self.assertIn("event: exclusion_review.skipped", stream)
        self.assertIn("event: stream.closed", stream)

    def test_ambiguous_maintenance_retrieves_exclusion_and_counts_missing_notice(self):
        response, payload = self.request("POST", "/cases/CKT-ATL-014/run", {})
        self.assertEqual(response.status, 201)
        self.assertEqual(payload["classification"], "Deadline expiring")
        self.assertEqual(payload["recoverableAmount"], 124)
        self.assertIn("exclusion_review.retrieved", payload["memo"]["eventNames"])

        memo_response, memo = self.request("GET", "/cases/CKT-ATL-014/memo")
        self.assertEqual(memo_response.status, 200)
        line_values = [line["value"] for line in memo["lines"]]
        self.assertIn(
            "Maintenance label counts because required 5-day notice is missing.",
            line_values,
        )

    def test_approval_requires_reason_and_blocks_already_credited_approval(self):
        blank_response, blank = self.request(
            "POST", "/cases/CKT-ATL-014/approve", {"action": "approve"}
        )
        self.assertEqual(blank_response.status, 422)
        self.assertIn("Typed reason required", blank["message"])

        ok_response, ok = self.request(
            "POST",
            "/cases/CKT-ATL-014/approve",
            {
                "action": "approve",
                "reason": "Verified counted downtime, citations, and credit math.",
            },
        )
        self.assertEqual(ok_response.status, 201)
        self.assertEqual(ok["action"], "approve")

        blocked_response, blocked = self.request(
            "POST",
            "/cases/CKT-DEN-031/approve",
            {"action": "approve", "reason": "Trying to approve double count."},
        )
        self.assertEqual(blocked_response.status, 422)
        self.assertIn("Already credited", blocked["message"])

        override_response, override = self.request(
            "POST",
            "/cases/CKT-DEN-031/approve",
            {
                "action": "override",
                "reason": "Recorded as reviewed but not recoverable.",
            },
        )
        self.assertEqual(override_response.status, 201)
        self.assertEqual(override["action"], "override")

    def test_portfolio_run_persists_all_live_cases(self):
        response, payload = self.request("POST", "/run-portfolio", {})
        self.assertEqual(response.status, 201)
        self.assertEqual(payload["summary"]["caseCount"], 6)
        self.assertEqual(payload["summary"]["targetRecovery"], 182400)
        self.assertEqual(
            payload["summary"]["classifications"]["CKT-BOS-018"], "Needs review"
        )
        self.assertGreaterEqual(payload["summary"]["eventCount"], 60)


if __name__ == "__main__":
    unittest.main()

