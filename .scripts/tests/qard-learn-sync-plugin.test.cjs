'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { webcrypto } = require('node:crypto');
const { inspectCourse } = require('../qard-learn-sync/core.cjs');

const COURSE_PATH = 'Assets/Qard/Courses/Programming Mastery.md';
const SOURCE_PATH = 'Home/Programming/Types.md';
const SOURCE = '---\nsummary: "Copies and aliases"\nstatus: Creation\n---\n\nValue assignment copies contained values.\n\n> [!qard]- What is copied?\n> Every value field, including reference fields.\n';
const COURSE = `---
qard-mastery: "Programming"
publish: false
---

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Explain assignment | Copy behavior | copies | 01 Types | mastered | 2026-12-15 | | [[Home/Programming/Types#Copies\\|Types]] | 2026-10-20 check 4/4 sure; 2026-10-24 check 4/4 sure |
`;

class Events {
  constructor() { this.listeners = new Map(); }
  on(event, callback) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(callback);
    this.listeners.set(event, listeners);
    return { off: () => listeners.delete(callback) };
  }
  emit(event, ...args) { for (const callback of this.listeners.get(event) ?? []) callback(...args); }
}

async function settled(host) {
  while (host.jobs.size) await Promise.all([...host.jobs]);
}

function makeHost(contents = { [COURSE_PATH]: COURSE, [SOURCE_PATH]: SOURCE }, savedData) {
  const metadata = new Events(), vaultEvents = new Events(), timers = new Map(), notices = [];
  let tick = 1, timerId = 0, layout;
  class TFile {
    constructor(filePath, text) {
      this.path = filePath;
      this.basename = path.basename(filePath, '.md');
      this.stat = { mtime: tick++, size: Buffer.byteLength(text) };
    }
  }
  const files = new Map(Object.entries(contents).map(([p, text]) => [p, { file: new TFile(p, text), text }]));
  const host = {
    files, timers, notices, writes: 0, savedData, beforeProcess: undefined, beforeRead: undefined, beforeSave: undefined,
    text: p => files.get(p)?.text,
    create(p, text) {
      const file = new TFile(p, text);
      files.set(p, { file, text });
      vaultEvents.emit('create', file);
    },
    edit(p, text, emit = true) {
      const entry = files.get(p);
      entry.text = text;
      entry.file.stat = { mtime: tick++, size: Buffer.byteLength(text) };
      if (emit) {
        if (p.endsWith('.md')) metadata.emit('changed', entry.file, text, {});
        vaultEvents.emit('modify', entry.file);
      }
    },
    rename(from, to) {
      const entries = [...files].filter(([p]) => p === from || p.startsWith(from + '/'));
      for (const [oldPath, entry] of entries) {
        files.delete(oldPath);
        entry.file.path = to + oldPath.slice(from.length);
        entry.file.basename = path.basename(entry.file.path, '.md');
        files.set(entry.file.path, entry);
      }
      vaultEvents.emit('rename', entries.length === 1 && entries[0][0] === from ? entries[0][1].file : { path: to }, from);
    },
    remove(p) {
      const entry = files.get(p);
      files.delete(p);
      vaultEvents.emit('delete', entry.file);
    },
    async flush() {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(callback => callback());
      await settled(host);
    },
    stop() {
      host.plugin.onunload();
      host.plugin.events.forEach(event => event.off());
    },
  };
  const app = {
    vault: {
      on: vaultEvents.on.bind(vaultEvents),
      getFiles: () => [...files.values()].map(entry => entry.file),
      getMarkdownFiles: () => [...files.values()].map(entry => entry.file).filter(file => file.path.endsWith('.md')),
      getAbstractFileByPath: p => files.get(p)?.file,
      async read(file) {
        if (host.beforeRead) await host.beforeRead(file);
        const entry = files.get(file.path);
        if (!entry) throw new Error('File was deleted');
        return entry.text;
      },
      async process(file, callback) {
        if (host.beforeProcess) await host.beforeProcess(file);
        const current = files.get(file.path).text;
        const next = callback(current);
        host.writes++;
        host.edit(file.path, next);
        return next;
      },
    },
    metadataCache: {
      on: metadata.on.bind(metadata),
      getFirstLinkpathDest: target => files.get(target.replace(/\.md$/, '') + '.md')?.file,
    },
    workspace: { onLayoutReady: callback => { layout = callback; } },
  };
  class Plugin {
    constructor() { this.app = app; this.events = []; this.commands = []; }
    async loadData() { return host.savedData; }
    async saveData(data) {
      if (host.beforeSave) await host.beforeSave(data);
      host.savedData = JSON.parse(JSON.stringify(data));
    }
    addStatusBarItem() {
      return { text: '', setText(text) { this.text = text; }, addEventListener() {} };
    }
    addCommand(command) { this.commands.push(command); }
    registerEvent(event) { this.events.push(event); }
  }
  const filename = process.env.DEVBOOK_LEARN_SYNC_BUNDLE_TEST === '1'
    ? path.resolve(__dirname, '../../Vault/.obsidian/plugins/devbook-learn-sync/main.js')
    : path.resolve(__dirname, '../qard-learn-sync/plugin.cjs');
  const localRequire = createRequire(filename);
  const sandbox = {
    module: { exports: {} },
    require: id => id === 'obsidian' ? { Plugin, TFile, Notice: class { constructor(text) { notices.push(text); } } } : localRequire(id),
    TextEncoder,
    crypto: webcrypto,
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename });
  host.plugin = new sandbox.module.exports();
  host.jobs = new Set();
  const sync = host.plugin.sync.bind(host.plugin);
  host.plugin.sync = (...args) => {
    const job = sync(...args);
    host.jobs.add(job);
    void job.then(() => host.jobs.delete(job), () => host.jobs.delete(job));
    return job;
  };
  host.boot = async () => {
    await host.plugin.onload();
    layout();
    await settled(host);
    await host.flush();
    return host;
  };
  return host;
}

function progress(text) {
  return inspectCourse(text).rows.map(({ sourceRevision, sourceUpdated, ...row }) => row);
}

const newCard = '\n> [!qard]- Does a copied reference field clone its target?\n> No, it still points to the same target.\n';
const LESSON_PATH = 'Assets/Qard/Lessons/Completed.json';
const FINISHED_LESSON = JSON.stringify({ version: 1, mastery: COURSE_PATH, objective: 'copies',
  accepted: true, finishedAt: 1793453076025, close: { nextCheck: '2026-11-03' } });
const RESET_COURSE = COURSE.replace('| mastered | 2026-12-15 |', '| new | |')
  .replace('2026-10-20 check 4/4 sure; 2026-10-24 check 4/4 sure', '');

test('startup detects completed-lesson progress loss, acknowledgement cannot hide it, and verified course repair clears it', async t => {
  const host = await makeHost({ [COURSE_PATH]: RESET_COURSE, [SOURCE_PATH]: SOURCE, [LESSON_PATH]: FINISHED_LESSON }).boot();
  t.after(() => host.stop());
  assert.match(host.plugin.problems.join('\n'), /progress.*loss/i);
  assert.match(host.plugin.problems.join('\n'), /Completed\.json/);
  assert.match(host.notices.at(-1), /copies/);
  assert.equal(inspectCourse(host.text(COURSE_PATH)).rows[0].state, 'new', 'Guard never restores progress');
  await host.plugin.acknowledge();
  assert.match(host.plugin.problems.join('\n'), /progress.*loss/i);
  const fixed = host.text(COURSE_PATH).replace('| new | |', '| taught | 2026-11-03 |');
  host.edit(COURSE_PATH, fixed);
  await host.flush();
  assert.deepEqual(Array.from(host.plugin.problems), []);
  host.edit(COURSE_PATH, fixed.replace('| taught | 2026-11-03 |', '| new | |'));
  await host.flush();
  assert.match(host.plugin.problems.join('\n'), /progress.*loss/i);
});

test('lesson JSON create, modify, delete and rename events refresh the read-only progress guard', async t => {
  const host = await makeHost({ [COURSE_PATH]: RESET_COURSE, [SOURCE_PATH]: SOURCE }).boot();
  t.after(() => host.stop());
  const course = host.text(COURSE_PATH);
  host.create(LESSON_PATH, FINISHED_LESSON);
  await host.flush();
  assert.match(host.plugin.problems.join('\n'), /progress.*loss/i);
  host.edit(LESSON_PATH, JSON.stringify({ ...JSON.parse(FINISHED_LESSON), close: undefined }));
  await host.flush();
  assert.equal(host.plugin.problems.length, 0);
  host.edit(LESSON_PATH, '{broken');
  await host.flush();
  assert.match(host.plugin.problems.join('\n'), /Completed\.json/);
  host.edit(LESSON_PATH, FINISHED_LESSON);
  await host.flush();
  host.rename(LESSON_PATH, 'Assets/Archived Lesson.json');
  await host.flush();
  assert.equal(host.plugin.problems.length, 0);
  host.rename('Assets/Archived Lesson.json', LESSON_PATH);
  await host.flush();
  assert.match(host.plugin.problems.join('\n'), /progress.*loss/i);
  host.remove(LESSON_PATH);
  await host.flush();
  assert.equal(host.plugin.problems.length, 0);
  host.create('Assets/Archive/Completed.json', FINISHED_LESSON);
  host.rename('Assets/Archive', 'Assets/Qard/Lessons/Imported');
  await host.flush();
  assert.match(host.plugin.problems.join('\n'), /Lessons\/Imported\/Completed\.json/);
  host.rename('Assets/Qard/Lessons/Imported', 'Assets/Archived');
  await host.flush();
  assert.equal(host.plugin.problems.length, 0);
  assert.equal(host.text(COURSE_PATH), course);
});

test('source synchronization preserves a concurrent assessment and the progress guard reads its current result', async t => {
  const host = await makeHost({ [COURSE_PATH]: RESET_COURSE, [SOURCE_PATH]: SOURCE, [LESSON_PATH]: FINISHED_LESSON }).boot();
  t.after(() => host.stop());
  host.edit(SOURCE_PATH, SOURCE + newCard, false);
  host.beforeProcess = async file => {
    host.beforeProcess = undefined;
    host.edit(file.path, host.text(file.path).replace('| new | |', '| gap | 2026-11-05 |')
      .replace('[[Home/Programming/Types#Copies\\|Types]] |  |', '[[Home/Programming/Types#Copies\\|Types]] | 2026-11-04 check 0/4 |'), false);
  };
  await host.plugin.sync();
  await host.flush();
  const assessed = inspectCourse(host.text(COURSE_PATH)).rows[0];
  assert.equal(assessed.state, 'gap');
  assert.equal(assessed.due, '2026-11-05');
  assert.equal(assessed.evidence, '2026-11-04 check 0/4');
  assert.equal(host.plugin.problems.length, 0);
  host.edit(SOURCE_PATH, SOURCE + newCard + newCard);
  await host.flush();
  const updated = inspectCourse(host.text(COURSE_PATH)).rows[0];
  for (const field of ['id', 'title', 'label', 'state', 'due', 'needs', 'evidence']) assert.deepEqual(updated[field], assessed[field]);
  assert.equal(host.plugin.problems.length, 0);
});

test('new unassigned source warns automatically, cannot be acknowledged away, and clears after linking', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  const added = 'Home/Programming/New Topic.md';
  const before = host.text(COURSE_PATH);
  host.create(added, SOURCE + newCard);
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 1);
  assert.equal(host.plugin.unassigned[0].path, added);
  assert.equal(host.plugin.unassigned[0].cards, 2);
  assert.equal(host.plugin.status.text, 'Learn: 1 unassigned note(s)');
  assert.match(host.notices.at(-1), /Home\/Programming\/New Topic\.md.*2 card/);
  assert.match(host.notices.at(-1), /existing.*objective|objective.*existing/i);
  assert.match(host.notices.at(-1), /distinct/i);
  assert.equal(host.text(COURSE_PATH), before, 'Coverage warning must not create or alter objectives');
  const notices = host.notices.length;
  await host.plugin.sync();
  assert.equal(host.notices.length, notices, 'Unchanged orphan inventory must not repeat automatic notices');
  await host.plugin.acknowledge();
  assert.equal(host.plugin.unassigned.length, 1);
  host.edit(COURSE_PATH, before.replace('[[Home/Programming/Types#Copies\\|Types]]', '[[Home/Programming/Types#Copies\\|Types]], [[Home/Programming/New Topic]]'));
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 0);
  const updated = inspectCourse(host.text(COURSE_PATH)).rows[0], original = inspectCourse(before).rows[0];
  for (const field of ['id', 'title', 'label', 'group', 'state', 'due', 'needs', 'evidence']) assert.deepEqual(updated[field], original[field]);
});

test('cardless creation stays quiet; card edits, moves, removals and course creation refresh coverage', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  const added = 'Home/Programming/Unassigned.md';
  host.create(added, '```markdown\n> [!qard]- Example\n> Answer\n```\n');
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 0);
  host.edit(added, SOURCE);
  await host.flush();
  assert.equal(host.plugin.unassigned[0].path, added);
  host.rename(added, 'Home/Security/Unassigned.md');
  await host.flush();
  assert.equal(host.plugin.unassigned[0].course, 'Security');
  const security = COURSE.replace('qard-mastery: "Programming"', 'qard-mastery: "Security"')
    .replace('Home/Programming/Types#Copies\\|Types', 'Home/Security/Unassigned');
  host.create('Assets/Qard/Courses/Security Mastery.md', security);
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 0);
  host.remove('Assets/Qard/Courses/Security Mastery.md');
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 1);
  host.edit('Home/Security/Unassigned.md', 'No cards remain.');
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 0);
  host.edit('Home/Security/Unassigned.md', SOURCE);
  await host.flush();
  host.remove('Home/Security/Unassigned.md');
  await host.flush();
  assert.equal(host.plugin.unassigned.length, 0);
});

test('malformed course registry reports incomplete coverage instead of declaring notes unassigned', async t => {
  const host = await makeHost({ [COURSE_PATH]: COURSE.replace('| mastered |', '| invalid |'), [SOURCE_PATH]: SOURCE }).boot();
  t.after(() => host.stop());
  assert.equal(host.plugin.coverageComplete, false);
  assert.equal(host.plugin.unassigned.length, 0);
  assert.match(host.plugin.status.text, /issue/);
  host.plugin.showStatus();
  assert.match(host.notices.at(-1), /coverage.*could not be checked/i);
  assert.match(host.notices.at(-1), /unknown state/);
  assert.equal(host.writes, 0);
});

test('foreign-subject links do not assign a note and duplicate course identities make coverage incomplete', async t => {
  const foreign = COURSE.replace('qard-mastery: "Programming"', 'qard-mastery: "Security"');
  const host = await makeHost({ [COURSE_PATH]: foreign, [SOURCE_PATH]: SOURCE }).boot();
  t.after(() => host.stop());
  assert.equal(host.plugin.unassigned.length, 1);
  assert.equal(host.plugin.unassigned[0].course, 'Programming');
  host.create('Assets/Qard/Courses/Duplicate.md', foreign);
  await host.flush();
  assert.equal(host.plugin.coverageComplete, false);
  assert.equal(host.plugin.unassigned.length, 0);
  assert.match(host.plugin.problems.join('\n'), /duplicate.*course/i);
  host.remove('Assets/Qard/Courses/Duplicate.md');
  await host.flush();
  assert.equal(host.plugin.coverageComplete, true);
  assert.equal(host.plugin.unassigned.length, 1);
});

test('startup baselines existing sources once and course progress events do not feed back into writes', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  assert.equal(host.writes, 1);
  assert.deepEqual(progress(host.text(COURSE_PATH)), progress(COURSE));
  assert.equal(host.plugin.pending.length, 0);
  const assessed = host.text(COURSE_PATH).replace('2026-12-15', '2027-01-12');
  host.edit(COURSE_PATH, assessed);
  await host.flush();
  assert.equal(host.writes, 1);
  assert.equal(host.text(COURSE_PATH), assessed);
  await host.plugin.sync();
  assert.equal(host.writes, 1);
});

test('a new Qard flags only its existing objective and does not reset learned progress', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  host.edit(SOURCE_PATH, SOURCE + newCard);
  await host.flush();
  assert.equal(host.writes, 2);
  assert.deepEqual(progress(host.text(COURSE_PATH)), progress(COURSE));
  assert.match(inspectCourse(host.text(COURSE_PATH)).rows[0].sourceUpdated, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(host.plugin.pending.length, 1);
  host.plugin.showStatus();
  assert.match(host.notices.at(-1), /Copy behavior/);
  await host.plugin.sync();
  assert.equal(host.writes, 2);
});

test('atomic course processing retains an assessment completed after the sync read', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  host.edit(SOURCE_PATH, SOURCE + newCard, false);
  host.beforeProcess = async file => {
    host.beforeProcess = undefined;
    host.edit(file.path, host.text(file.path).replace('2026-12-15', '2027-02-01').replace('2026-10-24 check 4/4 sure', '2026-10-24 check 4/4 sure; 2026-11-08 check 4/4 sure'), false);
  };
  await host.plugin.sync();
  const objective = inspectCourse(host.text(COURSE_PATH)).rows[0];
  assert.equal(objective.state, 'mastered');
  assert.equal(objective.due, '2027-02-01');
  assert.match(objective.evidence, /2026-11-08 check 4\/4 sure/);
  assert.equal(host.plugin.pending.length, 1);
});

test('startup detects edits made while closed and acknowledgements survive restart', async t => {
  const first = await makeHost().boot();
  const baseline = first.text(COURSE_PATH); first.stop();
  const second = await makeHost({ [COURSE_PATH]: baseline, [SOURCE_PATH]: SOURCE + newCard }).boot();
  assert.equal(second.plugin.pending.length, 1);
  await second.plugin.acknowledge();
  assert.equal(second.plugin.pending.length, 0);
  const third = await makeHost({ [COURSE_PATH]: second.text(COURSE_PATH), [SOURCE_PATH]: SOURCE + newCard }, second.savedData).boot();
  second.stop(); t.after(() => third.stop());
  assert.equal(third.plugin.pending.length, 0);
  assert.equal(third.writes, 0);
  assert.deepEqual(progress(third.text(COURSE_PATH)), progress(COURSE));
});

test('deleting a source retains its objective and revision while reporting the missing material', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  const baseline = host.text(COURSE_PATH);
  host.remove(SOURCE_PATH);
  await host.flush();
  assert.equal(host.text(COURSE_PATH), baseline);
  assert.equal(host.writes, 1);
  assert.equal(host.plugin.problems.length, 1);
  assert.match(host.plugin.problems[0], /missing source for copies/);
});

test('proven file and folder renames maintain source links without reporting content changes', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  host.rename(SOURCE_PATH, 'Home/Programming/Value Types.md');
  host.rename('Home/Programming', 'Home/Runtime');
  await host.flush();
  const text = host.text(COURSE_PATH), objective = inspectCourse(text).rows[0];
  assert.match(text, /\[\[Home\/Runtime\/Value Types#Copies\\\|Types\]\]/);
  assert.equal(objective.state, 'mastered');
  assert.equal(objective.due, '2026-12-15');
  assert.equal(host.plugin.pending.length, 0);
  assert.equal(host.plugin.problems.length, 0);
});

test('unloading cancels a debounced source update', async () => {
  const host = await makeHost().boot();
  const baseline = host.text(COURSE_PATH);
  host.edit(SOURCE_PATH, SOURCE + newCard);
  host.stop();
  await host.flush();
  assert.equal(host.text(COURSE_PATH), baseline);
  assert.equal(host.writes, 1);
});

test('unloading during a source read prevents the in-flight sync from writing', async () => {
  const host = await makeHost().boot();
  const baseline = host.text(COURSE_PATH);
  host.edit(SOURCE_PATH, SOURCE + newCard, false);
  let release, entered;
  const readStarted = new Promise(resolve => { entered = resolve; });
  const readAllowed = new Promise(resolve => { release = resolve; });
  host.beforeRead = async file => { if (file.path === SOURCE_PATH) { entered(); await readAllowed; } };
  const syncing = host.plugin.sync();
  await readStarted;
  host.stop(); release(); await syncing;
  assert.equal(host.text(COURSE_PATH), baseline);
  assert.equal(host.writes, 1);
});

test('note lifecycle and stock Qard identity metadata do not flag changed learning material', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  const baseline = host.text(COURSE_PATH);
  const studied = SOURCE.replace('status: Creation', 'status: Done')
    .replace('> [!qard]-', '<!-- qard-id: stable-card -->\n> [!qard]-');
  host.edit(SOURCE_PATH, studied);
  await host.flush();
  assert.equal(host.text(COURSE_PATH), baseline);
  assert.equal(host.plugin.pending.length, 0);
  assert.equal(host.writes, 1);
});


test('a folder rename leaves an independent same-name note and its objective linked correctly', async t => {
  const rootNote = 'Home/Programming.md';
  const course = COURSE + '| Explain platform boundaries | Platform | platform | 01 Types | mastered | 2026-12-20 | | [[Home/Programming]] | 2026-10-24 check 4/4 sure |\n';
  const host = await makeHost({ [COURSE_PATH]: course, [SOURCE_PATH]: SOURCE, [rootNote]: 'An independent platform overview.\n' }).boot();
  t.after(() => host.stop());
  const baseline = inspectCourse(host.text(COURSE_PATH));
  host.rename('Home/Programming', 'Home/Runtime');
  await host.flush();
  const rows = inspectCourse(host.text(COURSE_PATH)).rows;
  assert.deepEqual(rows.find(row => row.id === 'platform'), baseline.rows.find(row => row.id === 'platform'));
  assert.deepEqual(rows.find(row => row.id === 'copies').notes, ['Home/Runtime/Types']);
  assert.equal(host.text(rootNote), 'An independent platform overview.\n');
  assert.equal(host.plugin.problems.length, 0);
  assert.equal(host.plugin.pending.length, 0);
});

test('failed state persistence is bounded and retains rename proof for a successful retry', async t => {
  const host = await makeHost().boot(); t.after(() => host.stop());
  host.beforeSave = async () => { throw new Error('Disk is full'); };
  host.rename('Home/Programming', 'Home/Runtime');
  await assert.doesNotReject(() => host.flush());
  assert.equal(host.plugin.renames.length, 1, 'Failed persistence must retain the proven rename');
  assert.match(host.plugin.status.text, /save|issue|error|attention/i);
  assert.equal(inspectCourse(host.text(COURSE_PATH)).rows[0].state, 'mastered');
  host.beforeSave = undefined;
  await host.plugin.sync();
  await host.plugin.persisting;
  assert.equal(host.plugin.renames.length, 0);
  assert.equal(host.savedData.renames.length, 0);
  assert.deepEqual(inspectCourse(host.text(COURSE_PATH)).rows[0].notes, ['Home/Runtime/Types']);
  assert.equal(host.plugin.problems.length, 0);
});
