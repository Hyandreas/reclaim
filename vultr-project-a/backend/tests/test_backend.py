import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from reclaim_backend.api import ReclaimAPI


class ReclaimBackendTests(unittest.TestCase):
    def setUp(self):
        self.env_patch = patch.dict(
            os.environ,
            {
                "RECLAIM_ENV_FILE": "",
                "VULTR_SERVERLESS_INFERENCE_API_KEY": "",
            },
        )
        self.env_patch.start()
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.tmpdir.name) / "reclaim-test.sqlite3")
        self.api = ReclaimAPI(db_path=self.db_path)

    def tearDown(self):
        self.tmpdir.cleanup()
        self.env_patch.stop()

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
        self.assertIn("integrations", payload)

    def test_integrations_report_missing_keys_without_exposing_values(self):
        with patch.dict(os.environ, {"RECLAIM_ENV_FILE": ""}, clear=True):
            response, payload = self.request("GET", "/integrations")

        self.assertEqual(response.status, 200)
        self.assertEqual(payload["summary"]["mode"], "local")
        self.assertEqual(payload["summary"]["configured"], 0)
        self.assertIn("VULTR_API_KEY", payload["summary"]["missing"])
        self.assertNotIn("value", json.dumps(payload).lower())

    def test_integrations_detect_configured_future_keys(self):
        fake_env = {
            "RECLAIM_ENV_FILE": "",
            "VULTR_API_KEY": "vultr-control-plane-key",
            "VULTR_SERVERLESS_INFERENCE_API_KEY": "vultr-inference-key",
            "VULTR_OBJECT_STORAGE_ACCESS_KEY": "object-access-key",
            "VULTR_OBJECT_STORAGE_SECRET_KEY": "object-secret-key",
            "VULTR_OBJECT_STORAGE_ENDPOINT": "https://ewr1.vultrobjects.com",
            "VULTR_OBJECT_STORAGE_BUCKET": "reclaim-demo",
            "DATABASE_URL": "postgresql://user:password@example.com/reclaim",
        }
        with patch.dict(os.environ, fake_env, clear=True):
            response, payload = self.request("GET", "/integrations")

        self.assertEqual(response.status, 200)
        self.assertEqual(payload["summary"]["mode"], "configured")
        self.assertEqual(payload["summary"]["configured"], payload["summary"]["total"])
        self.assertEqual(payload["summary"]["missing"], [])
        serialized = json.dumps(payload)
        self.assertNotIn("vultr-control-plane-key", serialized)
        self.assertNotIn("object-secret-key", serialized)
        self.assertNotIn("password@example.com", serialized)

    def test_clean_case_skips_exclusion_review_and_streams_sse(self):
        response, payload = self.request("POST", "/cases/CKT-SEA-009/run", {})
        self.assertEqual(response.status, 201)
        self.assertEqual(payload["classification"], "Credit owed")
        self.assertIn("llm.planner_note.skipped", payload["memo"]["eventNames"])
        self.assertIn("exclusion_review.skipped", payload["memo"]["eventNames"])
        self.assertNotIn("exclusion_review.retrieved", payload["memo"]["eventNames"])

        response, stream = self.request("GET", "/cases/CKT-SEA-009/events")
        self.assertEqual(response.status, 200)
        self.assertIn("text/event-stream", response.headers["Content-Type"])
        self.assertIn("event: exclusion_review.skipped", stream)
        self.assertIn("event: stream.closed", stream)

    def test_case_run_calls_vultr_inference_when_key_is_configured(self):
        tool_call_response = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_credit",
                                "type": "function",
                                "function": {
                                    "name": "calculate_credit",
                                    "arguments": json.dumps({"case_id": "CKT-ATL-014"}),
                                },
                            }
                        ],
                    }
                }
            ]
        }
        final_response = {
            "choices": [
                {
                    "message": {
                        "content": "Tool-backed route: deterministic credit math found a deadline-expiring recovery after checking the missing maintenance notice."
                    }
                }
            ]
        }
        fake_env = {
            "RECLAIM_ENV_FILE": "",
            "VULTR_SERVERLESS_INFERENCE_API_KEY": "fake-inference-key",
            "VULTR_SERVERLESS_INFERENCE_MODEL": "kimi-k2-instruct",
        }

        with patch.dict(os.environ, fake_env), patch("reclaim_llm.urlopen") as mock_urlopen:
            mock_urlopen.side_effect = [
                self.fake_inference_response(tool_call_response),
                self.fake_inference_response(final_response),
            ]
            response, payload = self.request("POST", "/cases/CKT-ATL-014/run", {})

        self.assertEqual(response.status, 201)
        event = next(event for event in payload["events"] if event["eventName"] == "llm.planner_note.generated")
        self.assertEqual(
            event["detail"],
            "Tool-backed route: deterministic credit math found a deadline-expiring recovery after checking the missing maintenance notice.",
        )
        self.assertEqual(event["payload"]["toolCalls"], ["calculate_credit"])
        self.assertTrue(event["payload"]["toolCalling"])
        self.assertEqual(mock_urlopen.call_count, 2)
        first_request = mock_urlopen.call_args_list[0].args[0]
        second_request = mock_urlopen.call_args_list[1].args[0]
        self.assertEqual(first_request.full_url, "https://api.vultrinference.com/v1/chat/completions")
        first_body = json.loads(first_request.data.decode("utf-8"))
        self.assertEqual(first_body["tool_choice"], "required")
        tool_names = [tool["function"]["name"] for tool in first_body["tools"]]
        self.assertIn("calculate_credit", tool_names)
        second_body = json.loads(second_request.data.decode("utf-8"))
        self.assertEqual(second_body["messages"][-1]["role"], "tool")
        self.assertIn("recoverableAmount", second_body["messages"][-1]["content"])
        self.assertNotIn("fake-inference-key", json.dumps(payload))

    def fake_inference_response(self, payload):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps(payload).encode("utf-8")
        return response

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
