import assert from "node:assert/strict"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { buildSync } from "esbuild"
import { chromium } from "playwright"

import {
  activeFrame,
  evidenceRoot,
  loadCatalogFixtures,
  repoRoot,
  runtimeOwnership,
  sha256,
  stable,
  stableJson,
} from "./steptrace.catalog.mjs"

const modeArg = process.argv.find((argument) => argument.startsWith("--mode="))
const mode = modeArg?.slice("--mode=".length)
if (!new Set(["baseline", "candidate"]).has(mode)) {
  throw new Error("usage: steptrace.design-system.test.mjs --mode=baseline|candidate")
}

const runIdArg = process.argv.find((argument) => argument.startsWith("--run-id="))
const runId = runIdArg?.slice("--run-id=".length) ?? new Date().toISOString().replace(/[:.]/g, "-")
if (!/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error(`invalid --run-id ${runId}`)

const behaviorRoot = join(evidenceRoot, "baseline-v2", "behavior")
const baselinePath = join(behaviorRoot, "catalog.json")
const fixtureRoot = join(evidenceRoot, "fixtures-v2")
const candidatePath = join(evidenceRoot, "candidate", "behavior", `${runId}.json`)
const { fixtures, counts, supplements } = loadCatalogFixtures()

function loadModule(entry) {
  const result = buildSync({
    entryPoints: [entry],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  })
  const module = { exports: {} }
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports)
  return module.exports
}

function browserBundle() {
  return buildSync({
    entryPoints: [join(repoRoot, "Web", "custom", "steptrace", "src", "entries", "browser.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    write: false,
  }).outputFiles[0].text
}

const engineBrowserBundle = browserBundle()

async function interactiveEvidence(browser, fixture) {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
    reducedMotion: "reduce",
  })
  await page.setContent('<main><div id="root"></div></main>')
  await page.addScriptTag({ content: engineBrowserBundle })
  const result = await page.evaluate(
    async ({ config, operations, ownership }) => {
      const root = document.querySelector("#root")
      const handle = globalThis.steptrace.mount(root, config)
      const observedOwnership = root.dataset.visualFamily
        ? `family:${root.dataset.visualFamily}`
        : undefined
      if (observedOwnership !== ownership) {
        throw new Error(
          `runtime ownership ${observedOwnership ?? "missing"} did not match ${ownership}`,
        )
      }
      const settle = () =>
        new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const waitForOutcome = async (statusPattern) => {
        const deadline = performance.now() + 3000
        while (performance.now() < deadline) {
          const status = root.querySelector('[role="status"]')?.textContent?.trim() ?? ""
          if (new RegExp(statusPattern).test(status)) {
            await new Promise((resolve) => setTimeout(resolve, 400))
            await settle()
            return
          }
          await new Promise((resolve) => requestAnimationFrame(resolve))
        }
        throw new Error(`timed out waiting for ${statusPattern}`)
      }
      const semanticSnapshot = (target) => {
        const ignoredClasses = new Set(["steptrace--reduced", "steptrace__rail-region--animating"])
        const visit = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.replace(/\s+/g, " ").trim()
            return text || null
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return null
          const attributes = {}
          for (const name of node.getAttributeNames().sort()) {
            if (name === "style" || name === "id" || name === "class") continue
            if (name.startsWith("aria-") || name === "role" || name.startsWith("data-")) {
              attributes[name] = node.getAttribute(name)
            }
          }
          const classes = [...node.classList].filter((name) => !ignoredClasses.has(name)).sort()
          const state = {}
          if ("disabled" in node) state.disabled = node.disabled
          if ("value" in node && /^(INPUT|SELECT)$/.test(node.tagName)) state.value = node.value
          if ("checked" in node) state.checked = node.checked
          const children = [...node.childNodes].map(visit).filter(Boolean)
          return { tag: node.tagName.toLowerCase(), classes, attributes, state, children }
        }
        return visit(target)
      }
      const snap = () => ({
        semanticDom: semanticSnapshot(root),
        statusText:
          root.querySelector('[role="status"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        resultText:
          root
            .querySelector(".steptrace__insight-text")
            ?.textContent?.replace(/\s+/g, " ")
            .trim() ?? "",
        controls: [...root.querySelectorAll("button,input,select")].map((control) => ({
          tag: control.tagName.toLowerCase(),
          label: control.getAttribute("aria-label") || control.textContent.trim(),
          value: control.value ?? "",
          disabled: Boolean(control.disabled),
        })),
      })
      const structureFingerprint = () => {
        const body = root.querySelector(".steptrace__body")
        if (!body) return ""
        const clone = body.cloneNode(true)
        clone
          .querySelectorAll(
            ".steptrace__hash-calculation,.steptrace__hash-operation,.steptrace__hash-probe-lane,.steptrace__hash-token",
          )
          .forEach((element) => element.remove())
        for (const element of [clone, ...clone.querySelectorAll("*")]) {
          element.removeAttribute("style")
          element.removeAttribute("id")
          for (const geometry of ["transform", "x1", "x2", "y1", "y2"]) {
            element.removeAttribute(geometry)
          }
          const structuralClasses = [...element.classList].filter(
            (name) =>
              !/(?:active|changed|current|emphasis|faded|flash|highlight|muted|pulse|selected|visited)/.test(
                name,
              ),
          )
          if (structuralClasses.length) element.className = structuralClasses.join(" ")
          else element.removeAttribute("class")
          for (const name of element.getAttributeNames()) {
            if (
              name === "aria-current" ||
              /^data-(?:active|affected|changed|current|emphasis|entering|exiting|faded|flash|highlight|muted|path|pulse|selected|state|visible|visited)$/.test(
                name,
              )
            ) {
              element.removeAttribute(name)
            }
          }
        }
        return clone.outerHTML.replace(/\s+/g, " ")
      }
      const applyControls = (controls) => {
        for (const [label, value] of Object.entries(controls)) {
          const control = [...root.querySelectorAll("input,select")].find(
            (candidate) => candidate.getAttribute("aria-label") === label,
          )
          if (!control) throw new Error(`missing control ${label}`)
          control.value = value
          control.dispatchEvent(new Event("input", { bubbles: true }))
          control.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }
      const stages = [{ name: "initial", required: true, observable: snap(), action: "mount" }]
      for (const name of ["valid", "invalid", "removal", "reset"]) {
        const recipe = operations[name]
        if (!recipe) throw new Error(`missing ${name} recipe`)
        if (!recipe.required) {
          if (!recipe.reason) throw new Error(`${name} optional recipe requires a reason`)
          stages.push({ name, required: false, skipped: true, reason: recipe.reason })
          continue
        }
        applyControls(recipe.controls)
        const button = [...root.querySelectorAll("button")].find(
          (candidate) => candidate.textContent.trim() === recipe.action,
        )
        if (!button || button.disabled)
          throw new Error(`${name} action ${recipe.action} is unavailable`)
        const beforeStructure = structureFingerprint()
        const beforeStatus = root.querySelector('[role="status"]')?.textContent?.trim() ?? ""
        button.click()
        await waitForOutcome(recipe.expected.status)
        const afterStructure = structureFingerprint()
        const afterStatus = root.querySelector('[role="status"]')?.textContent?.trim() ?? ""
        const changed = beforeStructure !== afterStructure
        if (!new RegExp(recipe.expected.status).test(afterStatus)) {
          throw new Error(
            `${name} status ${JSON.stringify(afterStatus)} did not match ${recipe.expected.status}`,
          )
        }
        if (recipe.expected.mutation === "change" && !changed)
          throw new Error(`${name} required a structure mutation but was a no-op`)
        if (recipe.expected.mutation === "same" && changed)
          throw new Error(`${name} changed structure unexpectedly`)
        if (name === "invalid" && beforeStatus === afterStatus)
          throw new Error("required invalid operation produced no observable outcome")
        stages.push({
          name,
          required: true,
          action: recipe.action,
          expected: recipe.expected,
          changed,
          observable: snap(),
        })
      }
      handle.destroy()
      return stages
    },
    { config: fixture.config, operations: fixture.operations, ownership: fixture.ownership },
  )
  await page.close()
  return result
}

const { steptrace } = loadModule(join(repoRoot, "Web", "custom", "steptrace", "src", "engine.ts"))
const frameFixtures = fixtures.filter(({ descriptorType }) => descriptorType === "frame")
const interactiveFixtures = fixtures.filter(
  ({ descriptorType }) => descriptorType === "interactive",
)
const browser = await chromium.launch({ headless: true })
const frameRecords = []
for (const fixture of frameFixtures) {
  const built = steptrace.buildFrames(fixture.config)
  assert.equal(runtimeOwnership(built), fixture.ownership, `${fixture.id} runtime ownership`)
  const active = activeFrame(built.frames)
  const normalizedFrames = stable(built.frames)
  const record = {
    id: fixture.id,
    kind: built.kind,
    fixtureHash: sha256(stableJson(fixture.config)),
    frameCount: built.frames.length,
    active,
    frames: normalizedFrames,
    graph: stable(built.graph ?? null),
    endpointSettings: stable(built.endpointSettings ?? null),
    frontierLabel: built.frontierLabel ?? null,
    terminalResult: stable(built.frames.at(-1) ?? null),
  }
  record.contentHash = sha256(stableJson(record))
  frameRecords.push(record)
}
const interactiveRecords = []
for (const fixture of interactiveFixtures) {
  let transitions
  try {
    transitions = await interactiveEvidence(browser, fixture)
  } catch (error) {
    throw new Error(`${fixture.id}: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error,
    })
  }
  const record = {
    id: fixture.id,
    kind: "interactive",
    fixtureHash: sha256(stableJson(fixture.config)),
    transitions,
  }
  record.contentHash = sha256(stableJson(record))
  interactiveRecords.push(record)
}
await browser.close()

const publicRegistration = {
  version: steptrace.VERSION,
  kinds: Object.fromEntries(fixtures.map(({ id }) => [id, steptrace.kindOf(id) ?? "interactive"])),
  lists: Object.fromEntries(
    [
      "sort",
      "graph",
      "search",
      "string",
      "pointers",
      "dp",
      "unionfind",
      "bits",
      "backtrack",
      "rectree",
    ].map((kind) => [kind, steptrace.listAlgorithms(kind)]),
  ),
  methods: Object.fromEntries(
    [
      "kindOf",
      "listAlgorithms",
      "buildFrames",
      "mount",
      "registerSort",
      "registerGraph",
      "registerSearch",
      "registerString",
      "registerPointer",
      "registerDP",
      "registerUnionFind",
      "registerBits",
      "registerBacktrack",
      "registerRecTree",
    ].map((name) => [name, typeof steptrace[name]]),
  ),
}

const adapterInvocations = []
for (const [method, kind, ownership] of [
  ["registerSort", "sort", "family:array-sort"],
  ["registerGraph", "graph", "family:graph-state"],
  ["registerSearch", "search", "family:indexed-array-search"],
  ["registerString", "string", "family:string-match"],
  ["registerPointer", "pointers", "family:indexed-pointer-window"],
  ["registerDP", "dp", "family:matrix-grid"],
  ["registerUnionFind", "unionfind", undefined],
  ["registerBits", "bits", "legacy:bit-grid"],
  ["registerBacktrack", "backtrack", "legacy:backtrack-board"],
  ["registerRecTree", "rectree", undefined],
]) {
  const id = `proof-${kind}`
  let calls = 0
  steptrace[method](id, { label: `Proof ${kind}` }, () => calls++)
  assert.equal(steptrace.kindOf(id), kind)
  const built = steptrace.buildFrames({
    algorithm: id,
    array: [3, 1, 2],
    target: 2,
    text: "ABABA",
    pattern: "ABA",
    n: 4,
    width: 4,
    nodes: [0, 1],
    edges: [[0, 1, 1]],
    start: "0",
  })
  assert.equal(built.kind, kind)
  assert.equal(runtimeOwnership(built), ownership, `${method} runtime ownership`)
  assert.equal(calls, 1)
  adapterInvocations.push({ method, id, kind, calls, frameCount: built.frames.length })
}
publicRegistration.adapterInvocations = adapterInvocations
const evidence = {
  schemaVersion: 2,
  counts,
  normalizer: {
    ignoredAttributes: ["style", "id"],
    ignoredClasses: ["steptrace--reduced", "steptrace__rail-region--animating"],
  },
  publicRegistration,
  frames: frameRecords,
  interactive: interactiveRecords,
}

if (mode === "baseline") {
  assert.equal(
    existsSync(baselinePath),
    false,
    `immutable baseline already exists: ${baselinePath}`,
  )
  mkdirSync(behaviorRoot, { recursive: true })
  mkdirSync(join(fixtureRoot, "supplemental"), { recursive: true })
  writeFileSync(baselinePath, stableJson(evidence), { flag: "wx" })
  const fixtureCatalogPath = join(fixtureRoot, "catalog.json")
  const fixtureCatalog = stableJson({ schemaVersion: 1, counts, fixtures })
  if (existsSync(fixtureCatalogPath))
    assert.equal(readFileSync(fixtureCatalogPath, "utf8"), fixtureCatalog)
  else writeFileSync(fixtureCatalogPath, fixtureCatalog, { flag: "wx" })
  for (const [id, config] of Object.entries(supplements)) {
    const supplementalPath = join(fixtureRoot, "supplemental", `${id}.json`)
    const supplemental = stableJson(config)
    if (existsSync(supplementalPath))
      assert.equal(readFileSync(supplementalPath, "utf8"), supplemental)
    else writeFileSync(supplementalPath, supplemental, { flag: "wx" })
  }
} else {
  assert.equal(existsSync(baselinePath), true, `missing behavior baseline: ${baselinePath}`)
  mkdirSync(join(evidenceRoot, "candidate", "behavior"), { recursive: true })
  writeFileSync(candidatePath, stableJson(evidence), { flag: "wx" })
  assert.deepEqual(evidence, JSON.parse(readFileSync(baselinePath, "utf8")))
}

console.log(
  `steptrace design-system ${mode}: ${counts.frame} frame + ${counts.interactive} interactive = ${counts.total} descriptors passed`,
)
