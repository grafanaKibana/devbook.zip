import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { EventEmitter } from "node:events"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { buildSync } from "esbuild"

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
  "shell-sort",
  "comb-sort",
  "cyclic-sort",
  "introsort",
  "bfs",
  "dfs",
  "dijkstra",
  "prim",
  "topological-sort",
  "binary-search",
  "interpolation-search",
  "jump-search",
  "ternary-search",
  "binary-search-on-answer",
  "exponential-search",
  "linear-search",
  "kmp",
  "rabin-karp",
  "two-pointers",
  "sliding-window",
  "lcs",
  "floyd-warshall",
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

function loadStepTraceModule(...segments) {
  const result = buildSync({
    entryPoints: [join(here, ...segments)],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  })
  const module = { exports: {} }
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports)
  return module.exports
}

function buildAbstractDivideAndConquer() {
  const { divideAndConquer } = loadStepTraceModule("src", "algorithms", "divide-and-conquer.ts")
  const config = divideAndConquer.parse({ algorithm: "divide-and-conquer" })
  const recorder = divideAndConquer.family.createRecorder(config)
  divideAndConquer.run(config, recorder)
  return { config, family: divideAndConquer.family, frames: recorder.frames }
}

function contrastRatio(foreground, background) {
  const luminance = (hex) => {
    const channels = hex
      .slice(1)
      .match(/.{2}/g)
      .map((channel) => Number.parseInt(channel, 16) / 255)
      .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  }
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
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
  const quartzHostStyles = readFileSync(
    join(here, "..", "components", "styles", "steptrace.scss"),
    "utf8",
  )
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const engine = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const barsStyles = readFileSync(join(here, "src", "styles", "bars.scss"), "utf8")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")

  assert.match(styleEntry, /@use "shared";/)
  assert.match(quartzCss, /\.steptrace/)
  assert.match(obsidianCss, /--st-page: var\(--background-primary\)/)
  assert.match(obsidianCss, /--st-held-bg: #92400e/)
  assert.match(obsidianCss, /--st-held-fg: #ffffff/)
  assert.match(obsidianCss, /--st-table-cell: var\(--background-primary\)/)
  assert.match(obsidianCss, /--st-table-header: var\(--background-secondary\)/)
  assert.match(obsidianCss, /--st-table-border: var\(--background-modifier-border\)/)
  assert.match(obsidianCss, /--st-table-text: var\(--text-normal\)/)
  assert.match(obsidianCss, /--st-held-bg: #fbbf24/)
  assert.match(obsidianCss, /--st-held-fg: #1f2937/)
  assert.match(quartzHostStyles, /--st-held-bg: #92400e/)
  assert.match(quartzHostStyles, /--st-held-fg: #ffffff/)
  assert.match(quartzHostStyles, /--st-table-cell: var\(--light\)/)
  assert.match(quartzHostStyles, /--st-table-header: var\(--lightgray\)/)
  assert.match(quartzHostStyles, /--st-table-border: var\(--gray\)/)
  assert.match(quartzHostStyles, /--st-table-text: var\(--darkgray\)/)
  assert.match(quartzHostStyles, /--st-held-bg: #fbbf24/)
  assert.match(quartzHostStyles, /--st-held-fg: #1f2937/)
  assert.doesNotMatch(engine, /steptrace-engine-style|const STYLES|injectStyle/)
  assert.match(quartzCss, /\.steptrace__marker-body/)
  assert.match(quartzCss, /color:\s*var\(--_held-fg\)/)
  assert.match(quartzCss, /background:\s*var\(--_held-bg\)/)
  assert.match(quartzCss, /\.steptrace--reduced \.steptrace__marker/)
  assert.doesNotMatch(quartzCss, /\.steptrace__pin/)
  assert.match(renderSource, /probe\.innerHTML = ICON\.search/)
  assert.match(
    barsStyles,
    /\.steptrace__check,\s*\.steptrace__probe\s*{[^}]*left: 50%;[^}]*top: 50%;[^}]*translate\(-50%, -50%\)/s,
  )
  assert.match(
    barsStyles,
    /\.steptrace__bar\[data-state="probe"\] \.steptrace__probe\s*{[^}]*display: block;/s,
  )
  assert.match(barsStyles, /\.steptrace__fill\s*{[^}]*min-height: 1\.8rem;/s)
  assert.doesNotMatch(
    barsStyles,
    /\.steptrace__bar\[data-state="probe"\] \.steptrace__fill\s*{[^}]*min-height:/s,
  )
  assert.ok(contrastRatio("#ffffff", "#92400e") >= 4.5)
  assert.ok(contrastRatio("#1f2937", "#fbbf24") >= 4.5)
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
    const familyConfig =
      algorithm === "ternary-search"
        ? { array: [1, 4, 9, 12, 11, 7, 2], goal: "maximum" }
        : algorithm === "binary-search-on-answer"
          ? { weights: [3, 2, 2, 4, 1, 4], days: 3 }
          : algorithm === "shell-sort"
            ? { gaps: [4, 2, 1] }
            : algorithm === "cyclic-sort"
              ? { array: [5, 3, 1, 4, 2] }
          : algorithm === "floyd-warshall"
            ? {
                nodes: [0, 1, 2, 3],
                edges: [
                  [0, 1, 3],
                  [0, 3, 7],
                  [1, 0, 8],
                  [1, 2, 2],
                  [2, 0, 5],
                  [2, 3, 1],
                  [3, 0, 2],
                ],
              }
            : ["exponential-search", "interpolation-search", "jump-search"].includes(algorithm)
              ? { array: commonConfig.array.slice().sort((a, b) => a - b) }
              : {}
    const result = api.buildFrames({
      ...commonConfig,
      algorithm,
      ...familyConfig,
    })
    assert.ok(result.frames.length > 0, `${algorithm} must produce frames`)
    return result
  })
  const digest = createHash("sha256").update(JSON.stringify(output)).digest("hex")

  assert.equal(
    digest,
    "6d84b867612a9b1a9ab45387b9e33dec29b005225d7257a7d845a866a2945e3f",
    "the headless StepTrace behavior changed",
  )
})

test("divide-and-conquer uses the typed execution-tree family without algorithm input", () => {
  const { parseExecutionTreeConfig } = loadStepTraceModule("src", "families", "execution-tree.ts")
  const typesSource = readFileSync(join(here, "src", "types.ts"), "utf8")
  const familySource = readFileSync(join(here, "src", "families", "execution-tree.ts"), "utf8")
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const result = buildAbstractDivideAndConquer()

  assert.deepEqual(result.config, { profile: "divide-and-conquer" })
  assert.equal(result.family.id, "execution-tree")
  assert.deepEqual(parseExecutionTreeConfig({ algorithm: "divide-and-conquer" }), {
    profile: "divide-and-conquer",
  })
  assert.throws(
    () => parseExecutionTreeConfig({ algorithm: "divide-and-conquer", array: [8, 3, 5, 1] }),
    /does not take an "array"/,
  )
  assert.match(typesSource, /\| "execution-tree"/)
  assert.match(familySource, /satisfies VisualFamily<ExecutionTreeConfig/)
  assert.match(familySource, /cacheHit\(/)
  assert.match(familySource, /prune\(/)
  assert.match(mountSource, /\.\.\.\(shouldIncludeArray \? \{ array: state\.array \} : \{\}\)/)
})

test("divide-and-conquer frames expose split, base, return, and combine semantics on one topology", () => {
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const result = buildAbstractDivideAndConquer()
  const frames = result.frames
  const leftSplit = frames.find((frame) => frame.type === "split" && frame.active === "left")
  const firstBase = frames.find((frame) => frame.type === "base" && frame.active === "a")
  const leftCombine = frames.find((frame) => frame.type === "combine" && frame.active === "left")
  const final = frames.at(-1)

  assert.equal(frames.length, 18)
  assert.ok(frames.every((frame) => frame.nodes === frames[0].nodes))
  assert.ok(frames.every((frame) => frame.edges === frames[0].edges))
  assert.equal(frames[0].nodes.length, 7)
  assert.equal(frames[0].edges.length, 6)
  assert.deepEqual(leftSplit.path, ["root", "left"])
  assert.deepEqual(leftSplit.visible, ["root", "left", "right", "a", "b"])
  assert.equal(firstBase.states.a, "base")
  assert.equal(firstBase.results.a, "base result A1")
  assert.equal(leftCombine.states.left, "combine")
  assert.equal(leftCombine.results.left, "Result A")
  assert.equal(final.results.root, "Final solution")
  assert.equal(final.calls, 7)
  assert.equal(final.pruned, 0)
  assert.deepEqual(final.collapsed, [])
  assert.deepEqual(
    buildMilestones("divide-and-conquer", "rectree", frames).map((mark) => mark.label),
    [
      "Whole problem",
      "Split Problem",
      "Split Subproblem A",
      "Combine Subproblem A",
      "Split Subproblem B",
      "Combine Subproblem B",
      "Combine Problem",
      "Result",
    ],
  )
  assert.equal(summaryFor("divide-and-conquer", "rectree", final), "Final solution.")
  assert.doesNotMatch(JSON.stringify(frames), /\b(?:array|sort|merge)\b/i)
})

test("execution-tree rendering keeps its SVG topology stable and its text alternative dynamic", () => {
  class FakeNode {
    constructor(tagName, text = "") {
      this.tagName = tagName
      this.textContent = text
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = { setProperty: (key, value) => this.attributes.set(`style:${key}`, value) }
      this.className = ""
      this.id = ""
      this.tabIndex = -1
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    append(...children) {
      this.children.push(...children)
    }
  }
  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
    createTextNode: (value) => new FakeNode("#text", value),
  }
  try {
    const { makeExecutionTreeView } = loadStepTraceModule("src", "render.ts")
    const { executionTreeViewDescriptor } = loadStepTraceModule(
      "src",
      "families",
      "execution-tree.ts",
    )
    const { frames } = buildAbstractDivideAndConquer()
    const view = makeExecutionTreeView(frames, executionTreeViewDescriptor)
    const [wrap, legend] = view.nodes
    const svg = wrap.children[0]
    const topology = svg.children.slice()
    const firstCard = svg.children.find((node) => node.tagName === "g")
    const [ring, surface, label, , , badge] = firstCard.children

    view.paint(frames[0], 0, frames.length)
    assert.equal(svg.children.length, 2 + 6 + 7)
    assert.equal(svg.attributes.get("role"), "img")
    assert.match(svg.attributes.get("aria-labelledby"), /title.*description/)
    assert.equal(wrap.attributes.get("role"), "region")
    assert.equal(wrap.tabIndex, 0)
    assert.equal(legend.children.length, 4)
    assert.equal(svg.attributes.get("viewBox"), "0 0 604 232")
    assert.equal(svg.attributes.get("style:--steptrace-tree-min-width"), "560px")
    assert.equal(surface.attributes.get("rx"), "7")
    assert.equal(ring.attributes.get("rx"), "9")
    assert.equal(surface.attributes.get("width"), "100")
    assert.equal(ring.attributes.get("width"), "104")
    assert.equal(Number(label.attributes.get("y")) - Number(badge.attributes.get("y")), 12)
    assert.ok(
      svg.children
        .filter((node) => node.tagName === "g")
        .every((node) => node.attributes.get("focusable") === "false"),
    )

    view.paint(frames.at(-1), frames.length - 1, frames.length)
    assert.deepEqual(svg.children, topology)
    assert.equal(svg.children[0].textContent, "Execution tree: complete")
    assert.match(
      svg.children[1].textContent,
      /Active subproblem Problem; whole problem\. final result ready\./,
    )
    assert.equal(
      svg.children.find((node) => node.tagName === "g").children[4].textContent,
      "→ Final solution",
    )
  } finally {
    globalThis.document = previousDocument
  }
})

test("execution-tree watch, legend, responsive styles, and legacy Fibonacci remain compatible", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { executionTreeViewDescriptor } = loadStepTraceModule(
    "src",
    "families",
    "execution-tree.ts",
  )
  const styles = readFileSync(join(here, "src", "styles", "rectree.scss"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const hintsSource = readFileSync(join(here, "src", "watch-hints.ts"), "utf8")
  const divide = buildAbstractDivideAndConquer()
  const fibonacci = api.buildFrames({ algorithm: "fibonacci", n: 4 })
  const memoization = api.buildFrames({ algorithm: "fibonacci", n: 5 })
  const watch = executionTreeViewDescriptor.watchRows(divide.frames[7])

  assert.deepEqual(
    watch.map((row) => row.k),
    ["phase", "subproblem", "call path", "result"],
  )
  assert.equal(watch.at(-1).v, "Result A")
  assert.deepEqual(
    executionTreeViewDescriptor.legend.map((item) => item.state),
    ["split", "base", "return", "combine"],
  )
  assert.match(hintsSource, /"call path":/)
  assert.match(hintsSource, /subproblem:/)
  assert.match(hintsSource, /result:/)
  assert.match(hintsSource, /phase: "Current stage of the algorithm\."/)
  assert.equal(executionTreeViewDescriptor.nodeWidth, 100)
  assert.equal(executionTreeViewDescriptor.nodeHeight, 48)
  assert.equal(executionTreeViewDescriptor.minSvgWidth, 560)
  assert.match(mountSource, /root\.dataset\.visualFamily = built\.family\.id/)
  assert.match(
    sharedStyles,
    /\.steptrace:is\([\s\S]*?\[data-visual-family="monotone-boundary"\][\s\S]*?\)\s*\{\s*container: steptrace-wide-stage \/ inline-size;/,
  )
  assert.match(
    sharedStyles,
    /@container steptrace-wide-stage \(max-width: 64rem\)[\s\S]*?\[data-visual-family="monotone-boundary"\][\s\S]*?\.steptrace__body\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/,
  )
  assert.match(styles, /\.steptrace \.steptrace__rectree/)
  assert.match(styles, /overflow-x: auto/)
  assert.match(styles, /min-inline-size: var\(--steptrace-tree-min-width, 40rem\)/)
  assert.match(styles, /\.steptrace \.steptrace__rtsvg text/)
  assert.match(styles, /\.steptrace__rtlabel[^}]*font: 600 9px\/1 var\(--_font-mono\);/s)
  assert.match(styles, /\.steptrace__rtbadge[^}]*font: 600 6px\/1 var\(--_font-head\);/s)
  assert.doesNotMatch(styles, /glow|drop-shadow/)
  assert.match(renderSource, /svg\.setAttribute\("aria-labelledby"/)
  assert.match(renderSource, /group\.setAttribute\("focusable", "false"\)/)
  assert.equal(fibonacci.family, undefined)
  assert.equal(fibonacci.kind, "rectree")
  assert.ok(fibonacci.frames.some((frame) => frame.type === "hit"))
  assert.ok(fibonacci.frames.every((frame) => frame.nodes === fibonacci.frames[0].nodes))
  assert.ok(fibonacci.frames.every((frame) => frame.edges === fibonacci.frames[0].edges))
  assert.equal(memoization.frames.at(-1).vals.c0, 5)
  assert.equal(memoization.frames.at(-1).memo.length, 6)
  assert.ok(memoization.frames.some((frame) => frame.type === "hit" && frame.collapsed.length > 0))
})

test("Floyd-Warshall records matrix relaxations through each permitted intermediate", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "floyd-warshall",
    nodes: [0, 1, 2, 3],
    edges: [
      [0, 1, 3],
      [0, 3, 7],
      [1, 0, 8],
      [1, 2, 2],
      [2, 0, 5],
      [2, 3, 1],
      [3, 0, 2],
    ],
  })
  const { matrixGridFooterModel, matrixGridRolesForCell, matrixGridViewSemantics } =
    loadStepTraceModule("src", "families", "matrix-grid.ts")
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const improve = result.frames.find(
    (frame) => frame.type === "relax" && frame.k === 1 && frame.cur?.join(",") === "0,2",
  )
  const stage = result.frames.find((frame) => frame.type === "stage" && frame.k === 1)
  const keep = result.frames.find(
    (frame) => frame.type === "relax" && frame.k === 0 && frame.cur?.join(",") === "1,0",
  )
  const final = result.frames.at(-1)
  const milestones = buildMilestones("floyd-warshall", "dp", result.frames).map(
    (mark) => mark.label,
  )
  const watch = matrixGridViewSemantics.watchRows(improve)

  assert.equal(result.family.id, "matrix-grid")
  assert.equal(improve.decision, "improve")
  assert.equal(improve.candidate, 5)
  assert.equal(improve.previous, null)
  assert.equal(improve.result, 5)
  assert.equal(improve.operandA, 3)
  assert.equal(improve.operandB, 2)
  assert.deepEqual(improve.deps, [
    [0, 1],
    [1, 2],
  ])
  assert.deepEqual(final.grid, [
    [0, 3, 5, 6],
    [5, 0, 2, 3],
    [3, 6, 0, 1],
    [2, 5, 7, 0],
  ])
  assert.ok(milestones.includes("Stage k = 0"))
  assert.ok(milestones.includes("Stage k = 3"))
  assert.equal(watch.find((row) => row.k === "stage k")?.v, "1")
  assert.match(
    String(watch.find((row) => row.k === "dist[i][j]")?.v),
    /dist\[0\]\[2\] = ∞ before this relaxation/,
  )
  assert.equal(watch.find((row) => row.k === "candidate")?.v, "3 + 2 = 5")
  assert.equal(watch.find((row) => row.k === "decision")?.v, "write ∞ → 5")
  assert.deepEqual(matrixGridFooterModel(improve), {
    context: "Stage k = 1",
    summary: { role: "write", text: "Write 5 · ∞ → 5" },
  })
  assert.deepEqual(matrixGridFooterModel(result.frames[0]), {
    context: "Initialize distance matrix",
    summary: { text: "Seed diagonal, edges, and ∞" },
  })
  assert.deepEqual(matrixGridFooterModel(stage), {
    context: "Stage k = 1",
    summary: { text: "Compare 16 pairs through node 1" },
  })
  assert.deepEqual(matrixGridFooterModel(keep), {
    context: "Stage k = 0",
    summary: { role: "keep", text: "Keep 8 · via 0 is not shorter" },
  })
  assert.deepEqual(matrixGridFooterModel(final), {
    context: "All stages complete",
    summary: { text: "16 distances ready" },
  })

  const coincident = result.frames.find(
    (frame) => frame.type === "relax" && frame.k === 0 && frame.cur?.join(",") === "0,0",
  )
  assert.deepEqual(matrixGridRolesForCell(coincident, 0, 0), [
    "stage-axis",
    "operand-a",
    "operand-b",
    "target",
  ])
  assert.match(
    matrixGridViewSemantics.cellLabel(improve, 0, 2),
    /previous ∞; candidate 5; decision improve; result 5/,
  )
})

test("Floyd-Warshall rejects malformed matrix inputs and reports negative cycles", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))

  assert.throws(
    () => api.buildFrames({ algorithm: "floyd-warshall", nodes: [], edges: [] }),
    /non-empty numeric "nodes"/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "floyd-warshall", nodes: [0, 0], edges: [] }),
    /unique "nodes"/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "floyd-warshall", nodes: [0, 1], edges: [[0, 1]] }),
    /finite \[from, to, weight\] tuple/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "floyd-warshall", nodes: [0, 1], edges: [[0, 2, 1]] }),
    /reference nodes declared/,
  )

  const cycle = api.buildFrames({
    algorithm: "floyd-warshall",
    nodes: [0, 1],
    edges: [
      [0, 1, 1],
      [1, 0, -3],
    ],
  })
  const cycleFrame = cycle.frames.find((frame) => frame.type === "negative-cycle")
  const { matrixGridFooterModel } = loadStepTraceModule("src", "families", "matrix-grid.ts")
  assert.ok(cycleFrame)
  assert.ok(cycle.frames.at(-1).message.includes("negative cycle"))
  assert.deepEqual(matrixGridFooterModel(cycleFrame), {
    context: "Negative cycle",
    summary: { text: "Cycle paths are unbounded" },
  })
})

test("LCS keeps the default matrix-grid behavior and accessible table semantics", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({ algorithm: "lcs", a: "ABCBDAB", b: "BDCABA" })
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const { lcsMatrixGridSemantics } = loadStepTraceModule("src", "render.ts")

  assert.equal(result.family, undefined)
  assert.equal(result.frames.at(-1).grid.at(-1).at(-1), 4)
  assert.equal(lcsMatrixGridSemantics.stageLayout, undefined)
  assert.match(
    renderSource,
    /export function makeDPView\(frames, semantics = lcsMatrixGridSemantics\)/,
  )
  assert.match(renderSource, /table\.setAttribute\("aria-label", semantics\.tableLabel\)/)
  assert.match(renderSource, /th\.setAttribute\("scope", "col"\)/)
  assert.match(renderSource, /th\.setAttribute\("scope", "row"\)/)
  assert.equal(
    lcsMatrixGridSemantics.stateForCell({ cur: [0, 0], deps: [[0, 0]], path: [[0, 0]] }, 0, 0),
    "cur",
  )
})

test("Floyd-Warshall keeps one stable semantic footer inside its matrix table", () => {
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "dp.scss"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const { matrixGridViewSemantics } = loadStepTraceModule("src", "families", "matrix-grid.ts")
  const { lcsMatrixGridSemantics } = loadStepTraceModule("src", "render.ts")

  assert.equal(matrixGridViewSemantics.stageLayout, "fill")
  assert.ok(matrixGridViewSemantics.footerModel)
  assert.equal(lcsMatrixGridSemantics.footerModel, undefined)
  assert.match(renderSource, /function makeMatrixFooter\(/)
  assert.match(renderSource, /document\.createElement\("tfoot"\)/)
  assert.match(renderSource, /cell\.colSpan = columnCount/)
  assert.match(renderSource, /table\.append\(root\)/)
  assert.match(
    renderSource,
    /const footer = semantics\.footerModel \? makeMatrixFooter\(table, C \+ 1, roleLegend\) : null/,
  )
  assert.match(
    renderSource,
    /if \(footer && semantics\.footerModel\) footer\.paint\(semantics\.footerModel\(frame\)\)/,
  )
  assert.match(renderSource, /if \(stage\) stage\.append\(wrap\)/)
  assert.doesNotMatch(
    renderSource,
    /makeMatrixComparison|lensModel|matrix-comparison|summaryBadge|formula\.kind === "via"/,
  )
  assert.match(
    styles,
    /\.steptrace \.steptrace__dp tfoot\s*\{\s*display: table-footer-group !important;/,
  )
  assert.match(
    styles,
    /\.steptrace \.steptrace__matrix-footer > tr > td\s*\{[^}]*height: 2\.75rem;[^}]*border-top: 1px solid var\(--_matrix-border-color\) !important;[^}]*background: var\(--_matrix-header\);/s,
  )
  assert.match(
    styles,
    /\.steptrace \.steptrace__matrix-footer-row\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;[^}]*font: 400 var\(--_type-small\) \/ 1\.2 var\(--_font-head\);/s,
  )
  assert.match(renderSource, /steptrace__matrix-footer-context/)
  assert.match(renderSource, /steptrace__matrix-footer-summary/)
  assert.doesNotMatch(renderSource, /steptrace__matrix-footer-(?:label|formula|output)/)
  assert.match(
    styles,
    /\.steptrace \.steptrace__matrix-footer-context\s*\{[^}]*justify-self: start;[^}]*text-align: left;/s,
  )
  assert.doesNotMatch(
    styles,
    /tbody tr:last-child td:last-child\[data-roles~="target"\]::before[^}]*border-bottom-right-radius/s,
  )
  assert.match(
    styles,
    /\.steptrace \.steptrace__dp-wrap\s*\{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s,
  )
  assert.match(
    sharedStyles,
    /\[data-visual-family="matrix-grid"\][\s\S]*@container steptrace-wide-stage \(max-width: 64rem\)/,
  )
  assert.doesNotMatch(styles, /\.steptrace__matrix-comparison|comparison-band|comparison-summary/)
})

test("Quartz StepTrace hydration inspects added subtrees and restores removed stylesheets", () => {
  const component = readFileSync(join(here, "..", "components", "steptrace.tsx"), "utf8")
  const observer = component.slice(
    component.indexOf("new MutationObserver"),
    component.indexOf("run();\n})();"),
  )

  assert.match(component, /stylePromise && existing && existing\.isConnected/)
  assert.match(component, /stylePromise = null;/)
  assert.match(observer, /records\[i\]\.addedNodes/)
  assert.match(observer, /node\.matches\("\.steptrace-mount:not\(\[data-steptrace-mounted\]\)"\)/)
  assert.match(
    observer,
    /node\.querySelector\("\.steptrace-mount:not\(\[data-steptrace-mounted\]\)"\)/,
  )
  assert.doesNotMatch(observer, /document\.querySelector/)
})

test("shell sort uses the array-sort family and records gapped subsequences", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "shell-sort",
    array: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    gaps: [4, 1],
  })

  assert.equal(result.kind, "sort")
  assert.equal(result.family.id, "array-sort")
  assert.ok(result.frames.some((frame) => frame.type === "gap" && frame.gap === 4))
  assert.deepEqual(
    result.frames.find((frame) => frame.type === "subsequence" && frame.gap === 4)?.subsequence,
    [0, 4, 8],
  )
  assert.ok(result.frames.some((frame) => frame.type === "shift-held" && frame.gap === 4))
  const heldKeys = result.frames.filter((frame) => frame.type === "hold-key")
  const shifts = result.frames.filter((frame) => frame.type === "shift-held")
  const placements = result.frames.filter((frame) => frame.type === "place-held")
  assert.ok(heldKeys.every((frame) => frame.keyOrigin === frame.hole && frame.keyValue != null))
  assert.deepEqual(
    heldKeys.map((frame) => frame.tokenId),
    heldKeys.map((_, index) => index + 1),
  )
  assert.ok(shifts.every((frame) => frame.hole === frame.from))
  assert.ok(
    placements.every(
      (frame) => frame.hole === frame.active[0] && frame.keyValue != null && frame.tokenId != null,
    ),
  )
  for (const placement of placements) {
    const placementIndex = result.frames.indexOf(placement)
    const hold = result.frames
      .slice(0, placementIndex)
      .findLast((frame) => frame.type === "hold-key")
    assert.equal(placement.tokenId, hold.tokenId)
    assert.ok(
      result.frames
        .slice(result.frames.indexOf(hold), placementIndex + 1)
        .every((frame) => frame.tokenId === hold.tokenId),
    )
  }
  const comparisons = result.frames.filter((frame) => frame.type === "compare-held")
  assert.ok(comparisons.length > 0)
  assert.ok(comparisons.every((frame) => frame.active.length === 1 && frame.keyValue != null))
  assert.ok(result.frames.every((frame) => frame.type !== "compare"))
  assert.deepEqual(result.frames.at(-1).array, [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test("shell sort handles duplicates and alternate decreasing gap sequences", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const duplicateResult = api.buildFrames({
    algorithm: "shell-sort",
    array: [5, 3, 5, 1, 3, 2],
    gaps: [3, 1],
  })
  const alternateResult = api.buildFrames({
    algorithm: "shell-sort",
    array: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    gaps: [5, 2, 1],
  })

  assert.deepEqual(duplicateResult.frames.at(-1).array, [1, 2, 3, 3, 5, 5])
  assert.deepEqual(alternateResult.frames.at(-1).array, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.deepEqual(
    alternateResult.frames.filter((frame) => frame.type === "gap").map((frame) => frame.gap),
    [5, 2, 1],
  )
})

test("shell sort rejects gap sequences that cannot close with insertion sort", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  assert.throws(
    () => api.buildFrames({ algorithm: "shell-sort", array: [3, 2, 1], gaps: [2] }),
    /final gap to be 1/,
  )
})

test("comb sort reuses array-sort semantics for shrinking-gap compare and swap passes", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "comb-sort",
    array: [8, 4, 1, 6, 3, 2],
    shrinkFactor: 1.3,
  })
  const { arraySortSemanticsFor, resolveArraySortFrame } = loadStepTraceModule(
    "src",
    "families",
    "array-sort.ts",
  )
  const gaps = result.frames.filter((frame) => frame.type === "gap").map((frame) => frame.gap)
  const swap = result.frames.find((frame) => frame.type === "swap")
  const finalPass = result.frames.findLast((frame) => frame.type === "gap-complete")
  const semantics = arraySortSemanticsFor(result.frames)

  assert.equal(result.family.id, "array-sort")
  assert.deepEqual(gaps.slice(0, 4), [4, 3, 2, 1])
  assert.ok(
    result.frames.some((frame) => frame.type === "compare" && frame.subsequence?.length === 2),
  )
  assert.equal(resolveArraySortFrame(swap).activeRole, "move")
  assert.deepEqual(resolveArraySortFrame(swap).laneIndices, swap.subsequence)
  assert.equal(finalPass.gap, 1)
  assert.equal(finalPass.passSwapped, false)
  assert.deepEqual(semantics.markerLabels, ["left", "right"])
  assert.deepEqual(result.frames.at(-1).array, [1, 2, 3, 4, 6, 8])
})

test("cyclic sort keeps the cursor in place while each value moves to its home index", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({ algorithm: "cyclic-sort", array: [3, 1, 5, 4, 2] })
  const { arraySortSemanticsFor, resolveArraySortFrame } = loadStepTraceModule(
    "src",
    "families",
    "array-sort.ts",
  )
  const checks = result.frames.filter((frame) => frame.type === "home-check")
  const swaps = result.frames.filter((frame) => frame.type === "swap")
  const semantics = arraySortSemanticsFor(result.frames)

  assert.equal(result.family.id, "array-sort")
  assert.ok(checks.every((frame) => frame.home === frame.array[frame.cursor] - 1))
  assert.ok(swaps.every((frame) => frame.array[frame.home] === frame.home + 1))
  assert.ok(swaps.length <= result.frames[0].array.length - 1)
  assert.deepEqual(resolveArraySortFrame(checks[0]).markerIndices, [
    checks[0].cursor,
    checks[0].home,
  ])
  assert.deepEqual(semantics.markerLabels, ["at", "home"])
  assert.deepEqual(result.frames.at(-1).array, [1, 2, 3, 4, 5])
})

test("cyclic sort rejects values that do not form a 1-to-n permutation", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))

  assert.throws(
    () => api.buildFrames({ algorithm: "cyclic-sort", array: [1, 2, 2] }),
    /no duplicate values/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "cyclic-sort", array: [0, 2, 3] }),
    /range 1\.\.array\.length/,
  )
})

test("introsort educational thresholds expose quicksort, heap fallback, and insertion cleanup", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "introsort",
    array: [2, 1, 9, 8, 7, 6, 5, 4, 3],
    depthLimit: 1,
    smallPartitionThreshold: 3,
  })
  const { arraySortSemanticsFor } = loadStepTraceModule("src", "families", "array-sort.ts")
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const frameTypes = new Set(result.frames.map((frame) => frame.type))
  const fallback = result.frames.find((frame) => frame.type === "fallback")
  const cleanup = result.frames.find((frame) => frame.type === "cleanup")
  const milestones = buildMilestones("introsort", "sort", result.frames).map(
    (milestone) => milestone.label,
  )
  const semantics = arraySortSemanticsFor(result.frames)

  assert.equal(result.family.id, "array-sort")
  assert.ok(frameTypes.has("strategy"))
  assert.ok(frameTypes.has("defer"))
  assert.ok(frameTypes.has("fallback"))
  assert.ok(frameTypes.has("cleanup"))
  assert.ok(frameTypes.has("shift-held"))
  assert.equal(fallback.depthUsed, 1)
  assert.equal(fallback.depthLimit, 1)
  assert.equal(fallback.cutoff, 3)
  assert.equal(cleanup.strategy, "insertion sort")
  assert.deepEqual(semantics.markerLabels, ["scan", "pivot"])
  assert.ok(milestones.includes("Quicksort"))
  assert.ok(milestones.includes("Heap fallback"))
  assert.ok(milestones.includes("Insertion cleanup"))
  assert.deepEqual(result.frames.at(-1).array, [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test("introsort defaults derive the authentic depth budget on a larger adversarial input", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const array = [2, 1, ...Array.from({ length: 24 }, (_, index) => index + 4), 3]
  const result = api.buildFrames({ algorithm: "introsort", array })
  const initial = result.frames[0]
  const fallback = result.frames.find((frame) => frame.type === "fallback")

  assert.equal(array.length, 27)
  assert.equal(initial.depthLimit, 8)
  assert.equal(initial.cutoff, 16)
  assert.equal(fallback.depthUsed, 8)
  assert.equal(fallback.range[1] - fallback.range[0] + 1, 17)
  assert.ok(result.frames.some((frame) => frame.type === "defer"))
  assert.ok(result.frames.some((frame) => frame.type === "shift-held"))
  assert.deepEqual(
    result.frames.at(-1).array,
    Array.from({ length: 27 }, (_, index) => index + 1),
  )
})

test("introsort rejects invalid threshold configurations", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))

  assert.throws(
    () => api.buildFrames({ algorithm: "introsort", array: [3, 2, 1], depthLimit: -1 }),
    /depthLimit.*non-negative integer/,
  )
  assert.throws(
    () =>
      api.buildFrames({
        algorithm: "introsort",
        array: [3, 2, 1],
        smallPartitionThreshold: 0,
      }),
    /smallPartitionThreshold.*positive integer/,
  )
})

test("exponential search gallops to a bracket before reusing indexed binary-search states", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "exponential-search",
    array: [2, 4, 7, 11, 18, 29, 41, 56, 72],
    target: 41,
  })
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const { resolveIndexedSearchState } = loadStepTraceModule(
    "src",
    "families",
    "indexed-array-search.ts",
  )
  const gallop = result.frames.find((frame) => frame.phase === "gallop" && frame.bound === 4)
  const binary = result.frames.find((frame) => frame.type === "phase")
  const probes = result.frames.filter((frame) => frame.type === "probe").map((frame) => frame.mid)
  const milestones = buildMilestones("exponential-search", "search", result.frames).map(
    (mark) => mark.label,
  )

  assert.equal(result.family.id, "indexed-array-search")
  assert.deepEqual(probes, [0, 1, 2, 4, 8, 6])
  assert.deepEqual(binary.bracket, [4, 8])
  assert.equal(resolveIndexedSearchState(gallop, 2), "eliminated")
  assert.equal(resolveIndexedSearchState(gallop, 3), "range")
  assert.equal(resolveIndexedSearchState(gallop, 4), "probe")
  assert.equal(resolveIndexedSearchState(gallop, 5), "unseen")
  assert.ok(milestones.includes("Gallop"))
  assert.ok(milestones.includes("Binary search"))
  assert.equal(result.frames.at(-1).found, 6)
  assert.equal(result.frames.at(-1).comparisons, 6)
})

test("interpolation search probes the target's estimated position", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "interpolation-search",
    array: [0, 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121],
    target: 81,
  })
  const { resolveIndexedSearchState } = loadStepTraceModule(
    "src",
    "families",
    "indexed-array-search.ts",
  )
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const milestones = buildMilestones("interpolation-search", "search", result.frames).map(
    (mark) => mark.label,
  )
  assert.equal(result.family.id, "indexed-array-search")
  assert.equal(result.frames[1].phase, "interpolation")
  const probes = result.frames.filter((frame) => frame.type === "probe")
  assert.deepEqual(
    probes.map((frame) => frame.mid),
    [7, 8, 9],
  )
  assert.deepEqual(
    probes.map((frame) => frame.annotationValue),
    ["67% → [7]", "30% → [8]", "0% → [9]"],
  )
  assert.ok(
    result.frames
      .filter((frame) => frame.type === "narrow")
      .every((frame) => frame.annotationValue === null),
  )
  assert.ok(milestones.includes("Interpolation"))
  assert.equal(result.frames.at(-1).found, 9)
  assert.equal(result.frames.at(-1).comparisons, 3)
  assert.ok(
    result.frames.some((frame) => frame.type === "probe" && frame.phase === "interpolation"),
  )
  assert.equal(resolveIndexedSearchState(result.frames[1], 0), "range")
  assert.equal(resolveIndexedSearchState(result.frames.at(-1), 9), "found")
})

test("jump search probes in fixed blocks, then linearly scans", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "jump-search",
    array: [1, 3, 5, 7, 9, 11, 13, 15, 17],
    target: 13,
    blockSize: 3,
  })
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const milestones = buildMilestones("jump-search", "search", result.frames).map(
    (mark) => mark.label,
  )
  const scanBoundary = result.frames.find(
    (frame) => frame.type === "phase" && frame.phase === "scan",
  )

  assert.equal(result.family.id, "indexed-array-search")
  assert.equal(result.frames.at(-1).found, 6)
  assert.equal(scanBoundary?.lo, 6)
  assert.equal(scanBoundary?.hi, 8)
  assert.deepEqual(
    result.frames
      .filter((frame) => frame.type === "probe" && frame.phase === "jump")
      .map((frame) => frame.mid),
    [2, 5, 8],
  )
  assert.ok(result.frames.every((frame) => frame.blockSize === 3))
  assert.ok(result.frames.some((frame) => frame.type === "probe" && frame.phase === "scan"))
  assert.ok(milestones.includes("Jump blocks"))
  assert.ok(milestones.includes("Linear scan"))
})

test("ternary search narrows a strict unimodal range with simultaneous probes", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "ternary-search",
    array: [1, 4, 9, 12, 11, 7, 2],
    goal: "maximum",
  })
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const milestones = buildMilestones("ternary-search", "search", result.frames).map(
    (mark) => mark.label,
  )
  const dualProbe = result.frames.find(
    (frame) => frame.type === "probe" && frame.phase === "ternary",
  )

  assert.equal(result.family.id, "indexed-array-search")
  assert.equal(result.frames.at(-1).found, 3)
  assert.equal(result.frames.at(-1).array[result.frames.at(-1).found], 12)
  assert.equal(dualProbe.mid, 2)
  assert.equal(dualProbe.mid2, 4)
  assert.equal(dualProbe.comparisons, 2)
  assert.ok(milestones.includes("Narrow peak"))
  assert.ok(milestones.includes("Ternary"))
  assert.ok(milestones.includes("Probes 2/4"))
  assert.ok(milestones.includes("Final scan"))
})

test("binary search on answer finds the first feasible ship capacity", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "binary-search-on-answer",
    weights: [3, 2, 2, 4, 1, 4],
    days: 3,
  })
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const milestones = buildMilestones("binary-search-on-answer", "search", result.frames).map(
    (mark) => mark.label,
  )
  const evaluations = result.frames.filter((frame) => frame.type === "evaluate")
  const final = result.frames.at(-1)

  assert.equal(result.family.id, "monotone-boundary")
  assert.equal(final.answer, 6)
  assert.ok(evaluations.some((frame) => frame.evaluation.feasible))
  assert.ok(evaluations.some((frame) => !frame.evaluation.feasible))
  assert.ok(evaluations.every((frame) => frame.evaluation.allowed === 3))
  assert.deepEqual(
    evaluations.find((frame) => frame.candidate === 10)?.evaluation.lanes.map((lane) => lane.items),
    [
      [3, 2, 2],
      [4, 1, 4],
    ],
  )
  assert.ok(milestones.includes("Answer range"))
  assert.ok(milestones.includes("Check 10"))
  assert.equal(
    summaryFor("binary-search-on-answer", "search", final),
    "Minimum feasible capacity 6 · 4 probes.",
  )
})

test("binary search on answer has a dedicated monotone-boundary visual family", () => {
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "boundary.scss"), "utf8")
  const family = readFileSync(
    join(here, "src", "families", "monotone-boundary.ts"),
    "utf8",
  )

  assert.match(renderSource, /export function makeBoundarySearchView\(/)
  assert.match(renderSource, /frame\.maxInfeasible/)
  assert.match(renderSource, /frame\.minFeasible/)
  assert.match(renderSource, /model\.lanes\.slice\(model\.allowed\)/)
  assert.match(styles, /\.steptrace__boundary-ticks/)
  assert.match(styles, /\.steptrace__boundary-lane--overflow/)
  assert.match(family, /id: "monotone-boundary"/)
  assert.doesNotMatch(family, /makeSearchView/)
})

test("indexed search variants reject invalid family-specific inputs", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))

  assert.throws(
    () =>
      api.buildFrames({
        algorithm: "jump-search",
        array: [1, 3, 5],
        target: 3,
        blockSize: 0,
      }),
    /blockSize.*positive integer/,
  )
  assert.throws(
    () =>
      api.buildFrames({
        algorithm: "ternary-search",
        array: [1, 4, 3, 5, 2],
        goal: "maximum",
      }),
    /strictly increasing then strictly decreasing/,
  )
  assert.throws(
    () =>
      api.buildFrames({
        algorithm: "ternary-search",
        array: [1, 4, 2],
        goal: "minimum",
      }),
    /goal: "maximum"/,
  )
  assert.throws(
    () =>
      api.buildFrames({
        algorithm: "binary-search-on-answer",
        weights: [3, 0, 2],
        days: 3,
      }),
    /positive integer "weights"/,
  )
})

test("exponential search rejects unsorted arrays and non-numeric targets", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))

  assert.throws(
    () => api.buildFrames({ algorithm: "exponential-search", array: [2, 7, 4], target: 4 }),
    /non-decreasing order/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "exponential-search", array: [2, 4, 7], target: "4" }),
    /numeric "target"/,
  )
})

test("gap-aware sort frames create gap milestones without algorithm-name rules", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const { frames } = api.buildFrames({
    algorithm: "shell-sort",
    array: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    gaps: [4, 1],
  })

  assert.deepEqual(
    buildMilestones("another-gap-sort", "sort", frames)
      .filter((mark) => mark.label.startsWith("Gap"))
      .map((mark) => mark.label),
    ["Gap 4", "Gap 1"],
  )
})

test("array-sort maps semantic operations to accurate visual states", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { frames } = api.buildFrames({
    algorithm: "shell-sort",
    array: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    gaps: [4, 1],
  })
  const { arraySortViewSemantics, resolveArraySortFrame } = loadStepTraceModule(
    "src",
    "families",
    "array-sort.ts",
  )
  const { legacySortViewSemantics, resolveLegacySortFrame } = loadStepTraceModule(
    "src",
    "render.ts",
  )
  const subsequence = frames.find((frame) => frame.type === "subsequence")
  const held = frames.find((frame) => frame.type === "hold-key")
  const comparison = frames.find((frame) => frame.type === "compare-held")
  const shift = frames.find((frame) => frame.type === "shift-held")
  const placement = frames.find((frame) => frame.type === "place-held")

  const subsequenceVisual = resolveArraySortFrame(subsequence)
  const heldVisual = resolveArraySortFrame(held)
  const comparisonVisual = resolveArraySortFrame(comparison)
  const shiftVisual = resolveArraySortFrame(shift)
  const placementVisual = resolveArraySortFrame(placement)

  assert.equal(subsequenceVisual.activeRole, null)
  assert.deepEqual(subsequenceVisual.laneIndices, subsequence.subsequence)
  assert.equal(subsequenceVisual.holeIndex, null)
  assert.equal(heldVisual.holeIndex, held.hole)
  assert.deepEqual(heldVisual.heldToken, {
    id: held.tokenId,
    index: held.keyOrigin,
    label: `held ${held.keyValue}`,
    placing: false,
  })
  assert.equal(comparisonVisual.activeRole, "compare")
  assert.deepEqual(comparisonVisual.markerIndices, [comparison.active[0], null])
  assert.equal(shiftVisual.activeRole, "move")
  assert.deepEqual(shiftVisual.markerIndices, [null, shift.from])
  assert.equal(shiftVisual.holeIndex, shift.from)
  assert.equal(placementVisual.activeRole, null)
  assert.equal(placementVisual.holeIndex, placement.hole)
  assert.deepEqual(placementVisual.heldToken, {
    id: placement.tokenId,
    index: placement.hole,
    label: `held ${placement.keyValue}`,
    placing: true,
  })
  assert.equal(arraySortViewSemantics.movementLabel, "moves")
  assert.deepEqual(arraySortViewSemantics.markerLabels, ["at", "from"])
  assert.equal(
    arraySortViewSemantics.watchRows(comparison).find((row) => row.k === "held")?.v,
    comparison.keyValue,
  )
  assert.equal(legacySortViewSemantics.movementLabel, "swaps")
  const legacyVisual = resolveLegacySortFrame({ type: "compare", active: [0, 1], candidate: null })
  assert.equal(legacyVisual.activeRole, "compare")
  assert.equal(legacyVisual.laneIndices, null)
  assert.equal(legacyVisual.holeIndex, null)
  assert.equal(legacyVisual.heldToken, null)
})

test("marker centers stay inside both stage edges", () => {
  const { clampMarkerCenter } = loadStepTraceModule("src", "render.ts")

  assert.equal(clampMarkerCenter(4, 50, 200), 27)
  assert.equal(clampMarkerCenter(196, 50, 200), 173)
  assert.equal(clampMarkerCenter(100, 50, 200), 100)
  assert.equal(clampMarkerCenter(10, 300, 100), 50)
})

test("bar heights preserve relative scale above the shared icon floor", () => {
  const { barHeightStyle } = loadStepTraceModule("src", "render.ts")

  assert.equal(barHeightStyle(0, 100), "calc(0% + 1.8rem)")
  assert.equal(barHeightStyle(50, 100), "calc(50% + 0.9rem)")
  assert.equal(barHeightStyle(100, 100), "calc(100% + 0rem)")
})

test("held marker spring remains in transit early and settles near its target", () => {
  const { stepMarkerSpring } = loadStepTraceModule("src", "render.ts")
  let position = 0

  for (let elapsed = 0; elapsed < 48; elapsed += 16) {
    position = stepMarkerSpring(position, 100, 16)
  }
  assert.ok(position > 40 && position < 60)

  for (let elapsed = 48; elapsed < 400; elapsed += 16) {
    position = stepMarkerSpring(position, 100, 16)
  }
  assert.ok(position > 99)
  assert.equal(stepMarkerSpring(25, 100, 0), 25)
})

test("held marker continuity survives only same-token sequential navigation", () => {
  const { shouldResetHeldMarker } = loadStepTraceModule("src", "render.ts")

  assert.equal(shouldResetHeldMarker(null, { frameIndex: 10, tokenId: 2 }), true)
  assert.equal(
    shouldResetHeldMarker({ frameIndex: 10, tokenId: 2 }, { frameIndex: 11, tokenId: 2 }),
    false,
  )
  assert.equal(
    shouldResetHeldMarker({ frameIndex: 11, tokenId: 2 }, { frameIndex: 12, tokenId: 3 }),
    true,
  )
  assert.equal(
    shouldResetHeldMarker({ frameIndex: 11, tokenId: 2 }, { frameIndex: 10, tokenId: 2 }),
    true,
  )
  assert.equal(
    shouldResetHeldMarker({ frameIndex: 10, tokenId: 2 }, { frameIndex: 14, tokenId: 2 }),
    true,
  )
  assert.equal(
    shouldResetHeldMarker({ frameIndex: 10, tokenId: 2 }, { frameIndex: 10, tokenId: 2 }),
    true,
  )
})

test("Watch rows resolve every built-in label from one hint dictionary", () => {
  const { WATCH_HINTS, watchHintFor } = loadStepTraceModule("src", "watch-hints.ts")
  const labels = [
    "i",
    "j",
    "at",
    "from",
    "pivot",
    "range",
    "swaps",
    "moves",
    "held",
    "home",
    "gap",
    "lane",
    "target",
    "goal",
    "phase",
    "subproblem",
    "call path",
    "result",
    "probe",
    "probe 1",
    "probe 2",
    "estimate",
    "block",
    "days used",
    "capacity",
    "verdict",
    "scanned",
    "mid",
    "shift",
    "matches",
    "hash",
    "L",
    "left",
    "lo",
    "R",
    "right",
    "hi",
    "cell",
    "value",
    "stage k",
    "dist[i][j]",
    "dist[i][k]",
    "dist[k][j]",
    "candidate",
    "decision",
    "negative cycle",
    "sets",
    "edge",
    "x",
    "lowest 1",
    "1s cleared",
    "depth",
    "trying",
    "pruned",
    "calls",
    "memo",
    "event",
    "queue",
    "visited",
    "strategy",
    "cutoff",
  ]

  for (const label of labels) {
    assert.ok(WATCH_HINTS[label.toLowerCase()], `${label} needs a shared hint`)
    assert.equal(watchHintFor({ k: ` ${label} `, v: "—" }), WATCH_HINTS[label.toLowerCase()])
  }
  assert.equal(WATCH_HINTS.phase, "Current stage of the algorithm.")
  assert.equal(
    watchHintFor({ k: "target", v: 7, hint: "Override for this row." }),
    "Override for this row.",
  )
  assert.equal(watchHintFor({ k: "extension", v: 1 }), "Current extension value.")
})

test("Watch hint UI supports hover, focus, touch, and bounded responsive layout", () => {
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")

  assert.match(mountSource, /row\.tabIndex = 0/)
  assert.match(mountSource, /row\.setAttribute\("aria-label", `\$\{r\.k\}: \$\{String\(r\.v\)\}`\)/)
  assert.match(mountSource, /row\.setAttribute\("aria-describedby", hintId\)/)
  assert.match(mountSource, /hint\.setAttribute\("role", "tooltip"\)/)
  assert.match(styles, /\.steptrace__watch-row:hover \.steptrace__watch-hint/)
  assert.match(styles, /\.steptrace__watch-row:focus \.steptrace__watch-hint/)
  assert.match(styles, /max-inline-size: 100%/)
  assert.match(styles, /background: var\(--st-page, var\(--_surface\)\)/)
  assert.match(styles, /color: var\(--_text\)/)
  assert.match(styles, /@media \(hover: none\), \(pointer: coarse\)/)
  assert.match(styles, /min-height: 2\.75rem/)
  assert.match(styles, /\.steptrace--reduced \*/)
  assert.match(renderSource, /hasPivot && !semantics\.markerLabels\.includes\("pivot"\)/)
})
