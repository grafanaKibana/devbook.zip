"""Regression coverage for bounded owner feedback and complete card retirement."""
import copy
import sys
from pathlib import Path
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.scripts'))
from devbook_improvement import core, runtime
import test_devbook_improvement_safety as fixtures


class ReviewQueueTests(unittest.TestCase):
    def test_retirement_removes_complete_metadata_block_and_records_identity(self):
        change = fixtures.edit(kind='remove', learning_target='retired', after='')
        result = core.apply_proposal({fixtures.CARD_PATH: fixtures.NOTE}, fixtures.proposal(change))
        self.assertEqual(['stable_1'], result['retired_ids'])
        self.assertNotIn('qard-location', result['sources'][fixtures.CARD_PATH])
        self.assertEqual('retired', result['lineage'][0]['learning_target'])
        for before, after, target in [
            (fixtures.CARD, '> [!qard]- A replacement?\n> Answer.\n', 'retired'),
            (fixtures.CARD, '', 'new'),
            ('<!-- qard-reverse: sibling -->\n' + fixtures.CARD, '', 'retired'),
        ]:
            note = fixtures.NOTE.replace(fixtures.CARD, before)
            with self.subTest(target=target, before=before), self.assertRaises(core.ProposalError):
                core.apply_proposal({fixtures.CARD_PATH: note}, fixtures.proposal(fixtures.edit(
                    kind='remove', learning_target=target, before=before, after=after,
                    expected_hash=core.digest(note))))

    def test_feedback_is_scoped_to_whole_requests_in_bounded_selected_notes(self):
        paths = [f'Vault/Home/Programming/NET/{name}.md' for name in ('A', 'B', 'Z')]
        notes = [{'path': path, 'content': 'Text', 'topic': core.topic_for(path)} for path in paths]
        state = core.new_state()
        state['feedback'] = {
            'z': {'key': 'z', 'status': 'pending', 'topic': notes[0]['topic'], 'paths': [paths[2]]},
            'ab': {'key': 'ab', 'status': 'pending', 'topic': notes[0]['topic'], 'paths': paths[:2]},
        }
        batch = core.select_batch(state, notes, 'rules', {'max_notes_per_run': 1})
        self.assertEqual([paths[2]], [note['path'] for note in batch['notes']])
        self.assertEqual(['z'], [item['key'] for item in batch['feedback']])
        self.assertEqual('pending', state['feedback']['ab']['status'])
        state['feedback'].pop('z')
        batch = core.select_batch(state, notes, 'rules', {'max_notes_per_run': 2})
        self.assertEqual(paths[:2], [note['path'] for note in batch['notes']])
        self.assertEqual(['ab'], [item['key'] for item in batch['feedback']])
        state['feedback']['pathless'] = {'key': 'pathless', 'status': 'pending', 'topic': notes[0]['topic'], 'paths': []}
        batch = core.select_batch(state, notes, 'rules', {'max_notes_per_run': 1})
        self.assertEqual(['pathless'], [item['key'] for item in batch['feedback']])


    def test_frozen_pr_processes_four_inline_requests_and_keeps_fifth_pending(self):
        paths = [f'Vault/Home/Programming/NET/{number}.md' for number in range(5)]
        topic = core.topic_for(paths[0])
        notes = [{'path': path, 'content': 'Text', 'topic': topic} for path in paths]
        state = core.new_state()
        state['prs']['topic:1'] = {'number': 1, 'status': 'open', 'topic_id': core.topic_id(topic), 'frozen': True}
        state['feedback'] = {str(index): {'key': str(index), 'kind': 'inline', 'status': 'pending',
            'topic': topic, 'paths': [path]} for index, path in enumerate(paths)}
        batch = core.select_batch(state, notes, 'rules', {'max_notes_per_run': 4})
        self.assertEqual(paths[:4], [note['path'] for note in batch['notes']])
        self.assertEqual(['0', '1', '2', '3'], [item['key'] for item in batch['feedback']])
        proposal = {'dispositions': [{'path': note['path'], 'outcome': 'keep', 'reason': 'Reviewed.'}
                                    for note in batch['notes']],
                    'feedback': [{'key': item['key'], 'outcome': 'keep', 'reason': 'Reviewed.'}
                                 for item in batch['feedback']]}
        updated = core.record_outcome(state, batch, proposal, {'sources': {}})
        self.assertEqual('pending', updated['feedback']['4']['status'])
        next_batch = core.select_batch(updated, notes, 'rules', {'max_notes_per_run': 4})
        self.assertEqual(['4'], [item['key'] for item in next_batch['feedback']])
        self.assertEqual([paths[4]], [note['path'] for note in next_batch['notes']])


class FeedbackPollingTests(unittest.TestCase):
    setUp = fixtures.PipelineSafetyTests.setUp
    engine = fixtures.PipelineSafetyTests.engine

    def queue_comment(self):
        self.engine().run(apply=True, with_model=True)
        self.api.add_owner_comment(1, 'Clarify the thread boundary.', updated_at='2026-10-13T12:10:00Z')
        notes = self.engine().notes_loader(self.root)
        state, _, _ = self.engine().remote_view(copy.deepcopy(self.store.state), notes, 'base-0001')
        return state, notes, next(iter(state['feedback']))

    def test_oversized_ordinary_comment_needs_scope_without_model_or_partial_consumption(self):
        paths = [f'Vault/Home/Programming/NET/{index}.md' for index in range(5)]
        topic = core.topic_for(paths[0])
        self.base = {path: 'Note text' for path in paths}
        self.config['max_notes_per_run'] = 4
        self.store.state['prs']['topic:1'] = {
            'number': 1, 'status': 'open', 'topic_id': core.topic_id(topic), 'frozen': True}
        self.store.state['feedback']['ordinary'] = {
            'key': 'ordinary', 'kind': 'comment', 'status': 'pending', 'topic': topic,
            'body': 'Improve these answers.', 'paths': paths}
        for with_model in (False, True):
            engine = self.engine()
            engine.api = None
            engine.model = None
            result = engine.run(with_model=with_model)
            self.assertEqual('feedback_needs_scope', result['status'])
            self.assertEqual(0, result['model_calls'])
            self.assertEqual([], result['batch']['notes'])
            self.assertEqual(['ordinary'], [item['key'] for item in result['feedback']])
            self.assertEqual('pending', self.store.state['feedback']['ordinary']['status'])
            self.assertFalse(self.store.state['notes'])
        # A bounded inline request can proceed before the broader request is
        # surfaced again on the following opportunity.
        self.store.state['feedback']['inline'] = {
            'key': 'inline', 'kind': 'inline', 'status': 'pending', 'topic': topic, 'paths': [paths[0]]}
        engine = self.engine()
        engine.api = None
        selected = engine.run()['batch']
        self.assertEqual(['inline'], [item['key'] for item in selected['feedback']])
        self.store.state['feedback']['inline']['status'] = 'keep'
        self.assertEqual('feedback_needs_scope', engine.run()['status'])

    def test_successful_poll_withdraws_deleted_and_blank_pending_feedback(self):
        state, notes, key = self.queue_comment()
        for comments in ([], [{**self.api.comments[1][0], 'body': ''}]):
            with self.subTest(comments=comments):
                self.api.comments[1] = comments
                refreshed, _, _ = self.engine().remote_view(copy.deepcopy(state), copy.deepcopy(notes), 'base-0001')
                self.assertEqual('withdrawn', refreshed['feedback'][key]['status'])
        self.api.add_owner_comment(1, 'Edited request.', updated_at='2026-10-13T12:20:00Z')
        refreshed, _, _ = self.engine().remote_view(copy.deepcopy(state), copy.deepcopy(notes), 'base-0001')
        self.assertEqual('superseded', refreshed['feedback'][key]['status'])
        self.assertEqual(1, sum(item['status'] == 'pending' for item in refreshed['feedback'].values()))

    def test_failed_or_base_conflict_poll_preserves_pending_feedback(self):
        state, notes, key = self.queue_comment()
        with mock.patch('devbook_improvement.pipeline.runtime.poll_feedback', side_effect=runtime.RuntimeFailure('network')):
            with self.assertRaises(runtime.RuntimeFailure):
                self.engine().remote_view(state, notes, 'base-0001')
        self.assertEqual('pending', state['feedback'][key]['status'])
        self.api.comments[1] = []
        notes[0]['hash'] = 'new-base-hash'
        refreshed, _, _ = self.engine().remote_view(state, notes, 'different-base')
        self.assertEqual('pending', refreshed['feedback'][key]['status'])
        engine = self.engine()
        engine.api = None
        refreshed, _, _ = engine.remote_view(state, notes)
        self.assertEqual('pending', refreshed['feedback'][key]['status'])


if __name__ == '__main__':
    unittest.main()
