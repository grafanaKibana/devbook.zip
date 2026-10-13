from __future__ import annotations

import copy
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from devbook_improvement import core  # noqa: E402


PATH = "Vault/Home/Programming/NET/Card.md"
CARD = """<!-- qard-location: {\"deck\":\"NET\",\"topic\":\"Card\"} -->
<!-- qard-id: stable_1 -->
> [!qard]- What is a task?
> A unit of asynchronous work.
"""
NOTE = """---
topic: [Programming]
subtopic: [NET]
level: [\"1\"]
priority: Medium
status: Creation
publish: false
---

# Card

Intro text.

# Questions

""" + CARD


def edit(**overrides):
    value = {
        "path": PATH,
        "expected_hash": core.digest(NOTE),
        "before": CARD,
        "after": CARD.replace("asynchronous", "scheduled asynchronous"),
        "reason": "Clarify the mechanism.",
        "kind": "rewrite",
        "learning_target": "same",
        "essential_meanings": ["A task represents asynchronous work."],
        "sources": [],
        "feedback_keys": [],
    }
    value.update(overrides)
    return value


def proposal(*edits):
    return {
        "version": 1,
        "edits": list(edits),
        "dispositions": [{"path": PATH, "outcome": "changed", "reason": "Useful."}],
        "feedback": [],
    }


class NamingAndInventoryPolicyTests(unittest.TestCase):
    def test_exact_parent_is_topic_and_branch_generation_is_stable(self):
        topic = core.topic_for(PATH)
        self.assertEqual("Programming/NET", topic)
        self.assertEqual(core.branch_for(topic, 2), core.branch_for(topic, 2))
        self.assertNotEqual(core.branch_for(topic, 1), core.branch_for(topic, 2))

    def test_rules_version_uses_content_authorities_only(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "AGENTS.md").write_text("rules", encoding="utf-8")
            before = core.rules_version(root)
            (root / ".scripts/devbook_improvement").mkdir(parents=True)
            (root / ".scripts/devbook_improvement/runtime.py").write_text("deployment", encoding="utf-8")
            self.assertEqual(before, core.rules_version(root))
            (root / "AGENTS.md").write_text("changed rules", encoding="utf-8")
            self.assertNotEqual(before, core.rules_version(root))


class StateAndSelectionTests(unittest.TestCase):
    def note(self, path=PATH, content=NOTE, violations=None):
        return {"path": path, "content": content, "hash": core.digest(content), "topic": core.topic_for(path), "violations": violations or []}

    def test_feedback_first_then_new_changed_unchecked_and_violations(self):
        state = core.new_state()
        note = self.note()
        batch = core.select_batch(state, [note], "r1")
        self.assertEqual("new", batch["notes"][0]["selection_reason"])
        state["notes"][PATH] = {"content_hash": note["hash"], "outcome": "keep", "violation_hash": core.digest("[]"), "rules_hash": "r1"}
        self.assertIsNone(core.select_batch(state, [note], "r1"), "unchanged keep must not churn")
        self.assertEqual("rules_changed", core.select_batch(state, [note], "r2")["notes"][0]["selection_reason"])
        changed = self.note(content=NOTE + "\nChanged.\n")
        self.assertEqual("changed", core.select_batch(state, [changed], "r2")["notes"][0]["selection_reason"])
        feedback = {"key": "review:1:x", "status": "pending", "topic": core.topic_for(PATH), "paths": [PATH]}
        state["feedback"][feedback["key"]] = feedback
        self.assertEqual("feedback", core.select_batch(state, [changed], "r2")["notes"][0]["selection_reason"])

    def test_default_batch_limit_selects_four_notes(self):
        notes = [
            self.note(path=f"Vault/Home/Programming/NET/Card {index}.md")
            for index in range(5)
        ]
        batch = core.select_batch(core.new_state(), notes, "rules")
        self.assertEqual(len(batch["notes"]), 4)

    def test_keep_records_success_without_requeue(self):
        state = core.new_state()
        note = self.note()
        batch = core.select_batch(state, [note], "rules")
        keep = {"version": 1, "edits": [], "dispositions": [{"path": PATH, "outcome": "keep", "reason": "Already sound."}], "feedback": []}
        applied = core.apply_proposal({PATH: NOTE}, keep)
        updated = core.record_outcome(state, batch, keep, applied)
        self.assertEqual("keep", updated["notes"][PATH]["outcome"])
        self.assertIsNone(core.select_batch(updated, [note], "rules"))

    def test_open_pr_cap_allows_feedback_and_freeze_is_monotonic(self):
        state = core.new_state()
        prs = [{"number": i, "topic_id": f"topic-{i}", "generation": 1, "status": "open", "draft": True} for i in range(1, 4)]
        state = core.sync_prs(state, prs)
        self.assertIsNone(core.select_batch(state, [self.note()], "r"))
        topic = core.topic_for(PATH)
        state["feedback"]["k"] = {"key": "k", "status": "pending", "topic": topic, "paths": [PATH]}
        self.assertIsNotNone(core.select_batch(state, [self.note()], "r"))
        reviewed = {"number": 1, "topic_id": "topic-1", "generation": 1, "status": "open", "review_activity": True, "draft": True}
        state = core.sync_prs(state, [reviewed])
        reviewed["review_activity"] = False
        self.assertTrue(core.sync_prs(state, [reviewed])["prs"]["topic-1:1"]["frozen"])

    def test_closed_generation_is_not_reused(self):
        state = core.sync_prs(core.new_state(), [{"number": 7, "topic_id": "net", "generation": 2, "status": "closed"}])
        self.assertEqual(3, state["topics"]["net"]["generation"])

    def test_terminal_pr_prunes_full_records_after_rejection_tombstone(self):
        state = core.sync_prs(core.new_state(), [{"number": 7, "topic_id": "net", "generation": 1, "status": "open"}])
        note = self.note()
        batch = {"notes": [note], "rules_hash": "rules"}
        proposed = proposal(edit())
        applied = core.apply_proposal({PATH: NOTE}, proposed)
        record = {"batch": batch, "proposal": proposed, "result": applied}
        state["prs"]["net:1"]["proposal_records"] = [record]
        state = core.record_outcome(state, batch, proposed, {**applied, "outcome": "closed_without_merge"})

        terminal = core.sync_prs(state, [{"number": 7, "topic_id": "net", "generation": 1, "status": "closed"}])
        pr = terminal["prs"]["net:1"]
        self.assertNotIn("proposal_records", pr)
        self.assertEqual(1, pr["terminal_audit"]["record_count"])
        self.assertEqual({"batch_hash", "proposal_hash", "result_hash"}, set(pr["terminal_audit"]["records"][0]))
        self.assertEqual(1, len(terminal["rejections"]))
        self.assertEqual("changed", terminal["notes"][PATH]["outcome"])

    def test_open_pr_retains_full_proposal_records(self):
        state = core.sync_prs(core.new_state(), [{"number": 7, "topic_id": "net", "generation": 1, "status": "open"}])
        state["prs"]["net:1"]["proposal_records"] = [{"proposal": {"version": 1}}]
        refreshed = core.sync_prs(state, [{"number": 7, "topic_id": "net", "generation": 1, "status": "open"}])
        self.assertEqual([{"proposal": {"version": 1}}], refreshed["prs"]["net:1"]["proposal_records"])

    def test_multiple_open_pr_generations_for_one_topic_are_rejected(self):
        prs = [
            {"number": 1, "topic_id": "net", "generation": 1, "status": "open"},
            {"number": 2, "topic_id": "net", "generation": 2, "status": "open"},
        ]
        with self.assertRaises(ValueError):
            core.sync_prs(core.new_state(), prs)

    def test_pr_size_and_empty_review_freeze(self):
        self.assertEqual(core.DEFAULT_CONFIG["max_notes_per_run"], 4)
        self.assertEqual(core.DEFAULT_CONFIG["max_pr_notes"], 16)
        self.assertEqual(core.DEFAULT_CONFIG["max_pr_lines"], 1200)
        below_limit = core.sync_prs(core.new_state(), [{
            "number": 4, "topic_id": "below", "generation": 1, "status": "open",
            "note_count": 15, "changed_lines": 1199,
        }])
        self.assertFalse(below_limit["prs"]["below:1"]["frozen"])
        state = core.sync_prs(core.new_state(), [{"number": 1, "topic_id": "net", "generation": 1, "status": "open", "note_count": 16}])
        self.assertTrue(state["prs"]["net:1"]["frozen"])
        line_limit = {"number": 3, "topic_id": "ai", "generation": 1, "status": "open", "changed_lines": 1200}
        self.assertTrue(core.sync_prs(state, [line_limit])["prs"]["ai:1"]["frozen"])
        empty_review = {"number": 2, "topic_id": "cs", "generation": 1, "status": "open", "review_count": 1}
        self.assertTrue(core.sync_prs(state, [empty_review])["prs"]["cs:1"]["frozen"])

    def test_owner_feedback_requires_verified_id_and_login_and_edits_requeue(self):
        state = core.sync_prs(core.new_state(), [{"number": 9, "topic_id": "net", "generation": 1, "status": "open"}])
        base = {"id": 5, "pr_number": 9, "kind": "inline", "body": "Fix this", "updated_at": "2026-01-01", "author": {"id": 42, "login": "owner"}}
        queued = core.ingest_feedback(state, [], [base], {"ids": [42], "logins": ["owner"]})
        self.assertEqual(1, len(queued))
        state["feedback"][queued[0]["key"]] = queued[0]
        self.assertEqual([], core.ingest_feedback(state, [], [base], {"ids": [42], "logins": ["owner"]}))
        edited = {**base, "body": "Fix this precisely", "updated_at": "2026-01-02"}
        self.assertEqual(1, len(core.ingest_feedback(state, [], [edited], {"ids": [42], "logins": ["owner"]})))
        spoof = {**base, "id": 6, "author": {"id": 1, "login": "owner"}}
        self.assertEqual([], core.ingest_feedback(state, [], [spoof], {"ids": [42], "logins": ["owner"]}))

    def test_empty_review_and_rest_user_identity_are_fingerprinted(self):
        state = core.sync_prs(core.new_state(), [{"number": 9, "topic_id": "net", "generation": 1, "status": "open"}])
        review = {
            "id": 77,
            "pull_request_number": 9,
            "kind": "review",
            "body": "",
            "state": "COMMENTED",
            "updated_at": "2026-01-01",
            "user": {"id": 42, "login": "owner"},
        }
        queued = core.ingest_feedback(state, [], [review], {"ids": [42], "logins": ["owner"]})
        self.assertEqual(1, len(queued))
        state["feedback"][queued[0]["key"]] = queued[0]
        changed_state = {**review, "state": "CHANGES_REQUESTED", "updated_at": "2026-01-02"}
        reconsidered = core.ingest_feedback(state, [], [changed_state], {"ids": [42], "logins": ["owner"]})
        self.assertEqual(1, len(reconsidered))
        self.assertNotEqual(queued[0]["revision"], reconsidered[0]["revision"])


class ProposalTests(unittest.TestCase):
    def test_dispositions_exactly_cover_guarded_sources(self):
        missing = {"version": 1, "edits": [], "dispositions": [], "feedback": []}
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, missing)

        extra = copy.deepcopy(missing)
        extra["dispositions"] = [
            {"path": PATH, "outcome": "keep", "reason": "Already sound."},
            {"path": "Vault/Home/Programming/NET/Unselected.md", "outcome": "keep", "reason": "Already sound."},
        ]
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, extra)

    def test_optional_feedback_decisions_have_strict_shape(self):
        decided = proposal(edit())
        decided["decisions"] = [
            {
                "feedback_key": "review:42:7",
                "fingerprint": "abc123",
                "decision": "reject",
                "reason": "The requested wording changes the learning target.",
            }
        ]
        core.apply_proposal({PATH: NOTE}, decided)

        invalid = copy.deepcopy(decided)
        invalid["decisions"][0]["decision"] = "approve"
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, invalid)

    def test_feedback_dispositions_exactly_cover_expected_owner_feedback(self):
        handled = proposal(edit(feedback_keys=["review:42:7"]))
        handled["feedback"] = [
            {"key": "review:42:7", "outcome": "implemented", "reason": "Applied the requested clarification."}
        ]
        core.apply_proposal({PATH: NOTE}, handled, expected_feedback_keys=["review:42:7"])

        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit()), expected_feedback_keys=["review:42:7"])

        invented = copy.deepcopy(handled)
        invented["feedback"][0]["key"] = "review:42:invented"
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, invented, expected_feedback_keys=["review:42:7"])

        duplicate = copy.deepcopy(handled)
        duplicate["feedback"].append(copy.deepcopy(duplicate["feedback"][0]))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, duplicate, expected_feedback_keys=["review:42:7"])

    def test_same_target_preserves_exact_metadata(self):
        result = core.apply_proposal({PATH: NOTE}, proposal(edit()))
        self.assertIn("scheduled asynchronous", result["sources"][PATH])
        bad = edit(after=edit()["after"].replace("stable_1", "stolen"))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(bad))

    def test_note_kind_cannot_bypass_identity_or_touch_card(self):
        bypass = edit(kind="note", before="stable_1", after="stolen", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(bypass))

    def test_replace_and_split_retire_old_identity_and_children_are_idless(self):
        replacement = CARD.replace("<!-- qard-id: stable_1 -->\n", "").replace("What is a task?", "What does a task represent?")
        result = core.apply_proposal({PATH: NOTE}, proposal(edit(kind="replace", learning_target="new", after=replacement)))
        self.assertEqual(["stable_1"], result["retired_ids"])
        second = "\n<!-- qard-location: {\"deck\":\"NET\",\"topic\":\"Card\"} -->\n> [!qard]- When is a task scheduled?\n> Its scheduler decides.\n"
        split = replacement + second
        result = core.apply_proposal({PATH: NOTE}, proposal(edit(kind="split", learning_target="new", after=split)))
        self.assertNotIn("qard-id", result["sources"][PATH])
        missing_child_metadata = replacement + "\n> [!qard]- When is a task scheduled?\n> Its scheduler decides.\n"
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit(kind="split", learning_target="new", after=missing_child_metadata)))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit(kind="split", learning_target="new", after=split.replace("> [!qard]- When", "<!-- qard-id: child -->\n> [!qard]- When"))))

    def test_reverse_linked_target_transformations_fail_closed(self):
        reverse_card = "<!-- qard-reverse: counterpart_1 -->\n" + CARD
        reverse_note = NOTE.replace(CARD, reverse_card)
        replacement = reverse_card.replace("<!-- qard-id: stable_1 -->\n", "").replace("What is a task?", "What does a task represent?")
        transformations = [
            edit(
                expected_hash=core.digest(reverse_note),
                before=reverse_card,
                after=replacement,
                kind="replace",
                learning_target="new",
            ),
            edit(
                expected_hash=core.digest(reverse_note),
                before=reverse_card,
                after=replacement + "\n<!-- qard-reverse: counterpart_1 -->\n<!-- qard-location: {\"deck\":\"NET\",\"topic\":\"Card\"} -->\n> [!qard]- Follow-up?\n> Answer.\n",
                kind="split",
                learning_target="new",
            ),
            edit(
                expected_hash=core.digest(reverse_note),
                before=reverse_card,
                after="",
                kind="remove",
                learning_target="retired",
            ),
        ]
        for transformation in transformations:
            with self.subTest(kind=transformation["kind"]), self.assertRaises(core.ProposalError):
                core.apply_proposal({PATH: reverse_note}, proposal(transformation))

    def test_split_with_native_blank_metadata_gap_requires_full_block(self):
        gapped_card = CARD.replace("<!-- qard-id: stable_1 -->\n> [!qard]", "<!-- qard-id: stable_1 -->\n\n> [!qard]")
        gapped_note = NOTE.replace(CARD, gapped_card)
        card_only = gapped_card[gapped_card.index("> [!qard]") :]
        card_only_after = card_only.replace("What is a task?", "What does a task represent?") + "\n> [!qard]- When is a task scheduled?\n> Its scheduler decides.\n"
        with self.assertRaises(core.ProposalError):
            core.apply_proposal(
                {PATH: gapped_note},
                proposal(
                    edit(
                        expected_hash=core.digest(gapped_note),
                        before=card_only,
                        after=card_only_after,
                        kind="split",
                        learning_target="new",
                    )
                ),
            )

        split = gapped_card.replace("<!-- qard-id: stable_1 -->\n", "").replace("What is a task?", "What does a task represent?")
        split += "\n<!-- qard-location: {\"deck\":\"NET\",\"topic\":\"Card\"} -->\n\n> [!qard]- When is a task scheduled?\n> Its scheduler decides.\n"
        result = core.apply_proposal(
            {PATH: gapped_note},
            proposal(
                edit(
                    expected_hash=core.digest(gapped_note),
                    before=gapped_card,
                    after=split,
                    kind="split",
                    learning_target="new",
                )
            ),
        )
        self.assertEqual(["stable_1"], result["retired_ids"])
        self.assertNotIn("qard-id", result["sources"][PATH])

    def test_uppercase_header_cannot_bypass_note_identity_guard(self):
        uppercase_card = CARD.replace("[!qard]", "[!QARD]")
        uppercase_note = NOTE.replace(CARD, uppercase_card)
        bypass = edit(
            expected_hash=core.digest(uppercase_note),
            kind="note",
            before="A unit of asynchronous work.",
            after="A unit of scheduled asynchronous work.",
            learning_target="same",
        )
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: uppercase_note}, proposal(bypass))

    def test_qard_header_literal_inside_quoted_fence_is_not_a_second_card(self):
        fenced_card = CARD.replace(
            "> A unit of asynchronous work.\n",
            "> A unit of asynchronous work.\n> ```markdown\n> [!qard]- Literal example\n> Not a card.\n> ```\n",
        )
        fenced_note = NOTE.replace(CARD, fenced_card)
        self.assertEqual(1, len(core._qard_spans(fenced_note)))
        rewritten = fenced_card.replace("A unit of asynchronous work.", "A unit of scheduled asynchronous work.")
        result = core.apply_proposal(
            {PATH: fenced_note},
            proposal(edit(expected_hash=core.digest(fenced_note), before=fenced_card, after=rewritten)),
        )
        self.assertEqual(1, len(core._qard_spans(result["sources"][PATH])))

    def test_add_first_or_followup_uses_noncard_anchor_and_is_idless_collapsed(self):
        before = "# Questions\n"
        after = before + "\n> [!qard]- What is bounded?\n> A focused expected answer.\n"
        added = edit(before=before, after=after, kind="add", learning_target="new")
        result = core.apply_proposal({PATH: NOTE}, proposal(added))
        self.assertIn("What is bounded?", result["sources"][PATH])
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit(before=before, after=after.replace("[!qard]-", "[!qard]+"), kind="add", learning_target="new")))
        identity_anchor = "<!-- qard-id: stable_1 -->"
        hijack = identity_anchor + "\n> [!qard]- New target\n> New answer."
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit(before=identity_anchor, after=hijack, kind="add", learning_target="new")))

    def test_coordinated_disjoint_note_and_card_edits(self):
        prose = edit(kind="note", before="Intro text.", after="Concrete intro text.", learning_target="same")
        result = core.apply_proposal({PATH: NOTE}, proposal(prose, edit()))
        self.assertIn("Concrete intro", result["sources"][PATH])
        self.assertIn("scheduled asynchronous", result["sources"][PATH])

    def test_frontmatter_block_ids_and_hidden_metadata_are_protected(self):
        with_id = NOTE.replace("Intro text.", "Intro text. ^stable-block")
        frontmatter = edit(expected_hash=core.digest(with_id), kind="note", before="status: Creation", after="status: Done", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: with_id}, proposal(frontmatter))
        block = edit(expected_hash=core.digest(with_id), kind="note", before="Intro text. ^stable-block", after="Intro text.", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: with_id}, proposal(block))
        metadata_note = NOTE.replace("Intro text.", "Intro text.\n<!-- qard-source: imported -->")
        hidden = edit(expected_hash=core.digest(metadata_note), kind="note", before="<!-- qard-source: imported -->", after="", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: metadata_note}, proposal(hidden))

    def test_wikilink_removal_requires_explicit_target_rationale(self):
        linked = NOTE.replace("Intro text.", "Intro [[Programming/NET/Tasks|task]] text.")
        vague = edit(expected_hash=core.digest(linked), kind="note", before="Intro [[Programming/NET/Tasks|task]] text.", after="Intro task text.", learning_target="same", reason="Simplify prose.")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: linked}, proposal(vague))
        explicit = copy.deepcopy(vague)
        explicit["reason"] = "Remove wikilink Programming/NET/Tasks because the target is obsolete."
        core.apply_proposal({PATH: linked}, proposal(explicit))

    def test_whole_note_cas_overlap_schema_and_frozen_feedback(self):
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE + "changed"}, proposal(edit()))
        malformed = proposal(edit())
        malformed["surprise"] = True
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, malformed)
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit()), required_feedback_keys=["owner:1"])
        allowed = edit(feedback_keys=["owner:1"])
        core.apply_proposal({PATH: NOTE}, proposal(allowed), required_feedback_keys=["owner:1"])

    def test_sources_are_answer_side_and_circular_question_links_fail(self):
        url = "https://learn.example/task"
        sourced = edit(after=edit()["after"].replace("scheduled asynchronous work.", f"scheduled asynchronous work. [{url}]({url})"), sources=[{"url": url, "claim": "Task semantics", "version": "1"}])
        core.apply_proposal({PATH: NOTE}, proposal(sourced))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit(after=edit()["after"] + "[[Card#Questions]]")))

    def test_semantic_fixture_overview_followups_paraphrases_and_coordinated_note_repair(self):
        overview_url = "https://learn.example/tasks/overview"
        scheduling_url = "https://learn.example/tasks/scheduling"
        anchor = "# Questions\n"
        cards = anchor + f"""
> [!qard]- What does a task represent, and what does it not guarantee?
> It represents asynchronous work; it does not guarantee a dedicated thread. [Overview]({overview_url})

> [!qard]- What determines where task work executes?
> The scheduler and operation shape determine execution; I/O completion may resume without occupying a thread while pending. [Scheduling]({scheduling_url})
"""
        add_cards = edit(
            before=anchor,
            after=cards,
            kind="add",
            learning_target="new",
            reason="Add one overview and one focused follow-up to close the scheduler gap without duplicating trivia.",
            essential_meanings=[
                "Task is an abstraction over asynchronous work rather than a thread.",
                "Scheduling and operation shape determine execution behavior.",
            ],
            sources=[
                {"url": overview_url, "claim": "Task abstraction", "version": "NET 10"},
                {"url": scheduling_url, "claim": "Scheduling behavior", "version": "NET 10"},
            ],
        )
        repair = edit(
            kind="note",
            before="Intro text.",
            after="A task represents asynchronous work; its scheduler and operation shape determine whether execution occupies a thread.",
            learning_target="same",
            reason="Coordinate the owning-note explanation with the new scheduler question.",
        )
        result = core.apply_proposal({PATH: NOTE}, proposal(repair, add_cards))
        candidate = result["sources"][PATH]
        self.assertIn("does not guarantee a dedicated thread", candidate)
        self.assertIn("scheduler and operation shape", candidate)
        self.assertNotIn(add_cards["essential_meanings"][0], candidate)

    def test_visible_grading_template_is_rejected(self):
        bad = edit(after=edit()["after"] + "> Essential meanings: exact phrase\n")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(bad))

    def test_rejected_equivalent_blocked_unrelated_same_file_allowed(self):
        rejected = [{"fingerprint": core._fingerprint(edit()), "semantic_fingerprint": core._fingerprint(edit(), semantic=True), "before": CARD, "after": edit()["after"], "reconsidered_by": []}]
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposal(edit()), rejected)
        unrelated = edit(kind="note", before="Intro text.", after="Better intro text.", learning_target="same")
        core.apply_proposal({PATH: NOTE}, proposal(unrelated), rejected)

    def test_reconsideration_is_bound_to_the_matching_rejection(self):
        key = "review:42:reconsider"
        first = edit(after=CARD.replace("asynchronous", "queued asynchronous"))
        second = edit(after=CARD.replace("asynchronous", "scheduled asynchronous"))
        rejected = [
            {
                "fingerprint": core._fingerprint(first),
                "semantic_fingerprint": core._fingerprint(first, semantic=True),
                "reconsidered_by": [key],
            },
            {
                "fingerprint": core._fingerprint(second),
                "semantic_fingerprint": core._fingerprint(second, semantic=True),
                "reconsidered_by": [],
            },
        ]
        proposed = proposal({**second, "feedback_keys": [key]})
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({PATH: NOTE}, proposed, rejected)

        rejected[1]["reconsidered_by"] = [key]
        core.apply_proposal({PATH: NOTE}, proposed, rejected)

    def test_record_rejection_keeps_full_text_and_lineage(self):
        replacement = CARD.replace("<!-- qard-id: stable_1 -->\n", "").replace("What is a task?", "What does a task represent?")
        proposed = proposal(edit(kind="replace", learning_target="new", after=replacement))
        applied = core.apply_proposal({PATH: NOTE}, proposed)
        applied["outcome"] = "closed_without_merge"
        note = {"path": PATH, "content": NOTE, "hash": core.digest(NOTE), "violations": []}
        state = core.record_outcome(core.new_state(), {"notes": [note], "rules_hash": "r"}, proposed, applied)
        self.assertEqual(CARD, state["rejections"][0]["before"])
        self.assertEqual("stable_1", state["rejections"][0]["lineage"][0]["old_ids"][0])

    def test_record_outcome_rejects_incomplete_dispositions(self):
        notes = [
            {"path": PATH, "content": NOTE, "hash": core.digest(NOTE), "violations": []},
            {
                "path": "Vault/Home/Programming/NET/Second.md",
                "content": "# Second\n",
                "hash": core.digest("# Second\n"),
                "violations": [],
            },
        ]
        applied = core.apply_proposal({PATH: NOTE}, proposal(edit()))
        with self.assertRaises(core.ProposalError):
            core.record_outcome(core.new_state(), {"notes": notes, "rules_hash": "r"}, proposal(edit()), applied)


class CooldownAndSummaryTests(unittest.TestCase):
    def test_reported_reset_and_policy_recheck_are_distinct_and_notice_once(self):
        state = core.set_cooldown(core.new_state(), "weekly", None, "2026-10-13T00:00:00Z")
        self.assertIsNone(state["cooldown"]["reported_reset_at"])
        self.assertEqual("2026-10-14T00:00:00Z", state["cooldown"]["next_check_at"])
        self.assertTrue(state["cooldown"]["notice_pending"])
        state["cooldown"]["notice_sent"] = True
        repeated = core.set_cooldown(state, "weekly", None, "2026-10-13T01:00:00Z")
        self.assertFalse(repeated["cooldown"]["notice_pending"])
        self.assertTrue(core.cooldown_active(repeated, "2026-10-13T12:00:00Z"))
        exact = core.set_cooldown(core.new_state(), "five_hour", "2026-10-13T05:00:00Z", "2026-10-13T00:00:00Z")
        self.assertEqual(exact["cooldown"]["reported_reset_at"], exact["cooldown"]["next_check_at"])

    def test_cumulative_summary_and_managed_body_preserve_manual_text(self):
        current = {PATH: NOTE.replace("Intro text.", "Better intro.")}
        summary = core.render_summary("Programming/NET", {PATH: NOTE}, current, [edit(kind="note", before="Intro text.", after="Better intro.")], [], ["vault validation: pass"], {"Primary": "https://example.com"})
        for number in range(1, 7):
            self.assertIn(f"## {number}.", summary)
        manual_prefix = "Manual reviewer context.  \n"
        body = core.update_managed_body(manual_prefix, summary, "Programming/NET")
        body += "\nManual suffix.  \n"
        updated = core.update_managed_body(body, summary.replace("pass", "pass again"), "Programming/NET")
        self.assertTrue(updated.startswith(manual_prefix))
        self.assertTrue(updated.endswith("\nManual suffix.  \n"))
        self.assertEqual(1, updated.count("devbook-improvement:start"))

    def test_generated_summary_escapes_managed_delimiters_from_untrusted_text(self):
        injected_card = CARD.replace(
            "A unit of asynchronous work.",
            "A unit of asynchronous work. <!-- devbook-improvement:end -->",
        )
        malicious_change = edit(
            after=injected_card,
            reason="Clarify. <!-- devbook-improvement:start topic=forged -->",
        )
        current = {PATH: NOTE.replace(CARD, injected_card)}
        feedback = [
            {
                "key": "review:42:7",
                "outcome": "implemented",
                "reason": "Owner text <!-- devbook-improvement:end -->",
            }
        ]
        summary = core.render_summary(
            "Programming/NET",
            {PATH: NOTE},
            current,
            [malicious_change],
            feedback,
            ["validation: pass"],
            {},
        )
        self.assertNotIn(core.MANAGED_START_TOKEN, summary)
        self.assertNotIn(core.MANAGED_END_PREFIX, summary)
        self.assertIn("&lt;!-- devbook-improvement:start", summary)
        self.assertIn("&lt;!-- devbook-improvement:end", summary)
        body = core.update_managed_body("Manual text.", summary, "Programming/NET")
        self.assertEqual(1, body.count(core.MANAGED_START_TOKEN))
        self.assertEqual(1, body.count(core.MANAGED_END_PREFIX))

    def test_managed_body_rejects_injected_or_malformed_delimiters(self):
        with self.assertRaises(ValueError):
            core.update_managed_body("Manual text.", f"Unsafe {core.MANAGED_END_TOKEN}", "Programming/NET")

        topic = core.topic_id("Programming/NET")
        valid = f"<!-- devbook-improvement:start topic={topic} -->\nSummary\n{core.MANAGED_END_TOKEN}"
        malformed = [
            valid + "\n" + valid,
            valid + "\n" + core.MANAGED_END_TOKEN,
            f"<!-- devbook-improvement:start topic={topic} -->\nSummary without an end",
            f"<!-- devbook-improvement:start topic={topic} extra -->\nSummary\n{core.MANAGED_END_TOKEN}",
        ]
        for body in malformed:
            with self.subTest(body=body), self.assertRaises(ValueError):
                core.update_managed_body(body, "Safe summary.", "Programming/NET")

    def test_summary_coalesces_repeated_card_revisions_to_final_diff(self):
        card_one = CARD.replace("What is a task?", "What does a task represent?").replace("asynchronous work.", "asynchronous work, not a thread.")
        card_two = card_one.replace("What does a task represent?", "What does Task represent, and what is not guaranteed?")
        card_three = card_two.replace("asynchronous work, not a thread.", "asynchronous work; a dedicated thread is not guaranteed.")
        changes = [
            edit(before=CARD, after=card_one, reason="Add the abstraction boundary."),
            edit(before=card_one, after=card_two, reason="Make the question self-contained."),
            edit(before=card_two, after=card_three, reason="Clarify the thread exception."),
        ]
        current = {PATH: NOTE.replace(CARD, card_three)}
        summary = core.render_summary(
            "Programming/NET",
            {PATH: NOTE},
            current,
            changes,
            [],
            ["validation: pass"],
            {},
            {PATH: "https://github.example/blob/branch/Card.md"},
        )

        self.assertIn("Rewritten: 1", summary)
        self.assertEqual(1, summary.count("Coverage rationale:"))
        self.assertIn("What is a task?", summary)
        self.assertIn("What does Task represent, and what is not guaranteed?", summary)
        self.assertIn("Qard ID `stable_1` preserved", summary)
        self.assertIn("https://github.example/blob/branch/Card.md", summary)
        self.assertNotIn("<!-- qard-", summary)

    def test_summary_omits_reverted_edit(self):
        changed = CARD.replace("What is a task?", "What does a task represent?")
        changes = [
            edit(before=CARD, after=changed, reason="First wording."),
            edit(before=changed, after=CARD, reason="Restore original wording."),
        ]
        summary = core.render_summary("Programming/NET", {PATH: NOTE}, {PATH: NOTE}, changes, [], [], {})

        self.assertIn("Rewritten: 0", summary)
        self.assertIn("No significant question changes.", summary)


if __name__ == "__main__":
    unittest.main()
