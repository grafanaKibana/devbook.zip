'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { inspectReferences } = require('../qard-learn-sync/references.cjs');

const OLD = 'Home/Programming/NET/Old.md';
const MOVED = 'Home/Programming/CSharp/Moved.md';

function fixture(t, files) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qard-references-'));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(repoRoot, 'Vault', file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  return repoRoot;
}

test('a note moved outside Obsidian leaves stale Qard records and a stale deck/topic seed', t => {
  const repoRoot = fixture(t, {
    [MOVED]: '---\nqard-deck: "Programming"\nqard-topic: "NET/Old"\n---\nBody\n',
    'Home/Programming/Kept.md': '---\r\nqard-deck: Programming\r\nqard-topic: Kept\r\n---\r\nBody\r\n',
    'Assets/Qard/Lessons/lesson.json': JSON.stringify({ notes: [OLD, 'Home/Programming/Kept.md'], sourceSnapshots: [{ path: OLD, text: 'Body' }] }),
    'Assets/Qard/Checks/Programming/check.json': JSON.stringify({ questions: [{ source: { path: OLD } }] }),
    'Assets/Qard/Courses/Programming Mastery.md': '| ID | Notes |\n| --- | --- |\n| types | [[Home/Programming/NET/Old]] [[Home/Programming/Kept\\|Kept]] [[Home/Topics.base]] |\n',
    'Home/Topics.base': '',
    'Qard/Source links.json': JSON.stringify({ version: 1, notes: { n0: { path: OLD, text: 'Body' } }, links: {} })
  });

  const stale = inspectReferences({ repoRoot });
  const dependents = inspectReferences({ repoRoot, paths: ['Home/Programming/Kept.md'] });

  assert.deepEqual(stale.problems, []);
  assert.deepEqual(stale.references.map(item => `${item.file} ${item.where}`), [
    'Assets/Qard/Checks/Programming/check.json .questions[].source.path',
    'Assets/Qard/Courses/Programming Mastery.md wikilink',
    'Assets/Qard/Lessons/lesson.json .notes[]',
    'Assets/Qard/Lessons/lesson.json .sourceSnapshots[].path',
    'Qard/Source links.json .notes.n0.path'
  ]);
  assert.ok(stale.references.every(item => item.note === OLD && !item.exists));
  assert.deepEqual(stale.seeds, [{ note: MOVED, actual: { deck: 'Programming', topic: 'NET/Old' }, expected: { deck: 'Programming', topic: 'CSharp/Moved' }, matches: false }]);
  assert.deepEqual(dependents.references.map(item => item.file), ['Assets/Qard/Courses/Programming Mastery.md', 'Assets/Qard/Lessons/lesson.json']);
  assert.deepEqual(dependents.seeds.map(item => item.matches), [true]);
});
