'use strict';

const fs = require('node:fs');
const path = require('node:path');

const NOTE = /^Home\/.+\.md$/;

function files(directory, extensions) {
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return entries.sort((left, right) => left.name.localeCompare(right.name)).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return files(file, extensions);
    return entry.isFile() && extensions.includes(path.extname(entry.name)) ? [file] : [];
  });
}

function jsonPaths(value, where = '') {
  if (typeof value === 'string') return NOTE.test(value) ? [{ where: where || '.', note: value }] : [];
  if (Array.isArray(value)) return value.flatMap(item => jsonPaths(item, where + '[]'));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => jsonPaths(item, `${where}.${key}`));
  return [];
}

function wikilinks(text, vault) {
  return [...text.replaceAll('\\|', '|').matchAll(/\[\[(Home\/[^\]|#]+)/g)].map(match => match[1].trim())
    .filter(target => target.endsWith('.md') || !fs.existsSync(path.join(vault, target)))
    .map(target => ({ where: 'wikilink', note: target.replace(/\.md$/, '') + '.md' }));
}

// The interview template seeds both fields from the note path; a differing value is either stale or a deliberate override.
function seedFor(note) {
  const parts = note.replace(/\.md$/, '').split('/').slice(1);
  return { deck: parts[0], topic: parts.slice(1).join('/') };
}

function frontmatterValue(text, field) {
  const block = /^---\n([\s\S]*?)\n---/.exec(text);
  const match = block && new RegExp(`^${field}:[ \\t]*(.*)$`, 'm').exec(block[1]);
  return match ? match[1].trim().replace(/^(["'])(.*)\1$/, '$2') : undefined;
}

function inspectReferences({ repoRoot = path.resolve(__dirname, '../..'), paths } = {}) {
  const vault = path.resolve(repoRoot, 'Vault');
  const relative = file => path.relative(vault, file).split(path.sep).join('/');
  const notes = new Map(files(path.join(vault, 'Home'), ['.md']).map(file => [relative(file), file]));
  const selected = paths && new Set(paths);
  const result = { references: [], seeds: [], problems: [] };

  for (const root of ['Assets/Qard', 'Qard']) {
    for (const file of files(path.join(vault, root), ['.json', '.md'])) {
      const text = fs.readFileSync(file, 'utf8');
      let found;
      try { found = file.endsWith('.json') ? jsonPaths(JSON.parse(text)) : wikilinks(text, vault); }
      catch (error) { result.problems.push(`${relative(file)}: ${error.message}`); continue; }
      for (const reference of found) {
        const exists = notes.has(reference.note);
        if (selected ? selected.has(reference.note) : !exists) result.references.push({ file: relative(file), ...reference, exists });
      }
    }
  }

  for (const [note, file] of notes) {
    if (selected && !selected.has(note)) continue;
    const text = fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
    const actual = { deck: frontmatterValue(text, 'qard-deck'), topic: frontmatterValue(text, 'qard-topic') };
    if (actual.deck === undefined && actual.topic === undefined) continue;
    const expected = seedFor(note);
    const matches = actual.deck === expected.deck && actual.topic === expected.topic;
    if (selected || !matches) result.seeds.push({ note, actual, expected, matches });
  }
  return result;
}

function main(args) {
  const paths = [];
  let json = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--json') json = true;
    else if (args[index] === '--path' && NOTE.test(args[index + 1] ?? '')) paths.push(args[++index]);
    else { console.error('Usage: references.cjs [--json] [--path Home/<note>.md]...'); process.exitCode = 2; return; }
  }
  const result = inspectReferences({ paths: paths.length ? paths : undefined });
  if (json) process.stdout.write(JSON.stringify(result) + '\n');
  else {
    for (const problem of result.problems) console.log(`Unreadable: ${problem}`);
    for (const item of result.references) console.log(`${item.exists ? 'Reference' : 'Missing note'}: ${item.file} ${item.where} -> ${item.note}`);
    for (const item of result.seeds) console.log(`${item.matches ? 'Seed' : 'Seed differs from path'}: ${item.note} has ${item.actual.deck} / ${item.actual.topic}; path gives ${item.expected.deck} / ${item.expected.topic}`);
    if (!result.problems.length && !result.references.length && !result.seeds.length) console.log('Qard references: every referenced note exists and every deck/topic seed matches its path.');
  }
  if (!paths.length && (result.problems.length || result.references.length || result.seeds.length)) process.exitCode = 1;
}

module.exports = { inspectReferences };
if (require.main === module) main(process.argv.slice(2));
