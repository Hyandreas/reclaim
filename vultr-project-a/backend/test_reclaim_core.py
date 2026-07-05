import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

import llm_planner
from reclaim_core import (
    case_by_id,
    computed_target_recovery,
    credit_for_case,
    memo_for_case,
    persist_run,
    portfolio,
    rail_events_for_case,
    record_approval,
    stored_events_for_case,
    stored_memo,
)


class ReclaimCoreTests(unittest.TestCase):
    def setUp(self):
        # Assert the deterministic planner contract here; the live provider path
        # (which has real agency and may route differently) is covered by
        # test_live_llm.py. Forcing an empty provider chain makes plan_case fall
        # to rules_plan, so these tests pass identically with and without keys.
        self._orig_providers = llm_planner._providers
        llm_planner._providers = lambda: []
        llm_planner._case_cache.clear()

    def tearDown(self):
        llm_planner._providers = self._orig_providers
        llm_planner._case_cache.clear()
    def test_deep_case_triggers_exclusion_retrieval(self):
        events = rail_events_for_case(case_by_id("CKT-ATL-014"))
        names = [event["eventName"] for event in events]
        self.assertIn("exclusion_review.retrieved", names)
        self.assertIn("billing_crosscheck.skipped", names)

    def test_clean_case_skips_exclusion_retrieval(self):
        events = rail_events_for_case(case_by_id("CKT-SEA-009"))
        names = [event["eventName"] for event in events]
        self.assertIn("exclusion_review.skipped", names)

    def test_prior_credit_blocks_recovery(self):
        credit = credit_for_case(case_by_id("CKT-DEN-031"))
        self.assertEqual(credit["classification"], "Already credited")
        self.assertEqual(credit["recoverableAmount"], 0)

    def test_memo_has_formula_and_citations(self):
        memo = memo_for_case(case_by_id("CKT-ATL-014"))
        self.assertEqual(memo["creditFormula"]["recoverableCredit"], 390)
        self.assertGreaterEqual(len(memo["citations"]), 3)
        self.assertEqual(memo["confidence"]["threshold"], 0.8)

    def test_portfolio_target_equals_computed_sum(self):
        # Target is now computed from live + preprocessed amounts, not a locked constant.
        self.assertEqual(portfolio()["targetRecovery"], computed_target_recovery())
        self.assertGreaterEqual(len(portfolio()["cases"]), 40)

    def test_rail_event_timestamps_are_live_and_monotonic(self):
        events = rail_events_for_case(case_by_id("CKT-ATL-014"))
        stamps = [event["at"] for event in events]
        # Non-decreasing (generation order), not frozen at the old fixed seed stamp.
        self.assertEqual(stamps, sorted(stamps))
        self.assertFalse(any(stamp.startswith("2026-07-04T16:00:00") for stamp in stamps))

    def test_repeated_runs_stream_latest_case_events_only(self):
        persist_run()
        persist_run()
        events = stored_events_for_case("CKT-ATL-014")
        self.assertEqual(len(events), len(rail_events_for_case(case_by_id("CKT-ATL-014"))))
        self.assertEqual(events[0]["eventName"], "plan.completed")
        self.assertEqual(events[-1]["eventName"], "memo.assembled")

    def test_approval_requires_reason(self):
        with self.assertRaises(ValueError):
            record_approval("CKT-ATL-014", "approve", "")

    def test_approval_persists(self):
        record_approval("CKT-ATL-014", "approve", "Verified clause citations and deterministic math.")
        memo = stored_memo("CKT-ATL-014")
        self.assertEqual(memo["approval"]["action"], "approve")


if __name__ == "__main__":
    unittest.main()
