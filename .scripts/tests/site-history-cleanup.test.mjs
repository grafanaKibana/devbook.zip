import assert from "node:assert/strict"
import test from "node:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { createManifest, applyManifest, validateManifest, retiredWorkflows } from "../cleanup-retired-workflow-runs.mjs"

const repo = "grafanaKibana/devbook.zip"
const sha = "a".repeat(40)
const smoke = "Verify immutable build, recheck branch, publish and verify fixed URL"
function fixture(overrides = {}) {
  const calls = []
  const run = { id: 12, workflow_id: 306608447, path: ".github/workflows/release.yml", run_attempt: 1, head_sha: "b".repeat(40), head_branch: "main", status: "completed", conclusion: "success", repository: { id: 1154625390, full_name: repo }, head_repository: { id: 1154625390 } }
  const api = (endpoint, method = "GET") => {
    calls.push({ method, endpoint })
    if (overrides.api) { const result = overrides.api(endpoint, method, calls); if (result !== undefined) return result }
    if (method === "DELETE") return null
    if (endpoint === "") return { id: 1154625390, full_name: repo, default_branch: overrides.defaultBranch ?? "main" }
    if (endpoint.startsWith("/branches/")) return { commit: { sha: overrides.sha ?? sha } }
    if (endpoint.startsWith("/contents/.github/workflows?")) return overrides.notRetired ? [{ path: ".github/workflows/release.yml" }] : []
    if (endpoint === "/actions/workflows/312171039") return { id: 312171039, path: ".github/workflows/vault-validation.yml", name: "DevBook CI/CD" }
    if (/^\/actions\/workflows\/\d+$/.test(endpoint)) {
      const id = Number(endpoint.split("/").at(-1))
      return { id, path: retiredWorkflows[id], name: "retired" }
    }
    if (endpoint.startsWith("/actions/workflows/312171039/runs?")) return { total_count: 1, workflow_runs: [{ ...run, id: endpoint.includes("branch=stage") ? 101 : 102, workflow_id: 312171039, path: ".github/workflows/vault-validation.yml", head_sha: sha, head_branch: endpoint.includes("branch=stage") ? "stage" : "main" }] }
    if (endpoint.includes("/jobs?")) return { total_count: 1, jobs: [{ id: 5, name: "deploy", status: "completed", conclusion: overrides.replacementFail ? "failure" : "success", steps: [{ name: smoke, status: "completed", conclusion: "success" }] }] }
    if (endpoint.startsWith("/pulls?")) return overrides.pr ? [{ id: 99, head: { sha: run.head_sha } }] : []
    if (endpoint.startsWith("/actions/artifacts?")) return { total_count: overrides.artifact ? 1 : 0, artifacts: overrides.artifact ? [{ id: 20, name: "recovery", expired: false, workflow_run: { id: 12 } }] : [] }
    if (endpoint.startsWith("/actions/workflows/306608447/runs?")) return { total_count: 1, workflow_runs: [{ ...run, status: overrides.active ? "in_progress" : "completed" }] }
    if (/^\/actions\/workflows\/\d+\/runs\?/.test(endpoint)) return { total_count: 0, workflow_runs: [] }
    if (endpoint === "/actions/runs/12") return { ...run, ...overrides.liveRun }
    if (endpoint.startsWith("/actions/runs/12/artifacts?")) return { total_count: overrides.liveArtifact ? 1 : 0, artifacts: overrides.liveArtifact ? [{ id: 20, name: "new", expired: false, workflow_run: { id: 12 } }] : [] }
    throw new Error(`Unexpected endpoint ${endpoint}`)
  }
  return { api, calls, run }
}
const deletes = f => f.calls.filter(x => x.method === "DELETE")

test("dry-run produces frozen candidates without DELETE and import/CLI help has no side effects", () => {
  const f = fixture()
  const manifest = createManifest(f.api)
  assert.equal(manifest.candidates.length, 1)
  assert.equal(deletes(f).length, 0)
  const result = spawnSync(process.execPath, [".scripts/cleanup-retired-workflow-runs.mjs"], { encoding: "utf8" })
  assert.equal(result.status, 0)
  assert.match(result.stdout, /--manifest/)
})

test("apply requires an existing manifest; malformed entire manifest rejects before any API call", () => {
  const result = spawnSync(process.execPath, [".scripts/cleanup-retired-workflow-runs.mjs", "--apply", "--manifest", "/missing/cleanup.json"], { encoding: "utf8" })
  assert.notEqual(result.status, 0)
  const f = fixture()
  const baseline = createManifest(f.api)
  for (const mutate of [m => m.repository = "other/repo", m => m.extra = true, m => m.workflows[0].id = 312171039, m => m.workflows[0].path = "../release.yml", m => m.candidates[0].workflow_id = 401735063, m => m.candidates.push({ ...m.candidates[0], id: 13, workflow_id: 999 }), m => m.candidates[0].repository_id = 22, m => m.replacements.stage.job_id = "5", m => m.candidates[0].conclusion = null, m => m.generated_at = "bad", m => m.candidates[0].path = ".github/workflows/../release.yml"]) {
    const m = structuredClone(baseline); mutate(m); f.calls.length = 0
    assert.throws(() => applyManifest(m, f.api))
    assert.deepEqual(f.calls, [])
  }
})

test("retirement, repository and replacement failures cannot freeze executable plans", () => {
  for (const options of [{ notRetired: true }, { defaultBranch: "stage" }, { replacementFail: true }, { api(endpoint) { if (endpoint === "") return { id: 1154625390, full_name: "renamed/repo", default_branch: "main" } } }, { api(endpoint) { if (endpoint === "/actions/workflows/306608447") return { id: 306608447, path: ".github/workflows/unknown.yml" } } }]) {
    const f = fixture(options)
    assert.throws(() => createManifest(f.api))
    assert.equal(deletes(f).length, 0)
  }
})

test("active, open PR proof and artifact-bearing runs are retained", () => {
  for (const options of [{ active: true }, { pr: true }, { artifact: true }]) {
    const f = fixture(options)
    const m = createManifest(f.api)
    assert.equal(m.candidates.length, 0)
    assert.equal(m.retained.length, 1)
    assert.match(m.retained[0].reason, /active|PR|artifact/i)
    assert.equal(deletes(f).length, 0)
  }
})

test("apply fails closed on branch/run/PR/artifact drift before DELETE", () => {
  const m = createManifest(fixture().api)
  for (const options of [{ sha: "c".repeat(40) }, { pr: true }, { liveRun: { run_attempt: 2 } }, { liveRun: { workflow_id: 312171039 } }, { liveRun: { path: ".github/workflows/else.yml" } }, { liveRun: { head_sha: "d".repeat(40) } }, { liveRun: { status: "queued" } }, { liveRun: { repository: { id: 99 } } }, { liveArtifact: true }, { notRetired: true }, { replacementFail: true }]) {
    const f = fixture(options)
    assert.throws(() => applyManifest(m, f.api))
    assert.equal(deletes(f).length, 0)
  }
})

test("incomplete pagination and API failures fail closed", () => {
  for (const response of [{ total_count: 2, artifacts: [] }, new Error("API unavailable")]) {
    const f = fixture({ api(endpoint) { if (endpoint.startsWith("/actions/artifacts?")) { if (response instanceof Error) throw response; return response } } })
    assert.throws(() => createManifest(f.api))
    assert.equal(deletes(f).length, 0)
  }
})

test("apply deletes only exact allowed run and stops on first API failure with honest progress", () => {
  const m = createManifest(fixture().api)
  const f = fixture()
  assert.deepEqual(applyManifest(m, f.api), { deleted: [12] })
  assert.deepEqual(deletes(f), [{ method: "DELETE", endpoint: "/actions/runs/12" }])
  const failed = fixture({ api(endpoint, method) { if (method === "DELETE") throw new Error("rate limited") } })
  assert.throws(() => applyManifest(m, failed.api), error => error.message.includes("rate limited") && error.deleted.length === 0)
  assert.equal(deletes(failed).length, 1)
})

test("manifest bytes changed during execution are rejected before deletion", () => {
  const f = fixture(); const m = createManifest(f.api)
  assert.throws(() => applyManifest(m, f.api, () => { throw new Error("Manifest bytes changed") }), /bytes changed/)
  assert.equal(deletes(f).length, 0)
  assert.equal(validateManifest(m), m)
})


test("CLI dry-run uses gh GET only and retirement blocker writes no manifest", t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devbook-history-cli-"))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  const log = path.join(dir, "calls.jsonl"), output = path.join(dir, "manifest.json")
  fs.writeFileSync(path.join(dir, "gh"), `#!${process.execPath}
const fs = require("node:fs")
const args = process.argv.slice(2)
fs.appendFileSync(process.env.GH_LOG, JSON.stringify(args) + "\\n")
const endpoint = args.at(-1)
if (args[2] !== "GET") process.exit(99)
if (endpoint === "repos/${repo}") console.log(JSON.stringify({id:1154625390,full_name:"${repo}",default_branch:"main"}))
else if (endpoint.includes("/branches/")) console.log(JSON.stringify({commit:{sha:"${sha}"}}))
else if (endpoint.includes("/contents/")) console.log(JSON.stringify([{path:".github/workflows/release.yml"}]))
else process.exit(98)
`)
  fs.chmodSync(path.join(dir, "gh"), 0o755)
  const result = spawnSync(process.execPath, [".scripts/cleanup-retired-workflow-runs.mjs", "--manifest", output], { encoding: "utf8", env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, GH_LOG: log } })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /Retirement blocked/)
  assert.equal(fs.existsSync(output), false)
  const calls = fs.readFileSync(log, "utf8").trim().split("\n").map(JSON.parse)
  assert.equal(calls.length, 3)
  assert.ok(calls.every(args => args[2] === "GET"))
})

test("stable pagination gathers run IDs before deletion, without skipped pages", () => {
  let f
  f = fixture({ api(endpoint) {
    if (endpoint.startsWith("/actions/workflows/306608447/runs?")) {
      const page = new URLSearchParams(endpoint.split("?")[1]).get("page")
      return { total_count: 101, workflow_runs: page === "1" ? Array.from({ length: 100 }, (_, n) => ({ ...f.run, id: n + 1000 })) : [{ ...f.run, id: 2000 }] }
    }
  } })
  const m = createManifest(f.api)
  assert.equal(m.candidates.length, 101)
  assert.equal(new Set(m.candidates.map(run => run.id)).size, 101)
  assert.equal(deletes(f).length, 0)
  assert.deepEqual(f.calls.filter(call => call.endpoint.startsWith("/actions/workflows/306608447/runs?")).map(call => call.endpoint), ["/actions/workflows/306608447/runs?per_page=100&page=1", "/actions/workflows/306608447/runs?per_page=100&page=2"])
})

test("second deletion failure reports first deletion without retry or deleting later runs", () => {
  const base = fixture()
  const m = createManifest(base.api)
  m.candidates.push({ ...m.candidates[0], id: 13 }, { ...m.candidates[0], id: 14 })
  let f
  f = fixture({ api(endpoint, method) {
    if (endpoint === "/actions/runs/13" && method === "GET") return { ...f.run, id: 13 }
    if (endpoint.startsWith("/actions/runs/13/artifacts?")) return { total_count: 0, artifacts: [] }
    if (endpoint === "/actions/runs/13" && method === "DELETE") throw new Error("API unavailable")
  } })
  assert.throws(() => applyManifest(m, f.api), error => error.message === "API unavailable" && JSON.stringify(error.deleted) === "[12]")
  assert.deepEqual(deletes(f).map(call => call.endpoint), ["/actions/runs/12", "/actions/runs/13"])
  assert.equal(f.calls.some(call => call.endpoint.includes("/runs/14")), false)
})


test("new open PR after first deletion protects the next candidate and reports partial progress", () => {
  const m = createManifest(fixture().api)
  const secondSha = "c".repeat(40)
  m.candidates.push({ ...m.candidates[0], id: 13, head_sha: secondSha })
  let firstDeleted = false, f
  f = fixture({ api(endpoint, method) {
    if (endpoint === "/actions/runs/12" && method === "DELETE") { firstDeleted = true; return null }
    if (endpoint.startsWith("/pulls?") && firstDeleted) return [{ id: 100, head: { sha: secondSha } }]
    if (endpoint === "/actions/runs/13" && method === "GET") return { ...f.run, id: 13, head_sha: secondSha }
    if (endpoint.startsWith("/actions/runs/13/artifacts?")) return { total_count: 0, artifacts: [] }
  } })
  assert.throws(() => applyManifest(m, f.api), error => /open PR head/.test(error.message) && JSON.stringify(error.deleted) === "[12]")
  assert.deepEqual(deletes(f), [{ method: "DELETE", endpoint: "/actions/runs/12" }])
  const secondCheck = f.calls.findIndex(call => call.endpoint.startsWith("/actions/runs/13/artifacts?"))
  assert.ok(secondCheck > 0)
  assert.ok(f.calls[secondCheck + 1].endpoint.startsWith("/pulls?"))
})
