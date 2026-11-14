import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  createPackage, verifyPackage, extractPackage, removeBuildSecrets,
  verifyDeployment, publishDeployment, deploymentFromOutput, deploymentProject, assertConfiguredProject, sha256,
} from "../site-pipeline.mjs"

const source = "a".repeat(40)
const native = "b".repeat(64)
const identity = { repository: "grafanaKibana/devbook.zip", source, source_tree: "d".repeat(40), target: "preview", run: "123", attempt: "1", native }

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devbook-site-package-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    fs.writeFileSync(path.join(root, file), text)
  }
  write(".vercel/output/config.json", '{"version":3,"routes":[{"handle":"filesystem"}]}')
  write(".vercel/output/builds.json", '{"target":"preview","cliVersion":"65.16.0"}')
  write(".vercel/output/static/index.html", "<h1>Actual site</h1>")
  write("Web/quartz.lock.json", '{"plugins":{}}')
  return { root, write }
}

test("complete package roundtrip binds source, target and all output bytes", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  verifyPackage(bundle, identity)
  assert.ok(bundle.files["static/index.html"])
  assert.equal(bundle.manifest.quartz_lock_sha256, sha256(Buffer.from('{"plugins":{}}')))
  fs.rmSync(path.join(f.root, ".vercel/output"), { recursive: true })
  extractPackage(f.root, bundle, identity)
  assert.equal(fs.readFileSync(path.join(f.root, ".vercel/output/static/index.html"), "utf8"), "<h1>Actual site</h1>")
})

test("package requires an explicit Git tree instead of substituting the commit SHA", (t) => {
  const f = fixture(t)
  assert.throws(() => createPackage(f.root, { ...identity, source_tree: undefined }), /Git tree/)
  assert.throws(() => createPackage(f.root, { ...identity, source_tree: "invalid" }), /Git tree/)
})

test("package rejects stale source, target, extra files and corrupt bytes", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  assert.throws(() => verifyPackage(bundle, { ...identity, source: "c".repeat(40) }), /identity/)
  assert.throws(() => verifyPackage(bundle, { ...identity, target: "production" }), /identity/)
  const extra = structuredClone(bundle)
  extra.files["static/unlisted.html"] = Buffer.from("unlisted").toString("base64")
  assert.throws(() => verifyPackage(extra, identity), /inventory/)
  bundle.files["static/index.html"] = Buffer.from("changed").toString("base64")
  assert.throws(() => verifyPackage(bundle, identity), /digest|size/)
})

test("packaging rejects symlinks and unexpected function output", (t) => {
  const f = fixture(t)
  fs.symlinkSync("index.html", path.join(f.root, ".vercel/output/static/link.html"))
  assert.throws(() => createPackage(f.root, identity), /regular/)
  fs.unlinkSync(path.join(f.root, ".vercel/output/static/link.html"))
  f.write(".vercel/output/functions/api.func/index.js", "private function")
  assert.throws(() => createPackage(f.root, identity), /static|unexpected/)
})

test("Vercel CLI diagnostics and command arguments never enter the static package", (t) => {
  const f = fixture(t)
  f.write(".vercel/output/builds.json", '{"target":"preview","cliVersion":"65.16.0","argv":["private-command"]}')
  f.write(".vercel/output/diagnostics/project-manifest.json", '{"private":"configuration"}')
  const bundle = createPackage(f.root, { ...identity, token: "must-not-leak" })
  assert.deepEqual(Object.keys(bundle.files), ["config.json", "static/index.html"])
  assert.equal(bundle.manifest.token, undefined)
})

test("package requires the actual Vercel build target and pinned CLI version", (t) => {
  const f = fixture(t)
  f.write(".vercel/output/builds.json", '{"target":"production","cliVersion":"65.16.0"}')
  assert.throws(() => createPackage(f.root, identity), /target or CLI version/)
  f.write(".vercel/output/builds.json", '{"target":"preview","cliVersion":"65.17.0"}')
  assert.throws(() => createPackage(f.root, identity), /target or CLI version/)
})

test("structured Vercel CLI output supports non-interactive and explicit JSON shapes", () => {
  const deployment = { id: "dpl_one", url: "https://build.vercel.app", readyState: "READY" }
  assert.deepEqual(deploymentFromOutput(JSON.stringify({ status: "ok", deployment })), deployment)
  assert.deepEqual(deploymentFromOutput(JSON.stringify(deployment)), deployment)
  assert.throws(() => deploymentFromOutput(JSON.stringify({ status: "error", deployment })), /did not succeed/)
  assert.throws(() => deploymentFromOutput(JSON.stringify({ ...deployment, url: "https://other.example" })), /identity/)
})

test("artifact cannot extract traversal or case-colliding paths", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  bundle.files["../escape"] = ""
  bundle.manifest.files["../escape"] = { sha256: sha256(Buffer.alloc(0)), size: 0, mode: 420 }
  assert.throws(() => extractPackage(f.root, bundle, identity), /path/)
  delete bundle.files["../escape"]
  delete bundle.manifest.files["../escape"]
  bundle.files["static/INDEX.html"] = bundle.files["static/index.html"]
  bundle.manifest.files["static/INDEX.html"] = bundle.manifest.files["static/index.html"]
  assert.throws(() => verifyPackage(bundle, identity), /collision/)
})

test("pulled build secrets are removed without deleting project settings", (t) => {
  const f = fixture(t)
  f.write(".vercel/.env.preview.local", "TOKEN=private\n")
  f.write(".vercel/project.json", '{"projectId":"project"}')
  removeBuildSecrets(f.root, "preview")
  assert.equal(fs.readFileSync(path.join(f.root, ".vercel/.env.preview.local"), "utf8"), "")
  assert.equal(fs.readFileSync(path.join(f.root, ".vercel/project.json"), "utf8"), '{"projectId":"project"}')
})

test("deployment success requires project, SHA, alias and served build marker", async () => {
  const deployment = { id: "dpl_one", projectId: deploymentProject.project, readyState: "READY", target: null, meta: { devbookSourceSha: source } }
  const alias = { deploymentId: "dpl_one", projectId: deploymentProject.project }
  const fetch = async (url) => ({ ok: true, json: async () => url.includes("/deployments/") ? deployment : url.includes("/aliases/") ? alias : { source, native } })
  await verifyDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", fetch })
  alias.deploymentId = "dpl_other"
  await assert.rejects(verifyDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", fetch }), /alias/)
})

test("stale source never receives the environment alias", async () => {
  const calls = []
  const fetch = async (url, options) => {
    calls.push([url, options])
    return { ok: true, json: async () => ({ object: { sha: "c".repeat(40) } }) }
  }
  await assert.rejects(publishDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", githubToken: "read", fetch }), /stale/)
  assert.equal(calls.length, 1)
  assert.ok(calls[0][0].includes("api.github.com"))
})

test("a different Vercel project fails before any account request or mutation", async () => {
  assert.throws(() => assertConfiguredProject({ ...deploymentProject, project: "prj_other" }), /reviewed DevBook target/)
  let calls = 0
  await assert.rejects(publishDeployment({ ...identity, ...deploymentProject, project: "prj_other", token: "secret", fetch: async () => { calls++ } }), /reviewed DevBook target/)
  assert.equal(calls, 0)
})

test("an edit during immutable smoke verification stops alias assignment", async () => {
  let heads = 0
  const mutations = []
  const fetch = async (url, options) => {
    if (options.method) mutations.push(url)
    const value = url.includes("api.github.com") ? { object: { sha: ++heads === 1 ? source : "c".repeat(40) } }
      : url.includes("api.vercel.com") ? { id: "dpl_one", url: "build.vercel.app", projectId: deploymentProject.project, readyState: "READY", target: null, meta: { devbookSourceSha: source } }
        : { source, native }
    return { ok: true, json: async () => value }
  }
  await assert.rejects(publishDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", githubToken: "read", fetch }), /stale/)
  assert.equal(heads, 2)
  assert.deepEqual(mutations, [])
})

test("production promotion follows successful immutable smoke and last head check", async () => {
  const operations = []
  const fetch = async (url) => {
    operations.push(url)
    const value = url.includes("api.github.com") ? { object: { sha: source } }
      : url.includes("api.vercel.com") ? { id: "dpl_one", url: "build.vercel.app", projectId: deploymentProject.project, readyState: "READY", target: "production", meta: { devbookSourceSha: source } }
        : { source, native }
    return { ok: true, json: async () => value }
  }
  let promoted
  await publishDeployment({ ...identity, target: "production", project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", githubToken: "read", fetch,
    runCommand: (args) => { promoted = args; operations.push("promote") } })
  assert.deepEqual(promoted, ["promote", "dpl_one", "--yes"])
  assert.ok(operations[2].includes("build.vercel.app"))
  assert.ok(operations[3].includes("api.github.com"))
  assert.equal(operations[4], "promote")
})

test("a protected login page or wrong immutable source never changes the alias", async () => {
  const mutations = []
  const fetch = async (url, options) => {
    if (options.method) mutations.push(url)
    const value = url.includes("api.github.com") ? { object: { sha: source } }
      : url.includes("api.vercel.com") ? { id: "dpl_one", url: "build.vercel.app", projectId: deploymentProject.project, readyState: "READY", target: null, meta: { devbookSourceSha: source } }
        : { login: true }
    return { ok: true, json: async () => value }
  }
  await assert.rejects(publishDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", githubToken: "read", fetch }), /build identity/)
  assert.deepEqual(mutations, [])
})

test("multi-MiB binary assets retain strict canonical base64 validation without regex stack exhaustion", (t) => {
  const f = fixture(t)
  const bytes = Buffer.alloc(8 * 1024 * 1024, 0xff)
  f.write(".vercel/output/static/large.bin", bytes)
  const bundle = createPackage(f.root, identity)
  verifyPackage(bundle, identity)
  assert.deepEqual(Buffer.from(bundle.files["static/large.bin"], "base64"), bytes)
  for (const invalid of [bundle.files["static/large.bin"] + "\n", "!!!!", "AB==", "YQ", "YQ==="]) {
    const canonical = bundle.files["static/large.bin"]
    bundle.files["static/large.bin"] = invalid
    assert.throws(() => verifyPackage(bundle, identity), /encoding/)
    bundle.files["static/large.bin"] = canonical
  }
})
