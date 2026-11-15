import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import test from "node:test"

const require = createRequire(import.meta.url)
const { parse } = require("../../Web/node_modules/yaml")
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const read = (name) => fs.readFileSync(path.join(root, name), "utf8")
const workflow = (name) => parse(read(`.github/workflows/${name}.yml`))

test("required pr-title aggregates an actual secret-free candidate export and Quartz build", () => {
  const title = workflow("vault-validation")
  const site = workflow("site-check")
  assert.equal(title.jobs.site.uses, "./.github/workflows/site-check.yml")
  assert.equal(title.jobs.site.with["source-sha"], "${{ github.event.pull_request.head.sha }}")
  assert.equal(title.jobs["pr-title"].needs, "site")
  assert.match(title.jobs["pr-title"].if, /always\(\).*github\.event_name == 'pull_request'/)
  assert.ok(title.jobs["pr-title"].steps[0].run.includes('test "$SITE_RESULT" = success'))
  const job = site.jobs["site-check"]
  assert.equal(job.environment, undefined)
  assert.equal(site.permissions.contents, "read")
  const commands = job.steps.map((step) => step.run ?? "").join("\n")
  assert.match(commands, /site export/)
  assert.match(commands, /site verify/)
  assert.ok(job.steps.some((step) => step.run?.includes("site verify") && step.run.includes("--extract")))
  assert.match(commands, /npm run build/)
  assert.doesNotMatch(JSON.stringify(site), /secrets\.|VERCEL_TOKEN|pull_request_target/)
})

test("ineligible CI events never publish a skipped required pr-title context", () => {
  const job = workflow("vault-validation").jobs["pr-title"]
  const name = new Function("github", `return ${job.name.slice(3, -2).trim()}`)
  const admitted = new Function("github", `return ${job.if.replace(/always\(\)/g, "true")}`)
  for (const [event, base, active] of [
    ["pull_request", "main", true],
    ["pull_request", "stage", true],
    ["pull_request", "feature/other", false],
    ["workflow_dispatch", undefined, false],
    ["push", undefined, false],
    ["issue_comment", undefined, false],
  ]) {
    const github = { event_name: event, event: base ? { pull_request: { base: { ref: base } } } : {} }
    assert.equal(name(github), active ? "pr-title" : "pr-title-inactive")
    assert.equal(admitted(github), active)
  }
})

test("readiness failure does not skip real source validation and documents stage protection", () => {
  const title = workflow("vault-validation")
  assert.match(title.jobs.site.if, /github\.event_name == 'pull_request'/)
  const gate = title.jobs["pr-title"].steps.find((step) => step.env?.READY)
  assert.match(gate.run, /READY.*true/)
  assert.match(gate.run, /Keep the migration PR draft/)
  assert.match(gate.run, /Trusted Sources OIDC access/)
  assert.match(gate.run, /required pr-title on stage/)
})

test("only accepted stage/main sources enter serialized protected deployment", () => {
  const deploy = workflow("site-deploy")
  assert.deepEqual(deploy.on.push.branches, ["stage", "main"])
  assert.equal(deploy.on.pull_request, undefined)
  assert.equal(deploy.concurrency["cancel-in-progress"], false)
  assert.equal(deploy.jobs.native.with["source-sha"], "${{ github.sha }}")
  assert.equal(deploy.jobs.native.with["build-site"], false)
  assert.equal(deploy.jobs.package.environment.deployment, false)
  assert.match(deploy.jobs.deploy.environment.url, /stage\.devbook\.zip/)
  assert.match(deploy.jobs.deploy.environment.url, /https:\/\/devbook\.zip/)
  for (const job of [deploy.jobs.package, deploy.jobs.deploy]) {
    for (const step of job.steps.filter((step) => step.uses?.startsWith("actions/download-artifact@"))) {
      assert.ok(step.with["artifact-ids"])
      assert.equal(step.with.name, undefined)
      assert.equal(step.with["digest-mismatch"], "error")
    }
  }
})

test("pulled environment secrets are cleared before any Vercel repository build", () => {
  const steps = workflow("site-deploy").jobs.package.steps
  const pull = steps.findIndex((step) => step.run?.includes("vercel pull"))
  const clean = steps.findIndex((step) => step.run?.includes("site-pipeline.mjs clean-env"))
  const build = steps.findIndex((step) => step.run?.includes("vercel build"))
  assert.ok(pull < clean && clean < build)
  assert.ok(steps[pull].env.VERCEL_TOKEN)
  assert.equal(steps[clean].env?.VERCEL_TOKEN, undefined)
  assert.equal(steps[build].env?.VERCEL_TOKEN, undefined)
  assert.ok(steps.some((step) => step.run?.includes("site verify") && step.run.includes("--extract")))
  const upload = steps.find((step) => step.id === "upload")
  assert.equal(upload.with.path, "${{ runner.temp }}/package/deployment.json")
})

test("only the deploy job requests masked OIDC and passes it solely to HTTP verification", () => {
  const deploy = workflow("site-deploy")
  assert.deepEqual(deploy.permissions, { contents: "read" })
  assert.equal(deploy.jobs.native.permissions, undefined)
  assert.equal(deploy.jobs.package.permissions, undefined)
  assert.deepEqual(deploy.jobs.deploy.permissions, { contents: "read", "id-token": "write" })
  const steps = deploy.jobs.deploy.steps
  const issueIndex = steps.findIndex((step) => step.id === "http-identity")
  const verifyIndex = steps.findIndex((step) => step.run?.includes("site-pipeline.mjs publish"))
  assert.equal(issueIndex, verifyIndex - 1)
  const issue = steps[issueIndex]
  assert.equal(issue.uses, "actions/github-script@3a2844b7e9c422d3c10d287c895573f7108da1b3")
  assert.match(issue.with.script, /core\.getIDToken\('https:\/\/github\.com\/grafanaKibana'\)/)
  assert.ok(issue.with.script.indexOf("core.setSecret(token)") < issue.with.script.indexOf("core.setOutput('token', token)"))
  assert.equal(steps[verifyIndex].env.VERCEL_DEPLOYMENT_OIDC_TOKEN, "${{ steps.http-identity.outputs.token }}")
  for (const [index, step] of steps.entries()) {
    if (index !== verifyIndex) assert.equal(step.env?.VERCEL_DEPLOYMENT_OIDC_TOKEN, undefined)
  }
  assert.doesNotMatch(JSON.stringify(deploy.jobs.package), /OIDC_TOKEN|id-token|getIDToken/)
  assert.doesNotMatch(JSON.stringify(deploy), /AUTOMATION_BYPASS|GITHUB_ENV/)
})

test("managed native artifacts transfer exact provenance without generated commits", () => {
  const improvement = workflow("devbook-improvement")
  const render = improvement.jobs.render
  const publish = improvement.jobs.publish
  const upload = render.steps.find((step) => step.id === "native-upload")
  assert.equal(upload.with.name, "devbook-syncer-export-${{ github.run_id }}-${{ github.run_attempt }}")
  assert.equal(upload.with.path, "artifacts/export/bundle.json")
  const register = publish.steps.find((step) => step.name === "Register native artifact or resume exact-source validation")
  for (const name of ["ARTIFACT_ID", "ARTIFACT_DIGEST", "BUNDLE_SHA256", "RUN_ID", "RUN_ATTEMPT"]) assert.ok(register.env[`DEVBOOK_EXPORT_${name}`])
  assert.equal(publish.environment.deployment, false)
})

test("old Git build and link patcher are removed while authored CSS remains", () => {
  assert.equal(JSON.parse(read("vercel.json")).git.deploymentEnabled, false)
  assert.equal(JSON.parse(read("vercel.json")).framework, null)
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/preview-deployment-link.yml")), false)
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/pr-title.yml")), false)
  assert.equal(workflow("release").on.deployment_status, undefined)
  assert.equal(workflow("release").jobs.update, undefined)
  assert.match(read("Web/quartz/styles/custom.scss"), /@use "\.\/syncer";/)
  const hook = read(".githooks/pre-commit")
  assert.match(hook, /PrepareCommit\.cs/)
  assert.doesNotMatch(hook, /SyncQuartz\.cs|site export|Web\/content/)
  assert.doesNotMatch(read(".scripts/setup.sh"), /--configure-only/)
})
