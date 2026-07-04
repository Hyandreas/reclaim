import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from reclaim_core import (
    TARGET_RECOVERY,
    case_by_id,
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
        self.assertEqual(memo["creditFormula"]["recoverableCredit"], 124)
        self.assertGreaterEqual(len(memo["citations"]), 3)
        self.assertEqual(memo["confidence"]["threshold"], 0.8)

    def test_portfolio_target_is_locked(self):
        self.assertEqual(portfolio()["targetRecovery"], TARGET_RECOVERY)
        self.assertGreaterEqual(len(portfolio()["cases"]), 40)

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
