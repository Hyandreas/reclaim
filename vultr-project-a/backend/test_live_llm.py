"""Manual live check: run one planner + one retrieval and print provenance.

Not auto-discovered by `unittest discover -s tests`. Run directly to verify
whether live LLM / embeddings mode is active in one command:

    python test_live_llm.py

Passes with AND without keys (rules/tfidf paths still return valid results).
"""
from __future__ import annotations

from pathlib import Path
import sys
import unittest

# Model rationales can contain non-cp1252 characters; keep stdout printable on Windows.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

sys.path.insert(0, str(Path(__file__).resolve().parent))

import llm_planner
import retrieval
from reclaim_core import _bundle_for_case, case_by_id


class LiveLLMCheck(unittest.TestCase):
    def test_plan_and_retrieve_report_provenance(self):
        bundle = _bundle_for_case(case_by_id("CKT-ATL-014"))
        plan = llm_planner.plan_case(bundle)
        print("\n=== planner ===")
        print("plannerSource:", plan["plannerSource"])
        print("plannerModel :", plan["plannerModel"])
        print("latencyMs    :", plan["latencyMs"])
        print("needsExclusion/needsBilling:", plan["needsExclusion"], plan["needsBilling"])
        print("rationale    :", plan["rationale"])

        hits = retrieval.retrieve("maintenance notice exclusion", k=1)
        top = hits[0]
        print("\n=== retrieval ===")
        print("mode     :", top["mode"])
        print("topScore :", top["score"])
        print("chunkId  :", top["chunkId"])
        print("text     :", top["text"])

        # Contract holds regardless of key availability.
        self.assertIn(plan["plannerSource"].split("-")[0], {"vultr", "nvidia", "rules"})
        self.assertIsInstance(plan["needsExclusion"], bool)
        self.assertIn(top["mode"], {"vultr-embeddings", "local-tfidf"})
        self.assertGreaterEqual(top["score"], 0.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
