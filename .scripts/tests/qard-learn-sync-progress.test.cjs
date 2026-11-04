'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { completedLessonProblems } = require('../qard-learn-sync/core.cjs');

const COURSE = 'Assets/Qard/Courses/Programming Mastery.md';
const LESSON = 'Assets/Qard/Lessons/Completed.json';
const record = { version: 1, mastery: COURSE, objective: 'value-semantics', accepted: true,
  finishedAt: 1793453076025, close: { nextCheck: '2026-11-03' } };
const lesson = value => ({ path: LESSON, text: JSON.stringify(value) });
const row = (id = 'value-semantics') => ({ id, state: 'new', due: '', evidence: '' });
const course = rows => [{ path: COURSE, rows }];

test('completed lessons expose all four blank resets without choosing or restoring progress', () => {
  const ids = ['value-semantics', 'parameter-passing', 'generic-contracts', 'failure-contracts'];
  const courses = course(ids.map(id => row(id)));
  const lessons = ids.map(id => ({ path: `Assets/Qard/Lessons/${id}.json`, text: JSON.stringify({ ...record, objective: id }) }));
  const before = JSON.stringify({ courses, lessons });
  const problems = completedLessonProblems(courses, lessons);
  assert.equal(problems.length, 4);
  for (const id of ids) {
    assert.ok(problems.some(problem => problem.includes(`${COURSE}#${id}`) && problem.includes(`Lessons/${id}.json`)), id);
  }
  assert.equal(JSON.stringify({ courses, lessons }), before);
  assert.deepEqual(completedLessonProblems(course(ids.map(id => ({ ...row(id), state: 'taught', due: '2026-11-03' }))), lessons), []);
});

test('assessed states, intentionally empty new rows with evidence, absent objectives and unrelated courses are preserved', () => {
  for (const state of ['gap', 'misconception', 'shaky', 'right once', 'mastered', 'slipping', 'taught']) {
    assert.deepEqual(completedLessonProblems(course([{ ...row(), state }]), [lesson(record)]), []);
  }
  assert.deepEqual(completedLessonProblems(course([{ ...row(), evidence: '2026-11-04 check' }]), [lesson(record)]), []);
  assert.deepEqual(completedLessonProblems(course([]), [lesson(record)]), []);
  assert.deepEqual(completedLessonProblems(course([row()]), [lesson({ ...record, mastery: 'Elsewhere/Programming Mastery.md' })]), []);
  assert.deepEqual(completedLessonProblems(course([row()]), [lesson({ ...record, objective: 'removed' })]), []);
  assert.deepEqual(completedLessonProblems(course([row()]), [lesson({ ...record, mastery: undefined, objective: undefined })]), []);
});

test('unfinished and pending-close lessons are legitimate; malformed or unsupported completed evidence is diagnostic', () => {
  const courses = course([row()]);
  assert.deepEqual(completedLessonProblems(courses, [lesson({ ...record, finishedAt: undefined, close: undefined, accepted: false })]), []);
  assert.deepEqual(completedLessonProblems(courses, [lesson({ ...record, close: undefined })]), []);
  for (const value of [null, [], { ...record, version: 2 }, { ...record, accepted: false },
    { ...record, finishedAt: 'yesterday' }, { ...record, close: null },
    { ...record, close: { nextCheck: '2026-02-30' } }, { ...record, close: {} }]) {
    const problems = completedLessonProblems(courses, [lesson(value)]);
    assert.equal(problems.length, 1, JSON.stringify(value));
    assert.match(problems[0], /Completed\.json/);
    assert.match(problems[0], /invalid|unsupported|cannot/i);
  }
  assert.match(completedLessonProblems(courses, [{ path: LESSON, text: '{broken' }])[0], /Completed\.json/);
});
