'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { checkCoverage } = require('../qard-learn-sync/check.cjs');

const CARD = '> [!qard]- A question?\n> An answer.\n';
const COURSE = '---\nqard-mastery: Programming\n---\n\n| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n| Explain | Types | types | Basics | mastered | 2026-12-01 | | [[Home/Programming/Types]] | Preserve evidence |\n';

function fixture(t, files) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qard-coverage-'));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  for (const [file, text] of Object.entries(files)) {
    const target = path.join(repoRoot, 'Vault', file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  return repoRoot;
}

test('read-only coverage checker supports full and affected-source checks without changing progress', async t => {
  const repoRoot = fixture(t, { 'Home/Programming/Types.md': CARD, 'Home/Programming/New.md': CARD,
    'Assets/Qard/Courses/Programming.md': COURSE });
  const expected = { path: 'Home/Programming/New.md', cards: 1, course: 'Programming' };
  assert.deepEqual(await checkCoverage({ repoRoot }), { unassigned: [expected], problems: [] });
  assert.deepEqual(await checkCoverage({ repoRoot, paths: ['Home/Programming/Types.md'] }), { unassigned: [], problems: [] });
  assert.deepEqual(await checkCoverage({ repoRoot, paths: ['Home/Programming/New.md'] }), { unassigned: [expected], problems: [] });
  assert.equal(fs.readFileSync(path.join(repoRoot, 'Vault/Assets/Qard/Courses/Programming.md'), 'utf8'), COURSE);
  for (const unsafe of ['../outside.md', '/tmp/outside.md', 'Home/../outside.md', 'Vault/Home/Programming/New.md']) {
    const result = await checkCoverage({ repoRoot, paths: [unsafe] });
    assert.ok(result.problems.length, unsafe);
  }
});

test('missing courses leave cards unassigned while malformed or duplicate registries fail explicitly', async t => {
  const repoRoot = fixture(t, { 'Home/Programming/Types.md': CARD });
  assert.equal((await checkCoverage({ repoRoot })).unassigned.length, 1);
  fs.writeFileSync(path.join(repoRoot, 'Vault/Home/Programming/Types.md'), 'A cardless note.\n');
  assert.deepEqual(await checkCoverage({ repoRoot }), { unassigned: [], problems: [] });
  fs.writeFileSync(path.join(repoRoot, 'Vault/Home/Programming/Types.md'), CARD);
  const directory = path.join(repoRoot, 'Vault/Assets/Qard/Courses');
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'Broken.md'), COURSE.replace('| mastered |', '| invalid |'));
  let result = await checkCoverage({ repoRoot });
  assert.equal(result.unassigned.length, 0);
  assert.match(result.problems.join('\n'), /unknown state/);
  fs.writeFileSync(path.join(directory, 'Broken.md'), COURSE);
  fs.writeFileSync(path.join(directory, 'Duplicate.md'), COURSE);
  result = await checkCoverage({ repoRoot });
  assert.equal(result.unassigned.length, 0);
  assert.match(result.problems.join('\n'), /duplicate.*course/i);
});

test('scoped checks accept root dashboards while preserving subject assignment checks', async t => {
  const repoRoot = fixture(t, { 'Home/index.md': 'Home dashboard.\n',
    'Home/Questions.md': 'Questions dashboard.\n', 'Home/Programming/New.md': CARD });
  assert.deepEqual(await checkCoverage({ repoRoot, paths: ['Home/index.md', 'Home/Questions.md'] }),
    { unassigned: [], problems: [] });
  assert.deepEqual(await checkCoverage({ repoRoot, paths: ['Home/index.md', 'Home/Programming/New.md'] }),
    { unassigned: [{ path: 'Home/Programming/New.md', cards: 1, course: 'Programming' }], problems: [] });
});

test('scoped source paths cannot follow symlink files or directories outside the vault', async t => {
  const repoRoot = fixture(t, { 'Home/Programming/Types.md': CARD, 'Assets/Qard/Courses/Programming.md': COURSE });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'qard-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'Secret.md'), CARD);
  fs.symlinkSync(outside, path.join(repoRoot, 'Vault/Home/Escape'));
  fs.symlinkSync(path.join(outside, 'Secret.md'), path.join(repoRoot, 'Vault/Home/Programming/Escape.md'));
  assert.deepEqual(await checkCoverage({ repoRoot }), { unassigned: [], problems: [] });
  for (const source of ['Home/Escape/Secret.md', 'Home/Programming/Escape.md']) {
    const result = await checkCoverage({ repoRoot, paths: [source] });
    assert.equal(result.unassigned.length, 0);
    assert.match(result.problems.join('\n'), /escapes the vault/);
  }
});

test('CLI checks completed-lesson progress even during a scoped source check and never repairs it', async t => {
  const course = COURSE.replace('| mastered | 2026-12-01 |', '| new | |').replace('Preserve evidence', '');
  const lesson = { version: 1, mastery: 'Assets/Qard/Courses/Programming.md', objective: 'types',
    accepted: true, finishedAt: 1793453076025, close: { nextCheck: '2026-11-03' } };
  const repoRoot = fixture(t, { 'Home/Programming/Types.md': CARD, 'Assets/Qard/Courses/Programming.md': course,
    'Assets/Qard/Lessons/Done.json': JSON.stringify(lesson) });
  const result = await checkCoverage({ repoRoot, paths: ['Home/Programming/Types.md'] });
  assert.equal(result.unassigned.length, 0);
  assert.match(result.problems.join('\n'), /progress.*loss/i);
  assert.match(result.problems.join('\n'), /Done\.json/);
  assert.equal(fs.readFileSync(path.join(repoRoot, 'Vault/Assets/Qard/Courses/Programming.md'), 'utf8'), course);
  fs.writeFileSync(path.join(repoRoot, 'Vault/Assets/Qard/Courses/Programming.md'), COURSE);
  assert.deepEqual(await checkCoverage({ repoRoot }), { unassigned: [], problems: [] });
  fs.writeFileSync(path.join(repoRoot, 'Vault/Assets/Qard/Lessons/Done.json'), '{broken');
  assert.match((await checkCoverage({ repoRoot })).problems.join('\n'), /Done\.json/);
});

test('CLI emits stable JSON and an actionable failing result for invalid path arguments', () => {
  const command = path.resolve(__dirname, '../qard-learn-sync/check.cjs');
  const clean = spawnSync(process.execPath, [command, '--json'], { encoding: 'utf8' });
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  assert.deepEqual(JSON.parse(clean.stdout), { unassigned: [], problems: [] });
  const invalid = spawnSync(process.execPath, [command, '--paths', '../outside.md', '--json'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(JSON.parse(invalid.stdout).problems.join('\n'), /path/i);
});
