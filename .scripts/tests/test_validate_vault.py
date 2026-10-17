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
topic: [Programming]
subtopic: [NET]
level: ["2"]
priority: Medium
status: Creation
publish: false
---
"""


class VaultValidatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "Vault/Home/Topic").mkdir(parents=True)
        (self.root / "Vault/Assets").mkdir(parents=True)
        (self.root / ".scripts").mkdir()

    def write_note(self, relative: str, content: str) -> validate_vault.Note:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return validate_vault.load_note(path, self.root)

    def test_frontmatter_schema(self) -> None:
        cases = (
            (VALID_FRONTMATTER, set()),
            (
                """---
topic: Programming
subtopic: [NET]
level: [5]
priority: Urgent
status:
publish: "true"
---
""",
                {"frontmatter.type", "frontmatter.level", "frontmatter.priority"},
            ),
        )

        for frontmatter, expected in cases:
            with self.subTest(expected=expected):
                note = self.write_note("Vault/Home/Topic/Note.md", frontmatter)
                codes = {issue.code for issue in validate_vault.validate_frontmatter(note)}
                self.assertEqual(expected, codes)

    def test_staged_scope(self) -> None:
        self.write_note(
            "Vault/Home/Topic/Topic.md",
            "---\ntags: [FolderNote]\npublish: false\n---\n# Intro\n",
        )
        selected = self.write_note(
            "Vault/Home/Topic/Selected.md",
            VALID_FRONTMATTER.replace("status: Creation", "status:"),
        )
        self.write_note(
            "Vault/Home/Topic/Ignored.md",
            VALID_FRONTMATTER.replace("priority: Medium", "priority: Urgent"),
        )

        with patch.object(validate_vault, "staged_paths", return_value=[selected.path]):
            issues, checked, suppressed = validate_vault.validate(self.root, "staged")

        self.assertEqual((1, 0), (checked, suppressed))
        self.assertTrue(any(issue.path.endswith("Selected.md") for issue in issues))
        self.assertFalse(any(issue.path.endswith("Ignored.md") for issue in issues))

    def test_folder_hub_contract(self) -> None:
        wrong_name = self.write_note(
            "Vault/Home/Topic/Wrong.md",
            "---\ntags: [FolderNote]\npublish: false\n---\n",
        )
        missing_tag = self.write_note(
            "Vault/Home/Topic/Topic.md",
            "---\ntags: []\npublish: false\n---\n",
        )

        self.assertEqual(
            ["folder-note.name"],
            [
                issue.code
                for issue in validate_vault.validate_folder_note(
                    wrong_name, self.root / "Vault/Home"
                )
            ],
        )
        self.assertEqual(
            ["folder-note.tag"],
            [
                issue.code
                for issue in validate_vault.validate_expected_hubs(
                    self.root / "Vault/Home",
                    {missing_tag.path: missing_tag, wrong_name.path: wrong_name},
                    [missing_tag.path.parent],
                )
            ],
        )

    def test_wikilink_and_heading_resolution(self) -> None:
        self.write_note(
            "Vault/Home/Topic/Target.md",
            VALID_FRONTMATTER + "# Existing Heading\n",
        )
        source = self.write_note(
            "Vault/Home/Topic/Source.md",
            VALID_FRONTMATTER
            + "[[Target#Existing Heading]], [[Target#Missing Heading]], [[Missing]]\n",
        )

        issues = validate_vault.validate_wikilinks(
            source, validate_vault.VaultIndex(self.root / "Vault")
        )

        self.assertEqual(
            ["target#missing heading", "missing"],
            [issue.discriminator for issue in issues],
        )

    def test_attachment_location(self) -> None:
        valid = self.root / "Vault/Assets/image.png"
        invalid = self.root / "Vault/Home/Topic/image.png"
        valid.write_bytes(b"png")
        invalid.write_bytes(b"png")

        issues = validate_vault.validate_attachment_locations(
            self.root / "Vault", [valid, invalid]
        )

        self.assertEqual(["Vault/Home/Topic/image.png"], [issue.path for issue in issues])

    def test_publishing_and_references(self) -> None:
        published = self.write_note(
            "Vault/Home/Topic/Published.md",
            VALID_FRONTMATTER.replace("publish: false", "publish: true") + "Too short.\n",
        )
        references = self.write_note(
            "Vault/Home/Topic/References.md",
            VALID_FRONTMATTER
            + "# References\n\n- [Guide](https://example.com/guide) — trailing prose\n",
        )

        self.assertEqual(
            {"publish.content", "publish.example"},
            {issue.code for issue in validate_vault.validate_published(published)},
        )
        self.assertEqual(
            ["references.trailing-text"],
            [issue.code for issue in validate_vault.validate_references(references)],
        )

    def test_code_fences_require_a_language(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Fences.md",
            VALID_FRONTMATTER + "```\nbare\n```\n\n```text\ntagged\n```\n",
        )

        self.assertEqual(
            ["markdown.code-fence-language"],
            [issue.code for issue in validate_vault.validate_code_fences(note)],
        )

    def test_qard_interview_contract(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER
            + """# Generic

> [!QUESTION]- A permitted generic question?
> Generic answer.

```md
> [!QUESTION]- Fenced example ignored?
> Fenced answer.
```

<!--
> [!QUESTION]- Commented example ignored?
> Commented answer.
-->

%%
> [!QUESTION]- Obsidian-commented example ignored?
> Obsidian-commented answer.
%%

%% > [!QUESTION]- Inline Obsidian comment ignored? %%

# Questions

> [!QUESTION]- Legacy interview question?
> Legacy answer.

> [!qard]- Native question?
> Native answer.
""",
        )

        issues = validate_vault.validate_qard_interviews(note)

        self.assertEqual(["qard.legacy-interview"], [issue.code for issue in issues])

    def test_qard_semantics_metadata_and_duplicate_ids(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER.replace(
                "publish: false\n",
                "publish: false\nqard-deck: []\nqard-topic: |\n  multiline\n",
            )
            + """# Questions

<!-- qard-id: repeated -->
> [!qard]-
> Answer without question.

<!-- qard-id: repeated -->
> [!qard]- Question without answer?

> [!qard]- Front before marker
> Extra front
> <!-- qard-answer -->
> Back after marker
""",
        )

        issues = validate_vault.validate_qard_interviews(note)
        codes = [issue.code for issue in issues]

        self.assertIn("qard.metadata", codes)
        self.assertIn("qard.empty-front", codes)
        self.assertIn("qard.empty-back", codes)
        self.assertEqual(2, codes.count("qard.duplicate-id"))
        self.assertNotIn("qard.path-mismatch", codes)

    def test_qard_valid_overrides_multiline_answer_and_location(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER.replace(
                "publish: false\n",
                'publish: false\nqard-deck: "Logical Deck"\nqard-topic: "Logical Topic"\n',
            )
            + """# Questions

<!-- qard-location: {"deck":"Per Card","topic":"Moved Topic"} -->
<!-- qard-id: unique_id -->
> [!qard]- Front line
> More front
> <!-- qard-answer -->
> Back line
""",
        )

        self.assertEqual([], validate_vault.validate_qard_interviews(note))

    def test_qard_quoted_metadata_keys_are_valid(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER.replace(
                "publish: false\n",
                'publish: false\n"qard-deck": "Logical Deck"\n\'qard-topic\': \'Logical Topic\'\n',
            )
            + "# Questions\n\n> [!qard]- Question?\n> Answer.\n",
        )

        self.assertEqual([], validate_vault.validate_qard_interviews(note))

    def test_qard_outside_questions_is_validated_but_generic_question_is_not(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER
            + """# Notes

> [!QUESTION]- Generic question remains valid?

> [!qard]- Valid card outside the interview section?
> Valid answer.

<!-- qard-location: {"deck":"","topic":"Topic"} -->
> [!qard]-
> <!-- hidden front -->
> <!-- qard-answer -->
> %% hidden back %%
""",
        )

        issues = validate_vault.validate_qard_interviews(note)
        codes = [issue.code for issue in issues]

        self.assertNotIn("qard.legacy-interview", codes)
        self.assertEqual(1, codes.count("qard.empty-front"))
        self.assertEqual(1, codes.count("qard.empty-back"))
        self.assertEqual(1, codes.count("qard.location"))

    def test_qard_hidden_comments_do_not_supply_basic_answer_content(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER
            + """> [!qard]- Visible question?
> <!-- hidden HTML answer -->
> %% hidden Obsidian answer %%
""",
        )

        self.assertEqual(
            ["qard.empty-back"],
            [issue.code for issue in validate_vault.validate_qard_interviews(note)],
        )

    def test_qard_metadata_rejects_non_string_yaml_scalars(self) -> None:
        invalid_values = ("123", "true", "!!int 5", "[Deck]", "{name: Deck}")
        for value in invalid_values:
            with self.subTest(value=value):
                note = self.write_note(
                    "Vault/Home/Topic/Cards.md",
                    VALID_FRONTMATTER.replace(
                        "publish: false\n", f"publish: false\nqard-deck: {value}\n"
                    )
                    + "> [!qard]- Question?\n> Answer.\n",
                )
                self.assertIn(
                    "qard.metadata",
                    [issue.code for issue in validate_vault.validate_qard_interviews(note)],
                )

        for value in ('"123"', "'true'", "Deck Name"):
            with self.subTest(valid=value):
                note = self.write_note(
                    "Vault/Home/Topic/Cards.md",
                    VALID_FRONTMATTER.replace(
                        "publish: false\n", f"publish: false\nqard-deck: {value}\n"
                    )
                    + "> [!qard]- Question?\n> Answer.\n",
                )
                self.assertEqual([], validate_vault.validate_qard_interviews(note))

    def test_qard_note_metadata_has_no_plugin_location_length_cap(self) -> None:
        long_deck = "Deck " + "d" * 260
        long_topic = "Topic " + "t" * 260
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER.replace(
                "publish: false\n",
                f'publish: false\nqard-deck: "{long_deck}"\nqard-topic: {long_topic}\n',
            )
            + "> [!qard]- Question?\n> Answer.\n",
        )

        self.assertEqual([], validate_vault.validate_qard_interviews(note))

    def test_qard_location_retains_stock_plugin_length_limit(self) -> None:
        note = self.write_note(
            "Vault/Home/Topic/Cards.md",
            VALID_FRONTMATTER
            + f'''<!-- qard-location: {{"deck":"{'d' * 201}","topic":"Topic"}} -->
> [!qard]- Question?
> Answer.
''',
        )

        self.assertEqual(
            ["qard.location"],
            [issue.code for issue in validate_vault.validate_qard_interviews(note)],
        )

    def test_steptrace_freshness_delegation(self) -> None:
        custom = self.root / "Web/custom/steptrace"
        custom.mkdir(parents=True)
        (custom / "build.mjs").write_text("", encoding="utf-8")

        with patch.object(validate_vault.subprocess, "run") as run:
            run.return_value.returncode = 0
            run.return_value.stdout = "current"
            run.return_value.stderr = ""
            self.assertEqual([], validate_vault.validate_steptrace(self.root))

            run.return_value.returncode = 1
            run.return_value.stdout = ""
            run.return_value.stderr = "generated artifacts are stale"
            issues = validate_vault.validate_steptrace(self.root)

        self.assertEqual(["generated.steptrace"], [issue.code for issue in issues])
        self.assertIn("generated artifacts are stale", issues[0].message)


if __name__ == "__main__":
    unittest.main()
