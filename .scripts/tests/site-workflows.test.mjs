import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import test from "node:test"
import os from "node:os"
import { spawnSync } from "node:child_process"

const require = createRequire(import.meta.url)
const { parse } = require("../../Web/node_modules/yaml")
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const read = (name) => fs.readFileSync(path.join(root, name), "utf8")
const workflow = (name) => parse(read(`.github/workflows/${name}.yml`))

test("required ci aggregates an actual secret-free candidate export and Quartz build", () => {
  const ci = workflow("vault-validation")
  const site = workflow("site-check")
  assert.equal(ci.jobs.site.uses, "./.github/workflows/site-check.yml")
  assert.equal(ci.jobs.site.with["source-sha"], "${{ github.event.pull_request.head.sha }}")
  assert.deepEqual(ci.jobs.ci.needs, ["site", "validate", "demo", "fixture"])
  assert.match(ci.jobs.ci.if, /always\(\).*github\.event_name == 'pull_request'/)
  assert.ok(ci.jobs.ci.steps[0].run.includes('test "$SITE_RESULT" = success'))
  assert.equal(ci.jobs["pr-title"], undefined)
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

test("ineligible events never publish a skipped required pr-title or ci context", () => {
  for (const [file, check] of [["pr-rules", "pr-title"], ["vault-validation", "ci"]]) {
    const job = workflow(file).jobs[check]
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
      assert.equal(name(github), active ? check : `${check}-inactive`, `${file}/${event}/${base}`)
      assert.equal(admitted(github), active, `${file}/${event}/${base}`)
    }
  }
})

test("pr-title checks only the title, and title edits or comments never start heavy checks", () => {
  const rules = workflow("pr-rules")
  const ci = workflow("vault-validation")
  assert.deepEqual(rules.on.pull_request.types, ["opened", "edited", "synchronize", "reopened"])
  assert.deepEqual(rules.on.issue_comment.types, ["created"])
  assert.deepEqual(ci.on.pull_request.types, ["opened", "synchronize", "reopened"])
  assert.equal(ci.on.issue_comment, undefined)
  for (const name of ["gate", "command"]) {
    assert.ok(rules.jobs[name], name)
    assert.equal(ci.jobs[name], undefined, name)
  }
  const title = rules.jobs["pr-title"]
  assert.equal(title.needs, undefined)
  assert.equal(title.steps.length, 1)
  const run = (TITLE) => spawnSync("bash", ["-c", title.steps[0].run], { env: { ...process.env, TITLE }, encoding: "utf8" }).status
  for (const good of ["feature: add x", "notes: y", "fix: z", "maintenance!: breaking"]) assert.equal(run(good), 0, good)
  for (const bad of ["Add x", "feat: x", "feature:x", "feature(scope): x"]) assert.notEqual(run(bad), 0, bad)
  assert.doesNotMatch(JSON.stringify(rules), /secrets\.VERCEL|id-token|site-check/)
})

test("deployment readiness gates deploys, not PR checks", () => {
  const ci = workflow("vault-validation")
  assert.match(ci.jobs.site.if, /github\.event_name == 'pull_request'/)
  assert.equal(ci.jobs.ci.steps.find((step) => step.env?.READY), undefined)
  const gate = ci.jobs.package.steps.find((step) => step.env?.READY)
  assert.match(gate.run, /test "\$READY" = true/)
})

test("only accepted stage/main sources enter serialized protected deployment", () => {
  const deploy = workflow("vault-validation")
  assert.deepEqual(deploy.on.push.branches, ["stage", "main"])
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
  const steps = workflow("vault-validation").jobs.package.steps
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
  const deploy = workflow("vault-validation")
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

test("improvement PRs reuse their CI export instead of rendering again", () => {
  const improvement = workflow("devbook-improvement")
  const site = workflow("site-check").jobs["site-check"]
  const publish = improvement.jobs.publish
  assert.equal(improvement.jobs.render, undefined)
  assert.doesNotMatch(read(".github/workflows/devbook-improvement.yml"), /macos|export render|\.github\/actions\/obsidian/)
  assert.deepEqual(improvement.on.workflow_dispatch.inputs.mode.options, ["demo", "dry-run", "apply"])
  assert.equal(site.steps.find((step) => step.id === "upload").with.name, "devbook-native-${{ github.run_id }}-${{ github.run_attempt }}")
  assert.equal(publish.needs, "maintenance")
  assert.deepEqual(publish.permissions, { contents: "read", actions: "read" })
  const collect = publish.steps.find((step) => step.id === "collect")
  assert.match(collect.run, /export collect/)
  const download = publish.steps.find((step) => step.with?.["run-id"])
  assert.equal(download.with["run-id"], "${{ steps.collect.outputs.run-id }}")
  assert.equal(download.with["artifact-ids"], "${{ steps.collect.outputs.artifact-id }}")
  assert.equal(download.with["digest-mismatch"], "error")
  const register = publish.steps.find((step) => step.name === "Register native artifact or resume exact-source validation")
  for (const [name, output] of [["ARTIFACT_ID", "artifact-id"], ["ARTIFACT_DIGEST", "artifact-digest"], ["RUN_ID", "run-id"], ["RUN_ATTEMPT", "run-attempt"]]) {
    assert.equal(register.env[`DEVBOOK_EXPORT_${name}`], `\${{ steps.collect.outputs.${output} }}`)
  }
  assert.equal(register.env.DEVBOOK_EXPORT_BUNDLE_SHA256, "${{ steps.bundle-digest.outputs.sha256 }}")
  assert.equal(publish.environment.deployment, false)
})

test("old Git build and link patcher are removed while authored CSS remains", () => {
  assert.equal(JSON.parse(read("vercel.json")).git.deploymentEnabled, false)
  assert.equal(JSON.parse(read("vercel.json")).framework, null)
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/preview-deployment-link.yml")), false)
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/pr-title.yml")), false)
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/release.yml")), false)
  assert.equal(fs.existsSync(path.join(root, ".github/workflows/site-deploy.yml")), false)
  assert.match(read("Web/quartz/styles/custom.scss"), /@use "\.\/syncer";/)
  const hook = read(".githooks/pre-commit")
  assert.match(hook, /PrepareCommit\.cs/)
  assert.doesNotMatch(hook, /SyncQuartz\.cs|site export|Web\/content/)
  assert.doesNotMatch(read(".scripts/setup.sh"), /--configure-only/)
})

const evaluate = (expression, context) => {
  const source = expression.replace(/^\$\{\{|\}\}$/g, "").replace(/always\(\)/g, "true").trim()
  return new Function(...Object.keys(context), `return (${source})`)(...Object.values(context))
}
const event = (event_name, ref = "refs/heads/stage", mode) => ({
  event_name, ref, ref_name: ref.replace("refs/heads/", ""), run_id: 17, run_attempt: 2,
  event: event_name === "pull_request" ? { action: "edited", pull_request: { base: { ref: "stage" } } } : {},
})

test("unified delivery admits only protected pushes and explicit deploy dispatches", () => {
  const ci = workflow("vault-validation")
  assert.equal(ci.name, "CI/CD")
  assert.deepEqual(ci.on.workflow_dispatch.inputs.mode.options, ["validate", "deploy"])
  assert.equal(ci.on.workflow_dispatch.inputs.mode.default, "validate")
  assert.deepEqual(Object.keys(workflow("site-check").on), ["workflow_call"])
  assert.deepEqual(ci.jobs.native.needs, ["validate"])
  assert.deepEqual(ci.jobs.package.needs, "native")
  assert.deepEqual(ci.jobs.deploy.needs, ["native", "package"])
  assert.deepEqual(ci.jobs.release.needs, ["deploy"])
  assert.deepEqual(ci.jobs.release.permissions, { contents: "write" })
  assert.deepEqual(ci.jobs.release.concurrency, { group: "release", "cancel-in-progress": false })
  for (const ref of ["refs/heads/stage", "refs/heads/main", "refs/heads/feature/test"]) {
    for (const kind of ["push", "pull_request", "issue_comment", "workflow_dispatch"]) {
      for (const mode of [undefined, "validate", "deploy"]) {
        const github = event(kind, ref)
        const context = { github, inputs: { mode }, needs: { validate: { result: "success" }, deploy: { result: "success" } }, format: (pattern, ...values) => pattern.replace(/\{(\d+)\}/g, (_, i) => values[i]) }
        const eligible = ref !== "refs/heads/feature/test" && (kind === "push" || (kind === "workflow_dispatch" && mode === "deploy"))
        assert.equal(Boolean(evaluate(ci.jobs.native.if, context)), eligible, `${kind}/${ref}/${mode}`)
        assert.equal(evaluate(ci.concurrency.group, context), eligible ? `site-deploy-${ref}` : "ci-17-2")
        assert.equal(Boolean(evaluate(ci.jobs.release.if, context)), kind === "push" && ref === "refs/heads/main")
        for (const result of ["failure", "cancelled", "skipped"]) {
          context.needs.validate.result = result
          assert.equal(Boolean(evaluate(ci.jobs.native.if, context)), false)
          context.needs.deploy.result = result
          assert.equal(Boolean(evaluate(ci.jobs.release.if, context)), false)
        }
      }
    }
  }
})

test("all PR actions validate and aggregate rejects every unsuccessful prerequisite", () => {
  const ci = workflow("vault-validation")
  for (const action of ci.on.pull_request.types) {
    const github = event("pull_request")
    github.event.action = action
    assert.equal(evaluate(ci.jobs.validate.if, { github }), true, action)
  }
  const step = ci.jobs.ci.steps[0]
  for (const relevant of ["true", "false"]) {
    const good = { SITE_RESULT: "success", VALIDATE_RESULT: "success", RELEVANT: relevant, DEMO_RESULT: relevant === "true" ? "success" : "skipped", FIXTURE_RESULT: relevant === "true" ? "success" : "skipped" }
    const run = (env) => spawnSync("bash", ["-c", step.run], { env: { ...process.env, ...env }, encoding: "utf8" }).status
    assert.equal(run(good), 0)
    for (const key of ["SITE_RESULT", "VALIDATE_RESULT", "DEMO_RESULT", "FIXTURE_RESULT"]) {
      for (const result of ["failure", "cancelled", "skipped"]) {
        if (relevant === "false" && ["DEMO_RESULT", "FIXTURE_RESULT"].includes(key) && result === "skipped") continue
        assert.notEqual(run({ ...good, [key]: result }), 0, `${key}/${result}/${relevant}`)
      }
    }
    assert.notEqual(run({ ...good, RELEVANT: "" }), 0)
  }
})

test("pure software coverage has one CI owner while candidate source validation remains", () => {
  const ci = workflow("vault-validation")
  const improvement = workflow("devbook-improvement")
  assert.equal(improvement.on.pull_request, undefined)
  const commands = ci.jobs.validate.steps.map((step) => step.run ?? "").join("\n")
  assert.equal((commands.match(/dotnet test DevBook.Tooling.slnx/g) ?? []).length, 1)
  assert.match(commands, /custom\/transformers\/publishing.test.ts/)
  assert.match(commands, /ValidateVault\.cs -- --all/)
  assert.match(commands, /qard-learn-sync\/check\.cjs/)
  assert.doesNotMatch(read(".githooks/pre-commit"), /ValidateVault\.cs|qard-learn-sync\/check\.cjs/)
  const install = ci.jobs.validate.steps.findIndex((step) => step.run?.includes("npx quartz plugin install"))
  const publishing = ci.jobs.validate.steps.findIndex((step) => step.run?.includes("publishing.test.ts"))
  assert.ok(install >= 0 && install < publishing)
  assert.match(ci.jobs.validate.steps[install].run, /git diff --exit-code -- quartz.lock.json/)
  assert.doesNotMatch(ci.jobs.validate.steps[install].run, /--latest/)
  assert.doesNotMatch(JSON.stringify(improvement.jobs.demo), /dotnet test/)
  const validators = JSON.parse(read(".github/devbook-improvement.json")).validator_commands
  assert.equal(validators.length, 1)
  assert.ok(validators[0].includes("DevBook.Tooling/Scripts/ValidateVault.cs"))
  assert.match(JSON.stringify(ci.jobs.demo), /--demo/)
  assert.match(JSON.stringify(ci.jobs.fixture), /export fixture/)
  assert.doesNotMatch(JSON.stringify(ci.jobs.demo) + JSON.stringify(ci.jobs.fixture), /secrets\./)
})

test("moved PR demo and fixture keep exact path relevance and fail closed on diff errors", () => {
  const ci = workflow("vault-validation")
  const detector = ci.jobs.validate.steps.find((step) => step.id === "paths")
  assert.equal(detector.if, "github.event_name == 'pull_request'")
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "devbook-workflow-paths-"))
  try {
    const bin = path.join(temp, "git")
    fs.writeFileSync(bin, '#!/bin/sh\n[ "$FAIL_GIT" != true ] || exit 9\nif [ "$1" = diff ]; then printf \'%s\\0\' "$CHANGED_PATH"; fi\n', { mode: 0o755 })
    for (const [changed, relevant] of [
      [".github/workflows/devbook-improvement.yml", true],
      [".github/workflows/devbook-improvement-feedback.yml", true],
      [".github/devbook-improvement.json", true],
      [".scripts/DevBook.Tooling/Program.cs", true],
      [".scripts/DevBook.Tooling.Tests/RuntimeTests.cs", true],
      [".scripts/DevBook.Tooling.slnx", true],
      [".scripts/global.json", true],
      [".scripts/nested/tool.slnx", false],
      [".scripts/DevBook.Tooling.Other/file.cs", false],
      ["Vault/Home/A note with 'quotes'.md", false],
      [".github/workflows/vault-validation.yml", false],
    ]) {
      const output = path.join(temp, "output")
      fs.writeFileSync(output, "")
      const result = spawnSync("bash", ["-c", detector.run], {
        env: { ...process.env, PATH: `${temp}:${process.env.PATH}`, RUNNER_TEMP: temp, GITHUB_OUTPUT: output, BASE_SHA: "base", HEAD_SHA: "head", CHANGED_PATH: changed }, encoding: "utf8",
      })
      assert.equal(result.status, 0, result.stderr)
      assert.equal(fs.readFileSync(output, "utf8"), `relevant=${relevant}\n`)
      for (const name of ["demo", "fixture"]) {
        const condition = ci.jobs[name].if.replace(/\.improvement-relevant/g, '["improvement-relevant"]')
        for (const kind of ["pull_request", "push", "workflow_dispatch", "issue_comment"]) {
          assert.equal(Boolean(evaluate(condition, { github: event(kind), needs: { validate: { outputs: { "improvement-relevant": String(relevant) } } } })), kind === "pull_request" && relevant)
        }
      }
    }
    const output = path.join(temp, "failed-output")
    const failed = spawnSync("bash", ["-c", detector.run], { env: { ...process.env, PATH: `${temp}:${process.env.PATH}`, RUNNER_TEMP: temp, GITHUB_OUTPUT: output, FAIL_GIT: "true", BASE_SHA: "base", HEAD_SHA: "head" } })
    assert.notEqual(failed.status, 0)
    assert.equal(fs.existsSync(output), false)
  } finally {
    fs.rmSync(temp, { recursive: true, force: true })
  }
})
