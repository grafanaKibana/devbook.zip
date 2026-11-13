const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const YAML = require('../../Web/node_modules/yaml');

const workflow = YAML.parse(readFileSync(join(__dirname, '../../.github/workflows/preview-deployment-link.yml'), 'utf8'));
const admitted = new Function('github', `return ${workflow.jobs.update.if};`);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const update = new AsyncFunction('context', 'github', 'core', workflow.jobs.update.steps[0].with.script);
const sha = 'a'.repeat(40);

function fixture() {
  const event = {
    sender: { login: 'vercel[bot]' },
    deployment: { id: 42, sha, environment: 'Preview', creator: { login: 'vercel[bot]' } },
    deployment_status: { state: 'success', environment_url: 'https://build.vercel.app' },
  };
  const latest = { state: 'success', environment_url: 'https://build.vercel.app', log_url: 'https://build.vercel.app', description: 'Deployment ready' };
  const writes = [];
  const github = { rest: { repos: {
    getBranch: async () => ({ data: { commit: { sha } } }),
    listDeploymentStatuses: async () => ({ data: [latest] }),
    createDeploymentStatus: async (args) => { writes.push(args); },
  } } };
  const run = () => update({ repo: { owner: 'test', repo: 'repo' }, payload: event }, github, { info() {} });
  return { event, latest, writes, github, run };
}

test('updates the existing native Preview record and retains its build log', async () => {
  const f = fixture();
  assert.equal(admitted({ event: f.event }), true);
  await f.run();
  assert.deepEqual(f.writes, [{ owner: 'test', repo: 'repo', deployment_id: 42, state: 'success', environment: 'Preview', environment_url: 'https://stage.devbook.zip', log_url: 'https://build.vercel.app', description: 'Deployment ready', auto_inactive: false }]);
});

for (const [name, change] of [
  ['Production deployment', (e) => { e.deployment.environment = 'Production'; }],
  ['untrusted sender', (e) => { e.sender.login = 'someone'; }],
  ['non-Vercel deployment', (e) => { e.deployment.creator.login = 'someone'; }],
  ['failed deployment', (e) => { e.deployment_status.state = 'failure'; }],
  ['already corrected event', (e) => { e.deployment_status.environment_url = 'https://stage.devbook.zip'; }],
]) {
  test(`ignores ${name}`, () => {
    const f = fixture();
    change(f.event);
    assert.equal(admitted({ event: f.event }), false);
  });
}

test('ignores a different branch or an outdated stage commit', async () => {
  const f = fixture();
  f.event.deployment.sha = 'b'.repeat(40);
  await f.run();
  assert.deepEqual(f.writes, []);
});

for (const state of ['failure', 'inactive']) {
  test(`does not overwrite a newer ${state} status`, async () => {
    const f = fixture();
    f.latest.state = state;
    await f.run();
    assert.deepEqual(f.writes, []);
  });
}

test('does not append a duplicate corrected status', async () => {
  const f = fixture();
  f.latest.environment_url = 'https://stage.devbook.zip';
  await f.run();
  assert.deepEqual(f.writes, []);
});

test('surfaces GitHub API failures', async () => {
  const f = fixture();
  f.github.rest.repos.getBranch = async () => { throw new Error('GitHub unavailable'); };
  await assert.rejects(f.run, /GitHub unavailable/);
  assert.deepEqual(f.writes, []);
});
