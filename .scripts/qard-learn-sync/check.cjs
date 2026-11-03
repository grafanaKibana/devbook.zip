'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { inspectCourse, sourceSnapshot, unassignedSources } = require('./core.cjs');

async function insideVault(file, vault) {
  const [resolved, root] = await Promise.all([fs.realpath(file), fs.realpath(vault)]);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error(`Path escapes the vault: ${path.relative(vault, file)}`);
  return resolved;
}

async function markdownFiles(directory, vault) {
  let entries;
  try { await insideVault(directory, vault); entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(file, vault));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
  return files;
}

async function checkCoverage({ repoRoot = path.resolve(__dirname, '../..'), paths } = {}) {
  const result = { unassigned: [], problems: [] };
  const vault = path.resolve(repoRoot, 'Vault');
  if (paths !== undefined && (!Array.isArray(paths) || paths.some(value => typeof value !== 'string'
    || !/^Home\/[^/]+\/.+\.md$/.test(value) || /[\\\0\r\n]/.test(value)
    || value.split('/').some(part => !part || part === '.' || part === '..')))) {
    result.problems.push('Invalid source path: use vault-relative Home/<subject>/<note>.md paths without traversal.');
    return result;
  }
  try {
    const sources = await markdownFiles(path.join(vault, 'Home'), vault);
    const relative = file => path.relative(vault, file).split(path.sep).join('/');
    const byPath = new Map(sources.map(file => [relative(file), file]));
    const resolveLink = link => {
      const exact = link.replace(/\.md$/, '') + '.md';
      if (byPath.has(exact)) return exact;
      const matches = [...byPath.keys()].filter(file => file.endsWith('/' + exact));
      return matches.length === 1 ? matches[0] : undefined;
    };
    const courses = [];
    for (const file of await markdownFiles(path.join(vault, 'Assets/Qard/Courses'), vault)) {
      try {
        const course = { path: relative(file), ...inspectCourse(await fs.readFile(await insideVault(file, vault), 'utf8')) };
        courses.push(course);
        for (const row of course.rows) for (const link of row.notes) {
          if (!resolveLink(link)) result.problems.push(`${course.path}: unresolved source ${link} for ${row.id}`);
        }
      } catch (error) { result.problems.push(`${relative(file)}: ${error.message}`); }
    }
    const selected = paths === undefined ? [...byPath.keys()] : [...new Set(paths)];
    const inventory = [];
    for (const source of selected) {
      // Deleted notes no longer need assignment. Never follow an explicit path outside this inventory.
      if (!byPath.has(source)) {
        try {
          await fs.lstat(path.join(vault, source));
          await insideVault(path.join(vault, source), vault);
          result.problems.push(`${source}: source is not an indexed Markdown file.`);
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
        continue;
      }
      inventory.push({ path: source, cards: (await sourceSnapshot(await fs.readFile(await insideVault(byPath.get(source), vault), 'utf8'))).cards });
    }
    const unassigned = unassignedSources(courses, inventory, resolveLink);
    if (!result.problems.length) result.unassigned = unassigned;
  } catch (error) { result.problems.push(error.message); }
  return result;
}

async function main(args) {
  const paths = [], problems = [];
  let json = false, selected = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--json') json = true;
    else if (args[index] === '--paths') {
      selected = true;
      const start = paths.length;
      while (index + 1 < args.length && !args[index + 1].startsWith('--')) paths.push(args[++index]);
      if (paths.length === start) problems.push('--paths requires at least one vault-relative Markdown path.');
    } else problems.push(`Unknown argument: ${args[index]}`);
  }
  const result = problems.length ? { unassigned: [], problems } : await checkCoverage({ paths: selected ? paths : undefined });
  if (json) process.stdout.write(JSON.stringify(result) + '\n');
  else {
    for (const problem of result.problems) console.log(`Learn coverage: ${problem}`);
    for (const item of result.unassigned) console.log(`Unassigned: ${item.path} (${item.cards} card(s), ${item.course}). Link to an existing fitting objective in that subject course; add an objective only for a distinct skill.`);
    if (!result.problems.length && !result.unassigned.length) console.log('Learn coverage: all checked Qard notes are assigned.');
  }
  process.exitCode = result.problems.length || result.unassigned.length ? 1 : 0;
}

module.exports = { checkCoverage };
if (require.main === module) void main(process.argv.slice(2)).catch(error => { console.error(`Learn coverage: ${error.message}`); process.exitCode = 1; });
