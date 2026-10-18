import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const hooks = resolve(import.meta.dirname, "..");

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), "devbook-hooks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const note = "Vault/Home/Programming/Example.md";
  mkdirSync(dirname(resolve(root, note)), { recursive: true });
  writeFileSync(resolve(root, note), "# Example\n");
  function run(script, payload, args = []) {
    const result = spawnSync(process.execPath, [resolve(hooks, script), ...args], {
      cwd: root,
      encoding: "utf8",
      input: typeof payload === "string" ? payload : JSON.stringify(payload),
      env: { ...process.env, DEVBOOK_HOOK_REPO_ROOT: root, DEVBOOK_HOOK_STATE_DIR: resolve(root, ".state") },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  }
  return { root, note, run };
}

test("review receipt is required and bound to the current note hash", (t) => {
  const { root, note, run } = fixture(t);
  const payload = { session_id: "review" };
  assert.equal(run("enforce-review.mjs", payload), "");
  const patch = `*** Begin Patch\n*** Update File: ${note}\n@@\n-old\n+new\n*** End Patch`;
  assert.match(run("suggest-review.mjs", { ...payload, tool_input: { command: patch } }), /Changed note review required/);
  assert.equal(JSON.parse(run("enforce-review.mjs", payload)).decision, "block");
  assert.equal(run("enforce-review.mjs", { ...payload, stop_hook_active: true }), "");
  const receipt = ["--session", "review", "--verdict", "CLEAN", "--path", note];
  run("review-receipt.mjs", "", receipt);
  writeFileSync(resolve(root, note), "# Changed after review\n");
  assert.equal(JSON.parse(run("enforce-review.mjs", payload)).decision, "block");
  run("review-receipt.mjs", "", receipt);
  assert.equal(run("enforce-review.mjs", payload), "");
});

test("scope filtering and legacy path inputs preserve the review gate", (t) => {
  const { root, note, run } = fixture(t);
  for (const payload of ["{not-json", { tool_input: { file_path: "Vault/Templates/Template.md" } }]) {
    assert.equal(run("suggest-review.mjs", payload), "");
  }
  for (const file_path of [note, resolve(root, note)]) {
    assert.match(run("suggest-review.mjs", { session_id: file_path, tool_input: { file_path } }), /Changed note review required/);
    assert.equal(JSON.parse(run("enforce-review.mjs", { session_id: file_path })).decision, "block");
  }
});
