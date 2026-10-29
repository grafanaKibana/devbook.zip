"""Commit-owned note dates, tested only in disposable Git repositories."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "note_dates.py"
spec = importlib.util.spec_from_file_location("note_dates", SCRIPT)
dates = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dates)
OLD = "2020-01-02T03:04:05.000Z"
LATER = "2021-02-03T04:05:06.000Z"
NOW = "2026-10-28T12:00:00.000Z"
NEXT = "2026-10-28T13:00:00.000Z"


class NoteDateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.com")

    def git(self, *args, instant=None):
        env = os.environ.copy()
        if instant:
            env.update(GIT_AUTHOR_DATE=instant, GIT_COMMITTER_DATE=instant)
        result = subprocess.run(["git", *args], cwd=self.root, capture_output=True, env=env, check=True)
        return result.stdout.decode()

    def write(self, path="Vault/Home/Note.md", text="---\npublish: true\n---\nNote.\n"):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode())
        self.git("add", "--", path)
        return target

    def commit(self, instant=OLD):
        self.git("commit", "-qm", "fixture", instant=instant)

    def read_dates(self, path="Vault/Home/Note.md"):
        return dates._dates((self.root / path).read_bytes())

    def cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), "--backfill-created", *args],
                              cwd=self.root, capture_output=True, text=True)

    def test_bootstrap_uses_source_history_and_survives_checkout(self):
        path = self.write()
        self.commit()
        self.write("Web/content/Note.md", "old export\n")
        self.commit(LATER)
        os.utime(path, (100000, 100000))
        changed = dates.prepare(self.root, NOW)
        self.assertEqual(set(changed), {"Vault/Home/Note.md"})
        self.assertEqual(changed["Vault/Home/Note.md"], hashlib.sha256(path.read_bytes()).digest())
        self.assertEqual(self.read_dates(), {"created": OLD, "modified": OLD})
        self.assertNotIn(b"published:", path.read_bytes())
        self.commit(NOW)
        before = path.read_bytes()
        path.unlink()
        self.git("restore", "--worktree", "--", "Vault/Home/Note.md")
        self.assertEqual(dates.prepare(self.root, NEXT), {})
        self.assertEqual(path.read_bytes(), before)

    def test_content_edit_is_idempotent_until_another_pending_edit(self):
        path = self.write(text=f'---\npublish: false\ncreated: "{OLD}"\nmodified: "{OLD}"\n---\nOriginal.\n')
        self.commit()
        self.write(text=path.read_text().replace("Original.", "Changed."))
        dates.prepare(self.root, NOW)
        self.assertEqual(self.read_dates()["modified"], NOW)
        self.assertEqual(dates.prepare(self.root, NEXT), {})
        self.write(text=path.read_text().replace("Changed.", "Changed again."))
        dates.prepare(self.root, NEXT)
        self.assertEqual(self.read_dates(), {"created": OLD, "modified": NEXT})

    def test_date_only_edits_preserve_head_modified_and_published_bytes(self):
        original = f'---\npublish: true\ncreated: "{OLD}"\nmodified: "{OLD}"\npublished: not-a-date # Syncer owns this\npublishDate: [leave, untouched]\n---\nOriginal.\n'
        path = self.write(text=original)
        self.commit()
        changed = original.replace(f'created: "{OLD}"', f'created: "{LATER}"')
        changed = changed.replace(f'modified: "{OLD}"', f'modified: "{NEXT}"')
        self.write(text=changed)
        dates.prepare(self.root, NOW)
        self.assertEqual(self.read_dates(), {"created": LATER, "modified": OLD})
        self.assertIn('published: not-a-date # Syncer owns this\npublishDate: [leave, untouched]\n', path.read_text())
        with self.assertRaisesRegex(dates.NoteDateError, "Only created and modified"):
            dates._with_dates(path.read_bytes(), {"published": NOW})

    def test_published_only_change_does_not_advance_modified(self):
        text = f'---\ncreated: "{OLD}"\nmodified: "{OLD}"\npublished: arbitrary one\n---\nSame.\n'
        self.write(text=text)
        self.commit()
        path = self.write(text=text.replace("arbitrary one", "arbitrary two"))
        self.assertEqual(dates.prepare(self.root, NOW), {})
        self.assertEqual(self.read_dates()["modified"], OLD)
        self.assertIn("published: arbitrary two", path.read_text())

    def test_staged_rename_preserves_dates_and_follows_old_history(self):
        old = self.write()
        self.commit()
        new = old.with_name("Renamed note.md")
        self.git("mv", str(old.relative_to(self.root)), str(new.relative_to(self.root)))
        self.assertEqual(set(dates.prepare(self.root, NOW)), {"Vault/Home/Renamed note.md"})
        self.assertEqual(self.read_dates("Vault/Home/Renamed note.md"), {"created": OLD, "modified": OLD})

    def test_aliases_are_preserved_with_canonical_dates_added(self):
        original = f'---\npublish: true\ncreated_at: "{OLD}"\nlastmod: "{LATER}"\nsummary: Keep this.\n---\n```text\ncreated: this is code\n```\n'
        path = self.write(text=original)
        self.commit()
        self.assertTrue(dates.prepare(self.root, NOW))
        self.assertIn('created_at: "' + OLD + '"', path.read_text())
        self.assertEqual(dates._content(original.encode()), dates._content(path.read_bytes()))
        self.assertEqual(self.read_dates(), {"created": OLD, "modified": LATER})

    def test_new_note_without_frontmatter_and_crlf_are_stable(self):
        path = self.write(text="A new note.\r\n")
        dates.prepare(self.root, NOW)
        before = path.read_bytes()
        self.assertIn(b"\r\n", before)
        self.assertEqual(dates.prepare(self.root, NEXT), {})
        self.assertEqual(self.read_dates(), {"created": NOW, "modified": NOW})
        self.assertEqual(path.read_bytes(), before)

    def test_partial_staging_or_malformed_second_note_blocks_entire_batch(self):
        first = self.write("Vault/Home/First.md")
        second = self.write("Vault/Home/Second.md")
        self.commit()
        second.write_text(second.read_text().replace("Note.", "Unstaged."))
        original = first.read_bytes()
        with self.assertRaisesRegex(dates.NoteDateError, "unstaged"):
            dates.prepare(self.root, NOW)
        self.assertEqual(first.read_bytes(), original)
        self.git("restore", "--worktree", "--", str(second.relative_to(self.root)))
        self.write("Vault/Home/Second.md", second.read_text().replace("publish: true", "publish: true\ncreated: not-a-date"))
        with self.assertRaisesRegex(dates.NoteDateError, "ISO 8601"):
            dates.prepare(self.root, NOW)
        self.assertEqual(first.read_bytes(), original)

    def test_prepare_rejects_changes_since_caller_snapshot(self):
        path = self.write()
        self.commit()
        expected = {"Vault/Home/Note.md": hashlib.sha256(path.read_bytes()).digest()}
        self.write(text=path.read_text().replace("Note.", "Concurrent staged edit."))
        before = path.read_bytes()
        with self.assertRaisesRegex(dates.NoteDateError, "changed before date preparation"):
            dates.prepare(self.root, NOW, expected=expected)
        self.assertEqual(path.read_bytes(), before)
        self.assertIsNone(self.read_dates()["created"])

    def test_prepare_detects_same_path_editor_write_during_git_add(self):
        path = self.write()
        self.commit()
        original_git = dates._git
        def race(root, *args, **kwargs):
            if "add" in args:
                path.write_text(path.read_text().replace("Note.", "External edit."))
            return original_git(root, *args, **kwargs)
        with mock.patch.object(dates, "_git", side_effect=race):
            with self.assertRaisesRegex(dates.NoteDateError, "concurrent edits"):
                dates.prepare(self.root, NOW)
        self.assertIn("External edit.", path.read_text())

    def test_generated_changelog_preserves_body_and_restores_dates(self):
        original = f'---\npublish: true\ncreated: "{OLD}"\nmodified: "{OLD}"\n---\nGenerated.\n'
        path = self.write("Vault/Home/Changelog.md", original)
        self.commit()
        generated = "---\npublish: true\n---\nGenerated.\n"
        self.write("Vault/Home/Changelog.md", generated)
        dates.prepare(self.root, NOW)
        self.assertEqual(path.read_text(), original)
        self.write("Vault/Home/Changelog.md", generated.replace("Generated.", "New release."))
        dates.prepare(self.root, NEXT)
        self.assertEqual(self.read_dates("Vault/Home/Changelog.md"), {"created": OLD, "modified": NEXT})
        self.assertTrue(path.read_text().endswith("New release.\n"))

    def test_literal_brackets_have_independent_histories(self):
        self.write("Vault/Home/A[1].md", "---\npublish: true\n---\n" + "Bracket source content.\n" * 40)
        self.commit(OLD)
        self.write("Vault/Home/A1.md", "---\npublish: true\n---\n" + "Unrelated plain note content.\n" * 40)
        self.commit(LATER)
        dates.prepare(self.root, NOW)
        self.assertEqual(self.read_dates("Vault/Home/A[1].md")["created"], OLD)
        self.assertEqual(self.read_dates("Vault/Home/A1.md")["created"], LATER)

    def test_scope_excludes_templates_assets_settings_and_untracked_notes(self):
        self.write()
        ignored = {}
        for name in ("Vault/Templates/Template.md", "Vault/Assets/Attachment.md", "Vault/.obsidian/State.md"):
            ignored[name] = self.write(name, "Untouched.\n")
        self.commit()
        untracked = self.root / "Vault/Home/Untracked.md"
        untracked.write_text("Untracked.\n")
        self.assertEqual(set(dates.prepare(self.root, NOW)), {"Vault/Home/Note.md"})
        for path in ignored.values():
            self.assertEqual(path.read_text(), "Untouched.\n")
        self.assertEqual(untracked.read_text(), "Untracked.\n")

    def test_invalid_pending_cache_blocks_before_source_writes(self):
        path = self.write()
        self.commit()
        original = path.read_bytes()
        cache_path = self.root / self.git("rev-parse", "--git-path", "note-dates-pending.json").strip()
        cache_path.write_text('{"Vault/Home/Note.md":{"head":"broken"}}')
        with self.assertRaisesRegex(dates.NoteDateError, "Invalid pending"):
            dates.prepare(self.root, NOW)
        self.assertEqual(path.read_bytes(), original)

    def test_shallow_backfill_requires_history_but_complete_dates_do_not(self):
        self.write()
        self.commit()
        clone = self.root / "clone"
        subprocess.run(["git", "clone", "-q", "--depth=1", self.root.as_uri(), str(clone)], check=True)
        path = clone / "Vault/Home/Note.md"
        before = path.read_bytes()
        with self.assertRaisesRegex(dates.NoteDateError, "Full Git history"):
            dates.prepare(clone, NOW)
        self.assertEqual(path.read_bytes(), before)
        path.write_text(f'---\npublish: true\ncreated: "{OLD}"\nmodified: "{OLD}"\n---\nNote.\n')
        subprocess.run(["git", "add", "."], cwd=clone, check=True)
        self.assertEqual(dates.prepare(clone, NOW), {})

    def test_cli_backfill_is_dry_run_by_default_and_write_never_stages(self):
        original = '---\npublish: true\nmodified: arbitrary existing value\npublished: untouched publication value\n---\nNote.\n'
        path = self.write(text=original)
        self.commit()
        index_before = self.git("show", ":Vault/Home/Note.md")
        preview = self.cli()
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertEqual(json.loads(preview.stdout), {"mode": "dry-run", "changed": ["Vault/Home/Note.md"]})
        self.assertEqual(path.read_text(), original)
        applied = self.cli("--write")
        self.assertEqual(applied.returncode, 0, applied.stderr)
        self.assertEqual(json.loads(applied.stdout)["changed"], ["Vault/Home/Note.md"])
        self.assertIn(f'created: "{OLD}"', path.read_text())
        self.assertEqual(path.read_text().replace(f'created: "{OLD}"\n', ""), original)
        self.assertEqual(self.git("show", ":Vault/Home/Note.md"), index_before)
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "")
        repeated = self.cli("--write")
        self.assertEqual(repeated.returncode, 0, repeated.stderr)
        self.assertEqual(json.loads(repeated.stdout)["changed"], [])
        self.git("add", "Vault/Home/Note.md")
        self.commit()
        self.assertEqual(json.loads(self.cli("--write").stdout)["changed"], [])

    def test_cli_backfill_refuses_unstaged_and_staged_source_edits(self):
        path = self.write()
        self.commit()
        path.write_text(path.read_text().replace("Note.", "Unstaged."))
        self.assertNotEqual(self.cli("--write").returncode, 0)
        self.git("add", "Vault/Home/Note.md")
        before = path.read_bytes()
        result = self.cli("--write")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("clean committed source", result.stderr)
        self.assertEqual(path.read_bytes(), before)

    def test_cli_preserves_existing_creation_alias_and_arbitrary_modified(self):
        original = f'---\ncreated_at: "{LATER}"\nmodified: custom legacy text\n---\nAlias.\n'
        path = self.write(text=original)
        self.commit(OLD)
        result = self.cli("--write")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f'created: "{LATER}"', path.read_text())
        self.assertEqual(path.read_text().replace(f'created: "{LATER}"\n', ""), original)


if __name__ == "__main__":
    unittest.main()
