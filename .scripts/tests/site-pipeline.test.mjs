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

function addOutput(bundle, name, text) {
  const bytes = Buffer.from(text)
  bundle.files[name] = bytes.toString("base64")
  bundle.manifest.files[name] = { sha256: sha256(bytes), size: bytes.length, mode: 0o644 }
}

test("artifact cannot extract traversal or NFC-equivalent paths", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  addOutput(bundle, "../escape", "")
  assert.throws(() => extractPackage(f.root, bundle, identity), /path/)
  delete bundle.files["../escape"]
  delete bundle.manifest.files["../escape"]
  addOutput(bundle, "static/café.html", "composed")
  addOutput(bundle, "static/cafe\u0301.html", "decomposed")
  assert.throws(() => verifyPackage(bundle, identity), /collision/)
  assert.equal(fs.readFileSync(path.join(f.root, ".vercel/output/static/index.html"), "utf8"), "<h1>Actual site</h1>")
})

test("package rejects NFC-equivalent parent directories even with different child filenames", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  addOutput(bundle, "static/café/article.html", "composed directory")
  addOutput(bundle, "static/cafe\u0301/alias.html", "decomposed directory")
  assert.throws(() => verifyPackage(bundle, identity), /collision/)
})

test("a file cannot also be a parent directory, and rejection preserves existing output", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  addOutput(bundle, "static/article", "file")
  addOutput(bundle, "static/article/child.html", "child")
  assert.throws(() => extractPackage(f.root, bundle, identity), /file conflicts with a directory/)
  assert.equal(fs.readFileSync(path.join(f.root, ".vercel/output/static/index.html"), "utf8"), "<h1>Actual site</h1>")
})

test("case-sensitive filesystems preserve the canonical article and uppercase redirect through packaging and extraction", (t) => {
  const f = fixture(t)
  f.write("case", "")
  try { fs.writeFileSync(path.join(f.root, "CASE"), "", { flag: "wx" }) } catch (error) {
    if (error.code !== "EEXIST") throw error
    t.skip("Actual filesystem cannot represent distinct case paths; Linux CI runs this roundtrip")
    return
  }
  f.write(".vercel/output/static/about.html", "<h1>Canonical article</h1>")
  f.write(".vercel/output/static/About.html", '<meta http-equiv="refresh" content="0; url=about.html">')
  f.write(".vercel/output/static/Topic/canonical.html", "canonical directory")
  f.write(".vercel/output/static/topic/redirect.html", "redirect directory")
  const bundle = createPackage(f.root, identity)
  for (const absent of [false, true]) {
    if (absent) fs.rmSync(path.join(f.root, ".vercel"), { recursive: true })
    extractPackage(f.root, bundle, identity)
    for (const [name, value] of Object.entries(bundle.files)) {
      assert.deepEqual(fs.readFileSync(path.join(f.root, ".vercel/output", name)), Buffer.from(value, "base64"))
    }
  }
})

test("case-insensitive destination rejects file or directory case aliases before changing existing output", (t) => {
  const f = fixture(t)
  const writeFileSync = fs.writeFileSync
  t.mock.method(fs, "writeFileSync", (file, ...args) => {
    if (path.basename(file) === "CASE" && path.basename(path.dirname(file)).startsWith(".devbook-case-")) {
      throw Object.assign(new Error("Simulated case-insensitive filesystem"), { code: "EEXIST" })
    }
    return writeFileSync(file, ...args)
  })
  for (const names of [["static/about.html", "static/About.html"], ["static/Topic/one.html", "static/topic/two.html"]]) {
    const bundle = createPackage(f.root, identity)
    for (const name of names) addOutput(bundle, name, name)
    verifyPackage(bundle, identity)
    assert.throws(() => extractPackage(f.root, bundle, identity), /case-sensitive destination filesystem/)
    assert.equal(fs.readFileSync(path.join(f.root, ".vercel/output/static/index.html"), "utf8"), "<h1>Actual site</h1>")
    assert.deepEqual(fs.readdirSync(path.join(f.root, ".vercel/output")).sort(), ["builds.json", "config.json", "static"])
  }
})

test("a failed filesystem probe cleans its owned files and retains existing output", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  addOutput(bundle, "static/INDEX.html", "alias")
  const writeFileSync = fs.writeFileSync
  t.mock.method(fs, "writeFileSync", (file, ...args) => {
    if (path.basename(file) === "CASE" && path.basename(path.dirname(file)).startsWith(".devbook-case-")) {
      throw Object.assign(new Error("Probe I/O failure"), { code: "EIO" })
    }
    return writeFileSync(file, ...args)
  })
  assert.throws(() => extractPackage(f.root, bundle, identity), /Probe I\/O failure/)
  assert.equal(fs.readFileSync(path.join(f.root, ".vercel/output/static/index.html"), "utf8"), "<h1>Actual site</h1>")
  assert.deepEqual(fs.readdirSync(path.join(f.root, ".vercel/output")).sort(), ["builds.json", "config.json", "static"])
})

test("extraction rejects symlink parents and output roots before probing or changing their targets", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  addOutput(bundle, "static/INDEX.html", "alias")
  const outside = path.join(f.root, "retained")
  fs.mkdirSync(outside)
  fs.writeFileSync(path.join(outside, "sentinel"), "unchanged")
  for (const name of [".vercel/output", ".vercel"]) {
    fs.rmSync(path.join(f.root, name), { recursive: true, force: true })
    fs.symlinkSync(outside, path.join(f.root, name))
    assert.throws(() => extractPackage(f.root, bundle, identity), /symlink/)
    assert.deepEqual(fs.readdirSync(outside), ["sentinel"])
    assert.equal(fs.readFileSync(path.join(outside, "sentinel"), "utf8"), "unchanged")
    fs.unlinkSync(path.join(f.root, name))
  }
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
  await verifyDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", oidcToken: "short-lived-http", fetch })
  alias.deploymentId = "dpl_other"
  await assert.rejects(verifyDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", oidcToken: "short-lived-http", fetch }), /alias/)
})

test("stale source never receives the environment alias", async () => {
  const calls = []
  const fetch = async (url, options) => {
    calls.push([url, options])
    return { ok: true, json: async () => ({ object: { sha: "c".repeat(40) } }) }
  }
  await assert.rejects(publishDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", oidcToken: "short-lived-http", githubToken: "read", fetch }), /stale/)
  assert.equal(calls.length, 1)
  assert.ok(calls[0][0].includes("api.github.com"))
})

test("a different Vercel project fails before any account request or mutation", async () => {
  assert.throws(() => assertConfiguredProject({ ...deploymentProject, project: "prj_other" }), /reviewed DevBook target/)
  let calls = 0
  await assert.rejects(publishDeployment({ ...identity, ...deploymentProject, project: "prj_other", token: "secret", oidcToken: "short-lived-http", fetch: async () => { calls++ } }), /reviewed DevBook target/)
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
  await assert.rejects(publishDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", oidcToken: "short-lived-http", githubToken: "read", fetch }), /stale/)
  assert.equal(heads, 2)
  assert.deepEqual(mutations, [])
})

function productionFixture(promotions) {
  const calls = []
  const alias = { deploymentId: "dpl_one", projectId: deploymentProject.project }
  const marker = { source, native }
  const project = { id: deploymentProject.project, accountId: deploymentProject.org }
  const fetch = async (url, request) => {
    calls.push({ url: new URL(url), request })
    if (url.includes("/promote/")) return { ok: true, status: 202, text: async () => "" }
    const value = url.includes("api.github.com") ? { object: { sha: source } }
      : url.includes("/v9/projects/") ? { ...project, lastAliasRequest: promotions.length > 1 ? promotions.shift() : promotions[0] }
        : url.includes("/v4/aliases/") ? alias
          : url.includes("api.vercel.com") ? { id: "dpl_one", url: "build.vercel.app", projectId: deploymentProject.project, readyState: "READY", target: "production", meta: { devbookSourceSha: source } }
            : marker
    return { ok: true, json: async () => value }
  }
  return { calls, alias, marker, project, options: { ...identity, target: "production", ...deploymentProject, deployment: "dpl_one", token: "secret", oidcToken: "short-lived-http", githubToken: "read", fetch } }
}

const promotion = (jobStatus, toDeploymentId = "dpl_one", type = "promote") => ({ jobStatus, toDeploymentId, type })

test("production promotion uses the scoped API after immutable smoke and the last head check", async () => {
  const f = productionFixture([promotion("succeeded")])
  await publishDeployment(f.options)
  assert.equal(f.calls[2].url.hostname, "build.vercel.app")
  assert.equal(f.calls[3].url.hostname, "api.github.com")
  const mutate = f.calls[4]
  assert.equal(mutate.url.pathname, `/v10/projects/${deploymentProject.project}/promote/dpl_one`)
  assert.equal(mutate.url.searchParams.get("teamId"), deploymentProject.org)
  assert.equal(mutate.request.method, "POST")
  assert.equal(mutate.request.body, "{}")
  assert.equal(mutate.request.headers["content-type"], "application/json")
  const poll = f.calls[5].url
  assert.equal(poll.pathname, `/v9/projects/${deploymentProject.project}`)
  assert.equal(poll.searchParams.get("teamId"), deploymentProject.org)
  assert.equal(poll.searchParams.get("rollbackInfo"), "true")
})

test("production waits for its matching promotion instead of accepting queued or unrelated jobs", async () => {
  const f = productionFixture([null, promotion("succeeded", "dpl_other"), promotion("pending"), promotion("in-progress"), promotion("succeeded")])
  await publishDeployment(f.options)
  assert.equal(f.calls.filter(({ url }) => url.pathname.includes("/v9/projects/")).length, 5)
  assert.equal(f.calls.filter(({ request }) => request.method === "POST").length, 1)
})

test("failed, unknown and cross-project promotion status fail closed", async () => {
  for (const status of ["failed", "unknown", undefined]) {
    const f = productionFixture([promotion(status)])
    await assert.rejects(publishDeployment(f.options), /promotion failed|promotion status/)
  }
  for (const field of ["id", "accountId"]) {
    const f = productionFixture([promotion("succeeded")])
    f.project[field] = "other"
    await assert.rejects(publishDeployment(f.options), /project or organization mismatch/)
  }
})

test("missing or unrelated promotion status cannot outlive the bounded deadline", async (t) => {
  let now = 0
  t.mock.method(Date, "now", () => now)
  for (const status of [null, promotion("succeeded", "dpl_other"), promotion("succeeded", "dpl_one", "rollback")]) {
    now = 0
    const f = productionFixture([status])
    const fetch = async (url, request) => {
      const response = await f.options.fetch(url, request)
      if (url.includes("/v9/projects/")) now = 180000
      return response
    }
    await assert.rejects(publishDeployment({ ...f.options, fetch }), /promotion timed out/)
    assert.equal(f.calls.filter(({ url }) => url.pathname.includes("/v9/projects/")).length, 1)
  }
})

test("a repointed alias may serve the previous build briefly, but not past the bound", async (t) => {
  let now = 0
  t.mock.method(Date, "now", () => now)
  const stale = { source: "c".repeat(40), native }
  const served = (markers, onMarker = () => {}) => {
    const f = productionFixture([promotion("skipped")])
    let fetches = 0
    const fetch = async (url, request) => {
      const response = await f.options.fetch(url, request)
      if (new URL(url).hostname !== "devbook.zip") return response
      onMarker(++fetches)
      return { ok: true, json: async () => markers[Math.min(fetches, markers.length) - 1] }
    }
    return { options: { ...f.options, fetch, markerRetryMs: 0 }, count: () => fetches }
  }

  const settling = served([stale, stale, { source, native }])
  await publishDeployment(settling.options)
  assert.equal(settling.count(), 3)

  const stuck = served([stale], (fetches) => { if (fetches === 2) now = 60000 })
  await assert.rejects(publishDeployment(stuck.options), /build identity mismatch/)
  assert.equal(stuck.count(), 2)
})

test("skipped promotion requires the intended alias and fixed OIDC marker", async (t) => {
  let now = 0
  t.mock.method(Date, "now", () => now)
  const f = productionFixture([promotion("skipped")])
  await publishDeployment(f.options)
  assert.ok(f.calls.some(({ url, request }) => url.hostname === "devbook.zip" && request.headers["x-vercel-trusted-oidc-idp-token"] === "short-lived-http"))
  f.alias.deploymentId = "dpl_other"
  await assert.rejects(publishDeployment(f.options), /alias/)
  f.alias.deploymentId = "dpl_one"
  f.marker.source = "c".repeat(40)
  now = 60000
  await assert.rejects(publishDeployment(f.options), /build identity mismatch/)
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
  await assert.rejects(publishDeployment({ ...identity, project: deploymentProject.project, org: deploymentProject.org, deployment: "dpl_one", token: "secret", oidcToken: "short-lived-http", githubToken: "read", fetch }), /build identity/)
  assert.deepEqual(mutations, [])
})

test("short-lived OIDC reaches only protected site requests, while API credentials stay separate", async () => {
  for (const target of ["preview", "production"]) {
    const calls = []
    const fetch = async (url, options) => {
      calls.push({ url: new URL(url), options })
      if (url.includes("/promote/")) return { ok: true, status: 201, text: async () => "" }
      const value = url.includes("/v9/projects/") ? { id: deploymentProject.project, accountId: deploymentProject.org, lastAliasRequest: promotion("succeeded") }
        : url.includes("api.github.com") ? { object: { sha: source } }
        : url.includes("/v4/aliases/") ? { deploymentId: "dpl_one", projectId: deploymentProject.project }
          : url.includes("api.vercel.com") ? { id: "dpl_one", url: "build.vercel.app", projectId: deploymentProject.project, readyState: "READY", target: target === "production" ? "production" : null, meta: { devbookSourceSha: source } }
            : { source, native }
      return { ok: true, json: async () => value }
    }
    const options = { ...identity, target, ...deploymentProject, deployment: "dpl_one", token: "api-only", githubToken: "github-only", oidcToken: "short-lived-http", fetch }
    await publishDeployment(options)
    await verifyDeployment(options)
    const siteHosts = ["build.vercel.app", target === "production" ? "devbook.zip" : "stage.devbook.zip"]
    assert.deepEqual(calls.filter(({ url }) => siteHosts.includes(url.hostname)).map(({ url }) => url.hostname), siteHosts)
    for (const { url, options: request } of calls) {
      if (siteHosts.includes(url.hostname)) {
        assert.equal(request.headers["x-vercel-trusted-oidc-idp-token"], "short-lived-http")
        assert.equal(request.headers.authorization, undefined)
        assert.equal(request.headers["x-vercel-protection-bypass"], undefined)
        assert.equal(request.redirect, "error")
      } else {
        assert.ok(["api.github.com", "api.vercel.com"].includes(url.hostname))
        assert.equal(request.headers.authorization, url.hostname === "api.github.com" ? "Bearer github-only" : "Bearer api-only")
        assert.equal(request.headers["x-vercel-trusted-oidc-idp-token"], undefined)
      }
    }
  }
})

test("missing or rejected OIDC never assigns an alias or promotes Production", async () => {
  for (const target of ["preview", "production"]) {
    for (const oidcToken of [undefined, "", " ", "rejected-http-token"]) {
      const mutations = []
      const fetch = async (url, options) => {
        if (options.method) mutations.push(url)
        if (url.includes("build.vercel.app")) return { ok: false, status: 401 }
        const value = url.includes("api.github.com") ? { object: { sha: source } }
          : { id: "dpl_one", url: "build.vercel.app", projectId: deploymentProject.project, readyState: "READY", target: target === "production" ? "production" : null, meta: { devbookSourceSha: source } }
        return { ok: true, json: async () => value }
      }
      await assert.rejects(publishDeployment({ ...identity, target, ...deploymentProject, deployment: "dpl_one", token: "api-only", githubToken: "github-only", oidcToken, fetch }), /OIDC token|verification request failed \(401\)/)
      assert.deepEqual(mutations, [])
    }
  }
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

test("package enforces 256 MiB aggregate and 25 MiB file bounds before decoding payloads", (t) => {
  const f = fixture(t)
  const bundle = createPackage(f.root, identity)
  for (let i = 0; i < 11; i++) {
    const name = `static/large-${i}.bin`
    bundle.files[name] = "AA=="
    bundle.manifest.files[name] = { sha256: sha256(Buffer.from([0])), size: 25 * 1024 * 1024, mode: 420 }
  }
  assert.throws(() => verifyPackage(bundle, identity), /aggregate size bound/)
  const single = createPackage(f.root, identity)
  single.manifest.files["static/index.html"].size = 25 * 1024 * 1024 + 1
  assert.throws(() => verifyPackage(single, identity), /file exceeds its size bound/)
})
