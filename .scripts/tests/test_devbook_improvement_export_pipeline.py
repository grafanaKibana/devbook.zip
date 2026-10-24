"""Managed PR exports remain separate from model-authored note changes."""
import copy
import sys
from pathlib import Path
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / '.scripts'))
from devbook_improvement import core, runtime, sync_export
import test_devbook_improvement_safety as fixtures


class ExportPipelineTests(unittest.TestCase):
    setUp = fixtures.PipelineSafetyTests.setUp
    engine = fixtures.PipelineSafetyTests.engine

    def seed_export(self, op_id='export-op', *, updated_at='2026-10-24T01:00:00Z', decisions=()):
        key, prior = next(iter(self.store.state['prs'].items()))
        topic, generation = key.rsplit(':', 1)
        prior.update(topic_id=topic, generation=int(generation))
        receipt = copy.deepcopy(prior['proposal_records'][-1])
        receipt['decisions'] = list(decisions)
        receipt['records'] = copy.deepcopy(prior['proposal_records'])
        prior.update(export_required=True, export_operation_id=op_id, frozen=True)
        self.store.state.setdefault('export_operations', {})[op_id] = {
            'topic': prior['topic_id'], 'generation': prior['generation'],
            'updated_at': updated_at, 'receipts': receipt,
        }
        return prior

    def test_reviewed_candidate_requests_export_without_widening_model_writes(self):
        with mock.patch.object(self.publisher, 'publish', wraps=self.publisher.publish) as publish:
            result = self.engine().run(apply=True, with_model=True)
        arguments = publish.call_args.kwargs
        self.assertTrue(arguments['export_required'])
        self.assertTrue(all(path.startswith('Vault/Home/') for path in arguments['candidate']))
        self.assertIn('verified local Syncer handoff', result['summary'])
        self.assertIn('sync_export export --expected-head', result['summary'])

    def test_verified_export_paths_are_not_card_scope_even_when_sources_need_reexport(self):
        self.engine().run(apply=True, with_model=True)
        self.api.files[1].extend([
            {'filename': 'Web/content/Programming/NET/Demo Tasks.md', 'additions': 1},
            {'filename': sync_export.RECEIPT_PATH, 'additions': 1},
        ])
        self.api.add_owner_comment(1, 'Clarify the thread boundary.', updated_at='2026-10-24T01:00:00Z')
        for fresh in (True, False):
            with self.subTest(fresh=fresh), mock.patch.object(sync_export, 'remote_receipt', return_value=({}, fresh)):
                engine = self.engine()
                state, managed, feedback = engine.remote_view(copy.deepcopy(self.store.state), engine.notes_loader(self.root), 'base-0001')
                self.assertEqual([fixtures.PATH], managed[1]['changed_paths'])
                self.assertEqual([fixtures.PATH], feedback[0]['paths'])
                row = next(iter(state['prs'].values()))
                self.assertEqual(not fresh, row['export_required'])
                self.assertFalse(row['base_conflict'])
                self.assertTrue(row['frozen'])

    def test_tampered_export_pauses_affected_topic_without_losing_queue(self):
        self.engine().run(apply=True, with_model=True)
        self.api.files[1].append({'filename': 'Web/content/Programming/NET/Demo Tasks.md'})
        with mock.patch.object(sync_export, 'remote_receipt', side_effect=runtime.Conflict('invalid output receipt')):
            result = self.engine().run()
        self.assertEqual('topics_paused', result['status'])
        self.assertTrue(next(iter(self.store.state['prs'].values()))['base_conflict'])
        self.assertEqual(0, result['model_calls'])

    def test_export_verified_before_merge_still_finalizes_reviewed_note_versions(self):
        self.engine().run(apply=True, with_model=True)
        pr = self.api.prs[0]
        prior = self.seed_export()
        self.store.state['notes'].clear()
        self.api.files[1].extend([
            {'filename': 'Web/content/Programming/NET/Demo Tasks.md'},
            {'filename': sync_export.RECEIPT_PATH},
        ])
        with mock.patch.object(sync_export, 'remote_receipt', return_value=({}, True)), mock.patch.object(
                runtime, 'required_checks_for_sha', side_effect=runtime.Conflict('checks pending')):
            self.assertEqual('no_changes', self.engine().run()['status'])
        self.assertFalse(self.store.state.get('finalized_exports'))
        self.assertFalse(next(iter(self.store.state['prs'].values()))['export_required'])
        self.base[fixtures.PATH] = self.publisher.branches[pr['head']['ref']][fixtures.PATH]
        pr.update(state='closed', merged_at='2026-10-24T02:00:00Z')
        self.assertEqual('no_changes', self.engine().run()['status'])
        self.assertEqual('changed', self.store.state['notes'][fixtures.PATH]['outcome'])
        self.assertFalse(self.store.state['rejections'])

    def test_all_export_decisions_finalize_once_and_feedback_waits_for_apply(self):
        self.engine().run(apply=True, with_model=True)
        prior = next(iter(self.store.state['prs'].values()))
        change = prior['proposal_records'][-1]['proposal']['edits'][0]
        fingerprint = core._fingerprint(change)
        self.seed_export('z-first', decisions=[{'decision': 'reject', 'fingerprint': fingerprint,
            'feedback_key': 'owner-1', 'reason': 'Restore the original.', 'edit': change}])
        prior['proposal_records'].append(copy.deepcopy(prior['proposal_records'][-1]))
        self.seed_export('a-second', decisions=[{
            'decision': 'reconsider', 'fingerprint': fingerprint, 'feedback_key': 'owner-2'}])
        engine = self.engine()
        with mock.patch.object(engine, 'feedback_receipt') as receipt:
            state = engine.finalize_export_receipts(self.store.state, prior, 'exported-head', post_feedback=False)
            receipt.assert_not_called()
            self.assertEqual(['owner-2'], state['rejections'][0]['reconsidered_by'])
            state = engine.finalize_export_receipts(state, prior, 'exported-head', post_feedback=True)
            self.assertEqual(2, receipt.call_count)
            state = engine.finalize_export_receipts(state, prior, 'exported-head', post_feedback=True)
            self.assertEqual(2, receipt.call_count)
            self.assertEqual(['owner-2'], state['rejections'][0]['reconsidered_by'])
            self.assertEqual({'z-first', 'a-second'}, set(state['finalized_exports']))

    def test_nonexport_paths_still_cannot_enter_managed_note_prs(self):
        self.engine().run(apply=True, with_model=True)
        self.api.files[1].append({'filename': '.github/workflows/devbook-improvement.yml'})
        with self.assertRaises(runtime.UnsafeInput):
            self.engine().run()


if __name__ == '__main__':
    unittest.main()
