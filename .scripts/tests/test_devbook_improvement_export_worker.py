"""Generated-only export publication never trusts artifact paths or stale refs."""
import base64
import copy
import datetime as dt
import json
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.scripts'))
from devbook_improvement import core, export_worker as worker, pipeline, runtime, sync_export

HEAD = 'a' * 40
BRANCH = 'notes/automated-topic-g1'
CONFIG = {'repo': 'owner/repo', 'base_branch': 'main',
          'owner_allowlist': [{'id': 42, 'login': 'owner'}]}


def entry(path, data):
    return {'path': path, 'type': 'blob', 'mode': '100644', 'sha': worker._blob_sha(data)}


class ExportApi:
    repo = 'owner/repo'

    def __init__(self):
        self.calls = []
        self.head = HEAD
        self.files = {path: b'trusted policy' for path in sync_export.POLICY_PATHS}
        self.files.update({'Vault/Home/Topic/Note.md': b'published source',
                           'Web/content/Topic/Note.md': b'old output',
                           'Web/content/Assets/image.png': b'old binary',
                           'Web/content/obsolete.md': b'obsolete'})
        self.blobs = {}
        self.trees = {}
        self.commits = {}
        self.pr = {'number': 1, 'node_id': 'PR_1', 'state': 'open', 'draft': True,
            'user': {'id': 42, 'login': 'owner'}, 'body': runtime.marker('topic', 1),
            'head': {'sha': HEAD, 'ref': BRANCH, 'repo': {'full_name': self.repo}},
            'base': {'sha': 'e' * 40, 'ref': 'main', 'repo': {'full_name': self.repo}}}

    def request(self, method, path, payload=None, *, paginate=False):
        self.calls.append((method, path, copy.deepcopy(payload)))
        if path == '/pulls/1':
            self.pr['head']['sha'] = self.head
            return copy.deepcopy(self.pr)
        if path.startswith('/git/ref/heads/') or path.startswith('/git/refs/heads/'):
            if method == 'PATCH':
                if payload.get('force') is not False:
                    raise AssertionError('force push forbidden')
                self.head = payload['sha']
            return {'object': {'sha': self.head}}
        if path.startswith('/git/trees/'):
            head = path.split('/git/trees/', 1)[1].split('?', 1)[0]
            files = self.trees.get(head, self.files)
            return {'truncated': False, 'tree': [entry(path, data) for path, data in files.items()]}
        if path.startswith('/git/commits/'):
            return self.commits.get(path.rsplit('/', 1)[1], {'tree': {'sha': 'f' * 40}})
        if path == '/git/blobs':
            data = base64.b64decode(payload['content'])
            sha = worker._blob_sha(data)
            self.blobs[sha] = data
            return {'sha': sha}
        if path == '/git/trees':
            files = dict(self.files)
            for row in payload['tree']:
                if row['sha'] is None:
                    files.pop(row['path'])
                else:
                    files[row['path']] = self.blobs[row['sha']]
            self.trees['b' * 40] = files
            return {'sha': 'b' * 40}
        if path == '/git/commits':
            self.commits['c' * 40] = {'tree': {'sha': payload['tree']}, 'message': payload['message'],
                                      'parents': [{'sha': parent, 'url': 'ignored'} for parent in payload['parents']]}
            self.trees['c' * 40] = self.trees[payload['tree']]
            return {'sha': 'c' * 40}
        if path == '/actions/workflows/vault-validation.yml/dispatches':
            return {}
        if path == f'/actions/workflows/{worker.WORKFLOW}/dispatches':
            return {}
        if path.startswith('/pulls/1/files'):
            return [{'filename': 'Vault/Home/Topic/Note.md'}]
        if path.startswith('/compare/'):
            return {'merge_base_commit': {'sha': 'e' * 40}}
        raise AssertionError((method, path, payload))

    def graphql(self, query, variables):
        self.calls.append(('GRAPHQL', query, variables))
        self.pr['draft'] = True
        return {}

    def bundle(self):
        changes = {'Web/content/Topic/Note.md': b'new exported output',
                   'Web/content/Assets/image.png': b'\x00\xff\x80binary',
                   'Web/content/obsolete.md': None}
        current = dict(self.files)
        for path, data in changes.items():
            if data is None:
                current.pop(path)
            else:
                current[path] = data
        receipt = sync_export.make_receipt([entry(path, data) for path, data in current.items()])
        changes[sync_export.RECEIPT_PATH] = json.dumps(receipt).encode()
        return {'version': 1, 'expected_head': HEAD, 'branch': BRANCH, 'pr_number': 1,
                'files': {path: base64.b64encode(data).decode() if data is not None else None
                          for path, data in changes.items()}}


class ExportPublisherTests(unittest.TestCase):
    def test_verified_binary_and_deletions_publish_once_without_touching_source(self):
        api = ExportApi()
        api.pr['draft'] = False
        bundle = api.bundle()
        result = worker.publish_bundle(api, CONFIG, bundle)
        self.assertEqual('exported', result['status'])
        self.assertEqual('c' * 40, api.head)
        tree = next(payload for method, path, payload in api.calls if method == 'POST' and path == '/git/trees')
        self.assertTrue(all(worker._export_path(row['path']) for row in tree['tree']))
        self.assertTrue(any(row['path'].endswith('obsolete.md') and row['sha'] is None for row in tree['tree']))
        blobs = [base64.b64decode(payload['content']) for method, path, payload in api.calls if path == '/git/blobs']
        self.assertIn(b'\x00\xff\x80binary', blobs)
        self.assertEqual(1, sum(method == 'GRAPHQL' for method, _, _ in api.calls))
        writes = sum(method != 'GET' for method, _, _ in api.calls)
        self.assertTrue(worker.publish_bundle(api, CONFIG, bundle)['resumed'])
        self.assertEqual(writes + 1, sum(method != 'GET' for method, _, _ in api.calls))
        self.assertEqual('/actions/workflows/vault-validation.yml/dispatches', api.calls[-1][1])

    def test_failed_validation_dispatch_retries_only_the_exact_export_commit(self):
        api = ExportApi()
        bundle = api.bundle()
        request = api.request
        failed = False
        def transient(method, path, payload=None, **kwargs):
            nonlocal failed
            result = request(method, path, payload, **kwargs)
            if path == '/actions/workflows/vault-validation.yml/dispatches' and not failed:
                failed = True
                raise runtime.RuntimeFailure('temporary dispatch outage')
            return result
        api.request = transient
        with self.assertRaises(runtime.RuntimeFailure):
            worker.publish_bundle(api, CONFIG, bundle)
        self.assertEqual('c' * 40, api.head)
        before = len(api.calls)
        result = worker.publish_bundle(api, CONFIG, bundle)
        self.assertTrue(result['resumed'])
        writes = [(method, path) for method, path, _ in api.calls[before:] if method != 'GET']
        self.assertEqual([('POST', '/actions/workflows/vault-validation.yml/dispatches')], writes)
        for mutation in ('message', 'parent', 'source', 'code', 'output'):
            other = copy.deepcopy(api)
            other.request = ExportApi.request.__get__(other)
            if mutation == 'message':
                other.commits[other.head]['message'] = 'notes: human edit'
            elif mutation == 'parent':
                other.commits[other.head]['parents'] = [{'sha': 'd' * 40}]
            else:
                path = {'source': 'Vault/Home/Topic/Note.md', 'code': '.github/workflows/new.yml',
                        'output': 'Web/content/Topic/Note.md'}[mutation]
                other.trees[other.head][path] = b'human edit'
            before = len(other.calls)
            with self.subTest(mutation=mutation):
                self.assertEqual('stale', worker.publish_bundle(other, CONFIG, bundle)['status'])
                self.assertTrue(all(method == 'GET' for method, _, _ in other.calls[before:]))

    def test_concurrent_branch_updates_are_never_overwritten(self):
        for boundary in ('after_tree_validation', 'before_ref_write', 'non_fast_forward'):
            api = ExportApi()
            bundle = api.bundle()
            request = api.request
            pulls = 0
            def concurrent(method, path, payload=None, **kwargs):
                nonlocal pulls
                if path == '/pulls/1':
                    pulls += 1
                    if boundary == 'after_tree_validation' and pulls == 2:
                        api.head = 'd' * 40
                if path.startswith('/git/refs/heads/'):
                    if boundary == 'before_ref_write' and method == 'GET':
                        api.head = 'd' * 40
                    elif boundary == 'non_fast_forward' and method == 'PATCH':
                        api.head = 'd' * 40
                        raise runtime.Conflict('GitHub rejected a non-fast-forward ref update')
                return request(method, path, payload, **kwargs)
            api.request = concurrent
            with self.subTest(boundary=boundary):
                if boundary == 'non_fast_forward':
                    with self.assertRaises(runtime.Conflict):
                        worker.publish_bundle(api, CONFIG, bundle)
                else:
                    self.assertEqual('stale', worker.publish_bundle(api, CONFIG, bundle)['status'])
                self.assertEqual('d' * 40, api.head)
                self.assertFalse(any(method == 'PATCH' for method, _, _ in api.calls))
                self.assertFalse(any(path == '/actions/workflows/vault-validation.yml/dispatches'
                                     for _, path, _ in api.calls))

    def test_source_code_traversal_and_receipt_tampering_fail_before_writes(self):
        cases = ['Vault/Home/Topic/Note.md', '.github/workflows/unsafe.yml',
                 'Web/content/../../AGENTS.md', 'Web/content//escape.md',
                 'Web/content/\\escape.md']
        for path in cases:
            api = ExportApi()
            bundle = api.bundle()
            bundle['files'][path] = base64.b64encode(b'unsafe').decode()
            with self.subTest(path=path), self.assertRaises(runtime.UnsafeInput):
                worker.publish_bundle(api, CONFIG, bundle)
            self.assertTrue(all(method == 'GET' for method, _, _ in api.calls))
        for group in ('sources', 'outputs', 'policy'):
            api = ExportApi()
            bundle = api.bundle()
            receipt = json.loads(base64.b64decode(bundle['files'][sync_export.RECEIPT_PATH]))
            receipt[group][next(iter(receipt[group]))]['sha'] = '0' * 40
            bundle['files'][sync_export.RECEIPT_PATH] = base64.b64encode(json.dumps(receipt).encode()).decode()
            with self.subTest(group=group), self.assertRaises(runtime.UnsafeInput):
                worker.publish_bundle(api, CONFIG, bundle)
            self.assertTrue(all(method == 'GET' for method, _, _ in api.calls))

    def test_closed_stale_or_foreign_identity_cannot_mutate_refs(self):
        for mutation in ('closed', 'stale', 'foreign', 'untrusted_author', 'truncated'):
            api = ExportApi()
            bundle = api.bundle()
            if mutation == 'closed':
                api.pr['state'] = 'closed'
            elif mutation == 'stale':
                api.head = 'd' * 40
            elif mutation == 'foreign':
                api.pr['head']['repo']['full_name'] = 'attacker/repo'
            elif mutation == 'untrusted_author':
                api.pr['user']['id'] = 999
            else:
                request = api.request
                def truncated(method, path, payload=None, **kwargs):
                    result = request(method, path, payload, **kwargs)
                    if path.startswith('/git/trees/'):
                        result['truncated'] = True
                    return result
                api.request = truncated
            with self.subTest(mutation=mutation):
                if mutation in ('closed', 'stale'):
                    self.assertEqual('stale', worker.publish_bundle(api, CONFIG, bundle)['status'])
                else:
                    with self.assertRaises(runtime.RuntimeFailure):
                        worker.publish_bundle(api, CONFIG, bundle)
                self.assertTrue(all(method == 'GET' for method, _, _ in api.calls))

    def test_artifact_bounds_and_read_only_dispatch_boundary(self):
        api = ExportApi()
        bundle = api.bundle()
        bundle['files']['Web/content/bad.md'] = 'not base64!'
        with self.assertRaises(runtime.UnsafeInput):
            worker.decode_bundle(bundle)
        bundle = api.bundle()
        with mock.patch.object(worker, 'MAX_FILE_BYTES', 2):
            with self.assertRaises(runtime.UnsafeInput):
                worker.decode_bundle(bundle)
        reader = worker.ReadOnlyApi('owner/repo', 'read-only')
        with mock.patch.object(worker, 'urlopen') as request:
            with self.assertRaises(runtime.UnsafeInput):
                reader.request('PATCH', '/git/refs/heads/main', {'sha': HEAD})
            request.assert_not_called()
        worker.dispatch_export(api, 1, BRANCH, HEAD)
        self.assertEqual({'mode': 'managed', 'pr_number': '1', 'branch': BRANCH, 'expected_head': HEAD}, api.calls[-1][2]['inputs'])
        with self.assertRaises(runtime.UnsafeInput):
            worker.dispatch_export(api, 1, 'main', HEAD)

    def test_managed_render_rejects_untrusted_control_paths_before_desktop_launch(self):
        api = ExportApi()
        request = api.request
        def forged_files(method, path, payload=None, **kwargs):
            if '/files?' in path:
                return [{'filename': '.scripts/sync-quartz.py'}]
            return request(method, path, payload, **kwargs)
        api.request = forged_files
        with self.assertRaises(runtime.UnsafeInput):
            worker.render_managed(Path('/unused'), api, CONFIG, 1, BRANCH, HEAD, Path('/unused/Obsidian.app'))


class ExportValidationRecoveryTests(unittest.TestCase):
    def setup_engine(self):
        api = ExportApi()
        request = api.request
        api.check_rows = []
        api.validation_runs = []
        def checks(method, path, payload=None, **kwargs):
            if '/check-runs?' in path:
                return {'total_count': len(api.check_rows), 'check_runs': api.check_rows}
            if path.endswith('/status'):
                return {'sha': HEAD, 'statuses': []}
            if '/vault-validation.yml/runs?' in path:
                return {'workflow_runs': api.validation_runs}
            return request(method, path, payload, **kwargs)
        api.request = checks
        state = core.new_state()
        state['prs']['topic:1'] = {'number': 1, 'branch': BRANCH, 'head_sha': HEAD,
            'status': 'open', 'export_required': False, 'export_operation_id': 'operation'}
        state['export_operations'] = {'operation': {'evidence': {}}}
        store = runtime.MemoryStateStore(state)
        config = {**CONFIG, 'automatic_export': True}
        now = [dt.datetime(2026, 10, 29, tzinfo=dt.timezone.utc)]
        engine = pipeline.Engine(Path('.'), config, store, api=api, now=lambda: now[0])
        return api, store, pipeline.initial_state(store), engine, now

    def test_missing_validation_retries_bounded_and_persists_before_dispatch(self):
        api, store, state, engine, now = self.setup_engine()
        request = api.request
        def verify_intent(method, path, payload=None, **kwargs):
            if method == 'POST':
                self.assertEqual(HEAD, store.state['export_operations']['operation']['evidence']['validation_head'])
                self.assertGreater(store.state['export_operations']['operation']['evidence']['validation_attempts'], 0)
            return request(method, path, payload, **kwargs)
        api.request = verify_intent
        with mock.patch.object(runtime, 'dispatch_vault_validation', wraps=runtime.dispatch_vault_validation) as dispatch:
            engine.retry_export_validation(state)
            engine.retry_export_validation(state)
            self.assertEqual(1, dispatch.call_count)
            for expected in (2, 3):
                now[0] += dt.timedelta(hours=6)
                engine.retry_export_validation(state)
                self.assertEqual(expected, dispatch.call_count)
            now[0] += dt.timedelta(hours=6)
            engine.retry_export_validation(state)
            self.assertEqual(3, dispatch.call_count)
            self.assertIn('three dispatch attempts', state['prs']['topic:1']['export_attention'])
        self.assertEqual(0, engine.model_calls)
        self.assertFalse(any(method == 'PATCH' for method, _, _ in api.calls))

    def test_existing_validation_terminal_pending_cooldown_and_stale_heads_skip(self):
        for reason in ('success', 'failure', 'in_progress', 'queued_run', 'closed', 'stale', 'cooldown', 'disabled'):
            api, store, state, engine, now = self.setup_engine()
            if reason in ('success', 'failure', 'in_progress'):
                api.check_rows = [{'id': 1, 'head_sha': HEAD, 'name': 'validate',
                    'conclusion': reason if reason != 'in_progress' else None, 'status': reason}]
            elif reason == 'queued_run':
                api.validation_runs = [{'head_sha': HEAD, 'head_branch': BRANCH, 'status': 'queued'}]
            elif reason == 'closed':
                api.pr['state'] = 'closed'
            elif reason == 'stale':
                api.head = 'd' * 40
            elif reason == 'cooldown':
                state['cooldown'] = {'next_check_at': runtime.iso(now[0] + dt.timedelta(days=7))}
            else:
                engine.config['automatic_export'] = False
            with self.subTest(reason=reason), mock.patch.object(runtime, 'dispatch_vault_validation') as dispatch:
                engine.retry_export_validation(state)
                dispatch.assert_not_called()

    def test_failed_dispatch_keeps_intent_and_observes_cooldown_before_retry(self):
        api, store, state, engine, now = self.setup_engine()
        with mock.patch.object(runtime, 'dispatch_vault_validation', side_effect=runtime.RuntimeFailure('network')):
            with self.assertRaises(runtime.RuntimeFailure):
                engine.retry_export_validation(state)
        evidence = store.state['export_operations']['operation']['evidence']
        self.assertEqual(1, evidence['validation_attempts'])
        self.assertEqual('network', evidence['validation_dispatch_error'])
        with mock.patch.object(runtime, 'dispatch_vault_validation') as dispatch:
            engine.retry_export_validation(state)
            dispatch.assert_not_called()
            now[0] += dt.timedelta(hours=6)
            engine.retry_export_validation(state)
            dispatch.assert_called_once_with(api, BRANCH)


class OwnedCheckoutTests(unittest.TestCase):
    def test_retained_desktop_settings_preserve_complete_checkout_on_error(self):
        temporary = None
        try:
            with self.assertRaisesRegex(runtime.RuntimeFailure, 'checkout retained for recovery at') as caught:
                with worker._owned_checkout('devbook-retention-test-') as temporary:
                    root = temporary / 'repo'
                    backup = root / '.desktop-export-example/settings'
                    backup.mkdir(parents=True)
                    (backup / 'app.json').write_text('original settings')
                    (root / 'source.md').write_text('preserve complete checkout')
                    raise ValueError('process ownership cannot be proven')
            self.assertTrue(temporary.is_dir())
            self.assertEqual('original settings', (backup / 'app.json').read_text())
            self.assertTrue((root / 'source.md').exists())
            self.assertIn(str(temporary), str(caught.exception))
            self.assertIsInstance(caught.exception.__cause__, ValueError)
        finally:
            if temporary and temporary.exists():
                shutil.rmtree(temporary)

    def test_safe_error_and_success_remove_disposable_checkout(self):
        with self.assertRaisesRegex(ValueError, 'safe export failure'):
            with worker._owned_checkout('devbook-cleanup-test-') as failed:
                (failed / 'repo').mkdir()
                raise ValueError('safe export failure')
        self.assertFalse(failed.exists())
        with worker._owned_checkout('devbook-cleanup-test-') as succeeded:
            (succeeded / 'repo').mkdir()
        self.assertFalse(succeeded.exists())


class BundleIndexTests(unittest.TestCase):
    def test_staged_binary_deletion_and_receipt_are_collected_without_source_or_symlinks(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            def git(*args):
                return subprocess.check_output(['git', '-c', 'core.hooksPath=/dev/null', *args], cwd=root)
            git('init', '-q', '-b', BRANCH)
            git('config', 'user.name', 'Fixture')
            git('config', 'user.email', 'fixture@example.test')
            old = root / 'Web/content/old.md'
            old.parent.mkdir(parents=True)
            old.write_bytes(b'old')
            git('add', '.')
            git('commit', '-qm', 'fixture')
            head = git('rev-parse', 'HEAD').decode().strip()
            old.unlink()
            (root / 'Web/content/image.png').write_bytes(b'\xff\x00fixture')
            receipt = root / sync_export.RECEIPT_PATH
            receipt.parent.mkdir()
            receipt.write_text('{}')
            git('add', '-A', '.')
            bundle = worker.bundle_checkout(root, 1, BRANCH, head)
            self.assertIsNone(bundle['files']['Web/content/old.md'])
            self.assertEqual(b'\xff\x00fixture', base64.b64decode(bundle['files']['Web/content/image.png']))
            outside = root / '.github/workflows/unsafe.yml'
            outside.parent.mkdir(parents=True)
            outside.write_text('unsafe')
            git('add', '.')
            with self.assertRaises(runtime.UnsafeInput):
                worker.bundle_checkout(root, 1, BRANCH, head)


if __name__ == '__main__':
    unittest.main()
