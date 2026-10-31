'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { inspectCourse, reconcileCourse, renameSourcePath, sourceSnapshot } = require('../qard-learn-sync/core.cjs');

const DAY = '2026-10-31';
const source = (letter, cards = 1) => ({ revision: letter.repeat(64), cards });
const SOURCES = {
  'Home/Programming/Types.md': source('a'),
  'Home/Programming/Methods.md': source('b'),
};
const COURSE = `---
qard-mastery: "Programming"
publish: false
---

Keep this introduction untouched.

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Personal |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Explain copies \\| aliases | Types | types | 01 Types | mastered | 2026-12-15 | | [[Home/Programming/Types#Copies\\|Type aliases]] | 2026-10-20 check 4/4 sure; 2026-10-24 check 4/4 sure | retain **exactly** |
| Trace a call | Methods | methods | 02 Calls | right once | 2026-11-10 | types | [[Home/Programming/Methods.md]] | 2026-10-30 check 3/4 unsure | private note |

Keep this ending untouched.
`;

const reconcile = (text = COURSE, sources = SOURCES, extra = {}) => reconcileCourse(text, { sources, day: DAY, ...extra });
const objectiveFields = text => inspectCourse(text).rows.map(({ sourceRevision, sourceUpdated, ...row }) => row);
const dataRows = text => text.split(/\r?\n/).filter(line => line.startsWith('| Explain') || line.startsWith('| Trace'));

function assertOriginalCellsKept(before, after) {
  const oldRows = dataRows(before), newRows = dataRows(after);
  assert.equal(oldRows.length, newRows.length);
  for (let index = 0; index < oldRows.length; index++) assert.ok(newRows[index].startsWith(oldRows[index]), newRows[index]);
}

test('initializes tracking once without changing objective progress, custom cells or surrounding Markdown', () => {
  const baseline = reconcile();
  assert.deepEqual(baseline.initialized, ['types', 'methods']);
  assert.deepEqual(baseline.changed, []);
  assert.deepEqual(baseline.missing, []);
  assert.deepEqual(objectiveFields(baseline.text), objectiveFields(COURSE));
  assertOriginalCellsKept(COURSE, baseline.text);
  assert.ok(baseline.text.startsWith(COURSE.split('| Objective')[0]));
  assert.ok(baseline.text.endsWith('\n\nKeep this ending untouched.\n'));
  assert.ok(inspectCourse(baseline.text).rows.every(row => row.sourceUpdated === ''));
  const repeated = reconcile(baseline.text);
  assert.equal(repeated.text, baseline.text);
  assert.deepEqual(repeated.initialized, []);
  assert.deepEqual(repeated.changed, []);
});

test('new cards and edits flag only linked objectives while preserving all progress and custom content', () => {
  const baseline = reconcile();
  const newCards = reconcile(baseline.text, { ...SOURCES, 'Home/Programming/Types.md': source('a', 2) });
  assert.deepEqual(newCards.changed, ['types']);
  assert.equal(inspectCourse(newCards.text).rows[0].sourceUpdated, DAY);
  assert.deepEqual(objectiveFields(newCards.text), objectiveFields(COURSE));
  assertOriginalCellsKept(COURSE, newCards.text);
  const edited = reconcile(newCards.text, { ...SOURCES, 'Home/Programming/Types.md': source('c', 2) });
  assert.deepEqual(edited.changed, ['types']);
  assert.deepEqual(objectiveFields(edited.text), objectiveFields(COURSE));
  assert.equal(reconcile(edited.text, { ...SOURCES, 'Home/Programming/Types.md': source('c', 2) }).text, edited.text);
});

test('saved initial revisions detect offline edits on first startup without overriding course revisions', () => {
  const baseline = reconcile();
  const initialRevisions = Object.fromEntries(inspectCourse(baseline.text).rows.map(row => [row.id, row.sourceRevision]));
  const unchanged = reconcile(COURSE, SOURCES, { initialRevisions });
  assert.deepEqual(unchanged.changed, []);
  assert.deepEqual(unchanged.initialized, ['types', 'methods']);
  assert.equal(unchanged.text, baseline.text);
  const offlineEdit = reconcile(COURSE, { ...SOURCES, 'Home/Programming/Types.md': source('c', 2) }, { initialRevisions });
  assert.deepEqual(offlineEdit.changed, ['types']);
  assert.equal(inspectCourse(offlineEdit.text).rows[0].sourceUpdated, DAY);
  assert.equal(inspectCourse(offlineEdit.text).rows[1].sourceUpdated, '');
  assert.deepEqual(objectiveFields(offlineEdit.text), objectiveFields(COURSE));
  const staleSeed = { ...initialRevisions, types: 'v1:' + 'f'.repeat(64) + '/99' };
  const currentCourse = reconcile(baseline.text, SOURCES, { initialRevisions: staleSeed });
  assert.deepEqual(currentCourse.changed, []);
  assert.equal(currentCourse.text, baseline.text);
});

test('merges with the latest assessment text rather than restoring a stale snapshot', () => {
  const baseline = reconcile();
  const latest = baseline.text.replace('| right once | 2026-11-10 |', '| mastered | 2026-12-30 |')
    .replace('2026-10-30 check 3/4 unsure', '2026-10-30 check 3/4 unsure; 2026-11-03 check 4/4 sure');
  const result = reconcile(latest, { ...SOURCES, 'Home/Programming/Methods.md': source('d') });
  assert.deepEqual(result.changed, ['methods']);
  assert.deepEqual(objectiveFields(result.text), objectiveFields(latest));
  assert.equal(inspectCourse(result.text).rows[1].state, 'mastered');
  assert.equal(inspectCourse(result.text).rows[1].due, '2026-12-30');
});

test('proven file and folder renames preserve aliases, headings, extensions and all other cells', () => {
  const baseline = reconcile();
  const result = reconcile(baseline.text, {
    'Home/Runtime/Value Types.md': source('a'),
    'Home/Runtime/Methods.md': source('b'),
  }, { renames: [
    { from: 'Home/Programming/Types.md', to: 'Home/Programming/Value Types.md' },
    { from: 'Home/Programming', to: 'Home/Runtime' },
  ] });
  assert.deepEqual(result.renamed, ['types', 'methods']);
  assert.deepEqual(result.changed, []);
  assert.deepEqual(result.missing, []);
  assert.ok(result.text.includes('[[Home/Runtime/Value Types#Copies\\|Type aliases]]'));
  assert.ok(result.text.includes('[[Home/Runtime/Methods.md]]'));
  const fields = objectiveFields(result.text), before = objectiveFields(COURSE);
  for (let index = 0; index < fields.length; index++) {
    assert.deepEqual({ ...fields[index], notes: [] }, { ...before[index], notes: [] });
  }
});

test('a folder rename does not move a same-named Markdown note outside that folder', () => {
  const text = COURSE.replace('Home/Programming/Types#Copies', 'Home/Programming#Copies');
  const sources = { ...SOURCES, 'Home/Programming.md': source('a') };
  const baseline = reconcile(text, sources);
  const result = reconcile(baseline.text, {
    'Home/Programming.md': source('a'),
    'Home/Runtime/Methods.md': source('b'),
  }, { renames: [{ from: 'Home/Programming', to: 'Home/Runtime' }] });
  assert.deepEqual(result.renamed, ['methods']);
  assert.deepEqual(result.missing, []);
  assert.ok(result.text.includes('[[Home/Programming#Copies\\|Type aliases]]'));
  assert.deepEqual(result.changed, []);
});

test('a deleted or unresolved source retains the row, baseline revision, dates and evidence', () => {
  const baseline = reconcile();
  const result = reconcile(baseline.text, { 'Home/Programming/Methods.md': source('b') });
  assert.deepEqual(result.missing, [{ id: 'types', paths: ['Home/Programming/Types'] }]);
  assert.deepEqual(result.changed, []);
  assert.equal(result.text, baseline.text);
  const allMissing = reconcile(baseline.text, {});
  assert.equal(allMissing.text, baseline.text);
  assert.equal(allMissing.missing.length, 2);
});

test('manual row removal is respected and unrelated sources never create objectives', () => {
  const baseline = reconcile();
  const latest = baseline.text.split('\n').filter(line => !line.startsWith('| Trace')).join('\n');
  const result = reconcile(latest, { ...SOURCES, 'Home/Programming/New Topic.md': source('f') });
  assert.equal(result.text, latest);
  assert.deepEqual(inspectCourse(result.text).rows.map(row => row.id), ['types']);
});

test('arbitrary column order and CRLF round-trip without rewriting protected cells', () => {
  const text = '---\r\nqard-mastery: Course\r\n---\r\n\r\n| ID | State | Notes | Objective | Due | Evidence | Needs | Group | Label |\r\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\r\n| x | taught | [[Home/Programming/Types]] | A capability | 2026-12-01 | evidence | | Group | Label |\r\n';
  const baseline = reconcile(text);
  assert.deepEqual(objectiveFields(baseline.text), objectiveFields(text));
  assert.equal(baseline.text.replaceAll('\r\n', '').includes('\n'), false);
  assert.equal(reconcile(baseline.text).text, baseline.text);
});

test('malformed tables fail closed instead of silently dropping rows, IDs, states or prerequisites', () => {
  const cases = [
    [COURSE.replace('| methods |', '| types |'), /duplicate objective IDs/],
    [COURSE.replace('| right once |', '| finished |'), /unknown state/],
    [COURSE.replace('| types | [[Home/Programming/Methods', '| absent | [[Home/Programming/Methods'), /unknown prerequisite/],
    [COURSE.replace('| Needs |', '| Before |'), /missing Needs column/],
    [COURSE.replace('| private note |', '| private note'), /malformed objective row/],
    [COURSE.replace('| 01 Types | mastered', '| 01 Types | extra | mastered'), /malformed objective row/],
    [COURSE.replace('| 2026-11-10 | types |', '| 2026-11-10 | methods |'), /prerequisite cycle/],
  ];
  for (const [text, error] of cases) assert.throws(() => reconcile(text), error);
});


test('source snapshots ignore lifecycle and stock identity bookkeeping but detect learning-content changes', async () => {
  const note = '---\nsummary: "Value copying"\nstatus: Creation\n---\n\n> [!qard]- What is copied?\n> The contained value.\n';
  const baseline = await sourceSnapshot(note);
  assert.match(baseline.revision, /^[a-f0-9]{64}$/);
  assert.equal(baseline.cards, 1);
  const bookkeeping = note.replace('Creation', 'Done').replace('> [!qard]', '<!-- qard-id: stable-card -->\n<!-- qard-location: Programming -->\n> [!qard]');
  assert.deepEqual(await sourceSnapshot(bookkeeping.replaceAll('\n', '\r\n')), baseline);
  const changedAnswer = await sourceSnapshot(note.replace('The contained value.', 'Its fields, including shared references.'));
  assert.notEqual(changedAnswer.revision, baseline.revision);
  assert.equal(changedAnswer.cards, 1);
  const newCard = await sourceSnapshot(note + '\n> [!qard]- What remains shared?\n> Referenced objects.\n');
  assert.equal(newCard.cards, 2);
  assert.notEqual(newCard.revision, baseline.revision);
  assert.notEqual((await sourceSnapshot(note.replace('Value copying', 'Aliasing'))).revision, baseline.revision);
});

test('exported rename lookup uses the same file versus folder boundary as course merging', () => {
  assert.equal(renameSourcePath('Home/Area', [{ from: 'Home/Area', to: 'Home/Moved' }]), 'Home/Area');
  assert.equal(renameSourcePath('Home/Area/Types', [{ from: 'Home/Area', to: 'Home/Moved' }]), 'Home/Moved/Types');
  assert.equal(renameSourcePath('Home/Area/Types', [{ from: 'Home/Area/Types.md', to: 'Home/Area/Values.md' }]), 'Home/Area/Values');
});


test('unrepresentable file and folder rename targets fail closed before emitting course Markdown', () => {
  const baseline = reconcile().text;
  for (const character of ['|', '\r', '\n', '#', '[', ']']) {
    const fileRename = { from: 'Home/Programming/Types.md', to: `Home/Programming/Bad${character}Name.md` };
    const folderRename = { from: 'Home/Programming', to: `Home/Bad${character}Folder` };
    assert.throws(() => reconcile(baseline, SOURCES, { renames: [fileRename] }), /invalid vault-relative path/);
    assert.throws(() => reconcile(baseline, SOURCES, { renames: [folderRename] }), /invalid vault-relative path/);
    assert.throws(() => renameSourcePath('Home/Programming/Types', [fileRename]), /invalid vault-relative path/);
  }
  assert.equal(reconcile(baseline).text, baseline);
  assert.deepEqual(objectiveFields(baseline), objectiveFields(COURSE));
});
