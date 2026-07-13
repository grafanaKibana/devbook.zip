import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const hookRoot = resolve(import.meta.dirname, "..");
const suggestHook = resolve(hookRoot, "suggest-review.mjs");
const stopHook = resolve(hookRoot, "enforce-review.mjs");
const receiptHook = resolve(hookRoot, "review-receipt.mjs");

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "devbook-hooks-"));
  const state = resolve(root, ".state");
  const note = "Vault/Home/Programming/Example.md";
  write(root, note, "# Example\n");
  return { root, state, note };
}

function write(root, path, content) {
  const absolute = resolve(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function run(script, payload, context) {
  return spawnSync(process.execPath, [script], {
    cwd: context.root,
    encoding: "utf8",
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    env: {
      ...process.env,
      DEVBOOK_HOOK_REPO_ROOT: context.root,
      DEVBOOK_HOOK_STATE_DIR: context.state,
    },
  });
}

function state(context) {
  return JSON.parse(
    readFileSync(resolve(context.state, "note-reviews.json"), "utf8"),
  );
}

test("tracks a Vault/Home note from canonical apply_patch command input", () => {
  const context = fixture();
  const result = run(
    suggestHook,
    {
      session_id: "patch-session",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: Vault/Home/Programming/Example.md\n@@\n-old\n+new\n*** End Patch",
      },
    },
    context,
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Changed note review required/);
  assert.ok(state(context).sessions["patch-session"].notes[context.note]);
});

test("tracks legacy relative and absolute file_path payloads", () => {
  const context = fixture();
  const relativeResult = run(
    suggestHook,
    { session_id: "relative", tool_input: { file_path: context.note } },
    context,
  );
  const absoluteResult = run(
    suggestHook,
    {
      session_id: "absolute",
      tool_input: { file_path: resolve(context.root, context.note) },
    },
    context,
  );

  assert.equal(relativeResult.status, 0);
  assert.equal(absoluteResult.status, 0);
  assert.ok(state(context).sessions.relative.notes[context.note]);
  assert.ok(state(context).sessions.absolute.notes[context.note]);
});

test("ignores malformed JSON without blocking the edit", () => {
  const context = fixture();
  const result = run(suggestHook, "{not-json", context);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("ignores Markdown outside Vault/Home", () => {
  const context = fixture();
  write(context.root, "Vault/Templates/Template.md", "# Template\n");
  const result = run(
    suggestHook,
    {
      session_id: "outside",
      tool_input: { file_path: "Vault/Templates/Template.md" },
    },
    context,
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("Stop blocks pending reviews and stop_hook_active prevents a loop", () => {
  const context = fixture();
  run(
    suggestHook,
    { session_id: "stop", tool_input: { file_path: context.note } },
    context,
  );

  const blocked = run(stopHook, { session_id: "stop" }, context);
  assert.equal(blocked.status, 0);
  assert.deepEqual(JSON.parse(blocked.stdout).decision, "block");
  assert.match(blocked.stdout, /Vault\/Home\/Programming\/Example\.md/);
  assert.match(blocked.stdout, /review-receipt\.mjs/);

  const repeated = run(
    stopHook,
    { session_id: "stop", stop_hook_active: true },
    context,
  );
  assert.equal(repeated.status, 0);
  assert.equal(repeated.stdout, "");
});

test("a CLEAN receipt allows Stop only while the reviewed hash is current", () => {
  const context = fixture();
  run(
    suggestHook,
    { session_id: "clean", tool_input: { file_path: context.note } },
    context,
  );

  const receipt = spawnSync(
    process.execPath,
    [
      receiptHook,
      "--session",
      "clean",
      "--verdict",
      "CLEAN",
      "--path",
      context.note,
    ],
    {
      cwd: context.root,
      encoding: "utf8",
      env: {
        ...process.env,
        DEVBOOK_HOOK_REPO_ROOT: context.root,
        DEVBOOK_HOOK_STATE_DIR: context.state,
      },
    },
  );
  assert.equal(receipt.status, 0);

  write(context.root, context.note, "# Example\n\nChanged after review.\n");
  const stale = run(stopHook, { session_id: "clean" }, context);
  assert.deepEqual(JSON.parse(stale.stdout).decision, "block");

  const refreshed = spawnSync(
    process.execPath,
    [
      receiptHook,
      "--session",
      "clean",
      "--verdict",
      "CLEAN",
      "--path",
      context.note,
    ],
    {
      cwd: context.root,
      encoding: "utf8",
      env: {
        ...process.env,
        DEVBOOK_HOOK_REPO_ROOT: context.root,
        DEVBOOK_HOOK_STATE_DIR: context.state,
      },
    },
  );
  assert.equal(refreshed.status, 0);

  const allowed = run(stopHook, { session_id: "clean" }, context);
  assert.equal(allowed.status, 0);
  assert.equal(allowed.stdout, "");
});

test("Stop allows a session with no tracked notes", () => {
  const context = fixture();
  const result = run(stopHook, { session_id: "empty" }, context);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});
