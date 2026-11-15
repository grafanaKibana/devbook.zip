#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"

const repository = "grafanaKibana/devbook.zip"
const repositoryId = 1154625390
const ci = 312171039
const ciPath = ".github/workflows/vault-validation.yml"
const smoke = "Verify immutable build, recheck branch, publish and verify fixed URL"
export const retiredWorkflows = Object.freeze({
  306608447: ".github/workflows/release.yml",
  419374696: ".github/workflows/site-deploy.yml",
  306607788: ".github/workflows/pr-title.yml",
  308100887: ".github/workflows/major-approval.yml",
  417686872: ".github/workflows/preview-deployment-link.yml",
})
const workflows = Object.entries(retiredWorkflows).map(([id, path]) => ({ id: Number(id), path }))
const fail = message => { throw new Error(message) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const id = value => Number.isSafeInteger(value) && value > 0
const sha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value)
const keys = (value, names) => value && typeof value === "object" && !Array.isArray(value) && same(Object.keys(value).sort(), names.split(" ").sort())

function pages(api, endpoint, field) {
  const all = [], seen = new Set()
  let total
  for (let page = 1; ; page++) {
    const payload = api(`${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=100&page=${page}`)
    const items = field ? payload?.[field] : payload
    if (!Array.isArray(items)) fail(`Incomplete API inventory: ${endpoint}`)
    if (field) {
      if (!Number.isSafeInteger(payload.total_count) || payload.total_count < 0 || (total !== undefined && total !== payload.total_count)) fail(`Changed API inventory: ${endpoint}`)
      total = payload.total_count
    }
    for (const item of items) {
      if (!id(item.id) || seen.has(item.id)) fail(`Duplicate/invalid API identity: ${endpoint}`)
      seen.add(item.id); all.push(item)
    }
    if (items.length < 100) {
      if (total !== undefined && all.length !== total) fail(`Incomplete pagination: ${endpoint}`)
      return all
    }
  }
}
function runIdentity(run) {
  return { id: run.id, workflow_id: run.workflow_id, path: run.path, run_attempt: run.run_attempt,
    head_sha: run.head_sha, head_branch: run.head_branch, status: run.status, conclusion: run.conclusion,
    repository_id: run.repository?.id, head_repository_id: run.head_repository?.id }
}
function validRun(run, replacement = false) {
  return keys(run, "id workflow_id path run_attempt head_sha head_branch status conclusion repository_id head_repository_id")
    && id(run.id) && id(run.run_attempt) && sha(run.head_sha) && typeof run.head_branch === "string"
    && ["queued", "in_progress", "completed", "waiting", "pending", "requested"].includes(run.status)
    && (run.conclusion === null || ["success", "failure", "neutral", "cancelled", "skipped", "timed_out", "action_required", "stale", "startup_failure"].includes(run.conclusion))
    && run.repository_id === repositoryId && id(run.head_repository_id)
    && (replacement ? run.workflow_id === ci && run.path === ciPath : retiredWorkflows[run.workflow_id] === run.path)
}
function artifacts(items) {
  return items.map(item => {
    const artifact = { id: item.id, name: item.name, expired: item.expired, run_id: item.workflow_run?.id }
    if (!validArtifact(artifact)) fail("Unknown artifact producer/identity")
    return artifact
  })
}
function validArtifact(item) {
  return keys(item, "id name expired run_id") && id(item.id) && typeof item.name === "string" && typeof item.expired === "boolean" && id(item.run_id)
}
function openHeads(api) {
  return pages(api, "/pulls?state=open").map(pr => {
    if (!sha(pr.head?.sha)) fail("Unknown open PR head")
    return pr.head.sha
  })
}
function preflight(api) {
  const repo = api("")
  if (repo.id !== repositoryId || repo.full_name !== repository || repo.default_branch !== "main") fail("Repository/default branch identity changed")
  const branches = {}, replacements = {}
  for (const branch of ["stage", "main"]) {
    branches[branch] = api(`/branches/${branch}`).commit?.sha
    if (!sha(branches[branch])) fail("Missing branch SHA")
    const files = api(`/contents/.github/workflows?ref=${branch}`)
    if (!Array.isArray(files) || files.some(file => Object.values(retiredWorkflows).includes(file.path))) fail(`Retirement blocked: legacy workflow still present on ${branch}`)
  }
  for (const workflow of workflows) {
    const live = api(`/actions/workflows/${workflow.id}`)
    if (live.id !== workflow.id || live.path !== workflow.path) fail("Retired workflow identity changed")
  }
  const liveCi = api(`/actions/workflows/${ci}`)
  if (liveCi.id !== ci || liveCi.path !== ciPath || liveCi.name !== "DevBook CI/CD") fail("Replacement CI identity is not verified")
  for (const branch of ["stage", "main"]) {
    const runs = pages(api, `/actions/workflows/${ci}/runs?branch=${branch}&head_sha=${branches[branch]}&status=success`, "workflow_runs")
    for (const run of runs) {
      const identity = runIdentity(run)
      if (!validRun(identity, true) || identity.head_repository_id !== repositoryId || identity.head_branch !== branch || identity.head_sha !== branches[branch] || identity.status !== "completed" || identity.conclusion !== "success") fail("Replacement run identity changed")
      const jobs = pages(api, `/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?filter=latest`, "jobs")
      const deploy = jobs.find(job => job.name === "deploy" && job.status === "completed" && job.conclusion === "success"
        && job.steps?.some(step => step.name === smoke && step.status === "completed" && step.conclusion === "success"))
      if (deploy) { replacements[branch] = { run: identity, job_id: deploy.id }; break }
    }
    if (!replacements[branch]) fail(`Successful replacement deployment smoke evidence missing for ${branch}`)
  }
  return { branches, replacements, heads: openHeads(api) }
}

export function validateManifest(manifest) {
  if (!keys(manifest, "version repository repository_id generated_at branches workflows replacements candidates retained")
    || manifest.version !== 1 || manifest.repository !== repository || manifest.repository_id !== repositoryId
    || typeof manifest.generated_at !== "string" || !Number.isFinite(Date.parse(manifest.generated_at))
    || !keys(manifest.branches, "stage main") || !Object.values(manifest.branches).every(sha)
    || !same(manifest.workflows, workflows) || !keys(manifest.replacements, "stage main")
    || !Array.isArray(manifest.candidates) || !Array.isArray(manifest.retained)) fail("Invalid frozen manifest schema/repository/allowlist")
  const seen = new Set()
  for (const branch of ["stage", "main"]) {
    const proof = manifest.replacements[branch]
    if (!keys(proof, "run job_id") || !id(proof.job_id) || !validRun(proof.run, true)
      || proof.run.head_repository_id !== repositoryId || proof.run.head_branch !== branch || proof.run.head_sha !== manifest.branches[branch]
      || proof.run.status !== "completed" || proof.run.conclusion !== "success") fail("Invalid replacement evidence")
  }
  for (const run of manifest.candidates) {
    if (!validRun(run) || run.status !== "completed" || run.conclusion === null || run.head_repository_id !== repositoryId || seen.has(run.id)) fail("Invalid candidate identity/allowlist")
    seen.add(run.id)
  }
  for (const item of manifest.retained) {
    if (!keys(item, "run artifacts reason") || !validRun(item.run) || seen.has(item.run.id) || !Array.isArray(item.artifacts)
      || !item.artifacts.every(a => validArtifact(a) && a.run_id === item.run.id) || typeof item.reason !== "string" || !item.reason) fail("Invalid retained run/artifact identity")
    seen.add(item.run.id)
  }
  return manifest
}

export function createManifest(api) {
  const live = preflight(api)
  // One repository artifact inventory avoids one request per historical run. No artifact bytes are downloaded.
  const inventory = artifacts(pages(api, "/actions/artifacts", "artifacts"))
  const manifest = { version: 1, repository, repository_id: repositoryId, generated_at: new Date().toISOString(),
    branches: live.branches, workflows, replacements: live.replacements, candidates: [], retained: [] }
  for (const workflow of workflows) {
    for (const raw of pages(api, `/actions/workflows/${workflow.id}/runs`, "workflow_runs")) {
      const run = runIdentity(raw)
      if (!validRun(run) || run.workflow_id !== workflow.id) fail("Unknown run producer/identity")
      const owned = inventory.filter(item => item.run_id === run.id)
      const reason = run.status !== "completed" ? "active run" : live.heads.includes(run.head_sha) ? "open PR head proof"
        : Object.values(live.branches).includes(run.head_sha) ? "current branch head proof"
        : run.head_repository_id !== repositoryId ? "unknown head repository ownership"
          : owned.length ? "artifact consumer ownership unknown; retain export/publish/recovery evidence" : null
      if (reason) manifest.retained.push({ run, artifacts: owned, reason })
      else manifest.candidates.push(run)
    }
  }
  return validateManifest(manifest)
}

export function applyManifest(manifest, api, checkFrozenBytes = () => {}) {
  validateManifest(manifest) // Validate every candidate before the first request or deletion.
  const deleted = []
  try {
    const live = preflight(api)
    if (!same(live.branches, manifest.branches) || !same(live.replacements, manifest.replacements)) fail("Frozen branch/replacement evidence changed; generate a new dry-run")
    for (const run of manifest.candidates) {
      if (live.heads.includes(run.head_sha) || Object.values(live.branches).includes(run.head_sha)) fail(`Run ${run.id} now protects an open PR head`)
      const current = runIdentity(api(`/actions/runs/${run.id}`))
      if (!same(current, run)) fail(`Run ${run.id} identity/status changed`)
      const currentArtifacts = artifacts(pages(api, `/actions/runs/${run.id}/artifacts`, "artifacts"))
      if (currentArtifacts.length) fail(`Run ${run.id} has artifacts with unknown live consumers`)
      if (openHeads(api).includes(run.head_sha)) fail(`Run ${run.id} now protects an open PR head`)
      checkFrozenBytes()
      api(`/actions/runs/${run.id}`, "DELETE")
      deleted.push(run.id)
    }
    return { deleted }
  } catch (error) { error.deleted = deleted; throw error }
}

function gh(endpoint, method = "GET") {
  const text = execFileSync("gh", ["api", "--method", method, `repos/${repository}${endpoint}`], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] })
  return text.trim() ? JSON.parse(text) : null
}
function main(args) {
  if (!args.length || same(args, ["--help"])) {
    console.log("Dry-run: node .scripts/cleanup-retired-workflow-runs.mjs --manifest PATH\nLater explicit apply: node .scripts/cleanup-retired-workflow-runs.mjs --apply --manifest PATH\nRequires accepted migration, retirement on stage/main and replacement deployment smoke proofs. Retains unknown artifact consumers; never deletes workflow 312171039.")
    return
  }
  const apply = args[0] === "--apply"
  const rest = apply ? args.slice(1) : args
  if (rest.length !== 2 || rest[0] !== "--manifest" || !rest[1]) fail("Expected [--apply] --manifest PATH")
  const file = path.resolve(rest[1])
  if (!apply) {
    if (fs.existsSync(file)) fail("Manifest already exists; choose a fresh path")
    const manifest = createManifest(gh)
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" })
    console.log(`Dry-run only: ${manifest.candidates.length} candidates, ${manifest.retained.length} retained; frozen ${file}. No DELETE requests. Retained history may keep sidebar entries visible.`)
    return
  }
  const bytes = fs.readFileSync(file)
  const manifest = validateManifest(JSON.parse(bytes.toString("utf8")))
  // A fresh, exclusive report prevents silently overwriting an earlier partial execution.
  const resultFile = path.join(os.tmpdir(), `devbook-history-cleanup-${Date.now()}-${process.pid}.json`)
  const resultFd = fs.openSync(resultFile, "wx")
  let result
  try {
    result = { ...applyManifest(manifest, gh, () => { if (!fs.readFileSync(file).equals(bytes)) fail("Manifest bytes changed") }), complete: true }
  } catch (error) {
    result = { deleted: error.deleted ?? [], complete: false, error: error.message }
    throw error
  } finally {
    fs.writeFileSync(resultFd, `${JSON.stringify({ repository, manifest: file, ...result }, null, 2)}\n`)
    fs.closeSync(resultFd)
    console.log(`Execution result: ${resultFile}; deleted ${result.deleted.length}; complete=${result.complete}`)
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)) } catch (error) { console.error(error.message); process.exitCode = 1 }
}
