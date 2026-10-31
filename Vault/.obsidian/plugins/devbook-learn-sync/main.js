var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// .scripts/qard-learn-sync/core.cjs
var require_core = __commonJS({
  ".scripts/qard-learn-sync/core.cjs"(exports2, module2) {
    "use strict";
    var COLUMNS = ["Objective", "Label", "ID", "Group", "State", "Due", "Needs", "Notes", "Evidence"];
    var STATES = /* @__PURE__ */ new Set(["planned", "new", "gap", "misconception", "taught", "shaky", "right once", "mastered", "slipping"]);
    var REVISION_COLUMN = "Source revision";
    var UPDATED_COLUMN = "Source updated";
    function fail(message) {
      throw new Error(`Cannot sync Learn course: ${message}`);
    }
    var contentOf = (text) => {
      const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/.exec(text);
      const summary = match?.[1].match(/^summary:\s*(.*)$/m)?.[1] ?? "";
      const body = match ? text.slice(match[0].length) : text;
      return `${summary}
${body}`.replace(/^[ \t]*<!--[ \t]*qard-(?:id|location|siblings|reverse):[^\n]*?-->[ \t]*(?:\r?\n|$)/gm, "").replace(/<!--[ \t]*qard-(?:id|location|siblings|reverse):[^\n]*?-->/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    };
    async function sourceSnapshot2(text) {
      if (typeof text !== "string") fail("expected source Markdown text");
      const bytes = new TextEncoder().encode(contentOf(text));
      const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      const revision = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
      return { revision, cards: (text.match(/^\s*>\s*\[!qard\]/gim) ?? []).length };
    }
    function linesOf(text) {
      return [...text.matchAll(/([^\r\n]*)(\r\n|\n|$)/g)].filter((match) => match[0] !== "").map((match) => ({ text: match[1], ending: match[2] }));
    }
    function rowCells(line) {
      const pipes = [];
      for (let index = 0; index < line.length; index++) {
        if (line[index] !== "|") continue;
        let slashes = 0;
        for (let previous = index - 1; previous >= 0 && line[previous] === "\\"; previous--) slashes++;
        if (slashes % 2 === 0) pipes.push(index);
      }
      if (pipes.length < 2 || line.slice(0, pipes[0]).trim() || line.slice(pipes.at(-1) + 1).trim()) return void 0;
      return {
        prefix: line.slice(0, pipes[0] + 1),
        suffix: line.slice(pipes.at(-1) + 1),
        cells: pipes.slice(0, -1).map((start, index) => line.slice(start + 1, pipes[index + 1]))
      };
    }
    var decoded = (value) => value.trim().replace(/\\\|/g, "|");
    var normalizedHeader = (value) => decoded(value).toLowerCase();
    var isDivider = (cells) => cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
    var list = (value) => value.replace(/`/g, "").split(/[,\s]+/).filter(Boolean);
    function noteLinks(value) {
      const text = decoded(value);
      const links = [...text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map((match) => match[1].trim());
      return links.length ? links : text.split(",").map((link) => link.trim()).filter(Boolean);
    }
    function parseCourse(text) {
      if (typeof text !== "string") fail("expected Markdown text");
      const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
      const course = frontmatter && /^qard-mastery:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim().replace(/^["']|["']$/g, "");
      if (!course) fail("missing qard-mastery frontmatter");
      const lines = linesOf(text), candidates = [];
      for (let index = 0; index < lines.length - 1; index++) {
        const header = rowCells(lines[index].text), divider = rowCells(lines[index + 1].text);
        if (!header || !divider || !isDivider(divider.cells)) continue;
        const names = header.cells.map(normalizedHeader);
        if (names.includes("id") && names.includes("state")) candidates.push({ index, header, divider, names });
      }
      if (candidates.length !== 1) fail("expected exactly one objectives table");
      const table = candidates[0];
      if (new Set(table.names).size !== table.names.length || table.names.some((name) => !name)) fail("duplicate or empty table columns");
      for (const name of COLUMNS) if (!table.names.includes(name.toLowerCase())) fail(`missing ${name} column`);
      if (table.divider.cells.length !== table.names.length) fail("header and divider have different cell counts");
      const at = (name) => table.names.indexOf(name.toLowerCase());
      const rows = [];
      for (let line = table.index + 2; line < lines.length; line++) {
        if (!lines[line].text.trimStart().startsWith("|")) break;
        const raw = rowCells(lines[line].text);
        if (!raw || raw.cells.length !== table.names.length || isDivider(raw.cells)) fail(`malformed objective row at line ${line + 1}`);
        const get = (name) => decoded(raw.cells[at(name)]);
        const id = get("ID").replace(/`/g, "");
        if (!/^[A-Za-z0-9_-]+$/.test(id) || !get("Objective")) fail(`missing or invalid objective identity at line ${line + 1}`);
        let state = get("State").toLowerCase().replace(/[-_]/g, " ");
        if (state === "not covered" || state === "not covered yet") state = "planned";
        if (!STATES.has(state)) fail(`unknown state for ${id}`);
        const due = get("Due");
        if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) fail(`invalid due date for ${id}`);
        rows.push({
          line,
          raw,
          id,
          title: get("Objective"),
          label: get("Label"),
          group: get("Group"),
          state,
          due,
          needs: list(get("Needs")),
          notes: noteLinks(raw.cells[at("Notes")]),
          evidence: get("Evidence"),
          sourceRevision: at(REVISION_COLUMN) < 0 ? "" : get(REVISION_COLUMN),
          sourceUpdated: at(UPDATED_COLUMN) < 0 ? "" : get(UPDATED_COLUMN)
        });
      }
      const byId = new Map(rows.map((row) => [row.id, row]));
      if (byId.size !== rows.length) fail("duplicate objective IDs");
      const visiting = /* @__PURE__ */ new Set(), visited = /* @__PURE__ */ new Set();
      const visit = (row) => {
        if (visiting.has(row.id)) fail(`prerequisite cycle at ${row.id}`);
        if (visited.has(row.id)) return;
        visiting.add(row.id);
        for (const need of row.needs) {
          if (!byId.has(need)) fail(`unknown prerequisite ${need} for ${row.id}`);
          visit(byId.get(need));
        }
        visiting.delete(row.id);
        visited.add(row.id);
      };
      for (const row of rows) visit(row);
      return { course, lines, table, rows, at };
    }
    function inspectCourse2(text) {
      const { course, rows } = parseCourse(text);
      return {
        course,
        rows: rows.map(({ line, raw, ...row }) => row)
      };
    }
    function vaultPath(value) {
      if (typeof value !== "string" || !value || value.startsWith("/") || /[\\|\r\n#\[\]]/.test(value) || value.split("/").some((part) => !part || part === "." || part === "..")) fail(`invalid vault-relative path ${String(value)}`);
      return value;
    }
    function renamedPath(value, renames) {
      let result = value;
      for (const rename of renames) {
        if (!rename || typeof rename !== "object") fail("invalid rename");
        const from = vaultPath(rename.from), to = vaultPath(rename.to);
        if (from.endsWith(".md") && result === from) result = to;
        else if (from.endsWith(".md") && !result.endsWith(".md") && result === from.slice(0, -3)) result = to.replace(/\.md$/, "");
        else if (result.startsWith(from + "/")) result = to + result.slice(from.length);
      }
      return result;
    }
    function renameNotes(raw, renames) {
      if (!renames.length) return raw;
      if (raw.includes("[[")) {
        return raw.replace(/\[\[([^\]]+)\]\]/g, (whole, inner) => {
          let end = inner.length;
          const heading = inner.indexOf("#"), alias = inner.indexOf("|");
          if (heading >= 0) end = Math.min(end, heading);
          if (alias >= 0) end = Math.min(end, inner[alias - 1] === "\\" ? alias - 1 : alias);
          const target = inner.slice(0, end), path = target.trim(), renamed = renamedPath(path, renames);
          return renamed === path ? whole : "[[" + target.replace(path, () => renamed) + inner.slice(end) + "]]";
        });
      }
      return raw.split(/(,)/).map((part) => part === "," ? part : part.replace(part.trim(), () => renamedPath(part.trim(), renames))).join("");
    }
    function renderRow(raw, cells) {
      return raw.prefix + cells.join("|") + "|" + raw.suffix;
    }
    function setCell(cells, index, value) {
      const raw = cells[index];
      const leading = /^\s*/.exec(raw)[0], trailing = /\s*$/.exec(raw)[0];
      cells[index] = leading + value + (raw.trim() ? trailing : " ");
    }
    function reconcileCourse2(text, { sources, renames = [], day, initialRevisions = {} } = {}) {
      const parsed = parseCourse(text);
      if (!sources || typeof sources !== "object" || Array.isArray(sources)) fail("expected source revisions");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) fail("expected an update day");
      if (!initialRevisions || typeof initialRevisions !== "object" || Array.isArray(initialRevisions)) fail("expected initial source revisions");
      for (const revision of Object.values(initialRevisions)) {
        if (typeof revision !== "string" || !/^v1:[a-f0-9]{64}\/\d+(?:,[a-f0-9]{64}\/\d+)*$/i.test(revision)) fail("invalid initial source revision");
      }
      const sourceMap = /* @__PURE__ */ new Map();
      for (const [source, value] of Object.entries(sources)) {
        const key = vaultPath(source).replace(/\.md$/, "") + ".md";
        if (!value || !/^[a-f0-9]{64}$/i.test(value.revision) || !Number.isInteger(value.cards) || value.cards < 0) fail(`invalid source revision for ${source}`);
        if (sourceMap.has(key)) fail(`duplicate canonical source ${key}`);
        sourceMap.set(key, value);
      }
      for (const rename of renames) {
        if (!rename || typeof rename !== "object") fail("invalid rename");
        vaultPath(rename.from);
        vaultPath(rename.to);
      }
      const { lines, table, rows } = parsed;
      const names = [...table.names], header = [...table.header.cells], divider = [...table.divider.cells];
      for (const column of [REVISION_COLUMN, UPDATED_COLUMN]) {
        if (names.includes(column.toLowerCase())) continue;
        names.push(column.toLowerCase());
        header.push(` ${column} `);
        divider.push(" --- ");
      }
      const revisionAt = names.indexOf(REVISION_COLUMN.toLowerCase());
      const updatedAt = names.indexOf(UPDATED_COLUMN.toLowerCase());
      const notesAt = names.indexOf("notes");
      const result = { changed: [], initialized: [], renamed: [], missing: [] };
      lines[table.index].text = renderRow(table.header, header);
      lines[table.index + 1].text = renderRow(table.divider, divider);
      for (const row of rows) {
        const cells = [...row.raw.cells];
        while (cells.length < names.length) cells.push(" ");
        cells[notesAt] = renameNotes(cells[notesAt], renames);
        if (cells[notesAt] !== row.raw.cells[notesAt]) result.renamed.push(row.id);
        const notes = noteLinks(cells[notesAt]);
        const missing = notes.filter((note) => !sourceMap.has(note.replace(/\.md$/, "") + ".md"));
        if (missing.length) result.missing.push({ id: row.id, paths: missing });
        if (notes.length && !missing.length) {
          const revision = "v1:" + notes.map((note) => {
            const value = sourceMap.get(note.replace(/\.md$/, "") + ".md");
            return value.revision + "/" + value.cards;
          }).join(",");
          const previous = row.sourceRevision || (Object.hasOwn(initialRevisions, row.id) ? initialRevisions[row.id] : "");
          if (!row.sourceRevision) {
            setCell(cells, revisionAt, revision);
            result.initialized.push(row.id);
          }
          if (previous && revision !== previous) {
            setCell(cells, revisionAt, revision);
            setCell(cells, updatedAt, day);
            result.changed.push(row.id);
          }
        }
        lines[row.line].text = renderRow(row.raw, cells);
      }
      const merged = lines.map((line) => line.text + line.ending).join("");
      parseCourse(merged);
      return { text: merged, ...result };
    }
    module2.exports = { inspectCourse: inspectCourse2, reconcileCourse: reconcileCourse2, renameSourcePath: renamedPath, sourceSnapshot: sourceSnapshot2 };
  }
});

// .scripts/qard-learn-sync/plugin.cjs
var { Plugin, Notice, TFile } = require("obsidian");
var { inspectCourse, reconcileCourse, renameSourcePath, sourceSnapshot } = require_core();
var COURSE_ROOT = "Assets/Qard/Courses/";
var SOURCE_ROOT = "Home/";
var DEBOUNCE_MS = 1200;
var dayOf = () => {
  const day = /* @__PURE__ */ new Date();
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
};
var isSource = (path) => path.startsWith(SOURCE_ROOT) && path.endsWith(".md");
var isCourse = (path) => path.startsWith(COURSE_ROOT) && path.endsWith(".md");
module.exports = class LearnSourceSync extends Plugin {
  async onload() {
    this.stopped = false;
    this.running = false;
    this.rerun = false;
    this.renames = [];
    this.sourceCache = /* @__PURE__ */ new Map();
    this.courseLinks = /* @__PURE__ */ new Map();
    const data = await this.loadData();
    this.acknowledged = data?.version === 1 ? data.acknowledged ?? {} : {};
    this.initialRevisions = data?.version === 1 ? data.initialRevisions ?? {} : {};
    this.renames = data?.version === 1 ? data.renames ?? [] : [];
    this.pending = [];
    this.problems = [];
    this.status = this.addStatusBarItem();
    this.status.setText("Learn sync: starting");
    this.status.addEventListener("click", () => this.showStatus());
    this.addCommand({ id: "sync-now", name: "Sync existing Learn sources now", callback: () => void this.sync(true) });
    this.addCommand({ id: "show-changes", name: "Show Learn source changes", callback: () => this.showStatus() });
    this.addCommand({ id: "acknowledge-changes", name: "Acknowledge Learn source changes", callback: () => void this.acknowledge() });
    this.registerEvent(this.app.metadataCache.on("changed", (file, text) => {
      if (this.stopped) return;
      if (isSource(file.path)) {
        this.sourceCache.delete(file.path);
        this.schedule();
      } else if (isCourse(file.path)) {
        try {
          const signature = this.linkSignature(inspectCourse(text));
          if (this.courseLinks.get(file.path) !== signature) this.schedule();
        } catch {
          this.schedule();
        }
      }
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if (this.stopped || !(oldPath.startsWith(SOURCE_ROOT) || file.path.startsWith(SOURCE_ROOT))) return;
      this.renames.push({ from: oldPath, to: file.path });
      void this.saveState().catch((error) => this.reportFailure("Could not save rename", error));
      this.schedule();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (isSource(file.path) || file.path.startsWith(SOURCE_ROOT) || isCourse(file.path)) this.schedule();
    }));
    this.app.workspace.onLayoutReady(() => {
      if (!this.stopped) void this.sync();
    });
  }
  linkSignature(course) {
    return JSON.stringify(course.rows.map((row) => [row.id, row.notes]));
  }
  schedule() {
    if (this.stopped) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = void 0;
      void this.sync();
    }, DEBOUNCE_MS);
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
    if (this.running) {
      this.rerun = true;
      return;
    }
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
          const sources = /* @__PURE__ */ Object.create(null);
          for (const row of course.rows) for (const link of row.notes) {
            const target = renameSourcePath(link, renames).replace(/\.md$/, "");
            const source = this.app.vault.getAbstractFileByPath(target + ".md") ?? this.app.metadataCache.getFirstLinkpathDest(target, file.path);
            if (!(source instanceof TFile) || !isSource(source.path)) continue;
            const value = await this.source(source);
            sources[target + ".md"] = value;
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
        this.status.setText(problems.length ? `Learn sync: ${problems.length} issue(s)` : pending.length ? `Learn: ${pending.length} source update(s)` : "Learn sync: up to date");
        if (show) this.showStatus();
      }
    } catch (error) {
      this.reportFailure("Could not finish Learn sync", error);
    } finally {
      this.running = false;
      if (this.rerun && !this.stopped) {
        this.rerun = false;
        this.schedule();
      }
    }
  }
  showStatus() {
    const lines = [this.problems.length ? "Learn sync needs attention:" : this.pending.length ? "Source material changed; existing Learn progress is preserved:" : "Learn sources are up to date."];
    lines.push(...this.problems.slice(0, 8));
    lines.push(...this.pending.slice(0, 8).map((item) => `${item.course} \xB7 ${item.label} (${item.updated})`));
    if (this.pending.length > 8) lines.push(`And ${this.pending.length - 8} more; use Learn source checks as needed.`);
    new Notice(lines.join("\n"), 12e3);
  }
  async acknowledge() {
    const acknowledged = { ...this.acknowledged };
    for (const item of this.pending) acknowledged[item.key] = item.revision;
    try {
      await this.saveState({ acknowledged });
      this.acknowledged = acknowledged;
      if (!this.stopped) await this.sync(true);
    } catch (error) {
      this.reportFailure("Could not acknowledge source changes", error);
    }
  }
  reportFailure(context, error) {
    if (this.stopped) return;
    this.problems = [`${context}: ${error.message || String(error)}`];
    this.status.setText("Learn sync: storage error");
  }
  saveState(overrides = {}) {
    const snapshot = JSON.parse(JSON.stringify({ version: 1, acknowledged: this.acknowledged, initialRevisions: this.initialRevisions, renames: this.renames, ...overrides }));
    this.persisting = (this.persisting ?? Promise.resolve()).catch(() => {
    }).then(() => this.saveData(snapshot));
    return this.persisting;
  }
  onunload() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
};
