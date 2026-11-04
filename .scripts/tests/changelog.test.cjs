"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const REPO = path.resolve(__dirname, "../..");
const CHANGELOG = "Vault/Home/Changelog.md";
const ORIGINAL =
  '---\ntitle: Changelog\npublish: true\ncreated: "2026-07-23T08:19:32.000Z"\nmodified: "2026-08-08T15:46:52.000Z"\npublished: "2026-07-23T10:35:00.000Z"\n---\n\nOld release history.\n';
const RELEASES = [
  [
    {
      tag_name: "v2.24.3",
      published_at: "2026-11-04T12:11:37Z",
      body: "## v2.24.3 — 2026-11-04\n\n### Notes\n- Improve Programming\n",
    },
    {
      tag_name: "v9.0.0",
      draft: true,
      published_at: null,
      body: "Unpublished release",
    },
  ],
  [{ tag_name: "v1.0.0", published_at: "2026-06-01T08:00:00Z", body: "" }],
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  assert.ifError(result.error);
  return result;
}

function fixture(t) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "devbook-changelog-test-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content, mode) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, mode ? { mode } : undefined);
  };
  write(CHANGELOG, ORIGINAL);
  write("Vault/Home/Note.md", "Original note.\n");
  write("Vault/Assets/example.png", "Original asset");
  write("README.md", "Original documentation.\n");
  write(
    ".scripts/generate-changelog.py",
    fs.readFileSync(path.join(REPO, ".scripts/generate-changelog.py")),
  );
  write(
    ".githooks/pre-commit",
    fs.readFileSync(path.join(REPO, ".githooks/pre-commit")),
  );
  write("releases.json", JSON.stringify(RELEASES));
  write(
    "bin/gh",
    '#!/bin/sh\nprintf "gh %s\\n" "$*" >> "$TEST_CALLS"\nif [ "${TEST_GH_FAILURE:-}" = 1 ]; then exit 1; fi\ncat "$TEST_RELEASES"\n',
    0o755,
  );
  write(
    "hook-env.sh",
    `
dotnet() {
  if [[ "$1" == --version ]]; then printf '10.0.100\\n'; return; fi
  printf 'dotnet %s\\n' "$*" >> "$TEST_CALLS"
  if [[ "$*" == *ValidateVault.cs* ]]; then
    git show :Vault/Home/Changelog.md > "$TEST_VALIDATED_CHANGELOG" 2>/dev/null || true
  fi
}
python3() { PATH="$TEST_BIN:$PATH" "$TEST_PYTHON" "$@"; }
node() { printf 'learn-check\\n' >> "$TEST_CALLS"; }
`,
  );
  const git = (...args) => {
    const result = run("git", args, { cwd: root });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  git("init", "--quiet");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("add", "--all");
  git("-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "fixture");
  const python = run("python3", ["-c", "import sys; print(sys.executable)"]);
  assert.equal(python.status, 0, python.stderr);
  const env = {
    ...process.env,
    PATH: `${path.join(root, "bin")}:${process.env.PATH}`,
    BASH_ENV: path.join(root, "hook-env.sh"),
    DEVBOOK_QUARTZ_MAINTENANCE: "1",
    TEST_BIN: path.join(root, "bin"),
    TEST_PYTHON: python.stdout.trim(),
    TEST_CALLS: path.join(root, "calls.log"),
    TEST_RELEASES: path.join(root, "releases.json"),
    TEST_VALIDATED_CHANGELOG: path.join(root, "validated-changelog.md"),
  };
  return {
    root,
    write,
    git,
    env,
    read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
    calls: () =>
      fs.existsSync(env.TEST_CALLS)
        ? fs.readFileSync(env.TEST_CALLS, "utf8")
        : "",
    generate: (overrides) =>
      run(env.TEST_PYTHON, [".scripts/generate-changelog.py"], {
        cwd: root,
        env: { ...env, ...overrides },
      }),
    hook: (overrides) =>
      run("bash", [".githooks/pre-commit"], {
        cwd: root,
        env: { ...env, ...overrides },
      }),
  };
}

test("generator includes every published page, preserves source dates and does not rewrite unchanged output", (t) => {
  const f = fixture(t);
  const result = f.generate();
  assert.equal(result.status, 0, result.stderr);
  const text = f.read(CHANGELOG);
  assert.match(text, /^## v2\.24\.3 \(Nov 04, 2026\)$/m);
  assert.match(text, /^## v1\.0\.0 \(Jun 01, 2026\)$/m);
  assert.doesNotMatch(text, /v9\.0\.0|Unpublished release/);
  for (const line of ORIGINAL.split("\n").filter((line) =>
    /^(created|modified|published):/.test(line),
  )) {
    assert.ok(text.includes(line), line);
  }
  assert.match(f.calls(), /gh api .*--paginate/);
  assert.match(f.calls(), /--slurp/);
  const sentinel = new Date("2020-01-01T00:00:00Z");
  fs.utimesSync(path.join(f.root, CHANGELOG), sentinel, sentinel);
  const before = fs.statSync(path.join(f.root, CHANGELOG)).mtimeMs;
  assert.equal(f.generate().status, 0);
  assert.equal(f.read(CHANGELOG), text);
  assert.equal(fs.statSync(path.join(f.root, CHANGELOG)).mtimeMs, before);
});

test("release API failure leaves the generated source untouched", (t) => {
  const f = fixture(t);
  assert.notEqual(f.generate({ TEST_GH_FAILURE: "1" }).status, 0);
  assert.equal(f.read(CHANGELOG), ORIGINAL);
});

for (const source of ["Vault/Home/Note.md", "Vault/Assets/example.png"]) {
  test(`pre-commit stages refreshed Changelog before validating a staged ${source.endsWith(".md") ? "note" : "asset"}`, (t) => {
    const f = fixture(t);
    f.write(source, "Changed source.\n");
    f.git("add", source);
    const result = f.hook();
    assert.equal(result.status, 0, result.stderr);
    assert.match(f.read(CHANGELOG), /## v2\.24\.3/);
    assert.equal(f.git("show", `:${CHANGELOG}`), f.read(CHANGELOG));
    assert.equal(f.read("validated-changelog.md"), f.read(CHANGELOG));
    assert.match(f.calls(), /SyncFolderRollupFrontmatter\.cs/);
    assert.match(f.calls(), /GenerateRoadmap\.cs/);
    assert.ok(
      f.calls().indexOf("gh api") < f.calls().indexOf("ValidateVault.cs"),
    );
    assert.equal(f.git("diff", "--name-only", "--", CHANGELOG), "");
  });
}

test("pre-commit skips fetching releases when no Vault source is staged", (t) => {
  const f = fixture(t);
  f.write("README.md", "Changed documentation.\n");
  f.git("add", "README.md");
  const result = f.hook();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.calls(), "");
  assert.equal(f.read(CHANGELOG), ORIGINAL);
});

test("pre-commit blocks on release API failure without changing or staging Changelog", (t) => {
  const f = fixture(t);
  f.write("Vault/Home/Note.md", "Changed source.\n");
  f.git("add", "Vault/Home/Note.md");
  assert.notEqual(f.hook({ TEST_GH_FAILURE: "1" }).status, 0);
  assert.equal(f.read(CHANGELOG), ORIGINAL);
  assert.equal(
    f.git("diff", "--cached", "--name-only").trim(),
    "Vault/Home/Note.md",
  );
  assert.doesNotMatch(f.calls(), /ValidateVault\.cs/);
});

test("pre-commit does not resurrect a staged Changelog deletion", (t) => {
  const f = fixture(t);
  f.git("rm", CHANGELOG);
  f.hook();
  assert.equal(fs.existsSync(path.join(f.root, CHANGELOG)), false);
  assert.equal(
    f.git("diff", "--cached", "--name-status").trim(),
    `D\t${CHANGELOG}`,
  );
  assert.doesNotMatch(f.calls(), /gh api/);
});

test("pre-commit stages a newly generated Changelog when the page is absent from HEAD", (t) => {
  const f = fixture(t);
  f.git("rm", CHANGELOG);
  f.git(
    "-c",
    "core.hooksPath=/dev/null",
    "commit",
    "--quiet",
    "-m",
    "remove changelog",
  );
  f.write("Vault/Home/Note.md", "Changed source.\n");
  f.git("add", "Vault/Home/Note.md");
  const result = f.hook();
  assert.equal(result.status, 0, result.stderr);
  assert.match(f.read(CHANGELOG), /## v2\.24\.3/);
  assert.equal(f.git("show", `:${CHANGELOG}`), f.read(CHANGELOG));
  assert.equal(f.read("validated-changelog.md"), f.read(CHANGELOG));
  assert.ok(
    f.git("diff", "--cached", "--name-status").includes(`A\t${CHANGELOG}`),
  );
  assert.equal(f.git("diff", "--name-only", "--", CHANGELOG), "");
});
