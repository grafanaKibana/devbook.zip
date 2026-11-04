'use strict';

const COLUMNS = ['Objective', 'Label', 'ID', 'Group', 'State', 'Due', 'Needs', 'Notes', 'Evidence'];
const STATES = new Set(['planned', 'new', 'gap', 'misconception', 'taught', 'shaky', 'right once', 'mastered', 'slipping']);
const REVISION_COLUMN = 'Source revision';
const UPDATED_COLUMN = 'Source updated';

function fail(message) {
  throw new Error(`Cannot sync Learn course: ${message}`);
}

const contentOf = (text) => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/.exec(text);
  const summary = match?.[1].match(/^summary:\s*(.*)$/m)?.[1] ?? '';
  const body = match ? text.slice(match[0].length) : text;
  return `${summary}\n${body}`
    .replace(/^[ \t]*<!--[ \t]*qard-(?:id|location|siblings|reverse):[^\n]*?-->[ \t]*(?:\r?\n|$)/gm, '')
    .replace(/<!--[ \t]*qard-(?:id|location|siblings|reverse):[^\n]*?-->/g, '')
    .replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
};

// Match stock Qard's block boundaries; Qard remains responsible for card-format diagnostics.
function cardCount(text) {
  const lines = text.split(/\r?\n/);
  const header = /^ {0,3}> ?\[!qard\][+-]?(?:[ \t]+(.*))?$/i;
  const quoted = /^ {0,3}> ?(.*)$/;
  const opening = line => /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1] || '';
  const closes = (line, fence) => {
    const match = /^ {0,3}(`+|~+)\s*$/.exec(line);
    return match && match[1][0] === fence[0] && match[1].length >= fence.length;
  };
  let start = 0, count = 0, fence = '', comment = false;
  if (lines[0]?.replace(/^\uFEFF/, '') === '---') {
    const end = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
    if (end < 0) return 0;
    start = end + 1;
  }
  for (let index = start; index < lines.length; index++) {
    const line = lines[index];
    if (fence) { if (closes(line, fence)) fence = ''; continue; }
    if (comment) { if (line.includes('-->')) comment = false; continue; }
    fence = opening(line);
    if (fence) continue;
    if (/^\s*<!--/.test(line)) { comment = !line.includes('-->'); continue; }
    const match = header.exec(line);
    if (!match) continue;
    let end = index + 1, innerFence = opening(match[1] || ''), separator = -1;
    const body = [];
    while (end < lines.length) {
      const content = quoted.exec(lines[end]);
      if (!content || (!innerFence && header.test(lines[end]))) break;
      const value = content[1];
      if (innerFence) { if (closes(value, innerFence)) innerFence = ''; }
      else {
        innerFence = opening(value);
        if (!innerFence && value.trim() === '<!-- qard-answer -->' && separator < 0) separator = body.length;
      }
      body.push(value);
      end++;
    }
    const front = separator < 0 ? (match[1] || '') : [match[1] || '', ...body.slice(0, separator)].join('\n');
    const back = (separator < 0 ? body : body.slice(separator + 1)).join('\n');
    if (front.trim() && back.trim() && !innerFence) count++;
    index = end - 1;
  }
  return count;
}

async function sourceSnapshot(text) {
  if (typeof text !== 'string') fail('expected source Markdown text');
  const bytes = new TextEncoder().encode(contentOf(text));
  const hash = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const revision = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { revision, cards: cardCount(text) };
}

function unassignedSources(courses, sources, resolveLink = link => link.replace(/\.md$/, '') + '.md') {
  const subjects = new Set(), assigned = new Set();
  for (const course of courses) {
    if (subjects.has(course.course)) fail(`duplicate Learn course ${course.course}`);
    subjects.add(course.course);
    for (const row of course.rows) for (const link of row.notes) {
      vaultPath(link);
      const target = resolveLink(link, course.path);
      if (target?.startsWith(`Home/${course.course}/`)) assigned.add(target);
    }
  }
  return sources.filter(source => source.cards > 0 && /^Home\/[^/]+\/.+\.md$/.test(source.path) && !assigned.has(source.path))
    .map(source => ({ path: source.path, cards: source.cards, course: source.path.split('/')[1] }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function completedLessonProblems(courses, lessons) {
  const problems = [], byPath = new Map(courses.map(course => [course.path, course]));
  const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
  for (const record of lessons) {
    const invalid = reason => problems.push(`${record.path}: cannot verify Learn progress (${reason}). Review the stored lesson evidence.`);
    let lesson;
    try { lesson = JSON.parse(record.text); }
    catch { invalid('invalid lesson JSON'); continue; }
    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson) || lesson.version !== 1) {
      invalid('unsupported or invalid lesson format; expected version 1');
      continue;
    }
    const row = byPath.get(lesson.mastery)?.rows.find(row => row.id === lesson.objective);
    if (!row) continue;
    if (lesson.finishedAt === undefined && lesson.close === undefined) continue;
    if (!Number.isFinite(lesson.finishedAt)) { invalid('invalid finishedAt timestamp'); continue; }
    if (lesson.close === undefined) continue; // Finished lessons may still be awaiting the writer's close result.
    if (lesson.accepted !== true || !lesson.close || typeof lesson.close !== 'object'
      || Array.isArray(lesson.close) || !validDay(lesson.close.nextCheck)) {
      invalid('invalid completed lesson acceptance, close result or nextCheck date');
      continue;
    }
    if (row.state === 'new' && !row.due && !row.evidence) {
      problems.push(`Possible Learn progress loss: ${lesson.mastery}#${row.id} is new with no due date or evidence, but completed lesson ${record.path} records nextCheck ${lesson.close.nextCheck}. Review lesson/check evidence and recover verified progress.`);
    }
  }
  return problems;
}


function linesOf(text) {
  return [...text.matchAll(/([^\r\n]*)(\r\n|\n|$)/g)]
    .filter(match => match[0] !== '')
    .map(match => ({ text: match[1], ending: match[2] }));
}

function rowCells(line) {
  const pipes = [];
  for (let index = 0; index < line.length; index++) {
    if (line[index] !== '|') continue;
    let slashes = 0;
    for (let previous = index - 1; previous >= 0 && line[previous] === '\\'; previous--) slashes++;
    if (slashes % 2 === 0) pipes.push(index);
  }
  if (pipes.length < 2 || line.slice(0, pipes[0]).trim() || line.slice(pipes.at(-1) + 1).trim()) return undefined;
  return {
    prefix: line.slice(0, pipes[0] + 1),
    suffix: line.slice(pipes.at(-1) + 1),
    cells: pipes.slice(0, -1).map((start, index) => line.slice(start + 1, pipes[index + 1])),
  };
}

const decoded = value => value.trim().replace(/\\\|/g, '|');
const normalizedHeader = value => decoded(value).toLowerCase();
const isDivider = cells => cells.every(cell => /^:?-{2,}:?$/.test(cell.trim()));
const list = value => value.replace(/`/g, '').split(/[,\s]+/).filter(Boolean);

function noteLinks(value) {
  const text = decoded(value);
  const links = [...text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map(match => match[1].trim());
  return links.length ? links : text.split(',').map(link => link.trim()).filter(Boolean);
}

function parseCourse(text) {
  if (typeof text !== 'string') fail('expected Markdown text');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
  const course = frontmatter && /^qard-mastery:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim().replace(/^["']|["']$/g, '');
  if (!course) fail('missing qard-mastery frontmatter');
  const lines = linesOf(text), candidates = [];
  for (let index = 0; index < lines.length - 1; index++) {
    const header = rowCells(lines[index].text), divider = rowCells(lines[index + 1].text);
    if (!header || !divider || !isDivider(divider.cells)) continue;
    const names = header.cells.map(normalizedHeader);
    if (names.includes('id') && names.includes('state')) candidates.push({ index, header, divider, names });
  }
  if (candidates.length !== 1) fail('expected exactly one objectives table');
  const table = candidates[0];
  if (new Set(table.names).size !== table.names.length || table.names.some(name => !name)) fail('duplicate or empty table columns');
  for (const name of COLUMNS) if (!table.names.includes(name.toLowerCase())) fail(`missing ${name} column`);
  if (table.divider.cells.length !== table.names.length) fail('header and divider have different cell counts');
  const at = name => table.names.indexOf(name.toLowerCase());
  const rows = [];
  for (let line = table.index + 2; line < lines.length; line++) {
    if (!lines[line].text.trimStart().startsWith('|')) break;
    const raw = rowCells(lines[line].text);
    if (!raw || raw.cells.length !== table.names.length || isDivider(raw.cells)) fail(`malformed objective row at line ${line + 1}`);
    const get = name => decoded(raw.cells[at(name)]);
    const id = get('ID').replace(/`/g, '');
    if (!/^[A-Za-z0-9_-]+$/.test(id) || !get('Objective')) fail(`missing or invalid objective identity at line ${line + 1}`);
    let state = get('State').toLowerCase().replace(/[-_]/g, ' ');
    if (state === 'not covered' || state === 'not covered yet') state = 'planned';
    if (!STATES.has(state)) fail(`unknown state for ${id}`);
    const due = get('Due');
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) fail(`invalid due date for ${id}`);
    rows.push({
      line, raw, id, title: get('Objective'), label: get('Label'), group: get('Group'), state, due,
      needs: list(get('Needs')), notes: noteLinks(raw.cells[at('Notes')]), evidence: get('Evidence'),
      sourceRevision: at(REVISION_COLUMN) < 0 ? '' : get(REVISION_COLUMN),
      sourceUpdated: at(UPDATED_COLUMN) < 0 ? '' : get(UPDATED_COLUMN),
    });
  }
  const byId = new Map(rows.map(row => [row.id, row]));
  if (byId.size !== rows.length) fail('duplicate objective IDs');
  const visiting = new Set(), visited = new Set();
  const visit = row => {
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

function inspectCourse(text) {
  const { course, rows } = parseCourse(text);
  return {
    course,
    rows: rows.map(({ line, raw, ...row }) => row),
  };
}

function vaultPath(value) {
  if (typeof value !== 'string' || !value || value.startsWith('/') || /[\\|\r\n#\[\]]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..')) fail(`invalid vault-relative path ${String(value)}`);
  return value;
}

function renamedPath(value, renames) {
  let result = value;
  for (const rename of renames) {
    if (!rename || typeof rename !== 'object') fail('invalid rename');
    const from = vaultPath(rename.from), to = vaultPath(rename.to);
    if (from.endsWith('.md') && result === from) result = to;
    else if (from.endsWith('.md') && !result.endsWith('.md') && result === from.slice(0, -3)) result = to.replace(/\.md$/, '');
    else if (result.startsWith(from + '/')) result = to + result.slice(from.length);
  }
  return result;
}

function renameNotes(raw, renames) {
  if (!renames.length) return raw;
  if (raw.includes('[[')) {
    return raw.replace(/\[\[([^\]]+)\]\]/g, (whole, inner) => {
      let end = inner.length;
      const heading = inner.indexOf('#'), alias = inner.indexOf('|');
      if (heading >= 0) end = Math.min(end, heading);
      if (alias >= 0) end = Math.min(end, inner[alias - 1] === '\\' ? alias - 1 : alias);
      const target = inner.slice(0, end), path = target.trim(), renamed = renamedPath(path, renames);
      return renamed === path ? whole : '[[' + target.replace(path, () => renamed) + inner.slice(end) + ']]';
    });
  }
  return raw.split(/(,)/).map(part => part === ',' ? part : part.replace(part.trim(), () => renamedPath(part.trim(), renames))).join('');
}

function renderRow(raw, cells) {
  return raw.prefix + cells.join('|') + '|' + raw.suffix;
}

function setCell(cells, index, value) {
  const raw = cells[index];
  const leading = /^\s*/.exec(raw)[0], trailing = /\s*$/.exec(raw)[0];
  cells[index] = leading + value + (raw.trim() ? trailing : ' ');
}

function reconcileCourse(text, { sources, renames = [], day, initialRevisions = {} } = {}) {
  const parsed = parseCourse(text);
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) fail('expected source revisions');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) fail('expected an update day');
  if (!initialRevisions || typeof initialRevisions !== 'object' || Array.isArray(initialRevisions)) fail('expected initial source revisions');
  for (const revision of Object.values(initialRevisions)) {
    if (typeof revision !== 'string' || !/^v1:[a-f0-9]{64}\/\d+(?:,[a-f0-9]{64}\/\d+)*$/i.test(revision)) fail('invalid initial source revision');
  }
  const sourceMap = new Map();
  for (const [source, value] of Object.entries(sources)) {
    const key = vaultPath(source).replace(/\.md$/, '') + '.md';
    if (!value || !/^[a-f0-9]{64}$/i.test(value.revision) || !Number.isInteger(value.cards) || value.cards < 0) fail(`invalid source revision for ${source}`);
    if (sourceMap.has(key)) fail(`duplicate canonical source ${key}`);
    sourceMap.set(key, value);
  }
  for (const rename of renames) {
    if (!rename || typeof rename !== 'object') fail('invalid rename');
    vaultPath(rename.from);
    vaultPath(rename.to);
  }
  const { lines, table, rows } = parsed;
  const names = [...table.names], header = [...table.header.cells], divider = [...table.divider.cells];
  for (const column of [REVISION_COLUMN, UPDATED_COLUMN]) {
    if (names.includes(column.toLowerCase())) continue;
    names.push(column.toLowerCase());
    header.push(` ${column} `);
    divider.push(' --- ');
  }
  const revisionAt = names.indexOf(REVISION_COLUMN.toLowerCase());
  const updatedAt = names.indexOf(UPDATED_COLUMN.toLowerCase());
  const notesAt = names.indexOf('notes');
  const result = { changed: [], initialized: [], renamed: [], missing: [] };
  lines[table.index].text = renderRow(table.header, header);
  lines[table.index + 1].text = renderRow(table.divider, divider);
  for (const row of rows) {
    const cells = [...row.raw.cells];
    while (cells.length < names.length) cells.push(' ');
    cells[notesAt] = renameNotes(cells[notesAt], renames);
    if (cells[notesAt] !== row.raw.cells[notesAt]) result.renamed.push(row.id);
    const notes = noteLinks(cells[notesAt]);
    const missing = notes.filter(note => !sourceMap.has(note.replace(/\.md$/, '') + '.md'));
    if (missing.length) result.missing.push({ id: row.id, paths: missing });
    if (notes.length && !missing.length) {
      const revision = 'v1:' + notes.map(note => {
        const value = sourceMap.get(note.replace(/\.md$/, '') + '.md');
        return value.revision + '/' + value.cards;
      }).join(',');
      const previous = row.sourceRevision || (Object.hasOwn(initialRevisions, row.id) ? initialRevisions[row.id] : '');
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
  const merged = lines.map(line => line.text + line.ending).join('');
  parseCourse(merged);
  return { text: merged, ...result };
}

module.exports = { inspectCourse, reconcileCourse, renameSourcePath: renamedPath, sourceSnapshot, unassignedSources, completedLessonProblems };
