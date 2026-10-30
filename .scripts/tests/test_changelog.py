"""Core output contract for the retained, unrelated release-note generator."""
import importlib.util
from pathlib import Path
import sys
import unittest


SOURCE = Path(__file__).resolve().parents[1] / 'generate-changelog.py'
SPEC = importlib.util.spec_from_file_location('generate_changelog', SOURCE)
changelog = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = changelog
SPEC.loader.exec_module(changelog)


class ChangelogTests(unittest.TestCase):
    def test_release_summary_and_collapsed_details(self):
        body = '<!--ai-summary:start-->\n- Summary\n<!--ai-summary:end-->\n\nDetail\n\nMore\n'
        release = changelog.Release(tag='v1.0.0', date='2026-01-01', body=body)
        self.assertEqual(
            '## v1.0.0 (Jan 01, 2026)\n- Summary\n> [!note]- Details\n> Detail\n>\n> More',
            changelog.render_entry(release),
        )
