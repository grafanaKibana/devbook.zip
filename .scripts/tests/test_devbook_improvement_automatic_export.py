"""Automatic export queues do not prevent bounded PR growth or repeat proposals."""
import copy
import datetime as dt
from pathlib import Path
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.scripts'))
from devbook_improvement import core, demo, runtime
import test_devbook_improvement_safety as fixtures
from test_devbook_improvement_review_runtime import pending_runtime


class AwaitingPublisher(demo.FakePublisher):
    def publish(self, **kwargs):
        result = super().publish(**kwargs)
        snapshot = self.store.read()
        state = snapshot.state
        operation = state['completed_operations'].pop(result['op_id'])
        operation.update(topic=kwargs['topic'], generation=kwargs['generation'],
            evidence={'export_head': result['commit_sha'], 'export_attempts': 1,
                      'export_last_dispatch_at': '2026-10-13T12:00:00Z'})
        state.setdefault('export_operations', {})[result['op_id']] = operation
        receipt = kwargs['operation_receipts']
        key = f"{kwargs['topic']}:{kwargs['generation']}"
        prior = state['prs'].get(key, {})
        state['prs'][key] = {**prior, 'topic_id': kwargs['topic'], 'generation': kwargs['generation'],
            'number': result['pr']['number'], 'branch': kwargs['branch'], 'head_sha': result['commit_sha'],
            'status': 'open', 'draft': True, 'frozen': bool(kwargs.get('freeze')),
            'export_required': True, 'automatic_export': True, 'export_operation_id': result['op_id'],
            'proposal_records': copy.deepcopy(receipt['records']), 'base_note_hashes': receipt['base_note_hashes']}
        self.store.write(state, snapshot, 'fixture: queue automatic export')
        return {**result, 'status': 'awaiting_export'}


class AutomaticExportQueueTests(unittest.TestCase):
    setUp = fixtures.PipelineSafetyTests.setUp
    engine = fixtures.PipelineSafetyTests.engine

    def automatic(self):
        self.config.update(automatic_export=True, max_notes_per_run=1)
        self.base['Vault/Home/Programming/NET/Demo ValueTask.md'] = demo._note('Demo ValueTask', 'second-id', 'ValueTask')
        self.publisher = AwaitingPublisher(self.store, self.api, self.base)

    def test_following_batches_reuse_unreviewed_pr_without_rewriting_pending_source(self):
        self.automatic()
        first = self.engine().run(apply=True, with_model=True)
        second = self.engine().run(apply=True, with_model=True)
        self.assertEqual('awaiting_export', first['status'])
        self.assertEqual('awaiting_export', second['status'])
        self.assertNotEqual(first['proposal']['edits'][0]['path'], second['proposal']['edits'][0]['path'])
        self.assertEqual(1, self.publisher.pr_create_count)
        self.assertEqual(1, self.publisher.pr_update_count)
        self.assertFalse(next(iter(self.store.state['prs'].values()))['frozen'])
        self.assertEqual('no_changes', self.engine().run(apply=True, with_model=True)['status'])
        self.assertEqual(2, self.model.author_calls)

    def test_legacy_export_freeze_clears_but_owner_review_still_freezes_new_additions(self):
        self.automatic()
        self.engine().run(apply=True, with_model=True)
        next(iter(self.store.state['prs'].values()))['frozen'] = True
        self.assertEqual('selected', self.engine().run()['status'])
        self.assertFalse(next(iter(self.store.state['prs'].values()))['frozen'])
        self.api.add_owner_comment(1, 'Clarify the thread boundary.',
            updated_at='2026-10-29T01:00:00Z', paths=[fixtures.PATH])
        self.engine().run(apply=True, with_model=True)
        row = next(iter(self.store.state['prs'].values()))
        self.assertTrue(row['frozen'])
        self.assertTrue(row['review_started_head_sha'])
        # The remaining unrequested ValueTask note cannot enter the reviewed PR.
        calls = self.model.author_calls
        self.assertEqual('no_changes', self.engine().run(apply=True, with_model=True)['status'])
        self.assertEqual(calls, self.model.author_calls)

    def test_migration_preserves_validation_and_size_freezes(self):
        for reason in ('validation_failure', 'review_started_head_sha', 'size'):
            with self.subTest(reason=reason):
                self.setUp()
                self.automatic()
                self.engine().run(apply=True, with_model=True)
                row = next(iter(self.store.state['prs'].values()))
                row['frozen'] = True
                if reason == 'size':
                    self.config['max_pr_notes'] = 1
                else:
                    row[reason] = 'evidence'
                self.assertEqual('no_changes', self.engine().run()['status'])
                self.assertTrue(next(iter(self.store.state['prs'].values()))['frozen'])


class AutomaticDispatchTests(unittest.TestCase):
    def test_retry_spacing_caps_and_legacy_or_new_head_resumption(self):
        fixture = AutomaticExportQueueTests()
        fixture.setUp()
        fixture.automatic()
        engine = fixture.engine()
        state = core.new_state()
        state['prs']['topic:1'] = {'status': 'open', 'export_required': True,
            'export_operation_id': 'op', 'head_sha': 'a' * 40, 'number': 1,
            'branch': 'notes/automated-topic-g1'}
        state['export_operations'] = {'op': {'automatic_export': False}}
        with mock.patch('devbook_improvement.export_worker.dispatch_export') as dispatch:
            engine.retry_exports(state)  # Existing manual handoffs migrate without new model work.
            self.assertEqual(1, dispatch.call_count)
            engine.retry_exports(state)
            self.assertEqual(1, dispatch.call_count)
            for _ in range(3):
                fixture.clock += dt.timedelta(hours=6)
                engine.retry_exports(state)
            self.assertEqual(3, dispatch.call_count)
            self.assertIn('three attempts', state['prs']['topic:1']['export_attention'])
            state['prs']['topic:1']['head_sha'] = 'b' * 40
            engine.retry_exports(state)
            self.assertEqual(4, dispatch.call_count)
            state['prs']['topic:1']['status'] = 'closed'
            fixture.clock += dt.timedelta(hours=6)
            engine.retry_exports(state)
            self.assertEqual(4, dispatch.call_count)

    def test_recovery_dispatches_once_and_releases_journal_without_export_freeze(self):
        api, store, publisher = pending_runtime('pr_updated')
        store.state['pending_operation'].update(export_required=True, automatic_export=True)
        with mock.patch('devbook_improvement.export_worker.dispatch_export') as dispatch:
            result = publisher.recover_pending()
            dispatch.assert_called_once_with(api, 1, 'notes/automated-topic-g1', 'candidate-commit', ref='main')
            self.assertEqual('awaiting_export', result['status'])
            self.assertIsNone(store.state['pending_operation'])
            self.assertFalse(store.state['prs']['topic:1']['frozen'])
            self.assertTrue(store.state['prs']['topic:1']['automatic_export'])
            self.assertIsNone(publisher.recover_pending())
            self.assertEqual(1, dispatch.call_count)

    def test_failed_dispatch_remains_recoverable_before_archival(self):
        _, store, publisher = pending_runtime('pr_updated')
        store.state['pending_operation'].update(export_required=True, automatic_export=True)
        with mock.patch('devbook_improvement.export_worker.dispatch_export', side_effect=runtime.RuntimeFailure('transport')):
            with self.assertRaises(runtime.RuntimeFailure):
                publisher.recover_pending()
        self.assertEqual('pr_updated', store.state['pending_operation']['phase'])
        self.assertFalse(store.state.get('export_operations'))
        with mock.patch('devbook_improvement.export_worker.dispatch_export') as dispatch:
            self.assertEqual('awaiting_export', publisher.recover_pending()['status'])
            dispatch.assert_not_called()  # Ambiguous first request waits for the bounded reconciler.
        operation = next(iter(store.state['export_operations'].values()))
        self.assertEqual(1, operation['evidence']['export_attempts'])
        self.assertTrue(operation['evidence']['export_last_dispatch_at'])


if __name__ == '__main__':
    unittest.main()
