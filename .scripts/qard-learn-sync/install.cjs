const fs = require('node:fs');
const path = require('node:path');
const { inspectCourse, reconcileCourse, sourceSnapshot } = require('./core.cjs');

async function install() {
  const apply = process.argv.includes('--apply');
  const root = path.resolve(__dirname, '../..');
  const courseRoot = path.join(root, 'Vault/Assets/Qard/Courses');
  const destination = path.join(root, 'Vault/.obsidian/plugins/devbook-learn-sync');
  const dataPath = path.join(destination, 'data.json');
  const enabledPath = path.join(root, 'Vault/.obsidian/community-plugins.json');
  const previousData = fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : undefined;
  const previousEnabled = fs.readFileSync(enabledPath, 'utf8');
  const data = previousData ? JSON.parse(previousData) : { version: 1, acknowledged: {}, initialRevisions: {}, renames: [] };
  if (data.version !== 1) throw new Error('Unsupported companion state version; existing state was left unchanged.');
  data.initialRevisions ??= {};
  const cache = Object.create(null), captured = new Map();
  let courses = 0, objectives = 0;
  for (const name of fs.readdirSync(courseRoot).filter((name) => name.endsWith('.md')).sort()) {
    const coursePath = `Assets/Qard/Courses/${name}`;
    const file = path.join(root, 'Vault', coursePath);
    const text = fs.readFileSync(file, 'utf8');
    captured.set(file, text);
    const course = inspectCourse(text);
    const sources = Object.create(null);
    for (const row of course.rows) for (const note of row.notes) {
      const source = note.replace(/\.md$/, '') + '.md';
      if (!source.startsWith('Home/') || source.split('/').some((part) => part === '..' || part === '.')) throw new Error(`Expected an explicit Home source path: ${note}`);
      if (!cache[source]) {
        const sourceFile = path.join(root, 'Vault', source);
        const content = fs.readFileSync(sourceFile, 'utf8');
        captured.set(sourceFile, content);
        cache[source] = await sourceSnapshot(content);
      }
      sources[source] = cache[source];
    }
    const preview = reconcileCourse(text, { sources, day: new Date().toISOString().slice(0, 10) });
    if (preview.missing.length) throw new Error(`Resolve missing sources before installing: ${course.course}`);
    const baseline = data.initialRevisions[coursePath] ??= {};
    for (const row of inspectCourse(preview.text).rows) baseline[row.id] ??= row.sourceRevision;
    courses++;
    objectives += course.rows.length;
  }
  if (!courses) throw new Error('No existing Learn courses were found.');
  for (const [file, text] of captured) if (fs.readFileSync(file, 'utf8') !== text) throw new Error(`Source changed during baseline capture; rerun: ${path.relative(root, file)}`);
  if (fs.readFileSync(enabledPath, 'utf8') !== previousEnabled) throw new Error('Enabled plugin list changed; rerun installation.');
  if ((fs.existsSync(dataPath) ? fs.readFileSync(dataPath, 'utf8') : undefined) !== previousData) throw new Error('Companion state changed; rerun installation.');
  const enabled = JSON.parse(previousEnabled);
  if (!Array.isArray(enabled)) throw new Error('Invalid enabled plugin list.');
  if (apply) {
    if (!fs.existsSync(path.join(destination, 'main.js'))) throw new Error('Build the companion plugin first.');
    if (previousData === undefined) fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
    if (!enabled.includes('devbook-learn-sync')) {
      enabled.push('devbook-learn-sync');
      fs.writeFileSync(enabledPath, JSON.stringify(enabled, null, 2) + '\n');
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'installed' : 'dry-run', courses, objectives, sourceNotes: Object.keys(cache).length, courseFilesChanged: 0, activeOnNextPluginLoad: apply }, null, 2));
}
install().catch((error) => { console.error(error.message); process.exitCode = 1; });
