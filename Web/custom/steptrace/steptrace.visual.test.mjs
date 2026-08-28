import assert from "node:assert/strict"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { arch, platform, tmpdir } from "node:os"
import { isAbsolute, join, relative, resolve, sep, win32 } from "node:path"
import { build, buildSync } from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"
import { chromium } from "playwright"
import sharp from "sharp"

import {
  evidenceRoot,
  loadCatalogFixtures,
  repoRoot,
  sha256,
  stableJson,
} from "./steptrace.catalog.mjs"
import {
  HOST_RUNNERS,
  canonicalHostReceiptPath,
  hostRunnerFiles,
  writeHostReceipt,
} from "../../../.omx/evidence/steptrace-design-system-refactor/quality-gate/g008-promotion-protocol/runners/host-receipt.mjs"

const launchManifestArg = process.argv
  .find((argument) => argument.startsWith("--launch-manifest="))
  ?.slice("--launch-manifest=".length)
assert.ok(launchManifestArg, "visual harness must run through steptrace.visual.launcher.mjs")
const launchManifest = JSON.parse(Buffer.from(launchManifestArg, "base64url").toString("utf8"))
const { hash: launchManifestHash, ...launchManifestCore } = launchManifest
assert.equal(launchManifest.schemaVersion, 1, "invalid visual launch manifest schema")
assert.equal(launchManifest.protocol, "steptrace-visual-launch-v1")
assert.equal(
  launchManifestHash,
  sha256(stableJson(launchManifestCore)),
  "launch manifest hash mismatch",
)
const executablePaths = [
  "Web/custom/steptrace/steptrace.visual.launcher.mjs",
  "Web/custom/steptrace/steptrace.visual.test.mjs",
  "Web/custom/steptrace/steptrace.catalog.mjs",
  ".omx/evidence/steptrace-design-system-refactor/quality-gate/g008-promotion-protocol/runners/host-receipt.mjs",
].sort()
assert.deepEqual(
  launchManifest.files.map(({ path }) => path),
  executablePaths,
  "visual launch manifest executable set mismatch",
)
for (const file of launchManifest.files) {
  const bytes = readFileSync(join(repoRoot, file.path))
  assert.equal(bytes.length, file.bytes, `launch manifest byte size mismatch: ${file.path}`)
  assert.equal(sha256(bytes), file.sha256, `launch manifest disk hash mismatch: ${file.path}`)
}

const modeArg = process.argv.find((argument) => argument.startsWith("--mode="))
const mode = modeArg?.slice("--mode=".length)
if (!new Set(["baseline", "candidate", "verify-candidate", "lifecycle", "self-check"]).has(mode)) {
  throw new Error(
    "usage: steptrace.visual.test.mjs --mode=baseline|candidate|verify-candidate|lifecycle|self-check",
  )
}

const runIdArg = process.argv.find((argument) => argument.startsWith("--run-id="))
if (["candidate", "verify-candidate"].includes(mode) && !runIdArg)
  throw new Error(`--mode=${mode} requires --run-id`)
const runId = runIdArg?.slice("--run-id=".length) ?? new Date().toISOString().replace(/[:.]/g, "-")
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error(`invalid --run-id ${runId}`)
const producerAgentId = process.argv
  .find((argument) => argument.startsWith("--producer-agent-id="))
  ?.slice("--producer-agent-id=".length)
const quartzReceipt = process.argv
  .find((argument) => argument.startsWith("--quartz-receipt="))
  ?.slice("--quartz-receipt=".length)
const obsidianReceipt = process.argv
  .find((argument) => argument.startsWith("--obsidian-receipt="))
  ?.slice("--obsidian-receipt=".length)
if (mode === "candidate" && !producerAgentId)
  throw new Error("--mode=candidate requires --producer-agent-id")

const visualRoot = join(evidenceRoot, "visual")
let outputRoot
switch (mode) {
  case "baseline":
    outputRoot = join(visualRoot, "baseline-v5")
    break
  case "candidate":
    outputRoot = join(visualRoot, "candidate", runId)
    break
  case "verify-candidate":
    outputRoot = join(evidenceRoot, "quality-gate", "g008-promotion-protocol", runId)
    break
  case "lifecycle":
    outputRoot = join(evidenceRoot, "lifecycle", runId)
    break
  default:
    outputRoot = join(evidenceRoot, "quality-gate", "g008-approval")
}
let summaryName = "summary.json"
if (mode === "self-check") summaryName = "harness-self-check.json"
if (mode === "verify-candidate") summaryName = "closure-receipt.json"
const summaryPath = join(outputRoot, summaryName)
const baselineSummaryPath = join(visualRoot, "baseline-v5", "summary.json")
const baselineRoot = join(visualRoot, "baseline-v5")
const candidateRoot = join(visualRoot, "candidate", runId)
const candidateSummaryPath = join(candidateRoot, "summary.json")
const promotionRoot = join(evidenceRoot, "quality-gate", "g008-promotion-protocol")
const captureAnchorPath = (candidateRunId) =>
  join(promotionRoot, "capture-anchors", `${candidateRunId}.json`)
if (mode === "baseline") {
  assert.equal(
    existsSync(summaryPath),
    false,
    `immutable corrected visual baseline already exists: ${summaryPath}`,
  )
} else if (mode === "candidate") {
  assert.equal(
    existsSync(baselineSummaryPath),
    true,
    `missing visual baseline: ${baselineSummaryPath}`,
  )
  assert.equal(existsSync(outputRoot), false, `candidate run id already exists: ${runId}`)
  assert.equal(
    existsSync(captureAnchorPath(runId)),
    false,
    `capture anchor run id already exists: ${runId}`,
  )
} else if (mode === "verify-candidate") {
  assert.equal(existsSync(candidateSummaryPath), true, `missing sealed candidate: ${runId}`)
  assert.equal(
    JSON.parse(readFileSync(candidateSummaryPath, "utf8")).schemaVersion,
    4,
    `candidate ${runId} uses the old unsealed schema and cannot be promoted`,
  )
  if (!quartzReceipt || !obsidianReceipt)
    throw new Error("--mode=verify-candidate requires --quartz-receipt and --obsidian-receipt")
}
const baseline = ["candidate", "verify-candidate", "self-check"].includes(mode)
  ? JSON.parse(readFileSync(baselineSummaryPath, "utf8"))
  : null

const loadedCatalog = loadCatalogFixtures()
const { fixtures, counts } = loadedCatalog
const behaviorPath = join(evidenceRoot, "baseline-v2", "behavior", "catalog.json")
const behaviorBytes = readFileSync(behaviorPath, "utf8")
const behavior = JSON.parse(behaviorBytes)
const activeFrames = new Map(behavior.frames.map(({ id, active }) => [id, active]))
const generatedJsPath = join(repoRoot, "Web", "custom", "steptrace", "generated", "engine.js")
const engineCssPath = join(repoRoot, "Web", "custom", "steptrace", "generated", "engine.css")
const obsidianCssPath = join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css")
const generatedJs = readFileSync(generatedJsPath, "utf8")
const engineCss = readFileSync(engineCssPath, "utf8")
const quartzBindingsPath = join(repoRoot, "Web", "custom", "components", "styles", "steptrace.scss")
async function compileQuartzBindings() {
  const result = await build({
    entryPoints: [quartzBindingsPath],
    bundle: true,
    write: false,
    plugins: [sassPlugin()],
    logLevel: "silent",
  })
  return result.outputFiles[0]?.text
}
const quartzBindings = await compileQuartzBindings()
assert.ok(quartzBindings, "Quartz host SCSS did not compile to CSS")
assert.doesNotMatch(quartzBindings, /@(use|include)\b/, "Quartz host CSS contains Sass directives")
const obsidianCss = readFileSync(obsidianCssPath, "utf8")
const shellCss = `
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; background: var(--shell-bg); color: var(--shell-text); }
#shell { padding: 24px; width: max-content; min-width: 100%; }
#root { width: var(--fixture-width); }
:root {
  --light: #ffffff; --lightgray: #e5e7eb; --gray: #6b7280; --darkgray: #1f2937;
  --secondary: #4c8000; --accent-gradient: linear-gradient(90deg, #4c8000, #2563eb);
  --bodyFont: Arial; --codeFont: monospace; --shell-bg: #ffffff; --shell-text: #1f2937;
  --host-st-page: #ffffff; --host-st-surface: #e5e7eb; --host-st-border: #6b7280;
  --host-st-neutral: #8a9a73; --host-st-state-amber: #d97706; --host-st-state-violet: #7c3aed;
  --host-st-state-blue: #2563eb; --host-st-state-green: #4c8000; --host-st-state-red: #b42318;
  --host-st-panel-shadow: rgb(0 0 0 / 0.12); --host-st-held-bg: #92400e; --host-st-held-fg: #ffffff;
}
:root[saved-theme="dark"] {
  --light: #111827; --lightgray: #1f2937; --gray: #9ca3af; --darkgray: #f3f4f6;
  --secondary: #84cc16; --shell-bg: #111827; --shell-text: #f3f4f6;
  --host-st-page: #111827; --host-st-surface: #1f2937; --host-st-border: #9ca3af;
  --host-st-state-amber: #f59e0b; --host-st-state-violet: #a78bfa;
  --host-st-state-blue: #60a5fa; --host-st-state-green: #84cc16;
  --host-st-panel-shadow: rgb(0 0 0 / 0.32); --host-st-held-bg: #fbbf24; --host-st-held-fg: #1f2937;
}
.theme-light {
  --background-primary: #ffffff; --background-secondary: #f3f4f6;
  --background-modifier-border: #d1d5db; --background-modifier-border-hover: #6b7280;
  --text-normal: #1f2937; --text-muted: #6b7280;
  --text-faint: #9ca3af; --interactive-accent: #4c8000; --interactive-accent-hover: #2563eb;
  --text-on-accent: #ffffff; --font-text: Arial; --font-monospace: monospace;
  --shell-bg: #ffffff; --shell-text: #1f2937;
  --host-st-page: var(--background-primary); --host-st-surface: var(--background-secondary);
  --host-st-border: var(--background-modifier-border-hover); --host-st-neutral: var(--text-faint);
}
.theme-dark {
  --background-primary: #111827; --background-secondary: #1f2937;
  --background-modifier-border: #4b5563; --background-modifier-border-hover: #9ca3af;
  --text-normal: #f3f4f6; --text-muted: #d1d5db;
  --text-faint: #9ca3af; --interactive-accent: #84cc16; --interactive-accent-hover: #60a5fa;
  --text-on-accent: #111827; --font-text: Arial; --font-monospace: monospace;
  --shell-bg: #111827; --shell-text: #f3f4f6;
  --host-st-page: var(--background-primary); --host-st-surface: var(--background-secondary);
  --host-st-border: var(--background-modifier-border-hover); --host-st-neutral: var(--text-faint);
  --host-st-state-amber: #f59e0b; --host-st-state-violet: #a78bfa;
  --host-st-state-blue: #60a5fa; --host-st-state-green: #84cc16;
  --host-st-state-red: #b42318; --host-st-panel-shadow: rgb(0 0 0 / 0.32);
  --host-st-held-bg: #fbbf24; --host-st-held-fg: #1f2937;
}
`
const HOSTS = ["quartz", "obsidian"]
const THEMES = ["light", "dark"]
const WIDTHS = [
  { name: "wide", component: 1100, viewport: 1148 },
  { name: "compact", component: 680, viewport: 728 },
]
const STATES = ["initial", "active", "terminal"]

function baselineSemantic(semantic) {
  const {
    ownership: _ownership,
    visualFamily: _visualFamily,
    visibilityFiltered,
    ...behavior
  } = semantic
  const optionsIndex = behavior.controls?.indexOf("Options") ?? -1
  const normalized =
    optionsIndex < 0
      ? behavior
      : {
          ...behavior,
          text: behavior.text.replace(
            /Speed(?:0\.50|0\.75|1\.00|1\.25|1\.50|1\.75|2\.00)×[\s\S]*$/,
            "",
          ),
          controls: behavior.controls.slice(0, optionsIndex + 1),
        }
  return normalized
}

function assertObservedRuntimeOwnership(expectedOwnership, observedOwnership) {
  assert.equal(
    observedOwnership,
    expectedOwnership,
    `runtime ownership ${observedOwnership ?? "missing"} did not match ${expectedOwnership}`,
  )
}

async function reviewedRasterEquivalent(approval, reviewedArtifact, currentCandidate) {
  if (sha256(reviewedArtifact) !== approval.candidateHash) return false
  const [reviewed, current] = await Promise.all(
    [reviewedArtifact, currentCandidate].map((png) =>
      sharp(png).raw().toBuffer({ resolveWithObject: true }),
    ),
  )
  const { width, height, channels } = reviewed.info
  if (
    width !== current.info.width ||
    height !== current.info.height ||
    channels !== current.info.channels ||
    ![3, 4].includes(channels)
  )
    return false

  let changedPixels = 0
  for (let offset = 0; offset < reviewed.data.length; offset += channels) {
    if (channels === 4 && reviewed.data[offset + 3] !== current.data[offset + 3]) return false
    let changed = false
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(reviewed.data[offset + channel] - current.data[offset + channel])
      if (delta > 1) return false
      changed ||= delta !== 0
    }
    if (changed) changedPixels += 1
  }
  return changedPixels / (width * height) <= 0.0001
}

function posixRelative(root, path) {
  return relative(root, path).split(sep).join("/")
}

function regularFiles(root) {
  const files = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      const status = lstatSync(path)
      assert.equal(status.isSymbolicLink(), false, `sealed tree contains symlink: ${path}`)
      if (status.isDirectory()) visit(path)
      else if (status.isFile()) files.push(path)
      else throw new Error(`sealed tree contains non-regular artifact: ${path}`)
    }
  }
  visit(root)
  return files.sort()
}

function treeSeal(root, excluded = new Set()) {
  const files = regularFiles(root)
    .map((path) => ({
      path: posixRelative(root, path),
      bytes: statSync(path).size,
      sha256: sha256(readFileSync(path)),
    }))
    .filter(({ path }) => !excluded.has(path))
  return {
    algorithm: "sha256",
    excluded: [...excluded].sort(),
    files,
    hash: sha256(stableJson(files)),
  }
}

function resolveCandidateFile(root, artifact) {
  if (
    typeof artifact !== "string" ||
    !artifact ||
    isAbsolute(artifact) ||
    win32.isAbsolute(artifact) ||
    artifact.split(/[\\/]/).includes("..")
  )
    return null
  try {
    let current = root
    for (const part of artifact.split(/[\\/]/)) {
      current = join(current, part)
      if (lstatSync(current).isSymbolicLink()) return null
    }
    const rootReal = realpathSync(root)
    const fileReal = realpathSync(current)
    const contained = relative(rootReal, fileReal)
    return contained &&
      contained !== ".." &&
      !contained.startsWith(`..${sep}`) &&
      !isAbsolute(contained) &&
      statSync(fileReal).isFile()
      ? fileReal
      : null
  } catch {
    return null
  }
}

function identityFor(record) {
  return {
    host: record.host,
    theme: record.theme,
    width: record.width,
    viewport: record.viewport,
    descriptorId: record.id,
    state: record.state,
    owner: record.ownership,
    kind: record.descriptorType,
  }
}

function environmentIdentity() {
  const chromiumPath = chromium.executablePath()
  const playwrightPackage = JSON.parse(
    readFileSync(join(repoRoot, "Web", "node_modules", "playwright", "package.json"), "utf8"),
  )
  return {
    node: process.version,
    platform: platform(),
    arch: arch(),
    playwright: playwrightPackage.version,
    chromium: {
      path: chromiumPath,
      bytes: statSync(chromiumPath).size,
      sha256: sha256(readFileSync(chromiumPath)),
    },
  }
}

function sourceInputPaths() {
  const paths = [
    ...launchManifest.files.map(({ path }) => join(repoRoot, path)),
    join(evidenceRoot, "quality-gate", "g008-promotion-protocol", "runners", "quartz.mjs"),
    join(evidenceRoot, "quality-gate", "g008-promotion-protocol", "runners", "obsidian.mjs"),
    generatedJsPath,
    engineCssPath,
    quartzBindingsPath,
    obsidianCssPath,
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "manifest.json"),
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", ".hotreload"),
    join(repoRoot, "Web", "package.json"),
    join(repoRoot, "Web", "package-lock.json"),
    ...regularFiles(join(evidenceRoot, "fixtures-v2")),
    ...regularFiles(baselineRoot),
    behaviorPath,
  ]
  return [...new Set(paths)].sort()
}

function fileInputEntries() {
  return sourceInputPaths().map((path) => ({
    path: posixRelative(repoRoot, path),
    bytes: statSync(path).size,
    sha256: sha256(readFileSync(path)),
  }))
}

function virtualInput(path, value) {
  const bytes = typeof value === "string" ? value : stableJson(value)
  return { path, bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) }
}

function assertLaunchManifestInputs(inputs) {
  const byPath = new Map(inputs.map((input) => [input.path, input]))
  for (const executable of launchManifest.files)
    assert.deepEqual(
      byPath.get(executable.path),
      executable,
      `executable changed after launcher hash: ${executable.path}`,
    )
}

async function captureInputSnapshot(useLoadedValues) {
  const currentQuartzBindings = useLoadedValues ? quartzBindings : await compileQuartzBindings()
  assert.ok(currentQuartzBindings, "Quartz host SCSS did not compile to CSS")
  const currentCatalog = useLoadedValues ? loadedCatalog : loadCatalogFixtures()
  const currentBehaviorBytes = useLoadedValues ? behaviorBytes : readFileSync(behaviorPath, "utf8")
  const inputs = [
    ...fileInputEntries(),
    virtualInput(
      "<loaded>/generated-engine.js",
      useLoadedValues ? generatedJs : readFileSync(generatedJsPath, "utf8"),
    ),
    virtualInput(
      "<loaded>/generated-engine.css",
      useLoadedValues ? engineCss : readFileSync(engineCssPath, "utf8"),
    ),
    virtualInput(
      "<loaded>/obsidian-steptrace.css",
      useLoadedValues ? obsidianCss : readFileSync(obsidianCssPath, "utf8"),
    ),
    virtualInput("<loaded>/quartz-steptrace.css", currentQuartzBindings),
    virtualInput("<loaded>/catalog-fixtures.json", currentCatalog),
    virtualInput("<loaded>/behavior.json", JSON.parse(currentBehaviorBytes)),
    virtualInput("<loaded>/shell.css", shellCss),
    virtualInput("<loaded>/matrix-constants.json", { HOSTS, THEMES, WIDTHS, STATES }),
  ].sort((left, right) => left.path.localeCompare(right.path))
  assertLaunchManifestInputs(inputs)
  const environment = environmentIdentity()
  const generatedPaths = new Set([
    posixRelative(repoRoot, generatedJsPath),
    posixRelative(repoRoot, engineCssPath),
    posixRelative(repoRoot, obsidianCssPath),
    "Vault/.obsidian/plugins/steptrace/main.js",
    "Vault/.obsidian/plugins/steptrace/manifest.json",
    "Vault/.obsidian/plugins/steptrace/.hotreload",
  ])
  const hashes = Object.fromEntries(inputs.map(({ path, sha256: hash }) => [path, hash]))
  const generatedHashes = Object.fromEntries(
    Object.entries(hashes).filter(([path]) => generatedPaths.has(path)),
  )
  const sourceHashes = Object.fromEntries(
    Object.entries(hashes).filter(([path]) => !path.startsWith("<") && !generatedPaths.has(path)),
  )
  return {
    schemaVersion: 2,
    algorithm: "sha256",
    launchManifest,
    launchManifestHash,
    inputs,
    environment,
    sourceHashes,
    generatedHashes,
    baselineTree: treeSeal(baselineRoot),
    fingerprint: sha256(stableJson({ launchManifestHash, inputs, environment })),
  }
}

function assertCaptureSnapshotUnchanged(before, after) {
  assert.deepEqual(after, before, "capture input or environment changed during browser run")
}

function resolveEvidenceFile(artifact) {
  if (
    typeof artifact !== "string" ||
    !artifact ||
    isAbsolute(artifact) ||
    win32.isAbsolute(artifact) ||
    artifact.split(/[\\/]/).includes("..")
  )
    return null
  try {
    const root = realpathSync(evidenceRoot)
    const candidate = resolve(root, artifact)
    const candidateRelative = relative(root, candidate)
    if (
      !candidateRelative ||
      candidateRelative === ".." ||
      candidateRelative.startsWith(`..${sep}`) ||
      isAbsolute(candidateRelative)
    )
      return null
    const realCandidate = realpathSync(candidate)
    const realRelative = relative(root, realCandidate)
    return realRelative &&
      realRelative !== ".." &&
      !realRelative.startsWith(`..${sep}`) &&
      !isAbsolute(realRelative) &&
      statSync(realCandidate).isFile()
      ? realCandidate
      : null
  } catch {
    return null
  }
}

function readCanonicalJson(path, label) {
  const bytes = readFileSync(path, "utf8")
  const value = JSON.parse(bytes)
  assert.equal(bytes, stableJson(value), `${label} is not canonical or was byte-mutated`)
  return { bytes, value, hash: sha256(bytes) }
}

function expectedVisualMatrix(currentFixtures, baselineSummary, selectedKeys = null) {
  const baselineByKey = new Map(baselineSummary.records.map((record) => [record.key, record]))
  const expected = new Map()
  for (const host of HOSTS) {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        for (const fixture of currentFixtures) {
          for (const state of STATES) {
            const key = `${host}/${theme}/${width.name}/${fixture.id}/${state}`
            if (selectedKeys && !selectedKeys.has(key)) continue
            const baselineRecord = baselineByKey.get(key)
            assert.ok(baselineRecord, `immutable baseline missing expected identity: ${key}`)
            expected.set(key, {
              key,
              id: fixture.id,
              descriptorType: fixture.descriptorType,
              host,
              theme,
              width: width.name,
              viewport: { width: width.viewport, height: 1000, deviceScaleFactor: 1 },
              state,
              ownership: fixture.ownership,
              screenshot: Boolean(baselineRecord.screenshot),
              baselineRecord,
            })
          }
        }
      }
    }
  }
  return expected
}

function metricProductFailures(metrics, state) {
  const failures = new Set(
    Array.isArray(metrics.violations) ? metrics.violations : ["invalid violations"],
  )
  for (const [field, label] of [
    ["clipping", "clipping failures"],
    ["containment", "stage containment failures"],
    ["smallTargets", "small target failures"],
    ["contrast", "contrast failures"],
    ["nonTextContrast", "non-text contrast failures"],
    ["cueFailures", "fixture non-color cue failures"],
  ]) {
    const values = metrics[field]
    if (!Array.isArray(values)) failures.add(`invalid ${field}`)
    else if (values.length) failures.add(`${label}: ${values.length}`)
  }
  if (!metrics.familyGeometry || typeof metrics.familyGeometry !== "object") {
    failures.add("invalid family geometry")
  } else {
    for (const [name, values] of Object.entries(metrics.familyGeometry)) {
      if (!Array.isArray(values)) failures.add(`invalid ${name}`)
      else if (name !== "maskedJoins" && values.length)
        failures.add(`${name} failures: ${values.length}`)
    }
  }
  if (!Array.isArray(metrics.runtimeErrors)) failures.add("invalid runtime errors")
  else if (metrics.runtimeErrors.length)
    failures.add(`runtime errors: ${metrics.runtimeErrors.length}`)
  if (
    (state === "initial" && metrics.keyboardAndMotion?.pass !== true) ||
    (metrics.keyboardAndMotion && metrics.keyboardAndMotion.pass !== true)
  )
    failures.add("keyboard/focus oracle failed")
  return [...failures].sort()
}

function paritySemantic({ controls, roles, parityText, visualFamily }) {
  return { controls, roles, parityText, visualFamily }
}

function deriveProductFailures(recordsByKey, expectedMatrix) {
  const failures = []
  for (const [key, expected] of expectedMatrix) {
    const record = recordsByKey.get(key)
    const metrics = record.sealedMetrics
    const violations = metricProductFailures(metrics, expected.state)
    if (metrics.observedOwnership !== expected.ownership)
      violations.push(
        `runtime ownership ${metrics.observedOwnership ?? "missing"} did not match ${expected.ownership}`,
      )
    if (
      stableJson(baselineSemantic(metrics.legacySemantic ?? {})) !==
      stableJson(baselineSemantic(expected.baselineRecord.metrics.semantic))
    )
      violations.push("semantic candidate output differs from the immutable baseline")
    if (Boolean(record.screenshot) !== expected.screenshot)
      violations.push("candidate and immutable baseline screenshot presence differs")
    if (violations.length) failures.push({ key, violations: [...new Set(violations)].sort() })
  }
  for (const fixture of fixtures) {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        for (const state of STATES) {
          const quartzKey = `quartz/${theme}/${width.name}/${fixture.id}/${state}`
          const obsidianKey = `obsidian/${theme}/${width.name}/${fixture.id}/${state}`
          if (!expectedMatrix.has(quartzKey) || !expectedMatrix.has(obsidianKey)) continue
          const quartz = recordsByKey.get(quartzKey).sealedMetrics.semantic
          const obsidian = recordsByKey.get(obsidianKey).sealedMetrics.semantic
          if (stableJson(paritySemantic(quartz)) === stableJson(paritySemantic(obsidian))) continue
          for (const key of [quartzKey, obsidianKey]) {
            const existing = failures.find((failure) => failure.key === key)
            if (existing) existing.violations.push("host semantic divergence")
            else failures.push({ key, violations: ["host semantic divergence"] })
          }
        }
      }
    }
  }
  return failures.sort((left, right) => left.key.localeCompare(right.key))
}

function validateCaptureAnchor(path, expectedRunId, root, currentSnapshot) {
  assert.equal(
    resolve(path),
    resolve(captureAnchorPath(expectedRunId)),
    "non-canonical capture anchor",
  )
  const anchorFile = resolveEvidenceFile(posixRelative(evidenceRoot, path))
  assert.ok(anchorFile, "missing or invalid capture anchor")
  const anchorJson = readCanonicalJson(anchorFile, "capture anchor")
  const anchor = anchorJson.value
  assert.equal(anchor.schemaVersion, 1, "invalid capture anchor schema")
  assert.equal(anchor.protocol, "steptrace-capture-anchor-v1")
  assert.equal(anchor.runId, expectedRunId, "capture anchor run id mismatch")
  assert.equal(anchor.candidateDirectory, posixRelative(evidenceRoot, root))
  assert.ok(
    typeof anchor.producerAgentId === "string" && anchor.producerAgentId.length > 0,
    "missing capture producer identity",
  )
  assert.deepEqual(anchor.candidateTree, treeSeal(root), "candidate tree does not match anchor")
  assert.equal(anchor.inputFingerprint, currentSnapshot.fingerprint, "stale input fingerprint")
  assert.deepEqual(anchor.environment, currentSnapshot.environment, "stale capture environment")
  assert.deepEqual(anchor.sourceHashes, currentSnapshot.sourceHashes, "stale source hashes")
  assert.deepEqual(
    anchor.generatedHashes,
    currentSnapshot.generatedHashes,
    "stale generated hashes",
  )
  assert.deepEqual(anchor.baselineTree, currentSnapshot.baselineTree, "stale baseline snapshot")
  assert.deepEqual(
    anchor.captureSeal,
    currentSnapshot,
    "capture seal does not match current inputs",
  )
  assert.equal(anchor.launchManifestHash, currentSnapshot.launchManifestHash)
  const harness = currentSnapshot.launchManifest.files.find(
    ({ path: artifact }) => artifact === "Web/custom/steptrace/steptrace.visual.test.mjs",
  )
  const launcher = currentSnapshot.launchManifest.files.find(
    ({ path: artifact }) => artifact === "Web/custom/steptrace/steptrace.visual.launcher.mjs",
  )
  assert.deepEqual(
    {
      id: anchor.tool.id,
      path: anchor.tool.path,
      sha256: anchor.tool.sha256,
      launcherPath: anchor.tool.launcherPath,
      launcherSha256: anchor.tool.launcherSha256,
    },
    {
      id: "steptrace-visual-harness-v1",
      path: harness.path,
      sha256: harness.sha256,
      launcherPath: launcher.path,
      launcherSha256: launcher.sha256,
    },
    "capture producer tool identity mismatch",
  )
  return { anchor, path: anchorFile, hash: anchorJson.hash }
}

function validateSealedCandidate({ root, expectedRunId, anchor, expectedMatrix }) {
  assert.equal(root.split(sep).at(-1), expectedRunId, "CLI and candidate directory run id mismatch")
  const summaryFile = join(root, "summary.json")
  const dispositionFile = join(root, "diff-disposition.json")
  const candidateSealFile = join(root, "candidate-seal.json")
  const summaryJson = readCanonicalJson(summaryFile, "summary")
  const dispositionJson = readCanonicalJson(dispositionFile, "disposition")
  const candidateSealJson = readCanonicalJson(candidateSealFile, "candidate seal")
  const summary = summaryJson.value
  const disposition = dispositionJson.value
  const candidateSeal = candidateSealJson.value
  assert.equal(summary.schemaVersion, 4, "candidate is not sealed schema v4")
  assert.equal(summary.mode, "candidate")
  assert.equal(summary.runId, expectedRunId, "summary run id mismatch")
  assert.equal(disposition.schemaVersion, 2, "invalid disposition schema")
  assert.equal(disposition.runId, expectedRunId, "disposition run id mismatch")
  assert.equal(candidateSeal.schemaVersion, 1, "invalid candidate seal schema")
  assert.equal(candidateSeal.runId, expectedRunId, "candidate seal run id mismatch")
  assert.equal(anchor.runId, expectedRunId, "anchor run id mismatch")
  assert.equal(summaryJson.hash, anchor.hashes.summary, "summary does not match capture anchor")
  assert.equal(
    dispositionJson.hash,
    anchor.hashes.disposition,
    "disposition does not match capture anchor",
  )
  assert.equal(
    candidateSealJson.hash,
    anchor.hashes.candidateSeal,
    "candidate seal does not match capture anchor",
  )
  assert.deepEqual(
    treeSeal(root, new Set(["summary.json", "candidate-seal.json"])),
    summary.candidateTree,
    "sealed candidate tree changed",
  )
  assert.deepEqual(
    candidateSeal.candidateTree,
    summary.candidateTree,
    "candidate tree seal mismatch",
  )
  assert.equal(candidateSealJson.hash, summary.candidateSealHash, "candidate seal hash mismatch")
  const { candidateTree: _tree, candidateSealHash: _sealHash, ...summaryCore } = summary
  assert.equal(
    sha256(stableJson(summaryCore)),
    candidateSeal.summaryCoreHash,
    "summary seal mismatch",
  )
  assert.equal(candidateSeal.captureSealFingerprint, anchor.inputFingerprint)
  assert.equal(candidateSeal.launchManifestHash, anchor.launchManifestHash)
  assert.deepEqual(summary.captureSeal, anchor.captureSeal, "summary capture seal mismatch")

  assert.equal(summary.records.length, expectedMatrix.size, "unexpected candidate metric count")
  assert.equal(anchor.counts.metrics, expectedMatrix.size, "anchored metric count mismatch")
  const recordsByKey = new Map()
  const anchorFiles = new Map(anchor.candidateTree.files.map((file) => [file.path, file]))
  for (const record of summary.records) {
    assert.equal(recordsByKey.has(record.key), false, `duplicate metric key: ${record.key}`)
    const expected = expectedMatrix.get(record.key)
    assert.ok(expected, `extra candidate identity: ${record.key}`)
    assert.deepEqual(
      identityFor(record),
      identityFor(expected),
      `matrix identity drift: ${record.key}`,
    )
    assert.equal(
      record.key,
      `${record.host}/${record.theme}/${record.width}/${record.id}/${record.state}`,
    )
    assert.equal(record.metricsArtifact, `${record.key}/metrics.json`, "non-canonical metrics path")
    const metricsFile = resolveCandidateFile(root, record.metricsArtifact)
    assert.ok(metricsFile, `invalid metrics artifact: ${record.metricsArtifact}`)
    const metricsBytes = readFileSync(metricsFile)
    assert.equal(sha256(metricsBytes), record.metricsHash, "metrics hash mismatch")
    assert.equal(anchorFiles.get(record.metricsArtifact)?.sha256, record.metricsHash)
    const sealedMetrics = JSON.parse(metricsBytes)
    assert.deepEqual(sealedMetrics, record.metrics, "summary metrics differ from sealed metrics")
    let validatedScreenshot = null
    if (expected.screenshot) {
      const canonicalCandidate = `candidate/${expectedRunId}/${record.key}/screenshot.png`
      assert.equal(record.screenshot, canonicalCandidate, "non-canonical candidate screenshot path")
      const screenshotFile = resolveCandidateFile(visualRoot, record.screenshot)
      assert.ok(screenshotFile, `invalid screenshot artifact: ${record.screenshot}`)
      const screenshotBytes = readFileSync(screenshotFile)
      const currentHash = sha256(screenshotBytes)
      assert.equal(currentHash, record.screenshotHash, "screenshot hash mismatch")
      assert.equal(anchorFiles.get(posixRelative(root, screenshotFile))?.sha256, currentHash)
      validatedScreenshot = { file: screenshotFile, bytes: screenshotBytes, hash: currentHash }
    } else {
      assert.equal(record.screenshot, null)
      assert.equal(record.screenshotHash, null)
    }
    recordsByKey.set(record.key, { ...record, sealedMetrics, validatedScreenshot })
  }
  assert.deepEqual(
    [...recordsByKey.keys()].sort(),
    [...expectedMatrix.keys()].sort(),
    "matrix set drift",
  )

  const screenshotRecords = [...recordsByKey.values()].filter(({ screenshot }) => screenshot)
  if (expectedMatrix.size === 2592)
    assert.equal(screenshotRecords.length, 2040, "full candidate screenshot count mismatch")
  assert.equal(
    anchor.counts.screenshots,
    screenshotRecords.length,
    "anchored screenshot count mismatch",
  )
  assert.equal(disposition.entries.length, screenshotRecords.length, "unexpected disposition count")
  assert.equal(
    anchor.counts.dispositions,
    disposition.entries.length,
    "anchored disposition count mismatch",
  )
  const dispositionByIdentity = new Map()
  for (const entry of disposition.entries) {
    assert.ok(
      ["exact-baseline", "approval-required"].includes(entry.classification),
      "invalid disposition classification",
    )
    const identityKey = stableJson(entry.identity)
    assert.equal(dispositionByIdentity.has(identityKey), false, "duplicate disposition identity")
    const record = recordsByKey.get(
      `${entry.identity.host}/${entry.identity.theme}/${entry.identity.width}/${entry.identity.descriptorId}/${entry.identity.state}`,
    )
    assert.ok(record?.screenshot, "disposition has no candidate screenshot")
    assert.deepEqual(entry.identity, identityFor(record), "disposition identity mismatch")
    assert.equal(entry.owner, record.ownership)
    assert.deepEqual(entry.descriptorIds, [record.id])
    const {
      file: screenshotFile,
      bytes: candidateBytes,
      hash: useTimeCandidateHash,
    } = record.validatedScreenshot
    assert.equal(entry.candidate, record.screenshot, "split candidate path")
    assert.equal(entry.candidateHash, useTimeCandidateHash, "disposition candidate hash mismatch")
    const baselineRecord = expectedMatrix.get(record.key).baselineRecord
    assert.equal(entry.baseline, baselineRecord.screenshot, "baseline substitution")
    const baselineFile = resolveCandidateFile(visualRoot, baselineRecord.screenshot)
    assert.ok(baselineFile, "invalid immutable baseline artifact")
    const baselineRelative = posixRelative(baselineRoot, baselineFile)
    const baselineBytes = readFileSync(baselineFile)
    const baselineHash = sha256(baselineBytes)
    assert.equal(
      anchor.baselineTree.files.find(({ path }) => path === baselineRelative)?.sha256,
      baselineHash,
    )
    assert.equal(entry.baselineHash, baselineHash, "baseline hash mismatch")
    assert.equal(
      entry.classification,
      baselineHash === useTimeCandidateHash ? "exact-baseline" : "approval-required",
      "false exact-baseline classification",
    )
    dispositionByIdentity.set(identityKey, {
      entry,
      record,
      screenshotFile,
      candidateBytes,
      candidateHash: useTimeCandidateHash,
      baselineFile,
      baselineBytes,
      baselineHash,
    })
  }
  assert.deepEqual(
    [...dispositionByIdentity.keys()].sort(),
    screenshotRecords.map((record) => stableJson(identityFor(record))).sort(),
    "disposition matrix drift",
  )
  return {
    summary,
    disposition,
    recordsByKey,
    dispositionByIdentity,
    productFailures: deriveProductFailures(recordsByKey, expectedMatrix),
    hashes: {
      summary: summaryJson.hash,
      disposition: dispositionJson.hash,
      candidateSeal: candidateSealJson.hash,
    },
  }
}

const REVIEWER_ROLES = new Set(["designer", "verifier", "vision"])
const reviewAnchorArtifact = (candidateRunId, reviewerAgentId) =>
  `quality-gate/g008-promotion-protocol/review-anchors/${candidateRunId}/${reviewerAgentId}.json`

function approvalAnchorBinding(approval) {
  return {
    identity: approval.identity,
    owner: approval.owner,
    baselineArtifact: approval.baselineArtifact,
    baselineHash: approval.baselineHash,
    candidateArtifact: approval.candidateArtifact,
    candidateHash: approval.candidateHash,
    descriptorIds: approval.descriptorIds,
    classification: approval.classification,
    reviewArtifact: approval.reviewArtifact,
    reviewArtifactHash: approval.reviewArtifactHash,
  }
}

function writeReviewAnchor({ context, approvals, reviewerTool }) {
  const first = approvals[0]
  const toolFile = resolveEvidenceFile(reviewerTool.path)
  assert.ok(toolFile, "missing review tool")
  const anchor = {
    schemaVersion: 2,
    protocol: "steptrace-review-anchor-v2",
    candidateRunId: context.runId,
    captureAnchor: {
      path: posixRelative(evidenceRoot, captureAnchorPath(context.runId)),
      sha256: context.captureAnchorHash,
    },
    producer: { agentId: context.producerAgentId, tool: context.producerTool },
    reviewer: {
      agentId: first.reviewerAgentId,
      role: first.reviewerRole,
      tool: { ...reviewerTool, sha256: sha256(readFileSync(toolFile)) },
    },
    reviewArtifacts: [
      ...new Map(
        approvals.map((approval) => [
          approval.reviewArtifact,
          { path: approval.reviewArtifact, sha256: approval.reviewArtifactHash },
        ]),
      ).values(),
    ].sort((left, right) => left.path.localeCompare(right.path)),
    approvals: [
      ...new Map(
        approvals.map((approval) => [
          stableJson(approvalAnchorBinding(approval)),
          approvalAnchorBinding(approval),
        ]),
      ).values(),
    ].sort((left, right) => stableJson(left).localeCompare(stableJson(right))),
  }
  const artifact = reviewAnchorArtifact(context.runId, first.reviewerAgentId)
  const path = join(evidenceRoot, artifact)
  mkdirSync(resolve(path, ".."), { recursive: true })
  writeFileSync(path, stableJson(anchor), { flag: "wx" })
  return { artifact, path, hash: sha256(readFileSync(path)), anchor }
}

function validateReviewAnchors(approvals, context) {
  const current = approvals.filter(
    (approval) =>
      approval.schemaVersion === 2 &&
      approval.protocol === "steptrace-visual-approval-v2" &&
      approval.candidateRunId === context.runId,
  )
  const groups = Map.groupBy(current, (approval) => approval.reviewAnchor)
  const accepted = new Set()
  for (const [artifact, group] of groups) {
    const reviewerAgentId = group[0]?.reviewerAgentId
    assert.equal(
      artifact,
      reviewAnchorArtifact(context.runId, reviewerAgentId),
      "non-canonical review anchor path",
    )
    assert.ok(group.every((approval) => approval.reviewAnchor === artifact))
    assert.ok(
      group.every((approval) => approval.reviewAnchorHash === group[0].reviewAnchorHash),
      "split review anchor hash",
    )
    const anchorFile = resolveEvidenceFile(artifact)
    assert.ok(anchorFile, "missing or invalid review anchor")
    const anchorJson = readCanonicalJson(anchorFile, "review anchor")
    assert.equal(anchorJson.hash, group[0].reviewAnchorHash, "review anchor hash mismatch")
    const anchor = anchorJson.value
    assert.equal(anchor.schemaVersion, 2, "invalid review anchor schema")
    assert.equal(anchor.protocol, "steptrace-review-anchor-v2")
    assert.equal(anchor.candidateRunId, context.runId, "review anchor run id mismatch")
    assert.deepEqual(anchor.captureAnchor, {
      path: posixRelative(evidenceRoot, captureAnchorPath(context.runId)),
      sha256: context.captureAnchorHash,
    })
    assert.deepEqual(anchor.producer, {
      agentId: context.producerAgentId,
      tool: context.producerTool,
    })
    assert.equal(anchor.reviewer.agentId, reviewerAgentId)
    assert.notEqual(anchor.reviewer.agentId, anchor.producer.agentId)
    assert.ok(REVIEWER_ROLES.has(anchor.reviewer.role), "invalid anchored reviewer role")
    assert.notEqual(anchor.reviewer.tool.id, anchor.producer.tool.id)
    const reviewerTool = resolveEvidenceFile(anchor.reviewer.tool.path)
    assert.ok(reviewerTool, "missing anchored reviewer tool")
    assert.equal(
      sha256(readFileSync(reviewerTool)),
      anchor.reviewer.tool.sha256,
      "anchored reviewer tool hash mismatch",
    )
    assert.ok(
      group.every(
        (approval) =>
          approval.producerAgentId === anchor.producer.agentId &&
          approval.producerToolId === anchor.producer.tool.id &&
          approval.reviewerAgentId === anchor.reviewer.agentId &&
          approval.reviewerRole === anchor.reviewer.role &&
          approval.reviewerToolId === anchor.reviewer.tool.id,
      ),
      "approval and review anchor identities differ",
    )
    const reviewArtifacts = [
      ...new Map(
        group.map((approval) => [
          approval.reviewArtifact,
          { path: approval.reviewArtifact, sha256: approval.reviewArtifactHash },
        ]),
      ).values(),
    ].sort((left, right) => left.path.localeCompare(right.path))
    assert.deepEqual(anchor.reviewArtifacts, reviewArtifacts, "review artifact set mismatch")
    for (const review of reviewArtifacts) {
      const reviewFile = resolveEvidenceFile(review.path)
      assert.ok(reviewFile, "missing anchored review artifact")
      assert.equal(
        sha256(readFileSync(reviewFile)),
        review.sha256,
        "anchored review artifact hash mismatch",
      )
    }
    const bindings = [
      ...new Map(
        group.map((approval) => [stableJson(approvalAnchorBinding(approval)), approval]),
      ).keys(),
    ].sort()
    assert.deepEqual(
      anchor.approvals.map(stableJson).sort(),
      bindings,
      "anchored approval identity set mismatch",
    )
    for (const binding of bindings) accepted.add(binding)
  }
  return accepted
}

function isAcceptedVisualApproval(approval, record, baselineHash, context) {
  return (
    approval.schemaVersion === 2 &&
    approval.protocol === "steptrace-visual-approval-v2" &&
    approval.candidateRunId === context.runId &&
    approval.producerRunId === context.runId &&
    approval.producerAgentId === context.producerAgentId &&
    typeof approval.reviewerAgentId === "string" &&
    approval.reviewerAgentId.length > 0 &&
    approval.reviewerAgentId !== context.producerAgentId &&
    approval.owner === record.ownership &&
    stableJson(approval.identity) === stableJson(identityFor(record)) &&
    approval.baselineHash === baselineHash &&
    approval.baselineArtifact === record.baseline &&
    typeof approval.candidateArtifact === "string" &&
    approval.candidateArtifact.length > 0 &&
    approval.candidateHash &&
    approval.descriptorIds?.length === 1 &&
    approval.descriptorIds[0] === record.id &&
    approval.classification === "accepted-canonical-shift" &&
    REVIEWER_ROLES.has(approval.reviewerRole) &&
    typeof approval.reason === "string" &&
    approval.reason.trim().length > 0 &&
    context.acceptedApprovalBindings.has(stableJson(approvalAnchorBinding(approval)))
  )
}

async function findAcceptedVisualApproval(
  approvals,
  record,
  baselineHash,
  candidateHash,
  candidatePng,
  context,
) {
  const matches = (
    await Promise.all(
      approvals
        .filter((approval) => isAcceptedVisualApproval(approval, record, baselineHash, context))
        .map(async (approval) => {
          const reviewedPath = resolveCandidateFile(visualRoot, approval.candidateArtifact)
          if (!reviewedPath) return null
          const reviewedArtifact = readFileSync(reviewedPath)
          if (sha256(reviewedArtifact) !== approval.candidateHash) return null
          if (approval.candidateHash === candidateHash) return { approval, matchKind: "exact-hash" }
          return (await reviewedRasterEquivalent(approval, reviewedArtifact, candidatePng))
            ? { approval, matchKind: "reviewed-raster-equivalent" }
            : null
        }),
    )
  ).filter(Boolean)
  return matches.sort((left, right) => {
    const rank = Number(right.matchKind === "exact-hash") - Number(left.matchKind === "exact-hash")
    if (rank) return rank
    return stableJson(left.approval).localeCompare(stableJson(right.approval))
  })[0]
}

function validateHostReceipt(artifact, host, context) {
  const canonicalPath = posixRelative(evidenceRoot, canonicalHostReceiptPath(context.runId, host))
  assert.equal(artifact, canonicalPath, `non-canonical ${host} host receipt path`)
  const receiptFile = resolveEvidenceFile(artifact)
  assert.ok(receiptFile, `missing or invalid ${host} host receipt`)
  const receiptJson = readCanonicalJson(receiptFile, `${host} host receipt`)
  const receipt = receiptJson.value
  assert.equal(receipt.schemaVersion, 2, `invalid ${host} host receipt schema`)
  assert.equal(receipt.protocol, "steptrace-host-receipt-v2")
  assert.equal(receipt.host, host)
  assert.equal(receipt.status, "PASS", `${host} host smoke did not pass`)
  assert.equal(receipt.runId, context.runId, `${host} host receipt run id mismatch`)
  assert.deepEqual(receipt.captureAnchor, {
    path: posixRelative(evidenceRoot, captureAnchorPath(context.runId)),
    sha256: context.captureAnchorHash,
  })
  assert.equal(
    receipt.inputFingerprint,
    context.inputFingerprint,
    `${host} host inputFingerprint mismatch`,
  )
  assert.equal(
    receipt.launchManifestHash,
    context.launchManifestHash,
    `${host} host launchManifestHash mismatch`,
  )
  assert.deepEqual(
    receipt.sourceHashes,
    context.sourceHashes,
    `${host} host source hashes mismatch`,
  )
  assert.deepEqual(
    receipt.generatedHashes,
    context.generatedHashes,
    `${host} host generated hashes mismatch`,
  )
  assert.equal(receipt.runner?.id, HOST_RUNNERS[host].runnerId)
  assert.equal(receipt.runner?.toolId, HOST_RUNNERS[host].toolId)
  assert.ok(typeof receipt.runner?.agentId === "string" && receipt.runner.agentId.length > 0)
  assert.deepEqual(receipt.runner.files, hostRunnerFiles(host), `${host} runner files changed`)
  assert.ok(receipt.counts?.checks > 0)
  assert.equal(receipt.counts.passed, receipt.counts.checks)
  assert.equal(receipt.counts.errors, 0)
  assert.equal(receipt.counts.artifacts, receipt.artifacts?.length)
  assert.deepEqual(receipt.errors, [])
  assert.equal(receipt.cleanup?.processTerminated, true)
  assert.equal(receipt.cleanup?.portsReleased, true)
  assert.equal(receipt.checks.length, receipt.counts.checks)
  assert.ok(
    receipt.checks.every(({ id, status }) => typeof id === "string" && id && status === "PASS"),
  )
  assert.equal(new Set(receipt.checks.map(({ id }) => id)).size, receipt.checks.length)
  const artifactPrefix = `real-host/g008/${context.runId}/${host}/artifacts/`
  for (const artifactRecord of receipt.artifacts ?? []) {
    assert.ok(
      artifactRecord.path.startsWith(artifactPrefix),
      `non-canonical ${host} host artifact path`,
    )
    const file = resolveEvidenceFile(artifactRecord.path)
    assert.ok(file, `invalid ${host} host artifact`)
    const bytes = readFileSync(file)
    assert.equal(bytes.length, artifactRecord.bytes)
    assert.equal(sha256(bytes), artifactRecord.sha256)
  }
  assert.ok(receipt.artifacts?.length > 0)
  assert.deepEqual(
    [...new Set(receipt.checks.flatMap(({ artifacts }) => artifacts))].sort(),
    receipt.artifacts.map(({ path }) => path).sort(),
    `${host} host check artifact set mismatch`,
  )
  return { artifact, hash: receiptJson.hash, receipt }
}

async function evaluateSealedCandidate({
  root,
  expectedRunId,
  ledger,
  ledgerBytes,
  currentSnapshot,
  hostReceipts,
  expectedMatrix,
  writeReceipt = false,
  beforePromotionFinalize = null,
}) {
  const captureAnchor = validateCaptureAnchor(
    captureAnchorPath(expectedRunId),
    expectedRunId,
    root,
    currentSnapshot,
  )
  const validated = validateSealedCandidate({
    root,
    expectedRunId,
    anchor: captureAnchor.anchor,
    expectedMatrix,
  })
  const context = {
    runId: expectedRunId,
    producerAgentId: captureAnchor.anchor.producerAgentId,
    producerTool: captureAnchor.anchor.tool,
    captureAnchorHash: captureAnchor.hash,
    inputFingerprint: captureAnchor.anchor.inputFingerprint,
    launchManifestHash: captureAnchor.anchor.launchManifestHash,
    sourceHashes: captureAnchor.anchor.sourceHashes,
    generatedHashes: captureAnchor.anchor.generatedHashes,
  }
  if (validated.productFailures.length)
    return { status: "failed-product", productFailures: validated.productFailures }
  const quartz = validateHostReceipt(hostReceipts.quartz, "quartz", context)
  const obsidian = validateHostReceipt(hostReceipts.obsidian, "obsidian", context)
  context.acceptedApprovalBindings = validateReviewAnchors(ledger, context)

  let baselineExact = 0
  let approvalExact = 0
  let rasterEquivalent = 0
  const approvalFailures = []
  for (const {
    entry,
    record,
    candidateBytes,
    candidateHash,
  } of validated.dispositionByIdentity.values()) {
    if (entry.classification === "exact-baseline") {
      baselineExact += 1
      continue
    }
    const accepted = await findAcceptedVisualApproval(
      ledger,
      {
        ...record,
        baseline: entry.baseline,
        candidate: entry.candidate,
      },
      entry.baselineHash,
      candidateHash,
      candidateBytes,
      context,
    )
    if (!accepted)
      approvalFailures.push({ identity: entry.identity, reason: "v2 approval required" })
    else if (accepted.matchKind === "exact-hash") approvalExact += 1
    else rasterEquivalent += 1
  }
  if (approvalFailures.length) return { status: "pending-approval", approvalFailures }

  const approved = baselineExact + approvalExact + rasterEquivalent
  assert.equal(approved, validated.disposition.entries.length, "approval coverage mismatch")
  await beforePromotionFinalize?.()
  assert.deepEqual(
    treeSeal(root),
    captureAnchor.anchor.candidateTree,
    "candidate tree changed before promotion receipt",
  )
  const receipt = {
    schemaVersion: 2,
    protocol: "steptrace-promotion-receipt-v2",
    runId: expectedRunId,
    status: "promoted",
    hashes: {
      candidateTree: captureAnchor.anchor.candidateTree.hash,
      summary: validated.hashes.summary,
      disposition: validated.hashes.disposition,
      ledger: sha256(ledgerBytes),
      captureAnchor: captureAnchor.hash,
      captureSeal: sha256(stableJson(captureAnchor.anchor.captureSeal)),
      candidateSeal: validated.hashes.candidateSeal,
      quartzReceipt: quartz.hash,
      obsidianReceipt: obsidian.hash,
    },
    productFailures: 0,
    approvals: {
      approved,
      expected: validated.disposition.entries.length,
      baselineExact,
      approvalExact,
      rasterEquivalent,
    },
    identityValidation: "exact-catalog-host-theme-viewport-width-descriptor-state-owner-kind",
    timestamp: new Date().toISOString(),
    tools: captureAnchor.anchor.environment,
  }
  assert.equal(receipt.runId, expectedRunId, "receipt run id mismatch")
  if (writeReceipt) {
    mkdirSync(outputRoot, { recursive: true })
    writeFileSync(summaryPath, stableJson(receipt), { flag: "wx" })
  }
  return receipt
}

function productStatus(productFailures, approvalFailures) {
  if (productFailures.length) return "failed-product"
  if (approvalFailures.length) return "pending-approval"
  return "promotable"
}

function writeCandidateSeal({ root, candidateRunId, summaryCore, disposition, captureSnapshot }) {
  const dispositionPath = join(root, "diff-disposition.json")
  const candidateSealPath = join(root, "candidate-seal.json")
  const finalSummaryPath = join(root, "summary.json")
  writeFileSync(dispositionPath, stableJson(disposition), { flag: "wx" })
  const candidateTree = treeSeal(root, new Set(["summary.json", "candidate-seal.json"]))
  const candidateSeal = {
    schemaVersion: 1,
    runId: candidateRunId,
    captureSealFingerprint: captureSnapshot.fingerprint,
    launchManifestHash: captureSnapshot.launchManifestHash,
    summaryCoreHash: sha256(stableJson(summaryCore)),
    candidateTree,
  }
  const candidateSealBytes = stableJson(candidateSeal)
  writeFileSync(candidateSealPath, candidateSealBytes, { flag: "wx" })
  const summary = {
    ...summaryCore,
    candidateTree,
    candidateSealHash: sha256(candidateSealBytes),
  }
  writeFileSync(finalSummaryPath, stableJson(summary), { flag: "wx" })

  return { summary, disposition, candidateSeal }
}

function writeCaptureAnchor({ root, candidateRunId, captureSnapshot, captureProducerAgentId }) {
  const finalSummaryPath = join(root, "summary.json")
  const dispositionPath = join(root, "diff-disposition.json")
  const candidateSealPath = join(root, "candidate-seal.json")
  const summary = JSON.parse(readFileSync(finalSummaryPath, "utf8"))
  const disposition = JSON.parse(readFileSync(dispositionPath, "utf8"))
  const anchor = {
    schemaVersion: 1,
    protocol: "steptrace-capture-anchor-v1",
    runId: candidateRunId,
    candidateDirectory: posixRelative(evidenceRoot, root),
    producerAgentId: captureProducerAgentId,
    hashes: {
      summary: sha256(readFileSync(finalSummaryPath)),
      disposition: sha256(readFileSync(dispositionPath)),
      candidateSeal: sha256(readFileSync(candidateSealPath)),
    },
    candidateTree: treeSeal(root),
    baselineTree: captureSnapshot.baselineTree,
    captureSeal: captureSnapshot,
    inputFingerprint: captureSnapshot.fingerprint,
    launchManifestHash: captureSnapshot.launchManifestHash,
    environment: captureSnapshot.environment,
    sourceHashes: captureSnapshot.sourceHashes,
    generatedHashes: captureSnapshot.generatedHashes,
    counts: {
      metrics: summary.records.length,
      screenshots: summary.records.filter(({ screenshot }) => screenshot).length,
      dispositions: disposition.entries.length,
    },
    timestamp: new Date().toISOString(),
    tool: {
      id: "steptrace-visual-harness-v1",
      path: "Web/custom/steptrace/steptrace.visual.test.mjs",
      sha256: launchManifest.files.find(
        ({ path }) => path === "Web/custom/steptrace/steptrace.visual.test.mjs",
      ).sha256,
      launcherPath: "Web/custom/steptrace/steptrace.visual.launcher.mjs",
      launcherSha256: launchManifest.files.find(
        ({ path }) => path === "Web/custom/steptrace/steptrace.visual.launcher.mjs",
      ).sha256,
      protocolVersion: 2,
      node: process.version,
      playwright: captureSnapshot.environment.playwright,
    },
  }
  const anchorPath = captureAnchorPath(candidateRunId)
  mkdirSync(resolve(anchorPath, ".."), { recursive: true })
  writeFileSync(anchorPath, stableJson(anchor), { flag: "wx" })
  return { anchor, anchorPath }
}

function shouldCapture(fixture, representatives) {
  if (!representatives.has(fixture.visualEvidenceKey)) {
    representatives.add(fixture.visualEvidenceKey)
    return true
  }
  return Object.entries(fixture.riskFlags).some(
    ([name, value]) => value && !["hostLifecycle", "meaningfulMotion"].includes(name),
  )
}

function settleAnimations(animations) {
  const diagnostics = []
  const finite = []
  for (const [index, animation] of [...animations].entries()) {
    const timing = animation.effect?.getComputedTiming?.() ?? animation.effect?.getTiming?.() ?? {}
    const identity = animation.id || animation.animationName || `animation-${index}`
    const nonFinishable =
      timing.iterations === Infinity || timing.endTime === Infinity
        ? "infinite"
        : animation.playbackRate === 0
          ? "zero-playback-rate"
          : null
    if (nonFinishable) {
      if (typeof animation.cancel !== "function") {
        throw new Error(`${identity}: recognized ${nonFinishable} animation cannot be cancelled`)
      }
      animation.cancel()
      diagnostics.push({ identity, handling: "cancelled", reason: nonFinishable })
      continue
    }
    finite.push({ animation, identity })
    try {
      animation.finish()
    } catch (error) {
      throw new Error(
        `${identity}: unexpected finish failure (${error instanceof Error ? error.message : String(error)})`,
        { cause: error },
      )
    }
  }
  const active = finite
    .filter(({ animation }) => ["pending", "running"].includes(animation.playState))
    .map(({ identity, animation }) => `${identity}:${animation.playState}`)
  if (active.length) throw new Error(`finite animations remained active: ${active.join(", ")}`)
  return diagnostics
}

async function mount(page, fixture, state) {
  await page.evaluate(
    async ({ config, descriptorType, activeIndex, operations, state, animationSettler }) => {
      globalThis.__steptraceHandle?.destroy()
      const root = document.querySelector("#root")
      root.replaceChildren()
      globalThis.__steptraceHandle = globalThis.steptrace.mount(root, config)
      const settle = async () => {
        await document.fonts?.ready
        let previous = ""
        for (let attempt = 0; attempt < 4; attempt += 1) {
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          )
          const rect = root.getBoundingClientRect()
          const current = `${rect.x},${rect.y},${rect.width},${rect.height}`
          if (current === previous) return
          previous = current
        }
        throw new Error("geometry did not stabilize after ResizeObserver delivery")
      }
      const apply = async (recipe) => {
        if (!recipe?.required) return
        for (const [label, value] of Object.entries(recipe.controls)) {
          const control = [...root.querySelectorAll("input,select")].find(
            (candidate) => candidate.getAttribute("aria-label") === label,
          )
          if (!control) throw new Error(`missing control ${label}`)
          control.value = value
          control.dispatchEvent(new Event("input", { bubbles: true }))
          control.dispatchEvent(new Event("change", { bubbles: true }))
        }
        const button = [...root.querySelectorAll("button")].find(
          (candidate) => candidate.textContent.trim() === recipe.action,
        )
        if (!button || button.disabled) throw new Error(`missing action ${recipe.action}`)
        button.click()
        const deadline = performance.now() + 3000
        while (performance.now() < deadline) {
          const status = root.querySelector('[role="status"]')?.textContent?.trim() ?? ""
          if (new RegExp(recipe.expected.status).test(status)) break
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
        const status = root.querySelector('[role="status"]')?.textContent?.trim() ?? ""
        if (!new RegExp(recipe.expected.status).test(status))
          throw new Error(`${recipe.action} status ${JSON.stringify(status)} did not match`)
        await settle()
      }
      if (descriptorType === "frame") {
        const scrub = root.querySelector('[role="slider"][aria-label="Step"]')
        if (state === "active") {
          for (let index = 0; index < activeIndex; index++)
            scrub.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
        } else if (state === "terminal") {
          scrub.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }))
        }
      } else if (state !== "initial") {
        await apply(operations.valid)
        if (state === "terminal") {
          await apply(operations.removal)
          await apply(operations.reset)
        }
      }
      const finishAnimations = (0, eval)(`(${animationSettler})`)
      const animationDiagnostics = finishAnimations(document.getAnimations())
      await settle()
      animationDiagnostics.push(...finishAnimations(document.getAnimations()))
      globalThis.__steptraceAnimationDiagnostics = animationDiagnostics
    },
    {
      config: fixture.config,
      descriptorType: fixture.descriptorType,
      activeIndex: activeFrames.get(fixture.id)?.index ?? 0,
      operations: fixture.operations,
      state,
      animationSettler: settleAnimations.toString(),
    },
  )
}

async function metrics(page, compact, oracle, state) {
  return page.evaluate(
    ({ compact, oracle, state }) => {
      const root = document.querySelector("#root")
      const visible = (element) => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        let painted = true
        for (let current = element; current; current = current.parentElement) {
          if (Number(getComputedStyle(current).opacity) <= 0) painted = false
        }
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          painted &&
          rect.width > 0 &&
          rect.height > 0
        )
      }
      const observableText = (container) => {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
        const values = []
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (node.parentElement && visible(node.parentElement)) values.push(node.textContent)
        }
        return values.join("").replace(/\s+/g, " ").trim()
      }
      const allText = (container) => container.textContent.replace(/\s+/g, " ").trim()
      const classes = (element) => [...element.classList].sort()
      const selector = (element) =>
        `${element.tagName.toLowerCase()}${element.id ? `#${CSS.escape(element.id)}` : ""}${classes(
          element,
        )
          .map((name) => `.${CSS.escape(name)}`)
          .join("")}`
      const elementBounds = (element) => {
        const rect = element.getBoundingClientRect()
        return Object.fromEntries(
          ["x", "y", "width", "height", "top", "right", "bottom", "left"].map((key) => [
            key,
            Number(rect[key].toFixed(2)),
          ]),
        )
      }
      const colorCanvas = document.createElement("canvas")
      colorCanvas.width = 1
      colorCanvas.height = 1
      const colorContext = colorCanvas.getContext("2d", { willReadFrequently: true })
      const rgba = (value) => {
        if (!value || value === "none" || !CSS.supports("color", value)) return [0, 0, 0, 0]
        colorContext.clearRect(0, 0, 1, 1)
        colorContext.fillStyle = value
        colorContext.fillRect(0, 0, 1, 1)
        const [r, g, b, alpha] = colorContext.getImageData(0, 0, 1, 1).data
        return [r, g, b, alpha / 255]
      }
      const composite = (front, back) => {
        const alpha = front[3] + back[3] * (1 - front[3])
        if (!alpha) return [0, 0, 0, 0]
        return [0, 1, 2]
          .map(
            (index) => (front[index] * front[3] + back[index] * back[3] * (1 - front[3])) / alpha,
          )
          .concat(alpha)
      }
      const effectivePaint = (element, property) => {
        const style = getComputedStyle(element)
        const color = rgba(style[property])
        const propertyOpacity =
          property === "fill"
            ? Number(style.fillOpacity)
            : property === "stroke"
              ? Number(style.strokeOpacity)
              : 1
        color[3] *= (Number(style.opacity) || 0) * propertyOpacity
        return color
      }
      const pseudoPaint = (element, pseudo, point) => {
        const style = getComputedStyle(element, pseudo)
        if (
          ["none", '""'].includes(style.content) ||
          style.display === "none" ||
          style.visibility === "hidden"
        )
          return [0, 0, 0, 0]
        const origin = element.getBoundingClientRect()
        const length = (value, fallback) => {
          const parsed = parseFloat(value)
          return Number.isFinite(parsed) ? parsed : fallback
        }
        const left = origin.left + length(style.left, 0)
        const top = origin.top + length(style.top, 0)
        const width = length(style.width, origin.width)
        const height = length(style.height, origin.height)
        if (point.x < left || point.x > left + width || point.y < top || point.y > top + height)
          return [0, 0, 0, 0]
        const color = rgba(style.backgroundColor)
        color[3] *= Number(style.opacity) || 0
        return color
      }
      const background = (element, includeSelf = true, samplePoint) => {
        const rect = element.getBoundingClientRect()
        const point = samplePoint ?? {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
        const stack = document.elementsFromPoint(point.x, point.y)
        const underlays = []
        if (element instanceof SVGElement && element.ownerSVGElement) {
          const candidates = [
            ...element.ownerSVGElement.querySelectorAll("rect,circle,ellipse,path,polygon"),
          ]
          for (const candidate of candidates.reverse()) {
            if (
              candidate === element ||
              candidate.closest("defs") ||
              !(candidate.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)
            )
              continue
            const matrix = candidate.getScreenCTM()
            if (!matrix) continue
            const local = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse())
            if (candidate.isPointInFill?.(local) || candidate.isPointInStroke?.(local))
              underlays.push(candidate)
          }
        }
        const stackIndex = stack.indexOf(element)
        const behind = stackIndex >= 0 ? stack.slice(stackIndex + 1) : stack
        const ancestors = []
        for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement)
          ancestors.push(ancestor)
        const candidates = [
          ...(includeSelf ? [element] : []),
          ...underlays,
          ...ancestors,
          ...behind.filter((candidate) => !underlays.includes(candidate)),
        ]
        let color = [0, 0, 0, 0]
        for (const candidate of candidates) {
          const paints = [
            pseudoPaint(candidate, "::after", point),
            pseudoPaint(candidate, "::before", point),
            candidate instanceof SVGGeometryElement
              ? effectivePaint(candidate, "fill")
              : effectivePaint(candidate, "backgroundColor"),
          ]
          for (const candidatePaint of paints) color = composite(color, candidatePaint)
          if (color[3] >= 0.999) break
        }
        return color[3] ? color : [255, 255, 255, 1]
      }
      const paint = (element, style = getComputedStyle(element)) => {
        const candidates =
          element instanceof SVGElement ? [style.fill, style.stroke, style.color] : [style.color]
        const value =
          candidates.find((candidate) => rgba(candidate)[3] > 0.05) ?? "rgba(0, 0, 0, 0)"
        return { value, color: rgba(value) }
      }
      const colorEvidence = (color) => color.map((channel) => Number(channel.toFixed(2)))
      const luminance = ([r, g, b]) =>
        [r, g, b]
          .map((channel) => {
            const value = channel / 255
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          })
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
      const ratio = (a, b) => {
        const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
        return (light + 0.05) / (dark + 0.05)
      }
      const violations = []
      const acceptedEllipsis = []
      const allowsDocumentedEllipsis = (element, style) => {
        const text = element.textContent.trim()
        const accessibleText = (element.getAttribute("aria-label") ?? text).trim()
        return (
          element.matches(".steptrace__phase-copy,.steptrace__contiguous-index") &&
          element.getAttribute("aria-hidden") !== "true" &&
          text.length > 0 &&
          accessibleText === text &&
          style.textOverflow === "ellipsis"
        )
      }
      const rootStyle = root.getBoundingClientRect()
      if (!root.children.length) violations.push("empty mount")
      for (const element of root.querySelectorAll("[viewBox],[transform],[style]")) {
        const source = `${element.getAttribute("viewBox") || ""} ${element.getAttribute("transform") || ""} ${element.getAttribute("style") || ""}`
        if (/NaN|Infinity/.test(source)) violations.push(`non-finite geometry: ${element.tagName}`)
      }
      if (
        root.scrollWidth > root.clientWidth + 2 &&
        !["auto", "scroll"].includes(getComputedStyle(root).overflowX)
      ) {
        violations.push(`root horizontal overflow ${root.scrollWidth - root.clientWidth}px`)
      }
      const clipping = []
      for (const element of root.querySelectorAll(
        "button,input,select,[role=status],.steptrace__legend,.steptrace__legend-wrap,.steptrace__counter,.steptrace__log-text,.steptrace__phase-copy,.steptrace__contiguous-index",
      )) {
        if (!visible(element)) continue
        const style = getComputedStyle(element)
        const clipsX = ["clip", "hidden"].includes(style.overflowX)
        const clipsY = ["clip", "hidden"].includes(style.overflowY)
        if (clipsX && element.scrollWidth > element.clientWidth + 1) {
          const evidence = {
            selector: selector(element),
            classes: classes(element),
            bounds: elementBounds(element),
            axis: "x",
            client: element.clientWidth,
            scroll: element.scrollWidth,
          }
          if (allowsDocumentedEllipsis(element, style)) acceptedEllipsis.push(evidence)
          else clipping.push(evidence)
        }
        if (clipsY && element.scrollHeight > element.clientHeight + 1)
          clipping.push({
            selector: selector(element),
            classes: classes(element),
            bounds: elementBounds(element),
            axis: "y",
            client: element.clientHeight,
            scroll: element.scrollHeight,
          })
      }
      for (const element of root.querySelectorAll(
        '.steptrace__distribution[data-profile="radix"] [data-section="source"] .steptrace__num',
      )) {
        if (!visible(element)) continue
        const clippingAncestor = element.closest(".steptrace__distribution-bars")
        const rect = element.getBoundingClientRect()
        const bounds = clippingAncestor?.getBoundingClientRect()
        const tolerance = 0.5
        if (
          !bounds ||
          rect.left < bounds.left - tolerance ||
          rect.right > bounds.right + tolerance ||
          rect.top < bounds.top - tolerance ||
          rect.bottom > bounds.bottom + tolerance
        )
          clipping.push({
            selector: selector(element),
            classes: classes(element),
            bounds: elementBounds(element),
            clippingAncestor: clippingAncestor ? selector(clippingAncestor) : null,
            clippingBounds: clippingAncestor ? elementBounds(clippingAncestor) : null,
            tolerance,
            reason: "radix source number escapes clipping ancestor",
          })
      }
      const containment = []
      for (const stage of root.querySelectorAll(
        ".steptrace__stage-col,.steptrace__structure-body,.steptrace__stage",
      )) {
        if (!visible(stage)) continue
        const bounds = stage.getBoundingClientRect()
        for (const child of stage.querySelectorAll(":scope > *")) {
          if (!visible(child)) continue
          const rect = child.getBoundingClientRect()
          const overflowX = rect.left < bounds.left - 2 || rect.right > bounds.right + 2
          const overflowY = rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2
          const scrollX = [stage, ...stage.querySelectorAll("*")].some((node) =>
            ["auto", "scroll"].includes(getComputedStyle(node).overflowX),
          )
          const scrollY = [stage, ...stage.querySelectorAll("*")].some((node) =>
            ["auto", "scroll"].includes(getComputedStyle(node).overflowY),
          )
          if (overflowX && !(oracle.scrollAxes.includes("x") && scrollX))
            containment.push({
              selector: selector(child),
              classes: classes(child),
              bounds: elementBounds(child),
              stageBounds: elementBounds(stage),
              axis: "x",
            })
          if (overflowY && !(oracle.scrollAxes.includes("y") && scrollY))
            containment.push({
              selector: selector(child),
              classes: classes(child),
              bounds: elementBounds(child),
              stageBounds: elementBounds(stage),
              axis: "y",
            })
        }
      }
      if (clipping.length) violations.push(`clipping failures: ${clipping.length}`)
      if (containment.length) violations.push(`stage containment failures: ${containment.length}`)
      const smallTargets = []
      for (const control of root.querySelectorAll("button,input,select,[tabindex]")) {
        if (!visible(control) || control.disabled) continue
        const rect = control.getBoundingClientRect()
        if (compact && (rect.width + 0.5 < 44 || rect.height + 0.5 < 44))
          smallTargets.push({
            selector: selector(control),
            classes: classes(control),
            bounds: elementBounds(control),
            required: 44,
            tolerance: 0.5,
          })
      }
      if (smallTargets.length) violations.push(`small target failures: ${smallTargets.length}`)
      const contrast = []
      for (const element of root.querySelectorAll(
        "button,input,select,textarea,label,span,p,li,td,th,text,[role=status]",
      )) {
        const text = element.textContent.trim()
        const control = element.closest("button,input,select,textarea")
        if (
          !visible(element) ||
          !text ||
          element.children.length ||
          (control && (control.matches(":disabled") || control.closest("[inert],[hidden]"))) ||
          element.closest('[aria-hidden="true"]') ||
          /^[\p{P}\p{S}\s]+$/u.test(text)
        )
          continue
        const style = getComputedStyle(element)
        const foreground = paint(element, style)
        const compositedBackground = background(element)
        const compositedForeground = composite(foreground.color, compositedBackground)
        const score = ratio(compositedForeground, compositedBackground)
        const size = parseFloat(style.fontSize)
        const weight = parseInt(style.fontWeight, 10) || 400
        const required = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5
        if (score + 0.02 < required)
          contrast.push({
            selector: selector(element),
            classes: classes(element),
            text: element.textContent.trim().slice(0, 60),
            computedForeground: foreground.value,
            compositedBackground: colorEvidence(compositedBackground),
            ratio: Number(score.toFixed(2)),
            requiredRatio: required,
            visible: visible(element),
            bounds: elementBounds(element),
          })
      }
      if (contrast.length) violations.push(`contrast failures: ${contrast.length}`)
      const nonTextContrast = []
      const componentRules = [
        ...root.querySelectorAll("button,input,select,textarea,[role=slider]"),
      ]
        .filter((element) => !element.matches(":disabled") && !element.closest("[inert],[hidden]"))
        .map((element) => ({ element, paint: "boundary", essential: "component" }))
      const graphicRules = (oracle.essentialGraphics ?? []).flatMap((rule) =>
        [...root.querySelectorAll(rule.selector)].map((element) => ({
          element,
          paint: rule.paint,
          sides: rule.sides,
          essential: "owner",
        })),
      )
      for (const rule of [...componentRules, ...graphicRules]) {
        const { element } = rule
        if (!visible(element)) continue
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        const failures = []
        const sideEvidence = []
        const componentBoundaryScores = []
        const backgroundPaint = rgba(style.backgroundColor)
        const sides = rule.sides ?? ["Top", "Right", "Bottom", "Left"]
        for (const side of sides) {
          if (
            parseFloat(style[`border${side}Width`]) > 0 &&
            !["none", "hidden"].includes(style[`border${side}Style`])
          ) {
            const border = rgba(style[`border${side}Color`])
            if (border[3] <= 0.05) continue
            const vertical = side === "Top" || side === "Bottom"
            const sign = side === "Top" || side === "Left" ? -1 : 1
            const edge = vertical
              ? { x: rect.left + rect.width / 2, y: sign < 0 ? rect.top : rect.bottom }
              : { x: sign < 0 ? rect.left : rect.right, y: rect.top + rect.height / 2 }
            const insidePoint = {
              x: edge.x - (vertical ? 0 : sign * 2),
              y: edge.y - (vertical ? sign * 2 : 0),
            }
            const outsidePoint = {
              x: edge.x + (vertical ? 0 : sign * 2),
              y: edge.y + (vertical ? sign * 2 : 0),
            }
            const adjacent = document.elementFromPoint(outsidePoint.x, outsidePoint.y)
            const outside =
              adjacent && adjacent !== element
                ? background(adjacent, true, outsidePoint)
                : background(element, false, outsidePoint)
            const insideBackdrop = background(element, false, insidePoint)
            const inside =
              backgroundPaint[3] > 0.05
                ? composite(backgroundPaint, insideBackdrop)
                : insideBackdrop
            const scores = [inside, outside].map((surface) =>
              ratio(composite(border, surface), surface),
            )
            sideEvidence.push({ side, color: colorEvidence(border), scores })
            if (rule.essential === "component") componentBoundaryScores.push(...scores)
            else if (Math.min(...scores) + 0.02 < 3) failures.push(...scores)
          }
        }
        if (!sideEvidence.length && rule.paint === "boundary" && backgroundPaint[3] > 0.05) {
          const backdrop = background(element, false)
          const score = ratio(composite(backgroundPaint, backdrop), backdrop)
          sideEvidence.push({
            side: "background",
            color: colorEvidence(backgroundPaint),
            scores: [score],
          })
          if (rule.essential === "component") componentBoundaryScores.push(score)
          else if (score + 0.02 < 3) failures.push(score)
        }
        if (element instanceof SVGGeometryElement && ["fill", "stroke"].includes(rule.paint)) {
          const color = effectivePaint(element, rule.paint)
          if (color[3] > 0.05) {
            const backdrop = background(element, false)
            const score = ratio(composite(color, backdrop), backdrop)
            sideEvidence.push({ side: rule.paint, color: colorEvidence(color), scores: [score] })
            if (score + 0.02 < 3) failures.push(score)
          }
        }
        if (
          rule.essential === "component" &&
          componentBoundaryScores.length &&
          Math.max(...componentBoundaryScores) + 0.02 < 3
        )
          failures.push(...componentBoundaryScores)
        if (failures.length)
          nonTextContrast.push({
            selector: selector(element),
            classes: classes(element),
            bounds: elementBounds(element),
            essential: rule.essential,
            boundaryEvidence: sideEvidence.map(({ side, color, scores }) => ({
              side,
              color,
              ratios: scores.map((score) => Number(score.toFixed(2))),
            })),
            ratio: Number(Math.min(...failures).toFixed(2)),
            requiredRatio: 3,
            visible: visible(element),
          })
      }
      if (nonTextContrast.length)
        violations.push(`non-text contrast failures: ${nonTextContrast.length}`)

      const cueFailures = []
      for (const cue of oracle.nonColorCues.filter((candidate) => candidate.state === state)) {
        const observed = []
        const hasCue = cue.alternatives.some((alternative) => {
          const candidates = [...root.querySelectorAll(alternative.selector)].filter(visible)
          const kinds = candidates.flatMap((element) => {
            const style = getComputedStyle(element)
            const present = []
            if (
              alternative.cueKinds.includes("text") &&
              element.getAttribute("aria-hidden") !== "true" &&
              observableText(element)
            )
              present.push("text")
            if (
              alternative.cueKinds.includes("shape") &&
              (element.matches("path,polygon,line,rect,circle") ||
                element.querySelector("path,polygon,line,rect,circle"))
            )
              present.push("shape")
            if (
              alternative.cueKinds.includes("marker") &&
              (element.hasAttribute("marker-start") ||
                element.hasAttribute("marker-end") ||
                element.querySelector("[marker-start],[marker-end],.steptrace__insight-marker"))
            )
              present.push("marker")
            if (alternative.cueKinds.includes("pseudo-content")) {
              const before = getComputedStyle(element, "::before").content
              const after = getComputedStyle(element, "::after").content
              if (!["none", '""'].includes(before) || !["none", '""'].includes(after))
                present.push("pseudo-content")
            }
            if (
              alternative.cueKinds.includes("border") &&
              style.borderStyle !== "none" &&
              parseFloat(style.borderWidth) > 0
            )
              present.push("border")
            if (
              alternative.cueKinds.includes("text-decoration") &&
              style.textDecorationLine !== "none"
            )
              present.push("text-decoration")
            return present
          })
          observed.push({ selector: alternative.selector, allowed: alternative.cueKinds, kinds })
          return kinds.length > 0
        })
        if (!hasCue)
          cueFailures.push({
            descriptorId: cue.descriptorId,
            state: cue.state,
            role: cue.role,
            alternatives: observed,
          })
      }
      if (cueFailures.length)
        violations.push(`fixture non-color cue failures: ${cueFailures.length}`)

      const familyGeometry = {
        arrowBounds: [],
        cellEndpoints: [],
        labelFit: [],
        maskedJoins: [],
        nodeEdgeClearance: [],
        pointerClearance: [],
      }
      const svgPoint = (element, x, y) => {
        const point = new DOMPoint(x, y).matrixTransform(element.getScreenCTM())
        return { x: point.x, y: point.y }
      }
      if (oracle.geometry.nodeEdgeClearance) {
        for (const svg of root.querySelectorAll("svg")) {
          const nodes = [...svg.querySelectorAll("circle")]
            .filter((node) => {
              const classes = node.getAttribute("class") ?? ""
              return (
                !node.closest("defs") &&
                node.closest(
                  ".node,.steptrace__node,.steptrace__gs-node,.steptrace__prefix-node,.steptrace__union-find-node,.steptrace__ufnode,.steptrace__rtnode,.steptrace__bt-tree-node",
                ) &&
                visible(node) &&
                !/target|halo|ring|marker|mark/.test(classes)
              )
            })
            .map((node) => {
              const rect = node.getBoundingClientRect()
              const fill = effectivePaint(node, "fill")
              return {
                element: node,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                r: Math.min(rect.width, rect.height) / 2,
                opacity: fill[3],
              }
            })
          for (const edge of svg.querySelectorAll(
            "line[class*='edge'],path[class*='edge'],line[marker-end],path[marker-end]",
          )) {
            if (edge.closest("defs")) continue
            let points = []
            if (edge.tagName.toLowerCase() === "line") {
              const start = svgPoint(edge, edge.x1.baseVal.value, edge.y1.baseVal.value)
              const end = svgPoint(edge, edge.x2.baseVal.value, edge.y2.baseVal.value)
              points = Array.from({ length: 33 }, (_, index) => ({
                x: start.x + ((end.x - start.x) * index) / 32,
                y: start.y + ((end.y - start.y) * index) / 32,
              }))
            } else if (typeof edge.getTotalLength === "function") {
              const length = edge.getTotalLength()
              if (length > 0)
                points = Array.from({ length: 33 }, (_, index) => {
                  const point = edge.getPointAtLength((length * index) / 32)
                  return svgPoint(edge, point.x, point.y)
                })
            }
            const occludes = (node, point) => {
              const stack = document.elementsFromPoint(point.x, point.y)
              const nodeIndex = stack.indexOf(node.element)
              const edgeIndex = stack.indexOf(edge)
              return nodeIndex >= 0 && (edgeIndex < 0 || nodeIndex < edgeIndex)
            }
            let crossing
            for (const node of nodes) {
              const hits = points
                .map((point, index) => ({ point, index }))
                .filter(
                  ({ point }) => Math.hypot(point.x - node.x, point.y - node.y) < node.r * 0.72,
                )
              if (!hits.length) continue
              if (node.opacity >= 0.999 && hits.every(({ point }) => occludes(node, point))) {
                familyGeometry.maskedJoins.push({
                  selector: selector(edge),
                  classes: classes(edge),
                  mask: selector(node.element),
                  maskOpacity: Number(node.opacity.toFixed(3)),
                })
                continue
              }
              crossing = node
              break
            }
            if (crossing)
              familyGeometry.nodeEdgeClearance.push({
                selector: selector(edge),
                classes: classes(edge),
                bounds: elementBounds(edge),
                collision: {
                  x: Number(crossing.x.toFixed(2)),
                  y: Number(crossing.y.toFixed(2)),
                },
                endpoints: [points[0], points.at(-1)].filter(Boolean).map((point) => ({
                  x: Number(point.x.toFixed(2)),
                  y: Number(point.y.toFixed(2)),
                })),
              })
          }
        }
      }
      if (oracle.geometry.arrowBounds) {
        for (const edge of root.querySelectorAll("svg [marker-end]")) {
          const style = getComputedStyle(edge)
          const rendered =
            !edge.closest("defs") &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0 &&
            [style.fill, style.stroke].some((value) => rgba(value)[3] > 0.05) &&
            (typeof edge.getTotalLength !== "function" || edge.getTotalLength() > 0)
          if (!rendered) continue
          const svg = edge.ownerSVGElement
          const box = edge.getBoundingClientRect()
          const bounds = svg.getBoundingClientRect()
          const marker = edge.getAttribute("marker-end")?.match(/#([^)]+)/)?.[1]
          if (!marker || !svg.querySelector(`#${CSS.escape(marker)}`))
            familyGeometry.arrowBounds.push({
              selector: selector(edge),
              classes: classes(edge),
              bounds: elementBounds(edge),
              reason: "missing arrow marker",
            })
          if (
            box.left < bounds.left - 2 ||
            box.right > bounds.right + 2 ||
            box.top < bounds.top - 2 ||
            box.bottom > bounds.bottom + 2
          )
            familyGeometry.arrowBounds.push({
              selector: selector(edge),
              classes: classes(edge),
              bounds: elementBounds(edge),
              svgBounds: elementBounds(svg),
              reason: "arrow escapes svg bounds",
            })
        }
      }
      if (oracle.geometry.pointerClearance) {
        for (const pointer of root.querySelectorAll(
          "[data-head='1'],[data-tail='1'],[class*='pointer-label'],[class*='pointer-arrow']",
        )) {
          if (!visible(pointer)) continue
          const stage = pointer.closest(
            ".steptrace__stage-col,.steptrace__structure-body,.steptrace__stage",
          )
          if (!stage) continue
          const rect = pointer.getBoundingClientRect()
          const bounds = stage.getBoundingClientRect()
          if (
            rect.left < bounds.left - 2 ||
            rect.right > bounds.right + 2 ||
            rect.top < bounds.top - 2 ||
            rect.bottom > bounds.bottom + 2
          )
            familyGeometry.pointerClearance.push({
              selector: selector(pointer),
              classes: classes(pointer),
              bounds: elementBounds(pointer),
              stageBounds: elementBounds(stage),
            })
        }
      }
      for (const rule of oracle.geometry.cellEndpoints) {
        for (const container of root.querySelectorAll(rule.containerSelector)) {
          if (!visible(container)) continue
          const cells = [...container.querySelectorAll(rule.cellSelector)].filter(visible)
          if (!cells.length) continue
          const bounds = container.getBoundingClientRect()
          const axis = rule.axis === "y" ? "y" : "x"
          const containerStyle = getComputedStyle(container)
          const flexDirection = containerStyle.flexDirection
          const reversed =
            (axis === "x" && flexDirection === "row-reverse") ||
            (axis === "y" && flexDirection === "column-reverse")
          const ordered = cells
            .map((cell, index) => ({
              cell,
              index,
              order: Number(getComputedStyle(cell).order) || 0,
              rect: cell.getBoundingClientRect(),
            }))
            .sort((a, b) => a.order - b.order || a.index - b.index)
          const logicalStart = ordered[0].rect
          const logicalEnd = ordered.at(-1).rect
          const borderStart = parseFloat(
            axis === "x" ? containerStyle.borderLeftWidth : containerStyle.borderTopWidth,
          )
          const borderEnd = parseFloat(
            axis === "x" ? containerStyle.borderRightWidth : containerStyle.borderBottomWidth,
          )
          const paddingStart = parseFloat(
            axis === "x" ? containerStyle.paddingLeft : containerStyle.paddingTop,
          )
          const paddingEnd = parseFloat(
            axis === "x" ? containerStyle.paddingRight : containerStyle.paddingBottom,
          )
          const edge = (rect, side) =>
            axis === "x"
              ? rect[side === "start" ? "left" : "right"] - bounds.left + container.scrollLeft
              : rect[side === "start" ? "top" : "bottom"] - bounds.top + container.scrollTop
          const extent = axis === "x" ? container.scrollWidth : container.scrollHeight
          const contentStart = borderStart + paddingStart
          const contentEnd = borderStart + extent - paddingEnd
          const endpointTolerance = 1
          const occupiedStart = edge(logicalStart, reversed ? "end" : "start")
          const occupiedEnd = edge(logicalEnd, reversed ? "start" : "end")
          const expectedStart = reversed ? contentEnd : contentStart
          const expectedEnd = reversed ? contentStart : contentEnd
          const startDelta = Math.abs(occupiedStart - expectedStart)
          const endDelta = Math.abs(occupiedEnd - expectedEnd)
          const overflow = axis === "x" ? containerStyle.overflowX : containerStyle.overflowY
          const truthfulScroll =
            oracle.scrollAxes.includes(axis) && ["auto", "scroll"].includes(overflow)
          const clipped =
            axis === "x"
              ? cells.some((cell) => {
                  const rect = cell.getBoundingClientRect()
                  return rect.left < bounds.left - 1 || rect.right > bounds.right + 1
                })
              : cells.some((cell) => {
                  const rect = cell.getBoundingClientRect()
                  return rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1
                })
          const occupied = rule.occupied ?? "both"
          if (
            (["start", "both"].includes(occupied) && startDelta > endpointTolerance) ||
            (["end", "both"].includes(occupied) && endDelta > endpointTolerance) ||
            (clipped && !truthfulScroll)
          ) {
            familyGeometry.cellEndpoints.push({
              selector: selector(container),
              classes: classes(container),
              bounds: elementBounds(container),
              family: rule.family,
              containerSelector: rule.containerSelector,
              cellSelector: rule.cellSelector,
              axis,
              firstBounds: elementBounds(ordered[0].cell),
              lastBounds: elementBounds(ordered.at(-1).cell),
              occupied,
              flexDirection,
              reversed,
              start: Number(occupiedStart.toFixed(2)),
              end: Number(occupiedEnd.toFixed(2)),
              extent,
              contentBox: {
                start: Number(contentStart.toFixed(2)),
                end: Number(contentEnd.toFixed(2)),
                borderStart,
                borderEnd,
                paddingStart,
                paddingEnd,
              },
              startDelta: Number(startDelta.toFixed(2)),
              endDelta: Number(endDelta.toFixed(2)),
              tolerance: endpointTolerance,
              clipped,
              truthfulScroll,
            })
          }
        }
      }
      if (oracle.geometry.labelFit) {
        for (const label of root.querySelectorAll(
          "text,.steptrace__legend li,.steptrace__contiguous-value,.steptrace__contiguous-index,[class*='label']",
        )) {
          if (!visible(label) || !label.textContent.trim()) continue
          if (label instanceof SVGGraphicsElement) {
            const box = label.getBoundingClientRect()
            const view = label.ownerSVGElement?.getBoundingClientRect()
            if (
              view &&
              (box.left < view.left - 1 ||
                box.top < view.top - 1 ||
                box.right > view.right + 1 ||
                box.bottom > view.bottom + 1)
            )
              familyGeometry.labelFit.push({
                selector: selector(label),
                classes: classes(label),
                bounds: elementBounds(label),
                containerBounds: elementBounds(label.ownerSVGElement),
                text: label.textContent.trim().slice(0, 40),
              })
          } else if (
            label.scrollWidth > label.clientWidth + 1 &&
            !["auto", "scroll"].includes(getComputedStyle(label).overflowX) &&
            !allowsDocumentedEllipsis(label, getComputedStyle(label))
          ) {
            familyGeometry.labelFit.push({
              selector: selector(label),
              classes: classes(label),
              bounds: elementBounds(label),
              text: label.textContent.trim().slice(0, 40),
              clientWidth: label.clientWidth,
              scrollWidth: label.scrollWidth,
            })
          }
        }
      }
      for (const [name, failures] of Object.entries(familyGeometry)) {
        if (name !== "maskedJoins" && failures.length)
          violations.push(`${name} failures: ${failures.length}`)
      }
      let observedOwnership = null
      if (root.dataset.visualFamily) {
        observedOwnership = `family:${root.dataset.visualFamily}`
      } else if (root.dataset.legacyRenderer) {
        observedOwnership = `legacy:${root.dataset.legacyRenderer}`
      }
      const computed = getComputedStyle(root)
      const probe = document.createElement("span")
      document.body.append(probe)
      const normalizeColor = (value) => {
        probe.style.setProperty("color", value, "important")
        return getComputedStyle(probe).color
      }
      const hostVisualIdentity = Object.fromEntries(
        [
          "page",
          "surface",
          "border",
          "neutral",
          "state-amber",
          "state-violet",
          "state-blue",
          "state-green",
          "state-red",
          "panel-shadow",
          "held-bg",
          "held-fg",
        ].map((role) => [
          role,
          {
            actual: normalizeColor(computed.getPropertyValue(`--st-${role}`).trim()),
            expected: normalizeColor(computed.getPropertyValue(`--host-st-${role}`).trim()),
          },
        ]),
      )
      probe.remove()
      const hostStyleMismatches = Object.entries(hostVisualIdentity)
        .filter(([, identity]) => identity.actual !== identity.expected)
        .map(([role]) => role)
      if (hostStyleMismatches.length)
        violations.push(`host-native visual identity mismatch: ${hostStyleMismatches.join(", ")}`)
      return {
        observedOwnership,
        hostVisualIdentity,
        violations,
        clipping,
        acceptedEllipsis,
        containment,
        smallTargets,
        contrast,
        nonTextContrast,
        cueFailures,
        familyGeometry,
        semantic: {
          text: observableText(root),
          controls: [...root.querySelectorAll("button,input,select,[role=slider]")]
            .filter(visible)
            .map((element) => element.getAttribute("aria-label") || observableText(element)),
          roles: [...root.querySelectorAll("[role]")]
            .filter(visible)
            .map((element) => element.getAttribute("role")),
          parityText: [
            ...root.querySelectorAll(
              ".steptrace__counter,.steptrace__insight-text,.steptrace__structure-status",
            ),
          ]
            .filter(visible)
            .map(observableText),
          visualFamily: root.dataset.visualFamily || root.dataset.structure || null,
          visibilityFiltered: true,
        },
        legacySemantic: {
          text: allText(root),
          controls: [...root.querySelectorAll("button,input,select,[role=slider]")].map(
            (element) => element.getAttribute("aria-label") || allText(element),
          ),
          roles: [...root.querySelectorAll("[role]")].map((element) =>
            element.getAttribute("role"),
          ),
          parityText: [
            ...root.querySelectorAll(
              ".steptrace__counter,.steptrace__insight-text,.steptrace__structure-status",
            ),
          ].map(allText),
          visualFamily: root.dataset.visualFamily || root.dataset.structure || null,
        },
        geometry: {
          width: rootStyle.width,
          height: rootStyle.height,
          scrollWidth: root.scrollWidth,
          scrollHeight: root.scrollHeight,
        },
      }
    },
    { compact, oracle, state },
  )
}

async function keyboardAndMotion(page, fixture) {
  const focusState = () =>
    page.evaluate(() => {
      const root = document.querySelector("#root")
      const active = document.activeElement
      if (!active || !root.contains(active)) return { useful: false, visible: false, ring: false }
      const style = getComputedStyle(active)
      const rect = active.getBoundingClientRect()
      return {
        useful: active.matches("button,input,select,[tabindex],[role=slider]"),
        visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden",
        ring:
          (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) ||
          (style.boxShadow !== "none" && style.boxShadow !== "0px 0px 0px 0px"),
      }
    })
  const waitForStatus = async (pattern) => {
    await page.waitForFunction(
      (source) =>
        new RegExp(source).test(document.querySelector('#root [role="status"]')?.textContent || ""),
      pattern,
      { timeout: 3000 },
    )
  }
  const fill = async (controls) => {
    await page.evaluate((values) => {
      const root = document.querySelector("#root")
      for (const [label, value] of Object.entries(values)) {
        const control = [...root.querySelectorAll("input,select")].find(
          (candidate) => candidate.getAttribute("aria-label") === label,
        )
        if (!control) throw new Error(`missing keyboard control ${label}`)
        control.value = value
        control.dispatchEvent(new Event("input", { bubbles: true }))
        control.dispatchEvent(new Event("change", { bubbles: true }))
      }
    }, controls)
  }

  await mount(page, fixture, "initial")
  const tabSetup = await page.evaluate(() => {
    const root = document.querySelector("#root")
    const visible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      )
    }
    const all = [...root.querySelectorAll("button,input,select,[tabindex],[role=slider]")]
    const focusable = all.filter(
      (element) =>
        visible(element) && !element.disabled && Number(element.getAttribute("tabindex") ?? 0) >= 0,
    )
    focusable.forEach((element, index) => (element.dataset.g001Focus = String(index)))
    document.body.tabIndex = -1
    document.body.focus()
    return { count: focusable.length }
  })
  const reached = new Set()
  const focusFailures = []
  for (let index = 0; index < tabSetup.count + 1; index++) {
    await page.keyboard.press("Tab")
    const current = await page.evaluate(() => document.activeElement?.dataset?.g001Focus ?? null)
    if (current != null) reached.add(current)
    const focus = await focusState()
    if (current != null && (!focus.useful || !focus.visible || !focus.ring))
      focusFailures.push(current)
  }

  const actions = []
  if (fixture.descriptorType === "frame") {
    await mount(page, fixture, "initial")
    const scrub = page.locator('#root [role="slider"][aria-label="Step"]')
    await scrub.focus()
    const max = Number(await scrub.getAttribute("aria-valuemax"))
    await page.keyboard.press("ArrowRight")
    const right = Number(await scrub.getAttribute("aria-valuenow"))
    await page.keyboard.press("ArrowLeft")
    const left = Number(await scrub.getAttribute("aria-valuenow"))
    await page.keyboard.press("End")
    const end = Number(await scrub.getAttribute("aria-valuenow"))
    await page.keyboard.press("Home")
    const home = Number(await scrub.getAttribute("aria-valuenow"))
    actions.push({
      action: "scrubber",
      pass: right === Math.min(1, max) && left === 0 && end === max && home === 0,
    })
    for (const key of ["Enter", "Space"]) {
      await mount(page, fixture, "initial")
      const forward = page.getByRole("button", { name: "Step forward", exact: true })
      await forward.focus()
      await page.keyboard.press(key)
      const now = Number(
        await page
          .locator('#root [role="slider"][aria-label="Step"]')
          .getAttribute("aria-valuenow"),
      )
      const focus = await focusState()
      actions.push({
        action: `button-${key}`,
        pass: now === Math.min(1, max) && focus.useful && focus.visible && focus.ring,
      })
    }
  } else {
    for (const key of ["Enter", "Space"]) {
      await mount(page, fixture, "initial")
      await fill(fixture.operations.valid.controls)
      const action = page.getByRole("button", {
        name: fixture.operations.valid.action,
        exact: true,
      })
      await action.focus()
      await page.keyboard.press(key)
      await waitForStatus(fixture.operations.valid.expected.status)
      const focus = await focusState()
      actions.push({ action: `valid-${key}`, pass: focus.useful && focus.visible && focus.ring })
    }
    await mount(page, fixture, "active")
    const reset = page.getByRole("button", { name: fixture.operations.reset.action, exact: true })
    await reset.focus()
    await page.keyboard.press("Space")
    await waitForStatus(fixture.operations.reset.expected.status)
    const focus = await focusState()
    actions.push({ action: "reset-Space", pass: focus.useful && focus.visible && focus.ring })
  }

  const motionSnapshot = () =>
    page.evaluate(() => {
      const root = document.querySelector("#root")
      const seconds = (value) =>
        value
          .split(",")
          .map((part) =>
            part.trim().endsWith("ms") ? parseFloat(part) / 1000 : parseFloat(part) || 0,
          )
      let positional = 0
      for (const element of root.querySelectorAll("*")) {
        const style = getComputedStyle(element)
        const properties = style.transitionProperty.split(",")
        const durations = seconds(style.transitionDuration)
        properties.forEach((property, index) => {
          if (/all|transform|translate|left|right|top|bottom|margin|width|height/.test(property))
            positional = Math.max(positional, durations[index] ?? durations[0] ?? 0)
        })
        if (style.animationName !== "none")
          positional = Math.max(positional, ...seconds(style.animationDuration))
      }
      return {
        positional,
        reducedClass: root.classList.contains("steptrace--reduced"),
        semantic: JSON.stringify({
          status: root.querySelector('[role="status"]')?.textContent?.trim() ?? "",
          counter: root.querySelector(".steptrace__counter")?.textContent?.trim() ?? "",
          states: [
            ...new Set(
              [...root.querySelectorAll("[data-state],[data-role],[data-active],[data-final]")]
                .flatMap((element) => [element.dataset.state, element.dataset.role])
                .filter(Boolean),
            ),
          ].sort(),
        }),
      }
    })
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await mount(page, fixture, "active")
  const normal = await motionSnapshot()
  await page.emulateMedia({ reducedMotion: "reduce" })
  await mount(page, fixture, "active")
  const reduced = await motionSnapshot()
  const motion = {
    normal,
    reduced,
    pass:
      normal.semantic === reduced.semantic &&
      reduced.reducedClass &&
      reduced.positional <= 0.01 &&
      (normal.positional <= 0.01 || reduced.positional < normal.positional),
  }
  return {
    applicable: true,
    pass:
      reached.size === tabSetup.count &&
      focusFailures.length === 0 &&
      actions.every(({ pass }) => pass) &&
      motion.pass,
    tabOrder: { ...tabSetup, reached: reached.size, focusFailures },
    actions,
    motion,
  }
}

async function runLifecycle() {
  mkdirSync(outputRoot, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    viewport: { width: 1000, height: 900 },
    reducedMotion: "reduce",
  })
  const records = []
  const record = (name, evidence, pass = true) => {
    records.push({ name, pass, evidence })
    assert.equal(pass, true, `${name}: ${JSON.stringify(evidence)}`)
  }
  await page.setContent(
    `<style>${shellCss}${engineCss}${quartzBindings}#root{width:705px}</style><div id="fixture"></div>`,
  )
  await page.addScriptTag({ content: generatedJs })
  const config = fixtures.find(({ id }) => id === "bubble-sort").config

  const compact = await page.evaluate(async (config) => {
    const fixture = document.querySelector("#fixture")
    const root = document.createElement("div")
    root.id = "root"
    fixture.append(root)
    const handle = globalThis.steptrace.mount(root, config)
    const settle = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    root.style.width = "703px"
    await settle()
    const compact = root.classList.contains("steptrace--narrow")
    const trace = [...root.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "Trace",
    )
    trace.focus()
    root.style.width = "705px"
    await settle()
    const active = document.activeElement
    const usefulFocus = active?.matches('[role="slider"][aria-label="Step"]') === true
    const activeStyle = active ? getComputedStyle(active) : null
    const activeRect = active?.getBoundingClientRect()
    const visibleFocus = Boolean(
      active &&
      activeRect &&
      activeStyle &&
      activeRect.width > 0 &&
      activeRect.height > 0 &&
      activeStyle.display !== "none" &&
      activeStyle.visibility !== "hidden" &&
      activeRect.right > 0 &&
      activeRect.bottom > 0 &&
      activeRect.left < innerWidth &&
      activeRect.top < innerHeight,
    )
    const rgb = (value) => {
      const match = value?.match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const values = match[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number)
      return values.length >= 3 ? values : null
    }
    const luminance = (color) =>
      color
        .slice(0, 3)
        .map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    const contrast = (a, b) => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (light + 0.05) / (dark + 0.05)
    }
    let backdrop = active?.parentElement
    let backdropColor = null
    while (backdrop && !backdropColor) {
      const candidate = rgb(getComputedStyle(backdrop).backgroundColor)
      if (candidate?.[3] !== 0) backdropColor = candidate
      backdrop = backdrop.parentElement
    }
    backdropColor ??= [255, 255, 255, 1]
    const outlineColor = rgb(activeStyle?.outlineColor)
    const ringContrast = outlineColor ? contrast(outlineColor, backdropColor) : 0
    const distinguishableRing = Boolean(
      activeStyle &&
      activeStyle.outlineStyle !== "none" &&
      parseFloat(activeStyle.outlineWidth) > 0 &&
      ringContrast >= 3,
    )
    const wide = !root.classList.contains("steptrace--narrow")
    handle.destroy()
    root.remove()
    return { compact, wide, usefulFocus, visibleFocus, distinguishableRing, ringContrast }
  }, config)
  record(
    "compact-boundary-retains-useful-focus",
    compact,
    compact.compact &&
      compact.wide &&
      compact.usefulFocus &&
      compact.visibleFocus &&
      compact.distinguishableRing,
  )

  const visibility = await page.evaluate(async (config) => {
    const fixture = document.querySelector("#fixture")
    const panel = document.createElement("section")
    panel.className = "tabsdown__panel"
    panel.hidden = true
    const root = document.createElement("div")
    panel.append(root)
    fixture.append(panel)
    const handle = globalThis.steptrace.mount(root, config)
    const settle = () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    await settle()
    const initiallyEmpty = root.children.length === 0
    panel.hidden = false
    await settle()
    const mountedAfterShow = root.querySelectorAll(".steptrace__head").length === 1
    const scrub = root.querySelector('[role="slider"][aria-label="Step"]')
    scrub.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    const beforeHide = scrub.getAttribute("aria-valuenow")
    root.querySelector('button[aria-label="Play"]').click()
    panel.hidden = true
    await settle()
    const pausedAt = scrub.getAttribute("aria-valuenow")
    await new Promise((resolve) => setTimeout(resolve, 700))
    const preservedAt = scrub.getAttribute("aria-valuenow")
    panel.hidden = false
    await new Promise((resolve) => setTimeout(resolve, 700))
    const resumedAt = scrub.getAttribute("aria-valuenow")
    root.querySelector('button[aria-label="Restart"]').click()
    const stoppedAt = scrub.getAttribute("aria-valuenow")
    panel.hidden = true
    await settle()
    panel.hidden = false
    await new Promise((resolve) => setTimeout(resolve, 700))
    const stayedStopped = scrub.getAttribute("aria-valuenow")
    panel.hidden = true
    panel.hidden = false
    panel.hidden = true
    panel.hidden = false
    await settle()
    const mountCount = root.querySelectorAll(".steptrace__head").length
    const beforeStep = Number(scrub.getAttribute("aria-valuenow"))
    root.querySelector('button[aria-label="Step forward"]').click()
    const afterStep = Number(scrub.getAttribute("aria-valuenow"))
    handle.destroy()
    handle.destroy()
    panel.hidden = true
    panel.hidden = false
    await settle()
    const emptyAfterDestroy = root.children.length === 0
    panel.remove()
    return {
      initiallyEmpty,
      mountedAfterShow,
      beforeHide,
      pausedAt,
      preservedAt,
      resumedAt,
      stoppedAt,
      stayedStopped,
      mountCount,
      beforeStep,
      afterStep,
      emptyAfterDestroy,
    }
  }, config)
  record(
    "hidden-tabsdown-defers-mount",
    visibility,
    visibility.initiallyEmpty && visibility.mountedAfterShow,
  )
  record(
    "hide-pauses-and-preserves-step",
    visibility,
    visibility.pausedAt === visibility.preservedAt,
  )
  record(
    "show-resumes-only-previous-playback",
    visibility,
    Number(visibility.resumedAt) > Number(visibility.preservedAt) &&
      visibility.stoppedAt === visibility.stayedStopped,
  )
  record(
    "rerender-observer-no-duplicate-mounts-or-listeners",
    visibility,
    visibility.mountCount === 1 && visibility.afterStep === visibility.beforeStep + 1,
  )
  record("destroy-disconnects-and-is-idempotent", visibility, visibility.emptyAfterDestroy)

  const quartzSource = readFileSync(
    join(repoRoot, "Web", "custom", "components", "steptrace.tsx"),
    "utf8",
  )
  const hydrateMatch = quartzSource.match(/const hydrate = `([\s\S]*?)`\n\nexport const Steptrace/)
  assert.ok(hydrateMatch, "could not extract Quartz StepTrace hydrator")
  const hydrate = hydrateMatch[1]
    .replaceAll("${JSON.stringify(STYLE_URL)}", JSON.stringify("data:text/css,.steptrace{}"))
    .replaceAll("${JSON.stringify(ENGINE_URL)}", JSON.stringify("data:text/javascript,"))
  await page.setContent(
    '<link data-steptrace-style="1" rel="stylesheet" href="data:text/css,.steptrace{}"><div class="tabsdown" data-tabsdown="interactive"><div class="steptrace-mount" data-config="{&quot;algorithm&quot;:&quot;bubble-sort&quot;}"></div></div>',
  )
  await page.evaluate(() => {
    globalThis.__quartzMounts = 0
    globalThis.__quartzDestroys = 0
    globalThis.steptrace = {
      mount(root) {
        globalThis.__quartzMounts++
        root.textContent = "mounted"
        return {
          destroy() {
            globalThis.__quartzDestroys++
          },
        }
      },
    }
  })
  await page.addScriptTag({ content: hydrate })
  await page.waitForFunction(() => globalThis.__quartzMounts === 1)
  const quartz = await page.evaluate(async () => {
    document.dispatchEvent(new Event("render"))
    document.dispatchEvent(new Event("nav"))
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const mountsAfterRerender = globalThis.__quartzMounts
    document.dispatchEvent(new Event("prenav"))
    const destroysBeforeReplacement = globalThis.__quartzDestroys
    document.querySelector(".steptrace-mount").remove()
    return { mountsAfterRerender, destroysBeforeReplacement }
  })
  record(
    "quartz-prenav-destroys-before-replacement",
    quartz,
    quartz.mountsAfterRerender === 1 && quartz.destroysBeforeReplacement === 1,
  )

  const obsidianBundle = buildSync({
    entryPoints: [join(repoRoot, "Web", "custom", "steptrace", "src", "entries", "obsidian.cts")],
    bundle: true,
    format: "cjs",
    platform: "browser",
    external: ["obsidian"],
    write: false,
  }).outputFiles[0].text
  await page.setContent('<div id="obsidian"></div>')
  const obsidian = await page.evaluate(async (bundle) => {
    const processors = new Map()
    let command = null
    const reload = []
    class Plugin {
      constructor() {
        this.manifest = { id: "steptrace" }
        this.app = {
          plugins: {
            getPlugin: () => null,
            disablePlugin: async (id) => reload.push(`disable:${id}`),
            enablePlugin: async (id) => reload.push(`enable:${id}`),
          },
        }
      }
      registerMarkdownCodeBlockProcessor(name, callback) {
        processors.set(name, callback)
      }
      addCommand(next) {
        command = next
      }
    }
    class MarkdownRenderChild {
      constructor(el) {
        this.containerEl = el
      }
    }
    class Notice {
      constructor(message) {
        reload.push(message)
      }
    }
    class SliderComponent {
      constructor(container) {
        this.sliderEl = document.createElement("input")
        container.append(this.sliderEl)
      }
      setLimits() {
        return this
      }
      setInstant() {
        return this
      }
      setDisplayFormat() {
        return this
      }
      setDynamicTooltip() {
        return this
      }
      setValue() {
        return this
      }
      onChange() {
        return this
      }
    }
    const module = { exports: {} }
    const require = (name) => {
      if (name !== "obsidian") throw new Error(`unexpected external ${name}`)
      return { Plugin, MarkdownRenderChild, Notice, SliderComponent }
    }
    new Function("module", "exports", "require", bundle)(module, module.exports, require)
    const plugin = new module.exports()
    plugin.onload()
    const host = document.querySelector("#obsidian")
    host.createEl = function (tag, options = {}) {
      const child = document.createElement(tag)
      if (options.text) child.textContent = options.text
      child.createEl = this.createEl
      this.append(child)
      return child
    }
    let child = null
    processors.get("steptrace")('{"algorithm":"arrays"}', host, {
      addChild(value) {
        child = value
      },
    })
    const mounted = host.querySelector(".steptrace") != null
    child.onunload()
    const destroyed = host.querySelector(".steptrace") == null
    await command.callback()
    return { mounted, destroyed, reload }
  }, obsidianBundle)
  record(
    "obsidian-unload-destroys-and-reload-rebuilds",
    obsidian,
    obsidian.mounted &&
      obsidian.destroyed &&
      obsidian.reload.join("|") === "disable:steptrace|enable:steptrace|steptrace reloaded",
  )

  await browser.close()
  const summary = {
    schemaVersion: 2,
    mode: "lifecycle",
    count: records.length,
    passed: records.filter(({ pass }) => pass).length,
    records,
  }
  writeFileSync(summaryPath, stableJson(summary), { flag: "wx" })
  console.log(
    `steptrace lifecycle: ${summary.passed}/${summary.count} regressions passed; ${summaryPath}`,
  )
}

async function runPromotionProtocolSelfChecks(checks) {
  const scratch = mkdtempSync(join(tmpdir(), "g008-protocol-"))
  const prefix = scratch
    .split(sep)
    .at(-1)
    .replace(/[^A-Za-z0-9_-]/g, "-")
  const created = []
  const fixture = fixtures.find(({ id }) => id === "activity-selection")
  assert.ok(fixture, "missing promotion self-check fixture")
  const key = "quartz/light/wide/activity-selection/initial"
  const baselineRecord = baseline.records.find((record) => record.key === key)
  assert.ok(baselineRecord?.screenshot, "missing promotion self-check baseline")
  const selectedKeys = new Set([key])
  const matrix = expectedVisualMatrix([fixture], baseline, selectedKeys)
  const baselineTreeFixture = treeSeal(baselineRoot)
  const producerId = "producer-self-check"
  const reviewerId = "reviewer-self-check"

  const baseMetrics = () => ({
    observedOwnership: fixture.ownership,
    violations: [],
    clipping: [],
    acceptedEllipsis: [],
    containment: [],
    smallTargets: [],
    contrast: [],
    nonTextContrast: [],
    cueFailures: [],
    familyGeometry: {
      arrowBounds: [],
      cellEndpoints: [],
      labelFit: [],
      maskedJoins: [],
      nodeEdgeClearance: [],
      pointerClearance: [],
    },
    runtimeErrors: [],
    keyboardAndMotion: { pass: true },
    legacySemantic: baselineRecord.metrics.semantic,
    semantic: baselineRecord.metrics.semantic,
  })

  const makeScenario = async (label, options = {}) => {
    const candidateRunId = `${prefix}-${label}`
    const root = join(visualRoot, "candidate", candidateRunId)
    const reviewRoot = join(evidenceRoot, "quality-gate", "reviews", candidateRunId)
    mkdirSync(join(root, key), { recursive: true })
    mkdirSync(reviewRoot, { recursive: true })
    const metrics = options.metrics?.(baseMetrics()) ?? baseMetrics()
    const metricsFile = join(root, key, "metrics.json")
    const screenshotFile = join(root, key, "screenshot.png")
    writeFileSync(metricsFile, stableJson(metrics))
    writeFileSync(
      screenshotFile,
      options.screenshot ??
        (await sharp({ create: { width: 2, height: 2, channels: 4, background: "#ffffff" } })
          .png()
          .toBuffer()),
    )
    const record = {
      key,
      id: fixture.id,
      descriptorType: fixture.descriptorType,
      host: "quartz",
      theme: "light",
      width: "wide",
      viewport: { width: 1148, height: 1000, deviceScaleFactor: 1 },
      state: "initial",
      ownership: fixture.ownership,
      metrics,
      metricsArtifact: `${key}/metrics.json`,
      metricsHash: sha256(readFileSync(metricsFile)),
      screenshot: posixRelative(visualRoot, screenshotFile),
      screenshotHash: sha256(readFileSync(screenshotFile)),
    }
    const records = options.records?.(record) ?? [record]
    const baselineFile = resolveCandidateFile(visualRoot, baselineRecord.screenshot)
    const entry = {
      identity: identityFor(record),
      owner: record.ownership,
      baseline: baselineRecord.screenshot,
      candidate: record.screenshot,
      baselineHash: sha256(readFileSync(baselineFile)),
      candidateHash: record.screenshotHash,
      descriptorIds: [record.id],
      classification: "approval-required",
    }
    const disposition = {
      schemaVersion: 2,
      runId: candidateRunId,
      entries: options.entries?.(entry) ?? [entry],
    }
    const environment = {
      node: "v22.23.2",
      platform: "darwin",
      arch: "arm64",
      playwright: "1.62.0",
      chromium: { path: "self-check", bytes: 1, sha256: "a".repeat(64) },
    }
    const inputs = [{ path: "<loaded>/self-check", bytes: 1, sha256: "b".repeat(64) }]
    const captureSnapshot = {
      schemaVersion: 2,
      algorithm: "sha256",
      launchManifest,
      launchManifestHash,
      inputs,
      environment,
      sourceHashes: { "self-check-source": "c".repeat(64) },
      generatedHashes: { "self-check-generated": "d".repeat(64) },
      baselineTree: baselineTreeFixture,
      fingerprint: sha256(stableJson({ launchManifestHash, inputs, environment })),
    }
    const summaryCore = options.summary?.({
      schemaVersion: 4,
      mode: "candidate",
      runId: candidateRunId,
      captureSeal: captureSnapshot,
      productFailures: [],
      approvalFailures: [{ identity: entry.identity, reason: "approval required" }],
      status: "pending-approval",
      records,
    }) ?? {
      schemaVersion: 4,
      mode: "candidate",
      runId: candidateRunId,
      captureSeal: captureSnapshot,
      productFailures: [],
      approvalFailures: [{ identity: entry.identity, reason: "approval required" }],
      status: "pending-approval",
      records,
    }
    writeCandidateSeal({
      root,
      candidateRunId,
      summaryCore,
      disposition,
      captureSnapshot,
    })
    const { anchor: captureAnchor, anchorPath } = writeCaptureAnchor({
      root,
      candidateRunId,
      captureSnapshot,
      captureProducerAgentId: producerId,
    })
    const captureAnchorHash = sha256(readFileSync(anchorPath))
    const reviewFile = join(reviewRoot, "review.md")
    const reviewerToolFile = join(reviewRoot, "reviewer-tool.mjs")
    writeFileSync(reviewFile, "Independent regular-file visual review.")
    writeFileSync(reviewerToolFile, "export const reviewer = 'self-check'\n")
    const reviewArtifact = posixRelative(evidenceRoot, reviewFile)
    const approval = {
      schemaVersion: 2,
      protocol: "steptrace-visual-approval-v2",
      candidateRunId,
      producerRunId: candidateRunId,
      producerAgentId: producerId,
      producerToolId: captureAnchor.tool.id,
      reviewerAgentId: reviewerId,
      reviewerToolId: "steptrace-review-self-check-v1",
      owner: record.ownership,
      identity: identityFor(record),
      baselineArtifact: entry.baseline,
      baselineHash: entry.baselineHash,
      candidateArtifact: record.screenshot,
      candidateHash: record.screenshotHash,
      descriptorIds: [record.id],
      classification: "accepted-canonical-shift",
      reviewerRole: "vision",
      reason: "Synthetic immutable candidate accepted.",
      reviewArtifact,
      reviewArtifactHash: sha256(readFileSync(reviewFile)),
    }
    const reviewAnchor = writeReviewAnchor({
      context: {
        runId: candidateRunId,
        producerAgentId: producerId,
        producerTool: captureAnchor.tool,
        captureAnchorHash,
      },
      approvals: [approval],
      reviewerTool: {
        id: approval.reviewerToolId,
        path: posixRelative(evidenceRoot, reviewerToolFile),
      },
    })
    approval.reviewAnchor = reviewAnchor.artifact
    approval.reviewAnchorHash = reviewAnchor.hash
    const hostReceiptFiles = new Map()
    const writeScenarioHostReceipt = (host) => {
      const hostRoot = resolve(canonicalHostReceiptPath(candidateRunId, host), "..")
      const hostArtifactFile = join(hostRoot, "artifacts", "smoke.txt")
      mkdirSync(resolve(hostArtifactFile, ".."), { recursive: true })
      writeFileSync(hostArtifactFile, `${host} host proof`)
      const hostArtifact = posixRelative(evidenceRoot, hostArtifactFile)
      const result = writeHostReceipt({
        host,
        runId: candidateRunId,
        runnerAgentId: `${host}-runner-self-check`,
        checks: [{ id: `${host}-smoke`, status: "PASS", artifacts: [hostArtifact] }],
        artifacts: [hostArtifact],
        cleanup: { processTerminated: true, portsReleased: true },
      })
      hostReceiptFiles.set(host, canonicalHostReceiptPath(candidateRunId, host))
      return result.path
    }
    const hostReceipts = {
      quartz: writeScenarioHostReceipt("quartz"),
      obsidian: writeScenarioHostReceipt("obsidian"),
    }
    const evaluate = (ledger = [approval], overrides = {}) =>
      evaluateSealedCandidate({
        root,
        expectedRunId: candidateRunId,
        ledger,
        ledgerBytes: Buffer.from(stableJson({ accepted: ledger })),
        currentSnapshot: captureSnapshot,
        hostReceipts,
        expectedMatrix: matrix,
        ...overrides,
      })
    const scenario = {
      candidateRunId,
      root,
      reviewRoot,
      reviewAnchorPath: reviewAnchor.path,
      extraReviewAnchorPaths: [],
      anchorPath,
      captureSnapshot,
      captureAnchor,
      captureAnchorHash,
      record,
      entry,
      approval,
      reviewFile,
      reviewerToolFile,
      screenshotFile,
      metricsFile,
      hostReceipts,
      hostReceiptFiles,
      evaluate,
    }
    created.push(scenario)
    return scenario
  }

  const snapshotCandidateFiles = (root) =>
    new Map(regularFiles(root).map((path) => [posixRelative(root, path), readFileSync(path)]))
  const restoreCandidateFiles = (root, files) => {
    rmSync(root, { recursive: true, force: true })
    for (const [artifact, bytes] of files) {
      const path = join(root, artifact)
      mkdirSync(resolve(path, ".."), { recursive: true })
      writeFileSync(path, bytes)
    }
  }
  const withMutatedJson = async (path, mutate, action) => {
    const bytes = readFileSync(path)
    const value = JSON.parse(bytes)
    mutate(value)
    writeFileSync(path, stableJson(value))
    try {
      await action()
    } finally {
      writeFileSync(path, bytes)
    }
  }
  const resealWithoutAnchor = (scenario, mutate) => {
    const summary = JSON.parse(readFileSync(join(scenario.root, "summary.json"), "utf8"))
    const disposition = JSON.parse(
      readFileSync(join(scenario.root, "diff-disposition.json"), "utf8"),
    )
    const { candidateTree: _tree, candidateSealHash: _sealHash, ...summaryCore } = summary
    mutate({ summaryCore, disposition })
    writeFileSync(join(scenario.root, "diff-disposition.json"), stableJson(disposition))
    const candidateTree = treeSeal(scenario.root, new Set(["summary.json", "candidate-seal.json"]))
    const candidateSeal = {
      schemaVersion: 1,
      runId: scenario.candidateRunId,
      captureSealFingerprint: summaryCore.captureSeal.fingerprint,
      launchManifestHash: summaryCore.captureSeal.launchManifestHash,
      summaryCoreHash: sha256(stableJson(summaryCore)),
      candidateTree,
    }
    const candidateSealBytes = stableJson(candidateSeal)
    writeFileSync(join(scenario.root, "candidate-seal.json"), candidateSealBytes)
    writeFileSync(
      join(scenario.root, "summary.json"),
      stableJson({
        ...summaryCore,
        candidateTree,
        candidateSealHash: sha256(candidateSealBytes),
      }),
    )
  }

  try {
    const base = await makeScenario("base")
    const pending = await base.evaluate([])
    checks.promotionSealedCandidatePendingBeforeApproval = pending.status === "pending-approval"
    const promoted = await base.evaluate()
    checks.promotionSameSealedCandidatePassesAfterApproval = promoted.status === "promoted"
    checks.promotionLaunchManifestBound =
      base.captureAnchor.launchManifestHash === launchManifestHash &&
      base.captureAnchor.captureSeal.launchManifestHash === launchManifestHash
    checks.promotionQuartzHostReceiptWriterRoundTrip =
      JSON.parse(readFileSync(base.hostReceiptFiles.get("quartz"))).schemaVersion === 2
    checks.promotionObsidianHostReceiptWriterRoundTrip =
      JSON.parse(readFileSync(base.hostReceiptFiles.get("obsidian"))).schemaVersion === 2
    checks.promotionDispositionSchemaValidated = true
    checks.promotionMetricScreenshotIdentityConsistent =
      promoted.identityValidation.includes("exact")
    assert.throws(() => writeFileSync(base.anchorPath, "duplicate", { flag: "wx" }), /EEXIST/)
    checks.promotionCaptureAnchorExclusiveWrite = true

    const unsealed = await makeScenario("unsealed", {
      summary: (summary) => ({ ...summary, schemaVersion: 3 }),
    })
    await assert.rejects(() => unsealed.evaluate(), /schema v4/)
    checks.promotionUnsealedCandidateRejected = true

    const productCases = {
      Runtime: (metrics) => ({ ...metrics, runtimeErrors: ["boom"] }),
      Accessibility: (metrics) => ({ ...metrics, contrast: [{ selector: ".bad" }] }),
      Geometry: (metrics) => ({
        ...metrics,
        familyGeometry: { ...metrics.familyGeometry, arrowBounds: [{ selector: ".bad" }] },
      }),
      Semantic: (metrics) => ({ ...metrics, legacySemantic: { text: "forged" } }),
      Ownership: (metrics) => ({ ...metrics, observedOwnership: "family:forged" }),
      Behavior: (metrics) => ({ ...metrics, violations: ["empty mount"] }),
      Motion: (metrics) => ({ ...metrics, keyboardAndMotion: { pass: false } }),
    }
    for (const [name, mutateMetrics] of Object.entries(productCases)) {
      const scenario = await makeScenario(`product-${name.toLowerCase()}`, {
        metrics: mutateMetrics,
      })
      const result = await scenario.evaluate()
      checks[`promotion${name}CannotBeApproved`] = result.status === "failed-product"
      if (name === "Behavior")
        checks.promotionSummaryProductFailureErasureRejected = result.productFailures.some(
          ({ violations }) => violations.includes("empty mount"),
        )
      if (name === "Behavior")
        checks.promotionProductFailurePrecedesHostEvidence =
          (
            await scenario.evaluate([], {
              hostReceipts: { quartz: "missing", obsidian: "missing" },
            })
          ).status === "failed-product"
    }

    for (const field of ["host", "theme", "viewport", "state"]) {
      const replay = {
        ...base.approval,
        identity: {
          ...base.approval.identity,
          [field]:
            field === "viewport" ? { ...base.approval.identity.viewport, width: 999 } : "replay",
        },
      }
      await assert.rejects(() => base.evaluate([replay]), /anchored approval identity set mismatch/)
      checks[`promotion${field[0].toUpperCase()}${field.slice(1)}ReplayRejected`] = true
    }

    const baseFiles = snapshotCandidateFiles(base.root)
    const screenshotBytes = readFileSync(base.screenshotFile)
    writeFileSync(base.screenshotFile, Buffer.concat([screenshotBytes, Buffer.from([0])]))
    await assert.rejects(() => base.evaluate(), /candidate tree does not match anchor/)
    checks.promotionCandidateByteMutationRejected = true
    restoreCandidateFiles(base.root, baseFiles)

    const toctou = await makeScenario("screenshot-toctou")
    const toctouFiles = snapshotCandidateFiles(toctou.root)
    await assert.rejects(
      () =>
        toctou.evaluate(undefined, {
          beforePromotionFinalize: () =>
            writeFileSync(
              toctou.screenshotFile,
              Buffer.concat([readFileSync(toctou.screenshotFile), Buffer.from([0])]),
            ),
        }),
      /candidate tree changed before promotion receipt/,
    )
    checks.promotionScreenshotToctouRejected = true
    restoreCandidateFiles(toctou.root, toctouFiles)

    const summaryFile = join(base.root, "summary.json")
    writeFileSync(summaryFile, `${readFileSync(summaryFile, "utf8")} `)
    await assert.rejects(() => base.evaluate(), /candidate tree does not match anchor|byte-mutated/)
    checks.promotionSummaryByteMutationRejected = true
    restoreCandidateFiles(base.root, baseFiles)

    resealWithoutAnchor(base, ({ summaryCore }) => {
      summaryCore.status = "promotable"
      summaryCore.approvalFailures = []
    })
    await assert.rejects(() => base.evaluate(), /candidate tree does not match anchor/)
    checks.promotionCoordinatedResealWithoutAnchorRejected = true
    restoreCandidateFiles(base.root, baseFiles)

    const escaped = join(base.root, "escaped.png")
    symlinkSync(base.screenshotFile, escaped)
    checks.promotionSymlinkArtifactRejected =
      resolveCandidateFile(base.root, "escaped.png") === null
    rmSync(escaped)
    checks.promotionTraversalArtifactRejected =
      resolveCandidateFile(base.root, "../summary.json") === null
    checks.promotionDirectoryArtifactRejected = resolveCandidateFile(base.root, "quartz") === null
    checks.promotionMissingArtifactRejected =
      resolveCandidateFile(base.root, "missing.png") === null
    await assert.rejects(
      () => base.evaluate([{ ...base.approval, reviewerRole: "executor" }]),
      /approval and review anchor identities differ|anchored approval identity set mismatch/,
    )
    checks.promotionInvalidReviewerRejected = true
    await assert.rejects(
      () => base.evaluate([{ ...base.approval, reviewerAgentId: "" }]),
      /non-canonical review anchor path/,
    )
    checks.promotionMissingReviewerIdentityRejected = true
    await assert.rejects(
      () => base.evaluate([{ ...base.approval, reviewerAgentId: base.approval.producerAgentId }]),
      /non-canonical review anchor path/,
    )
    checks.promotionForgedReviewerIdentityRejected = true

    const reviewBytes = readFileSync(base.reviewFile)
    writeFileSync(base.reviewFile, Buffer.concat([reviewBytes, Buffer.from("mutation")]))
    await assert.rejects(() => base.evaluate(), /anchored review artifact/)
    checks.promotionReviewArtifactMutationRejected = true
    writeFileSync(base.reviewFile, reviewBytes)
    await assert.rejects(
      () => base.evaluate([{ ...base.approval, reviewArtifactHash: "0".repeat(64) }]),
      /review artifact set mismatch|anchored approval identity set mismatch/,
    )
    checks.promotionReviewArtifactHashRejected = true

    await assert.rejects(
      () =>
        base.evaluate(undefined, {
          expectedRunId: `${base.candidateRunId}-copy`,
        }),
      /capture anchor|run id/,
    )
    checks.promotionCliCandidateRunIdCopyRejected = true

    await assert.rejects(
      () =>
        base.evaluate(undefined, {
          currentSnapshot: {
            ...base.captureSnapshot,
            fingerprint: "0".repeat(64),
          },
        }),
      /stale input fingerprint/,
    )
    checks.promotionStaleRenderInputRejected = true
    await assert.rejects(
      () =>
        base.evaluate(undefined, {
          currentSnapshot: {
            ...base.captureSnapshot,
            environment: { ...base.captureSnapshot.environment, node: "v23" },
          },
        }),
      /stale capture environment/,
    )
    checks.promotionStaleEnvironmentRejected = true
    assert.throws(
      () =>
        assertCaptureSnapshotUnchanged(base.captureSnapshot, {
          ...base.captureSnapshot,
          fingerprint: "race",
        }),
      /changed during browser run/,
    )
    checks.promotionCaptureInputRaceRejected = true

    await assert.rejects(
      () => base.evaluate(undefined, { hostReceipts: { ...base.hostReceipts, quartz: "missing" } }),
      /non-canonical quartz host receipt path/,
    )
    checks.promotionMissingHostReceiptRejected = true
    await withMutatedJson(
      base.hostReceiptFiles.get("quartz"),
      (receipt) => (receipt.inputFingerprint = "stale"),
      () => assert.rejects(() => base.evaluate(), /inputFingerprint/),
    )
    checks.promotionStaleHostReceiptRejected = true
    await withMutatedJson(
      base.hostReceiptFiles.get("quartz"),
      (receipt) => (receipt.runId = "other-run"),
      () => assert.rejects(() => base.evaluate(), /host receipt run id mismatch/),
    )
    checks.promotionCrossRunHostReceiptRejected = true
    await withMutatedJson(
      base.hostReceiptFiles.get("quartz"),
      (receipt) => (receipt.status = "FAIL"),
      () => assert.rejects(() => base.evaluate(), /host smoke did not pass/),
    )
    checks.promotionFailedHostReceiptRejected = true
    const forgedHost = join(base.reviewRoot, "forged-host.json")
    writeFileSync(forgedHost, readFileSync(base.hostReceiptFiles.get("quartz")))
    await assert.rejects(
      () =>
        base.evaluate(undefined, {
          hostReceipts: {
            ...base.hostReceipts,
            quartz: posixRelative(evidenceRoot, forgedHost),
          },
        }),
      /non-canonical quartz host receipt path/,
    )
    checks.promotionForgedArbitraryHostReceiptRejected = true

    const falseExact = await makeScenario("false-exact", {
      entries: (entry) => [{ ...entry, classification: "exact-baseline" }],
    })
    await assert.rejects(() => falseExact.evaluate(), /false exact-baseline/)
    checks.promotionFalseExactBaselineRejected = true
    const substitute = baseline.records.find(
      (record) => record.screenshot && record.key !== key,
    ).screenshot
    const baselineSubstitution = await makeScenario("baseline-substitution", {
      entries: (entry) => [{ ...entry, baseline: substitute }],
    })
    await assert.rejects(() => baselineSubstitution.evaluate(), /baseline substitution/)
    checks.promotionBaselineSubstitutionRejected = true
    const splitPath = await makeScenario("split-path", {
      entries: (entry) => [{ ...entry, candidate: "../split.png" }],
    })
    await assert.rejects(() => splitPath.evaluate(), /split candidate path/)
    checks.promotionSplitScreenshotTraversalRejected = true

    for (const field of [
      "host",
      "theme",
      "width",
      "viewport",
      "id",
      "state",
      "ownership",
      "descriptorType",
    ]) {
      const drift = await makeScenario(`matrix-${field.toLowerCase()}`, {
        records: (record) => [
          {
            ...record,
            [field]:
              field === "viewport"
                ? { ...record.viewport, width: 999 }
                : field === "id"
                  ? "forged-id"
                  : field === "ownership"
                    ? "family:forged"
                    : field === "descriptorType"
                      ? "interactive"
                      : "forged",
          },
        ],
      })
      await assert.rejects(() => drift.evaluate(), /matrix identity drift|extra candidate identity/)
      checks[`promotionMatrix${field[0].toUpperCase()}${field.slice(1)}DriftRejected`] = true
    }
    const missingMatrix = await makeScenario("matrix-missing", { records: () => [] })
    await assert.rejects(() => missingMatrix.evaluate(), /metric count|matrix set drift/)
    checks.promotionMatrixMissingIdentityRejected = true
    const extraMatrix = await makeScenario("matrix-extra", {
      records: (record) => [{ ...record }, { ...record, key: `${record.key}-extra` }],
    })
    await assert.rejects(() => extraMatrix.evaluate(), /metric count|extra candidate identity/)
    checks.promotionMatrixExtraIdentityRejected = true
    const duplicateMatrix = await makeScenario("matrix-duplicate", {
      records: (record) => [{ ...record }, { ...record }],
    })
    await assert.rejects(() => duplicateMatrix.evaluate(), /metric count|duplicate metric key/)
    checks.promotionMatrixDuplicateIdentityRejected = true

    const failureScenario = created.find(({ candidateRunId }) =>
      candidateRunId.endsWith("product-behavior"),
    )
    const failureFiles = snapshotCandidateFiles(failureScenario.root)
    const erasedMetrics = { ...baseMetrics(), violations: [] }
    writeFileSync(failureScenario.metricsFile, stableJson(erasedMetrics))
    resealWithoutAnchor(failureScenario, ({ summaryCore }) => {
      summaryCore.records[0].metrics = erasedMetrics
      summaryCore.records[0].metricsHash = sha256(readFileSync(failureScenario.metricsFile))
    })
    await assert.rejects(() => failureScenario.evaluate(), /candidate tree does not match anchor/)
    checks.promotionMetricsFailureErasureRejected = true
    restoreCandidateFiles(failureScenario.root, failureFiles)

    const legacyApproval = {
      ...base.approval,
      schemaVersion: 1,
      protocol: "steptrace-visual-approval-v1",
    }
    delete legacyApproval.reviewAnchor
    delete legacyApproval.reviewAnchorHash
    checks.promotionLegacyApprovalNotTrusted =
      (await base.evaluate([legacyApproval])).status === "pending-approval"

    const missingReviewAnchor = { ...base.approval }
    delete missingReviewAnchor.reviewAnchor
    delete missingReviewAnchor.reviewAnchorHash
    await assert.rejects(
      () => base.evaluate([missingReviewAnchor]),
      /non-canonical review anchor path/,
    )
    checks.promotionMissingReviewAnchorRejected = true

    const fabricatedReviewAnchor = join(base.reviewRoot, "fabricated-review-anchor.json")
    writeFileSync(fabricatedReviewAnchor, readFileSync(base.reviewAnchorPath))
    await assert.rejects(
      () =>
        base.evaluate([
          {
            ...base.approval,
            reviewAnchor: posixRelative(evidenceRoot, fabricatedReviewAnchor),
            reviewAnchorHash: sha256(readFileSync(fabricatedReviewAnchor)),
          },
        ]),
      /non-canonical review anchor path/,
    )
    checks.promotionFabricatedReviewAnchorRejected = true

    await withMutatedJson(
      base.reviewAnchorPath,
      (anchor) => (anchor.reviewer.role = "executor"),
      () => assert.rejects(() => base.evaluate(), /review anchor hash mismatch/),
    )
    checks.promotionMutatedReviewAnchorRejected = true

    const coordinatedReviewBytes = readFileSync(base.reviewFile)
    const coordinatedAnchorBytes = readFileSync(base.reviewAnchorPath)
    writeFileSync(base.reviewFile, Buffer.concat([coordinatedReviewBytes, Buffer.from("resealed")]))
    const coordinatedAnchor = JSON.parse(coordinatedAnchorBytes)
    coordinatedAnchor.reviewArtifacts[0].sha256 = sha256(readFileSync(base.reviewFile))
    coordinatedAnchor.approvals[0].reviewArtifactHash = coordinatedAnchor.reviewArtifacts[0].sha256
    writeFileSync(base.reviewAnchorPath, stableJson(coordinatedAnchor))
    await assert.rejects(() => base.evaluate(), /review anchor hash mismatch/)
    checks.promotionCoordinatedReviewResealRejected = true
    writeFileSync(base.reviewFile, coordinatedReviewBytes)
    writeFileSync(base.reviewAnchorPath, coordinatedAnchorBytes)

    const reviewerToolBytes = readFileSync(base.reviewerToolFile)
    writeFileSync(
      base.reviewerToolFile,
      Buffer.concat([reviewerToolBytes, Buffer.from("mutation")]),
    )
    await assert.rejects(() => base.evaluate(), /anchored reviewer tool/)
    checks.promotionReviewerToolMutationRejected = true
    writeFileSync(base.reviewerToolFile, reviewerToolBytes)

    const reviewedRoot = join(visualRoot, "reviewed-self-check", prefix)
    mkdirSync(reviewedRoot, { recursive: true })
    const reviewedPixels = Buffer.alloc(100 * 100 * 4, 128)
    const candidatePixels = Buffer.from(reviewedPixels)
    candidatePixels[0] += 1
    candidatePixels[4] += 1
    const reviewedPng = await sharp(reviewedPixels, {
      raw: { width: 100, height: 100, channels: 4 },
    })
      .png()
      .toBuffer()
    const candidatePng = await sharp(candidatePixels, {
      raw: { width: 100, height: 100, channels: 4 },
    })
      .png()
      .toBuffer()
    const tolerance = await makeScenario("tolerance", { screenshot: candidatePng })
    const reviewedFile = join(reviewedRoot, "reviewed.png")
    writeFileSync(reviewedFile, reviewedPng)
    const toleranceReviewerTool = join(tolerance.reviewRoot, "tolerance-reviewer.mjs")
    writeFileSync(toleranceReviewerTool, "export const reviewer = 'tolerance-self-check'\n")
    const toleranceApproval = {
      ...tolerance.approval,
      reviewerAgentId: `${reviewerId}-tolerance`,
      reviewerToolId: "steptrace-tolerance-review-v1",
      candidateArtifact: posixRelative(visualRoot, reviewedFile),
      candidateHash: sha256(reviewedPng),
    }
    const toleranceReviewAnchor = writeReviewAnchor({
      context: {
        runId: tolerance.candidateRunId,
        producerAgentId: producerId,
        producerTool: tolerance.captureAnchor.tool,
        captureAnchorHash: tolerance.captureAnchorHash,
      },
      approvals: [toleranceApproval],
      reviewerTool: {
        id: toleranceApproval.reviewerToolId,
        path: posixRelative(evidenceRoot, toleranceReviewerTool),
      },
    })
    toleranceApproval.reviewAnchor = toleranceReviewAnchor.artifact
    toleranceApproval.reviewAnchorHash = toleranceReviewAnchor.hash
    tolerance.extraReviewAnchorPaths.push(toleranceReviewAnchor.path)
    checks.promotionGlobalToleranceTrapRemainsPending =
      (await tolerance.evaluate([toleranceApproval])).status === "pending-approval"
    checks.promotionConsensusNotUsed =
      (
        await tolerance.evaluate([
          toleranceApproval,
          { ...toleranceApproval, reason: "A second review cannot average raster failures." },
        ])
      ).status === "pending-approval"
    rmSync(reviewedRoot, { recursive: true, force: true })
  } finally {
    for (const scenario of created) {
      rmSync(scenario.root, { recursive: true, force: true })
      rmSync(scenario.reviewRoot, { recursive: true, force: true })
      rmSync(scenario.anchorPath, { force: true })
      for (const path of [scenario.reviewAnchorPath, ...scenario.extraReviewAnchorPaths])
        rmSync(resolve(path, ".."), { recursive: true, force: true })
      rmSync(join(evidenceRoot, "real-host", "g008", scenario.candidateRunId), {
        recursive: true,
        force: true,
      })
    }
    for (const path of [
      join(evidenceRoot, "quality-gate", `${prefix}-legacy-review.md`),
      join(visualRoot, "reviewed-self-check", prefix),
      scratch,
    ])
      rmSync(path, { recursive: true, force: true })
  }
}

async function runSelfCheck() {
  mkdirSync(outputRoot, { recursive: true })
  const checks = {
    launchManifestVerified:
      launchManifestHash === sha256(stableJson(launchManifestCore)) &&
      launchManifest.files.length === executablePaths.length,
    compiledQuartzCss:
      quartzBindings.includes(".steptrace") && !/@(use|include)\b/.test(quartzBindings),
    observedRuntimeFamilyExcludedFromBehavior:
      stableJson(baselineSemantic({ text: "same", visualFamily: null })) ===
      stableJson(baselineSemantic({ text: "same", visualFamily: "candidate" })),
    immutableFixture: !Object.hasOwn(
      fixtures.find(({ id }) => id === "binary-search-on-answer")?.config ?? {},
      "array",
    ),
    rabinKarpRenderedCarrier: fixtures
      .find(({ id }) => id === "rabin-karp")
      ?.oracle.nonColorCues.find(({ state, role }) => state === "active" && role === "active-state")
      ?.alternatives.some(
        ({ selector, cueKinds }) =>
          selector === ".steptrace__cells--pat" &&
          cueKinds.length === 1 &&
          cueKinds[0] === "border",
      ),
    rabinKarpOuterOutlineNotEssential:
      fixtures.find(({ id }) => id === "rabin-karp")?.oracle.essentialGraphics.length === 0,
  }
  assert.throws(
    () =>
      assertLaunchManifestInputs([
        ...launchManifest.files.slice(0, -1),
        { ...launchManifest.files.at(-1), sha256: "0".repeat(64) },
      ]),
    /executable changed after launcher hash/,
  )
  checks.launchManifestPostStartupEditRejected = true
  assert.throws(
    () => assertObservedRuntimeOwnership("family:expected", "family:actual"),
    /runtime ownership family:actual did not match family:expected/,
  )
  checks.observedRuntimeFamilyMismatchRejected = true
  assert.throws(
    () => assertObservedRuntimeOwnership("legacy:expected", "legacy:actual"),
    /runtime ownership legacy:actual did not match legacy:expected/,
  )
  checks.observedRuntimeLegacyMismatchRejected = true
  assert.throws(
    () => assertObservedRuntimeOwnership("family:bit-grid", "legacy:bit-grid"),
    /runtime ownership legacy:bit-grid did not match family:bit-grid/,
  )
  checks.observedRuntimeOwnerKindMismatchRejected = true
  assert.throws(
    () => assertObservedRuntimeOwnership("family:expected", null),
    /runtime ownership missing did not match family:expected/,
  )
  checks.missingRuntimeOwnershipRejected = true

  const finite = {
    id: "finite",
    playState: "running",
    playbackRate: 1,
    effect: { getComputedTiming: () => ({ iterations: 1, endTime: 100 }) },
    finish() {
      this.playState = "finished"
    },
  }
  const infinite = {
    id: "infinite",
    playState: "running",
    playbackRate: 1,
    effect: { getComputedTiming: () => ({ iterations: Infinity, endTime: Infinity }) },
    finish() {
      throw new Error("must not finish")
    },
    cancel() {
      this.playState = "idle"
    },
  }
  const animationDiagnostics = settleAnimations([finite, infinite])
  checks.finiteAnimationFinished = finite.playState === "finished"
  checks.infiniteAnimationCancelledWithDiagnostic =
    infinite.playState === "idle" &&
    animationDiagnostics.some(
      ({ identity, handling, reason }) =>
        identity === "infinite" && handling === "cancelled" && reason === "infinite",
    )
  const unexpected = {
    id: "unexpected",
    playState: "running",
    playbackRate: 1,
    effect: { getComputedTiming: () => ({ iterations: 1, endTime: 100 }) },
    finish() {
      throw new Error("unexpected sentinel")
    },
  }
  assert.throws(() => settleAnimations([unexpected]), /unexpected finish failure.*sentinel/)
  checks.unexpectedAnimationFinishRethrown = true
  const stubborn = {
    id: "stubborn",
    playState: "running",
    playbackRate: 1,
    effect: { getComputedTiming: () => ({ iterations: 1, endTime: 100 }) },
    finish() {},
  }
  assert.throws(() => settleAnimations([stubborn]), /finite animations remained active/)
  checks.activeFiniteAnimationRejected = true

  const png = (data, width = 100, height = 100) =>
    sharp(data, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer()
  const pixels = Buffer.alloc(100 * 100 * 4, 128)
  const exactPng = await png(pixels)
  const exactApproval = { candidateHash: sha256(exactPng) }
  checks.reviewedRasterExactAccepted = await reviewedRasterEquivalent(
    exactApproval,
    exactPng,
    exactPng,
  )
  const sparsePixels = Buffer.from(pixels)
  sparsePixels[0] += 1
  checks.reviewedRasterSparseRgbDeltaAccepted = await reviewedRasterEquivalent(
    exactApproval,
    exactPng,
    await png(sparsePixels),
  )
  const rgbDeltaTwoPixels = Buffer.from(pixels)
  rgbDeltaTwoPixels[0] += 2
  checks.reviewedRasterRgbDeltaTwoRejected = !(await reviewedRasterEquivalent(
    exactApproval,
    exactPng,
    await png(rgbDeltaTwoPixels),
  ))
  const alphaDeltaPixels = Buffer.from(pixels)
  alphaDeltaPixels[3] += 1
  checks.reviewedRasterAlphaDeltaRejected = !(await reviewedRasterEquivalent(
    exactApproval,
    exactPng,
    await png(alphaDeltaPixels),
  ))
  checks.reviewedRasterDimensionMismatchRejected = !(await reviewedRasterEquivalent(
    exactApproval,
    exactPng,
    await png(Buffer.alloc(99 * 100 * 4, 128), 99, 100),
  ))
  const densePixels = Buffer.from(pixels)
  densePixels[0] += 1
  densePixels[4] += 1
  checks.reviewedRasterChangedPixelRatioRejected = !(await reviewedRasterEquivalent(
    exactApproval,
    exactPng,
    await png(densePixels),
  ))
  checks.reviewedRasterArtifactHashMismatchRejected = !(await reviewedRasterEquivalent(
    { candidateHash: "0".repeat(64) },
    exactPng,
    exactPng,
  ))

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 400, height: 800 } })
  await page.setContent(`
    <style>
      #root { background: rgb(0, 0, 255); }
      .layer { background: rgba(255, 0, 0, 0.5); }
      svg { width: 100px; height: 50px; }
      text { fill: rgb(0, 0, 0); color: rgb(255, 255, 255); font-size: 16px; }
      .svg-underlay-label { fill: white; }
      button { box-sizing: border-box; width: 43.6px; height: 43.6px; padding: 0; border: 0; }
      .css4-label { color: color(srgb 1 0 0); }
      .color-only-cue { display: block; width: 20px; height: 20px; background: red; }
      .ellipsis-case { display: block; width: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .endpoint { display: flex; width: 100px; padding: 4px; border: 1px solid; overflow: hidden; transform-origin: left; }
      .endpoint > span { flex: 0 0 50px; height: 10px; }
      .endpoint-end { display: flex; flex-direction: column-reverse; width: 30px; height: 100px; padding: 4px; border: 1px solid; overflow: hidden; }
      .endpoint-end > span { flex: 0 0 20px; width: 10px; }
      .endpoint-end > .opacity-zero { opacity: 0; }
      .pseudo-label { position: relative; z-index: 0; color: white; }
      .pseudo-label::before { position: absolute; inset: 0; z-index: -1; content: ""; background: black; }
      .paintless-boundary { display: block; width: 20px; height: 20px; border: 0 none rgb(128, 128, 128); color: rgb(128, 128, 128); }
      .low-border { display: block; width: 20px; height: 20px; border: 2px solid rgb(128, 128, 128); }
      .low-control { background: transparent; border: 2px solid rgb(128, 0, 128); }
      .enabled-low-text, .disabled-low-text, .inert-low-text, .visible-low-text { background: transparent; color: rgb(128, 0, 128); }
      .surfaces { display: flex; background: white; }
      .essential-boundary { width: 20px; height: 20px; background: white; border-right: 2px solid rgb(119, 119, 119); }
      .adjacent-surface { width: 20px; height: 20px; background: rgb(136, 136, 136); }
      .one-adjacent-control { background: rgb(119, 119, 119); border: 2px solid rgb(119, 119, 119); }
      .all-low-control { background: rgb(119, 119, 119); border: 2px solid rgb(128, 128, 128); }
      .disabled-low-boundary { background: transparent; border: 2px solid rgb(128, 0, 128); }
      .component-surface { display: inline-block; padding: 4px; background: white; }
      .low-control-surface { display: inline-block; padding: 4px; background: rgb(128, 0, 128); }
      .all-low-surface { display: inline-block; padding: 4px; background: rgb(119, 119, 119); }
      .collision-svg line { stroke: black; stroke-width: 2px; }
    </style>
    <div id="root" data-visual-family="observed"><div class="layer"><span class="visible-semantic">Visible state</span><svg viewBox="0 0 100 50">
      <text class="svg-label" x="5" y="20">Test</text>
      <path style="display:none" marker-end="url(#missing)" d="M0 0 L20 20"></path>
    </svg><svg viewBox="0 0 100 50"><rect width="100" height="50" fill="color(srgb 0 1 0)"></rect><text class="svg-underlay-label" x="5" y="20" fill="white">Backdrop</text></svg><span style="background:white"><span class="css4-label">CSS4</span></span><span class="pseudo-label">Pseudo</span><span data-state="active" class="color-only-cue"></span><span data-state="active" class="paintless-boundary"></span><span data-state="active" class="low-border"></span><span class="low-control-surface"><button class="low-control">Border</button></span><span class="component-surface"><button class="one-adjacent-control" aria-label="One adjacent surface"></button></span><span class="all-low-surface"><button class="all-low-control" aria-label="All adjacent surfaces low"></button></span><button class="disabled-low-boundary" aria-label="Disabled boundary" disabled></button><button class="enabled-low-text">Enabled</button><button class="disabled-low-text" disabled>Disabled</button><span inert><button class="inert-low-text">Inert</button></span><button class="hidden-low-text" hidden>Hidden</button><span class="visible-low-text">Visible</span><div class="surfaces"><span class="essential-boundary"></span><span class="adjacent-surface"></span></div><span class="arbitrary-cue">Arbitrary frame text</span><span class="steptrace__phase-copy">Named phase</span><span class="steptrace__insight-text">Named insight</span><span class="steptrace__phase-copy ellipsis-case">Full phase copy</span><span class="steptrace__contiguous-index ellipsis-case">Full index label</span><span class="steptrace__log-text arbitrary-ellipsis ellipsis-case">Unapproved clipping</span><div class="endpoint"><span></span><span></span></div><div class="endpoint-end"><span></span><span></span><span class="opacity-zero"></span></div><svg class="collision-svg" viewBox="0 0 120 110"><defs><marker id="arrow"><circle cx="3" cy="3" r="3"></circle></marker></defs><line class="masked-edge" x1="20" y1="20" x2="80" y2="20"></line><g class="node"><circle class="halo" cx="50" cy="20" r="18" fill="none" stroke="red"></circle><circle class="masked-body" cx="50" cy="20" r="12" fill="white"></circle></g><g class="node"><circle class="visible-body" cx="50" cy="50" r="12" fill="white"></circle></g><line class="visible-edge" x1="20" y1="50" x2="80" y2="50"></line><line class="transparent-edge" x1="20" y1="80" x2="80" y2="80"></line><g class="node"><circle class="transparent-body" cx="50" cy="80" r="12" fill="transparent"></circle></g><line class="endpoint-edge" x1="20" y1="100" x2="90" y2="100"></line><g class="node"><circle class="endpoint-body" cx="90" cy="100" r="10" fill="white"></circle></g></svg><button aria-label="Tolerated target">X</button><button aria-label="Options">Options</button><div class="hidden-settings" style="display:none">Speed1.00×Target12,7,19,4,15,9<input aria-label="Search target"></div></div></div>
  `)
  const oracle = {
    scrollAxes: [],
    geometry: {
      nodeEdgeClearance: false,
      arrowBounds: true,
      pointerClearance: false,
      cellEndpoints: [],
      labelFit: false,
    },
    essentialGraphics: [],
    nonColorCues: [],
  }
  const result = await metrics(page, true, oracle, "initial")
  assertObservedRuntimeOwnership("family:observed", result.observedOwnership)
  checks.observedRuntimeFamilyCaptured = result.observedOwnership === "family:observed"
  await page.locator("#root").evaluate((root) => {
    delete root.dataset.visualFamily
    root.dataset.legacyRenderer = "bit-grid"
  })
  const legacyResult = await metrics(page, true, oracle, "initial")
  assertObservedRuntimeOwnership("legacy:bit-grid", legacyResult.observedOwnership)
  checks.observedRuntimeLegacyCaptured =
    legacyResult.observedOwnership === "legacy:bit-grid" &&
    legacyResult.semantic.visualFamily === null
  await page.locator("#root").evaluate((root) => delete root.dataset.legacyRenderer)
  const missingOwnershipResult = await metrics(page, true, oracle, "initial")
  checks.missingRuntimeOwnershipCaptured = missingOwnershipResult.observedOwnership === null
  await page.locator("#root").evaluate((root) => (root.dataset.visualFamily = "observed"))
  await page
    .locator(".hidden-settings")
    .evaluate((settings) => (settings.textContent = "Speed1.00×Target99,1,4,8"))
  const hiddenChanged = await metrics(page, true, oracle, "initial")
  checks.hiddenSettingsExcluded = stableJson(result.semantic) === stableJson(hiddenChanged.semantic)
  checks.legacyHiddenSettingsRetained =
    stableJson(result.legacySemantic) !== stableJson(hiddenChanged.legacySemantic)
  await page
    .locator(".visible-semantic")
    .evaluate((element) => (element.textContent = "Different visible state"))
  const visibleChanged = await metrics(page, true, oracle, "initial")
  checks.visibleTextDifferenceDetected =
    stableJson(result.semantic) !== stableJson(visibleChanged.semantic)
  checks.legacyHiddenSettingsNormalized =
    stableJson(
      baselineSemantic({
        text: "Visible state1×Speed1.00×Target12,7,19,4,15,9",
        controls: ["Options", "Playback speed", "Search target"],
        roles: ["group"],
        parityText: ["Visible state"],
      }),
    ) ===
    stableJson(
      baselineSemantic({
        text: "Visible state1×",
        controls: ["Options"],
        roles: ["group"],
        parityText: ["Visible state"],
      }),
    )
  const svgContrast = result.contrast.find(({ selector }) => selector.includes("svg-label"))
  checks.compositorOrder =
    svgContrast?.compositedBackground[0] === 128 &&
    svgContrast.compositedBackground[1] === 0 &&
    svgContrast.compositedBackground[2] === 127
  checks.svgPaint = svgContrast?.computedForeground === "rgb(0, 0, 0)"
  const css4Contrast = result.contrast.find(({ selector }) => selector.includes("css4-label"))
  checks.cssColor4Conversion = css4Contrast?.ratio === 4
  const svgUnderlay = result.contrast.find(({ selector }) =>
    selector.includes("svg-underlay-label"),
  )
  checks.svgPaintedSiblingBackdrop = svgUnderlay?.compositedBackground[1] === 255
  checks.pseudoElementBackdrop = !result.contrast.some(({ selector }) =>
    selector.includes("pseudo-label"),
  )
  checks.paintlessBoundaryIgnored = !result.nonTextContrast.some(({ selector }) =>
    selector.includes("paintless-boundary"),
  )
  checks.renderedLowContrastBorderRejected = result.nonTextContrast.some(({ selector }) =>
    selector.includes("low-control"),
  )
  checks.enabledComponentAcceptsOneDefiningSurface = !result.nonTextContrast.some(({ selector }) =>
    selector.includes("one-adjacent-control"),
  )
  checks.enabledComponentRejectsAllLowAdjacentSurfaces = result.nonTextContrast.some(
    ({ selector }) => selector.includes("all-low-control"),
  )
  checks.disabledComponentBoundaryExcluded = !result.nonTextContrast.some(({ selector }) =>
    selector.includes("disabled-low-boundary"),
  )
  checks.stateCarrierNotAutomaticallyEnrolled = !result.nonTextContrast.some(({ selector }) =>
    selector.includes("low-border"),
  )
  checks.enabledControlTextChecked = result.contrast.some(({ selector }) =>
    selector.includes("enabled-low-text"),
  )
  checks.disabledControlTextExcluded = !result.contrast.some(({ selector }) =>
    selector.includes("disabled-low-text"),
  )
  checks.inertControlTextExcluded = !result.contrast.some(({ selector }) =>
    selector.includes("inert-low-text"),
  )
  checks.hiddenControlTextExcluded = !result.contrast.some(({ selector }) =>
    selector.includes("hidden-low-text"),
  )
  checks.visibleTextStillChecked = result.contrast.some(({ selector }) =>
    selector.includes("visible-low-text"),
  )
  const essentialBoundary = await metrics(
    page,
    false,
    {
      ...oracle,
      essentialGraphics: [{ selector: ".essential-boundary", paint: "border", sides: ["Right"] }],
    },
    "initial",
  )
  checks.essentialInternalBoundaryChecksBothSurfaces = essentialBoundary.nonTextContrast.some(
    ({ selector, boundaryEvidence }) =>
      selector.includes("essential-boundary") && boundaryEvidence[0]?.ratios.length === 2,
  )
  checks.invisibleArrowFilter = result.familyGeometry.arrowBounds.length === 0
  checks.targetTolerance = result.smallTargets.length === 0
  await page
    .getByRole("button", { name: "Tolerated target" })
    .evaluate((button) => (button.style.width = "43.4px"))
  const belowTolerance = await metrics(page, true, oracle, "initial")
  checks.targetThreshold = belowTolerance.smallTargets.length === 1

  const cueOracle = {
    ...oracle,
    geometry: { ...oracle.geometry, arrowBounds: false },
    nonColorCues: [
      {
        state: "initial",
        role: "active-state",
        alternatives: [
          { selector: ".color-only-cue", cueKinds: ["text"] },
          { selector: ".missing-phase", cueKinds: ["text"] },
        ],
      },
      {
        state: "initial",
        role: "phase-or-insight",
        alternatives: [
          { selector: ".steptrace__phase-copy", cueKinds: ["text"] },
          { selector: ".steptrace__insight-text", cueKinds: ["text"] },
        ],
      },
      {
        state: "initial",
        role: "no-arbitrary-frame-text",
        alternatives: [{ selector: ".arbitrary-cue", cueKinds: ["marker"] }],
      },
    ],
  }
  const cueResult = await metrics(page, true, cueOracle, "initial")
  checks.colorAloneRejected = cueResult.cueFailures.some(({ role }) => role === "active-state")
  checks.phaseOrInsightAccepted = !cueResult.cueFailures.some(
    ({ role }) => role === "phase-or-insight",
  )
  checks.arbitraryFrameTextRejected = cueResult.cueFailures.some(
    ({ role }) => role === "no-arbitrary-frame-text",
  )
  checks.documentedEllipsisOnly =
    cueResult.clipping.length === 1 &&
    cueResult.clipping[0].selector.includes("arbitrary-ellipsis") &&
    cueResult.acceptedEllipsis.length === 2

  const collisionOracle = {
    ...oracle,
    geometry: { ...oracle.geometry, arrowBounds: false, nodeEdgeClearance: true },
  }
  const opaqueCollision = await metrics(page, false, collisionOracle, "initial")
  checks.opaqueNodeBodyDetected = opaqueCollision.familyGeometry.maskedJoins.some(({ selector }) =>
    selector.includes("masked-edge"),
  )
  checks.middleNodeCrossingRejected = opaqueCollision.familyGeometry.nodeEdgeClearance.some(
    ({ selector }) => selector.includes("visible-edge"),
  )
  checks.fullyOccludedMiddleCrossingRecordedAsMaskedJoin =
    opaqueCollision.familyGeometry.maskedJoins.some(({ selector }) =>
      selector.includes("masked-edge"),
    ) &&
    !opaqueCollision.familyGeometry.nodeEdgeClearance.some(({ selector }) =>
      selector.includes("masked-edge"),
    )
  checks.unoccludedMiddleCrossingRejected = opaqueCollision.familyGeometry.nodeEdgeClearance.some(
    ({ selector }) => selector.includes("visible-edge"),
  )
  checks.transparentMaskRejected = opaqueCollision.familyGeometry.nodeEdgeClearance.some(
    ({ selector }) => selector.includes("transparent-edge"),
  )
  await page
    .locator(".transparent-body")
    .evaluate((body) => body.setAttribute("fill", "rgba(255, 255, 255, 0.5)"))
  const decorativeOnly = await metrics(page, false, collisionOracle, "initial")
  checks.nonOpaqueMaskRejected = decorativeOnly.familyGeometry.nodeEdgeClearance.some(
    ({ selector }) => selector.includes("transparent-edge"),
  )
  checks.transparentHaloAndMarkerExcluded =
    decorativeOnly.familyGeometry.nodeEdgeClearance.filter(({ selector }) =>
      selector.includes("transparent-edge"),
    ).length === 1
  checks.ownTrimmedEndpointAllowed =
    decorativeOnly.familyGeometry.maskedJoins.some(({ selector }) =>
      selector.includes("endpoint-edge"),
    ) &&
    !decorativeOnly.familyGeometry.nodeEdgeClearance.some(({ selector }) =>
      selector.includes("endpoint-edge"),
    )
  await page
    .locator(".collision-svg")
    .evaluate((svg) => svg.append(svg.querySelector(".masked-edge")))
  const missingBoundaryClip = await metrics(page, false, collisionOracle, "initial")
  checks.missingNodeBoundaryClipDetected =
    missingBoundaryClip.familyGeometry.nodeEdgeClearance.some(({ selector }) =>
      selector.includes("masked-edge"),
    )

  await page.locator(".endpoint").evaluate((element) => (element.style.transform = "scaleX(1.005)"))
  const subpixelEndpoint = await metrics(
    page,
    false,
    {
      ...oracle,
      geometry: {
        ...oracle.geometry,
        arrowBounds: false,
        cellEndpoints: [
          {
            family: "self-check",
            containerSelector: ".endpoint",
            cellSelector: ":scope > span",
            axis: "x",
          },
        ],
      },
    },
    "initial",
  )
  checks.endpointSubpixelTolerance = subpixelEndpoint.familyGeometry.cellEndpoints.length === 0
  await page.locator(".endpoint").evaluate((element) => (element.style.transform = "scaleX(1.02)"))
  const materialEndpoint = await metrics(
    page,
    false,
    {
      ...oracle,
      geometry: {
        ...oracle.geometry,
        arrowBounds: false,
        cellEndpoints: [
          {
            family: "self-check",
            containerSelector: ".endpoint",
            cellSelector: ":scope > span",
            axis: "x",
          },
        ],
      },
    },
    "initial",
  )
  checks.endpointMaterialOverflowDetected =
    materialEndpoint.familyGeometry.cellEndpoints.length === 1
  const occupiedEndOracle = {
    ...oracle,
    geometry: {
      ...oracle.geometry,
      arrowBounds: false,
      cellEndpoints: [
        {
          family: "self-check",
          containerSelector: ".endpoint-end",
          cellSelector: ":scope > span",
          axis: "y",
          occupied: "start",
        },
      ],
    },
  }
  const occupiedEnd = await metrics(page, false, occupiedEndOracle, "initial")
  checks.columnReverseOccupiedEndAccepted = occupiedEnd.familyGeometry.cellEndpoints.length === 0
  await page
    .locator(".endpoint-end > span:not(.opacity-zero)")
    .evaluateAll((cells) => cells.forEach((cell) => (cell.style.transform = "translateY(-2px)")))
  const missingOccupiedEnd = await metrics(page, false, occupiedEndOracle, "initial")
  checks.columnReverseMissingEndRejected =
    missingOccupiedEnd.familyGeometry.cellEndpoints.length === 1

  const approvalRecord = {
    ownership: "family:self-check",
    id: "approval-self-check",
    descriptorType: "frame",
    host: "quartz",
    theme: "light",
    width: "wide",
    viewport: { width: 1148, height: 1000, deviceScaleFactor: 1 },
    state: "initial",
    baseline: "baseline-v5/quartz/light/wide/approval-self-check/initial/screenshot.png",
    candidate: "candidate/self-check/quartz/light/wide/approval-self-check/initial/screenshot.png",
  }
  const approvalBaselineHash = "baseline-hash"
  const approvalReviewsRoot = join(evidenceRoot, "quality-gate", "reviews")
  mkdirSync(approvalReviewsRoot, { recursive: true })
  const approvalSelfCheckRoot = mkdtempSync(join(approvalReviewsRoot, "approval-self-check-"))
  const approvalRunId = approvalSelfCheckRoot.split(sep).at(-1)
  const approvalContext = {
    runId: approvalRunId,
    producerAgentId: "approval-producer-self-check",
    captureAnchorHash: "a".repeat(64),
  }
  const externalSelfCheckRoot = mkdtempSync(join(tmpdir(), "steptrace-approval-"))
  try {
    const containedReview = join(approvalSelfCheckRoot, "review.md")
    const externalReview = join(externalSelfCheckRoot, "review.md")
    const escapedReview = join(approvalSelfCheckRoot, "escaped-review.md")
    writeFileSync(containedReview, "contained review")
    writeFileSync(externalReview, "external review")
    symlinkSync(externalReview, escapedReview)
    const reviewArtifact = relative(evidenceRoot, containedReview)
    const approval = {
      schemaVersion: 2,
      protocol: "steptrace-visual-approval-v2",
      candidateRunId: approvalRunId,
      producerRunId: approvalRunId,
      producerAgentId: approvalContext.producerAgentId,
      reviewerAgentId: "approval-reviewer-self-check",
      owner: approvalRecord.ownership,
      baselineHash: approvalBaselineHash,
      candidateHash: "candidate-hash",
      baselineArtifact: approvalRecord.baseline,
      candidateArtifact: approvalRecord.candidate,
      identity: identityFor(approvalRecord),
      descriptorIds: [approvalRecord.id],
      classification: "accepted-canonical-shift",
      reviewerRole: "vision",
      reason: "Independent visual review accepted the candidate.",
      reviewArtifact,
      reviewArtifactHash: sha256(readFileSync(containedReview)),
    }
    approvalContext.acceptedApprovalBindings = new Set([
      stableJson(approvalAnchorBinding(approval)),
    ])
    checks.approvalContainedReviewArtifactAccepted = isAcceptedVisualApproval(
      approval,
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalAbsoluteReviewArtifactRejected = !isAcceptedVisualApproval(
      { ...approval, reviewArtifact: containedReview },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalParentTraversalReviewArtifactRejected = !isAcceptedVisualApproval(
      { ...approval, reviewArtifact: `../${relative(join(evidenceRoot, ".."), containedReview)}` },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalMissingReviewArtifactRejected = !isAcceptedVisualApproval(
      { ...approval, reviewArtifact: `${reviewArtifact}.missing` },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalDirectoryReviewArtifactRejected = !isAcceptedVisualApproval(
      { ...approval, reviewArtifact: relative(evidenceRoot, approvalSelfCheckRoot) },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalSymlinkEscapeReviewArtifactRejected = !isAcceptedVisualApproval(
      { ...approval, reviewArtifact: relative(evidenceRoot, escapedReview) },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalVisionAccepted = isAcceptedVisualApproval(
      approval,
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalDesignerAccepted = isAcceptedVisualApproval(
      { ...approval, reviewerRole: "designer" },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    checks.approvalVerifierAccepted = isAcceptedVisualApproval(
      { ...approval, reviewerRole: "verifier" },
      approvalRecord,
      approvalBaselineHash,
      approvalContext,
    )
    for (const reviewerRole of ["unknown", "default", "executor"]) {
      checks[`approval${reviewerRole[0].toUpperCase()}${reviewerRole.slice(1)}Rejected`] =
        !isAcceptedVisualApproval(
          { ...approval, reviewerRole },
          approvalRecord,
          approvalBaselineHash,
          approvalContext,
        )
    }
  } finally {
    rmSync(approvalSelfCheckRoot, { recursive: true, force: true })
    rmSync(externalSelfCheckRoot, { recursive: true, force: true })
  }
  const approvalFixture = JSON.parse(
    readFileSync(join(visualRoot, "intended-diffs.json"), "utf8"),
  ).accepted.find(
    (candidate) =>
      candidate.candidateArtifact &&
      !isAbsolute(candidate.candidateArtifact) &&
      existsSync(resolve(visualRoot, candidate.candidateArtifact)),
  )
  assert.ok(approvalFixture, "missing approval self-check fixture")
  const [, , fixtureHost, fixtureTheme, fixtureWidth, fixtureId, fixtureState] =
    approvalFixture.candidateArtifact.split("/")
  const fixtureRecord = {
    ownership: approvalFixture.owner,
    id: fixtureId,
    descriptorType: "frame",
    host: fixtureHost,
    theme: fixtureTheme,
    width: fixtureWidth,
    viewport: {
      width: fixtureWidth === "wide" ? 1148 : 728,
      height: 1000,
      deviceScaleFactor: 1,
    },
    state: fixtureState,
    baseline: `baseline-v5/${fixtureHost}/${fixtureTheme}/${fixtureWidth}/${fixtureId}/${fixtureState}/screenshot.png`,
    candidate: approvalFixture.candidateArtifact,
  }
  const approvalFixtureRoot = mkdtempSync(join(approvalReviewsRoot, "approval-fixture-"))
  const approvalFixtureRunId = approvalFixtureRoot.split(sep).at(-1)
  try {
    const fixtureReview = join(approvalFixtureRoot, "review.md")
    const sourceReview = resolveEvidenceFile(approvalFixture.reviewArtifact)
    assert.ok(sourceReview, "missing legacy approval review fixture")
    writeFileSync(fixtureReview, readFileSync(sourceReview))
    const fixtureContext = {
      runId: approvalFixtureRunId,
      producerAgentId: "approval-fixture-producer",
      captureAnchorHash: "b".repeat(64),
    }
    const normalizedApprovalFixture = {
      ...approvalFixture,
      schemaVersion: 2,
      protocol: "steptrace-visual-approval-v2",
      candidateRunId: approvalFixtureRunId,
      producerRunId: approvalFixtureRunId,
      producerAgentId: fixtureContext.producerAgentId,
      reviewerAgentId: "approval-fixture-reviewer",
      baselineArtifact: fixtureRecord.baseline,
      identity: identityFor(fixtureRecord),
      reviewArtifact: posixRelative(evidenceRoot, fixtureReview),
      reviewArtifactHash: sha256(readFileSync(fixtureReview)),
    }
    fixtureContext.acceptedApprovalBindings = new Set([
      stableJson(approvalAnchorBinding(normalizedApprovalFixture)),
    ])
    const fixturePng = readFileSync(resolve(visualRoot, approvalFixture.candidateArtifact))
    const earlierNonmatchingApproval = {
      ...normalizedApprovalFixture,
      candidateHash: "nonmatching-hash",
    }
    const exactMatch = await findAcceptedVisualApproval(
      [earlierNonmatchingApproval, normalizedApprovalFixture],
      fixtureRecord,
      approvalFixture.baselineHash,
      approvalFixture.candidateHash,
      fixturePng,
      fixtureContext,
    )
    checks.approvalLaterExactMatchAccepted = exactMatch?.matchKind === "exact-hash"
    const rasterEquivalentPng = await sharp(fixturePng).png({ compressionLevel: 0 }).toBuffer()
    assert.notEqual(sha256(rasterEquivalentPng), approvalFixture.candidateHash)
    const rasterMatch = await findAcceptedVisualApproval(
      [earlierNonmatchingApproval, normalizedApprovalFixture],
      fixtureRecord,
      approvalFixture.baselineHash,
      sha256(rasterEquivalentPng),
      rasterEquivalentPng,
      fixtureContext,
    )
    checks.approvalLaterRasterEquivalentAccepted =
      rasterMatch?.matchKind === "reviewed-raster-equivalent"
    checks.approvalAllNonmatchingRejected = !(await findAcceptedVisualApproval(
      [earlierNonmatchingApproval, { ...earlierNonmatchingApproval, reason: "Also nonmatching." }],
      fixtureRecord,
      approvalFixture.baselineHash,
      approvalFixture.candidateHash,
      fixturePng,
      fixtureContext,
    ))
    checks.approvalInvalidLaterMetadataRejected = !(await findAcceptedVisualApproval(
      [earlierNonmatchingApproval, { ...normalizedApprovalFixture, reviewerRole: "executor" }],
      fixtureRecord,
      approvalFixture.baselineHash,
      approvalFixture.candidateHash,
      fixturePng,
      fixtureContext,
    ))
    const reversedExactMatch = await findAcceptedVisualApproval(
      [normalizedApprovalFixture, earlierNonmatchingApproval],
      fixtureRecord,
      approvalFixture.baselineHash,
      approvalFixture.candidateHash,
      fixturePng,
      fixtureContext,
    )
    checks.approvalOrderIndependent = stableJson(reversedExactMatch) === stableJson(exactMatch)
  } finally {
    rmSync(approvalFixtureRoot, { recursive: true, force: true })
  }
  await runPromotionProtocolSelfChecks(checks)
  await browser.close()

  assert.deepEqual(
    Object.entries(checks)
      .filter(([, pass]) => !pass)
      .map(([name]) => name),
    [],
    `harness self-check failures: ${JSON.stringify({
      subpixelEndpoint: subpixelEndpoint.familyGeometry.cellEndpoints,
      materialEndpoint: materialEndpoint.familyGeometry.cellEndpoints,
      occupiedEnd: occupiedEnd.familyGeometry.cellEndpoints,
      missingOccupiedEnd: missingOccupiedEnd.familyGeometry.cellEndpoints,
    })}`,
  )
  const summary = { schemaVersion: 1, mode: "self-check", checks }
  writeFileSync(summaryPath, stableJson(summary))
  console.log(
    `steptrace harness self-check: ${Object.keys(checks).length}/${Object.keys(checks).length} passed`,
  )
}

if (mode === "lifecycle") {
  await runLifecycle()
  process.exit(0)
}

if (mode === "self-check") {
  await runSelfCheck()
  process.exit(0)
}

if (mode === "verify-candidate") {
  const ledgerPath = join(visualRoot, "intended-diffs.json")
  const ledgerBytes = readFileSync(ledgerPath)
  const ledger = JSON.parse(ledgerBytes).accepted ?? []
  const receipt = await evaluateSealedCandidate({
    root: candidateRoot,
    expectedRunId: runId,
    ledger,
    ledgerBytes,
    currentSnapshot: await captureInputSnapshot(false),
    hostReceipts: { quartz: quartzReceipt, obsidian: obsidianReceipt },
    expectedMatrix: expectedVisualMatrix(fixtures, baseline),
    writeReceipt: true,
  })
  assert.equal(receipt.status, "promoted", `candidate ${runId} is not promotable`)
  console.log(
    `steptrace candidate ${runId}: ${receipt.approvals.approved}/${receipt.approvals.expected} approved`,
  )
  process.exit(0)
}

const captureSnapshot = mode === "candidate" ? await captureInputSnapshot(true) : null
mkdirSync(outputRoot, { recursive: true })
const browser = await chromium.launch({ headless: true })
const records = []
const representatives = new Set()
const baselineScreenshotKeys = new Set(
  baseline?.records.filter(({ screenshot }) => screenshot).map(({ key }) => key) ?? [],
)
const screenshotIds =
  mode === "baseline"
    ? new Set(
        fixtures.filter((fixture) => shouldCapture(fixture, representatives)).map(({ id }) => id),
      )
    : new Set(baseline.records.filter(({ screenshot }) => screenshot).map(({ id }) => id))

for (const host of HOSTS) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage({
        viewport: { width: width.viewport, height: 1000 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      })
      const hostClass = host === "obsidian" ? `markdown-rendered theme-${theme}` : ""
      const hostTheme = host === "quartz" ? ` saved-theme="${theme}"` : ""
      await page.setContent(
        `<html${hostTheme}><head><style>${shellCss}${host === "quartz" ? `${engineCss}\n${quartzBindings}` : obsidianCss}</style></head><body data-host="${host}" class="${hostClass}"><main id="shell"><div id="root"></div></main></body></html>`,
      )
      await page.addScriptTag({ content: generatedJs })
      await page.evaluate(
        (fixtureWidth) =>
          document.documentElement.style.setProperty("--fixture-width", `${fixtureWidth}px`),
        width.component,
      )
      const errors = []
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text())
      })
      page.on("pageerror", (error) => errors.push(error.message))
      for (const fixture of fixtures) {
        for (const state of STATES) {
          await mount(page, fixture, state)
          const result = await metrics(page, width.name === "compact", fixture.oracle, state)
          assertObservedRuntimeOwnership(fixture.ownership, result.observedOwnership)
          if (state === "initial") {
            result.keyboardAndMotion = await keyboardAndMotion(page, fixture)
            await mount(page, fixture, state)
          }
          result.runtimeErrors = errors.splice(0)
          if (result.runtimeErrors.length)
            result.violations.push(`runtime errors: ${result.runtimeErrors.length}`)
          if (result.keyboardAndMotion && !result.keyboardAndMotion.pass)
            result.violations.push("keyboard/focus oracle failed")
          const key = `${host}/${theme}/${width.name}/${fixture.id}/${state}`
          const directory = join(outputRoot, key)
          mkdirSync(directory, { recursive: true })
          const metricsPath = join(directory, "metrics.json")
          writeFileSync(metricsPath, stableJson(result), { flag: "wx" })
          let screenshot = null
          let screenshotHash = null
          if (
            mode === "baseline" ? screenshotIds.has(fixture.id) : baselineScreenshotKeys.has(key)
          ) {
            const screenshotPath = join(directory, "screenshot.png")
            await page.locator("#root").screenshot({ path: screenshotPath, animations: "disabled" })
            screenshot = relative(visualRoot, screenshotPath).split(sep).join("/")
            screenshotHash = sha256(readFileSync(screenshotPath))
          }
          records.push({
            key,
            id: fixture.id,
            descriptorType: fixture.descriptorType,
            host,
            theme,
            width: width.name,
            viewport: { width: width.viewport, height: 1000, deviceScaleFactor: 1 },
            state,
            ownership: fixture.ownership,
            metrics: result,
            metricsArtifact: posixRelative(outputRoot, metricsPath),
            metricsHash: sha256(readFileSync(metricsPath)),
            screenshot,
            screenshotHash,
          })
        }
      }
      await page.close()
    }
  }
}
await browser.close()

for (const fixture of fixtures) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      for (const state of STATES) {
        const quartz = records.find(
          (record) => record.key === `quartz/${theme}/${width.name}/${fixture.id}/${state}`,
        )
        const obsidian = records.find(
          (record) => record.key === `obsidian/${theme}/${width.name}/${fixture.id}/${state}`,
        )
        if (
          stableJson(paritySemantic(quartz.metrics.semantic)) !==
          stableJson(paritySemantic(obsidian.metrics.semantic))
        ) {
          quartz.metrics.violations.push("host semantic divergence")
          obsidian.metrics.violations.push("host semantic divergence")
        }
      }
    }
  }
}

const productFailures = records
  .filter(({ metrics: result }) => result.violations.length)
  .map(({ key, metrics: result }) => ({
    category: "runtime-accessibility-geometry-behavior-motion",
    key,
    violations: result.violations,
  }))

if (mode === "candidate") {
  const baselineByKey = new Map(baseline.records.map((record) => [record.key, record]))
  const entries = []
  for (const record of records) {
    const previous = baselineByKey.get(record.key)
    if (!previous) {
      productFailures.push({
        category: "ownership",
        key: record.key,
        violations: ["candidate record has no immutable baseline counterpart"],
      })
      continue
    }
    if (
      stableJson(baselineSemantic(record.metrics.legacySemantic)) !==
      stableJson(baselineSemantic(previous.metrics.semantic))
    ) {
      productFailures.push({
        category: "semantic",
        key: record.key,
        violations: ["semantic candidate output differs from the immutable baseline"],
      })
    }
    const candidateHasScreenshot = Boolean(record.screenshot)
    const baselineHasScreenshot = Boolean(previous.screenshot)
    if (candidateHasScreenshot !== baselineHasScreenshot) {
      productFailures.push({
        category: "behavior",
        key: record.key,
        violations: ["candidate and immutable baseline screenshot presence differs"],
      })
    } else if (candidateHasScreenshot && baselineHasScreenshot) {
      const baselineScreenshot = join(visualRoot, previous.screenshot)
      const baselineHash = sha256(readFileSync(baselineScreenshot))
      entries.push({
        identity: identityFor(record),
        owner: record.ownership,
        baseline: previous.screenshot,
        candidate: record.screenshot,
        baselineHash,
        candidateHash: record.screenshotHash,
        descriptorIds: [record.id],
        classification:
          baselineHash === record.screenshotHash ? "exact-baseline" : "approval-required",
      })
    }
  }
  const approvalFailures = entries
    .filter(({ classification }) => classification === "approval-required")
    .map(({ identity }) => ({ identity, reason: "independent visual approval required" }))
  const disposition = { schemaVersion: 2, runId, entries }
  const summaryCore = {
    schemaVersion: 4,
    mode,
    runId,
    counts,
    matrix: { hosts: 2, themes: 2, widths: 2, states: 3, descriptorStates: records.length },
    screenshotDescriptorCount: screenshotIds.size,
    screenshotCount: records.filter(({ screenshot }) => screenshot).length,
    captureSeal: captureSnapshot,
    productFailures,
    approvalFailures,
    status: productStatus(productFailures, approvalFailures),
    records,
  }
  const { summary } = writeCandidateSeal({
    root: outputRoot,
    candidateRunId: runId,
    summaryCore,
    disposition,
    captureSnapshot,
  })
  const postCaptureSnapshot = await captureInputSnapshot(false)
  assertCaptureSnapshotUnchanged(captureSnapshot, postCaptureSnapshot)
  writeCaptureAnchor({
    root: outputRoot,
    candidateRunId: runId,
    captureSnapshot,
    captureProducerAgentId: producerAgentId,
  })
  assert.equal(
    productFailures.length,
    0,
    `${productFailures.length} StepTrace product records failed; see ${summaryPath}`,
  )
  console.log(
    `steptrace visual candidate: ${records.length} metrics, ${summary.screenshotCount} screenshots, ${approvalFailures.length} approvals pending`,
  )
  process.exit(0)
}

const summary = {
  schemaVersion: 3,
  mode,
  runId,
  counts,
  matrix: { hosts: 2, themes: 2, widths: 2, states: 3, descriptorStates: records.length },
  screenshotDescriptorCount: screenshotIds.size,
  screenshotCount: records.filter(({ screenshot }) => screenshot).length,
  failures: productFailures,
  records,
}
writeFileSync(summaryPath, stableJson(summary), { flag: "wx" })

assert.equal(
  productFailures.length,
  0,
  `${productFailures.length} StepTrace visual matrix records failed; see ${summaryPath}`,
)
console.log(
  `steptrace visual ${mode}: ${records.length} descriptor-state checks and ${summary.screenshotCount} screenshots passed`,
)
