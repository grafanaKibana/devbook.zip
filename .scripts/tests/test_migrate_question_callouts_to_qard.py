from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "migrate-question-callouts-to-qard.py"
SPEC = importlib.util.spec_from_file_location("migrate_question_callouts_to_qard", SCRIPT)
assert SPEC and SPEC.loader
migration = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = migration
SPEC.loader.exec_module(migration)


FRONTMATTER = """---
topic: [Programming]
subtopic: [NET]
level: [\"2\"]
priority: Medium
status: Creation
publish: false
---
"""


class QardMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "Vault/Home/Programming/NET").mkdir(parents=True)
        self.manifest = self.root / "migration.json"

    def write_note(self, relative: str, content: str, newline: str = "") -> Path:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8", newline=newline) as stream:
            stream.write(content)
        return path

    def inventory(self) -> dict[str, object]:
        return migration.create_manifest(self.root)

    def test_inventory_and_transform_are_scoped_and_byte_preserving(self) -> None:
        note = self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER
            + """# Generic

> [!QUESTION]+ Keep generic
> Generic answer.

```md
> [!QUESTION]- Ignore fenced
> Ignore fenced answer.
```

<!--
> [!QUESTION]- Ignore commented
> Ignore commented answer.
-->

%%
> [!QUESTION]- Ignore Obsidian comment
> Ignore Obsidian comment answer.
%%

%% > [!QUESTION]- Ignore inline Obsidian comment %%

# Questions

> [!Question]+ Preserve spacing
> Rich **answer** with [[Link]].

> [!QUESTION] No fold
> Second answer.

# References

- [Guide](https://example.com)
""",
        )

        manifest = self.inventory()
        entry = manifest["files"][0]

        self.assertEqual(2, manifest["summary"]["legacy_interview_cards"])
        self.assertEqual(1, manifest["summary"]["generic_question_cards"])
        self.assertEqual("Programming", entry["seed_values"]["qard-deck"])
        self.assertEqual("NET/Card", entry["seed_values"]["qard-topic"])

        transformed = migration.render_applied_bytes(self.root, entry)
        self.assertIn(b"> [!qard]+ Preserve spacing\n", transformed)
        self.assertIn(b"> [!qard] No fold\n", transformed)
        self.assertIn(b"> [!QUESTION]+ Keep generic\n", transformed)
        self.assertIn(b"> [!QUESTION]- Ignore fenced\n", transformed)
        self.assertIn(b"> [!QUESTION]- Ignore commented\n", transformed)
        self.assertIn(b"> [!QUESTION]- Ignore Obsidian comment\n", transformed)
        self.assertIn(b"%% > [!QUESTION]- Ignore inline Obsidian comment %%\n", transformed)
        self.assertIn(b'qard-deck: "Programming"\n', transformed)
        self.assertIn(b'qard-topic: "NET/Card"\n', transformed)
        self.assertEqual(note.read_bytes().count(b"Rich **answer**"), 1)

    def test_existing_overrides_and_card_metadata_are_preserved(self) -> None:
        content = FRONTMATTER.replace(
            "publish: false\n",
            'publish: false\nqard-deck: "Logical Deck"\nqard-topic: "Logical Topic"\n',
        ) + """# Questions

<!-- qard-id: stable_id -->
<!-- qard-location: {"deck":"Card Deck","topic":"Card Topic"} -->
> [!qard]- Existing native card
> Existing answer.

> [!QUESTION]- Migrated card
> Migrated answer.
"""
        path = self.write_note("Vault/Home/Programming/NET/Card.md", content)

        manifest = self.inventory()
        entry = manifest["files"][0]
        transformed = migration.render_applied_bytes(self.root, entry)

        self.assertEqual({}, entry["seed_values"])
        self.assertEqual(1, manifest["summary"]["native_qard_cards"])
        self.assertEqual(1, manifest["summary"]["legacy_interview_cards"])
        self.assertEqual(content.encode(), path.read_bytes())
        self.assertIn(b'qard-deck: "Logical Deck"', transformed)
        self.assertIn(b'qard-topic: "Logical Topic"', transformed)
        self.assertIn(b"<!-- qard-id: stable_id -->", transformed)
        self.assertIn(b"<!-- qard-location:", transformed)

    def test_crlf_and_final_newline_are_preserved(self) -> None:
        content = FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer."
        path = self.write_note(
            "Vault/Home/Programming/NET/Card.md", content.replace("\n", "\r\n")
        )
        manifest = self.inventory()

        transformed = migration.render_applied_bytes(self.root, manifest["files"][0])

        self.assertNotIn(b"\n", transformed.replace(b"\r\n", b""))
        self.assertFalse(transformed.endswith((b"\n", b"\r")))
        self.assertEqual("crlf", manifest["files"][0]["eol"])
        self.assertEqual(path.read_bytes().count(b"\r\n") + 2, transformed.count(b"\r\n"))

    def test_inventory_rejects_malformed_cards_metadata_and_duplicate_ids(self) -> None:
        invalid_metadata = FRONTMATTER.replace(
            "publish: false\n", "publish: false\nqard-deck:\n  - invalid\n"
        )
        self.write_note(
            "Vault/Home/Programming/NET/Bad.md",
            invalid_metadata
            + """# Questions

> [!QUESTION]-
> Answer without a prompt.

<!-- qard-id: duplicate -->
> [!qard]- Native one
> Answer.

<!-- qard-id: duplicate -->
> [!qard]- Native two
> Answer.
""",
        )

        manifest = self.inventory()

        codes = {issue["code"] for issue in manifest["issues"]}
        self.assertIn("card.empty-front", codes)
        self.assertIn("metadata.invalid", codes)
        self.assertIn("card.duplicate-id", codes)
        self.assertNotIn("qard-deck", manifest["files"][0]["seed_values"])
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)

    def test_apply_verify_idempotence_and_scoped_rollback(self) -> None:
        path = self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )
        original = path.read_bytes()
        manifest = self.inventory()

        migration.apply_manifest(self.root, manifest)
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        applied = path.read_bytes()
        self.assertNotEqual(original, applied)
        self.assertEqual([], migration.apply_manifest(self.root, manifest))

        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

    def test_apply_and_rollback_refuse_concurrent_drift(self) -> None:
        path = self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )
        original = path.read_bytes()
        manifest = self.inventory()
        path.write_text(path.read_text() + "Concurrent edit.\n", encoding="utf-8")

        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)

        path.write_bytes(original)
        migration.apply_manifest(self.root, manifest)
        path.write_text(path.read_text() + "Concurrent edit.\n", encoding="utf-8")
        with self.assertRaises(migration.MigrationError):
            migration.rollback_manifest(self.root, manifest)

    def test_apply_rechecks_each_file_before_replacement(self) -> None:
        first = self.write_note(
            "Vault/Home/Programming/NET/A.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- First?\n> First answer.\n",
        )
        second = self.write_note(
            "Vault/Home/Programming/NET/B.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Second?\n> Second answer.\n",
        )
        manifest = self.inventory()
        real_atomic_write = migration.atomic_write

        def mutate_between_files(path: Path, data: bytes) -> None:
            real_atomic_write(path, data)
            if path.name == first.name:
                second.write_text(second.read_text() + "Concurrent edit.\n", encoding="utf-8")

        with patch.object(migration, "atomic_write", side_effect=mutate_between_files):
            with self.assertRaises(migration.MigrationError):
                migration.apply_manifest(self.root, manifest)

        self.assertIn("[!qard]", first.read_text())
        self.assertIn("[!QUESTION]", second.read_text())
        self.assertTrue(second.read_text().endswith("Concurrent edit.\n"))
        self.assertFalse(any("post_apply_sha256" in entry for entry in manifest["files"]))

    def test_quoted_frontmatter_keys_are_preserved_as_overrides(self) -> None:
        content = FRONTMATTER.replace(
            "publish: false\n",
            'publish: false\n"qard-deck": "Custom Deck"\n\'qard-topic\': \'Custom Topic\'\n',
        ) + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n"
        self.write_note("Vault/Home/Programming/NET/Card.md", content)

        manifest = self.inventory()
        entry = manifest["files"][0]
        transformed = migration.render_applied_bytes(self.root, entry)

        self.assertEqual({}, entry["seed_values"])
        self.assertEqual(
            {"qard-deck": "Custom Deck", "qard-topic": "Custom Topic"},
            entry["preserved_metadata"],
        )
        self.assertEqual(1, transformed.count(b"qard-deck"))
        self.assertEqual(1, transformed.count(b"qard-topic"))

    def test_inventory_validates_qard_outside_questions_and_ignores_generic_question(self) -> None:
        self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER
            + """# Notes

> [!QUESTION]- Generic question without an answer remains outside migration scope?

> [!qard]- Valid native card?
> Valid answer.

> [!qard]-
> <!-- hidden front -->
> <!-- qard-answer -->
> %% hidden back %%
""",
        )

        manifest = self.inventory()
        codes = [issue["code"] for issue in manifest["issues"]]

        self.assertEqual(1, manifest["summary"]["generic_question_cards"])
        self.assertEqual(2, manifest["summary"]["native_qard_cards"])
        self.assertEqual(1, codes.count("card.empty-front"))
        self.assertEqual(1, codes.count("card.empty-back"))

    def test_inventory_rejects_non_string_yaml_metadata(self) -> None:
        for value in ("123", "true", "!!int 5", "[Deck]", "{name: Deck}"):
            with self.subTest(value=value):
                path = self.write_note(
                    "Vault/Home/Programming/NET/Card.md",
                    FRONTMATTER.replace(
                        "publish: false\n", f"publish: false\nqard-deck: {value}\n"
                    )
                    + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
                )
                manifest = self.inventory()
                self.assertIn(
                    "metadata.invalid", [issue["code"] for issue in manifest["issues"]]
                )
                path.unlink()

        for value in ('"123"', "'true'", "Deck Name"):
            with self.subTest(valid=value):
                path = self.write_note(
                    "Vault/Home/Programming/NET/Card.md",
                    FRONTMATTER.replace(
                        "publish: false\n", f"publish: false\nqard-deck: {value}\n"
                    )
                    + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
                )
                self.assertEqual([], self.inventory()["issues"])
                path.unlink()

    def test_long_note_overrides_are_preserved_through_apply_and_verify(self) -> None:
        long_deck = "Deck " + "d" * 260
        long_topic = "Topic " + "t" * 260
        path = self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER.replace(
                "publish: false\n",
                f'publish: false\nqard-deck: "{long_deck}"\nqard-topic: {long_topic}\n',
            )
            + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )

        manifest = self.inventory()
        self.assertEqual([], manifest["issues"])
        self.assertEqual(
            {"qard-deck": long_deck, "qard-topic": long_topic},
            manifest["files"][0]["preserved_metadata"],
        )

        migration.apply_manifest(self.root, manifest)
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        applied = path.read_text(encoding="utf-8")
        self.assertIn(f'qard-deck: "{long_deck}"', applied)
        self.assertIn(f"qard-topic: {long_topic}", applied)

    def test_long_path_seeds_are_applied_and_verified(self) -> None:
        long_deck = "d" * 205
        topic_parts = ("t" * 110, "u" * 110)
        path = self.write_note(
            f"Vault/Home/{long_deck}/{'/'.join(topic_parts)}/Card.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )

        manifest = self.inventory()
        entry = manifest["files"][0]
        expected_topic = f"{topic_parts[0]}/{topic_parts[1]}/Card"
        self.assertEqual(
            {"qard-deck": long_deck, "qard-topic": expected_topic},
            entry["seed_values"],
        )

        migration.apply_manifest(self.root, manifest)
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        applied = path.read_text(encoding="utf-8")
        self.assertIn(f'qard-deck: "{long_deck}"', applied)
        self.assertIn(f'qard-topic: "{expected_topic}"', applied)

    def test_qard_location_retains_stock_plugin_length_limit(self) -> None:
        self.assertTrue(
            migration.validate_location(
                json.dumps({"deck": "d" * 200, "topic": "Topic"})
            )
        )
        self.assertFalse(
            migration.validate_location(
                json.dumps({"deck": "d" * 201, "topic": "Topic"})
            )
        )

    def test_post_write_drift_is_not_recorded_as_trusted(self) -> None:
        path = self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )
        manifest = self.inventory()
        real_atomic_write = migration.atomic_write

        def mutate_after_write(target: Path, data: bytes) -> None:
            real_atomic_write(target, data)
            target.write_text(target.read_text() + "Concurrent edit.\n", encoding="utf-8")

        with patch.object(migration, "atomic_write", side_effect=mutate_after_write):
            with self.assertRaises(migration.MigrationError):
                migration.apply_manifest(self.root, manifest)

        self.assertNotIn("post_apply_sha256", manifest["files"][0])
        self.assertTrue(path.read_text().endswith("Concurrent edit.\n"))

    def test_manifest_cannot_escape_home_or_seed_unowned_frontmatter(self) -> None:
        path = self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )
        original = path.read_bytes()
        manifest = self.inventory()
        manifest["files"][0]["path"] = "Vault/Home/../../.scripts/validate-vault.py"
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

        manifest = self.inventory()
        manifest["files"][0]["seed_values"]["status"] = "Done"
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

        manifest = self.inventory()
        manifest["files"][0]["seed_values"]["qard-deck"] = "Wrong Deck"
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

    def test_manifest_round_trip_and_cli_operations(self) -> None:
        self.write_note(
            "Vault/Home/Programming/NET/Card.md",
            FRONTMATTER + "# Questions\n\n> [!QUESTION]- Prompt\n> Answer.\n",
        )

        self.assertEqual(
            0,
            migration.main(
                ["inventory", "--repo-root", str(self.root), "--manifest", str(self.manifest)]
            ),
        )
        data = json.loads(self.manifest.read_text(encoding="utf-8"))
        self.assertEqual(1, data["summary"]["legacy_interview_cards"])
        self.assertEqual(
            0,
            migration.main(
                ["dry-run", "--repo-root", str(self.root), "--manifest", str(self.manifest)]
            ),
        )
        self.assertEqual(
            0,
            migration.main(
                ["apply", "--repo-root", str(self.root), "--manifest", str(self.manifest)]
            ),
        )
        self.assertEqual(
            0,
            migration.main(
                ["verify", "--repo-root", str(self.root), "--manifest", str(self.manifest)]
            ),
        )
        self.assertEqual(
            0,
            migration.main(
                ["rollback", "--repo-root", str(self.root), "--manifest", str(self.manifest)]
            ),
        )


if __name__ == "__main__":
    unittest.main()
