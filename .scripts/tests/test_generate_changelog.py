from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "generate-changelog.py"
SPEC = importlib.util.spec_from_file_location("generate_changelog", SCRIPT)
assert SPEC and SPEC.loader
generate_changelog = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = generate_changelog
SPEC.loader.exec_module(generate_changelog)

Release = generate_changelog.Release
format_date = generate_changelog.format_date
render_entry = generate_changelog.render_entry
split_body = generate_changelog.split_body


class ChangelogTests(unittest.TestCase):
    def test_split_marked_input(self) -> None:
        summary, detail = split_body(
            "<!--ai-summary:start-->\n"
            "- Summary\n"
            "<!--ai-summary:end-->\n"
            "## v1.0.0 — 2026-01-01\n\n"
            "### Changes\n"
            "- Detail\n"
        )

        self.assertEqual(["- Summary"], summary)
        self.assertEqual("### Changes\n- Detail", detail)

    def test_render_release(self) -> None:
        rendered = render_entry(
            Release(
                tag="v1.0.0",
                date="2026-01-01",
                body="<!--ai-summary:start-->\n- Summary\n<!--ai-summary:end-->\n\nDetail\n\nMore\n",
            )
        )

        self.assertEqual(
            "## v1.0.0 (Jan 01, 2026)\n"
            "- Summary\n"
            "> [!note]- Details\n"
            "> Detail\n"
            ">\n"
            "> More",
            rendered,
        )

    def test_valid_date(self) -> None:
        self.assertEqual("Aug 03, 2026", format_date("2026-08-03"))


if __name__ == "__main__":
    unittest.main()
