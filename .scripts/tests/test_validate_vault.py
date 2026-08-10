from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "validate-vault.py"
SPEC = importlib.util.spec_from_file_location("validate_vault", SCRIPT)
assert SPEC and SPEC.loader
validate_vault = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = validate_vault
SPEC.loader.exec_module(validate_vault)


VALID_FRONTMATTER = """---
topic:
  - Programming
subtopic: [NET]
level: ["2"]
priority: Medium
status: Creation
publish: false
---
"""


class VaultValidatorTests(unittest.TestCase):
    def make_repo(self) -> tuple[tempfile.TemporaryDirectory[str], Path]:
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        (root / "Vault" / "Home" / "Topic").mkdir(parents=True)
        (root / "Vault" / "Assets").mkdir(parents=True)
        (root / ".scripts").mkdir()
        return temp, root

    def write_note(self, root: Path, relative: str, content: str) -> validate_vault.Note:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return validate_vault.load_note(path, root)

    def test_frontmatter_requires_typed_arrays_and_allowed_scalars(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/Bad.md",
            """---
topic: Programming
subtopic: [NET]
level: [5]
priority: Urgent
status:
publish: "true"
---
# Bad
""",
        )

        issues = validate_vault.validate_frontmatter(note)
        codes = {issue.code for issue in issues}
        self.assertIn("frontmatter.type", codes)
        self.assertIn("frontmatter.level", codes)
        self.assertIn("frontmatter.priority", codes)

    def test_staged_mode_checks_only_selected_notes_without_baseline(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        hub = root / "Vault/Home/Topic/Topic.md"
        hub.write_text(
            "---\ntags: [FolderNote]\npublish: false\n---\n# Intro\n", encoding="utf-8"
        )
        selected = root / "Vault/Home/Topic/Selected.md"
        selected.write_text(VALID_FRONTMATTER.replace("status: Creation", "status:"), encoding="utf-8")
        ignored = root / "Vault/Home/Topic/Ignored.md"
        ignored.write_text(VALID_FRONTMATTER.replace("priority: Medium", "priority: Urgent"), encoding="utf-8")

        with patch.object(validate_vault, "staged_paths", return_value=[selected]):
            issues, checked, suppressed = validate_vault.validate(root, "staged")

        self.assertEqual(1, checked)
        self.assertEqual(0, suppressed)
        self.assertTrue(any(issue.path.endswith("Selected.md") for issue in issues))
        self.assertFalse(any(issue.path.endswith("Ignored.md") for issue in issues))

    def test_staged_mode_checks_misplaced_attachment_without_markdown(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        attachment = root / "Vault/Home/Topic/diagram.png"
        attachment.write_bytes(b"png")

        with patch.object(validate_vault, "staged_paths", return_value=[attachment]):
            issues, checked, _suppressed = validate_vault.validate(root, "staged")

        self.assertEqual(0, checked)
        self.assertTrue(any(issue.code == "attachment.location" for issue in issues))

    def test_staged_mode_ignores_images_outside_vault(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        image = root / "docs/assets/site-home.png"
        image.parent.mkdir(parents=True)
        image.write_bytes(b"png")

        with patch.object(validate_vault, "staged_paths", return_value=[image]):
            issues, checked, _suppressed = validate_vault.validate(root, "staged")

        self.assertEqual(0, checked)
        self.assertEqual([], issues)

    def test_folder_hub_name_and_tag_are_enforced(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        wrong = self.write_note(
            root,
            "Vault/Home/Topic/Wrong.md",
            "---\ntags: [FolderNote]\npublish: false\n---\n",
        )
        self.assertEqual("folder-note.name", validate_vault.validate_folder_note(wrong, root / "Vault/Home")[0].code)

        expected = self.write_note(
            root,
            "Vault/Home/Topic/Topic.md",
            "---\ntags: []\npublish: false\n---\n",
        )
        issues = validate_vault.validate_expected_hubs(
            root / "Vault/Home", {expected.path: expected, wrong.path: wrong}, [expected.path.parent]
        )
        self.assertEqual(["folder-note.tag"], [issue.code for issue in issues])

    def test_wikilinks_resolve_by_path_or_note_name(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        target = self.write_note(
            root,
            "Vault/Home/Topic/Target.md",
            VALID_FRONTMATTER + "# Heading\n",
        )
        source = self.write_note(
            root,
            "Vault/Home/Topic/Source.md",
            VALID_FRONTMATTER + "[[Target#Heading|label]], ![[Target]], and [[Missing]]\n",
        )
        index = validate_vault.VaultIndex(root / "Vault")
        issues = validate_vault.validate_wikilinks(source, index)
        self.assertEqual(1, len(issues))
        self.assertEqual("missing", issues[0].discriminator)
        self.assertIsNotNone(index.resolve(source.path, target.path.stem))

    def test_wikilink_headings_must_exist(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        self.write_note(
            root,
            "Vault/Home/Topic/Target.md",
            VALID_FRONTMATTER
            + "# Existing Heading\n# C#\n# Closed Heading ###\n# Cache Keys and `Vary`\n"
            + "# **Bold Boundary**\n# ~~Retired~~ Boundary\n"
            + "# [Linked Boundary](https://example.com)\n"
            + "Setext Boundary\n--------\n"
            + "~~~text\n# Hidden Heading\n~~~\n"
            + "````text\n# Hidden Long Fence\n```\n# Still Hidden\n````\n",
        )
        asset = root / "Vault/Assets/manual.pdf"
        asset.parent.mkdir(parents=True, exist_ok=True)
        asset.write_bytes(b"\xff\xfe")
        source = self.write_note(
            root,
            "Vault/Home/Topic/Source.md",
            VALID_FRONTMATTER
            + "[[Target#Existing Heading]], [[Target#C#]], [[Target#Closed Heading]], "
            + "[[Target#Cache Keys and Vary]], "
            + "[[Target#Bold Boundary]], [[Target#Retired Boundary]], "
            + "[[Target#Linked Boundary]], [[Target#Setext Boundary]], "
            + "[[Target#Hidden Heading]], [[Target#Hidden Long Fence]], [[Target#Still Hidden]], "
            + "[[https://example.com/page#section]], "
            + "![[Assets/manual.pdf#page=3]], and [[Target#Missing Heading]]\n",
        )
        issues = validate_vault.validate_wikilinks(source, validate_vault.VaultIndex(root / "Vault"))
        self.assertEqual(
            [
                "target#hidden heading",
                "target#hidden long fence",
                "target#still hidden",
                "target#missing heading",
            ],
            [issue.discriminator for issue in issues],
        )

    def test_wikilinks_inside_tabsdown_are_live(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        source = self.write_note(
            root,
            "Vault/Home/Topic/Source.md",
            VALID_FRONTMATTER
            + "~~~~~tabsdown\ntab: Links\n[[Missing In Tabs]]\n"
            + "```text\n[[Ignored In Code]]\n```\n~~~~~\n",
        )
        issues = validate_vault.validate_wikilinks(source, validate_vault.VaultIndex(root / "Vault"))
        self.assertEqual(["missing in tabs"], [issue.discriminator for issue in issues])

    def test_attachments_must_live_under_assets(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        good = root / "Vault/Assets/image.png"
        bad = root / "Vault/Home/Topic/image.png"
        good.write_bytes(b"png")
        bad.write_bytes(b"png")
        issues = validate_vault.validate_attachment_locations(root / "Vault", [good, bad])
        self.assertEqual(["Vault/Home/Topic/image.png"], [issue.path for issue in issues])

    def test_published_note_needs_content_reference_and_example_signal(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/Published.md",
            VALID_FRONTMATTER.replace("publish: false", "publish: true") + "# Intro\nToo short.\n",
        )
        self.assertEqual(
            {"publish.content", "publish.reference", "publish.example"},
            {issue.code for issue in validate_vault.validate_published(note)},
        )

    def test_dataview_blocks_are_not_forbidden_by_this_validator(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/LegacyQuery.md",
            VALID_FRONTMATTER + "```dataview\nLIST FROM \"Home\"\n```\n",
        )
        self.assertEqual([], validate_vault.validate_residue(note))

    def test_code_fences_require_a_language(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/Fences.md",
            VALID_FRONTMATTER
            + "```\nbare\n```\n\n```text\ntagged\n```\n\n~~~csharp\nvar value = 1;\n~~~\n",
        )

        issues = validate_vault.validate_code_fences(note)

        self.assertEqual(["markdown.code-fence-language"], [issue.code for issue in issues])

    def test_code_fences_inside_tabsdown_require_a_language(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/TabsdownFences.md",
            VALID_FRONTMATTER
            + "~~~~~tabsdown\ntab: Example\n\n```\nbare\n```\n\n```text\ntagged\n```\n~~~~~\n",
        )

        issues = validate_vault.validate_code_fences(note)

        self.assertEqual(["markdown.code-fence-language"], [issue.code for issue in issues])

    def test_code_fences_inside_callouts_require_a_language(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/CalloutFences.md",
            VALID_FRONTMATTER
            + "> [!example]\n> ```\n> bare\n> ```\n>\n> ```text\n> tagged\n> ```\n",
        )

        issues = validate_vault.validate_code_fences(note)

        self.assertEqual(["markdown.code-fence-language"], [issue.code for issue in issues])

    def test_code_fences_inside_lists_require_a_language(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/ListFences.md",
            VALID_FRONTMATTER
            + "- Example\n\n    ```\n    bare\n    ```\n\n100. Tagged\n\n     ```text\n     tagged\n     ```\n",
        )

        issues = validate_vault.validate_code_fences(note)

        self.assertEqual(["markdown.code-fence-language"], [issue.code for issue in issues])

    def test_code_fences_inside_callouts_nested_in_lists_require_a_language(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/ListCalloutFences.md",
            VALID_FRONTMATTER + "- Example\n\n    > ```\n    > bare\n    > ```\n",
        )

        issues = validate_vault.validate_code_fences(note)

        self.assertEqual(["markdown.code-fence-language"], [issue.code for issue in issues])

    def test_tab_indented_code_fences_inside_lists_require_a_language(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        note = self.write_note(
            root,
            "Vault/Home/Topic/TabIndentedListFence.md",
            VALID_FRONTMATTER + "- Example\n\n\t```\n\tbare\n\t```\n",
        )

        issues = validate_vault.validate_code_fences(note)

        self.assertEqual(["markdown.code-fence-language"], [issue.code for issue in issues])

    def test_steptrace_freshness_delegates_to_non_writing_build_check(self) -> None:
        temp, root = self.make_repo()
        self.addCleanup(temp.cleanup)
        custom = root / "Web/custom/steptrace"
        custom.mkdir(parents=True)
        (custom / "build.mjs").write_text("", encoding="utf-8")

        with patch.object(validate_vault.subprocess, "run") as run:
            run.return_value.returncode = 0
            run.return_value.stdout = "current"
            run.return_value.stderr = ""
            self.assertEqual([], validate_vault.validate_steptrace(root))

            run.return_value.returncode = 1
            run.return_value.stderr = "Error: steptrace check: generated artifacts are stale"
            issues = validate_vault.validate_steptrace(root)

        self.assertEqual("generated.steptrace", issues[0].code)
        self.assertIn("generated artifacts are stale", issues[0].message)


if __name__ == "__main__":
    unittest.main()
