const { Plugin, Notice, TFile } = require('obsidian');
const { inspectCourse, reconcileCourse, renameSourcePath, sourceSnapshot } = require('./core.cjs');

const COURSE_ROOT = 'Assets/Qard/Courses/';
const SOURCE_ROOT = 'Home/';
const DEBOUNCE_MS = 1200;
const dayOf = () => {
  const day = new Date();
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};
const isSource = (path) => path.startsWith(SOURCE_ROOT) && path.endsWith('.md');
const isCourse = (path) => path.startsWith(COURSE_ROOT) && path.endsWith('.md');

module.exports = class LearnSourceSync extends Plugin {
  async onload() {
    this.stopped = false;
    this.running = false;
    this.rerun = false;
    this.renames = [];
    this.sourceCache = new Map();
    this.courseLinks = new Map();
    const data = await this.loadData();
    this.acknowledged = data?.version === 1 ? (data.acknowledged ?? {}) : {};
    this.initialRevisions = data?.version === 1 ? (data.initialRevisions ?? {}) : {};
    this.renames = data?.version === 1 ? (data.renames ?? []) : [];
    this.pending = [];
    this.problems = [];
    this.status = this.addStatusBarItem();
    this.status.setText('Learn sync: starting');
    this.status.addEventListener('click', () => this.showStatus());
    this.addCommand({ id: 'sync-now', name: 'Sync existing Learn sources now', callback: () => void this.sync(true) });
    this.addCommand({ id: 'show-changes', name: 'Show Learn source changes', callback: () => this.showStatus() });
    this.addCommand({ id: 'acknowledge-changes', name: 'Acknowledge Learn source changes', callback: () => void this.acknowledge() });
    this.registerEvent(this.app.metadataCache.on('changed', (file, text) => {
      if (this.stopped) return;
      if (isSource(file.path)) { this.sourceCache.delete(file.path); this.schedule(); }
      else if (isCourse(file.path)) {
        try {
          const signature = this.linkSignature(inspectCourse(text));
          if (this.courseLinks.get(file.path) !== signature) this.schedule();
        } catch { this.schedule(); }
      }
    }));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      if (this.stopped || !(oldPath.startsWith(SOURCE_ROOT) || file.path.startsWith(SOURCE_ROOT))) return;
      this.renames.push({ from: oldPath, to: file.path });
      void this.saveState().catch((error) => this.reportFailure('Could not save rename', error));
      this.schedule();
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      if (isSource(file.path) || file.path.startsWith(SOURCE_ROOT) || isCourse(file.path)) this.schedule();
    }));
    this.app.workspace.onLayoutReady(() => { if (!this.stopped) void this.sync(); });
  }

  linkSignature(course) {
    return JSON.stringify(course.rows.map((row) => [row.id, row.notes]));
  }

  schedule() {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.sync(); }, DEBOUNCE_MS);
  }

  async source(file) {
    const cached = this.sourceCache.get(file.path);
    if (cached?.mtime === file.stat.mtime && cached.size === file.stat.size) return cached.value;
    const mtime = file.stat.mtime, size = file.stat.size;
    const text = await this.app.vault.read(file);
    const value = await sourceSnapshot(text);
    this.sourceCache.set(file.path, { mtime, size, value });
    return value;
  }

  async sync(show = false) {
    if (this.stopped) return;
    if (this.running) { this.rerun = true; return; }
    this.running = true;
    const renames = this.renames.slice();
    let failed = false;
    const problems = [], pending = [];
    try {
      const courses = this.app.vault.getMarkdownFiles().filter((file) => isCourse(file.path));
      for (const file of courses) {
        if (this.stopped) break;
        try {
          const original = await this.app.vault.read(file);
          const course = inspectCourse(original);
          const sources = Object.create(null);
          for (const row of course.rows) for (const link of row.notes) {
            const target = renameSourcePath(link, renames).replace(/\.md$/, '');
            const source = this.app.vault.getAbstractFileByPath(target + '.md')
              ?? this.app.metadataCache.getFirstLinkpathDest(target, file.path);
            if (!(source instanceof TFile) || !isSource(source.path)) continue;
            const value = await this.source(source);
            sources[target + '.md'] = value;
            sources[source.path] = value;
          }
          if (this.stopped) break;
          const options = { sources, renames, day: dayOf(), initialRevisions: this.initialRevisions[file.path] ?? {} };
          let result = reconcileCourse(original, options);
          if (result.text !== original) {
            await this.app.vault.process(file, (current) => {
              if (this.stopped) return current;
              if (this.linkSignature(inspectCourse(current)) !== this.linkSignature(course)) this.rerun = true;
              result = reconcileCourse(current, options);
              return result.text;
            });
          }
          if (this.stopped) break;
          const updated = inspectCourse(result.text);
          this.courseLinks.set(file.path, this.linkSignature(updated));
          for (const row of updated.rows) {
            const key = `${file.path}#${row.id}`;
            if (row.sourceUpdated && row.sourceRevision && this.acknowledged[key] !== row.sourceRevision) {
              pending.push({ key, course: updated.course, label: row.label || row.title, revision: row.sourceRevision, updated: row.sourceUpdated });
            }
          }
          for (const missing of result.missing) problems.push(`${updated.course}: missing source for ${missing.id}`);
        } catch (error) {
          failed = true;
          problems.push(`${file.basename || file.path}: ${error.message}`);
        }
      }
      if (!this.stopped) {
        if (!failed && renames.length) {
          const remaining = this.renames.slice(renames.length);
          await this.saveState({ renames: remaining });
          this.renames.splice(0, renames.length);
        }
        this.pending = pending;
        this.problems = problems;
        this.status.setText(problems.length ? `Learn sync: ${problems.length} issue(s)` : pending.length ? `Learn: ${pending.length} source update(s)` : 'Learn sync: up to date');
        if (show) this.showStatus();
      }
    } catch (error) {
      this.reportFailure('Could not finish Learn sync', error);
    } finally {
      this.running = false;
      if (this.rerun && !this.stopped) { this.rerun = false; this.schedule(); }
    }
  }

  showStatus() {
    const lines = [this.problems.length ? 'Learn sync needs attention:' : this.pending.length ? 'Source material changed; existing Learn progress is preserved:' : 'Learn sources are up to date.'];
    lines.push(...this.problems.slice(0, 8));
    lines.push(...this.pending.slice(0, 8).map((item) => `${item.course} · ${item.label} (${item.updated})`));
    if (this.pending.length > 8) lines.push(`And ${this.pending.length - 8} more; use Learn source checks as needed.`);
    new Notice(lines.join('\n'), 12000);
  }

  async acknowledge() {
    const acknowledged = { ...this.acknowledged };
    for (const item of this.pending) acknowledged[item.key] = item.revision;
    try {
      await this.saveState({ acknowledged });
      this.acknowledged = acknowledged;
      if (!this.stopped) await this.sync(true);
    } catch (error) {
      this.reportFailure('Could not acknowledge source changes', error);
    }
  }

  reportFailure(context, error) {
    if (this.stopped) return;
    this.problems = [`${context}: ${error.message || String(error)}`];
    this.status.setText('Learn sync: storage error');
  }

  saveState(overrides = {}) {
    const snapshot = JSON.parse(JSON.stringify({ version: 1, acknowledged: this.acknowledged, initialRevisions: this.initialRevisions, renames: this.renames, ...overrides }));
    this.persisting = (this.persisting ?? Promise.resolve()).catch(() => {}).then(() => this.saveData(snapshot));
    return this.persisting;
  }

  onunload() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
};
