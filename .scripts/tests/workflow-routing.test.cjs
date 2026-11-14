const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const YAML = require('../../Web/node_modules/yaml');

const directory = join(__dirname, '../../.github/workflows');
const roles = Object.fromEntries([
  ['pr-title', 'vault-validation.yml'],
  ['validate', 'vault-validation.yml'],
  ['gate', 'vault-validation.yml'],
  ['command', 'vault-validation.yml'],
  ['release', 'release.yml'],
  ['update', 'release.yml'],
].map(([id, file]) => {
  const workflow = YAML.parse(readFileSync(join(directory, file), 'utf8'));
  assert.ok(workflow.jobs[id], `${file} must expose ${id}`);
  return [id, { file, workflow, job: workflow.jobs[id] }];
}));

function triggered(workflow, github) {
  const events = workflow.on;
  if (typeof events === 'string') return events === github.event_name;
  if (!Object.hasOwn(events, github.event_name)) return false;
  const filter = events[github.event_name] ?? {};
  const types = filter.types ?? (github.event_name === 'pull_request' ? ['opened', 'synchronize', 'reopened'] : null);
  if (types && !types.includes(github.event.action)) return false;
  const branch = github.event_name === 'pull_request' ? github.event.pull_request.base.ref : github.ref?.replace(/^refs\/heads\//, '');
  return !filter.branches || filter.branches.includes(branch);
}

function admitted(job, github) {
  if (!job.if) return true;
  // These workflow predicates use only boolean expressions and these three helpers.
  const expression = job.if.replace(/^\$\{\{\s*|\s*\}\}$/g, '');
  return Boolean(new Function('github', 'contains', 'fromJSON', 'startsWith', `return (${expression});`)(
    github,
    (values, value) => values.includes(value),
    JSON.parse,
    (value, prefix) => value.startsWith(prefix),
  ));
}

function activeJobs(github, dispatchedFile) {
  return Object.entries(roles)
    .filter(([, { file, workflow, job }]) => (!dispatchedFile || file === dispatchedFile) && triggered(workflow, github) && admitted(job, github))
    .map(([id]) => id).sort();
}

for (const branch of ['main', 'stage', 'other']) {
  for (const action of ['opened', 'synchronize', 'reopened', 'edited']) {
    test(`${action} PR into ${branch} runs the existing checks only`, () => {
      const github = { event_name: 'pull_request', base_ref: branch, event: { action, pull_request: { base: { ref: branch } } } };
      const expected = [];
      if (action !== 'edited') expected.push('validate');
      if (branch === 'main' || branch === 'stage') expected.push('pr-title');
      if (branch === 'main') expected.push('gate');
      assert.deepEqual(activeJobs(github), expected.sort());
    });
  }
}

for (const branch of ['main', 'stage', 'other']) {
  test(`push into ${branch} runs only its validation and release tasks`, () => {
    const github = { event_name: 'push', ref: `refs/heads/${branch}`, event: {} };
    assert.deepEqual(activeJobs(github), branch === 'main' ? ['release', 'validate'] : []);
  });
}

test('manual vault-validation dispatch runs validation without PR or release tasks', () => {
  assert.deepEqual(activeJobs({ event_name: 'workflow_dispatch', event: {} }, 'vault-validation.yml'), ['validate']);
});

test('non-PR CI runs cannot shadow the required pr-title check with a skipped result', () => {
  const role = roles['pr-title'];
  const checkName = (github) => {
    const name = role.job.name ?? 'pr-title';
    if (!name.startsWith('${{')) return name;
    return new Function('github', `return (${name.slice(3, -2)});`)(github);
  };
  assert.equal(checkName({ event_name: 'pull_request' }), 'pr-title');
  for (const event_name of ['workflow_dispatch', 'push', 'issue_comment']) {
    if (Object.hasOwn(role.workflow.on, event_name)) {
      assert.notEqual(checkName({ event_name }), 'pr-title', event_name);
    }
  }
});

for (const body of ['/approve-major', '/no-major']) {
  for (const association of ['OWNER', 'MEMBER', 'COLLABORATOR', 'NONE']) {
    test(`${association} ${body} PR comment only admits authorized commands`, () => {
      const github = { event_name: 'issue_comment', event: { action: 'created', issue: { pull_request: {} }, comment: { author_association: association, body } } };
      assert.deepEqual(activeJobs(github), association === 'NONE' ? [] : ['command']);
    });
  }
}

for (const [name, event] of [
  ['ordinary PR comment', { action: 'created', issue: { pull_request: {} }, comment: { author_association: 'OWNER', body: 'Looks good' } }],
  ['issue command', { action: 'created', issue: {}, comment: { author_association: 'OWNER', body: '/approve-major' } }],
  ['edited command', { action: 'edited', issue: { pull_request: {} }, comment: { author_association: 'OWNER', body: '/approve-major' } }],
]) {
  test(`${name} runs no CI or delivery tasks`, () => {
    assert.deepEqual(activeJobs({ event_name: 'issue_comment', event }), []);
  });
}

test('successful Vercel Preview event only runs the preview-link task', () => {
  const event = {
    sender: { login: 'vercel[bot]' },
    deployment: { environment: 'Preview', creator: { login: 'vercel[bot]' } },
    deployment_status: { state: 'success', environment_url: 'https://build.vercel.app' },
  };
  assert.deepEqual(activeJobs({ event_name: 'deployment_status', event }), ['update']);
  event.deployment.environment = 'Production';
  assert.deepEqual(activeJobs({ event_name: 'deployment_status', event }), []);
});

for (const event_name of ['schedule', 'pull_request_review']) {
  test(`${event_name} does not run CI or delivery tasks`, () => {
    assert.deepEqual(activeJobs({ event_name, event: {} }), []);
  });
}

test('each task retains its token permission boundary', () => {
  const expected = {
    'pr-title': { contents: 'read' },
    validate: { contents: 'read' },
    gate: { contents: 'read', 'pull-requests': 'write', statuses: 'write' },
    command: { contents: 'read', 'pull-requests': 'write', statuses: 'write' },
    release: { contents: 'write' },
    update: { contents: 'read', deployments: 'write' },
  };
  for (const [id, { workflow, job }] of Object.entries(roles)) {
    assert.deepEqual(job.permissions ?? workflow.permissions, expected[id], id);
  }
});

test('release serialization does not serialize preview-link updates', () => {
  const release = roles.release;
  assert.deepEqual(release.job.concurrency ?? release.workflow.concurrency, { group: 'release', 'cancel-in-progress': false });
  const update = roles.update;
  assert.equal(update.job.concurrency ?? update.workflow.concurrency, undefined);
});
