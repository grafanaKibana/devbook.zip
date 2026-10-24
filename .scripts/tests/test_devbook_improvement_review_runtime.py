"""Regression coverage for transport paths and crash-safe publication review gates."""
import copy
from pathlib import Path
import subprocess
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.scripts'))
from devbook_improvement import core, pipeline, runtime
from devbook_improvement_fixtures import pipeline_root
from test_devbook_improvement_safety import FakeGitHub

BRANCH = 'notes/automated-topic-g1'


def pending_runtime(phase='prepared'):
    api = FakeGitHub()
    api.prs.append({
        'number': 1, 'node_id': 'PR_1', 'state': 'open', 'draft': False,
        'title': 'notes: improve topic', 'body': runtime.marker('topic', 1),
        'head': {'ref': BRANCH, 'sha': 'base'},
    })
    api.comments['ordinary'] = [{
        'id': 10, 'body': 'Clarify the mechanism.', 'updated_at': '2026-10-24T01:00:00Z',
        'user': {'id': 1, 'login': 'owner'},
    }]
    feedback = runtime.poll_feedback(api, 1, [(1, 'owner')])
    op = {
        'op_id': 'op', 'phase': phase, 'topic': 'topic', 'generation': 1,
        'branch': BRANCH, 'parent_head': 'base', 'pr_number': 1,
        'candidate': {'Vault/Home/Topic/Note.md': 'candidate'},
        'commit_message': 'notes: improve topic [op]', 'title': 'notes: improve topic',
        'body': runtime.marker('topic', 1),
        'feedback_revision': {'allowlist': ['1:owner'], 'processed': {
            f"{item['kind']}:{item['id']}": item['revision'] for item in feedback}},
        'evidence': {},
        'receipts': {'records': [{'path': 'Vault/Home/Topic/Note.md', 'reason': 'Clarify'}],
                     'base_note_hashes': {'Vault/Home/Topic/Note.md': 'source-hash'}},
    }
    if phase != 'prepared':
        op['evidence']['commit_sha'] = 'candidate-commit'
        api.commits['candidate-commit'] = {'sha': 'candidate-commit', 'tree': {'sha': 'tree-base'}}
    if phase == 'pr_updated':
        op['evidence']['pr_number'] = 1
        api.refs[BRANCH] = 'candidate-commit'
        api.check_sha = 'candidate-commit'
    store = runtime.MemoryStateStore({'lease': {
        'owner': 'worker', 'expires_at': runtime.iso(runtime.utcnow() + runtime.dt.timedelta(hours=1))},
        'pending_operation': op})
    api.calls.clear()
    return api, store, runtime.GitHubRuntime(api, store, lease_owner='worker', check_attempts=1)


class ReviewRuntimeTests(unittest.TestCase):
    def test_terminal_pr_recovery_archives_all_pending_phases_without_remote_writes(self):
        for phase in runtime.JOURNAL_PHASES[:-1]:
            for status in ['closed', 'merged']:
                for saved_number in [True, False]:
                    with self.subTest(phase=phase, status=status, saved_number=saved_number):
                        api, store, engine = pending_runtime(phase)
                        api.prs[0]['state'] = 'closed'
                        if status == 'merged':
                            api.prs[0]['merged_at'] = '2026-10-24T03:00:00Z'
                        if not saved_number:
                            store.state['pending_operation']['pr_number'] = None
                            store.state['pending_operation']['evidence'].pop('pr_number', None)
                        records = copy.deepcopy(store.state['pending_operation']['receipts']['records'])
                        result = engine.recover_pending()
                        self.assertEqual(result['status'], 'pr_terminal')
                        self.assertEqual(result['terminal_status'], status)
                        self.assertIsNone(store.state['pending_operation'])
                        self.assertEqual(store.state['terminal_operations']['op']['receipts']['records'], records)
                        self.assertEqual(store.state['prs']['topic:1']['proposal_records'], records)
                        self.assertEqual(store.state['prs']['topic:1']['status'], 'open')
                        self.assertTrue(all(call[0] == 'GET' for call in api.calls))
                        self.assertIsNone(engine.recover_pending())
                        runtime.OperationJournal(store).prepare({'op_id': 'next-topic'})

    def test_terminal_archive_preserves_rejection_reconciliation_and_next_topic(self):
        for status in ['closed', 'merged']:
            with self.subTest(status=status):
                api, store, publisher = pending_runtime('pr_updated')
                path = 'Vault/Home/Topic/Note.md'
                source = api.files[(BRANCH, path)]
                topic = core.topic_for(path)
                topic_key = core.topic_id(topic)
                branch = runtime.expected_managed_branch(topic_key, 1)
                api.refs[branch] = api.refs.pop(BRANCH)
                api.prs[0]['head'].update(ref=branch, sha='candidate-commit')
                api.prs[0].update(body=runtime.marker(topic_key, 1), state='closed')
                if status == 'merged':
                    api.prs[0]['merged_at'] = '2026-10-24T03:00:00Z'
                op = store.state['pending_operation']
                op.update(topic=topic_key, branch=branch, pr_number=None)
                edit = {'path': path, 'kind': 'rewrite', 'learning_target': 'same',
                        'before': 'Old?', 'after': 'Improved question?'}
                op['receipts']['records'] = [{
                    'batch': {'notes': [{'path': path, 'content': source}], 'rules_hash': 'rules'},
                    'proposal': {'edits': [edit], 'dispositions': [{'path': path, 'outcome': 'changed'}]},
                    'result': {'sources': {path: 'candidate'}},
                }]
                self.assertEqual(publisher.recover_pending()['status'], 'pr_terminal')
                root = pipeline_root(self, Path(__file__).resolve().parents[2])
                other_path = 'Vault/Home/Other/Note.md'
                notes = [{'path': name, 'content': source, 'hash': core.digest(source),
                          'topic': core.topic_for(name), 'violations': []} for name in [path, other_path]]
                config = {**core.DEFAULT_CONFIG, 'repo': api.repo, 'base_branch': 'main',
                          'owner_allowlist': [{'id': 1, 'login': 'owner'}]}
                result = pipeline.Engine(root, config, store, api=api, publisher=publisher,
                    notes_loader=lambda _: copy.deepcopy(notes), snapshot_sha_loader=lambda: 'base').run(apply=True)
                self.assertEqual(result['status'], 'selected')
                self.assertEqual(result['batch']['topic'], 'Other')
                self.assertEqual(store.state['prs'][f'{topic_key}:1']['status'], status)
                self.assertEqual(bool(store.state['rejections']), status == 'closed')
                self.assertIn('terminal_audit', store.state['prs'][f'{topic_key}:1'])
                self.assertFalse(store.state.get('completed_operations'))
                self.assertTrue(all(call[0] == 'GET' for call in api.calls))

    def test_latest_unmanaged_description_is_preserved_during_update_and_recovery(self):
        for recovery in [False, True]:
            with self.subTest(recovery=recovery):
                api, store, engine = pending_runtime('branch_updated')
                begin = '<!-- devbook-improvement:start topic=topic -->'
                end = '<!-- devbook-improvement:end -->'
                original = f'Original user text\n\n{runtime.marker("topic", 1)}\n\n{begin}\nOld summary\n{end}\n'
                proposed = original.replace('Old summary', 'New cumulative summary')
                api.prs[0]['body'] = original
                snapshot = copy.deepcopy(engine.open_prs())
                api.prs[0]['body'] = original.replace('Original user text', 'Concurrent human edit') + '\nHuman footer\n'
                if recovery:
                    api.refs[BRANCH] = 'candidate-commit'
                    api.check_sha = 'candidate-commit'
                    store.state['pending_operation']['body'] = proposed
                    result = engine.recover_pending()
                    self.assertEqual(result['status'], 'recovered')
                else:
                    engine._ensure_pr(snapshot, topic='topic', generation=1, branch=BRANCH,
                                      title='notes: improve topic', body=proposed)
                updated = api.prs[0]['body']
                self.assertIn('Concurrent human edit', updated)
                self.assertTrue(updated.endswith('\nHuman footer\n'))
                self.assertIn('New cumulative summary', updated)
                self.assertNotIn('Old summary', updated)
                self.assertEqual(updated.count(begin), 1)

    def test_export_handoff_releases_global_journal_without_verifying_or_finalizing(self):
        for recovery in [False, True]:
            with self.subTest(recovery=recovery):
                api, store, engine = pending_runtime('pr_updated' if recovery else 'prepared')
                op = copy.deepcopy(store.state['pending_operation'])
                if recovery:
                    store.state['pending_operation']['export_required'] = True
                    result = engine.recover_pending()
                else:
                    store.state['pending_operation'] = None
                    path = 'Vault/Home/Topic/Note.md'
                    with mock.patch.object(runtime, 'require_apply_activation'):
                        result = engine.publish(topic='topic', generation=1, branch=BRANCH,
                            expected_sources={path: api.files[(BRANCH, path)]}, candidate={path: 'candidate'},
                            title='notes: improve topic', body=runtime.marker('topic', 1),
                            feedback_revision=op['feedback_revision'], expected_base_sha='base',
                            expected_branch_sha='base', expected_pr_number=1,
                            operation_receipts=op['receipts'], export_required=True)
                self.assertEqual(result['status'], 'awaiting_export')
                self.assertIsNone(store.state['pending_operation'])
                archived = store.state['export_operations'][result['op_id']]
                self.assertTrue(archived['export_required'])
                self.assertEqual(archived['receipts'], op['receipts'])
                pr = store.state['prs']['topic:1']
                self.assertTrue(pr['frozen'])
                self.assertTrue(pr['export_required'])
                self.assertEqual(pr['export_operation_id'], result['op_id'])
                self.assertEqual(pr['head_sha'], result['commit_sha'])
                self.assertEqual(pr['proposal_records'], op['receipts']['records'])
                self.assertEqual(pr['base_note_hashes'], op['receipts']['base_note_hashes'])
                self.assertNotIn('validation_failure', pr)
                self.assertFalse(store.state.get('completed_operations'))
                self.assertFalse(store.state.get('finalized_operations'))
                self.assertFalse(any('/actions/' in call[1] or '/check-runs' in call[1] for call in api.calls))
                runtime.OperationJournal(store).prepare({'op_id': 'unrelated-topic'})
                self.assertEqual(store.state['pending_operation']['op_id'], 'unrelated-topic')

    def test_transport_allows_compare_ranges_but_rejects_decoded_traversal(self):
        runner = mock.Mock(return_value=subprocess.CompletedProcess([], 0, stdout='{}', stderr=''))
        api = runtime.GhApi('owner/repo', runner=runner)
        with mock.patch.dict('os.environ', {'DEVBOOK_GITHUB_TOKEN': 'dedicated', 'GITHUB_TOKEN': 'default'}):
            api.request('GET', '/compare/abc123...def456?per_page=100')
            api.request('GET', '/git/ref/heads/notes%2Ftopic')
            for path in ['/../issues', '/contents/%2e%2e/secret', '/contents/%252e%252e%252fsecret',
                         '//evil.test/issues', '/contents/a%5c..%5csecret', '/contents/a%00b']:
                with self.subTest(path=path), self.assertRaises(runtime.UnsafeInput):
                    api.request('GET', path)
        self.assertEqual(runner.call_count, 2)

    def test_changed_owner_feedback_invalidates_unapplied_recovery_without_remote_writes(self):
        for phase in ['prepared', 'commit_created']:
            for change in ['added', 'edited', 'deleted']:
                with self.subTest(phase=phase, change=change):
                    api, store, engine = pending_runtime(phase)
                    if change == 'added':
                        added = copy.deepcopy(api.comments['ordinary'][0])
                        added.update(id=11, body='Also explain the boundary.')
                        api.comments['ordinary'].append(added)
                    elif change == 'edited':
                        api.comments['ordinary'][0]['body'] = 'Changed owner request.'
                    else:
                        api.comments['ordinary'].clear()
                    result = engine.recover_pending()
                    self.assertEqual(result['status'], 'feedback_changed')
                    self.assertIsNone(store.state['pending_operation'])
                    self.assertEqual(store.state['invalidated_operations']['op']['candidate'],
                                     {'Vault/Home/Topic/Note.md': 'candidate'})
                    self.assertEqual(api.refs[BRANCH], 'base')
                    self.assertTrue(all(call[0] == 'GET' for call in api.calls))
                    self.assertFalse(store.state.get('completed_operations'))

    def test_feedback_changed_during_commit_creation_stops_before_draft_or_ref_write(self):
        api, store, engine = pending_runtime()
        request = api.request
        def changed_after_commit(method, path, payload=None, *, paginate=False):
            response = request(method, path, payload, paginate=paginate)
            if method == 'POST' and path == '/git/commits':
                api.comments['ordinary'][0]['body'] = 'Updated while candidate commit was created.'
            return response
        api.request = changed_after_commit
        self.assertEqual(engine.recover_pending()['status'], 'feedback_changed')
        self.assertEqual(api.refs[BRANCH], 'base')
        self.assertFalse(any(call[0] in {'PATCH', 'GRAPHQL'} for call in api.calls))
        self.assertEqual(store.state['invalidated_operations']['op']['evidence']['commit_sha'], 'commit-1')

    def test_applied_ref_survives_feedback_change_and_recovers_without_republishing(self):
        api, store, engine = pending_runtime('commit_created')
        api.refs[BRANCH] = 'candidate-commit'
        api.check_sha = 'candidate-commit'
        api.comments['ordinary'][0]['body'] = 'New owner correction after the branch write.'
        result = engine.recover_pending()
        self.assertEqual(result['status'], 'recovered')
        self.assertEqual(api.refs[BRANCH], 'candidate-commit')
        self.assertFalse(any(call[0] == 'PATCH' and '/git/refs/' in call[1] for call in api.calls))
        self.assertFalse(store.state.get('invalidated_operations'))

    def test_engine_apply_opportunity_resumes_other_topic_then_explicit_owner_correction(self):
        api, store, publisher = pending_runtime('pr_updated')
        path = 'Vault/Home/Topic/Note.md'
        source = api.files[(BRANCH, path)]
        topic = core.topic_for(path)
        topic_key = core.topic_id(topic)
        branch = runtime.expected_managed_branch(topic_key, 1)
        api.refs[branch] = api.refs.pop(BRANCH)
        api.files[(branch, path)] = 'candidate'
        api.prs[0]['head'].update(ref=branch, sha='candidate-commit')
        api.prs[0]['body'] = runtime.marker(topic_key, 1)
        op = store.state['pending_operation']
        op.update(topic=topic_key, branch=branch)
        op['receipts']['base_note_hashes'] = {path: core.digest(source)}
        api.comments['ordinary'].clear()
        with mock.patch.object(runtime, 'publication_check_state', return_value=(
            'failed', {'pr-title': 'failure', 'major-approval': 'success'}, 'success'
        )):
            with self.assertRaises(runtime.RuntimeFailure):
                publisher.recover_pending()
        other_path = 'Vault/Home/Other/Note.md'
        base = {path: source, other_path: source}
        notes = lambda _: [
            {'path': name, 'content': text, 'hash': core.digest(text),
             'topic': core.topic_for(name), 'violations': []}
            for name, text in base.items()
        ]
        root = pipeline_root(self, Path(__file__).resolve().parents[2])
        config = {**core.DEFAULT_CONFIG, 'repo': api.repo, 'base_branch': 'main',
                  'owner_allowlist': [{'id': 1, 'login': 'owner'}]}
        def opportunity():
            return pipeline.Engine(root, config, store, api=api, publisher=publisher,
                notes_loader=notes, snapshot_sha_loader=lambda: 'base').run(apply=True)
        unrelated = opportunity()
        self.assertEqual(unrelated['status'], 'selected')
        self.assertEqual(unrelated['batch']['topic'], 'Other')
        api.comments['ordinary'].append({
            'id': 11, 'body': 'Please fix the failed card.',
            'updated_at': '2026-10-24T02:00:00Z', 'user': {'id': 1, 'login': 'owner'},
        })
        correction = opportunity()
        self.assertEqual(correction['status'], 'selected')
        self.assertEqual(correction['batch']['topic'], topic)
        self.assertTrue(correction['batch']['feedback'])
        self.assertEqual(api.refs[branch], 'candidate-commit')
        self.assertEqual(store.state['prs'][f'{topic_key}:1']['proposal_records'],
                         store.state['failed_operations']['op']['receipts']['records'])
        self.assertFalse(store.state.get('completed_operations'))
        self.assertFalse(store.state.get('finalized_operations'))
        self.assertFalse(store.state['notes'])

    def test_terminal_validation_failure_archives_and_frees_global_journal(self):
        api, store, engine = pending_runtime('pr_updated')
        # Newly created PRs obtain their number from persisted publication evidence.
        store.state['pending_operation']['pr_number'] = None
        request = api.request
        def failing_request(method, path, payload=None, *, paginate=False):
            result = request(method, path, payload, paginate=paginate)
            if '/check-runs' in path:
                result['check_runs'][0]['conclusion'] = 'failure'
            return result
        api.request = failing_request
        with self.assertRaisesRegex(runtime.RuntimeFailure, 'exact-head validation failed'):
            engine.recover_pending()
        self.assertIsNone(store.state['pending_operation'])
        failed = store.state['failed_operations']['op']
        self.assertEqual(failed['evidence']['check_sha'], 'candidate-commit')
        self.assertEqual(failed['evidence']['checks']['pr-title'], 'failure')
        self.assertEqual(failed['receipts']['records'][0]['reason'], 'Clarify')
        pr = store.state['prs']['topic:1']
        self.assertTrue(pr['frozen'])
        self.assertEqual(pr['head_sha'], 'candidate-commit')
        self.assertEqual(pr['number'], 1)
        self.assertEqual(pr['proposal_records'], failed['receipts']['records'])
        self.assertEqual(pr['base_note_hashes'], failed['receipts']['base_note_hashes'])
        self.assertFalse(store.state.get('completed_operations'))
        self.assertFalse(store.state.get('finalized_operations'))
        self.assertIsNone(engine.recover_pending())
        runtime.OperationJournal(store).prepare({'op_id': 'other-topic'})
        self.assertEqual(store.state['pending_operation']['op_id'], 'other-topic')


if __name__ == '__main__':
    unittest.main()
