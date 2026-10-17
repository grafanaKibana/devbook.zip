from __future__ import annotations

import datetime as dt
import json
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".scripts"))

from devbook_improvement.demo import FakeProvider, _note, demonstrate  # noqa: E402


class DemoTests(unittest.TestCase):
    def test_fake_provider_uses_the_production_review_contract(self):
        now = lambda: dt.datetime(2026, 10, 13, 12, tzinfo=dt.timezone.utc)
        model = FakeProvider(now)
        path = "Vault/Home/Programming/NET/Demo Tasks.md"
        before = _note("Demo Tasks", "demo_task_id", "Task")
        proposal = model.author({"notes": {path: before}, "feedback": []})
        current = before
        for edit in proposal["edits"]:
            current = current.replace(edit["before"], edit["after"])

        review = model.review({"proposal": proposal, "current": {path: current}, "rejected_proposals": []})

        self.assertEqual("RESOLVED", review["notes"][0]["target_resolution"])
        self.assertTrue(review["overall_reason"])
        self.assertEqual([], review["decision_checks"])
        lines = current.splitlines()
        for evidence in review["notes"][0]["current_text_evidence"]:
            self.assertEqual(evidence["quote"], lines[evidence["line_start"] - 1])
            self.assertTrue(evidence["reason"])

    def test_demo_runs_real_engine_without_credentials_or_checkout_mutation(self):
        config = json.loads((ROOT / ".github/devbook-improvement.json").read_text())
        before = (ROOT / "Vault/Home/Programming/NET/Tasks.md").read_bytes() if (ROOT / "Vault/Home/Programming/NET/Tasks.md").exists() else None
        result = demonstrate(ROOT, config)
        after = (ROOT / "Vault/Home/Programming/NET/Tasks.md").read_bytes() if (ROOT / "Vault/Home/Programming/NET/Tasks.md").exists() else None

        self.assertEqual("demo_complete", result["status"])
        self.assertEqual(before, after)
        self.assertTrue(result["diff"])
        self.assertIn("## 4. Significant question changes", result["summary"])
        self.assertTrue(result["question_changes"])
        self.assertEqual(2, result["counts"]["pr_creates"])
        self.assertEqual(1, result["counts"]["main_topic_pr_creates"])
        self.assertTrue(result["evidence"]["single_draft_pr_reused"])
        self.assertGreaterEqual(result["counts"]["pr_updates"], 2)
        self.assertEqual(result["counts"]["completed_operations"], result["counts"]["finalized_operations"])
        self.assertGreaterEqual(result["counts"]["feedback_receipts"], 2)
        self.assertEqual([False, False], result["evidence"]["quiet_cooldown_notices"])
        self.assertTrue(result["evidence"]["resumed_from_saved_author_proposal"])
        statuses = {step["name"]: step["status"] for step in result["demo_steps"]}
        self.assertEqual("committed", statuses["same_pr_second_note"])
        self.assertEqual("no_changes", statuses["duplicate_feedback_skip"])
        self.assertEqual("cooldown", statuses["author_weekly_cooldown"])
        self.assertEqual("cooldown", statuses["reviewer_weekly_cooldown"])
        self.assertEqual("committed", statuses["quota_resumed_saved_proposal"])


if __name__ == "__main__":
    unittest.main()
