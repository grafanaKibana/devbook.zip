import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { EventEmitter } from "node:events"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { expectedArtifacts, verifyArtifacts } from "./build.mjs"
import { startWatcher } from "./watch.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, "..", "..", "..")

const cases = [
  "bubble-sort",
  "insertion-sort",
  "selection-sort",
  "quick-sort",
  "heap-sort",
  "merge-sort",
  "bfs",
  "dfs",
  "dijkstra",
  "prim",
  "topological-sort",
  "binary-search",
  "linear-search",
  "kmp",
  "rabin-karp",
  "two-pointers",
  "sliding-window",
  "lcs",
  "union-find",
  "kernighan-popcount",
  "n-queens",
  "fibonacci",
]

const commonConfig = {
  array: [8, 3, 5, 1, 9, 2, 7, 4],
  target: 7,
  text: "ABABACABA",
  pattern: "ABAC",
  a: "ABCBDAB",
  b: "BDCABA",
  n: 4,
  x: 37,
  width: 8,
  ops: [
    ["union", 0, 1],
    ["union", 2, 3],
    ["find", 1],
  ],
  nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
  edges: [
    { from: "A", to: "B", weight: 2 },
    { from: "A", to: "C", weight: 5 },
    { from: "B", to: "C", weight: 1 },
    { from: "B", to: "D", weight: 4 },
    { from: "C", to: "D", weight: 1 },
  ],
  start: "A",
  directed: true,
}

function loadEngine(source) {
  delete globalThis.steptrace
  new Function(source)()
  const api = globalThis.steptrace
  delete globalThis.steptrace
  return api
}

test("the build exactly matches every committed host artifact", async () => {
  const expected = await expectedArtifacts()
  for (const { path, content } of expected.files) {
    assert.equal(readFileSync(path, "utf8"), content, `${path} must be current`)
  }
  await assert.doesNotReject(() => verifyArtifacts())
})

test("the public API and both host JavaScript contracts stay stable", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  assert.equal(api.VERSION, "2.0.0")
  assert.deepEqual(Object.keys(api), [
    "VERSION",
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
    "listAlgorithms",
    "kindOf",
    "buildFrames",
    "adjacency",
    "mount",
  ])

  const obsidian = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const pluginModule = { exports: {} }
  const Plugin = class {}
  class MarkdownRenderChild {}
  class Notice {}
  class SliderComponent {}
  new Function("module", "exports", "require", obsidian)(
    pluginModule,
    pluginModule.exports,
    (id) => {
      assert.equal(id, "obsidian")
      return { Plugin, MarkdownRenderChild, Notice, SliderComponent }
    },
  )
  assert.equal(typeof pluginModule.exports, "function")
  assert.equal(Object.getPrototypeOf(pluginModule.exports), Plugin)
})

test("styles are compiled from real SCSS without runtime injection", () => {
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const engine = readFileSync(join(here, "generated", "engine.js"), "utf8")

  assert.match(styleEntry, /@use "shared";/)
  assert.match(quartzCss, /\.steptrace/)
  assert.match(obsidianCss, /--st-page: var\(--background-primary\)/)
  assert.doesNotMatch(engine, /steptrace-engine-style|const STYLES|injectStyle/)
})

test("the watcher handles Chokidar add and atomic-change events", async () => {
  const events = new EventEmitter()
  events.close = async () => {}
  let options
  let builds = 0
  const session = startWatcher({
    paths: ["src"],
    debounceMs: 20,
    logger: { log() {}, error() {} },
    watch(_paths, receivedOptions) {
      options = receivedOptions
      return events
    },
    async onBuild() {
      builds++
      return { artifacts: 6, quartzPublicSynced: false }
    },
  })

  assert.equal(options.atomic, true)
  events.emit("all", "add", "src/algorithms/new.ts")
  await delay(40)
  events.emit("all", "change", "src/styles/shared.scss")
  await delay(40)
  assert.equal(builds, 2)
  await session.close()
})

test("all built-in algorithms preserve their headless frame contract", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const output = cases.map((algorithm) => {
    assert.notEqual(api.kindOf(algorithm), null, `${algorithm} must stay registered`)
    const result = api.buildFrames({ ...commonConfig, algorithm })
    assert.ok(result.frames.length > 0, `${algorithm} must produce frames`)
    return result
  })
  const digest = createHash("sha256").update(JSON.stringify(output)).digest("hex")

  assert.equal(
    digest,
    "f657dd365857965337ecf0e323d55041d613e693b2709139f06addc76f61a065",
    "the headless StepTrace behavior changed",
  )
})
