const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('../../Web/node_modules/esbuild');
const destination = path.resolve(__dirname, '../../Vault/.obsidian/plugins/devbook-learn-sync');
fs.mkdirSync(destination, { recursive: true });
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'plugin.cjs')],
  outfile: path.join(destination, 'main.js'),
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2020',
  external: ['obsidian'],
  logLevel: 'warning',
});
fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(destination, 'manifest.json'));
console.log('Built DevBook Learn Sync using existing locked Web dependencies.');
