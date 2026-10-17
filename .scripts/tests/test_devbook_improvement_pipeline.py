from __future__ import annotations

import copy
import datetime as dt
import json
from pathlib import Path
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from devbook_improvement import core, demo, pipeline, provider, runtime

ROOT = Path(__file__).resolve().parents[2]
PATH = "Vault/Home/Programming/NET/Demo Tasks.md"


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.clock = dt.datetime(2026, 10, 13, 12, tzinfo=dt.timezone.utc)
        self.config = json.loads((ROOT / ".github/devbook-improvement.json").read_text())
        self.base = {PATH: demo._note("Demo Tasks", "existing_id", "Task")}
        self.store = runtime.MemoryStateStore(core.new_state())
        self.api = demo.FakeApi()
        self.publisher = demo.FakePublisher(self.store, self.api, self.base)
        self.model = demo.FakeProvider(lambda: self.clock)

    def engine(self, **kwargs):
        def notes(_):
            return [{"path": path, "content": text, "hash": core.digest(text),
                     "topic": core.topic_for(path), "violations": []} for path, text in self.base.items()]
        return pipeline.Engine(ROOT, self.config, self.store, model=self.model, api=self.api,
            publisher=self.publisher, notes_loader=notes,
            validator=kwargs.pop("validator", demo._structural_validator(ROOT)),
            source_fetcher=lambda _: "Microsoft primary source fixture", now=lambda: self.clock,
            snapshot_sha_loader=kwargs.pop("snapshot_sha_loader", lambda: self.publisher.ref_sha("main")), **kwargs)

    def test_configured_limits_and_default_deadline_cap_model_calls(self):
        self.assertEqual(
            {key: self.config[key] for key in (
                "max_notes_per_run", "max_pr_notes", "max_pr_lines",
                "model_timeout_seconds", "max_run_minutes",
            )},
            {
                "max_notes_per_run": 4,
                "max_pr_notes": 16,
                "max_pr_lines": 1200,
                "model_timeout_seconds": 900,
                "max_run_minutes": 35,
            },
        )

        class Model:
            timeout_seconds = 1

            def author(self, payload):
                return payload

        model = Model()
        with mock.patch.object(pipeline.time, "monotonic", side_effect=[100.0, 200.0]):
            engine = pipeline.Engine(ROOT, {}, runtime.MemoryStateStore(core.new_state()), model=model)
            self.assertEqual(engine.deadline, 2200.0)
            self.assertEqual(engine.call("author", {"ok": True}), {"ok": True})
        self.assertEqual(model.timeout_seconds, 900)

    def test_semantic_reviewer_failure_blocks_and_does_not_stall_other_topics(self):
        original = self.model.review
        def reject(payload):
            result = original(payload)
            result["verdict"] = "CHANGES REQUIRED"
            result["notes"][0]["verdict"] = "CHANGES REQUIRED"
            result["notes"][0]["quality"]["question_quality"] = "FAIL"
            return result
        self.model.review = reject
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["status"], "review_blocked")
        self.assertEqual(self.publisher.publish_count, 0)
        self.assertTrue(self.store.state["held_proposals"])
        self.assertEqual(self.engine().run(apply=True, with_model=True)["model_calls"], 0)
        self.base["Vault/Home/Programming/CSharp/Demo Async.md"] = demo._note("Demo Async", "new_id", "Async operation")
        self.publisher.base.update(self.base)
        self.model.review = original
        next_run = self.engine().run(apply=True, with_model=True)
        self.assertEqual(next_run["topic"], "Programming/CSharp")
        self.assertEqual(self.publisher.publish_count, 1)

    def test_bare_clean_missing_source_or_rejection_evidence_blocks(self):
        original = self.model.review
        def incomplete(payload):
            result = original(payload)
            result["notes"][0]["source_checks"] = []
            return result
        self.model.review = incomplete
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "review_blocked")
        self.assertEqual(self.publisher.publish_count, 0)

    def test_reviewer_quota_resumes_saved_proposal_without_author(self):
        self.model.review_quota_remaining = 1
        limited = self.engine().run(apply=True, with_model=True)
        self.assertEqual(limited["stage"], "review")
        self.assertTrue(limited["notice"])
        calls = self.model.author_calls
        quiet = self.engine().run(apply=True, with_model=True)
        self.assertEqual(quiet["model_calls"], 0)
        self.assertFalse(quiet["notice"])
        self.clock += dt.timedelta(hours=2)
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "committed")
        self.assertEqual(self.model.author_calls, calls)

    def test_unknown_quota_reset_stays_null_and_repeated_episode_is_quiet(self):
        def quota(_):
            raise provider.ClaudeQuotaError(kind="weekly", reset_at=None,
                next_check_at=(self.clock + dt.timedelta(days=1)).isoformat(), evidence="weekly limit without reset")
        self.model.author = quota
        first = self.engine().run(apply=True, with_model=True)
        self.assertIsNone(first["cooldown"]["reported_reset_at"])
        self.assertTrue(first["notice"])
        self.assertFalse(self.engine().run(apply=True, with_model=True)["notice"])
        self.clock += dt.timedelta(days=2)
        self.assertFalse(self.engine().run(apply=True, with_model=True)["notice"])

    def test_validation_contains_entire_current_pr_not_only_latest_note(self):
        self.engine().run(apply=True, with_model=True)
        second_path = "Vault/Home/Programming/NET/Demo ValueTask.md"
        self.base[second_path] = demo._note("Demo ValueTask", "value_id", "ValueTask")
        self.publisher.add_base_note(second_path, self.base[second_path])
        seen = []
        def validate(before, after):
            seen.append((copy.deepcopy(before), copy.deepcopy(after)))
            return [{"check": "fixture", "result": "passed"}]
        result = self.engine(validator=validate).run(apply=True, with_model=True)
        self.assertEqual(result["publication"]["pr"]["number"], 1)
        self.assertEqual(set(seen[0][1]), {PATH, second_path})
        self.assertIn("does not guarantee a dedicated thread", seen[0][1][PATH])

    def test_completed_publication_finalizes_after_interruption(self):
        engine = self.engine()
        actual = engine.finalize_completed
        engine.finalize_completed = lambda: None
        engine.run(apply=True, with_model=True)
        self.assertFalse(self.store.state.get("finalized_operations"))
        self.assertEqual(self.publisher.publish_count, 1)
        actual()
        self.assertEqual(len(self.store.state["finalized_operations"]), 1)
        self.assertEqual(self.engine().run(apply=True, with_model=True)["model_calls"], 0)
        self.assertEqual(self.publisher.publish_count, 1)

    def test_state_cas_conflict_during_model_preserves_remote_work(self):
        author = self.model.author
        def concurrent(payload):
            snap = self.store.read()
            snap.state["manual_audit"] = "concurrent operator change"
            self.store.write(snap.state, snap, "operator changed state")
            return author(payload)
        self.model.author = concurrent
        with self.assertRaises(runtime.Conflict):
            self.engine().run(apply=True, with_model=True)
        self.assertEqual(self.store.state["manual_audit"], "concurrent operator change")
        self.assertEqual(self.publisher.publish_count, 0)

    def test_source_text_not_only_hash_is_supplied_to_reviewer(self):
        original = self.model.review
        def inspect(payload):
            self.assertIn("Microsoft primary source fixture", payload["primary_sources"].values())
            return original(payload)
        self.model.review = inspect
        self.engine().run(apply=True, with_model=True)

    def test_live_dry_run_preserves_quota_but_performs_no_publication(self):
        self.model.review_quota_remaining = 1
        result = self.engine().run(apply=False, with_model=True)
        self.assertEqual(result["status"], "cooldown")
        self.assertTrue(self.store.state["cooldown"])
        self.assertEqual(self.publisher.publish_count, 0)
        self.assertFalse(any(method == "POST" for method, _ in self.api.calls))

    def test_closed_pr_stops_queued_feedback_and_unchanged_rejected_regeneration(self):
        self.engine().run(apply=True, with_model=True)
        self.api.add_owner_comment(1, "Clarify boundary", updated_at="2026-10-13T12:10:00Z")
        self.model.author_quota_remaining = 1
        self.engine().run(apply=True, with_model=True)
        self.api.prs[0]["state"] = "closed"
        self.clock += dt.timedelta(hours=2)
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(self.publisher.pr_create_count, 1)
        self.assertTrue(self.store.state["rejections"])
        self.assertEqual({item["status"] for item in self.store.state["feedback"].values()}, {"terminal"})

    def test_empty_approval_freezes_without_authorizing_edits(self):
        self.engine().run(apply=True, with_model=True)
        self.api.reviews[1] = [{"id": 82, "body": "", "state": "APPROVED", "user": {
            "id": demo.OWNER_ID, "login": demo.OWNER_LOGIN}, "submitted_at": "2026-10-13T12:30:00Z"}]
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(self.publisher.publish_count, 1)
        self.assertTrue(next(iter(self.store.state["prs"].values()))["frozen"])

    def test_fabricated_current_text_quote_cannot_pass_review(self):
        original = self.model.review
        def fabricated(payload):
            result = original(payload)
            result["notes"][0]["current_text_evidence"][0]["quote"] = "This sentence does not exist in the candidate."
            return result
        self.model.review = fabricated
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["status"], "review_blocked")
        self.assertEqual(self.publisher.publish_count, 0)

    def test_explicit_owner_rejection_and_reconsideration_persist_separately(self):
        self.engine().run(apply=True, with_model=True)
        self.api.add_owner_comment(1, "Reject this wording and restore the original question.", updated_at="2026-10-13T12:10:00Z")
        reviewer = self.model.review
        captured = {}
        def reject(payload):
            target = next(item for item in payload["open_proposals"] if item["kind"] == "rewrite")
            captured.update(target)
            key = payload["feedback"][0]["key"]
            return {"version": 1, "edits": [], "dispositions": [
                {"path": path, "outcome": "keep", "reason": "Owner requests exact original wording."} for path in payload["notes"]],
                "feedback": [{"key": key, "outcome": "implemented", "reason": "Restore saved source and reject the proposal."}],
                "decisions": [{"feedback_key": key, "fingerprint": target["fingerprint"], "decision": "reject", "reason": "Explicit owner rejection."}]}
        def verify(payload):
            result = reviewer(payload)
            result["decision_checks"] = [{**decision, "request_quote": payload["feedback"][0]["body"],
                "verdict": "SUPPORTED"} for decision in payload["proposal"].get("decisions", [])]
            for report in result["notes"]:
                for equivalent in report["rejection_equivalence"]:
                    equivalent["equivalent"] = True
            return result
        self.model.author, self.model.review = reject, verify
        rejected = self.engine().run(apply=True, with_model=True)
        self.assertEqual(rejected["status"], "committed")
        branch = self.api.prs[0]["head"]["ref"]
        self.assertIn(captured["before"], self.publisher.read_note(PATH, branch))
        self.assertEqual(self.store.state["rejections"][0]["fingerprint"], captured["fingerprint"])
        self.assertFalse(self.store.state["rejections"][0]["reconsidered_by"])
        self.api.add_owner_comment(1, "Reconsider the earlier wording and use it now.", updated_at="2026-10-13T12:20:00Z")
        def reconsider(payload):
            key = payload["feedback"][0]["key"]
            edit = {key_: value for key_, value in captured.items() if key_ != "fingerprint"}
            edit.update(expected_hash=core.digest(payload["notes"][PATH]), feedback_keys=[key])
            return {"version": 1, "edits": [edit], "dispositions": [{"path": PATH, "outcome": "changed", "reason": "Explicit reconsideration."}],
                "feedback": [{"key": key, "outcome": "implemented", "reason": "Applied requested reconsideration."}],
                "decisions": [{"feedback_key": key, "fingerprint": captured["fingerprint"], "decision": "reconsider", "reason": "Owner explicitly changed the earlier decision."}]}
        self.model.author = reconsider
        accepted = self.engine().run(apply=True, with_model=True)
        self.assertEqual(accepted["status"], "committed")
        self.assertTrue(self.store.state["rejections"][0]["reconsidered_by"])
        self.assertIn(captured["after"], self.publisher.read_note(PATH, branch))

    def test_decision_cannot_invent_owner_request_or_proposal_identity(self):
        proposal = {"decisions": [{"feedback_key": "untrusted", "fingerprint": "unknown", "decision": "reject", "reason": "invented"}]}
        with self.assertRaises(runtime.Conflict):
            pipeline.proposal_decisions(proposal, [], [], [])

    def test_rejected_split_restores_exact_original_identity_without_generating_id(self):
        original = self.base[PATH]
        card = core._qard_spans(original)[0][2]
        children = "> [!qard]- What does a .NET Task represent?\n> An asynchronous operation.\n\n> [!qard]- Does a Task imply a dedicated thread?\n> No.\n"
        current = original.replace(card, children)
        edit = {"path": PATH, "before": card, "after": children, "kind": "split", "essential_meanings": ["Operation semantics."]}
        action = {"decision": "reject", "edit": edit, "original_source": original,
                  "fingerprint": "saved-split", "feedback_key": "verified-owner-request", "reason": "Restore the parent."}
        proposal = {"edits": [], "dispositions": [{"path": PATH, "outcome": "keep", "reason": "Restore."}]}
        result = {"sources": {PATH: current}, "edits": [], "lineage": []}
        pipeline.restore_rejected(proposal, result, [action], {PATH: current})
        self.assertEqual(result["sources"][PATH], original)
        self.assertEqual(core._ids(result["sources"][PATH]), ["existing_id"])
        self.assertEqual(result["lineage"][0]["restored_ids"], ["existing_id"])

    def test_decision_review_quote_must_exist_in_verified_owner_feedback(self):
        payload = {"notes": self.base, "feedback": []}
        proposal = self.model.author(payload)
        result = core.apply_proposal(self.base, proposal)
        proposal["decisions"] = [{"feedback_key": "owner-key", "fingerprint": "saved", "decision": "reject", "reason": "claimed request"}]
        review = self.model.review({"current": result["sources"], "proposal": proposal})
        review["decision_checks"] = [{**proposal["decisions"][0], "request_quote": "I never said this.", "verdict": "SUPPORTED"}]
        self.assertFalse(pipeline.clean_review(review, result["sources"], proposal, [], [{"key": "owner-key", "body": "Please explain the mechanism."}]))

    def test_rejection_cannot_restore_identity_at_newly_inserted_replacement(self):
        original = self.base[PATH]
        card = core._qard_spans(original)[0][2]
        rejected = "> [!qard]- Rejected target?\n> Rejected answer.\n"
        selected = original.replace(card, "> [!qard]- User changed target?\n> User answer.\n")
        action = {"decision": "reject", "edit": {"path": PATH, "before": card, "after": rejected,
                  "kind": "replace", "essential_meanings": ["Original target."]}, "original_source": original,
                  "fingerprint": "old", "feedback_key": "owner", "reason": "Reject."}
        proposal = {"edits": [{"path": PATH, "before": "# Questions", "after": "# Questions\n" + rejected}], "dispositions": []}
        result = {"sources": {PATH: selected.replace("# Questions", "# Questions\n" + rejected)}, "edits": [], "lineage": []}
        with self.assertRaisesRegex(runtime.Conflict, "absent or ambiguous"):
            pipeline.restore_rejected(proposal, result, [action], {PATH: selected})
        self.assertNotIn("existing_id", result["sources"][PATH])

    def test_rejection_conflicts_with_overlapping_current_edit(self):
        original = self.base[PATH]
        card = core._qard_spans(original)[0][2]
        replacement = "> [!qard]- Replacement?\n> Answer.\n"
        selected = original.replace(card, replacement)
        action = {"decision": "reject", "edit": {"path": PATH, "before": card, "after": replacement,
                  "kind": "replace", "essential_meanings": ["Target."]}, "original_source": original,
                  "fingerprint": "old", "feedback_key": "owner", "reason": "Reject."}
        proposal = {"edits": [{"path": PATH, "before": replacement, "after": replacement + "\n"}], "dispositions": []}
        result = {"sources": {PATH: selected + "\n"}, "edits": [], "lineage": []}
        with self.assertRaisesRegex(runtime.Conflict, "touched by another"):
            pipeline.restore_rejected(proposal, result, [action], {PATH: selected})

    def test_forged_managed_pr_identity_cannot_enter_queue(self):
        topic = core.topic_for(PATH)
        topic_id = core.topic_id(topic)
        for head_repo, branch, base_repo, base_ref in (
            ("attacker/fork", core.branch_for(topic, 1), self.config["repo"], "main"),
            (self.config["repo"], "main", self.config["repo"], "main"),
            (self.config["repo"], "notes/unrelated", self.config["repo"], "main"),
            (self.config["repo"], core.branch_for(topic, 1), "attacker/fork", "main"),
            (self.config["repo"], core.branch_for(topic, 1), self.config["repo"], "other"),
        ):
            with self.subTest(head_repo=head_repo, branch=branch, base_ref=base_ref):
                self.api.prs = [{"number": 99, "state": "open", "draft": True,
                    "body": runtime.marker(topic_id, 1),
                    "head": {"ref": branch, "sha": "base-0001", "repo": {"full_name": head_repo}},
                    "base": {"ref": base_ref, "repo": {"full_name": base_repo}}}]
                self.api.calls.clear()
                result = self.engine().run()
                self.assertEqual(result["status"], "selected")
                self.assertFalse(result["batch"].get("pr"))
                self.assertFalse(self.store.state["prs"])
                self.assertFalse(any("/pulls/99/" in path for _, path in self.api.calls))

    def test_feedback_disposition_failure_precedes_review_and_publication(self):
        self.engine().run(apply=True, with_model=True)
        self.api.add_owner_comment(1, "Clarify the thread boundary.", updated_at="2026-10-13T12:10:00Z")
        original_author = self.model.author
        review_calls = self.model.review_calls
        for feedback in ([], [{"key": "invented", "outcome": "implemented", "reason": "Not queued."}]):
            with self.subTest(feedback=feedback):
                def author(payload):
                    proposal = original_author(payload)
                    proposal["feedback"] = feedback
                    return proposal
                self.model.author = author
                self.store.state.pop("pending_author_proposal", None)
                with self.assertRaisesRegex(core.ProposalError, "feedback.*exactly"):
                    self.engine().run(apply=True, with_model=True)
                self.assertEqual(self.publisher.publish_count, 1)
                self.assertEqual(self.model.review_calls, review_calls)

    def test_main_note_drift_pauses_topic_until_branch_includes_main(self):
        self.engine().run(apply=True, with_model=True)
        pr = self.api.prs[0]
        branch = pr["head"]["ref"]
        self.base[PATH] += "\nNew authoritative context from the owner.\n"
        self.publisher.base[PATH] = self.base[PATH]
        self.publisher.heads["main"] = "base-0002"
        self.api.add_owner_comment(1, "Clarify the thread boundary.", updated_at="2026-10-13T12:10:00Z")
        calls = self.model.author_calls + self.model.review_calls
        paused = self.engine().run(apply=True, with_model=True)
        self.assertEqual(paused["status"], "topics_paused")
        self.assertEqual(paused["model_calls"], 0)
        self.assertEqual(self.publisher.publish_count, 1)
        self.assertEqual(self.model.author_calls + self.model.review_calls, calls)
        self.publisher.branches[branch][PATH] += "\nNew authoritative context from the owner.\n"
        self.publisher.heads[branch] = pr["head"]["sha"] = "rebased-0002"
        self.api.merge_bases["/compare/base-0002...rebased-0002"] = "base-0002"
        resumed = self.engine().run(apply=True, with_model=True)
        self.assertEqual(resumed["status"], "committed")
        self.assertIn("New authoritative context", self.publisher.read_note(PATH, branch))
        self.assertFalse(next(iter(self.store.state["prs"].values()))["base_conflict"])

    def test_finalized_but_uncompacted_wal_recovers_without_replaying_receipts(self):
        self.engine().run(apply=True, with_model=True)
        op_id = next(iter(self.store.state["completed_operations"]))
        self.store.state["completed_operations"][op_id].update(compacted=False, candidate={PATH: "large retained payload"})
        receipts = len(self.api.receipts)
        publications = self.publisher.publish_count
        self.engine().run(apply=True, with_model=True)
        self.assertTrue(self.store.state["completed_operations"][op_id]["compacted"])
        self.assertNotIn("candidate", self.store.state["completed_operations"][op_id])
        self.assertEqual(len(self.api.receipts), receipts)
        self.assertEqual(self.publisher.publish_count, publications)

    def test_other_topics_progress_while_one_topic_has_base_drift(self):
        self.engine().run(apply=True, with_model=True)
        branch = self.api.prs[0]["head"]["ref"]
        unchanged = self.publisher.read_note(PATH, branch)
        self.base[PATH] += "\nOwner context on main.\n"
        other = "Vault/Home/Programming/CSharp/Demo Async.md"
        self.base[other] = demo._note("Demo Async", "other_id", "Async operation")
        self.publisher.base.update(self.base)
        self.publisher.heads["main"] = "base-0002"
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["status"], "committed")
        self.assertEqual(result["topic"], "Programming/CSharp")
        self.assertEqual(self.publisher.read_note(PATH, branch), unchanged)
        self.assertTrue(self.store.state["prs"][f"{core.topic_id('Programming/NET')}:1"]["base_conflict"])

    def test_unrelated_main_change_does_not_pause_existing_topic(self):
        self.engine().run(apply=True, with_model=True)
        self.publisher.heads["main"] = "base-0002"
        self.api.add_owner_comment(1, "Clarify the thread boundary.", updated_at="2026-10-13T12:10:00Z")
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["status"], "committed")
        self.assertFalse(next(iter(self.store.state["prs"].values()))["base_conflict"])
        self.assertFalse(any(path.startswith("/compare/") for _, path in self.api.calls))

    def test_inventory_snapshot_must_match_exact_remote_base_before_model(self):
        self.engine().run(apply=True, with_model=True)
        calls = self.model.author_calls + self.model.review_calls
        self.publisher.heads["main"] = "newer-remote-main"
        with self.assertRaisesRegex(runtime.Conflict, "checkout snapshot and remote base differ"):
            self.engine(snapshot_sha_loader=lambda: "base-0001").run(apply=True, with_model=True)
        self.assertEqual(self.model.author_calls + self.model.review_calls, calls)
        self.assertEqual(self.publisher.publish_count, 1)


if __name__ == "__main__":
    unittest.main()
