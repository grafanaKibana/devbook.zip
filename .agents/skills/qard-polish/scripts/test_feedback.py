import json
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest


SOURCE = Path(__file__).resolve().with_name('feedback.py')
TOPICS = ('ai-and-ml', 'cloud', 'computer-science', 'data-persistence', 'devops',
          'networks', 'programming', 'security', 'software-architecture', 'software-design')


class FeedbackTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / 'skill'
        (self.root / 'scripts').mkdir(parents=True)
        (self.root / 'references').mkdir()
        self.script = self.root / 'scripts' / 'feedback.py'
        shutil.copyfile(SOURCE, self.script)
        self.store = self.root / 'references' / 'feedback.json'
        self.store.write_text(json.dumps({'version': 2, 'revision': 0, 'general': {},
                                         'topics': {topic: {} for topic in TOPICS}}))

    def test_generated_copy_uses_the_rulesync_store(self):
        project = self.root.parent / 'project'
        copy = project / '.claude' / 'skills' / 'qard-polish' / 'scripts'
        copy.mkdir(parents=True)
        shutil.copyfile(SOURCE, copy / 'feedback.py')
        (project / 'rulesync.jsonc').write_text('{}')
        canonical = project / '.rulesync' / 'skill-feedback' / 'qard-polish.json'
        canonical.parent.mkdir(parents=True)
        shutil.copyfile(self.store, canonical)
        self.invoke(*self.arguments(), script=copy / 'feedback.py')
        self.assertEqual(json.loads(canonical.read_text())['general'], {'examples': 'Use concrete examples.'})
        self.assertFalse((copy.parent / 'references').exists())

    def invoke(self, *args, success=True, script=None):
        result = subprocess.run([sys.executable, str(script or self.script), *args],
                                text=True, capture_output=True)
        if success:
            self.assertEqual(result.returncode, 0, result.stderr)
            return json.loads(result.stdout)
        self.assertNotEqual(result.returncode, 0, result.stdout)

    def arguments(self, command='set', revision=0, scope='general', key='examples', guidance='Use concrete examples.'):
        args = [command, '--expected-revision', str(revision), '--scope', scope, '--key', key]
        return args + ['--guidance', guidance] if command == 'set' else args

    def rejected(self, *args):
        before = self.store.read_bytes()
        self.invoke(*args, success=False)
        self.assertEqual(self.store.read_bytes(), before)

    def test_replacement_no_history_noop_and_stale_repeat(self):
        self.invoke(*self.arguments())
        self.invoke(*self.arguments(revision=1, guidance='Prefer a minimal example.'))
        data = json.loads(self.store.read_text())
        self.assertEqual(set(data), {'version', 'revision', 'general', 'topics'})
        self.assertEqual(data['general'], {'examples': 'Prefer a minimal example.'})
        before = self.store.read_bytes()
        self.assertEqual(self.invoke(*self.arguments(revision=2, guidance='Prefer a minimal example.')),
                         {'revision': 2, 'changed': False})
        self.assertEqual(self.store.read_bytes(), before)
        self.rejected(*self.arguments(revision=1, guidance='Prefer a minimal example.'))
        self.assertEqual(stat.S_IMODE(self.store.stat().st_mode), 0o600)

    def test_topic_isolation_separate_output_and_exact_scope_deletion(self):
        self.invoke(*self.arguments())
        self.invoke(*self.arguments(revision=1, scope='topic:programming', guidance='Prefer C# examples.'))
        selected = self.invoke('show', '--topic', 'programming')
        self.assertEqual(selected['general'], {'examples': 'Use concrete examples.'})
        self.assertEqual(selected['topics'], {'programming': {'examples': 'Prefer C# examples.'}})
        self.assertEqual(self.invoke('show', '--topic', 'security')['topics'], {'security': {}})
        self.assertEqual(self.invoke('show')['topics'], {})
        self.assertEqual(set(self.invoke('show', '--all')['topics']), set(TOPICS))
        self.rejected(*self.arguments(command='delete', revision=2, scope='topic:security'))
        self.invoke(*self.arguments(command='delete', revision=2, scope='topic:programming'))
        self.assertEqual(self.invoke('show', '--topic', 'programming')['topics'], {'programming': {}})
        self.assertEqual(self.invoke('show')['general'], {'examples': 'Use concrete examples.'})
        self.invoke(*self.arguments(command='delete', revision=3))
        self.assertEqual(self.invoke('show')['general'], {})

    def test_invalid_scopes_keys_and_input_preserve_store(self):
        for scope in ('card:qard-123', 'topic:programming-net', 'topic:Bad Slug', 'global', 'topic:'):
            with self.subTest(scope=scope):
                self.rejected(*self.arguments(scope=scope))
        for args in (self.arguments(key='../escape'), self.arguments(guidance=' '),
                     self.arguments(revision=-1), ['show', '--card', 'qard-123'],
                     ['show', '--topic', 'undeclared']):
            self.rejected(*args)

    def test_malformed_stores_fail_reads_and_writes_without_mutation(self):
        valid = json.loads(self.store.read_text())
        cases = ['{', '{"version":2,"version":2,"revision":0,"general":{},"topics":{}}',
                 json.dumps({**valid, 'entries': []}), json.dumps({**valid, 'revision': True}),
                 json.dumps({**valid, 'version': 1}), json.dumps({**valid, 'general': {'x': ' '}}),
                 json.dumps({**valid, 'topics': {'Bad Topic': {}}}),
                 json.dumps({**valid, 'topics': {'programming': []}}),
                 '{"version":2,"revision":0,"general":{"x":"one","x":"two"},"topics":{}}']
        for text in cases:
            with self.subTest(text=text):
                self.store.write_text(text)
                self.rejected('show')
                self.rejected(*self.arguments())

    def test_read_only_show_creates_no_files(self):
        before = {path.relative_to(self.root) for path in self.root.rglob('*')}
        self.store.chmod(0o444)
        self.store.parent.chmod(0o555)
        try:
            self.assertEqual(self.invoke('show')['revision'], 0)
            self.assertEqual({path.relative_to(self.root) for path in self.root.rglob('*')}, before)
        finally:
            self.store.parent.chmod(0o755)
            self.store.chmod(0o644)

    def test_directory_alias_and_individual_file_symlink(self):
        alias = Path(self.temporary.name) / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        self.invoke(*self.arguments(), script=alias / 'scripts' / 'feedback.py')
        self.assertEqual(self.invoke('show')['revision'], 1)
        self.invoke(*self.arguments(revision=1, key='clarity'))
        self.assertEqual(self.invoke('show', script=alias / 'scripts' / 'feedback.py')['revision'], 2)
        target = Path(self.temporary.name) / 'redirect.json'
        self.store.rename(target)
        self.store.symlink_to(target)
        before = target.read_bytes()
        self.invoke('show', success=False)
        self.invoke(*self.arguments(revision=2), success=False)
        self.assertTrue(self.store.is_symlink())
        self.assertEqual(target.read_bytes(), before)

    def test_concurrent_same_revision_writers_cannot_overwrite(self):
        processes = [subprocess.Popen([sys.executable, str(self.script), *self.arguments(key=key)],
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                     for key in ('one', 'two')]
        outputs = [process.communicate(timeout=10) for process in processes]
        self.assertEqual(sorted(process.returncode for process in processes), [0, 1], outputs)
        data = self.invoke('show')
        self.assertEqual(data['revision'], 1)
        self.assertEqual(len(data['general']), 1)


if __name__ == '__main__':
    unittest.main()
