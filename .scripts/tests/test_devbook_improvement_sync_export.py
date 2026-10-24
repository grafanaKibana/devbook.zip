"""Exact-source export handoff boundaries, without Obsidian or network calls."""
import base64
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.scripts'))
from devbook_improvement import runtime, sync_export


class ExportReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q', '-b', 'notes/automated-topic-g1')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.test')
        for name in (*sync_export.POLICY_PATHS, 'Vault/Home/Topic/Note.md', 'Web/content/Topic/Note.md'):
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text('fixture')
        self.git('add', '.')
        self.git('commit', '-qm', 'fixture')
        self.base = self.git('rev-parse', 'HEAD').strip()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True)

    def test_receipt_binds_sources_outputs_policy_and_rejects_symlinks(self):
        entries = sync_export.tree_entries(self.root)
        receipt = sync_export.make_receipt(entries)
        self.assertTrue(sync_export.validate_receipt(receipt, entries))
        for group in ('sources', 'outputs', 'policy'):
            changed = copy.deepcopy(entries)
            target = next(iter(receipt[group]))
            next(entry for entry in changed if entry['path'] == target)['sha'] = '0' * 40
            with self.subTest(group=group), self.assertRaises(ValueError):
                sync_export.validate_receipt(receipt, changed)
        changed = copy.deepcopy(entries)
        changed[0]['mode'] = '120000'
        with self.assertRaises(ValueError):
            sync_export.make_receipt(changed)
        self.assertFalse(sync_export.is_export_path('Web/content/../../AGENTS.md'))
        self.assertTrue(sync_export.is_export_path('Web/content/Topic/Note.md'))
        self.assertFalse(sync_export.is_export_path('Web/quartz.ts'))
        self.assertTrue(sync_export.needs_export({'Vault/Home/Topic/Note.md': 'old'}, {'Vault/Home/Topic/Note.md': 'new'}))

    def test_committed_source_export_runs_existing_helper_and_leaves_only_staged_outputs(self):
        head = self.git('rev-parse', 'HEAD').strip()
        calls = []
        def official(root):
            calls.append(root)
            output = root / 'Web/content/Topic/Note.md'
            output.write_text('official fixture export')
            self.git('add', '--', 'Web/content')
        helpers = {'guard_source': lambda _: None, 'guard_output': lambda _: None, 'export': official}
        with mock.patch.object(sync_export.runpy, 'run_path', return_value=helpers):
            receipt = sync_export.export(self.root, head)
        self.assertEqual([self.root], calls)
        self.assertEqual(head, self.git('rev-parse', 'HEAD').strip())
        staged = set(self.git('diff', '--cached', '--name-only').splitlines())
        self.assertEqual({'Web/content/Topic/Note.md', sync_export.RECEIPT_PATH}, staged)
        self.assertTrue(sync_export.validate_receipt(receipt, sync_export._index_entries(self.root)))
        with self.assertRaisesRegex(ValueError, 'clean dedicated'):
            sync_export.export(self.root, head)
        with self.assertRaisesRegex(ValueError, 'expected PR head'):
            sync_export.export(self.root, 'stale')

    def test_ci_demands_current_receipt_only_for_managed_note_changes(self):
        (self.root / 'Vault/Home/Topic/Note.md').write_text('changed source')
        self.git('add', '.')
        self.git('commit', '-qm', 'change')
        self.assertFalse(sync_export.verify(self.root, self.base, 'notes/manual'))
        with self.assertRaisesRegex(ValueError, 'Official local Quartz export required'):
            sync_export.verify(self.root, self.base, 'notes/automated-topic-g1')
        target = self.root / sync_export.RECEIPT_PATH
        target.parent.mkdir()
        target.write_text(json.dumps(sync_export.make_receipt(sync_export.tree_entries(self.root))))
        self.git('add', '.')
        self.git('commit', '-qm', 'receipt')
        self.assertTrue(sync_export.verify(self.root, self.base, 'notes/automated-topic-g1'))
        (self.root / 'Vault/Home/Topic/Note.md').write_text('later edit')
        self.git('add', '.')
        self.git('commit', '-qm', 'later')
        with self.assertRaisesRegex(ValueError, 'Official local Quartz export required'):
            sync_export.verify(self.root, self.base, 'notes/automated-topic-g1')

    def test_remote_receipt_requires_complete_tree_and_exact_hash_binding(self):
        entries = sync_export.tree_entries(self.root)
        receipt = sync_export.make_receipt(entries)
        entries.append({'path': sync_export.RECEIPT_PATH, 'type': 'blob', 'mode': '100644', 'sha': '1' * 40})
        api = mock.Mock()
        api.request.side_effect = [
            {'truncated': False, 'tree': entries},
            {'encoding': 'base64', 'content': base64.b64encode(json.dumps(receipt).encode()).decode()},
        ]
        self.assertEqual((receipt, True), sync_export.remote_receipt(api, 'head'))
        stale_entries = copy.deepcopy(entries)
        next(entry for entry in stale_entries if entry['path'] == 'Vault/Home/Topic/Note.md')['sha'] = '2' * 40
        api.request.side_effect = [
            {'truncated': False, 'tree': stale_entries},
            {'encoding': 'base64', 'content': base64.b64encode(json.dumps(receipt).encode()).decode()},
        ]
        self.assertEqual((receipt, False), sync_export.remote_receipt(api, 'head'))
        next(entry for entry in stale_entries if entry['path'] == 'Web/content/Topic/Note.md')['sha'] = '3' * 40
        api.request.side_effect = [
            {'truncated': False, 'tree': stale_entries},
            {'encoding': 'base64', 'content': base64.b64encode(json.dumps(receipt).encode()).decode()},
        ]
        with self.assertRaises(runtime.Conflict):
            sync_export.remote_receipt(api, 'head')
        api.request.side_effect = [{'truncated': True, 'tree': entries}]
        with self.assertRaises(runtime.Conflict):
            sync_export.remote_receipt(api, 'head')
        entries.pop()
        api.request.side_effect = [{'truncated': False, 'tree': entries}]
        with self.assertRaises(runtime.Conflict):
            sync_export.remote_receipt(api, 'head')


if __name__ == '__main__':
    unittest.main()
