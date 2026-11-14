import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const maximumFile = 25 * 1024 * 1024
const maximumTotal = 150 * 1024 * 1024
const targets = { preview: { branch: "stage", domain: "stage.devbook.zip" }, production: { branch: "main", domain: "devbook.zip" } }
export const deploymentProject = Object.freeze({ org: "team_oe3ByhkyzxSLo4G4aibDvOMA", project: "prj_NwP2L88ODNMTDmHk0fWS5c1jtw2Y" })
export const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex")

export function assertConfiguredProject(options) {
  if (options.org !== deploymentProject.org || options.project !== deploymentProject.project) throw new Error("Configured Vercel organization/project differs from the reviewed DevBook target")
}

function safePath(name) {
  return typeof name === "string" && name.length > 0 && !/[\\\x00-\x1f]/.test(name) && !name.startsWith("/") && name.split("/").every((part) => part && part !== "." && part !== "..")
}

function outputPath(name) {
  return safePath(name) && (name === "config.json" || name.startsWith("static/"))
}

function assertIdentity(identity) {
  if (!targets[identity.target] || !/^[a-f0-9]{40}$/.test(identity.source) || !/^[a-f0-9]{64}$/.test(identity.native)
    || !/^[\w.-]+\/[\w.-]+$/.test(identity.repository) || !/^\d+$/.test(identity.run) || !/^\d+$/.test(identity.attempt)) {
    throw new Error("Invalid deployment package identity")
  }
}

function filesUnder(root, prefix = "", result = []) {
  if (prefix.length > 2048) throw new Error("Deployment output path exceeds its bound")
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const name = prefix + entry.name
    const stat = fs.lstatSync(path.join(root, entry.name))
    if (stat.isSymbolicLink()) throw new Error("Deployment output must contain regular files, never symlinks")
    if (stat.isDirectory()) filesUnder(path.join(root, entry.name), name + "/", result)
    else if (stat.isFile()) {
      result.push(name)
      if (result.length > 30000) throw new Error("Deployment output exceeds its file count bound")
    }
    else throw new Error("Deployment output must contain regular files")
  }
  return result.sort()
}

export function createPackage(root, identity) {
  assertIdentity(identity)
  if (!/^[a-f0-9]{40}$/.test(identity.source_tree)) throw new Error("Deployment package requires an explicit Git tree SHA")
  const directory = path.join(root, ".vercel/output")
  for (const name of [".vercel", ".vercel/output"]) {
    if (fs.lstatSync(path.join(root, name)).isSymbolicLink()) throw new Error("Deployment output root must be a regular directory")
  }
  const buildMetadataPath = path.join(directory, "builds.json")
  if (!fs.lstatSync(buildMetadataPath).isFile() || fs.lstatSync(buildMetadataPath).isSymbolicLink()) throw new Error("Missing regular Vercel build metadata")
  const buildMetadata = JSON.parse(fs.readFileSync(buildMetadataPath, "utf8"))
  if (buildMetadata.target !== identity.target || buildMetadata.cliVersion !== "65.16.0") throw new Error("Vercel build target or CLI version differs from the reviewed package")
  const files = {}
  const inventory = {}
  let total = 0
  for (const name of filesUnder(directory)) {
    // CLI diagnostics/build command arguments are not deployable Build Output.
    if (name === "builds.json" || name.startsWith("diagnostics/")) continue
    if (!outputPath(name)) throw new Error("Unexpected output: only static deployment output is supported")
    const bytes = fs.readFileSync(path.join(directory, name))
    total += bytes.length
    if (bytes.length > maximumFile || total > maximumTotal) throw new Error("Deployment package exceeds its size bound")
    files[name] = bytes.toString("base64")
    inventory[name] = { sha256: sha256(bytes), size: bytes.length, mode: fs.statSync(path.join(directory, name)).mode & 0o777 }
  }
  const lock = fs.readFileSync(path.join(root, "Web/quartz.lock.json"))
  const bundle = {
    version: 1,
    manifest: {
      repository: identity.repository, source: identity.source, target: identity.target,
      run: identity.run, attempt: identity.attempt, native: identity.native,
      source_tree: identity.source_tree,
      node_version: process.version,
      vercel_version: buildMetadata.cliVersion,
      quartz_lock_sha256: sha256(lock),
      quartz_lock: lock.toString("utf8"),
      files: inventory,
    },
    files,
  }
  verifyPackage(bundle, identity)
  return bundle
}

export function verifyPackage(bundle, identity) {
  assertIdentity(identity)
  const manifest = bundle?.manifest
  if (bundle?.version !== 1 || !manifest || !bundle.files || typeof bundle.files !== "object" || Array.isArray(bundle.files)) throw new Error("Invalid deployment package schema")
  for (const key of ["repository", "source", "target", "run", "attempt", "native"]) {
    if (manifest[key] !== identity[key]) throw new Error(`Deployment package identity mismatch: ${key}`)
  }
  if (!/^[a-f0-9]{40}$/.test(manifest.source_tree) || typeof manifest.node_version !== "string" || manifest.vercel_version !== "65.16.0"
    || typeof manifest.quartz_lock !== "string" || sha256(Buffer.from(manifest.quartz_lock)) !== manifest.quartz_lock_sha256) throw new Error("Invalid deployment build input binding")
  JSON.parse(manifest.quartz_lock)
  const names = Object.keys(bundle.files).sort()
  if (!manifest.files || JSON.stringify(names) !== JSON.stringify(Object.keys(manifest.files).sort()) || names.length < 2 || names.length > 30000) throw new Error("Incomplete deployment inventory")
  const seen = new Set()
  let total = 0
  for (const name of names) {
    if (!outputPath(name)) throw new Error("Unsafe deployment output path")
    const folded = name.normalize("NFC").toLowerCase()
    if (seen.has(folded)) throw new Error("Deployment output path collision")
    seen.add(folded)
    const value = bundle.files[name]
    const entry = manifest.files[name]
    if (typeof value !== "string" || value.length > 4 * Math.ceil(maximumFile / 3)) throw new Error("Invalid deployment output encoding")
    const bytes = Buffer.from(value, "base64")
    if (bytes.toString("base64") !== value) throw new Error("Invalid deployment output encoding")
    total += bytes.length
    if (bytes.length > maximumFile || total > maximumTotal || entry.size !== bytes.length || entry.sha256 !== sha256(bytes) || ![0o644, 0o755].includes(entry.mode)) throw new Error("Deployment output digest, size or mode mismatch")
  }
  if (!names.includes("config.json") || !names.includes("static/index.html")) throw new Error("Missing static deployment entry point")
  const config = JSON.parse(Buffer.from(bundle.files["config.json"], "base64").toString("utf8"))
  if (config.version !== 3) throw new Error("Unsupported Vercel Build Output version")
  return manifest
}

export function extractPackage(root, bundle, identity) {
  verifyPackage(bundle, identity)
  const directory = path.join(root, ".vercel/output")
  if (fs.existsSync(path.join(root, ".vercel")) && fs.lstatSync(path.join(root, ".vercel")).isSymbolicLink()) throw new Error("Deployment output parent cannot be a symlink")
  fs.rmSync(directory, { recursive: true, force: true })
  for (const [name, value] of Object.entries(bundle.files)) {
    const destination = path.join(directory, name)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.writeFileSync(destination, Buffer.from(value, "base64"), { mode: bundle.manifest.files[name].mode })
    fs.chmodSync(destination, bundle.manifest.files[name].mode)
  }
}

export function removeBuildSecrets(root, target) {
  if (!targets[target]) throw new Error("Invalid build environment")
  const directory = path.join(root, ".vercel")
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error("Vercel settings cannot be a symlink")
  for (const name of fs.readdirSync(directory)) {
    if (name.startsWith(".env")) fs.rmSync(path.join(directory, name), { recursive: true, force: true })
  }
  // Static Quartz builds need no project secrets. Keep the expected CLI file empty.
  fs.writeFileSync(path.join(directory, `.env.${target}.local`), "", { mode: 0o600 })
}

async function request(options, url, init = {}) {
  const response = await (options.fetch ?? globalThis.fetch)(url, { cache: "no-store", ...init, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`Deployment verification request failed (${response.status ?? "unknown"})`)
  return response.json()
}

function apiUrl(options, endpoint) {
  return `https://api.vercel.com${endpoint}${endpoint.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(options.org)}`
}

function authorization(options) {
  if (!options.token || !options.project || !options.org) throw new Error("Missing protected Vercel token, project ID or organization ID")
  assertConfiguredProject(options)
  return { authorization: `Bearer ${options.token}` }
}

export async function publishDeployment(options) {
  assertIdentity(options)
  authorization(options)
  const target = targets[options.target]
  const assertHead = async () => {
    const head = await request(options, `https://api.github.com/repos/${options.repository}/git/ref/heads/${target.branch}`, {
      headers: { authorization: `Bearer ${options.githubToken}`, accept: "application/vnd.github+json" },
    })
    if (head.object?.sha !== options.source) throw new Error("Deployment source is stale; alias unchanged")
  }
  await assertHead()
  const deployment = await verifiedDeployment(options)
  if (!/^[a-zA-Z0-9.-]+\.vercel\.app$/.test(deployment.url)) throw new Error("Unexpected immutable deployment hostname")
  await verifyMarker(options, deployment.url)
  await assertHead()
  if (options.target === "production") {
    const run = options.runCommand ?? ((args) => execFileSync("vercel", args, { timeout: 300000, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, VERCEL_TOKEN: options.token } }))
    run(["promote", options.deployment, "--yes"])
  } else {
    await request(options, apiUrl(options, `/v2/deployments/${encodeURIComponent(options.deployment)}/aliases`), {
      method: "POST", headers: { ...authorization(options), "content-type": "application/json" }, body: JSON.stringify({ alias: target.domain }),
    })
  }
}

async function verifiedDeployment(options) {
  const headers = authorization(options)
  const deployment = await request(options, apiUrl(options, `/v13/deployments/${encodeURIComponent(options.deployment)}`), { headers })
  if (deployment.id !== options.deployment || deployment.projectId !== options.project || deployment.readyState !== "READY" || deployment.meta?.devbookSourceSha !== options.source
    || (options.target === "production" ? deployment.target !== "production" : ![null, "preview"].includes(deployment.target))) throw new Error("Deployment project, source or readiness mismatch")
  return deployment
}

async function verifyMarker(options, domain) {
  const marker = await request(options, `https://${domain}/.well-known/devbook-build.json?source=${options.source}&native=${options.native}`, {
    headers: { "cache-control": "no-cache, no-store", ...(options.bypass ? { "x-vercel-protection-bypass": options.bypass } : {}) }, redirect: "error",
  })
  if (marker.source !== options.source || marker.native !== options.native) throw new Error("Served site build identity mismatch")
}

export async function verifyDeployment(options) {
  assertIdentity(options)
  const deployment = await verifiedDeployment(options)
  const domain = targets[options.target].domain
  const alias = await request(options, apiUrl(options, `/v4/aliases/${domain}`), { headers: authorization(options) })
  if (alias.deploymentId !== deployment.id || alias.projectId !== options.project) throw new Error("Environment alias does not point to the verified deployment")
  await verifyMarker(options, domain)
}

export function deploymentFromOutput(text) {
  const payload = JSON.parse(text)
  if (payload.status !== undefined && payload.status !== "ok") throw new Error("Vercel deployment did not succeed")
  const deployment = payload.deployment ?? payload
  if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id) || !/^https:\/\/[a-zA-Z0-9.-]+\.vercel\.app$/.test(deployment.url) || deployment.readyState !== "READY") throw new Error("Vercel returned an invalid deployment identity")
  return deployment
}

function argumentsMap(args) {
  const values = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i].startsWith("--") || args[i + 1] === undefined || values[args[i].slice(2)] !== undefined) throw new Error("Invalid site pipeline arguments")
    values[args[i].slice(2)] = args[i + 1]
  }
  return values
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const args = argumentsMap(rest)
  const root = path.resolve(args.root ?? ".")
  const identity = {
    repository: process.env.GITHUB_REPOSITORY ?? "grafanaKibana/devbook.zip", source: args.source,
    target: args.target, run: process.env.GITHUB_RUN_ID ?? args.run, attempt: process.env.GITHUB_RUN_ATTEMPT ?? args.attempt, native: args.native,
  }
  if (command === "configuration") {
    assertConfiguredProject({ org: process.env.VERCEL_ORG_ID, project: process.env.VERCEL_PROJECT_ID })
  } else if (command === "source-only") {
    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0")
    if (tracked.some((name) => name.startsWith("Web/content/") || name.startsWith("Web/quartz/styles/syncer/") || name === ".devbook-improvement/syncer-export.json")) throw new Error("Generated web output must not be tracked")
  } else if (command === "clean-env") removeBuildSecrets(root, args.target)
  else if (command === "marker") {
    assertIdentity(identity)
    const directory = path.join(root, ".vercel/output/static/.well-known")
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(path.join(directory, "devbook-build.json"), JSON.stringify({ source: identity.source, native: identity.native }))
  } else if (command === "package") {
    const observed = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim()
    if (observed !== identity.source) throw new Error("Package source does not match checkout HEAD")
    identity.source_tree = execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: root, encoding: "utf8" }).trim()
    const bundle = createPackage(root, identity)
    const bytes = Buffer.from(JSON.stringify(bundle))
    fs.mkdirSync(path.dirname(args.output), { recursive: true })
    fs.writeFileSync(args.output, bytes)
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `sha256=${sha256(bytes)}\n`)
  } else if (command === "extract") {
    const stat = fs.lstatSync(args.bundle)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumTotal * 2) throw new Error("Invalid or oversized deployment archive")
    const bytes = fs.readFileSync(args.bundle)
    if (!/^[a-f0-9]{64}$/.test(args.digest) || sha256(bytes) !== args.digest) throw new Error("Deployment archive digest mismatch")
    extractPackage(root, JSON.parse(bytes.toString("utf8")), identity)
  } else if (command === "deploy") {
    assertIdentity(identity)
    if (!process.env.VERCEL_TOKEN || !process.env.VERCEL_ORG_ID || !process.env.VERCEL_PROJECT_ID) throw new Error("Missing protected deployment credentials")
    assertConfiguredProject({ org: process.env.VERCEL_ORG_ID, project: process.env.VERCEL_PROJECT_ID })
    fs.mkdirSync(path.join(root, ".vercel"), { recursive: true })
    fs.writeFileSync(path.join(root, ".vercel/project.json"), JSON.stringify({ orgId: process.env.VERCEL_ORG_ID, projectId: process.env.VERCEL_PROJECT_ID }))
    const flags = ["deploy", "--prebuilt", "--yes", "--json", "--meta", `devbookSourceSha=${identity.source}`]
    if (identity.target === "production") flags.push("--prod", "--skip-domain")
    const created = deploymentFromOutput(execFileSync("vercel", flags, { cwd: root, timeout: 900000, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }))
    const options = { ...identity, token: process.env.VERCEL_TOKEN, project: process.env.VERCEL_PROJECT_ID, org: process.env.VERCEL_ORG_ID }
    const deployment = await request(options, apiUrl(options, `/v13/deployments/${encodeURIComponent(created.id)}`), { headers: authorization(options) })
    if (!/^dpl_[a-zA-Z0-9]+$/.test(deployment.id)) throw new Error("Vercel returned an invalid deployment ID")
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `deployment=${deployment.id}\n`)
  } else if (command === "publish") {
    const options = { ...identity, deployment: args.deployment, token: process.env.VERCEL_TOKEN, project: process.env.VERCEL_PROJECT_ID,
      org: process.env.VERCEL_ORG_ID, githubToken: process.env.GITHUB_TOKEN, bypass: process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
    await publishDeployment(options)
    await verifyDeployment(options)
  } else throw new Error("Unknown site pipeline operation")
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
