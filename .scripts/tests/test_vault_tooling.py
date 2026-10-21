"""Vault contracts and reversible migration, exercised on disposable vaults."""
import importlib.util
import re
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


def load_script(name):
    source = Path(__file__).resolve().parents[1] / (name + ".py")
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), source)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


validator = load_script("validate-vault")
migration = load_script("migrate-question-callouts-to-qard")
roadmap = load_script("generate-roadmap")
changelog = load_script("generate-changelog")
FRONTMATTER = """---
topic: [Programming]
subtopic: [NET]
level: ["2"]
priority: Medium
status: Creation
publish: false
---
"""
CARD = "# Questions\n\n> [!QUESTION]- Prompt?\n> Answer.\n"


class VaultToolingTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.home = self.root / "Vault/Home"
        self.home.mkdir(parents=True)
        (self.root / "Vault/Assets").mkdir()

    def write(self, name, body, frontmatter=FRONTMATTER):
        path = self.home / "Programming/NET" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(frontmatter + body)
        return path

    def note(self, body, frontmatter=FRONTMATTER):
        return validator.load_note(self.write("Card.md", body, frontmatter), self.root)

    def test_validator_schema_links_fences_and_publication(self):
        valid = self.note("```text\nTagged fence\n```\n")
        self.assertEqual([], validator.validate_frontmatter(valid))
        self.assertEqual([], validator.validate_code_fences(valid))
        invalid = self.note("```\nBare fence\n```\n", FRONTMATTER.replace("topic: [Programming]", "topic: Programming").replace("priority: Medium", "priority: Urgent"))
        self.assertEqual({"frontmatter.type", "frontmatter.priority"}, {i.code for i in validator.validate_frontmatter(invalid)})
        self.assertEqual(["markdown.code-fence-language"], [i.code for i in validator.validate_code_fences(invalid)])
        self.write("Target.md", "# Existing\n")
        linked = self.note("[[Target#Existing]], [[Target#Missing]], [[Absent]]\n")
        issues = validator.validate_wikilinks(linked, validator.VaultIndex(self.root / "Vault"))
        self.assertEqual(["target#missing", "absent"], [i.discriminator for i in issues])
        published = self.note("Too short.\n", FRONTMATTER.replace("publish: false", "publish: true"))
        self.assertEqual({"publish.content", "publish.example"}, {i.code for i in validator.validate_published(published)})

    def test_validator_staged_scope_and_hub_contract(self):
        self.write("NET.md", "", "---\ntags: [FolderNote]\npublish: false\n---\n")
        selected = self.write("Selected.md", "", FRONTMATTER.replace("status: Creation", "status:"))
        self.write("Ignored.md", "", FRONTMATTER.replace("priority: Medium", "priority: Urgent"))
        with patch.object(validator, "staged_paths", return_value=[selected]):
            issues, checked, suppressed = validator.validate(self.root, "staged")
        self.assertEqual((1, 0), (checked, suppressed))
        self.assertTrue(issues)
        self.assertTrue(any(i.path.endswith("Selected.md") for i in issues))
        self.assertFalse(any(i.path.endswith("Ignored.md") for i in issues))
        wrong = self.note("", "---\ntags: [FolderNote]\npublish: false\n---\n")
        self.assertEqual(["folder-note.name"], [i.code for i in validator.validate_folder_note(wrong, self.home)])

    def test_qard_valid_metadata_and_invalid_semantics(self):
        metadata = 'qard-deck: "Logical Deck"\nqard-topic: "Logical Topic"\n'
        frontmatter = FRONTMATTER.replace("publish: false\n", "publish: false\n" + metadata)
        body = '<!-- qard-location: {"deck":"Per Card","topic":"Moved"} -->\n<!-- qard-id: stable -->\n> [!qard]- Front\n> More front\n> <!-- qard-answer -->\n> Back\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(body, frontmatter)))
        invalid = '# Questions\n<!-- qard-id: repeated -->\n> [!qard]-\n> Answer.\n\n<!-- qard-id: repeated -->\n> [!qard]- No answer?\n'
        note = self.note(invalid, FRONTMATTER.replace("publish: false\n", "publish: false\nqard-deck: []\n"))
        codes = [i.code for i in validator.validate_qard_interviews(note)]
        self.assertTrue({"qard.metadata", "qard.empty-front", "qard.empty-back"}.issubset(codes))
        self.assertEqual(2, codes.count("qard.duplicate-id"))
        generic = '> [!QUESTION]- Generic?\n\n```md\n> [!QUESTION]- Fenced?\n```\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(generic)))
        legacy = self.note(generic + CARD)
        self.assertEqual(["qard.legacy-interview"], [i.code for i in validator.validate_qard_interviews(legacy)])

    def test_qard_metadata_mentions_are_not_keys(self):
        frontmatter = FRONTMATTER.replace("publish: false\n", "publish: false\ndescription: qard-deck and qard-topic are optional\nsummary: |\n  qard-deck: documented example\n")
        self.assertEqual([], validator.validate_qard_interviews(self.note("", frontmatter)))
        path = self.write("Card.md", CARD, frontmatter)
        manifest = migration.create_manifest(self.root)
        self.assertEqual([], manifest["issues"])
        self.assertEqual({"qard-deck", "qard-topic"}, set(manifest["files"][0]["seed_values"]))
        original = path.read_bytes()
        migration.apply_manifest(self.root, manifest)
        self.assertIn(b"description: qard-deck and qard-topic are optional", path.read_bytes())
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())
        unsupported = FRONTMATTER.replace("publish: false\n", "publish: false\n? qard-deck\n: Deck\n")
        self.assertIn("qard.metadata", [issue.code for issue in validator.validate_qard_interviews(self.note("", unsupported))])
        self.write("Card.md", CARD, unsupported)
        self.assertIn("metadata.unsupported", [issue["code"] for issue in migration.create_manifest(self.root)["issues"]])

    def test_qard_indented_root_overrides_fail_closed_without_reseeding(self):
        indented = "---\n" + "".join("  " + line + "\n" for line in FRONTMATTER.splitlines()[1:-1]) + "  qard-deck: Personal Deck\n  qard-topic: Personal Topic\n---\n"
        path = self.write("Card.md", CARD, indented)
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        self.assertEqual({}, manifest["files"][0]["seed_values"])
        self.assertEqual(2, sum(issue["code"] == "metadata.unsupported" for issue in manifest["issues"]))
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())
        self.assertEqual(2, sum(issue.code == "qard.metadata" for issue in validator.validate_qard_interviews(self.note("", indented))))

        without_overrides = indented.replace("  qard-deck: Personal Deck\n  qard-topic: Personal Topic\n", "")
        path = self.write("Card.md", CARD, without_overrides)
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        self.assertEqual({}, manifest["files"][0]["seed_values"])
        self.assertEqual(["metadata.unsupported"], [issue["code"] for issue in manifest["issues"]])
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())
        self.assertEqual([], validator.validate_qard_interviews(self.note("Ordinary note.\n", without_overrides)))

    def test_qard_unclosed_card_fence_does_not_hide_following_cards(self):
        example = "```md\n> [!qard]- Fenced example?\n> Example answer.\n```\n"
        broken = "# Questions\n> [!QUESTION]- First?\n> ```sql\n> SELECT 1\n\n> [!QUESTION]- Second?\n> Answer.\n"
        path = self.write("Card.md", example + broken)
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        self.assertEqual(2, manifest["summary"]["legacy_interview_cards"])
        self.assertEqual(["card.unclosed-fence"], [issue["code"] for issue in manifest["issues"]])
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())
        native = broken.replace("[!QUESTION]-", "[!qard]-")
        self.assertEqual(["qard.unclosed-fence"], [issue.code for issue in validator.validate_qard_interviews(self.note(example + native))])
        legacy_codes = [issue.code for issue in validator.validate_qard_interviews(self.note(example + broken))]
        self.assertEqual(2, legacy_codes.count("qard.legacy-interview"))

    def test_qard_comment_and_code_visibility_matches_readers(self):
        example = "```md\n%%\n> [!qard]- Example only?\n> Answer.\n```\n"
        legacy = example + CARD
        path = self.write("Card.md", legacy)
        self.assertEqual(["qard.legacy-interview"], [issue.code for issue in validator.validate_qard_interviews(self.note(legacy))])
        manifest = migration.create_manifest(self.root)
        self.assertEqual(1, manifest["summary"]["legacy_interview_cards"])
        migration.apply_manifest(self.root, manifest)
        self.assertIn(example, path.read_text())
        code_answer = '> [!qard]- What is the SQL statement?\n> ```sql\n> SELECT 1; -- %% is literal\n> ```\n\n> [!qard]- Next prompt?\n> Answer.\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(code_answer)))
        self.write("Card.md", code_answer)
        self.assertEqual([], migration.create_manifest(self.root)["issues"])
        for hidden in ["<!-- hidden -->", "%% hidden %%", "```text\n```"]:
            body = '> [!qard]- Prompt?\n' + "".join('> ' + line + '\n' for line in hidden.splitlines())
            self.assertIn("qard.empty-back", [issue.code for issue in validator.validate_qard_interviews(self.note(body))])
            self.assertIn("card.empty-back", [issue["code"] for issue in migration.create_manifest(self.root)["issues"]])
        hidden_card = "%%\n> [!qard]- Hidden?\n> Answer.\n%%\n"
        self.assertEqual(["qard.hidden-card"], [issue.code for issue in validator.validate_qard_interviews(self.note(hidden_card + example))])
        self.write("Card.md", hidden_card + example)
        self.assertIn("card.hidden", [issue["code"] for issue in migration.create_manifest(self.root)["issues"]])

        inline_hidden = "Prose <!--\n> [!qard]- Hidden from Markdown?\n> Answer.\n-->\n"
        self.assertEqual(["qard.hidden-card"], [issue.code for issue in validator.validate_qard_interviews(self.note(inline_hidden))])
        self.assertEqual(["card.hidden"], [issue["code"] for issue in migration.create_manifest(self.root)["issues"]])

    def test_qard_native_related_metadata_and_title_fences(self):
        related_blocks = [
            "<!-- qard-reverse:  reverse -->\n",
            "<!-- qard-reverse: first -->\n<!-- qard-reverse: second -->\n",
            "<!-- qard-siblings: first -->\n<!-- qard-siblings: second -->\n",
        ]
        for related in related_blocks:
            body = '<!-- qard-id: stable -->\n' + related + '> [!qard]- Prompt?\n> Answer.\n'
            self.assertIn("qard.identity-metadata", [issue.code for issue in validator.validate_qard_interviews(self.note(body))])
            self.assertIn("card.identity-metadata", [issue["code"] for issue in migration.create_manifest(self.root)["issues"]])
        tab_literal = '> [!qard]- Q?\n> Before.\n> \t```js\n> Code.\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(tab_literal)))
        self.assertEqual([], migration.create_manifest(self.root)["issues"])
        title_fence = '> [!qard]- ```text\n> question line\n> ```\n> <!-- qard-answer -->\n> Answer.\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(title_fence)))
        self.assertEqual([], migration.create_manifest(self.root)["issues"])
        path = self.write("Card.md", '# Questions\n' + title_fence.replace('[!qard]', '[!QUESTION]') + '\n' + tab_literal.replace('[!qard]', '[!QUESTION]'))
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        self.assertEqual([], manifest["issues"])
        migration.apply_manifest(self.root, manifest)
        self.assertIn(title_fence, path.read_text())
        self.assertIn(tab_literal, path.read_text())
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        self.assertEqual([], validator.validate_qard_interviews(validator.load_note(path, self.root)))
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

    def test_qard_identity_adjacency_and_collapsed_migration(self):
        metadata = '<!-- qard-id: stable -->\n<!-- qard-reverse: reverse -->\n<!-- qard-siblings: siblings -->\n<!-- qard-location: {"deck":"D","topic":"T"} -->\n\n'
        body = metadata + '> [!qard]- Prompt?\n> Answer.\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(body)))
        self.write("Card.md", body)
        self.assertEqual([], migration.create_manifest(self.root)["issues"])
        orphan = '<!-- qard-id: detached -->\nIntervening prose.\n' + body
        self.assertIn("qard.orphan-id", [issue.code for issue in validator.validate_qard_interviews(self.note(orphan))])
        self.write("Card.md", orphan)
        self.assertIn("card.orphan-id", [issue["code"] for issue in migration.create_manifest(self.root)["issues"]])
        protected = '```md\n<!-- qard-id: example -->\n```\n<!--\n<!-- qard-id: hidden -->\n-->\n' + body
        self.assertEqual([], validator.validate_qard_interviews(self.note(protected)))
        self.write("Card.md", protected)
        self.assertEqual([], migration.create_manifest(self.root)["issues"])
        expanded = body.replace('[!qard]-', '[!qard]+')
        self.assertIn("qard.collapsed", [issue.code for issue in validator.validate_qard_interviews(self.note(expanded))])
        path = self.write("Card.md", '# Questions\n> [!QUESTION]+ Prompt?\n> Answer.\n')
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        migration.apply_manifest(self.root, manifest)
        self.assertIn(b'[!qard]- Prompt?', path.read_bytes())
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

    def test_migration_canonicalizes_headers_to_native_qard_grammar(self):
        body = ('# Questions\n<!-- qard-id: existing -->\n'
                '>  [!QUESTION]- What does "quoted" mean?\n> Answer one.\n\n'
                '>\t[!QUESTION]+ Second?\n>\tAnswer two.\n\n'
                '>\u00a0[!QUESTION]- Third?\n> Answer three.\n')
        path = self.write("Card.md", body)
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        self.assertEqual([], manifest["issues"])
        self.assertEqual(3, manifest["summary"]["legacy_interview_cards"])
        self.assertEqual(manifest["files"], migration.create_manifest(self.root)["files"])
        migration.apply_manifest(self.root, manifest)
        applied = path.read_text()
        # Stock Qard 0.6.2's header expression, tested against actual output.
        native = re.compile(r"^ {0,3}> ?\[!qard\][+-]?(?:[ \t]+(.*))?$", re.I)
        headers = [line for line in applied.splitlines() if '[!qard]' in line]
        self.assertEqual(3, len(headers))
        self.assertTrue(all(native.fullmatch(line) for line in headers))
        self.assertIn('> [!qard]- What does "quoted" mean?', applied)
        self.assertIn('<!-- qard-id: existing -->', applied)
        self.assertIn('>\tAnswer two.', applied)
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        self.assertEqual([], migration.apply_manifest(self.root, manifest))
        self.assertEqual([], validator.validate_qard_interviews(validator.load_note(path, self.root)))
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())
        for prefix in ['>  ', '>\t', '>\u00a0', '\t> ']:
            invalid = prefix + '[!qard]- Prompt?\n> Answer.\n'
            self.assertIn('qard.header', [issue.code for issue in validator.validate_qard_interviews(self.note(invalid))])
            self.assertIn('card.header', [issue['code'] for issue in migration.create_manifest(self.root)['issues']])
        valid = '>[!qard]- No separating space?\n> Answer.\n\n   > [!qard]- Indented?\n> Answer.\n'
        self.assertEqual([], validator.validate_qard_interviews(self.note(valid)))

    def test_migration_preserves_overrides_ids_and_round_trip(self):
        metadata = 'qard-deck: "Logical Deck"\nqard-topic: "Logical Topic"\n'
        frontmatter = FRONTMATTER.replace("publish: false\n", "publish: false\n" + metadata)
        existing = '<!-- qard-id: stable -->\n<!-- qard-location: {"deck":"Card Deck","topic":"Card Topic"} -->\n> [!qard]- Native?\n> Native answer.\n\n'
        path = self.write("Card.md", "# Questions\n\n" + existing + CARD, frontmatter)
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        self.assertEqual({}, manifest["files"][0]["seed_values"])
        migration.apply_manifest(self.root, manifest)
        applied = path.read_bytes()
        self.assertIn(existing.encode(), applied)
        self.assertIn(metadata.encode(), applied)
        self.assertEqual(1, applied.count(b"qard-id:"))
        self.assertNotIn(b"[!QUESTION]", applied)
        self.assertEqual([], migration.verify_manifest(self.root, manifest))
        self.assertEqual([], migration.apply_manifest(self.root, manifest))
        migration.rollback_manifest(self.root, manifest)
        self.assertEqual(original, path.read_bytes())

    def test_migration_drift_and_manifest_tampering_fail_closed(self):
        path = self.write("Card.md", CARD)
        original = path.read_bytes()
        manifest = migration.create_manifest(self.root)
        path.write_bytes(original + b"Concurrent edit.\n")
        with self.assertRaises(migration.MigrationError):
            migration.apply_manifest(self.root, manifest)
        path.write_bytes(original)
        for field, value in [("path", "Vault/Home/../../.scripts/validate-vault.py"), ("seed_values", {"status": "Done"})]:
            with self.subTest(field=field):
                bad = migration.create_manifest(self.root)
                bad["files"][0][field] = value
                with self.assertRaises(migration.MigrationError):
                    migration.apply_manifest(self.root, bad)
                self.assertEqual(original, path.read_bytes())
        migration.apply_manifest(self.root, manifest)
        concurrent = path.read_bytes() + b"Concurrent edit.\n"
        path.write_bytes(concurrent)
        with self.assertRaises(migration.MigrationError):
            migration.rollback_manifest(self.root, manifest)
        self.assertEqual(concurrent, path.read_bytes())

    def test_migration_checks_each_write_before_recording_trust(self):
        first = self.write("A.md", CARD)
        second = self.write("B.md", CARD)
        manifest = migration.create_manifest(self.root)
        atomic_write = migration.atomic_write

        def race(path, data):
            atomic_write(path, data)
            if path.name == first.name:
                second.write_bytes(second.read_bytes() + b"Concurrent edit.\n")

        with patch.object(migration, "atomic_write", side_effect=race):
            with self.assertRaises(migration.MigrationError):
                migration.apply_manifest(self.root, manifest)
        self.assertIn("[!qard]", first.read_text())
        self.assertIn("[!QUESTION]", second.read_text())
        self.assertTrue(second.read_text().endswith("Concurrent edit.\n"))
        self.assertFalse(any("post_apply_sha256" in entry for entry in manifest["files"]))

    def test_generators_emit_readable_outputs_and_exclude_hidden_state(self):
        body = "<!--ai-summary:start-->\n- Summary\n<!--ai-summary:end-->\n\nDetail\n\nMore\n"
        release = changelog.Release(tag="v1.0.0", date="2026-01-01", body=body)
        self.assertEqual("## v1.0.0 (Jan 01, 2026)\n- Summary\n> [!note]- Details\n> Detail\n>\n> More", changelog.render_entry(release))
        self.write("NET.md", "", "---\nstatus: Creation\n---\n")
        (self.home / ".omc/state/sessions").mkdir(parents=True)
        with patch.object(roadmap, "VAULT_ROOT", str(self.root / "Vault")), patch.object(roadmap, "KNOWLEDGE", str(self.home)):
            canvas, _invalid = roadmap.generate()
        text = [str(node.get("text", "")) for node in canvas["nodes"]]
        self.assertTrue(any("Home/Programming" in value for value in text))
        self.assertFalse(any(".omc" in value for value in text))
