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
    edit(p, text, emit = true) {
      const entry = files.get(p);
      entry.text = text;
      entry.file.stat = { mtime: tick++, size: Buffer.byteLength(text) };
      if (emit) metadata.emit('changed', entry.file, text, {});
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
  const filename = path.resolve(__dirname, '../qard-learn-sync/plugin.cjs');
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
