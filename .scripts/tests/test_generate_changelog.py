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
split_body = generate_changelog.split_body
render_entry = generate_changelog.render_entry


class SplitBodyTests(unittest.TestCase):
    def test_body_with_markers_splits_summary_and_strips_version_header(self) -> None:
        # Mirrors the real shape: the summary routine prepends its block onto
        # the existing git-cliff body, so the header follows the end marker
        # with only its own line break in between (no manual blank line).
        body = (
            "<!--ai-summary:start-->\n"
            "- Did the first thing\n"
            "- Did the second thing\n"
            "<!--ai-summary:end-->\n"
            "## v1.2.0 — 2026-07-20\n"
            "\n"
            "### Features\n"
            "- Did the first thing (#1)\n"
        )

        summary, detail = split_body(body)

        self.assertEqual(summary, ["- Did the first thing", "- Did the second thing"])
        # The leading "## v1.2.0 ..." git-cliff header right after the end
        # marker must be stripped, leaving the first real section.
        self.assertTrue(detail.startswith("### Features"))

    def test_body_without_markers_has_empty_summary(self) -> None:
        body = "## v1.0.0 — 2026-07-03\n\n### Features\n- Thing one\n"

        summary, detail = split_body(body)

        self.assertEqual(summary, [])
        self.assertEqual(detail, "### Features\n- Thing one")

    def test_malformed_or_empty_body_does_not_raise(self) -> None:
        for body in ("", "no header at all, just text", "<!--ai-summary:start-->only start marker"):
            with self.subTest(body=body):
                summary, detail = split_body(body)
                self.assertIsInstance(summary, list)
                self.assertIsInstance(detail, str)


class RenderEntryTests(unittest.TestCase):
    def test_every_detail_line_including_blanks_is_quoted(self) -> None:
        release = Release(
            tag="v1.0.0",
            date="2026-07-03",
            body="## v1.0.0 — 2026-07-03\n\n### Features\n- Thing one\n\n### Other\n- Thing two\n",
        )

        rendered = render_entry(release)
        lines = rendered.splitlines()

        callout_idx = lines.index("> [!note]- Details")
        for line in lines[callout_idx + 1 :]:
            self.assertTrue(line == ">" or line.startswith("> "))

    def test_empty_summary_omits_bullet_list(self) -> None:
        release = Release(tag="v1.0.0", date="2026-07-03", body="## v1.0.0 — 2026-07-03\n\nbody text\n")

        rendered = render_entry(release)

        self.assertNotIn("\n- \n", rendered + "\n")
        self.assertTrue(rendered.startswith("### v1.0.0 (2026-07-03)\n> [!note]- Details"))

    def test_empty_detail_omits_callout(self) -> None:
        release = Release(tag="v0.0.1", date="2026-01-01", body="")

        rendered = render_entry(release)

        self.assertEqual(rendered, "### v0.0.1 (2026-01-01)")


if __name__ == "__main__":
    unittest.main()
