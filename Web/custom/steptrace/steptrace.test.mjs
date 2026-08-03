import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { EventEmitter } from "node:events"
import { readFileSync, readdirSync } from "node:fs"
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
  "activity-selection",
  "a-star",
  "articulation-points-and-bridges",
  "bellman-ford",
  "bidirectional-search",
  "boruvka",
  "connected-components",
  "greedy-best-first-search",
  "hamiltonian-cycle",
  "kruskal",
  "maximum-flow",
  "strongly-connected-components",
  "bubble-sort",
  "insertion-sort",
  "selection-sort",
  "quick-sort",
  "heap-sort",
  "merge-sort",
  "merge-sort-tree",
  "merge-intervals",
  "prefix-sum",
  "monotonic-stack-and-queue",
  "shell-sort",
  "comb-sort",
  "counting-sort",
  "radix-sort",
  "bucket-sort",
  "cyclic-sort",
  "introsort",
  "tim-sort",
  "bfs",
  "dfs",
  "dijkstra",
  "prim",
  "topological-sort",
  "top-k-elements",
  "binary-search",
  "interpolation-search",
  "jump-search",
  "ternary-search",
  "binary-search-on-answer",
  "exponential-search",
  "linear-search",
  "kmp",
  "rabin-karp",
  "z-algorithm",
  "boyer-moore",
  "two-pointers",
  "sliding-window",
  "lcs",
  "coin-change-greedy",
  "coin-change-naive",
  "coin-change-memoization",
  "coin-change-tabulation",
  "coin-change-top-down",
  "coin-change-bottom-up",
  "grid-path-greedy",
  "grid-path-naive",
  "grid-path-memoization",
  "grid-path-tabulation",
  "grid-path-top-down",
  "grid-path-bottom-up",
  "floyd-warshall",
  "fast-and-slow-pointers",
  "kernighan-popcount",
  "n-queens",
  "memoization",
  "branch-and-bound",
  "trie",
  "aho-corasick",
  "ternary-search-tree",
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
  operations: [
    ["insert", "car"],
    ["insert", "card"],
    ["insert", "care"],
    ["insert", "cat"],
    ["insert", "dog"],
    ["prefix", "ca"],
    ["search", "car"],
  ],
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

function buildAbstractMemoization() {
  const { memoization } = loadStepTraceModule("src", "algorithms", "memoization.ts")
  const config = memoization.parse({ algorithm: "memoization" })
  const recorder = memoization.family.createRecorder(config)
  memoization.run(config, recorder)
  return { config, family: memoization.family, frames: recorder.frames }
}

function buildBranchAndBound() {
  const { branchAndBound } = loadStepTraceModule("src", "algorithms", "branch-and-bound.ts")
  const config = branchAndBound.parse({ algorithm: "branch-and-bound" })
  const recorder = branchAndBound.family.createRecorder(config)
  branchAndBound.run(config, recorder)
  return { config, family: branchAndBound.family, frames: recorder.frames }
}

function buildBidirectionalSearch() {
  const { bidirectionalSearch } = loadStepTraceModule(
    "src",
    "algorithms",
    "bidirectional-search.ts",
  )
  const config = bidirectionalSearch.parse({ algorithm: "bidirectional-search" })
  const recorder = bidirectionalSearch.family.createRecorder(config)
  bidirectionalSearch.run(config, recorder)
  return { config, family: bidirectionalSearch.family, frames: recorder.frames }
}

function buildMergeSortTree(array = [8, 3, 7, 4, 9, 2, 5, 1]) {
  const { mergeSortTree } = loadStepTraceModule("src", "algorithms", "merge-sort-tree.ts")
  const config = mergeSortTree.parse({ algorithm: "merge-sort-tree", array })
  const recorder = mergeSortTree.family.createRecorder(config)
  mergeSortTree.run(config, recorder)
  return { config, family: mergeSortTree.family, frames: recorder.frames }
}

function buildDynamicProgramming(name) {
  const algorithms = loadStepTraceModule("src", "algorithms", "dynamic-programming.ts")
  const algorithm = algorithms[name]
  const config = algorithm.parse({ algorithm: algorithm.id })
  const recorder = algorithm.family.createRecorder(config)
  algorithm.run(config, recorder)
  return { config, family: algorithm.family, frames: recorder.frames }
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

test("the Obsidian bundle registers complexity and keeps invalid source local", () => {
  const obsidian = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const processors = new Map()
  class Plugin {
    registerMarkdownCodeBlockProcessor(language, processor) {
      processors.set(language, processor)
    }
    addCommand() {}
  }
  class MarkdownRenderChild {}
  class Notice {}
  class SliderComponent {}
  const pluginModule = { exports: {} }
  new Function("module", "exports", "require", obsidian)(
    pluginModule,
    pluginModule.exports,
    (id) => {
      assert.equal(id, "obsidian")
      return { Plugin, MarkdownRenderChild, Notice, SliderComponent }
    },
  )
  const plugin = new pluginModule.exports()
  plugin.onload()
  assert.deepEqual([...processors.keys()], ["steptrace", "complexity"])

  const rendered = []
  let children = 0
  processors.get("complexity")(
    "{broken",
    {
      replaceChildren() {
        children = 0
      },
      createEl(tag, options) {
        rendered.push({ tag, text: options?.text })
        children++
        return {}
      },
    },
    {
      addChild() {
        assert.fail("invalid complexity source must not register a render child")
      },
    },
  )
  assert.equal(children, 1)
  assert.equal(rendered.at(-1).tag, "pre")
  assert.match(rendered.at(-1).text, /complexity: .*JSON/)
  assert.match(rendered.at(-1).text, /{broken/)
})

test("Z-Algorithm config is registered with an isolated typed string profile", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Search Algorithms",
      "String Matching",
      "Z-Algorithm.md",
    ),
    "utf8",
  )
  const result = api.buildFrames({
    algorithm: "z-algorithm",
    text: "aabcaabxaaaz",
  })

  assert.equal(api.kindOf("z-algorithm"), "string")
  assert.equal(result.kind, "string")
  assert.equal(result.frames[0].profile, "z-array")
  assert.match(note, /```steptrace\n\{"algorithm":"z-algorithm","text":"aabcaabxaaaz"\}\n```/)
})

test("full Boyer-Moore records both shift rules and the canonical winning decisions", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildGoodSuffixTable } = loadStepTraceModule("src", "algorithms", "boyer-moore.ts")
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Search Algorithms",
      "String Matching",
      "Boyer-Moore.md",
    ),
    "utf8",
  )
  const frames = api.buildFrames({
    algorithm: "boyer-moore",
    text: "ACCCDBACBA",
    pattern: "ACBA",
  }).frames

  assert.equal(api.kindOf("boyer-moore"), "string")
  assert.equal(frames[0].profile, "boyer-moore")
  assert.deepEqual(buildGoodSuffixTable("ACBA"), [3, 3, 3, 1])
  assert.deepEqual(frames[0].goodSuffix, [3, 3, 3, 1])
  assert.deepEqual(
    frames.filter((frame) => frame.type === "align").map((frame) => frame.shift),
    [0, 2, 3, 6],
  )
  assert.deepEqual(
    frames
      .filter((frame) => frame.type === "decision")
      .map((frame) => [frame.shift, frame.j, frame.shiftDecision]),
    [
      [0, 3, { bad: 2, good: 1, selected: 2, winner: "bad-character" }],
      [2, 3, { bad: 1, good: 1, selected: 1, winner: "tie" }],
      [3, 1, { bad: 2, good: 3, selected: 3, winner: "good-suffix" }],
    ],
  )
  assert.deepEqual(
    frames
      .filter((frame) => frame.type === "compare" && frame.shift === 3)
      .map((frame) => [frame.j, frame.cmpResult]),
    [
      [3, "match"],
      [2, "match"],
      [1, "mismatch"],
    ],
  )
  assert.ok(
    frames
      .filter((frame) => frame.type === "compare" && frame.shift === 3)
      .every((frame) => frame.shiftDecision === null),
  )
  assert.deepEqual(frames.find((frame) => frame.type === "match").shiftDecision, {
    bad: null,
    good: 3,
    selected: 3,
    winner: "full-match",
  })
  assert.equal(frames.length, 23)
  assert.equal(frames.at(-2).type, "shift")
  assert.equal(frames.at(-2).shift, 6)
  assert.match(frames.at(-2).message, /would leave the searchable range/)
  assert.equal(frames.at(-1).shift, 6)
  assert.deepEqual(frames.at(-1).found, [6])
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"boyer-moore","text":"ACCCDBACBA","pattern":"ACBA"\}\n```/,
  )
})

test("Boyer-Moore keeps UTF-16 indexing consistent for surrogate-pair matches", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const frames = api.buildFrames({
    algorithm: "boyer-moore",
    text: "😀x😀",
    pattern: "😀",
  }).frames

  assert.deepEqual(frames.at(-1).found, [0, 3])
})

test("Z-Algorithm frames expose copy, reuse-extension, comparisons, and the terminal array", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const frames = api.buildFrames({
    algorithm: "z-algorithm",
    text: "aabcaabxaaaz",
  }).frames
  const stages = new Set(frames.map((frame) => frame.type))
  const at = (i) => frames.filter((frame) => frame.i === i)
  const copyFive = at(5).find((frame) => frame.type === "copy")
  const reuseNine = at(9).find((frame) => frame.type === "copy")

  assert.deepEqual([...stages], ["init", "focus", "compare", "commit", "copy", "done"])
  assert.equal(copyFive.k, 1)
  assert.equal(copyFive.z[5], 1)
  assert.equal(copyFive.sourceCase, "copy")
  assert.equal(
    at(5).some((frame) => frame.type === "compare"),
    false,
  )
  assert.equal(reuseNine.k, 1)
  assert.equal(reuseNine.z[9], 1)
  assert.equal(reuseNine.sourceCase, "reuse-extend")
  assert.ok(
    at(9).some(
      (frame) =>
        frame.type === "compare" &&
        frame.compare.prefix === 1 &&
        frame.compare.candidate === 10 &&
        frame.compare.result === "match",
    ),
  )
  assert.deepEqual(frames.at(-1).z, [12, 1, 0, 0, 3, 1, 0, 0, 2, 2, 1, 0])
  assert.deepEqual(
    buildMilestones("z-algorithm", "string", frames).map((mark) => mark.label),
    [
      "Initialize Z",
      "i = 1",
      "i = 2",
      "i = 3",
      "i = 4",
      "i = 5",
      "i = 6",
      "i = 7",
      "i = 8",
      "i = 9",
      "i = 10",
      "i = 11",
      "Result",
    ],
  )
  assert.equal(
    summaryFor("z-algorithm", "string", frames.at(-1)),
    "Z = [12, 1, 0, 0, 3, 1, 0, 0, 2, 2, 1, 0].",
  )
})

test("Boyer-Moore reuses stable non-scrolling string strips with shell-matched edge radii", () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this.textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = {
        setProperty: (key, value) => this.attributes.set(`style:${key}`, value),
      }
      this.className = ""
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    append(...children) {
      this.children.push(...children)
    }
    getBoundingClientRect() {
      return { left: 0, width: 40 }
    }
  }
  const countNodes = (node) =>
    1 + node.children.reduce((count, child) => count + countNodes(child), 0)
  const previousDocument = globalThis.document
  const previousResizeObserver = globalThis.ResizeObserver
  let observer
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      this.disconnected = false
      observer = this
    }
    observe(node) {
      this.observed.push(node)
    }
    disconnect() {
      this.disconnected = true
    }
    trigger() {
      this.callback()
    }
  }
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    const { ICON, makeMatchView } = loadStepTraceModule("src", "render.ts")
    const styles = readFileSync(join(here, "src", "styles", "string.scss"), "utf8")
    const frames = api.buildFrames({
      algorithm: "boyer-moore",
      text: "ACCCDBACBA",
      pattern: "ACBA",
    }).frames
    const view = makeMatchView(frames)
    const [stage] = view.nodes
    const baseline = countNodes(stage)

    assert.equal(view.stableStage, true)
    assert.equal(stage.dataset.profile, "boyer-moore")
    assert.match(stage.className, /\bsteptrace__match\b/)
    assert.equal(stage.children.length, 1)
    assert.deepEqual(
      view.watch(frames[0]).map((row) => row.k),
      ["align", "j", "suffix", "bad shift", "good shift", "selected shift"],
    )
    const goodWins = frames.find(
      (frame) => frame.type === "decision" && frame.shiftDecision.winner === "good-suffix",
    )
    assert.deepEqual(
      view.watch(goodWins).map((row) => row.v),
      [3, 1, "BA", 2, 3, "3 · good wins"],
    )
    const mismatch = frames.find(
      (frame) => frame.type === "compare" && frame.shift === 3 && frame.j === 1,
    )
    assert.deepEqual(
      view
        .watch(mismatch)
        .slice(3)
        .map((row) => row.v),
      ["—", "—", "—"],
    )
    for (let index = 0; index < frames.length; index++) {
      view.paint(frames[index], index, frames.length)
      assert.equal(countNodes(stage), baseline)
    }
    const viewport = stage.children[0]
    const board = viewport.children[0]
    const patternRow = board.children[0]
    const textRow = board.children[1]
    assert.match(patternRow.className, /\bsteptrace__cells\b/)
    assert.match(patternRow.className, /\bsteptrace__cells--pat\b/)
    assert.match(textRow.className, /\bsteptrace__cells\b/)
    assert.equal(patternRow.children.length, 4)
    assert.equal(textRow.children.length, 10)
    const compareCue = textRow.children[0].children[1]
    assert.equal(compareCue.attributes.get("aria-hidden"), "true")
    assert.equal(
      compareCue.children[0].children[0].attributes.get("class"),
      "steptrace__success-marker",
    )
    assert.match(compareCue.children[0].children[0].innerHTML, /<circle/)
    assert.match(compareCue.children[1].innerHTML, /<svg/)
    assert.doesNotMatch(
      compareCue.children[0].children[0].innerHTML + compareCue.children[1].innerHTML,
      /✓|×/,
    )
    assert.match(ICON.x, /<svg/)
    view.paint(frames.at(-1), frames.length - 1, frames.length)
    assert.equal(patternRow.style.transform, "translateX(240.00px)")
    assert.deepEqual(observer.observed, [textRow])
    observer.trigger()
    assert.equal(patternRow.style.transform, "translateX(240.00px)")
    view.destroy()
    assert.equal(observer.disconnected, true)

    const edgeFrames = api.buildFrames({
      algorithm: "boyer-moore",
      text: "ACBA",
      pattern: "ACBA",
    }).frames
    const edgeView = makeMatchView(edgeFrames)
    const edgeBoard = edgeView.nodes[0].children[0].children[0]
    const edgePattern = edgeBoard.children[0]
    const edgeText = edgeBoard.children[1]
    edgeView.paint(edgeFrames.at(-1), edgeFrames.length - 1, edgeFrames.length)
    for (const row of [edgePattern, edgeText]) {
      assert.equal(row.children[0].dataset.state, "found")
      assert.equal(row.children.at(-1).dataset.state, "found")
    }
    edgeView.destroy()

    const viewportCss = styles.match(/\.steptrace__bm-viewport \{([^}]*)\}/)[1]
    const boardCss = styles.match(/\.steptrace__bm-board \{([^}]*)\}/)[1]
    assert.match(viewportCss, /overflow: hidden;/)
    assert.doesNotMatch(viewportCss, /overflow[^;]*auto|scrollbar-gutter/)
    assert.match(boardCss, /inline-size: 100%;/)
    assert.match(boardCss, /min-inline-size: 0;/)
    assert.match(boardCss, /overflow: hidden;/)
    assert.match(styles, /\.steptrace__cells \{[^}]*--_string-radius: 9px;/)
    assert.match(
      styles,
      /\.steptrace__bm \.steptrace__cell:first-child \{[^}]*calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.match(
      styles,
      /\.steptrace__bm \.steptrace__cell:last-child \{[^}]*calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.doesNotMatch(styles, /steptrace__bm-decision|content:\s*["'][✓×]/)
    assert.match(styles, /\.steptrace__bm-icon svg \{/)
    assert.match(styles, /\.steptrace--reduced[\s\S]*\.steptrace__bm-pattern/)
  } finally {
    globalThis.document = previousDocument
    globalThis.ResizeObserver = previousResizeObserver
  }
})

test("Z active ranges scroll only when they leave the shared viewport", () => {
  const { resolveVisibleScrollLeft } = loadStepTraceModule("src", "render.ts")

  assert.equal(resolveVisibleScrollLeft(0, 343, 538, 245, 285), 0)
  assert.equal(resolveVisibleScrollLeft(0, 343, 538, 405, 485), 150)
  assert.equal(resolveVisibleScrollLeft(150, 343, 538, 405, 485), 150)
  assert.equal(resolveVisibleScrollLeft(150, 300, 538, 405, 485), 193)
  assert.equal(resolveVisibleScrollLeft(195, 343, 538, 0, 40), 0)
})

test("the Z-array profile paints every frame into one stable measured-strip DOM", () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this.textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = {
        setProperty: (key, value) => this.attributes.set(`style:${key}`, value),
      }
      this.className = ""
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    append(...children) {
      this.children.push(...children)
    }
    getBoundingClientRect() {
      return { width: 40, left: 0, top: 0, height: 38 }
    }
  }
  const countNodes = (node) =>
    1 + node.children.reduce((count, child) => count + countNodes(child), 0)
  const previousDocument = globalThis.document
  const previousResizeObserver = globalThis.ResizeObserver
  let observer
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      this.disconnected = false
      observer = this
    }
    observe(node) {
      this.observed.push(node)
    }
    disconnect() {
      this.disconnected = true
    }
    trigger() {
      this.callback()
    }
  }
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    const { makeMatchView } = loadStepTraceModule("src", "render.ts")
    const styles = readFileSync(join(here, "src", "styles", "string.scss"), "utf8")
    const frames = api.buildFrames({
      algorithm: "z-algorithm",
      text: "aabcaabxaaaz",
    }).frames
    const view = makeMatchView(frames)
    const [stage] = view.nodes
    const baseline = countNodes(stage)

    assert.equal(view.stableStage, true)
    assert.equal(stage.dataset.profile, "z-array")
    assert.deepEqual(
      view.watch(frames[0]).map((row) => row.k),
      ["i", "Z-box", "source", "Z[i]"],
    )
    assert.equal(view.watch(frames[0])[2].v, "—")
    const directFrame = frames.find(
      (frame) => frame.sourceCase === "outside" && frame.box[0] > frame.box[1],
    )
    assert.equal(
      view.watch(directFrame)[1].v,
      "—",
      "an empty Z-box must not show an inverted range",
    )
    assert.equal(view.watch(directFrame)[2].v, "direct")
    assert.match(view.watch(frames.find((frame) => frame.type === "copy"))[2].v, /^copy Z\[\d+\]$/)
    assert.equal(
      view.watch(frames.find((frame) => frame.sourceCase === "reuse-extend"))[2].v,
      "extend edge",
    )
    for (let index = 0; index < frames.length; index++) {
      view.paint(frames[index], index, frames.length)
      assert.equal(countNodes(stage), baseline)
    }
    assert.equal(stage.children[0].className, "steptrace__z-viewport")
    assert.equal(stage.children.length, 1, "the Z profile must not render a private legend")
    const viewport = stage.children[0]
    const board = viewport.children[0]
    const prefixClip = board.children[0].children[1]
    const stringRow = viewport.children[0].children[1].children[1]
    const zRow = board.children[2].children[1]
    const bracket = stringRow.children.at(-2)
    const cursor = stringRow.children.at(-1)
    assert.equal(board.children.length, 3)
    for (const rail of board.children) {
      assert.match(rail.children[0].className, /steptrace__rail-label/)
      const cells = rail.children[1].children[0]?.className.includes("steptrace__cells")
        ? rail.children[1].children[0]
        : rail.children[1]
      assert.match(cells.className, /steptrace__cells/)
      assert.ok(
        cells.children.slice(0, 12).every((cell) => cell.className.includes("steptrace__cell")),
      )
    }
    assert.match(stringRow.children[0].children[0].className, /steptrace__z-char/)
    assert.match(stringRow.children[0].children[1].className, /steptrace__z-index/)
    assert.match(stringRow.children[11].className, /steptrace__z-cell--edge-end/)

    view.paint(frames[0], 0, frames.length)
    assert.equal(prefixClip.dataset.clipped, "0")
    assert.equal(bracket.dataset.edgeStart, "1")
    const rightEdgeFrame = { ...frames[0], type: "focus", i: 11, box: [1, 11] }
    view.paint(rightEdgeFrame, 1, frames.length)
    assert.equal(bracket.dataset.edgeEnd, "1")
    assert.equal(bracket.style.transform, "translateX(40.00px)")
    assert.equal(bracket.style.width, "439px")
    const compareFrame = frames.find((frame) => frame.type === "compare")
    view.paint(compareFrame, 1, frames.length)
    assert.equal(prefixClip.dataset.clipped, "1")
    assert.equal(cursor.dataset.visible, "0")
    assert.equal(bracket.dataset.visible, "0")
    assert.notEqual(stringRow.children[compareFrame.i].dataset.state, "probe")
    assert.equal(
      stringRow.children[compareFrame.compare.candidate].dataset.state,
      compareFrame.compare.result,
    )
    const copyFrame = frames.find((frame) => frame.type === "copy")
    view.paint(copyFrame, 1, frames.length)
    assert.equal(cursor.dataset.visible, "0")
    assert.equal(bracket.dataset.visible, "0")
    assert.equal(zRow.children[copyFrame.k].dataset.state, "copy-source")
    assert.equal(zRow.children[copyFrame.i].dataset.state, "copy-target")
    const focusFrame = frames.find((frame) => frame.type === "focus")
    view.paint(focusFrame, 1, frames.length)
    assert.equal(cursor.dataset.visible, "1")
    assert.equal(stringRow.children[focusFrame.i].dataset.state, "probe")

    const scrolls = []
    viewport.scrollLeft = 0
    viewport.clientWidth = 343
    viewport.scrollWidth = 538
    viewport.scrollTo = ({ left, behavior }) => {
      viewport.scrollLeft = left
      scrolls.push({ left, behavior })
    }
    viewport.getBoundingClientRect = () => ({ left: 0, width: viewport.clientWidth })
    stringRow.children.slice(0, 12).forEach((cell, index) => {
      cell.getBoundingClientRect = () => ({
        left: 45 + index * 40 - viewport.scrollLeft,
        width: 40,
      })
    })
    const compareNine = frames.find(
      (frame) => frame.type === "compare" && frame.i === 9 && frame.compare?.result === "match",
    )
    view.paint(compareNine, 33, frames.length)
    assert.deepEqual(scrolls, [{ left: 150, behavior: "smooth" }])
    view.paint(compareNine, 33, frames.length)
    assert.equal(scrolls.length, 1, "visible targets must preserve the user's scroll position")
    viewport.clientWidth = 300
    observer.trigger()
    assert.deepEqual(scrolls.at(-1), { left: 193, behavior: "smooth" })
    assert.deepEqual(observer.observed, [stringRow, viewport])
    view.destroy()
    assert.equal(observer.disconnected, true)
    assert.match(styles, /\.steptrace__z-viewport \{[\s\S]*overflow-x: auto;/)
    assert.match(styles, /min-inline-size: calc\(var\(--_z-length\) \* var\(--_z-min-cell\)\);/)
    assert.match(styles, /--_z-shell-block: calc\(44px \+ 2px\);/)
    assert.match(styles, /--_z-index-tier: 22px;/)
    assert.match(styles, /--_z-fade: 1\.5rem;/)
    assert.match(
      styles,
      /\.steptrace__z-rail:is\(:nth-child\(2\), :nth-child\(3\)\) \{[\s\S]*padding-block-start: 0\.9rem;[\s\S]*border-block-start: 1px solid var\(--_hair\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-label \{[\s\S]*position: sticky;[\s\S]*inset-inline-start: 0;[\s\S]*inline-size: max-content;/,
    )
    const zLabelRule = styles.match(/\.steptrace__z-label \{[^}]*\}/)?.[0] || ""
    assert.doesNotMatch(zLabelRule, /background|padding/)
    assert.match(
      styles,
      /\.steptrace__z-prefix-clip\[data-clipped="1"\] \{[\s\S]*-webkit-mask-image:[\s\S]*mask-image:/,
    )
    assert.match(
      styles,
      /\.steptrace__z-track \.steptrace__cell:first-child \{[\s\S]*calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-cell--string \{[\s\S]*block-size: calc\(44px \+ var\(--_z-index-tier\)\);[\s\S]*grid-template-columns: minmax\(0, 1fr\);[\s\S]*grid-template-rows: 2fr 1fr;[\s\S]*align-items: stretch;[\s\S]*justify-content: stretch;[\s\S]*padding: 0;/,
    )
    assert.match(
      styles,
      /\.steptrace__z-index \{[\s\S]*place-items: center;[\s\S]*border-block-start: 1px solid color-mix\(in srgb, var\(--_text\) 22%, transparent\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-cursor \{[\s\S]*border-block-end: 2px solid var\(--_blue\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-cell\[data-state="copy-source"\] \{[\s\S]*box-shadow: inset 0 0 0 2px var\(--_amber\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-string > \.steptrace__z-cell--edge-end \{[\s\S]*border-inline-end: 0;[\s\S]*calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-string > \.steptrace__z-cell--string:first-child \{[\s\S]*calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-bracket \{[\s\S]*box-sizing: border-box;[\s\S]*block-size: calc\(var\(--_string-radius\) - 1px\);[\s\S]*border-block-start: 2px solid var\(--_violet\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-bracket\[data-edge-start="1"\] \{[\s\S]*border-inline-start: 2px solid var\(--_violet\);[\s\S]*border-start-start-radius: calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-bracket\[data-edge-end="1"\] \{[\s\S]*border-inline-end: 2px solid var\(--_violet\);[\s\S]*border-start-end-radius: calc\(var\(--_string-radius\) - 1px\);/,
    )
    assert.match(
      styles,
      /\.steptrace__z-bracket\[data-edge-start="1"\]::before,[\s\S]*\.steptrace__z-bracket\[data-edge-end="1"\]::after \{[\s\S]*content: none;/,
    )
    assert.match(
      styles,
      /\.steptrace__z \.steptrace__cell\[data-state="match"\],[\s\S]*box-shadow: inset 0 -2px 0 var\(--_green\);/,
    )
    assert.match(styles, /\.steptrace__z-string \{\s*position: relative;\s*\}/)
    assert.doesNotMatch(styles, /steptrace__z-legend|steptrace__z-copy/)
    assert.match(
      styles,
      /\.steptrace--reduced[\s\S]*:is\([\s\S]*transition-property: opacity !important;/,
    )
  } finally {
    globalThis.document = previousDocument
    globalThis.ResizeObserver = previousResizeObserver
  }
})

test("KMP, Rabin-Karp, and Z stay isolated from the Boyer-Moore profile", () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this.textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = {
        setProperty: (key, value) => this.attributes.set(`style:${key}`, value),
      }
      this.className = ""
    }
    append(...children) {
      this.children.push(...children)
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    getBoundingClientRect() {
      return { width: 40 }
    }
  }
  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    const { makeMatchView } = loadStepTraceModule("src", "render.ts")
    const kmp = api.buildFrames({
      algorithm: "kmp",
      text: "ABABACABA",
      pattern: "ABAC",
    }).frames
    const rabin = api.buildFrames({
      algorithm: "rabin-karp",
      text: "ABABACABA",
      pattern: "ABAC",
    }).frames
    const z = api.buildFrames({
      algorithm: "z-algorithm",
      text: "aabcaabxaaaz",
    }).frames

    assert.ok(kmp.every((frame) => frame.profile == null && !("z" in frame)))
    assert.ok(rabin.every((frame) => frame.profile == null && !("z" in frame)))
    assert.ok(z.every((frame) => frame.profile === "z-array" && !("goodSuffix" in frame)))
    assert.deepEqual(z.at(-1).z, [12, 1, 0, 0, 3, 1, 0, 0, 2, 2, 1, 0])
    assert.equal(makeMatchView(kmp).nodes[0].className, "steptrace__match")
    assert.equal(makeMatchView(rabin).nodes[0].className, "steptrace__match")
    assert.equal(makeMatchView(z).nodes[0].className, "steptrace__z")
    assert.equal(makeMatchView(kmp).nodes.length, 2)
    assert.equal(makeMatchView(rabin).nodes.length, 2)
    const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
    const profileDispatch = renderSource.slice(
      renderSource.indexOf("export function makeMatchView"),
      renderSource.indexOf("function makeZArrayView"),
    )
    assert.match(profileDispatch, /frames\[0\]\.profile === "z-array"/)
    assert.doesNotMatch(profileDispatch, /z-algorithm/)
  } finally {
    globalThis.document = previousDocument
  }
})

test("tabbed blocks validate metadata and keep algorithm configs clean", () => {
  const { isTabsConfig, normalizeTabsConfig } = loadStepTraceModule("src", "tabs.ts")
  const legacy = { algorithm: "bubble-sort", array: [3, 1, 2] }
  const tabbed = {
    selected: 1,
    tabs: [
      {
        name: "Example 1",
        description: " First input. ",
        algorithm: "bubble-sort",
        array: [3, 1, 2],
      },
      {
        name: "Example 2",
        description: "Second input.",
        algorithm: "bubble-sort",
        array: [4, 2, 1],
      },
    ],
  }

  assert.equal(isTabsConfig(legacy), false)
  assert.equal(isTabsConfig(tabbed), true)
  assert.deepEqual(normalizeTabsConfig(tabbed), {
    selected: 1,
    tabs: [
      {
        name: "Example 1",
        description: "First input.",
        config: { algorithm: "bubble-sort", array: [3, 1, 2] },
      },
      {
        name: "Example 2",
        description: "Second input.",
        config: { algorithm: "bubble-sort", array: [4, 2, 1] },
      },
    ],
  })
  assert.throws(() => normalizeTabsConfig({ tabs: [] }), /at least one tab/)
  assert.throws(
    () => normalizeTabsConfig({ tabs: [{ name: " ", algorithm: "bubble-sort" }] }),
    /non-empty "name"/,
  )
  assert.throws(
    () =>
      normalizeTabsConfig({
        tabs: [
          { name: "Same", algorithm: "bubble-sort" },
          { name: "same", algorithm: "insertion-sort" },
        ],
      }),
    /duplicate tab name/,
  )
  assert.throws(
    () => normalizeTabsConfig({ selected: 2, tabs: [{ name: "One", algorithm: "bubble-sort" }] }),
    /"selected" must be an index/,
  )
})

test("A* graph-state profiles stay typed, deterministic, optimal, and reachable", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const family = loadStepTraceModule("src", "families", "graph-state.ts")
  const directedDistances = family.graphStateShortestDistances(
    [{ id: "A" }, { id: "B" }, { id: "T" }, { id: "X" }],
    [
      { from: "A", to: "B", weight: 2, directed: true },
      { from: "B", to: "T", weight: 3, directed: true },
      { from: "T", to: "X", weight: 1, directed: true },
    ],
    "T",
  )
  assert.equal(directedDistances.get("A"), 5)
  assert.equal(directedDistances.get("B"), 3)
  assert.equal(directedDistances.get("T"), 0)
  assert.equal(directedDistances.get("X"), Number.POSITIVE_INFINITY)

  const variants = ["coordinate-grid", "ukraine-cities", "building-floor", "midtown-map"]
  const shortestCost = (frame) => {
    const distances = new Map(frame.nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
    distances.set(frame.start, 0)
    const pending = new Set(frame.nodes.map((node) => node.id))
    while (pending.size) {
      let current = null
      for (const id of pending) {
        if (current == null || distances.get(id) < distances.get(current)) current = id
      }
      if (current == null || !Number.isFinite(distances.get(current))) break
      pending.delete(current)
      for (const edge of frame.edges) {
        const candidates = [[edge.from, edge.to]]
        if (!edge.directed) candidates.push([edge.to, edge.from])
        for (const [from, to] of candidates) {
          if (from !== current || !pending.has(to)) continue
          distances.set(to, Math.min(distances.get(to), distances.get(from) + edge.weight))
        }
      }
    }
    return distances.get(frame.target)
  }

  for (const variant of variants) {
    const result = api.buildFrames({ algorithm: "a-star", variant })
    assert.equal(result.kind, "graph")
    assert.equal(result.family.id, "graph-state")
    assert.equal(result.frames[0].profile, variant)
    assert.equal(result.frames.at(-1).type, "done")
    assert.ok(result.frames.some((frame) => frame.type === "expand"))
    assert.ok(result.frames.some((frame) => frame.type === "relax"))
    assert.ok(result.frames.at(-1).selectedEdges.length > 0)
    assert.equal(
      result.frames.at(-1).detail.costs[result.frames.at(-1).target],
      shortestCost(result.frames[0]),
    )
    const comparison = result.frames.at(-1).detail.comparison
    assert.equal(comparison.primaryLabel, "A*")
    assert.equal(comparison.baselineLabel, "Dijkstra")
    assert.equal(comparison.metric, "expansions")
    assert.ok(comparison.primaryValue <= comparison.baselineValue)
  }

  const parsed = family.parseGraphStateConfig({
    algorithm: "a-star",
    variant: "ukraine-cities",
    start: "Lviv",
    target: "Lviv",
  })
  assert.equal(parsed.nodes.length, 25)
  assert.equal(parsed.endpointSettings.options.length, 25)
  assert.equal(parsed.start, "Lviv")
  assert.notEqual(parsed.target, parsed.start)
  assert.deepEqual(
    ["Chernihiv", "Simferopol", "Ivano-Frankivsk", "Uzhhorod", "Luhansk", "Kherson"].every((id) =>
      parsed.nodes.some((node) => node.id === id),
    ),
    true,
  )
  assert.throws(
    () => family.parseGraphStateConfig({ algorithm: "a-star", variant: "unknown" }),
    /"variant" must be/,
  )
})

test("Greedy Best-First reuses the A* grid but exposes its longer h-only route", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { graphStateSummary } = loadStepTraceModule("src", "families", "graph-state.ts")
  const greedy = api.buildFrames({ algorithm: "greedy-best-first-search" })
  const astar = api.buildFrames({ algorithm: "a-star", variant: "coordinate-grid" })
  const first = greedy.frames[0]
  const last = greedy.frames.at(-1)

  assert.equal(greedy.kind, "graph")
  assert.equal(greedy.family.id, "graph-state")
  assert.equal(first.profile, "coordinate-grid")
  assert.equal(first.detail.policy, "greedy")
  assert.deepEqual(first.nodes, astar.frames[0].nodes)
  assert.deepEqual(first.edges, astar.frames[0].edges)
  assert.ok(greedy.frames.some((frame) => frame.message.includes("ignored")))
  assert.equal(last.detail.costs[last.target], 12)
  assert.equal(astar.frames.at(-1).detail.costs[astar.frames.at(-1).target], 8)
  assert.deepEqual(last.detail.comparison, {
    primaryLabel: "Greedy",
    primaryValue: 12,
    baselineLabel: "A*",
    baselineValue: 8,
    metric: "cost",
  })
  assert.match(graphStateSummary(last), /Greedy cost 12 vs A\* cost 8/)
})

test("graph-state keeps topology roles separate from discriminated algorithm detail", () => {
  const { aStar } = loadStepTraceModule("src", "algorithms", "a-star.ts")
  const config = aStar.parse({ algorithm: "a-star", variant: "coordinate-grid" })
  const recorder = aStar.family.createRecorder(config)
  aStar.run(config, recorder)

  const first = recorder.frames[0]
  const last = recorder.frames.at(-1)
  assert.equal(first.detail.kind, "heuristic-search")
  assert.equal(last.detail.kind, "heuristic-search")
  assert.equal(last.detail.costs[last.target], 8)
  assert.ok(Object.values(first.nodeState).every((role) => ["neutral", "frontier"].includes(role)))
  assert.ok(Object.values(last.nodeState).includes("accepted"))
  assert.ok(Object.values(last.edgeState).includes("accepted"))
  assert.equal("open" in last, false)
  assert.equal("closed" in last, false)
  assert.equal("g" in last, false)

  const familySource = readFileSync(join(here, "src", "families", "graph-state.ts"), "utf8")
  assert.match(familySource, /switch \(frame\.detail\.kind\)/)
  assert.doesNotMatch(familySource, /frame\.algorithm|algorithmId/)
  assert.doesNotMatch(familySource, /graphStateRacks|steptrace__gs-racks|function rack\(/)
  assert.match(familySource, /k: "open"/)
  assert.match(familySource, /k: "closed"/)
})

test("shared legends and success badges use the canonical render helpers", () => {
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const families = [
    "graph-state",
    "prefix-character",
    "linked-topology",
    "interval-track",
    "heap-selection",
    "prefix-sum",
    "stack-sequence",
  ]

  assert.match(renderSource, /export function makeLegend\(items, ariaLabel, extraClass = ""\)/)
  assert.match(renderSource, /export function successMarker\(extraClass = ""\)/)
  assert.match(renderSource, /legend\.setAttribute\("role", "list"\)/)
  assert.match(renderSource, /row\.setAttribute\("role", "listitem"\)/)
  assert.match(
    renderSource,
    /document\.createElementNS\("http:\/\/www\.w3\.org\/2000\/svg", "svg"\)/,
  )
  assert.doesNotMatch(renderSource, /document\.createElement\("svg"\)/)
  assert.match(renderSource, /check\.append\(successMarker\(\)\)/)
  assert.match(renderSource, /matchIcon\.append\(successMarker\(\)\)/)
  assert.match(renderSource, /descriptor\.badge === "success"/)
  assert.doesNotMatch(renderSource, /ICON\.check|✓|✔/)
  assert.doesNotMatch(renderSource, /function makeStoryLegend|function makeMatrixRoleLegend/)
  assert.match(sharedStyles, /\.steptrace__legend-swatch \{[^}]*inline-size: 0\.75rem;/s)
  assert.match(sharedStyles, /\.steptrace__legend \{[^}]*justify-content: center;/s)
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__success-marker circle \{[^}]*fill: var\(--_green\);/s,
  )

  for (const family of families) {
    const source = readFileSync(join(here, "src", "families", `${family}.ts`), "utf8")
    assert.match(source, /makeLegend\(/, `${family} should use the shared legend renderer`)
    assert.doesNotMatch(source, /const legend = el\(/, `${family} should not rebuild legend DOM`)
  }

  const rabinKarp = readFileSync(join(here, "src", "algorithms", "rabin-karp.ts"), "utf8")
  assert.match(rabinKarp, /window hash .* pattern hash/)
  assert.doesNotMatch(renderSource, /steptrace__hash|hashBadge/)
})

test("graph-state rollout records every canonical decisive operation", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { graphStateSummary } = loadStepTraceModule("src", "families", "graph-state.ts")
  const expectations = [
    ["articulation-points-and-bridges", "low-link-cuts", 10],
    ["bellman-ford", "edge-relaxation", 18],
    ["boruvka", "mst-round", 10],
    ["connected-components", "component-flood", 10],
    ["hamiltonian-cycle", "path-backtrack", 14],
    ["kruskal", "mst-scan", 9],
    ["maximum-flow", "residual-flow", 10],
    ["strongly-connected-components", "low-link-components", 12],
  ]

  for (const [algorithm, detailKind, frameCount] of expectations) {
    const result = api.buildFrames({ algorithm })
    assert.equal(result.kind, "graph")
    assert.equal(result.family.id, "graph-state")
    assert.equal(result.frames.length, frameCount)
    assert.ok(result.frames.every((frame) => frame.detail.kind === detailKind))
    assert.ok(result.frames.every((frame) => frame.nodes === result.frames[0].nodes))
    assert.ok(result.frames.every((frame) => frame.edges === result.frames[0].edges))
  }

  const cuts = api
    .buildFrames({ algorithm: "articulation-points-and-bridges" })
    .frames.at(-1).detail
  assert.deepEqual(cuts.articulationPoints, ["3", "2"])
  assert.deepEqual(cuts.bridges, [
    ["3", "4"],
    ["2", "3"],
  ])

  const distances = api.buildFrames({ algorithm: "bellman-ford" }).frames.at(-1).detail
  assert.deepEqual(distances.distances, { 0: 0, 1: 4, 2: 2, 3: 5 })
  assert.equal(distances.pass, 4)
  assert.equal(distances.changed, false)

  const bidirectional = buildBidirectionalSearch()
  const meeting = bidirectional.frames.find((frame) => frame.type === "meet")
  const completed = bidirectional.frames.at(-1)
  assert.equal(bidirectional.family.id, "graph-state")
  assert.equal(bidirectional.frames.length, 14)
  assert.ok(bidirectional.frames.every((frame) => frame.detail.kind === "dual-search"))
  assert.equal(meeting.detail.meeting, "m")
  assert.equal(bidirectional.frames[0].nodes.length, 12)
  assert.equal(bidirectional.frames[0].edges.length, 11)
  assert.ok(
    bidirectional.frames[0].nodes.every(({ x, y }) => x >= 24 && x <= 596 && y >= 24 && y <= 296),
    "bidirectional nodes must stay inside the shared 620×320 graph canvas",
  )
  assert.ok(meeting.detail.forward.includes("x"))
  assert.ok(meeting.detail.forward.includes("v"))
  assert.ok(meeting.detail.backward.includes("r"))
  assert.equal(Object.values(completed.edgeState).filter((role) => role === "accepted").length, 6)
  assert.deepEqual(
    completed.nodes
      .filter((node) => completed.nodeState[node.id] === "accepted")
      .map((node) => node.id),
    ["s", "a", "b", "m", "c", "d", "t"],
  )

  const hamiltonian = api.buildFrames({ algorithm: "hamiltonian-cycle" }).frames.at(-1)
  assert.equal(graphStateSummary(hamiltonian), "Cycle A → B → C → D → A.")

  const boruvkaResult = api.buildFrames({ algorithm: "boruvka" }).frames.at(-1).detail
  assert.equal(boruvkaResult.totalWeight, 6)
  assert.equal(boruvkaResult.components.length, 1)

  const componentResult = api
    .buildFrames({ algorithm: "connected-components" })
    .frames.at(-1).detail
  assert.equal(componentResult.groups.length, 3)
  assert.deepEqual(componentResult.groups, [["A", "B", "C"], ["D", "E"], ["F"]])

  const cycle = api.buildFrames({ algorithm: "hamiltonian-cycle" }).frames
  assert.ok(cycle.some((frame) => frame.detail.rejected.includes("D")))
  assert.equal(cycle.at(-1).selectedEdges.length, 4)

  const kruskalResult = api.buildFrames({ algorithm: "kruskal" }).frames
  assert.ok(kruskalResult.some((frame) => Object.values(frame.edgeState).includes("rejected")))
  assert.equal(kruskalResult.at(-1).detail.totalWeight, 7)
  assert.equal(kruskalResult.at(-1).detail.components.length, 1)

  const flow = api.buildFrames({ algorithm: "maximum-flow" }).frames
  assert.ok(flow.some((frame) => Object.values(frame.edgeState).includes("residual")))
  assert.equal(flow.at(-1).detail.totalFlow, 2)
  assert.equal(flow.at(-1).detail.flow["a|b"], 0)

  const scc = api.buildFrames({ algorithm: "strongly-connected-components" }).frames.at(-1).detail
  assert.deepEqual(scc.components, [
    ["E", "D"],
    ["C", "B", "A"],
  ])
})

test("all 600 ordered Ukraine-city A* routes are reachable, admissible, and optimal", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const seed = api.buildFrames({
    algorithm: "a-star",
    variant: "ukraine-cities",
    start: "Lviv",
    target: "Kharkiv",
  })
  const cities = seed.endpointSettings.options.map((option) => option.value)
  let checked = 0
  for (const start of cities) {
    for (const target of cities) {
      if (start === target) continue
      const result = api.buildFrames({
        algorithm: "a-star",
        variant: "ukraine-cities",
        start,
        target,
      })
      const first = result.frames[0]
      const last = result.frames.at(-1)
      const trueDistance = new Map(first.nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
      trueDistance.set(target, 0)
      const pending = new Set(first.nodes.map((node) => node.id))
      while (pending.size) {
        let current = null
        for (const id of pending) {
          if (current == null || trueDistance.get(id) < trueDistance.get(current)) current = id
        }
        if (current == null || !Number.isFinite(trueDistance.get(current))) break
        pending.delete(current)
        for (const edge of first.edges) {
          for (const [from, to] of [
            [edge.from, edge.to],
            [edge.to, edge.from],
          ]) {
            if (from !== current || !pending.has(to)) continue
            trueDistance.set(
              to,
              Math.min(trueDistance.get(to), trueDistance.get(from) + edge.weight),
            )
          }
        }
      }
      assert.ok(first.nodes.every((node) => node.h <= trueDistance.get(node.id)))
      assert.equal(last.detail.costs[target], trueDistance.get(start))
      assert.ok(last.selectedEdges.length > 0)
      checked++
    }
  }
  assert.equal(checked, 600)
})

test("A* uses profile-owned controls and visual-only graph state without racks", () => {
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const familySource = readFileSync(join(here, "src", "families", "graph-state.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "graph-state.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Graph Algorithms",
      "A-Star Search.md",
    ),
    "utf8",
  )

  assert.match(mountSource, /syncEndpointOptions\(built\.endpointSettings, built\.graph\)/)
  assert.match(mountSource, /settings\?\.startLabel \|\| "Start node"/)
  assert.match(mountSource, /targetHead\.textContent = settings\.targetLabel/)
  assert.match(mountSource, /state\.target === state\.start/)
  assert.doesNotMatch(familySource, /tabIndex|tabindex|addEventListener\("click"/)
  assert.match(familySource, /if \(edge\.showDirection\)/)
  assert.match(familySource, /steptrace__gs-road-direction/)
  assert.doesNotMatch(familySource, /dataset\.racks|graphStateRacks|steptrace__gs-racks/)
  assert.match(familySource, /const CITY_NODE_OFFSETS:/)
  assert.match(familySource, /const mapMarkers = first\.profile === "ukraine-cities"/)
  assert.match(familySource, /GRAPH_NODE_RADIUS_PX/)
  assert.match(familySource, /observeFixedSvgNodes\(/)
  assert.match(familySource, /applyEdgeGeometry\(GRAPH_NODE_RADIUS_PX \* unitsPerCssPixel, true\)/)
  assert.match(styleEntry, /@use "graph-state";/)
  assert.match(styles, /grid-template-rows: minmax\(0, 1fr\)/)
  assert.match(styles, /\.steptrace \.steptrace__gs-city-label \{[^}]*font-size: 0\.54rem;/s)
  assert.doesNotMatch(styles, /steptrace__gs-rack/)
  assert.match(
    note,
    /```steptrace\n\{"tabs":\[\{"name":"Coordinate grid"[\s\S]*"name":"Cities"[\s\S]*"name":"Building floor"[\s\S]*"name":"Midtown map"/,
  )
  assert.doesNotMatch(note, /The same `f = g \+ h` rule works across grids/)
  assert.doesNotMatch(note, /Visualization pending/)
})

test("tabbed blocks use accessible shared chrome and preserve mounted tab state", () => {
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "tabs.scss"), "utf8")

  assert.match(styleEntry, /@use "tabs";/)
  assert.match(mountSource, /tablist\.setAttribute\("role", "tablist"\)/)
  assert.match(mountSource, /button\.setAttribute\("role", "tab"\)/)
  assert.match(mountSource, /panelShell\.setAttribute\("role", "tabpanel"\)/)
  assert.match(mountSource, /handles\[activeIndex\]\?\.pause\?\.\(\)/)
  assert.match(mountSource, /if \(!handles\[next\]\) handles\[next\] = mount/)
  assert.match(mountSource, /for \(const handle of handles\) handle\?\.destroy\(\)/)
  assert.match(mountSource, /event\.key === "ArrowLeft"/)
  assert.match(mountSource, /event\.key === "ArrowRight"/)
  assert.match(mountSource, /event\.key === "Home"/)
  assert.match(mountSource, /event\.key === "End"/)
  assert.match(styles, /min-height: 2rem/)
  assert.match(styles, /border-radius: 0\.35rem/)
  assert.match(styles, /\.steptrace__tabs-desc/)
  assert.match(styles, /\.steptrace__tabpanel/)
  assert.match(mountSource, /steptrace--compact-stage/)
  assert.match(
    readFileSync(join(here, "src", "styles", "shared.scss"), "utf8"),
    /\.steptrace__body\s*\{[^}]*block-size: clamp\(14rem, calc\(100dvh - 12rem\), 28rem\);/,
  )
  assert.match(
    readFileSync(join(here, "src", "styles", "shared.scss"), "utf8"),
    /\.steptrace--compact-stage \.steptrace__body\s*\{[^}]*block-size: clamp\(14rem, calc\(100dvh - 16rem\), 24rem\);/,
  )
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
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const obsidianHostStyles = readFileSync(
    join(here, "src", "styles", "hosts", "obsidian.scss"),
    "utf8",
  )
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
  assert.match(
    obsidianHostStyles,
    /\.theme-dark \.steptrace \{[^}]*--st-panel-shadow: rgb\(0 0 0 \/ 0\.32\);/s,
  )
  assert.match(
    obsidianHostStyles,
    /\.steptrace button\.steptrace__btn \{[^}]*appearance: none;[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s,
  )
  assert.match(quartzHostStyles, /--st-held-bg: #92400e/)
  assert.match(quartzHostStyles, /--st-held-fg: #ffffff/)
  assert.match(quartzHostStyles, /--st-table-cell: var\(--light\)/)
  assert.match(quartzHostStyles, /--st-table-header: var\(--lightgray\)/)
  assert.match(quartzHostStyles, /--st-table-border: var\(--gray\)/)
  assert.match(quartzHostStyles, /--st-table-text: var\(--darkgray\)/)
  assert.match(quartzHostStyles, /--st-held-bg: #fbbf24/)
  assert.match(quartzHostStyles, /--st-held-fg: #1f2937/)
  assert.match(
    quartzHostStyles,
    /:root\[saved-theme="dark"\] \.steptrace \{[^}]*--st-panel-shadow: rgb\(0 0 0 \/ 0\.32\);/s,
  )
  assert.match(
    sharedStyles,
    /\.steptrace__foot \{[^}]*padding: 0\.65rem;[^}]*border-radius: 0\.85rem;[^}]*box-shadow: 0 8px 24px var\(--_panel-shadow\);/s,
  )
  assert.match(
    sharedStyles,
    /\.steptrace__btn \{[^}]*width: 2\.5rem;[^}]*height: 2\.5rem;[^}]*flex: 0 0 2\.5rem;/s,
  )
  assert.match(
    sharedStyles,
    /@media \(hover: none\), \(pointer: coarse\) \{[^}]*\.steptrace__btn,[\s\S]*width: 2\.75rem;[\s\S]*height: 2\.75rem;/s,
  )
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
  // hero-swap moved from the CSS fly keyframe to the JS spring integrator
  assert.doesNotMatch(barsStyles, /steptrace__bar--fly/)
  assert.doesNotMatch(barsStyles, /@keyframes steptrace-fly/)
  assert.doesNotMatch(barsStyles, /--_fly-dx|--_fly-lift|data-fly/)
  assert.doesNotMatch(renderSource, /liveOffsetX|carried|steptrace__bar--fly|stepMarkerSpring/)
  assert.doesNotMatch(barsStyles, /transition: transform 0\.32s/)
  assert.match(
    readFileSync(join(here, "src", "mount.ts"), "utf8"),
    /setProperty\("--_tween", `\$\{Math\.round\(107 \/ v\)\}ms`\)/,
  )
  // the swap fly is driven through the shared spring integrator (motion.ts)
  assert.match(
    renderSource,
    /import \{ springStep, springOmega, SPRINGS, sequence \} from "\.\/motion"/,
  )
  assert.match(renderSource, /tracker\.fly\(flights\)/)
  assert.match(renderSource, /springStep\(fox\[b\], fvx\[b\], 0, elapsed/)
  // Phase-2 choreography: swaps stage through the beat scheduler, and a pending
  // beat keeps the loop awake independent of the marker idle test.
  assert.match(renderSource, /sequences\[s\]\.tick\(now\)/)
  assert.match(renderSource, /sequences\.push\(\s*sequence\(/)
  assert.match(renderSource, /foHold\[idx\] = false/)
  // motion-token scale + back-compat aliases
  assert.match(sharedStyles, /--_dur-instant: 0ms;/)
  assert.match(sharedStyles, /--_dur-quick: calc\(var\(--_tween\) \* 0\.65\)/)
  assert.match(sharedStyles, /--_dur-move: calc\(var\(--_tween\) \* 1\.68\)/)
  assert.match(sharedStyles, /--_dur-settle: calc\(var\(--_tween\) \* 3\)/)
  assert.match(sharedStyles, /--_spring-snappy: linear\(\s*0,/s)
  assert.match(sharedStyles, /--_spring-soft: linear\(\s*0,/s)
  assert.match(sharedStyles, /--_tween: var\(--_dur-base\)/)
  assert.match(sharedStyles, /--_spring: var\(--_spring-snappy\)/)
  // pilot role bindings: swap = move, compare = quick
  assert.match(barsStyles, /\[data-state="swap"\]\s*{[^}]*--_role-dur: var\(--_dur-move\)/s)
  assert.match(barsStyles, /\[data-state="compare"\]\s*{[^}]*--_role-dur: var\(--_dur-quick\)/s)
  assert.match(sharedStyles, /--_stagger: calc\(var\(--_tween\) \/ 9\)/)
  assert.match(barsStyles, /@keyframes steptrace-enter/)
  assert.match(barsStyles, /animation-delay: calc\(var\(--_i, 0\) \* var\(--_stagger\)\)/)
  assert.match(sharedStyles, /\.steptrace--reduced \*\s*{[^}]*animation: none !important;/s)
  assert.match(sharedStyles, /transition-property:[^;]*opacity[^;]*!important/s)
  assert.doesNotMatch(sharedStyles, /\.steptrace--reduced \*\s*{[^}]*transition: none !important;/s)
  assert.ok(contrastRatio("#ffffff", "#92400e") >= 4.5)
  assert.ok(contrastRatio("#1f2937", "#fbbf24") >= 4.5)
})

test("family SCSS leaves bar-number typography to canonical bars", () => {
  const familyStyles = readdirSync(join(here, "src", "styles"))
    .filter((file) => file.endsWith(".scss") && file !== "bars.scss")
    .map((file) => readFileSync(join(here, "src", "styles", file), "utf8"))
    .join("\n")

  assert.doesNotMatch(familyStyles, /\.steptrace__num/)
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
      algorithm === "aho-corasick"
        ? { patterns: ["he", "she", "his", "hers"], text: "ushers" }
        : algorithm === "ternary-search-tree"
          ? {
              operations: [
                ["insert", "cat"],
                ["insert", "car"],
                ["insert", "cup"],
                ["insert", "bat"],
                ["search", "car"],
              ],
            }
          : algorithm === "ternary-search"
            ? { array: [1, 4, 9, 12, 11, 7, 2], goal: "maximum" }
            : algorithm === "binary-search-on-answer"
              ? { weights: [3, 2, 2, 4, 1, 4], days: 3 }
              : algorithm === "shell-sort"
                ? { gaps: [4, 2, 1] }
                : algorithm === "counting-sort"
                  ? { array: [2, 5, 3, 0, 2, 3, 0, 3] }
                  : algorithm === "radix-sort"
                    ? { array: [170, 45, 75, 90, 802, 24, 2, 66], radix: 10, mode: "LSD" }
                    : algorithm === "bucket-sort"
                      ? { array: [0.78, 0.17, 0.39, 0.26, 0.72, 0.94], bucketCount: 5 }
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
                          : ["exponential-search", "interpolation-search", "jump-search"].includes(
                                algorithm,
                              )
                            ? { array: commonConfig.array.slice().sort((a, b) => a - b) }
                            : {}
    const input =
      algorithm === "memoization" ||
      algorithm === "branch-and-bound" ||
      algorithm.startsWith("coin-change-") ||
      algorithm.startsWith("grid-path-")
        ? {}
        : commonConfig
    const result = api.buildFrames({
      ...input,
      algorithm,
      ...familyConfig,
    })
    assert.ok(result.frames.length > 0, `${algorithm} must produce frames`)
    return result
  })
  const digest = createHash("sha256").update(JSON.stringify(output)).digest("hex")

  assert.equal(
    digest,
    "ebc60a0c4b72eb50e52f143ca031260d95fb0f331f52e2f33e54634fada1ac2e",
    "the headless StepTrace behavior changed",
  )
})

test("merge intervals sorts once, preserves contained ends, and emits only at gaps", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const result = api.buildFrames({ algorithm: "merge-intervals" })
  const frames = result.frames

  assert.equal(result.kind, "pointers")
  assert.equal(result.family.id, "interval-track")
  assert.deepEqual(frames[0].order, [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(frames.find((frame) => frame.type === "sort").order, [1, 3, 6, 2, 5, 0, 4])

  const contained = frames.find((frame) => frame.relation === "contained")
  assert.deepEqual(contained.current, [1, 6])
  assert.deepEqual(contained.intervals[contained.active], { id: 6, start: 3, end: 5 })
  assert.notEqual(frames[frames.indexOf(contained) + 1].type, "extend")
  assert.deepEqual(frames.at(-1).output, [
    [1, 6],
    [8, 12],
    [13, 20],
  ])
  assert.deepEqual(
    frames.filter((frame) => frame.type === "emit").map((frame) => frame.output.at(-1)),
    [
      [1, 6],
      [8, 12],
    ],
  )
  assert.deepEqual(
    buildMilestones("merge-intervals", "pointers", frames).map((mark) => mark.label),
    [
      "Input order",
      "Sort by start",
      "Seed 1–4",
      "Extend 1–6",
      "Emit 1–6",
      "Start 8–10",
      "Extend 8–12",
      "Emit 8–12",
      "Start 13–16",
      "Extend 13–20",
      "Merged output",
    ],
  )

  assert.throws(
    () => api.buildFrames({ algorithm: "merge-intervals", intervals: [] }),
    /non-empty "intervals"/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "merge-intervals", intervals: [[4, 2]] }),
    /start <= end/,
  )
})

test("activity selection reuses interval-track and commits the earliest compatible finishes", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const result = api.buildFrames({ algorithm: "activity-selection" })
  const frames = result.frames

  assert.equal(result.kind, "pointers")
  assert.equal(result.family.id, "interval-track")
  assert.deepEqual(frames[0].order, [0, 1, 2, 3, 4])
  assert.deepEqual(frames.find((frame) => frame.type === "sort").order, [3, 2, 0, 4, 1])
  assert.deepEqual(frames.at(-1).selected, [3, 4, 1])
  assert.deepEqual(frames.at(-1).rejected, [2, 0])
  assert.deepEqual(frames.at(-1).output, [
    [1, 4],
    [5, 7],
    [8, 9],
  ])
  assert.equal(frames.filter((frame) => frame.type === "inspect").length, 4)
  assert.deepEqual(
    buildMilestones("activity-selection", "pointers", frames).map((mark) => mark.label),
    [
      "Input order",
      "Sort by finish",
      "Accept 1–4",
      "Reject 3–5",
      "Reject 0–6",
      "Accept 5–7",
      "Accept 8–9",
      "Accepted schedule",
    ],
  )
})

test("interval-track reuses shared rails and keeps its stage stable and responsive", () => {
  const familySource = readFileSync(join(here, "src", "families", "interval-track.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "interval-track.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")

  assert.match(familySource, /steptrace__rail-label steptrace__interval-label/)
  assert.match(familySource, /stableStage: true/)
  assert.match(familySource, /steptrace__interval-legend/)
  assert.match(familySource, /profile: "merge-intervals" \| "activity-selection"/)
  assert.match(familySource, /parseIntervalTokens/)
  assert.match(familySource, /--_interval-start/)
  assert.match(familySource, /--_interval-span/)
  assert.match(familySource, /band\.dataset\.joinStart =/)
  assert.match(familySource, /previous\[1\] \+ 1 === interval\[0\]/)
  assert.match(familySource, /band\.dataset\.joinEnd =/)
  assert.match(familySource, /interval\[1\] \+ 1 === next\[0\]/)
  assert.match(styles, /\.steptrace__interval-section \+ \.steptrace__interval-section/)
  assert.match(styles, /inset-inline-start var\(--_dur-move\)/)
  assert.match(styles, /inline-size var\(--_dur-move\)/)
  assert.match(styles, /data-state="accepted"/)
  assert.match(styles, /data-state="rejected"/)
  assert.match(
    styles,
    /\.steptrace__interval-band--output\[data-join-start="1"\]\s*\{[^}]*border-start-start-radius: 0;[^}]*border-end-start-radius: 0;/s,
  )
  assert.match(
    styles,
    /\.steptrace__interval-band--output\[data-join-end="1"\]\s*\{[^}]*border-start-end-radius: 0;[^}]*border-end-end-radius: 0;/s,
  )
  assert.match(
    styles,
    /\.steptrace\[data-visual-family="interval-track"\] \.steptrace__stage-col\s*\{[^}]*justify-content: stretch;/s,
  )
  assert.match(styles, /@media \(max-width: 560px\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /overflow-x:\s*auto/)
  assert.match(styleEntry, /@use "interval-track";/)
})

test("bit tally and two pointers reuse the centered canonical strip geometry", () => {
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const bitStyles = readFileSync(join(here, "src", "styles", "bits.scss"), "utf8")
  const pointerStyles = readFileSync(join(here, "src", "styles", "pointers.scss"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")

  assert.match(
    bitStyles,
    /\.steptrace__btally\s*\{[^}]*display: flex;[^}]*align-items: center;[^}]*justify-content: center;/s,
  )
  assert.match(
    renderSource,
    /export function makePointerView[\s\S]*?makeArrayStrip\(frames\[0\]\.array\)/,
  )
  assert.match(
    renderSource,
    /export function makeArrayStrip[\s\S]*?steptrace__pwrap[\s\S]*?steptrace__pcells[\s\S]*?steptrace__pcell/,
  )
  assert.match(pointerStyles, /\.steptrace__pwrap\s*\{[^}]*height: 46px;/s)
  assert.match(pointerStyles, /\.steptrace__pcells\s*\{[^}]*height: 100%;[^}]*border: 1px solid/s)
  assert.match(
    pointerStyles,
    /\.steptrace__pcell\s*\{[^}]*font: 500 0\.98rem var\(--_font-mono\);[^}]*border-right: 1px solid/s,
  )
  assert.match(pointerStyles, /\.steptrace__pcell:last-child\s*\{[^}]*border-right: 0;/s)
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__pcells,[\s\S]*?--steptrace-array-radius: 9px;[^}]*overflow: hidden;/s,
  )
  assert.doesNotMatch(renderSource, /makePointerView[\s\S]*?steptrace__pointer-array/)
})

test("n-queens keeps a bounded persistent decision tree through branch, prune, return, and solution", () => {
  const { nQueens } = loadStepTraceModule("src", "algorithms", "n-queens.ts")
  const { BacktrackRecorder } = loadStepTraceModule("src", "recorders.ts")
  const { ICON, makeBacktrackView } = loadStepTraceModule("src", "render.ts")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "backtrack.scss"), "utf8")
  const recorder = new BacktrackRecorder()
  nQueens.run({ n: 4 }, recorder)

  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this.textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.className = ""
      this.hidden = false
      this.scrollHeight = 0
      this.style = { setProperty() {} }
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
    createElementNS: (_, tagName) => new FakeNode(tagName),
    createTextNode: (text) => {
      const node = new FakeNode("#text")
      node.textContent = text
      return node
    },
  }
  try {
    const view = makeBacktrackView(recorder.frames)
    const [region] = view.nodes
    const [layout] = region.children
    const [boardColumn, tree] = layout.children
    const [board] = boardColumn.children
    const [, treeCaption, treeCanvas, treeKey] = tree.children
    const [treeSvg] = treeCanvas.children
    const depthLayer = treeSvg.children[3]
    const edgeLayer = treeSvg.children[4]
    const nodeLayer = treeSvg.children[5]
    const treeEdges = edgeLayer.children
    const treeNodes = nodeLayer.children
    const treeNode = (id) => treeNodes.find((node) => node.dataset.node === id)
    const treeEdge = (to) => treeEdges.find((edge) => edge.dataset.kind && edge.to === to)
    const initialNodeCount = treeNodes.length
    const initialEdgeCount = treeEdges.length

    assert.equal(region.attributes.get("role"), "region")
    assert.equal(region.attributes.get("aria-label"), "N-Queens search board and decision tree")
    assert.equal(board.attributes.get("role"), "grid")
    assert.equal(tree.attributes.get("aria-label"), "N-Queens decision tree")
    assert.equal(treeSvg.attributes.get("role"), "img")
    assert.equal(treeKey.attributes.get("role"), "list")
    assert.match(treeKey.className, /steptrace__legend/)
    assert.match(treeKey.className, /steptrace__bt-tree-legend/)
    assert.equal(treeKey.children.length, 4)
    assert.match(ICON.chessQueen, /lucide-chess-queen/)
    assert.match(ICON.chessQueen, /M4 20a2 2 0 0 1 2-2h12/)
    assert.match(board.children[0].children[0].innerHTML, /lucide-chess-queen/)
    assert.ok(treeNodes.length > 8)
    assert.ok(treeEdges.length > 7)
    assert.equal(tree.dataset.orientation, "portrait")
    const depthLines = depthLayer.children.filter(
      (child) => child.attributes.get("class") === "steptrace__bt-tree-depth-line",
    )
    assert.equal(depthLines.length, 6)
    assert.ok(
      depthLines.every(
        (line) => Number(line.attributes.get("x1")) < Number(line.attributes.get("x2")),
      ),
    )
    assert.equal(depthLines[0].attributes.get("x1"), "42")
    assert.equal(treeNode("root").children[0].attributes.get("r"), "17.5")
    assert.equal(treeNode("root").children[1].attributes.get("r"), "13")
    assert.match(treeNode("root").children[2].attributes.get("class"), /steptrace__id/)
    assert.match(treeNode("root").children[2].attributes.get("class"), /steptrace__rtlabel/)

    view.paint(recorder.frames[0], 0, recorder.frames.length)
    assert.equal(tree.dataset.event, "start")
    assert.equal(treeCaption.textContent, "Start at root")
    assert.equal(treeNode("root").dataset.active, "true")
    assert.equal(treeNode("d:0").dataset.vis, "0")
    assert.equal(board.children.filter((cell) => cell.dataset.hasQueen === "1").length, 0)

    const pruneIndex = recorder.frames.findIndex(
      (frame) =>
        frame.type === "reject" &&
        frame.cursor.row === 2 &&
        frame.cursor.col === 2 &&
        frame.queens[1] === 3,
    )
    view.paint(recorder.frames[pruneIndex], pruneIndex, recorder.frames.length)
    const activePrune = treeNode("p:d:0.3")
    assert.equal(tree.dataset.event, "prune")
    assert.equal(treeCaption.textContent, "Prune R2 C2 · blocked by R0 C0")
    assert.equal(activePrune.dataset.active, "true")
    assert.equal(activePrune.dataset.state, "prune")
    assert.equal(activePrune.children[2].textContent, "×2")
    assert.equal(treeEdges.find((edge) => edge.dataset.to === "p:d:0.3").dataset.path, "true")

    const backtrackIndex = recorder.frames.findIndex(
      (frame) => frame.type === "backtrack" && frame.cursor.row === 2,
    )
    view.paint(recorder.frames[backtrackIndex], backtrackIndex, recorder.frames.length)
    const returnParent = treeNode("d:0.3")
    const returnSource = treeNode("d:0.3.1")
    const returnEdge = treeEdges.find(
      (edge) => edge.dataset.return === "true" && edge.attributes.get("marker-start") !== "none",
    )
    assert.equal(tree.dataset.event, "return")
    assert.equal(treeCaption.textContent, "Return R2 C1 → R1 C3")
    assert.equal(returnParent.dataset.active, "true")
    assert.equal(returnSource.dataset.returnSource, "true")
    assert.ok(returnEdge)
    assert.match(returnEdge.attributes.get("marker-start"), /steptrace-backtrack-tree-\d+-return/)

    const rootBacktrackIndex = recorder.frames.findIndex(
      (frame) => frame.type === "backtrack" && frame.cursor.row === 0,
    )
    view.paint(recorder.frames[rootBacktrackIndex], rootBacktrackIndex, recorder.frames.length)
    assert.equal(treeCaption.textContent, "Return R0 C0 → root")
    assert.equal(treeNode("root").dataset.active, "true")

    const finalIndex = recorder.frames.length - 1
    view.paint(recorder.frames[finalIndex], finalIndex, recorder.frames.length)
    assert.equal(
      board.children.filter(
        (cell) => cell.dataset.hasQueen === "1" && cell.dataset.state === "solved",
      ).length,
      4,
    )
    assert.equal(tree.dataset.event, "solution")
    assert.equal(treeCaption.textContent, "Solution [1, 3, 0, 2]")
    assert.equal(treeNode("solution").dataset.active, "true")
    assert.equal(treeNodes.filter((node) => node.dataset.solution === "true").length, 6)
    assert.equal(treeEdges.filter((edge) => edge.dataset.solution === "true").length, 5)
    assert.equal(treeNode("d:0").dataset.collapsed, "true")
    assert.equal(treeEdges.find((edge) => edge.dataset.to === "d:0").dataset.collapsed, "true")
    assert.equal(treeNodes.length, initialNodeCount)
    assert.equal(treeEdges.length, initialEdgeCount)
  } finally {
    globalThis.document = previousDocument
  }

  assert.match(
    styles,
    /\.steptrace__bt\s*\{[^}]*container: steptrace-backtrack \/ inline-size;[^}]*width: 100%;[^}]*margin: 0\.4rem auto;/s,
  )
  assert.match(
    styles,
    /@container steptrace-backtrack \(min-width: 26rem\)[\s\S]*?grid-template-columns: fit-content\(18rem\) minmax\(0, 1fr\);[\s\S]*?\.steptrace__bt-board-column\s*\{[^}]*inline-size: min\(18rem, 40cqi\);[\s\S]*?\.steptrace__bt-tree\s*\{[^}]*height: 23rem;[^}]*border-left: 1px solid var\(--_hair\);/,
  )
  assert.match(
    styles,
    /\.steptrace__bt-tree\s*\{[^}]*height: 19rem;[^}]*grid-template-rows: auto auto 13\.125rem auto;/s,
  )
  assert.match(
    styles,
    /\.steptrace__bt-tree-canvas\s*\{[^}]*block-size: 13\.125rem;[^}]*overflow: hidden;/s,
  )
  assert.match(
    styles,
    /@container steptrace-backtrack \(min-width: 26rem\)[\s\S]*?\.steptrace__bt-tree\s*\{[^}]*grid-template-rows: auto auto minmax\(0, 1fr\) auto;[\s\S]*?\.steptrace__bt-tree-canvas\s*\{[^}]*block-size: auto;/,
  )
  assert.match(styles, /\.steptrace__rtedge\[data-return="true"\]\s*\{[^}]*var\(--_violet\)/s)
  assert.match(styles, /\.steptrace__rtedge\[data-solution="true"\]\s*\{[^}]*var\(--_green\)/s)
  assert.match(styles, /\.steptrace__btcell:nth-child\(4n\)\s*\{[^}]*border-right: 0;/s)
  assert.match(styles, /\.steptrace__btcell:nth-last-child\(-n \+ 4\)\s*\{[^}]*border-bottom: 0;/s)
  assert.doesNotMatch(renderSource, /dataset\.last(?:Column|Row)/)
  assert.match(
    renderSource,
    /steptrace__node steptrace__rtnode steptrace__bt-tree-node[\s\S]*?steptrace__ncirc steptrace__rtcirc/,
  )
  assert.doesNotMatch(styles, /\.steptrace__rtnode \.steptrace__rtcirc\s*\{/)
  assert.doesNotMatch(styles, /\.steptrace__bt-tree-node-label\s*\{[^}]*font:/s)
  for (const selector of ["steptrace__bt-tree-depth", "steptrace__bt-tree-caption"])
    assert.match(
      styles,
      new RegExp(`\\.${selector}\\s*\\{[^}]*font: var\\(--_graph-node-font\\);`, "s"),
    )
  assert.match(
    styles,
    /\.steptrace__bt-tree-depth-line\s*\{[^}]*stroke: var\(--_hair\);[^}]*stroke-dasharray: 2 3;/s,
  )
  assert.match(
    styles,
    /\.steptrace \.steptrace__bt-tree-legend\s*\{[^}]*flex-wrap: nowrap;[^}]*overflow: hidden;/s,
  )
  assert.doesNotMatch(styles, /\.steptrace \.steptrace__bt-tree-legend\s*\{[^}]*(?:font|gap):/s)
  assert.match(renderSource, /steptrace__swatch steptrace__rtswatch/)
  assert.match(renderSource, /state: "split"/)
  assert.match(renderSource, /state: "combine"/)
  assert.doesNotMatch(renderSource, /steptrace__bt-tree-swatch/)
  assert.doesNotMatch(styles, /steptrace__bt-tree-swatch/)
  assert.doesNotMatch(styles, /steptrace__rtedge\[data-path="true"\]/)
  assert.doesNotMatch(styles, /steptrace__rtedge\[data-kind="prune"\]/)
  assert.doesNotMatch(renderSource, /dataset\.exhausted/)
  assert.doesNotMatch(styles, /data-exhausted/)
  assert.match(renderSource, /dataset\.collapsed/)
  assert.match(renderSource, /GRAPH_NODE_RADIUS_PX/)
  assert.match(renderSource, /GRAPH_NODE_HALO_GAP_PX/)
  assert.match(renderSource, /observeFixedSvgNodes\(/)
  assert.match(renderSource, /trimGraphEdge\(/)
  assert.match(renderSource, /const leafGap = 36/)
  assert.match(renderSource, /const depthGap = 42/)
  assert.match(renderSource, /const leafPad = 90/)
  assert.match(renderSource, /const leafEndPad = 10/)
  assert.match(renderSource, /const guideShift = Math\.max\(0, sideGutter - 8\)/)
  assert.match(renderSource, /\(42 - guideShift\) \* unitsPerCssPixel/)
  assert.match(renderSource, /tree\.dataset\.orientation = "portrait"/)
  assert.doesNotMatch(renderSource, /treeLayouts|orientation === "landscape"/)
  assert.match(renderSource, /makeLegend\([\s\S]*?Decision tree state legend/)
  assert.match(renderSource, /marker-start/)
  assert.match(renderSource, /steptrace__rtedge steptrace__bt-tree-edge/)
  assert.match(renderSource, /steptrace__node steptrace__rtnode steptrace__bt-tree-node/)
  assert.doesNotMatch(renderSource, /steptrace__bt-tree-key/)
  assert.doesNotMatch(styles, /steptrace__bt-tree-key/)
  assert.doesNotMatch(renderSource, /steptrace__bt-history/)
  assert.doesNotMatch(styles, /steptrace__bt-history/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /♛/)
})

test("prefix sum records every build read, write, and range-query operation", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "prefix-sum",
    array: [4, 7, 2, 9, 5, 3, 8],
    range: [2, 5],
  })
  const frames = result.frames

  assert.equal(result.kind, "pointers")
  assert.equal(result.family.id, "prefix-sum")
  assert.equal(frames.length, 20)
  assert.deepEqual(
    frames.map((frame) => frame.type),
    [
      "init",
      "add",
      "write",
      "add",
      "write",
      "add",
      "write",
      "add",
      "write",
      "add",
      "write",
      "add",
      "write",
      "add",
      "write",
      "query",
      "right",
      "left",
      "subtract",
      "done",
    ],
  )
  assert.deepEqual(
    frames.filter((frame) => frame.type === "write").at(-1).prefix,
    [0, 4, 11, 13, 22, 27, 30, 38],
  )
  assert.equal(frames.find((frame) => frame.type === "right").rightPrefix, 30)
  assert.equal(frames.find((frame) => frame.type === "left").leftPrefix, 11)
  assert.equal(frames.at(-1).result, 19)
  assert.throws(
    () => api.buildFrames({ algorithm: "prefix-sum", array: [1, 2], range: [1, 2] }),
    /range.*inside the array/,
  )
})

test("prefix sum reuses canonical value-only array strips in a stable responsive stage", () => {
  const familySource = readFileSync(join(here, "src", "families", "prefix-sum.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "prefix-sum.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const note = readFileSync(
    join(repoRoot, "Vault", "Home", "Computer Science", "Algorithms", "Patterns", "Prefix Sum.md"),
    "utf8",
  )

  assert.match(familySource, /makeArrayStrip/)
  assert.match(familySource, /stableStage: true/)
  assert.match(familySource, /stageLayout: "fill"/)
  assert.match(familySource, /nodes: \[root, legend, status\]/)
  assert.match(familySource, /steptrace__rail-label/)
  assert.match(familySource, /steptrace__prefix-sum-legend/)
  assert.match(styles, /\.steptrace__prefix-sum-section \+ \.steptrace__prefix-sum-section/)
  assert.doesNotMatch(styles, /border-block-start/)
  assert.doesNotMatch(styles, /steptrace__prefix-sum-index/)
  assert.doesNotMatch(familySource, /steptrace__prefix-sum-equation/)
  assert.match(styles, /@container steptrace-prefix-sum \(max-width: 36rem\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /overflow-x:\s*auto/)
  assert.match(styleEntry, /@use "prefix-sum";/)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"prefix-sum","array":\[4,7,2,9,5,3,8\],"range":\[2,5\]\}\n```/,
  )
  assert.doesNotMatch(note, /Visualization pending/)
})

test("top-k elements records every root decision and heap repair step", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "top-k-elements",
    array: [12, 3, 17, 8, 25, 5, 19, 14],
    k: 3,
  })
  const frames = result.frames

  assert.equal(result.kind, "pointers")
  assert.equal(result.family.id, "heap-selection")
  assert.equal(frames.length, 34)
  assert.deepEqual(
    frames.filter((frame) => frame.type === "compare-root").map((frame) => frame.cursor),
    [3, 4, 5, 6, 7],
    "every value after the first k must face the weakest retained root",
  )
  assert.deepEqual(
    frames.filter((frame) => frame.type === "reject").map((frame) => frame.cursor),
    [5, 7],
  )
  assert.deepEqual(
    frames.filter((frame) => frame.type === "replace-root").map((frame) => frame.cursor),
    [3, 4, 6],
  )
  assert.deepEqual(
    frames
      .filter((frame) => frame.type === "swap-down")
      .map((frame) => frame.heap.map((entry) => entry.value)),
    [
      [12, 25, 17],
      [17, 25, 19],
    ],
  )
  assert.deepEqual(
    frames.at(-1).heap.map((entry) => entry.value),
    [17, 25, 19],
  )
  assert.equal(frames.at(-1).heap[0].value, 17)
  assert.deepEqual(
    frames
      .at(-1)
      .heap.map((entry) => entry.value)
      .slice()
      .sort((a, b) => b - a),
    [25, 19, 17],
  )
  assert.ok(
    frames
      .filter((frame) => ["init", "read", "compare-root", "reject", "done"].includes(frame.type))
      .every((frame) =>
        frame.heap.every(
          (entry, index) =>
            index === 0 || frame.heap[Math.floor((index - 1) / 2)].value <= entry.value,
        ),
      ),
    "the heap must be repaired before the next stream value is read",
  )
  assert.equal(frames.at(-1).comparisons, 13)
  assert.equal(frames.at(-1).swaps, 3)

  assert.throws(
    () => api.buildFrames({ algorithm: "top-k-elements", array: [1, 2], k: 0 }),
    /integer "k"/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "top-k-elements", array: [1, 2], k: 3 }),
    /integer "k"/,
  )
})

test("heap-selection reuses shared strips, tree tokens, and host artifacts", () => {
  const familySource = readFileSync(join(here, "src", "families", "heap-selection.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "heap-selection.scss"), "utf8")
  const pointerStyles = readFileSync(join(here, "src", "styles", "pointers.scss"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Patterns",
      "Top-K Elements.md",
    ),
    "utf8",
  )

  assert.match(familySource, /const stream = makeArrayStrip\(first\.array\)/)
  assert.doesNotMatch(familySource, /steptrace__heap-stream-icon/)
  assert.match(familySource, /steptrace__node steptrace__heap-node/)
  assert.match(familySource, /steptrace__edge steptrace__heap-edge/)
  assert.match(familySource, /steptrace__ncirc/)
  assert.match(familySource, /GRAPH_NODE_RADIUS_PX/)
  assert.match(familySource, /observeFixedSvgNodes/)
  assert.match(familySource, /trimGraphEdge/)
  assert.match(familySource, /destroy: geometry\.destroy/)
  assert.match(familySource, /successMarker\(\)/)
  assert.match(familySource, /ICON\.x/)
  assert.match(familySource, /stableStage: true/)
  assert.match(familySource, /stageLayout: "fill"/)
  assert.match(familySource, /nodes: \[root, legend, status\]/)
  assert.match(familySource, /root is the weakest current winner/)
  assert.doesNotMatch(styles, /\.steptrace__heap-legend/)
  assert.match(styles, /@container steptrace-heap-selection \(max-width: 36rem\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /transform:\s*scale/)
  assert.doesNotMatch(styles, /stroke-width:\s*2\.2/)
  assert.doesNotMatch(styles, /overflow-x:\s*auto/)
  assert.doesNotMatch(styles, /padding-bottom:\s*0\.9rem/)
  assert.doesNotMatch(styles, /block-size:\s*2\.45rem/)
  assert.doesNotMatch(styles, /font-size:\s*0\.78rem/)
  assert.doesNotMatch(styles, /steptrace__heap-stream-icon/)
  assert.match(
    styles,
    /\.steptrace \.steptrace__heap-stream \.steptrace__pcell\[data-state="current"\] \{[^}]*--steptrace-array-outline: var\(--_blue\);[^}]*color: var\(--_blue\);[^}]*font-weight: 700;/s,
  )
  assert.match(pointerStyles, /\.steptrace__pwrap\s*\{[^}]*height: 46px;[^}]*margin: 1\.4rem 0;/s)
  assert.match(pointerStyles, /\.steptrace__pcells\s*\{[^}]*height: 100%;[^}]*border: 1px solid/s)
  assert.match(
    pointerStyles,
    /\.steptrace__pcell\s*\{[^}]*font: 500 0\.98rem var\(--_font-mono\);[^}]*border-right: 1px solid/s,
  )
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__pcells,[\s\S]*?--steptrace-array-radius: 9px;[^}]*overflow: hidden;/s,
  )
  assert.match(styleEntry, /@use "heap-selection";/)
  assert.match(quartzCss, /\.steptrace__heap-selection/)
  assert.match(obsidianCss, /\.steptrace__heap-selection/)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"top-k-elements","array":\[12,3,17,8,25,5,19,14\],"k":3\}\n```/,
  )
  assert.match(note, /final `\[17, 25, 19\]` is a valid min-heap/)
  assert.doesNotMatch(note, /Visualization pending/)
})

test("heap-selection keeps canonical stream geometry while separating it from the heap", () => {
  class FakeNode {
    constructor(tagName, textContent = "") {
      this.tagName = tagName
      this.textContent = textContent
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.className = ""
      this.style = { setProperty: (key, value) => this.attributes.set(`style:${key}`, value) }
      this.classList = {
        add: (...names) => {
          this.className = [
            ...new Set([...this.className.split(/\s+/).filter(Boolean), ...names]),
          ].join(" ")
        },
      }
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    append(...children) {
      this.children.push(...children)
    }
    replaceChildren(...children) {
      this.children = children
    }
  }
  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
    createTextNode: (value) => new FakeNode("#text", value),
  }
  try {
    const { steptrace: api } = loadStepTraceModule("src", "engine.ts")
    const { makeHeapSelectionView } = loadStepTraceModule("src", "families", "heap-selection.ts")
    const frames = api.buildFrames({
      algorithm: "top-k-elements",
      array: [12, 3, 17, 8, 25, 5, 19, 14],
      k: 3,
    }).frames
    const view = makeHeapSelectionView(frames)
    const [root, legend] = view.nodes
    const [streamLabel, stream, heapLabel, heap] = root.children
    const styles = readFileSync(join(here, "src", "styles", "heap-selection.scss"), "utf8")
    const pointerStyles = readFileSync(join(here, "src", "styles", "pointers.scss"), "utf8")
    const svg = heap.children[0]
    const heapEdges = svg.children.filter((node) =>
      /\bsteptrace__heap-edge\b/.test(node.attributes.get("class")),
    )
    const heapNodes = svg.children.filter((node) =>
      /\bsteptrace__heap-node\b/.test(node.attributes.get("class")),
    )

    assert.equal(streamLabel.textContent, "Stream")
    assert.match(stream.className, /\bsteptrace__heap-stream\b/)
    assert.match(stream.className, /\bsteptrace__pwrap\b/)
    assert.match(stream.children[0].className, /\bsteptrace__pcells\b/)
    assert.ok(
      stream.children[0].children.every((cell) => /\bsteptrace__pcell\b/.test(cell.className)),
    )
    assert.ok(
      stream.children[0].children.every((cell) => cell.children.length === 0),
      "canonical stream cells do not add corner-icon overlays",
    )
    assert.equal(heapLabel.textContent, "Min-heap · capacity k = 3")
    assert.match(heapLabel.className, /\bsteptrace__heap-tree-label\b/)
    assert.match(heap.className, /\bsteptrace__heap-tree\b/)
    assert.equal(svg.attributes.get("viewBox"), "0 0 300 124")
    assert.ok(
      heapNodes.every((node) => node.children[0].attributes.get("r") === "13"),
      "heap nodes use the canonical graph-node radius",
    )
    assert.ok(
      heapNodes.every((node) => /scale\(1\)/.test(node.attributes.get("transform"))),
      "heap nodes use shared fixed-size SVG geometry",
    )
    assert.ok(
      heapEdges.every(
        (edge) =>
          edge.attributes.get("x1") !== "150" &&
          edge.attributes.get("x2") !== edge.attributes.get("x1"),
      ),
      "heap edges terminate at the canonical node boundary",
    )
    assert.match(legend.className, /\bsteptrace__legend\b/)
    view.paint(frames[0])
    assert.ok(heapNodes.every((node) => node.dataset.visible === "0"))
    assert.ok(heapNodes.every((node) => node.attributes.get("aria-hidden") === "true"))
    assert.ok(heapEdges.every((edge) => edge.dataset.visible === "0"))
    assert.ok(heapNodes.every((node) => node.children[2].dataset.visible === "0"))
    const partial = frames.find((frame) => frame.heap.length === 2)
    view.paint(partial)
    assert.deepEqual(
      heapNodes.map((node) => node.dataset.visible),
      ["1", "1", "0"],
    )
    assert.deepEqual(
      heapEdges.map((edge) => edge.dataset.visible),
      ["1", "0"],
    )
    assert.deepEqual(
      heapNodes.map((node) => node.children[2].dataset.visible),
      ["1", "0", "0"],
    )
    assert.match(pointerStyles, /\.steptrace__pwrap\s*\{[^}]*height: 46px;/s)
    assert.doesNotMatch(styles, /padding-bottom:\s*0\.9rem/)
    assert.doesNotMatch(styles, /block-size:\s*2\.45rem/)
    assert.doesNotMatch(styles, /font-size:\s*0\.78rem/)
    assert.match(styles, /\.steptrace \.steptrace__heap-svg \{[^}]*overflow: hidden;/s)
    assert.match(
      styles,
      /\.steptrace \.steptrace__heap-node\[data-visible="0"\],[\s\S]*?\.steptrace \.steptrace__heap-edge\[data-visible="0"\],[\s\S]*?\.steptrace \.steptrace__heap-root-label\[data-visible="0"\] \{[^}]*opacity: 0;[^}]*visibility: hidden;/,
    )
    assert.match(
      styles,
      /\.steptrace \.steptrace__heap-tree-label \{[\s\S]*padding-top: 0\.9rem;[\s\S]*border-top: 1px solid var\(--_hair\);/,
    )
  } finally {
    globalThis.document = previousDocument
  }
})

test("monotonic stack records every dominated pop and retained push", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "monotonic-stack-and-queue",
    array: [73, 74, 75, 71, 69, 72, 76, 73],
  })
  const frames = result.frames

  assert.equal(result.kind, "pointers")
  assert.equal(result.family.id, "stack-sequence")
  assert.equal(frames.length, 24)
  assert.deepEqual(
    frames.map((frame) => frame.type),
    [
      "init",
      "scan",
      "push",
      "scan",
      "pop",
      "push",
      "scan",
      "pop",
      "push",
      "scan",
      "push",
      "scan",
      "push",
      "scan",
      "pop",
      "pop",
      "push",
      "scan",
      "pop",
      "pop",
      "push",
      "scan",
      "push",
      "done",
    ],
  )
  assert.deepEqual(
    frames.filter((frame) => frame.type === "pop").map((frame) => frame.popped),
    [0, 1, 4, 3, 5, 2],
  )
  assert.deepEqual(
    frames.filter((frame) => frame.type === "push").map((frame) => frame.stack),
    [[0], [1], [2], [2, 3], [2, 3, 4], [2, 5], [6], [6, 7]],
  )
  assert.deepEqual(frames.at(-1).answers, [1, 2, 6, 5, 5, 6, null, null])
  assert.equal(frames.at(-1).pushes, 8)
  assert.equal(frames.at(-1).pops, 6)
  assert.ok(
    frames.every((frame) =>
      frame.stack.every(
        (index, position) =>
          position === 0 || frame.array[frame.stack[position - 1]] >= frame.array[index],
      ),
    ),
  )

  const equal = api
    .buildFrames({
      algorithm: "monotonic-stack-and-queue",
      array: [2, 2],
    })
    .frames.at(-1)
  assert.deepEqual(equal.stack, [0, 1], "equal values stay live for strict next-greater")
  assert.deepEqual(equal.answers, [null, null])
  assert.throws(
    () => api.buildFrames({ algorithm: "monotonic-stack-and-queue", array: [] }),
    /non-empty numeric "array"/,
  )
})

test("stack-sequence keeps one stable accessible viewport in both hosts", () => {
  const familySource = readFileSync(join(here, "src", "families", "stack-sequence.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "stack-sequence.scss"), "utf8")
  const shared = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Patterns",
      "Monotonic Stack and Queue.md",
    ),
    "utf8",
  )

  assert.match(familySource, /stableStage: true/)
  assert.match(familySource, /stageLayout: "fill"/)
  assert.match(familySource, /nodes: \[root, legend, status\]/)
  assert.match(familySource, /const scan = makeArrayStrip\(first\.array\)/)
  assert.match(familySource, /steptrace__rail-label steptrace__stack-sequence-label/)
  assert.match(familySource, /stackLabel\.textContent = "MONOTONIC STACK"/)
  assert.match(familySource, /steptrace__stack-sequence-legend/)
  assert.match(familySource, /ICON\.search/)
  assert.match(familySource, /setAttribute\("role", "list"\)/)
  assert.match(familySource, /setAttribute\("aria-current"/)
  assert.match(styles, /\.steptrace__stack-sequence-scan \.steptrace__pcell/)
  assert.match(styles, /\.steptrace__stack-sequence-stack \{[^}]*flex-direction: column-reverse;/s)
  assert.match(styles, /\.steptrace__stack-sequence-stack \{[^}]*justify-content: flex-start;/s)
  assert.match(
    styles,
    /\.steptrace__stack-sequence-stack \{[^}]*inline-size: clamp\(10rem, 44cqi, 14rem\);/s,
  )
  assert.match(styles, /\.steptrace__stack-sequence-stack-cell \{[^}]*flex: 1 1 0;/s)
  assert.match(
    shared,
    /\.steptrace \.steptrace__pcells > \.steptrace__pcell,[\s\S]*?outline: 2px solid var\(--steptrace-array-outline, transparent\);[^}]*outline-offset: -2px;/,
  )
  assert.match(
    shared,
    /\.steptrace \.steptrace__pcells > \.steptrace__pcell:first-child,[\s\S]*?border-radius: calc\(var\(--steptrace-array-radius\) - 1px\) 0 0/,
  )
  assert.match(
    shared,
    /\.steptrace \.steptrace__pcells > \.steptrace__pcell:last-child,[\s\S]*?border-radius: 0 calc\(var\(--steptrace-array-radius\) - 1px\)/,
  )
  assert.match(
    styles,
    /\.steptrace__stack-sequence-scan \.steptrace__pcell\[data-state="scan"\]\s*\{[^}]*outline-color: var\(--_blue\);/s,
  )
  assert.doesNotMatch(styles, /@keyframes steptrace-stack-sequence-pop\s*\{[^}]*transform:/s)
  assert.match(styles, /@container steptrace-stack-sequence \(max-width: 36rem\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /overflow-x:\s*auto/)
  assert.match(styleEntry, /@use "stack-sequence";/)
  assert.match(quartzCss, /\.steptrace__stack-sequence/)
  assert.match(obsidianCss, /\.steptrace__stack-sequence/)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"monotonic-stack-and-queue","array":\[73,74,75,71,69,72,76,73\]\}\n```/,
  )
  assert.match(note, /eight pushes and six pops/)
  assert.doesNotMatch(note, /Visualization pending/)
})

test("fast and slow pointers records every hop and reuses linked-topology", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const result = api.buildFrames({ algorithm: "fast-and-slow-pointers" })
  const frames = result.frames

  assert.equal(result.kind, "pointers")
  assert.equal(result.family.id, "linked-topology")
  assert.equal(frames.length, 24)
  assert.deepEqual(
    frames[0].nodes.map((node) => node.id),
    ["A", "B", "C", "D", "E", "F", "G", "H"],
  )
  assert.deepEqual(frames[0].cycle, ["C", "D", "E", "F", "G", "H"])
  assert.ok(
    frames[0].nodes.every((node) => node.x >= 0 && node.x <= 100 && node.y >= 0 && node.y <= 70),
  )
  const positions = Object.fromEntries(frames[0].nodes.map((node) => [node.id, [node.x, node.y]]))
  assert.deepEqual(
    frames[0].cycle.map((id) => positions[id]),
    [
      [38, 35],
      [53, 15],
      [78, 15],
      [93, 35],
      [78, 55],
      [53, 55],
    ],
  )
  const cycleDistances = frames[0].cycle.map((id) => {
    const next = frames[0].next[id]
    return Math.hypot(positions[next][0] - positions[id][0], positions[next][1] - positions[id][1])
  })
  assert.deepEqual(cycleDistances, [25, 25, 25, 25, 25, 25])
  assert.deepEqual(
    frames[0].cycle.map((id) => frames[0].next[id]),
    ["D", "E", "F", "G", "H", "C"],
  )
  assert.deepEqual(
    frames.map((frame) => frame.type),
    [
      "init",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "move",
      "meet",
      "reset",
      "move",
      "move",
      "move",
      "entry",
    ],
  )
  assert.deepEqual(
    frames
      .filter((frame) => frame.phase === "detect" && frame.moved === "slow")
      .map((frame) => frame.slow),
    ["B", "C", "D", "E", "F", "G"],
  )
  assert.deepEqual(
    frames
      .filter((frame) => frame.phase === "detect" && frame.moved === "fast")
      .map((frame) => frame.fast),
    ["B", "C", "D", "E", "F", "G", "H", "C", "D", "E", "F", "G"],
  )
  assert.deepEqual(
    frames.slice(19).map((frame) => [frame.slow, frame.fast]),
    [
      ["G", "A"],
      ["G", "B"],
      ["H", "B"],
      ["H", "C"],
      ["C", "C"],
    ],
  )
  assert.equal(frames[18].meeting, "G")
  assert.equal(frames.at(-1).entry, "C")
  assert.deepEqual(
    buildMilestones("fast-and-slow-pointers", "pointers", frames).map((mark) => mark.label),
    ["Start together", "Meet at G", "Reset to head", "Entry located"],
  )
})

test("linked-topology keeps topology stable and animates only pointer markers", () => {
  const familySource = readFileSync(join(here, "src", "families", "linked-topology.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "linked-topology.scss"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")

  assert.match(familySource, /profile: "fast-slow-pointers"/)
  assert.match(familySource, /stableStage: true/)
  assert.match(familySource, /steptrace__linked-legend/)
  assert.match(familySource, /result\.append\(successMarker\(\)\)/)
  assert.doesNotMatch(familySource, /steptrace__linked-label|textContent = "Linked structure"/)
  assert.match(familySource, /canvas\.setAttribute\("role", "img"\)/)
  assert.match(familySource, /topology\.setAttribute\("viewBox", "0 0 100 70"\)/)
  assert.match(familySource, /topology\.setAttribute\("preserveAspectRatio", "xMidYMid meet"\)/)
  assert.match(familySource, /GRAPH_NODE_RADIUS_PX/)
  assert.match(familySource, /GRAPH_EDGE_ARROW_GAP_PX/)
  assert.match(familySource, /observeFixedSvgNodes\(topology/)
  assert.doesNotMatch(familySource, /cycleColumnOffset/)
  assert.match(familySource, /first\.cycle\.includes\(fromId\)/)
  assert.doesNotMatch(familySource, /cycleBack| Q /)
  assert.match(
    readFileSync(join(here, "src", "algorithms", "fast-and-slow-pointers.ts"), "utf8"),
    /cycle: \["C", "D", "E", "F", "G", "H"\]/,
  )
  assert.match(familySource, /k: frame\.entry == null \? "meeting" : "entry"/)
  assert.doesNotMatch(familySource, /\["C", "D", "E"\]|fromId === "E"/)
  assert.doesNotMatch(familySource, /entryCandidate|linked-pointer-icon/)
  assert.match(styles, /inset-inline-start var\(--_dur-move\)/)
  assert.match(styles, /inset-block-start var\(--_dur-move\)/)
  assert.match(
    styles,
    /\.steptrace \.steptrace__linked-canvas \{[^}]*inline-size: min\(100%, 27rem\);[^}]*block-size: auto;[^}]*aspect-ratio: 10 \/ 7;[^}]*margin-inline: auto;/s,
  )
  assert.match(
    styles,
    /\.steptrace \.steptrace__linked-node \{[^}]*inline-size: var\(--_graph-node-size\);[^}]*block-size: var\(--_graph-node-size\);/s,
  )
  assert.doesNotMatch(styles, /clamp\(2\.15rem, 6vw, 2\.65rem\)/)
  assert.doesNotMatch(styles, /\.steptrace__linked-legend \{/)
  assert.match(sharedStyles, /\.steptrace__legend \{[^}]*justify-content: center;/s)
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__success-marker circle \{[^}]*fill: var\(--_green\);/s,
  )
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__success-marker path \{[^}]*stroke: currentColor;/s,
  )
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__success-marker path \{[^}]*transform: scale\(0\.72\);/s,
  )
  assert.match(familySource, /arrowPath\.setAttribute\("class", "steptrace__linked-arrow"\)/)
  assert.match(familySource, /arrowPath\.setAttribute\("data-role", role\)/)
  assert.match(styles, /\.steptrace \.steptrace__linked-arrow \{[^}]*fill: var\(--_neutral\);/s)
  assert.match(
    styles,
    /\.steptrace \.steptrace__linked-arrow\[data-role="cycle"\]\s*\{[^}]*fill: color-mix\(in srgb, var\(--_violet\) 62%, var\(--_neutral\)\);/s,
  )
  assert.doesNotMatch(styles, /context-stroke/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /overflow-x:\s*auto/)
  assert.match(styleEntry, /@use "linked-topology";/)
})

test("graph renderers share one fixed node geometry and visual token contract", () => {
  const graphNode = loadStepTraceModule("src", "graph-node.ts")
  const graphNodeStyles = readFileSync(join(here, "src", "styles", "graph-node.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const families = ["graph-state", "graph-representation", "linked-topology"]

  assert.equal(graphNode.GRAPH_NODE_SIZE_PX, 26)
  assert.equal(graphNode.GRAPH_NODE_RADIUS_PX, 13)
  assert.equal(
    graphNode.svgRenderedScale({ width: 310, height: 160 }, { width: 620, height: 320 }),
    0.5,
  )
  assert.deepEqual(graphNode.trimGraphEdge({ x: 0, y: 0 }, { x: 25, y: 0 }, 5), {
    x1: 5,
    y1: 0,
    x2: 20,
    y2: 0,
  })
  assert.match(renderSource, /observeFixedSvgNodes\(/)
  assert.match(renderSource, /GRAPH_NODE_RADIUS_PX/)
  assert.doesNotMatch(renderSource, /const R = 16/)
  for (const family of families) {
    const source = readFileSync(join(here, "src", "families", `${family}.ts`), "utf8")
    assert.match(source, /GRAPH_NODE_RADIUS_PX/)
    assert.match(source, /observeFixedSvgNodes\(/)
  }
  assert.match(styleEntry, /@use "graph-node";/)
  assert.match(graphNodeStyles, /--_graph-node-size: 1\.625rem/)
  assert.match(graphNodeStyles, /--_graph-node-stroke-width: 1\.6px/)
  assert.match(graphNodeStyles, /--_graph-node-font: 600 0\.66rem\/1 var\(--_font-head\)/)
})

test("legacy graph visited markers reuse the shared success badge", () => {
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "graph.scss"), "utf8")

  assert.match(renderSource, /export function successMarker/)
  assert.match(renderSource, /successMarker\("steptrace__nmark-success"\)/)
  assert.match(
    renderSource,
    /visitedMark\.setAttribute\("x", String\(p\.x \+ GRAPH_NODE_RADIUS_PX - 8\)\)/,
  )
  assert.match(
    renderSource,
    /visitedMark\.setAttribute\("y", String\(p\.y - GRAPH_NODE_RADIUS_PX - 4\)\)/,
  )
  assert.match(renderSource, /marker: successMarker\(\)/)
  assert.doesNotMatch(renderSource, /data-state-icon="visited"/)
  assert.match(
    styles,
    /\.steptrace__node\[data-state="visited"\] \.steptrace__nmark-success \{[^}]*display: block;/s,
  )
  assert.match(styles, /\.steptrace__swatch--visited \{[^}]*border: 0;/s)
})

test("graph-state labels every edge when the graph carries weighted meaning", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const familySource = readFileSync(join(here, "src", "families", "graph-state.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "graph-state.scss"), "utf8")
  const grid = api.buildFrames({ algorithm: "a-star", variant: "coordinate-grid" }).frames[0]

  assert.equal(grid.detail.kind, "heuristic-search")
  assert.ok(grid.edges.every((edge) => edge.weight === 1))
  assert.match(
    familySource,
    /\["heuristic-search", "edge-relaxation", "mst-scan", "mst-round", "residual-flow"\]\.includes/,
  )
  assert.match(
    familySource,
    /first\.edges\.some\(\(edge\) => edge\.weight !== 1 \|\| edge\.label != null\)/,
  )
  assert.match(familySource, /label\.textContent = edge\.label \?\? String\(edge\.weight\)/)
  assert.match(
    familySource,
    /`\$\{frame\.detail\.flow\[`\$\{edge\.from\}\|\$\{edge\.to\}`\] \|\| 0\}\/\$\{edge\.weight\}`/,
  )
  assert.match(styles, /\.steptrace \.steptrace__gs-edge-label \{[^}]*pointer-events: none;/s)
  assert.match(styles, /paint-order: stroke/)
  assert.match(styles, /font: 600 0\.56rem\/1 var\(--_font-mono\)/)
  assert.match(familySource, /GRAPH_STATE_MARKER_ROLES\.map\(\(role\) =>/)
  assert.match(familySource, /markerIds\.get\(graphStateMarkerRole\(role\)\)/)
  assert.match(styles, /\.steptrace \.steptrace__gs-arrow \{[^}]*fill: var\(--_neutral\);/s)
  assert.match(
    styles,
    /\.steptrace__gs-arrow\[data-role="selected"\]\s*\{[^}]*fill: var\(--_green\);/s,
  )
  assert.doesNotMatch(styles, /context-stroke/)
})

test("counting sort records every tally, prefix, and stable placement in the typed distribution family", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones, milestoneAt } = loadStepTraceModule("src", "render.ts")
  const { frequencyRangeFor } = loadStepTraceModule("src", "families", "distribution-sort.ts")
  const result = api.buildFrames({
    algorithm: "counting-sort",
    array: [2, 5, 3, 0, 2, 3, 0, 3],
  })

  assert.equal(result.family.id, "distribution-sort")
  assert.equal(result.frames[0].type, "intro")
  assert.equal(result.frames.filter((frame) => frame.type === "tally").length, 8)
  assert.equal(result.frames.filter((frame) => frame.type === "prefix").length, 6)
  assert.equal(result.frames.filter((frame) => frame.type === "place").length, 8)
  assert.deepEqual(result.frames.at(-1).output, [0, 0, 2, 2, 3, 3, 3, 5])
  assert.deepEqual(result.frames.at(-1).outputOrigins, [3, 6, 0, 4, 2, 5, 7, 1])
  assert.deepEqual(
    result.frames.find((frame) => frame.type === "prefix" && frame.activeKey === 5).positions,
    [2, 2, 4, 7, 7, 8],
  )
  assert.equal(result.frames.find((frame) => frame.type === "place").activeInput, 7)
  const firstPrefix = result.frames.findIndex((frame) => frame.type === "prefix")
  const firstPlace = result.frames.findIndex((frame) => frame.type === "place")
  const milestones = buildMilestones("counting-sort", "sort", result.frames)

  assert.deepEqual(
    milestones.filter((mark) =>
      [0, firstPrefix, firstPlace, result.frames.length - 1].includes(mark.i),
    ),
    [
      { i: 0, label: "Tally keys" },
      { i: firstPrefix, label: "Reserve output ranges" },
      { i: firstPlace, label: "Place stably" },
      { i: result.frames.length - 1, label: "Result" },
    ],
  )
  assert.equal(milestoneAt(milestones, firstPrefix).label, "Reserve output ranges")
  assert.equal(milestoneAt(milestones, firstPlace).label, "Place stably")
  const prefixZero = result.frames.find((frame) => frame.type === "prefix" && frame.activeKey === 0)
  const prefixOne = result.frames.find((frame) => frame.type === "prefix" && frame.activeKey === 1)
  const prefixThree = result.frames.find(
    (frame) => frame.type === "prefix" && frame.activeKey === 3,
  )
  assert.deepEqual(frequencyRangeFor(prefixZero, 0), { count: 2, slots: "0–1" })
  assert.deepEqual(frequencyRangeFor(prefixZero, 1), { count: 0, slots: null })
  assert.deepEqual(frequencyRangeFor(prefixOne, 1), { count: 0, slots: "—" })
  assert.deepEqual(frequencyRangeFor(prefixThree, 3), { count: 3, slots: "4–6" })
  assert.deepEqual(frequencyRangeFor(result.frames.at(-1), 1), { count: 0, slots: "—" })
  assert.deepEqual(frequencyRangeFor(result.frames.at(-1), 0), { count: 2, slots: "0–1" })
  assert.deepEqual(frequencyRangeFor(result.frames.at(-1), 3), { count: 3, slots: "4–6" })
  assert.deepEqual(frequencyRangeFor(result.frames.at(-1), 5), { count: 1, slots: "7" })
  assert.throws(
    () => api.buildFrames({ algorithm: "counting-sort", array: [1, 1.5] }),
    /integer key/,
  )
})

test("radix sort records every stable scatter and gather across all digit passes", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const result = api.buildFrames({
    algorithm: "radix-sort",
    array: [170, 45, 75, 90, 802, 24, 2, 66],
    radix: 10,
    mode: "LSD",
  })

  assert.equal(result.family.id, "distribution-sort")
  assert.equal(result.frames[0].profile, "radix")
  assert.equal(result.frames[0].passCount, 3)
  assert.equal(result.frames.filter((frame) => frame.type === "pass").length, 3)
  assert.equal(result.frames.filter((frame) => frame.type === "scatter").length, 24)
  assert.equal(
    result.frames.filter((frame) => frame.type === "gather" && frame.activeOutput != null).length,
    24,
  )
  const onesScattered = result.frames.find(
    (frame) => frame.type === "scatter" && frame.passIndex === 0 && frame.scattered === 8,
  )
  assert.deepEqual(
    onesScattered.buckets[0].map((token) => token.value),
    [170, 90],
  )
  assert.deepEqual(
    onesScattered.buckets[2].map((token) => token.value),
    [802, 2],
  )
  const onesComplete = result.frames.find(
    (frame) => frame.type === "pass-complete" && frame.passIndex === 0,
  )
  assert.deepEqual(
    onesComplete.source.map((token) => token.value),
    [170, 90, 802, 2, 24, 45, 75, 66],
  )
  assert.deepEqual(
    result.frames.at(-1).source.map((token) => token.value),
    [2, 24, 45, 66, 75, 90, 170, 802],
  )
  assert.deepEqual(
    result.frames.filter((frame) => frame.type === "scatter").map((frame) => frame.activeSource),
    [...Array(3)].flatMap(() => [0, 1, 2, 3, 4, 5, 6, 7]),
  )
  const milestones = buildMilestones("radix-sort", "sort", result.frames)
  assert.deepEqual(
    milestones.map((mark) => mark.label),
    [
      "ones pass",
      "Gather ones",
      "tens pass",
      "Gather tens",
      "hundreds pass",
      "Gather hundreds",
      "Result",
    ],
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "radix-sort", array: [10, -2], radix: 10 }),
    /non-negative safe integer/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "radix-sort", array: [10, 2], radix: 10, mode: "MSD" }),
    /least-significant-digit/,
  )
})

test("bucket sort exposes every scatter, local comparison, swap, and ordered gather", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { buildMilestones } = loadStepTraceModule("src", "render.ts")
  const result = api.buildFrames({
    algorithm: "bucket-sort",
    array: [0.78, 0.17, 0.39, 0.26, 0.72, 0.94],
    bucketCount: 5,
  })

  assert.equal(result.family.id, "distribution-sort")
  assert.equal(result.frames[0].profile, "bucket")
  assert.deepEqual(
    result.frames.filter((frame) => frame.type === "scatter").map((frame) => frame.activeSource),
    [0, 1, 2, 3, 4, 5],
  )
  const scattered = result.frames.find((frame) => frame.type === "scatter" && frame.scattered === 6)
  assert.deepEqual(
    scattered.buckets.map((bucket) => bucket.map((token) => token.value)),
    [[0.17], [0.39, 0.26], [], [0.78, 0.72], [0.94]],
  )
  const beginGather = result.frames.find(
    (frame) => frame.type === "gather" && frame.activeOutput == null,
  )
  assert.deepEqual(
    beginGather.buckets.map((bucket) => bucket.map((token) => token.value)),
    [[0.17], [0.26, 0.39], [], [0.72, 0.78], [0.94]],
  )
  assert.deepEqual(
    result.frames
      .filter((frame) => frame.type === "gather" && frame.activeOutput != null)
      .map((frame) => frame.activeOutput),
    [0, 1, 2, 3, 4, 5],
  )
  assert.deepEqual(
    result.frames.at(-1).source.map((token) => token.value),
    [0.17, 0.26, 0.39, 0.72, 0.78, 0.94],
  )
  assert.equal(result.frames.at(-1).comparisons, 2)
  assert.equal(result.frames.at(-1).movements, 2)
  assert.deepEqual(
    buildMilestones("bucket-sort", "sort", result.frames).map((mark) => mark.label),
    ["Scatter ranges", "Sort buckets", "Gather ranges", "Result"],
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "bucket-sort", array: [0.2, 1], bucketCount: 5 }),
    /in \[0, 1\)/,
  )
})

test("counting sort renders shared bars around one progressive frequency strip", () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this.textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = { setProperty: (key, value) => this.attributes.set(`style:${key}`, value) }
      this.className = ""
      this.title = ""
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
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    const { makeDistributionSortView } = loadStepTraceModule(
      "src",
      "families",
      "distribution-sort.ts",
    )
    const source = readFileSync(join(here, "src", "families", "distribution-sort.ts"), "utf8")
    const styleSource = readFileSync(join(here, "src", "styles", "distribution.scss"), "utf8")
    const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
    const barsSource = readFileSync(join(here, "src", "styles", "bars.scss"), "utf8")
    const result = api.buildFrames({
      algorithm: "counting-sort",
      array: [2, 5, 3, 0, 2, 3, 0, 3],
    })
    const view = makeDistributionSortView(result.frames)
    const [stage] = view.nodes
    const [inputBand, frequencyBand, outputBand] = stage.children
    const [inputLabel, inputBars] = inputBand.children
    const [frequencyLabel, frequency] = frequencyBand.children
    const [outputLabel, outputBars] = outputBand.children

    assert.equal(view.stageLayout, "fill")
    assert.equal(view.stableStage, true)
    assert.deepEqual(
      [inputLabel.textContent, frequencyLabel.textContent, outputLabel.textContent],
      ["Unsorted Array", "Frequency", "Sorted Array"],
    )
    assert.equal(inputBars.attributes.get("aria-label"), "Unsorted Array")
    assert.equal(frequency.attributes.get("aria-label"), "Frequency")
    assert.equal(outputBars.attributes.get("aria-label"), "Sorted Array")
    assert.equal(inputBand.dataset.section, "source")
    assert.equal(inputBars.children.length, 8)
    assert.equal(outputBars.children.length, 8)
    assert.match(source, /makeDistributionArrayBand/)
    assert.match(source, /el\("div", "steptrace__rail-label steptrace__distribution-label"\)/)
    assert.match(
      source,
      /makeDistributionArrayBand\(\n    "Unsorted Array",[\s\S]*first\.input\.length,\n  \)/,
    )
    assert.match(
      source,
      /makeDistributionArrayBand\(\n    "Sorted Array",[\s\S]*first\.input\.length,\n    "steptrace__distribution-bars--output",\n  \)/,
    )
    assert.match(source, /frame\.type === "tally" \? "increment" : "compare"/)
    assert.match(renderSource, /cue\.innerHTML = ICON\.compare \+ ICON\.swap/)
    assert.doesNotMatch(renderSource, /ICON\.increment|steptrace__cue-increment/)
    assert.match(
      barsSource,
      /\.steptrace__bar\[data-state="increment"\] \.steptrace__fill::before \{\n  content: "\+1";/,
    )
    assert.match(
      barsSource,
      /\.steptrace__bar\[data-state="candidate"\] \.steptrace__fill::before,\n\.steptrace__bar\[data-state="increment"\] \.steptrace__fill::before \{/,
    )
    assert.doesNotMatch(source, /End positions|Next write index|distribution-row--positions/)
    assert.match(
      styleSource,
      /\.steptrace__distribution-frequency \{[\s\S]*grid-auto-flow: column;[\s\S]*grid-auto-columns: minmax\(4\.8rem, 1fr\);[\s\S]*grid-template-rows: 1fr;[\s\S]*overflow-x: auto;[\s\S]*overflow-y: hidden;[\s\S]*border: 1px solid var\(--_distribution-border\);[\s\S]*border-radius: var\(--_distribution-radius\);[\s\S]*background: var\(--_distribution-cell\);/,
    )
    assert.doesNotMatch(styleSource, /\.steptrace__distribution-frequency \{[\s\S]*border-block:/)
    assert.doesNotMatch(styleSource, /grid-template-columns: repeat\(auto-fit/)
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket \{[\s\S]*grid-template-rows: 1fr 2fr;[\s\S]*min-height: 3\.9rem;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket \{\n  border-inline-end: 1px solid var\(--_distribution-border\);\n\}/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket:last-child \{\n  border-inline-end: 0;\n\}/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-entry--key \{\n  border-block-end: 1px solid var\(--_hair\);\n  background: var\(--_distribution-header\);/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-details \{[\s\S]*background: var\(--_distribution-cell\);/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket\[data-active="1"\]::after \{[\s\S]*box-shadow: inset 0 0 0 2px var\(--_blue\);/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket:first-child\[data-active="1"\]::after \{\n  border-start-start-radius: calc\(var\(--_distribution-radius\) - 1px\);\n  border-end-start-radius: calc\(var\(--_distribution-radius\) - 1px\);\n\}/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket:last-child\[data-active="1"\]::after \{\n  border-start-end-radius: calc\(var\(--_distribution-radius\) - 1px\);\n  border-end-end-radius: calc\(var\(--_distribution-radius\) - 1px\);\n\}/,
    )
    assert.doesNotMatch(
      styleSource,
      /\.steptrace__distribution-bucket\[data-active="1"\] \{\n  background:/,
    )
    assert.match(
      styleSource,
      /data-has-slots="0"\] \.steptrace__distribution-details \{\n  grid-template-rows: 1fr;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bars \.steptrace__bar \{\n  height: calc\(100% - 1\.3rem\);\n\}/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-band\[data-section="source"\] \{[\s\S]*padding-bottom: 0\.9rem;[\s\S]*\}\n\n\.steptrace__distribution-band\[data-section="source"\] \+ \.steptrace__distribution-band \{[\s\S]*padding-top: 0\.9rem;[\s\S]*border-top: 1px solid var\(--_hair\);/,
    )
    assert.match(
      styleSource,
      /\.steptrace\[data-visual-family="distribution-sort"\] \.steptrace__rail \{\n    min-block-size: 16rem;\n  \}/,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) and \(pointer: coarse\) \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*column-gap: 0\.5rem;[\s\S]*min-height: calc\(2 \* 2\.75rem\);/,
    )
    assert.doesNotMatch(
      styleSource,
      /@media \(max-width: 560px\) \{[\s\S]*\.steptrace__distribution \{\n    gap:/,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) \{[\s\S]*\.steptrace__distribution-frequency \{\n    grid-auto-columns: minmax\(3\.7rem, 1fr\);\n  \}/,
    )

    const tally = result.frames.find((frame) => frame.type === "tally" && frame.activeInput === 0)
    view.paint(tally, 1, result.frames.length)
    assert.equal(inputBars.children[0].dataset.state, "increment")
    assert.doesNotMatch(inputBars.children[0].children[0].children[2].innerHTML, /cue-increment/)
    assert.equal(frequency.children[2].dataset.active, "1")
    assert.equal(frequency.children[2].children[0].children[0].textContent, "Value:")
    assert.equal(frequency.children[2].children[0].children[1].textContent, "2")
    assert.equal(frequency.children[2].children[1].children[0].children[0].textContent, "Count:")
    assert.equal(frequency.children[2].children[1].children[0].children[1].textContent, "1")
    assert.equal(frequency.children[2].dataset.hasSlots, "0")
    assert.equal(frequency.children[2].attributes.get("aria-label"), "value 2, count 1")

    const prefix = result.frames.find((frame) => frame.type === "prefix" && frame.activeKey === 3)
    view.paint(prefix, 0, result.frames.length)
    assert.equal(frequency.children[3].dataset.active, "1")
    assert.equal(frequency.children[2].dataset.previous, "1")
    assert.equal(frequency.children[3].children[1].children[1].children[0].textContent, "Slots:")
    assert.equal(frequency.children[3].children[1].children[1].children[1].textContent, "4–6")
    assert.equal(frequency.children[3].dataset.hasSlots, "1")

    const place = result.frames.find((frame) => frame.type === "place")
    view.paint(place, 0, result.frames.length)
    assert.equal(inputBars.children[place.activeInput].dataset.state, "compare")
    assert.equal(frequency.children[place.activeKey].dataset.placement, "1")
    assert.equal(outputBars.children[place.placedAt].dataset.state, "sorted")
    assert.equal(outputBars.children[place.placedAt].dataset.target, "1")

    const zeroPlacement = result.frames.find(
      (frame) => frame.type === "place" && frame.output[frame.placedAt] === 0,
    )
    view.paint(zeroPlacement, 0, result.frames.length)
    assert.equal(outputBars.children[zeroPlacement.placedAt].dataset.empty, "0")
    assert.match(outputBars.children[zeroPlacement.placedAt].children[0].style.height, /^calc\(/)
    assert.equal(
      outputBars.children.find((bar) => bar.dataset.empty === "1").children[0].style.height,
      "0",
    )
    assert.match(
      styleSource,
      /\[data-empty="1"\] \.steptrace__fill \{\n  min-height: 0;\n  opacity: 0;/,
    )

    view.paint(result.frames.at(-1), result.frames.length - 1, result.frames.length)
    assert.deepEqual(
      outputBars.children.map((bar) => bar.children[1].textContent),
      ["0a", "0b", "2a", "2b", "3a", "3b", "3c", "5"],
    )
    assert.equal(frequency.children[1].children[1].children[1].children[1].textContent, "—")
  } finally {
    globalThis.document = previousDocument
  }
})

test("radix and bucket sorts share one stable bucket-board renderer", () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this._textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = { setProperty: (key, value) => this.attributes.set(`style:${key}`, value) }
      this.className = ""
      this.title = ""
    }
    get textContent() {
      return this._textContent
    }
    set textContent(value) {
      this._textContent = value
      if (value === "") this.children = []
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
    createTextNode: (value) => {
      const node = new FakeNode("#text")
      node.textContent = value
      return node
    },
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    const { makeBucketDistributionView } = loadStepTraceModule(
      "src",
      "families",
      "bucket-distribution.ts",
    )
    const styleSource = readFileSync(join(here, "src", "styles", "distribution.scss"), "utf8")
    const radix = api.buildFrames({
      algorithm: "radix-sort",
      array: [170, 45, 75, 90, 802, 24, 2, 66],
      radix: 10,
      mode: "LSD",
    })
    const radixView = makeBucketDistributionView(radix.frames)
    const [radixStage, legend] = radixView.nodes
    const [sourceBand, bucketBand, outputBand] = radixStage.children
    const [sourceLabel, sourceBars] = sourceBand.children
    const [bucketLabel, board] = bucketBand.children
    const [outputLabel, outputBars] = outputBand.children

    assert.equal(radixView.stageLayout, "fill")
    assert.equal(radixView.stableStage, true)
    assert.deepEqual(
      [sourceLabel.textContent, bucketLabel.textContent, outputLabel.textContent],
      ["Current Array", "Digit Buckets", "Gathered Pass"],
    )
    assert.equal(
      sourceLabel.attributes.get("aria-description"),
      "Each digit pass starts from the order gathered by the previous pass.",
    )
    assert.equal(sourceLabel.title, "")
    assert.equal(sourceBars.children.length, 8)
    assert.equal(sourceBand.dataset.section, "source")
    assert.equal(board.children.length, 10)
    assert.equal(radixStage.dataset.profile, "radix")
    assert.equal(board.attributes.get("style:--_bucket-count"), "10")
    assert.equal(outputBars.children.length, 8)
    assert.equal(legend.attributes.get("aria-label"), "Distribution state legend")
    assert.equal(legend.className, "steptrace__legend steptrace__distribution-legend")
    assert.ok(legend.children.every((row) => row.className === "steptrace__legend-row"))

    const firstScatter = radix.frames.find(
      (frame) => frame.type === "scatter" && frame.passIndex === 0,
    )
    radixView.paint(firstScatter, 2, radix.frames.length)
    assert.equal(sourceBars.children[0].dataset.state, "scatter")
    assert.equal(board.children[0].dataset.active, "1")
    assert.equal(board.children[0].children[1].children[0].textContent, "170")
    assert.ok(radixView.watch(firstScatter).every((row) => row.hint))

    radixView.paint(radix.frames.at(-1), radix.frames.length - 1, radix.frames.length)
    assert.equal(board.children[0].children[1].children.length, 6)
    assert.equal(board.children[0].children[1].attributes.get("style:--_bucket-columns"), "2")

    const bucket = api.buildFrames({
      algorithm: "bucket-sort",
      array: [0.78, 0.17, 0.39, 0.26, 0.72, 0.94],
      bucketCount: 5,
    })
    const bucketView = makeBucketDistributionView(bucket.frames)
    const [bucketStage, bucketLegend] = bucketView.nodes
    const [bucketSourceBand, rangeBand, sortedBand] = bucketStage.children
    assert.match(bucketStage.className, /\bsteptrace__distribution--buckets\b/)
    assert.equal(bucketSourceBand.dataset.section, "source")
    assert.equal(rangeBand.children[0].textContent, "Range Buckets")
    assert.equal(rangeBand.children[1].children.length, 5)
    assert.equal(sortedBand.children[0].textContent, "Sorted Array")
    assert.equal(bucketLegend.className, "steptrace__legend steptrace__distribution-legend")

    assert.match(
      styleSource,
      /\.steptrace__distribution \{[\s\S]*gap: clamp\(0\.3rem, 0\.8vh, 0\.45rem\);[\s\S]*padding: 0\.05rem 0;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-band \{[\s\S]*grid-template-columns: 1fr;[\s\S]*gap: 0;/,
    )
    assert.doesNotMatch(
      styleSource,
      /\.steptrace__distribution-band \{[^}]*grid-template-columns: minmax\(/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bars \{[\s\S]*height: clamp\(4\.6rem, 16vh, 6\.5rem\);/,
    )
    assert.doesNotMatch(styleSource, /\.steptrace__distribution-bars \.steptrace__num/)
    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket-board \{[\s\S]*grid-template-columns: repeat\(\s*var\(--_bucket-count, 1\),\s*minmax\(0, 1fr\)\s*\);[\s\S]*block-size: clamp\(7rem, 17vh, 8\.5rem\);[\s\S]*overflow: hidden;[\s\S]*border: 1px solid var\(--_distribution-border\);[\s\S]*border-radius: var\(--_distribution-radius\);/,
    )
    assert.doesNotMatch(styleSource, /grid-auto-columns: minmax\(4\.6rem, 1fr\)/)
    assert.match(
      styleSource,
      /\.steptrace__distribution-lane \{[\s\S]*border-inline-end: 1px solid var\(--_distribution-border\);/,
    )
    assert.doesNotMatch(styleSource, /\.steptrace__distribution-lane \{[^}]*border-radius:/)
    assert.match(
      styleSource,
      /\.steptrace__distribution-lane-body \{[\s\S]*grid-template-columns: repeat\(\s*var\(--_bucket-columns, 1\),\s*minmax\(0, 1fr\)\s*\);[\s\S]*overflow: hidden;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-bars \.steptrace__bar \{[\s\S]*pointer-events: none;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution\[data-profile="radix"\] \{[\s\S]*?grid-template-rows: minmax\(0, 1fr\) auto auto;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution\[data-profile="radix"\] \.steptrace__distribution-band:first-child \{[\s\S]*?grid-template-rows: auto minmax\(0, 1fr\);[\s\S]*?row-gap: 0\.5rem;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-band\[data-section="source"\] \{[\s\S]*padding-bottom: 0\.9rem;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution\[data-profile="radix"\]\s+\.steptrace__distribution-band:first-child\s+\.steptrace__distribution-bars \{[\s\S]*?min-block-size: 0;[\s\S]*?overflow: hidden;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution\[data-profile="radix"\] \.steptrace__distribution-band:nth-child\(3\) \{[\s\S]*?padding-top: 0\.9rem;[\s\S]*?border-top: 1px solid var\(--_hair\);/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution\[data-profile="radix"\] \.steptrace__distribution-band:nth-child\(2\) \{[\s\S]*?padding-bottom: 0\.9rem;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution--buckets\[data-profile="bucket"\] \{[^}]*grid-template-rows: repeat\(3, minmax\(0, 1fr\)\);[^}]*overflow: hidden;/s,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution--buckets\[data-profile="bucket"\][\s\S]*?\.steptrace__distribution-bars,[\s\S]*?\.steptrace__distribution--buckets\[data-profile="bucket"\][\s\S]*?\.steptrace__distribution-bucket-board \{[^}]*block-size: 100%;[^}]*min-block-size: 0;[^}]*overflow: hidden;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution--buckets\[data-profile="bucket"\][\s\S]*?\.steptrace__distribution-band:nth-child\(3\) \{[^}]*padding-top: 0\.9rem;[^}]*border-top: 1px solid var\(--_hair\);/s,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) \{[\s\S]*?\.steptrace__distribution--buckets\[data-profile="bucket"\] \{[^}]*block-size: 27\.75rem;/,
    )
    assert.match(
      styleSource,
      /\.steptrace__distribution-lane:first-child\[data-active="1"\]::after \{[\s\S]*border-start-start-radius:/,
    )
    assert.match(
      styleSource,
      /@container steptrace-distribution \(max-width: 50rem\) \{[\s\S]*\.steptrace__distribution\[data-profile="radix"\] \.steptrace__distribution-bucket-board \{[\s\S]*grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);[\s\S]*grid-template-rows: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*block-size: 9\.25rem;/,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) \{[\s\S]*\.steptrace__distribution\[data-profile="radix"\] \.steptrace__distribution-bucket-board \{[\s\S]*block-size: 8rem;/,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) \{[\s\S]*\.steptrace__distribution\[data-profile="radix"\] \.steptrace__distribution-bars--output \{[\s\S]*height: 4\.75rem;/,
    )
    assert.match(
      styleSource,
      /@container steptrace-distribution \(max-width: 50rem\) \{[\s\S]*\.steptrace__distribution\[data-profile="radix"\][\s\S]*\.steptrace__distribution-lane-body \{[\s\S]*grid-template-columns: repeat\(\s*var\(--_bucket-columns, 1\),\s*minmax\(0, 1fr\)\s*\);[\s\S]*grid-auto-rows: minmax\(0, 1fr\);[\s\S]*overflow: hidden;/,
    )
    assert.doesNotMatch(
      styleSource,
      /steptrace__distribution-legend-(?:item|swatch)|\.steptrace__distribution-legend \{/,
    )
  } finally {
    globalThis.document = previousDocument
  }
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
    const [ring, surface, label, detail, result, badge] = firstCard.children

    view.paint(frames[0], 0, frames.length)
    assert.equal(svg.children.length, 2 + 6 + 7)
    assert.equal(svg.attributes.get("role"), "img")
    assert.match(svg.attributes.get("aria-labelledby"), /title.*description/)
    assert.equal(wrap.attributes.get("role"), "region")
    assert.equal(wrap.tabIndex, 0)
    assert.equal(legend.children.length, 4)
    assert.equal(svg.attributes.get("viewBox"), "0 0 604 218")
    assert.equal(svg.attributes.get("style:--steptrace-tree-width"), "604px")
    assert.equal(surface.attributes.get("rx"), "7")
    assert.equal(ring.attributes.get("rx"), "9")
    assert.equal(surface.attributes.get("width"), "136")
    assert.equal(ring.attributes.get("width"), "140")
    assert.equal(label.attributes.get("y"), "-4")
    assert.equal(detail.attributes.get("y"), "9")
    assert.equal(result.textContent, "")
    assert.equal(badge.textContent, "")
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
      svg.children.find((node) => node.tagName === "g").children[3].textContent,
      "Final solution",
    )
    assert.equal(svg.children.find((node) => node.tagName === "g").children[4].textContent, "")
  } finally {
    globalThis.document = previousDocument
  }
})

test("execution-tree watch, legend, and responsive styles remain compatible", () => {
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
  assert.equal(executionTreeViewDescriptor.nodeWidth, 136)
  assert.equal(executionTreeViewDescriptor.nodeHeight, 50)
  assert.equal(executionTreeViewDescriptor.minSvgWidth, 500)
  assert.equal(executionTreeViewDescriptor.canvasScale, 1)
  assert.equal(executionTreeViewDescriptor.fitWidth, true)
  assert.equal(executionTreeViewDescriptor.responsiveLayout, true)
  assert.equal(executionTreeViewDescriptor.tieredLayout, true)
  assert.match(mountSource, /root\.dataset\.visualFamily = built\.family\.id/)
  assert.match(mountSource, /const stageLegend = nodes\.at\(-1\)/)
  assert.match(mountSource, /"steptrace__stage-col--legend"/)
  assert.match(
    sharedStyles,
    /\.steptrace:is\([\s\S]*?\[data-visual-family="monotone-boundary"\][\s\S]*?\)\s*\{\s*container: steptrace-wide-stage \/ inline-size;/,
  )
  assert.match(
    sharedStyles,
    /@container steptrace-wide-stage \(max-width: 35rem\)[\s\S]*?\[data-visual-family="monotone-boundary"\][\s\S]*?\.steptrace__body\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/,
  )
  const wideStageFamilies = sharedStyles.match(
    /\.steptrace:is\(([^)]*)\)\s*\{\s*container: steptrace-wide-stage \/ inline-size;/,
  )
  assert.ok(wideStageFamilies)
  assert.match(wideStageFamilies[1], /execution-tree/)
  assert.match(styles, /\.steptrace \.steptrace__rectree/)
  assert.match(styles, /\.steptrace \.steptrace__rectree \{[^}]*overflow: hidden;/s)
  assert.doesNotMatch(styles, /overflow-x:\s*(?:auto|scroll)/)
  assert.match(styles, /place-items: center/)
  assert.match(styles, /inline-size: min\(100%, var\(--steptrace-tree-width, 100%\)\)/)
  assert.match(styles, /min-inline-size: 0/)
  assert.match(styles, /container: steptrace-execution-tree \/ inline-size/)
  assert.match(styles, /@container steptrace-execution-tree \(max-width: 36rem\)/)
  assert.match(renderSource, /function responsiveTreeLayout\(availableWidth\)/)
  assert.match(
    renderSource,
    /wrap\.dataset\.compact = layout === desktopLayout \? "false" : "true"/,
  )
  assert.match(renderSource, /matchMedia\("\(max-width: 560px\)"\)\.matches/)
  assert.match(renderSource, /new ResizeObserver\(applyTreeLayout\)/)
  assert.match(styles, /\.steptrace \.steptrace__rtsvg text/)
  assert.match(styles, /\.steptrace__rtlabel[^}]*font: 600 12px\/1 var\(--_font-mono\);/s)
  assert.match(styles, /\.steptrace__rtdetail[^}]*font: 400 10\.5px\/1 var\(--_font-mono\);/s)
  assert.match(styles, /\[data-shape="card"\] \.steptrace__rtval/)
  assert.doesNotMatch(styles, /\.steptrace__rectree \+ \.steptrace__legend/)
  assert.match(
    sharedStyles,
    /\.steptrace__stage-col > \.steptrace__legend,[\s\S]*?margin-top: 0\.9rem;/,
  )
  assert.match(
    sharedStyles,
    /\.steptrace__stage-col--legend\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\) auto;/s,
  )
  assert.match(styles, /\.steptrace__rtbadge[^}]*font: 600 7px\/1 var\(--_font-head\);/s)
  assert.doesNotMatch(styles, /glow|drop-shadow/)
  assert.match(renderSource, /svg\.setAttribute\("aria-labelledby"/)
  assert.match(renderSource, /group\.setAttribute\("focusable", "false"\)/)
  assert.match(renderSource, /stageLayout: "fill"/)
})

test("merge-sort execution tree reveals every leaf before merging bottom-up left-to-right", () => {
  const { config, family, frames } = buildMergeSortTree()
  const firstCombine = frames.findIndex((frame) => frame.type === "combine")
  const splits = frames.filter((frame) => frame.type === "split")
  const leaves = frames.filter((frame) => frame.type === "base")
  const combines = frames.filter((frame) => frame.type === "combine")

  assert.deepEqual(config, {
    array: [8, 3, 7, 4, 9, 2, 5, 1],
    profile: "merge-sort",
  })
  assert.equal(family.id, "execution-tree")
  assert.deepEqual(frames[0].visible, ["root"])
  for (const split of splits) {
    const previous = frames[frames.indexOf(split) - 1]
    const newlyVisible = split.visible.filter((id) => !previous.visible.includes(id))
    assert.equal(newlyVisible.length, 2)
  }
  assert.equal(leaves.length, 8)
  assert.ok(leaves.every((frame) => frames.indexOf(frame) < firstCombine))
  assert.deepEqual(
    combines.map((frame) => frame.results[frame.active].length),
    [2, 2, 2, 2, 4, 4, 8],
  )
  assert.deepEqual(combines.at(-1).results.root, [1, 2, 3, 4, 5, 7, 8, 9])
  assert.deepEqual(frames.at(-1).results.root, [1, 2, 3, 4, 5, 7, 8, 9])
  assert.ok(frames.every((frame) => frame.nodes === frames[0].nodes))
  assert.ok(frames.every((frame) => frame.edges === frames[0].edges))
})

test("merge-sort execution tree uses fluid array-strip cards and merge emphasis", () => {
  const { executionTreeViewDescriptor, mergeSortTreeViewDescriptor } = loadStepTraceModule(
    "src",
    "families",
    "execution-tree.ts",
  )
  const { centerVisibleTree, tieredArrayCells } = loadStepTraceModule("src", "render.ts")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "rectree.scss"), "utf8")
  const { frames } = buildMergeSortTree()
  const root = frames[0].nodes.find((node) => node.id === "root")
  const leaf = frames[0].nodes.find((node) => node.values.length === 1)

  assert.equal(mergeSortTreeViewDescriptor.fitWidth, true)
  assert.equal(mergeSortTreeViewDescriptor.tieredCards, true)
  assert.equal(mergeSortTreeViewDescriptor.centerVisible, true)
  assert.ok(root.width > 84)
  assert.ok(leaf.width < 84)
  assert.ok(root.width >= "[8, 3, 7, 4, 9, 2, 5, 1]".length * 6.2 + 28)
  assert.match(renderSource, /node\.width \|\| descriptor\.nodeWidth/)
  assert.match(renderSource, /dataset\.related/)
  assert.match(renderSource, /"steptrace__rtdivider"/)
  assert.match(renderSource, /"steptrace__rtcell-separator"/)
  assert.match(renderSource, /"steptrace__rtcell-value"/)
  assert.match(renderSource, /label\.setAttribute\("y", "13"\)/)
  assert.match(renderSource, /label\.setAttribute\("dominant-baseline", "central"\)/)
  assert.match(renderSource, /treeLayer\.style\.transform = centerTransform\(model\.visible\)/)
  assert.equal(executionTreeViewDescriptor.tieredCards, undefined)
  assert.equal(executionTreeViewDescriptor.centerVisible, undefined)
  const frameRects = (frame) =>
    frames[0].nodes
      .filter((node) => frame.visible.includes(node.id))
      .map((node) => ({
        left: node.x - node.width / 2,
        right: node.x + node.width / 2,
        top: node.y - 20,
        bottom: node.y + 20,
      }))
  const rootOffset = centerVisibleTree(frameRects(frames[0]), 500, 320)
  const firstSplitOffset = centerVisibleTree(frameRects(frames[1]), 500, 320)
  const deeperSplitOffset = centerVisibleTree(frameRects(frames[3]), 500, 320)
  assert.ok(rootOffset.y > firstSplitOffset.y)
  assert.ok(firstSplitOffset.y > deeperSplitOffset.y)
  const tier = tieredArrayCells([8, 3, 7, 4], 112)
  assert.equal(tier.cells.length, 4)
  assert.equal(tier.separators.length, 3)
  assert.deepEqual(
    tier.cells.map((cell) => cell.x),
    [-42, -14, 14, 42],
  )
  assert.deepEqual(tier.separators, [-28, 0, 28])
  assert.match(
    styles,
    /\[data-profile="merge-sort"\][\s\S]*:is\(\.steptrace__rtedge, \.steptrace__rtnode\)\[data-vis="0"\][^}]*opacity: 0;[^}]*visibility: hidden;/,
  )
  assert.match(styles, /\.steptrace__rtdivider[^}]*stroke: var\(--_hair\);/)
  assert.match(
    styles,
    /\.steptrace__rtcell-separator[^}]*stroke: color-mix\(in srgb, var\(--_text\) 13%, transparent\);/,
  )
  assert.match(
    styles,
    /\.steptrace__rtcell-value[^}]*fill: var\(--_text\);[^}]*font: 500 11px\/1 var\(--_font-mono\);/,
  )
  assert.match(
    styles,
    /\.steptrace__rtcontent[^}]*transition: transform var\(--_dur-move\) var\(--_spring-soft\);/,
  )
  assert.match(
    styles,
    /\[data-profile="merge-sort"\][\s\S]*\.steptrace__rtlabel[^}]*fill: var\(--_muted\);[^}]*font: 400 9px\/1 var\(--_font-mono\);/,
  )
  assert.match(styles, /\[data-profile="merge-sort"\][\s\S]*\[data-related="true"\]/)
  assert.match(styles, /stroke: var\(--_green\)/)
})

test("memoization reuses the execution-tree family and collapses a repeated state", () => {
  const { parseMemoizationConfig, memoizationTreeViewDescriptor } = loadStepTraceModule(
    "src",
    "families",
    "execution-tree.ts",
  )
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const result = buildAbstractMemoization()
  const frames = result.frames
  const storedD = frames.find((frame) => frame.type === "store" && frame.active === "d1")
  const storedE = frames.find((frame) => frame.type === "store" && frame.active === "e")
  const reusedD = frames.find((frame) => frame.type === "cache" && frame.active === "d2")
  const reusedE = frames.find((frame) => frame.type === "cache" && frame.active === "e2")
  const final = frames.at(-1)
  const nodes = Object.fromEntries(frames[0].nodes.map((node) => [node.id, node]))

  assert.deepEqual(result.config, { profile: "memoization" })
  assert.equal(result.family.id, "execution-tree")
  assert.throws(
    () => parseMemoizationConfig({ algorithm: "memoization", n: 5 }),
    /takes no data input/,
  )
  assert.ok(frames.every((frame) => frame.nodes === frames[0].nodes))
  assert.ok(frames.every((frame) => frame.edges === frames[0].edges))
  assert.deepEqual(storedD.cache, [{ key: "D", result: "result D" }])
  assert.deepEqual(storedE.cache, [
    { key: "D", result: "result D" },
    { key: "E", result: "result E" },
  ])
  assert.ok(frames.indexOf(storedE) < frames.indexOf(reusedE))
  assert.deepEqual(reusedD.collapsed, ["g2", "h2"])
  assert.equal(reusedD.states.d2, "cache")
  assert.equal(reusedD.results.d2, "result D")
  assert.equal(reusedD.cache.filter((entry) => entry.key === "D").length, 1)
  assert.deepEqual(reusedE.collapsed, ["g2", "h2"])
  assert.equal(reusedE.states.e2, "cache")
  assert.equal(reusedE.results.e2, "result E")
  assert.ok(reusedE.cache.some((entry) => entry.key === "E"))
  assert.equal(final.calls, 9)
  assert.equal(final.pruned, 2)
  assert.equal(final.results.a, "result A")
  assert.ok(nodes.h1.x > nodes.g1.x)
  assert.ok(nodes.h2.x > nodes.g2.x)
  assert.equal(memoizationTreeViewDescriptor.nodeWidth, 136)
  assert.equal(memoizationTreeViewDescriptor.nodeHeight, 50)
  assert.equal(memoizationTreeViewDescriptor.minSvgWidth, 500)
  assert.equal(memoizationTreeViewDescriptor.canvasScale, 1)
  assert.equal(memoizationTreeViewDescriptor.fitWidth, true)
  assert.equal(memoizationTreeViewDescriptor.responsiveLayout, true)
  assert.equal(memoizationTreeViewDescriptor.tieredLayout, true)
  assert.deepEqual(
    memoizationTreeViewDescriptor.legend.map((item) => item.state),
    ["split", "base", "store", "cache"],
  )
  assert.deepEqual(
    memoizationTreeViewDescriptor.watchRows(reusedD).map((row) => row.k),
    ["phase", "state", "cache", "work"],
  )
  assert.deepEqual(
    buildMilestones("memoization", "rectree", frames).map((mark) => mark.label),
    [
      "Empty cache",
      "Split solve(A)",
      "Split solve(B)",
      "Split solve(D)",
      "Combine solve(D)",
      "Store solve(D)",
      "Store solve(E)",
      "Combine solve(B)",
      "Store solve(B)",
      "Split solve(C)",
      "Reuse solve(D)",
      "Reuse solve(E)",
      "Combine solve(C)",
      "Store solve(C)",
      "Combine solve(A)",
      "Store solve(A)",
      "Result",
    ],
  )
  assert.equal(
    summaryFor("memoization", "rectree", final),
    "Result A · 9 calls · 2 recursive calls skipped.",
  )
})

test("branch-and-bound uses the execution-tree family for one fixed fractional-bound trace", () => {
  const { parseBranchAndBoundConfig, branchAndBoundTreeViewDescriptor } = loadStepTraceModule(
    "src",
    "families",
    "execution-tree.ts",
  )
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const result = buildBranchAndBound()
  const { frames } = result
  const incumbents = frames
    .filter((frame) => frame.type === "incumbent")
    .map((frame) => frame.incumbent)
  const final = frames.at(-1)
  const skipC = frames.find((frame) => frame.type === "prune" && frame.active === "ac-")
  const skipA = frames.find((frame) => frame.type === "prune" && frame.active === "a-")

  assert.deepEqual(result.config, { profile: "branch-and-bound" })
  assert.equal(result.family.id, "execution-tree")
  assert.throws(
    () => parseBranchAndBoundConfig({ algorithm: "branch-and-bound", array: [1] }),
    /fixed knapsack trace/,
  )
  assert.deepEqual(incumbents, [40, 90, 105])
  assert.equal(frames[0].nodes.find((node) => node.id === "root").bound, 116)
  assert.equal(skipC.nodes.find((node) => node.id === "ac-").bound, 75)
  assert.equal(skipA.nodes.find((node) => node.id === "a-").bound, 102)
  assert.equal(skipA.incumbent, 105)
  assert.ok(skipA.message.includes("102 ≤ incumbent 105"))
  assert.deepEqual(skipC.collapsed, ["abc+", "abcd+", "abcd-", "acd+", "acd-", "ac-"])
  assert.ok(!skipC.visible.some((id) => id.startsWith("ac-d")))
  assert.ok(!skipA.visible.some((id) => id.startsWith("a-b")))
  assert.equal(final.incumbent, 105)
  assert.equal(final.pruned, 7)
  assert.ok(frames.every((frame) => frame.nodes === frames[0].nodes))
  assert.ok(frames.every((frame) => frame.edges === frames[0].edges))
  assert.deepEqual(
    branchAndBoundTreeViewDescriptor.watchRows(skipA).map((row) => row.k),
    ["decision", "load", "upper bound", "incumbent"],
  )
  assert.deepEqual(
    branchAndBoundTreeViewDescriptor.legend.map((item) => item.state),
    ["split", "incumbent", "infeasible", "prune"],
  )
  assert.equal(branchAndBoundTreeViewDescriptor.nodeWidth, 136)
  assert.equal(branchAndBoundTreeViewDescriptor.nodeHeight, 50)
  assert.equal(branchAndBoundTreeViewDescriptor.minSvgWidth, 500)
  assert.equal(branchAndBoundTreeViewDescriptor.fitWidth, true)
  assert.equal(branchAndBoundTreeViewDescriptor.responsiveLayout, true)
  assert.equal(branchAndBoundTreeViewDescriptor.tieredLayout, true)
  assert.equal(branchAndBoundTreeViewDescriptor.stableStage, true)
  assert.equal(branchAndBoundTreeViewDescriptor.preserveDetail, true)
  assert.equal(branchAndBoundTreeViewDescriptor.showStateBadge, true)
  assert.deepEqual(
    buildMilestones("branch-and-bound", "rectree", frames)
      .filter((mark) => /^(Root|Incumbent|Prune|Best)/.test(mark.label))
      .map((mark) => mark.label),
    [
      "Root bound 116",
      "Incumbent 40",
      "Incumbent 90",
      "Prune skip D",
      "Incumbent 105",
      "Prune skip D",
      "Prune skip C",
      "Prune skip A",
      "Best value 105",
    ],
  )
  assert.equal(
    summaryFor("branch-and-bound", "rectree", final),
    "Best value 105 · take A + C · weight 7/7 · 7 branches pruned.",
  )
})

test("branch-and-bound keeps D&C and memoization sizing while adding opt-in prune treatment", () => {
  const {
    executionTreeViewDescriptor,
    memoizationTreeViewDescriptor,
    branchAndBoundTreeViewDescriptor,
  } = loadStepTraceModule("src", "families", "execution-tree.ts")
  const render = readFileSync(join(here, "src", "render.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "rectree.scss"), "utf8")

  assert.deepEqual(
    [executionTreeViewDescriptor.nodeWidth, executionTreeViewDescriptor.nodeHeight],
    [136, 50],
  )
  assert.deepEqual(
    [memoizationTreeViewDescriptor.nodeWidth, memoizationTreeViewDescriptor.nodeHeight],
    [136, 50],
  )
  assert.equal(executionTreeViewDescriptor.stableStage, undefined)
  assert.equal(memoizationTreeViewDescriptor.stableStage, undefined)
  assert.match(render, /stableStage: descriptor\.stableStage/)
  assert.match(render, /descriptor\.preserveDetail/)
  assert.match(render, /descriptor\.showStateBadge/)
  assert.match(styles, /\.steptrace \.steptrace__rectree\s*\{[^}]*overflow: hidden;/s)
  assert.doesNotMatch(styles, /overflow-x:\s*(?:auto|scroll)/)
  assert.equal(branchAndBoundTreeViewDescriptor.responsiveLayout, true)
  assert.equal(branchAndBoundTreeViewDescriptor.tieredLayout, true)
  assert.match(
    styles,
    /\[data-profile="branch-and-bound"\][\s\S]*?\.steptrace__rtdetail\s*\{[^}]*font-size: 9\.5px;/,
  )
  assert.match(
    styles,
    /\[data-profile="branch-and-bound"\][\s\S]*:is\(\.steptrace__rtedge, \.steptrace__rtnode\)\[data-vis="0"\][^}]*opacity: 0;[^}]*visibility: hidden;/,
  )
  const nodes = buildBranchAndBound().frames[0].nodes
  for (const depth of new Set(nodes.map((node) => node.depth))) {
    const tier = nodes
      .filter((node) => node.depth === depth)
      .sort((left, right) => left.x - right.x)
    for (let index = 1; index < tier.length; index++)
      assert.ok(
        tier[index].x - tier[index - 1].x >= branchAndBoundTreeViewDescriptor.nodeWidth + 6,
        `depth ${depth}: ${tier[index - 1].id} overlaps ${tier[index].id}`,
      )
  }
  assert.ok(
    branchAndBoundTreeViewDescriptor
      .watchRows(buildBranchAndBound().frames[0])
      .every((row) => row.hint),
  )
})

test("coin change keeps the same counterexample across real-world and canonical views", () => {
  const { summaryFor } = loadStepTraceModule("src", "render.ts")
  const greedy = buildDynamicProgramming("coinChangeGreedy")
  const naive = buildDynamicProgramming("coinChangeNaive")
  const memoization = buildDynamicProgramming("coinChangeMemoization")
  const tabulation = buildDynamicProgramming("coinChangeTabulation")
  const topDown = buildDynamicProgramming("coinChangeTopDown")
  const bottomUp = buildDynamicProgramming("coinChangeBottomUp")
  const repeated = topDown.frames.find((frame) => frame.type === "cache")
  const finalTable = bottomUp.frames.at(-1)

  assert.deepEqual(greedy.config, {
    profile: "dp-story",
    problem: "coin-change",
    approach: "greedy",
  })
  assert.equal(greedy.family.id, "dp-story")
  assert.deepEqual(greedy.frames[0].coins, [50, 25, 10, 1])
  assert.equal("unavailableCoins" in greedy.frames[0], false)
  assert.equal(greedy.frames.at(-1).best, "3 coins (10¢ + 10¢ + 10¢)")
  assert.ok(
    naive.frames.some((frame) => frame.attempts.some((attempt) => attempt.state === "repeated")),
  )
  assert.ok(
    memoization.frames.some((frame) =>
      frame.memo.some((entry) => entry.key === "change(19¢)" && entry.state === "hit"),
    ),
  )
  assert.deepEqual(tabulation.frames.at(-2).amountValues, [0, 1, 2, 3, 4, 5, 1, 6, 2, 1, 3])
  assert.deepEqual(tabulation.frames.at(-2).amountPath, [0, 10, 20, 30])
  assert.equal(
    summaryFor("coin-change-memoization", "dp", memoization.frames.at(-1)),
    "3 coins (10¢ + 10¢ + 10¢) · target 30¢.",
  )
  assert.equal(
    summaryFor("coin-change-tabulation", "dp", tabulation.frames.at(-1)),
    "3 coins (10¢ + 10¢ + 10¢) · target 30¢.",
  )
  assert.deepEqual(topDown.config, { profile: "coin-change-top-down" })
  assert.equal(topDown.family.id, "execution-tree")
  assert.equal(repeated.active, "c19b")
  assert.deepEqual(repeated.collapsed, ["c9", "c18"])
  assert.equal(repeated.results.c19b, "10 coins")
  assert.equal(
    topDown.frames.find((frame) => frame.active === "c28" && frame.type === "return").states.c28,
    "return",
  )
  assert.deepEqual(bottomUp.config, { profile: "coin-change-bottom-up" })
  assert.equal(bottomUp.family.id, "matrix-grid")
  assert.deepEqual(finalTable.grid[0], ["0", "1", "2", "3", "4", "5", "1", "6", "2", "1", "3"])
  assert.deepEqual(finalTable.path, [
    [0, 0],
    [0, 6],
    [0, 8],
    [0, 10],
  ])

  assert.deepEqual(
    greedy.frames
      .map((frame) => frame.selected.length)
      .filter((count, index, counts) => count > 0 && count !== counts[index - 1]),
    [1, 2, 3, 4, 5, 6],
  )
  assert.ok(
    naive.frames.some(
      (frame) =>
        frame.remaining === 30 &&
        frame.selected.length === 0 &&
        frame.message.startsWith("Backtrack"),
    ),
  )
  assert.ok(
    memoization.frames.some(
      (frame) =>
        frame.remaining === 30 &&
        frame.selected.length === 0 &&
        frame.message.startsWith("Backtrack"),
    ),
  )
})

test("grid path keeps the warehouse costs across real-world and canonical views", () => {
  const { summaryFor } = loadStepTraceModule("src", "render.ts")
  const greedy = buildDynamicProgramming("gridPathGreedy")
  const naive = buildDynamicProgramming("gridPathNaive")
  const memoization = buildDynamicProgramming("gridPathMemoization")
  const tabulation = buildDynamicProgramming("gridPathTabulation")
  const topDown = buildDynamicProgramming("gridPathTopDown")
  const bottomUp = buildDynamicProgramming("gridPathBottomUp")
  const repeated = topDown.frames.find((frame) => frame.type === "cache")
  const finalTable = bottomUp.frames.at(-1)

  assert.equal(greedy.frames.at(-1).bestCost, 10)
  assert.equal(greedy.frames.at(-1).routeCost, 10)
  assert.ok(
    naive.frames.some((frame) => frame.repeated.some(([row, column]) => row === 1 && column === 1)),
  )
  assert.ok(
    memoization.frames.some((frame) =>
      frame.repeated.some(([row, column]) => row === 1 && column === 1),
    ),
  )
  assert.deepEqual(tabulation.frames.at(-2).gridValues, [
    [10, 14, 13, 27],
    [10, 15, 12, 18],
    [8, 6, 11, 9],
    [13, 4, 2, 0],
  ])
  assert.equal(
    summaryFor("grid-path-memoization", "dp", memoization.frames.at(-1)),
    "Minimum warehouse route cost 10.",
  )
  assert.equal(
    summaryFor("grid-path-tabulation", "dp", tabulation.frames.at(-1)),
    "Minimum warehouse route cost 10.",
  )
  assert.deepEqual(topDown.config, { profile: "grid-path-top-down" })
  assert.equal(repeated.active, "r2c2b")
  assert.deepEqual(repeated.collapsed, ["r2c3a", "r3c2a"])
  assert.equal(repeated.results.r2c2b, "15")
  assert.ok(
    ["r1c3", "r3c1"].every((id) =>
      topDown.frames.some(
        (frame) => frame.active === id && frame.type === "return" && frame.states[id] === "return",
      ),
    ),
  )
  assert.deepEqual(finalTable.grid, [
    ["10", "14", "13", "27"],
    ["10", "15", "12", "18"],
    ["8", "6", "11", "9"],
    ["13", "4", "2", "0"],
  ])
  assert.deepEqual(finalTable.path, [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
    [3, 2],
    [3, 3],
  ])

  const naiveCoordinates = naive.frames
    .filter((frame) => frame.current)
    .map((frame) => frame.current.join(","))
  assert.ok(naiveCoordinates.includes("0,0"))
  assert.ok(naiveCoordinates.indexOf("2,0") < naiveCoordinates.lastIndexOf("2,1"))
  const memoVisitR3C2 = memoization.frames.findIndex(
    (frame) => frame.current?.join(",") === "2,1" && frame.gridValues[2][1] === null,
  )
  const memoStoreR3C2 = memoization.frames.findIndex((frame) => frame.gridValues[2][1] === 6)
  const memoStoreR3C1 = memoization.frames.findIndex((frame) => frame.gridValues[2][0] === 8)
  assert.ok(memoVisitR3C2 >= 0)
  assert.ok(memoVisitR3C2 < memoStoreR3C2)
  assert.ok(memoStoreR3C2 < memoStoreR3C1)
})

test("dynamic-programming story views expose accessible coin and warehouse structures", () => {
  class FakeNode {
    constructor(tagName, text = "") {
      this.tagName = tagName
      this.textContent = text
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.className = ""
      this.style = { setProperty() {} }
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    append(...children) {
      this.children.push(...children)
    }
    replaceChildren(...children) {
      this.children = children
    }
  }
  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createTextNode: (value) => new FakeNode("#text", value),
  }
  try {
    const coin = buildDynamicProgramming("coinChangeGreedy")
    const coinMemo = buildDynamicProgramming("coinChangeMemoization")
    const coinTabulation = buildDynamicProgramming("coinChangeTabulation")
    const grid = buildDynamicProgramming("gridPathNaive")
    const gridMemo = buildDynamicProgramming("gridPathMemoization")
    const gridTabulation = buildDynamicProgramming("gridPathTabulation")
    const coinView = coin.family.createView(coin.frames)
    const coinMemoView = coinMemo.family.createView(coinMemo.frames)
    const coinTabulationView = coinTabulation.family.createView(coinTabulation.frames)
    const gridView = grid.family.createView(grid.frames)
    const gridMemoView = gridMemo.family.createView(gridMemo.frames)
    const gridTabulationView = gridTabulation.family.createView(gridTabulation.frames)
    const [coinRegion, coinLegend, coinStatus] = coinView.nodes
    const [gridMatrix, gridLegend, gridStatus] = gridView.nodes

    coinView.paint(coin.frames.at(-1), coin.frames.length - 1, coin.frames.length)
    coinMemoView.paint(coinMemo.frames.at(-1), coinMemo.frames.length - 1, coinMemo.frames.length)
    coinTabulationView.paint(
      coinTabulation.frames.at(-1),
      coinTabulation.frames.length - 1,
      coinTabulation.frames.length,
    )
    gridView.paint(grid.frames.at(-1), grid.frames.length - 1, grid.frames.length)
    gridMemoView.paint(gridMemo.frames.at(-1), gridMemo.frames.length - 1, gridMemo.frames.length)
    gridTabulationView.paint(
      gridTabulation.frames.at(-1),
      gridTabulation.frames.length - 1,
      gridTabulation.frames.length,
    )

    assert.equal(coinRegion.attributes.get("role"), "region")
    assert.equal(coinRegion.attributes.get("aria-label"), "Coin change counter")
    assert.equal(coinLegend.children.length, 4)
    assert.match(coinStatus.innerHTML, /step \d+\/\d+/)
    assert.equal(coinView.watch(coin.frames.at(-1)).length, 4)
    assert.equal(coinView.stableStage, true)
    assert.equal(coinMemoView.stableStage, true)
    assert.equal(coinTabulationView.stableStage, true)

    assert.equal(gridMatrix.tagName, "table")
    assert.equal(gridMatrix.attributes.get("aria-label"), "Warehouse route cost matrix")
    assert.equal(gridMatrix.children.at(-1).tagName, "tfoot")
    assert.equal(gridLegend.children.length, 4)
    assert.match(gridStatus.innerHTML, /step \d+\/\d+/)
    assert.equal(gridView.watch(grid.frames.at(-1)).length, 4)
    assert.equal(coinMemoView.watch(coinMemo.frames.at(-1)).length, 4)
    assert.equal(coinTabulationView.watch(coinTabulation.frames.at(-1)).length, 4)
    assert.equal(gridMemoView.watch(gridMemo.frames.at(-1)).length, 4)
    assert.equal(gridTabulationView.watch(gridTabulation.frames.at(-1)).length, 4)
  } finally {
    globalThis.document = previousDocument
  }
})

test("dynamic-programming problem families keep watch hints and canonical legends", () => {
  const { dynamicProgrammingTreeViewDescriptor } = loadStepTraceModule(
    "src",
    "families",
    "execution-tree.ts",
  )
  const { dpProblemTableSemantics, dpStoryConfig } = loadStepTraceModule(
    "src",
    "families",
    "dp-problems.ts",
  )
  const coinTable = buildDynamicProgramming("coinChangeBottomUp")
  const gridTable = buildDynamicProgramming("gridPathBottomUp")
  const coinFrame = coinTable.frames.find((frame) => frame.cur?.join(",") === "0,10")
  const gridFrame = gridTable.frames.find((frame) => frame.cur?.join(",") === "0,0")

  assert.throws(
    () =>
      dpStoryConfig("coin-change", "greedy")({ algorithm: "coin-change-greedy", variant: "other" }),
    /does not take a variant/,
  )
  assert.deepEqual(
    dynamicProgrammingTreeViewDescriptor.legend.map((item) => item.state),
    ["split", "base", "store", "cache"],
  )
  assert.equal(dynamicProgrammingTreeViewDescriptor.nodeWidth, 136)
  assert.equal(dynamicProgrammingTreeViewDescriptor.nodeHeight, 50)
  assert.equal(dynamicProgrammingTreeViewDescriptor.minSvgWidth, 500)
  assert.equal(dynamicProgrammingTreeViewDescriptor.canvasScale, 1)
  assert.equal(dynamicProgrammingTreeViewDescriptor.fitWidth, true)
  assert.ok(
    dynamicProgrammingTreeViewDescriptor
      .watchRows(buildDynamicProgramming("coinChangeTopDown").frames.at(-1))
      .every((row) => row.hint),
  )
  assert.deepEqual(
    dpProblemTableSemantics.coin.watchRows(coinFrame).map((row) => row.k),
    ["amount", "predecessors", "transition", "answer"],
  )
  assert.deepEqual(
    dpProblemTableSemantics.grid.watchRows(gridFrame).map((row) => row.k),
    ["tile", "reads", "transition", "best cost"],
  )
  assert.ok(dpProblemTableSemantics.coin.watchRows(coinFrame).every((row) => row.hint))
  assert.ok(dpProblemTableSemantics.grid.watchRows(gridFrame).every((row) => row.hint))
})

test("dynamic-programming tabs and stable story stage keep the compact five-view contract", () => {
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Paradigms",
      "Dynamic Programming.md",
    ),
    "utf8",
  )
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const storyStyles = readFileSync(join(here, "src", "styles", "dp-story.scss"), "utf8")

  assert.doesNotMatch(note, /Tabulation \(Raw\)/)
  assert.match(mountSource, /steptrace--stable-stage/)
  assert.match(sharedStyles, /\.steptrace__rail\s*\{\s*overflow-y: auto;\s*\}/)
  // the height is definite and unconditional: a growing trace must not resize
  // the viz on any family, not even within a bound
  assert.match(
    sharedStyles,
    /\.steptrace__body\s*\{[^}]*block-size: clamp\(14rem, calc\(100dvh - 12rem\), 28rem\);[^}]*grid-template-rows: minmax\(0, 1fr\);/s,
  )
  assert.doesNotMatch(sharedStyles, /max-block-size: clamp\(14rem/)
  assert.match(
    sharedStyles,
    /\.steptrace__stage-col,\s*\.steptrace__rail\s*\{\s*min-block-size: 0;\s*\}/,
  )
  assert.match(
    sharedStyles,
    /\.steptrace__trace\s*\{[^}]*flex: 1 1 auto;[^}]*min-height: 0;[^}]*margin: 0 0 0\.9rem;/s,
  )
  assert.match(sharedStyles, /\.steptrace__watch-wrap\s*\{[^}]*flex: 0 0 auto;/s)
  assert.match(sharedStyles, /\.steptrace__log\s*\{[^}]*flex: 1 1 auto;[^}]*min-height: 0;/s)
  assert.match(mountSource, /log\.style\.minHeight = h/)
  assert.match(
    storyStyles,
    /\.steptrace \.steptrace__dp-story-stage\s*\{[^}]*grid-auto-rows: max-content;[^}]*overflow: auto;/s,
  )
  assert.match(
    storyStyles,
    /\.steptrace \.steptrace__coin-tray\s*\{[^}]*min-block-size: calc\(2\.75rem \+ 1rem \+ 2px\);/s,
  )
  assert.match(
    storyStyles,
    /@media \(max-width: 560px\)\s*\{[\s\S]*?\.steptrace \.steptrace__dp-story\s*\{[^}]*block-size: 22\.5rem;/,
  )
  assert.match(renderSource, /root\.dataset\.approach = first\.approach/)
  assert.match(
    storyStyles,
    /\[data-approach="tabulation"\][\s\S]*?\.steptrace__dp-story-stage\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\) auto;[^}]*align-content: stretch;/,
  )
  assert.match(
    storyStyles,
    /\[data-approach="tabulation"\][\s\S]*?\.steptrace__amount-board\s*\{[^}]*align-self: end;/,
  )
  assert.match(
    storyStyles,
    /\.steptrace \.steptrace__coin-attempt,[\s\S]*?\.steptrace \.steptrace__coin-memo-heading,[\s\S]*?\.steptrace \.steptrace__coin-memo-row\s*\{[^}]*padding: 0\.375rem 0\.625rem;[^}]*font-size: 0\.75rem;/,
  )
  assert.match(
    storyStyles,
    /\.steptrace \.steptrace__warehouse-matrix th,[\s\S]*?\.steptrace \.steptrace__warehouse-matrix td\s*\{[^}]*border-radius: 0 !important;[^}]*background-color: var\(--_story-cell\) !important;[^}]*vertical-align: middle !important;/,
  )
  assert.match(
    storyStyles,
    /\.steptrace \.steptrace__warehouse-matrix th\s*\{[^}]*background-color: var\(--_story-header\) !important;/,
  )
  for (const state of ["current", "path", "repeated", "dependency", "stored", "best"]) {
    assert.match(
      storyStyles,
      new RegExp(
        `\\.steptrace \\.steptrace__warehouse-matrix td\\[data-state="${state}"\\]\\s*\\{[^}]*background-color:[^;}]+\\) !important;`,
      ),
    )
  }
  assert.match(mountSource, /const probes = player\.frames\.map/)
  assert.match(mountSource, /log\.append\(\.\.\.probes, resultProbe\)/)
  assert.doesNotMatch(mountSource, /for \(const f of player\.frames\)[\s\S]*?pt\.textContent/)
  assert.doesNotMatch(
    storyStyles,
    /\.steptrace \.steptrace__(?:coin-attempt|coin-memo-heading|coin-memo-row)[^{]*\{[^}]*min-height:/,
  )
  assert.match(renderSource, /wrap\.dataset\.fitWidth = descriptor\.fitWidth \? "true" : "false"/)
  assert.match(
    sharedStyles,
    /\[data-visual-family="execution-tree"\] \.steptrace__body\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(13rem, 15rem\);[^}]*gap: 0 1rem;/s,
  )
  const treeStyles = readFileSync(join(here, "src", "styles", "rectree.scss"), "utf8")
  assert.match(
    treeStyles,
    /\.steptrace__rectree\[data-fit-width="true"\] \.steptrace__rtsvg\s*\{[^}]*inline-size: 100%;[^}]*min-inline-size: 0;[^}]*max-inline-size: var\(--steptrace-tree-width, 100%\);[^}]*margin-inline: auto;/s,
  )
  assert.match(
    treeStyles,
    /\.steptrace--tabs \.steptrace__tabpanel-body\.steptrace[\s\S]*?\.steptrace__rectree\[data-fit-width="true"\][\s\S]*?\.steptrace__rtsvg\s*\{[^}]*max-block-size: 100%;/,
  )
  assert.doesNotMatch(storyStyles, /unavailable|data-out/)
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
    /\.steptrace \.steptrace__matrix-footer-row\s*\{[^}]*grid-template-columns: auto minmax\(0, 1fr\);[^}]*font: 400 var\(--_type-small\) \/ 1\.2 var\(--_font-head\);/s,
  )
  assert.match(renderSource, /steptrace__matrix-footer-context/)
  assert.match(renderSource, /steptrace__matrix-footer-summary/)
  assert.match(renderSource, /steptrace__matrix-footer-summary-text/)
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
    /\[data-visual-family="matrix-grid"\][\s\S]*@container steptrace-wide-stage \(max-width: 35rem\)/,
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

test("tim sort keeps natural runs contiguous while it reverses, extends, collapses, and force-merges", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const { summaryFor } = loadStepTraceModule("src", "render.ts")
  const result = api.buildFrames({
    algorithm: "tim-sort",
    array: [5, 6, 7, 8, 9, 4, 3, 1, 2, 8],
    minrun: 4,
  })
  const { runStackFamily, runStackWatch } = loadStepTraceModule("src", "families", "run-stack.ts")
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Sorting Algorithms",
      "Tim Sort.md",
    ),
    "utf8",
  )
  const source = readFileSync(join(here, "src", "algorithms", "tim-sort.ts"), "utf8")
  const familySource = readFileSync(join(here, "src", "families", "run-stack.ts"), "utf8")
  const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
  const mountSource = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const typesSource = readFileSync(join(here, "src", "types.ts"), "utf8")
  const pointerStyles = readFileSync(join(here, "src", "styles", "pointers.scss"), "utf8")
  const barStyles = readFileSync(join(here, "src", "styles", "bars.scss"), "utf8")
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "run-stack.scss"), "utf8")
  const pushes = result.frames.filter((frame) => frame.type === "push")
  const insertion = result.frames.filter((frame) => frame.type === "insert")
  const firstMerge = result.frames.find((frame) => frame.type === "merge")
  const forced = result.frames.find((frame) => frame.type === "force-merge")

  assert.equal(result.family.id, "run-stack")
  assert.equal(runStackFamily.id, "run-stack")
  assert.deepEqual(
    runStackWatch(result.frames[0]).map((row) => row.hint),
    [
      "What Tim sort is doing in this frame.",
      "Array span currently detected, extended, or merged.",
      "Saved contiguous run lengths, from stack bottom to top.",
      "Newest run at the top of the stack.",
    ],
  )
  assert.deepEqual(
    pushes.map((frame) => frame.stack.map((run) => run.length)),
    [[5], [5, 4], [5, 4, 1]],
  )
  assert.equal(result.frames.find((frame) => frame.type === "detect")?.direction, "ascending")
  assert.equal(result.frames.find((frame) => frame.type === "reverse")?.direction, "descending")
  assert.ok(
    insertion.some((frame) => frame.insertion?.source === 8 && frame.insertion.target === 6),
  )
  assert.deepEqual(
    result.frames.find((frame) => frame.type === "check" && frame.invariant?.z != null)?.invariant,
    { x: 1, y: 4, z: 5, holds: false },
  )
  assert.deepEqual(
    firstMerge.stack.map((run) => [run.start, run.length]),
    [
      [0, 5],
      [5, 5],
    ],
  )
  assert.equal(forced, undefined)
  const forceResult = api.buildFrames({
    algorithm: "tim-sort",
    array: [5, 6, 7, 8, 9, 4, 3, 1, 2],
    minrun: 4,
  })
  assert.deepEqual(forceResult.frames.find((frame) => frame.type === "force-merge")?.stack, [
    { start: 0, length: 9 },
  ])
  assert.deepEqual(result.frames.at(-1).array, [1, 2, 3, 4, 5, 6, 7, 8, 8, 9])
  assert.equal(result.frames.at(-1).type, "done")
  assert.equal(
    summaryFor("tim-sort", "sort", result.frames.at(-1)),
    "Output [1, 2, 3, 4, 5, 6, 7, 8, 8, 9] · 2 run-stack merges.",
  )
  assert.doesNotMatch(summaryFor("tim-sort", "sort", result.frames.at(-1)), /undefined/)
  assert.match(note, /"algorithm": "tim-sort"/)
  assert.match(source, /value < ops\.value\[mid\]/)
  assert.match(source, /ops\.reverse/)
  assert.match(source, /ops\.merge\(\n            mergeIndex,/)
  assert.match(familySource, /makeBars\(arrayBars, length\)/)
  assert.doesNotMatch(familySource, /makeArrayStrip|run-array-(?:cell|index|value)/)
  assert.match(
    renderSource,
    /export function makeArrayStrip[\s\S]*?steptrace__pwrap[\s\S]*?steptrace__pcells[\s\S]*?steptrace__pcell/,
  )
  assert.match(
    renderSource,
    /export function makePointerView[\s\S]*?makeArrayStrip\(frames\[0\]\.array\)/,
  )
  assert.match(pointerStyles, /height: 46px/)
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__pcells,[\s\S]*?--steptrace-array-radius: 9px;[^}]*overflow: hidden;/s,
  )
  assert.match(typesSource, /stageAlignment\?: "bottom" \| "center"/)
  assert.match(mountSource, /view\.stageAlignment \|\| "center"/)
  assert.match(
    mountSource,
    /stageCol\.classList\.toggle\("steptrace__stage-col--bottom", stageAlignment === "bottom"\)/,
  )
  assert.match(
    mountSource,
    /stageCol\.classList\.toggle\("steptrace__stage-col--center", stageAlignment === "center"\)/,
  )
  assert.match(
    renderSource,
    /return \{ nodes: \[stage, status\], stageAlignment: "bottom", paint, watch/,
  )
  assert.match(
    renderSource,
    /export function makeMatchView[\s\S]*?return \{ nodes: \[stage, status\], paint, watch, destroy:/,
  )
  assert.match(
    renderSource,
    /export function makePointerView[\s\S]*?return \{ nodes: \[wrap, status\], paint, watch \}/,
  )
  assert.match(renderSource, /stageLayout: "fill"/)
  assert.match(styles, /\.steptrace__run-stack-cards/)
  assert.match(styles, /min-block-size: 8\.1rem/)
  assert.match(
    sharedStyles,
    /@media \(max-width: 560px\) \{[\s\S]*?\.steptrace__rail\s*\{[\s\S]*?border-top: 1px solid var\(--_hair\);[\s\S]*?padding-top: 1rem;[\s\S]*?margin-top: 1rem;/,
  )
  assert.match(
    sharedStyles,
    /@media \(max-width: 560px\)[\s\S]*?\.steptrace__trace\s*\{[\s\S]*?--_stable-trace-height: clamp\(4\.75rem, 16dvh, 5\.75rem\);[\s\S]*?flex: 0 0 var\(--_stable-trace-height\);[\s\S]*?block-size: var\(--_stable-trace-height\);[\s\S]*?overflow: hidden;/,
  )
  assert.match(
    sharedStyles,
    /\.steptrace__log\s*\{[\s\S]*?overflow-y: auto !important;[\s\S]*?overscroll-behavior: contain;/,
  )
  assert.match(styles, /\.steptrace__run-array-section\s*\{[\s\S]*?padding-bottom: 0\.9rem;/)
  assert.match(
    styles,
    /\.steptrace__run-bars\s*\{[\s\S]*?align-self: end;[\s\S]*?block-size: 100%;[\s\S]*?min-block-size: 0;[\s\S]*?overflow: hidden;/,
  )
  assert.match(
    styles,
    /\.steptrace__run-stack-section\s*\{[\s\S]*?padding-top: 0\.9rem;[\s\S]*?border-top: 1px solid var\(--_hair\);/,
  )
  assert.match(styles, /data-motion="push"[\s\S]*?steptrace-run-stack-push/)
  assert.match(styles, /data-motion="insert"[\s\S]*?steptrace-run-stack-insert/)
  assert.match(styles, /data-motion="merge"[\s\S]*?steptrace-run-stack-merge/)
  assert.match(familySource, /bar\.bar\.dataset\.motion = frame\.type === "insert"/)
  assert.match(
    familySource,
    /isSorted \? "sorted" : isInsert \? "candidate" : isCurrent \? "compare" : ""/,
  )
  assert.match(styles, /data-run="0"\]\[data-state=""\]/)
  assert.doesNotMatch(
    styles,
    /data-current="1"\][\s\S]*?box-shadow|data-insert="1"\][\s\S]*?box-shadow/,
  )
  assert.match(
    barStyles,
    /\.steptrace__bar\[data-state="sorted"\] \.steptrace__fill \{\n  background: var\(--_green\);/,
  )
  assert.doesNotMatch(familySource, /dataset\.motion = "remove"|dataset\.state = "removed"/)
  assert.doesNotMatch(
    styles,
    /run-array-(?:cell|index|value)|steptrace__pwrap|steptrace__pcells|steptrace__pcell\s*\{/,
  )
  assert.doesNotMatch(styles, /glow|drop-shadow/)
})

test("tim sort rejects invalid minimum-run settings", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  assert.throws(
    () => api.buildFrames({ algorithm: "tim-sort", array: [3, 2, 1], minrun: 1 }),
    /minrun.*at least 2/,
  )
})

test("tim sort run-stack cards display only the current stack entries", () => {
  class FakeNode {
    constructor(tagName) {
      this.tagName = tagName
      this.textContent = ""
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.style = { setProperty: (key, value) => this.attributes.set(`style:${key}`, value) }
      this.className = ""
      this.hidden = false
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
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    const { makeRunStackView } = loadStepTraceModule("src", "families", "run-stack.ts")
    const frames = api.buildFrames({
      algorithm: "tim-sort",
      array: [5, 6, 7, 8, 9, 4, 3, 1, 2, 8],
      minrun: 4,
    }).frames
    const merge = frames.find((frame) => frame.type === "merge")
    const done = frames.at(-1)
    const view = makeRunStackView(frames)
    view.paint(merge)
    const stack = view.nodes[0].children[1].children[1]
    const visibleLabels = stack.children
      .filter((card) => !card.hidden)
      .map((card) => card.children[0].textContent)
      .sort()
    const currentLabels = merge.stack
      .map(
        (run, index) =>
          `R${index + 1} [${run.start}…${run.start + run.length - 1}] · ${run.length}`,
      )
      .sort()

    assert.deepEqual(visibleLabels, currentLabels)

    view.paint(done)
    const bars = view.nodes[0].children[0].children[1]
    assert.ok(
      bars.children.every(
        (bar) =>
          bar.dataset.state === "sorted" &&
          bar.dataset.current === "0" &&
          bar.dataset.insert === "0",
      ),
    )
  } finally {
    globalThis.document = previousDocument
  }
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
  const family = readFileSync(join(here, "src", "families", "monotone-boundary.ts"), "utf8")

  assert.match(renderSource, /export function makeBoundarySearchView\(/)
  assert.match(renderSource, /frame\.maxInfeasible/)
  assert.match(renderSource, /frame\.minFeasible/)
  assert.match(renderSource, /model\.lanes\.slice\(model\.allowed\)/)
  assert.match(styles, /\.steptrace__boundary-ticks/)
  assert.match(styles, /\.steptrace__boundary-lane--overflow/)
  assert.match(styles, /\.steptrace \.steptrace__boundary\s*\{[^}]*min-height: 23rem;/s)
  const wideBoundaryBody =
    styles.match(
      /@container steptrace-wide-stage \(min-width: 44rem\)[\s\S]*?\[data-visual-family="monotone-boundary"\] \.steptrace__body\s*\{[^}]*\}/,
    )?.[0] || ""
  assert.match(wideBoundaryBody, /grid-template-columns: 1fr minmax\(240px, 312px\);/)
  assert.doesNotMatch(wideBoundaryBody, /block-size|min-height/)
  assert.match(
    styles,
    /@container steptrace-boundary \(max-width: 28rem\)[\s\S]*?\.steptrace__boundary-lanes\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/,
  )
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

test("indexed searches reject unsorted arrays and non-numeric targets", () => {
  const { steptrace: api } = loadStepTraceModule("src", "engine.ts")

  assert.throws(
    () => api.buildFrames({ algorithm: "exponential-search", array: [2, 7, 4], target: 4 }),
    /non-decreasing order/,
  )
  for (const algorithm of ["exponential-search", "interpolation-search", "jump-search"]) {
    for (const target of ["4", undefined, Number.NaN])
      assert.throws(
        () => api.buildFrames({ algorithm, array: [2, 4, 7], target }),
        /finite numeric "target"/,
      )
  }
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

test("springStep is a frame-rate-independent, interruptible damped spring", () => {
  const { springStep, springOmega, SPRINGS } = loadStepTraceModule("src", "motion.ts")
  const omega1 = springOmega(107) // 1x step budget
  const marker = { omega0: omega1, zeta: SPRINGS.marker.zeta }
  const held = { omega0: omega1, zeta: SPRINGS.held.zeta }

  // omega0 is speed-proportional: a shorter (faster) budget stiffens the spring
  assert.ok(springOmega(54) > springOmega(107))

  // (a) high damping approaches monotonically, without overshoot
  {
    let pos = 0,
      vel = 0,
      peak = 0
    for (let i = 0; i < 200; i++) {
      const s = springStep(pos, vel, 100, 8, held)
      pos = s.pos
      vel = s.vel
      peak = Math.max(peak, pos)
    }
    assert.ok(peak <= 100.5, `high-zeta overshoot ${peak}`)
    assert.ok(pos > 99.5)
  }

  // (b) an underdamped spring overshoots 5-12% of the step, then settles
  {
    let pos = 0,
      vel = 0,
      peak = 0
    for (let i = 0; i < 300; i++) {
      const s = springStep(pos, vel, 100, 8, marker)
      pos = s.pos
      vel = s.vel
      peak = Math.max(peak, pos)
    }
    const overshoot = peak - 100
    assert.ok(overshoot >= 5 && overshoot <= 12, `overshoot ${overshoot.toFixed(2)}%`)
    assert.ok(Math.abs(pos - 100) < 0.5)
  }

  // (c) retarget mid-flight carries velocity and stays continuous (no jump)
  {
    let pos = 0,
      vel = 0,
      prev = 0,
      maxJump = 0
    for (let i = 0; i < 3; i++) {
      const s = springStep(pos, vel, 40, 16, marker)
      maxJump = Math.max(maxJump, Math.abs(s.pos - prev))
      prev = s.pos
      pos = s.pos
      vel = s.vel
    }
    assert.notEqual(vel, 0) // momentum is carried into the retarget
    for (let i = 0; i < 20; i++) {
      const s = springStep(pos, vel, 48, 16, marker)
      maxJump = Math.max(maxJump, Math.abs(s.pos - prev))
      prev = s.pos
      pos = s.pos
      vel = s.vel
    }
    assert.ok(maxJump < 25, `discontinuity ${maxJump.toFixed(2)}px`)
    assert.ok(Math.abs(pos - 48) < 0.5)
  }

  // (d) dt<=0 (or a reduced-motion snap) resolves straight to target, at rest
  assert.deepEqual(springStep(30, 12, 100, 0, marker), { pos: 100, vel: 0 })

  // (e) settles within a bounded number of ticks
  {
    let pos = 0,
      vel = 0,
      ticks = 0
    for (; ticks < 60; ticks++) {
      const s = springStep(pos, vel, 100, 16, marker)
      pos = s.pos
      vel = s.vel
      if (Math.abs(pos - 100) < 0.4 && Math.abs(vel) < 0.5) break
    }
    assert.ok(ticks < 40, `settle ticks ${ticks}`)
  }

  // (f) 2x regression: track a moving target within 1px at the speed-derived omega0
  {
    const cfg = { omega0: springOmega(54), zeta: SPRINGS.marker.zeta } // 2x budget
    let pos = 0,
      vel = 0,
      target = 0
    for (let step = 0; step < 8; step++) {
      target += 18 // the tracked bar shifts one slot every 130ms budget
      for (let t = 0; t < 130; t += 16) {
        const s = springStep(pos, vel, target, 16, cfg)
        pos = s.pos
        vel = s.vel
      }
    }
    for (let t = 0; t < 400; t += 16) {
      const s = springStep(pos, vel, target, 16, cfg)
      pos = s.pos
      vel = s.vel
    }
    assert.ok(Math.abs(pos - target) < 1, `2x gap ${Math.abs(pos - target).toFixed(3)}px`)
  }

  // frame-rate independence: coarse vs fine dt converge to the same place
  const settleAt = (dt) => {
    let p = 0,
      v = 0
    for (let t = 0; t < 800; t += dt) {
      const s = springStep(p, v, 100, dt, marker)
      p = s.pos
      v = s.vel
    }
    return p
  }
  assert.ok(Math.abs(settleAt(8) - settleAt(40)) < 1)
})

test("sequence stages budget-proportional beats, collapses when fast, and stays live post-idle", () => {
  const { sequence } = loadStepTraceModule("src", "motion.ts")

  // (a) beats fire in offset order regardless of input order, under injected now()
  {
    let clock = 0
    const fired = []
    const seq = sequence(
      [
        { at: 0.5, run: () => fired.push(["settle", clock]) },
        { at: 0, run: () => fired.push(["wind", clock]) },
        { at: 0.25, run: () => fired.push(["travel", clock]) },
      ],
      260, // 1x step budget
      0,
    )
    for (clock = 0; clock <= 260; clock += 1) seq.tick(clock)
    assert.deepEqual(
      fired.map((f) => f[0]),
      ["wind", "travel", "settle"],
    )
    assert.deepEqual(
      fired.map((f) => f[1]),
      [0, 65, 130], // distinct beats at a full budget
    )
    assert.equal(seq.pending, 0)
  }

  // (b) total span scales linearly with the budget (large budgets stay staged)
  const spanFor = (budget) => {
    let clock = 0
    const times = []
    const seq = sequence(
      [
        { at: 0, run: () => times.push(clock) },
        { at: 0.5, run: () => times.push(clock) },
      ],
      budget,
      0,
    )
    for (clock = 0; clock <= budget + 100; clock += 1) seq.tick(clock)
    return times[times.length - 1] - times[0]
  }
  assert.equal(spanFor(800), 400)
  assert.equal(spanFor(400), 200) // half the budget → half the span

  // (c) budget collapse: at a 130ms (2x) budget every beat coalesces to one
  // instant — no beat is starved, they fire together
  {
    let clock = 0
    const times = []
    const seq = sequence(
      [
        { at: 0, run: () => times.push(clock) },
        { at: 0.25, run: () => times.push(clock) },
        { at: 0.5, run: () => times.push(clock) },
      ],
      130, // 2x budget
      0,
    )
    for (clock = 0; clock <= 200; clock += 1) seq.tick(clock)
    assert.equal(times.length, 3, "every beat still fires")
    assert.ok(Math.max(...times) - Math.min(...times) <= 1, "beats collapse to one window")
  }

  // (d) cancel prevents pending beats; retargeting cancels the prior sequence so
  // no stale beat survives
  {
    const fired = []
    const seq = sequence([{ at: 0.5, run: () => fired.push("x") }], 260, 0)
    seq.cancel()
    for (let clock = 0; clock <= 400; clock += 1) seq.tick(clock)
    assert.equal(fired.length, 0)
    assert.equal(seq.pending, 0)

    const log = []
    let active = sequence([{ at: 0.5, run: () => log.push("old") }], 260, 0)
    active.cancel() // retarget: cancel the prior sequence …
    active = sequence([{ at: 0.5, run: () => log.push("new") }], 260, 100) // … start a new one
    for (let clock = 0; clock <= 500; clock += 1) active.tick(clock)
    assert.deepEqual(log, ["new"])
  }

  // (e) post-idle liveness — the freeze-mid-beat heisenbug the Architect flagged.
  // A beat scheduled AFTER the markers settle must still fire. Model the tracker
  // loop's sleep test: it may sleep only when nothing moves AND no beat pends.
  {
    const markersMoving = () => false // settled from frame 0
    let firedAt = null
    let clock = 0
    const seq = sequence([{ at: 0.8, run: () => (firedAt = clock) }], 260, 0)
    let awake = true
    for (clock = 0; clock <= 400 && awake; clock += 16) {
      const beatsPending = seq.tick(clock)
      awake = markersMoving() || beatsPending // the load-bearing OR
    }
    assert.ok(firedAt != null, "post-idle beat must fire")
    assert.ok(firedAt >= 0.8 * 260 - 16, "and near its scheduled time")

    // negative control: without the OR the loop sleeps at frame 0 and the beat is
    // lost — proving the pending-beat guard is what prevents the freeze
    let firedAt2 = null
    let clock2 = 0
    const seq2 = sequence([{ at: 0.8, run: () => (firedAt2 = clock2) }], 260, 0)
    let awake2 = true
    for (clock2 = 0; clock2 <= 400 && awake2; clock2 += 16) {
      seq2.tick(clock2)
      awake2 = markersMoving() // ignores pending beats
    }
    assert.equal(firedAt2, null, "freeze reproduced when liveness ignores pending beats")
  }
})

test("swap choreography engages headlessly and collapses to a snap under reduced motion", () => {
  // FakeNode gains a synthetic layout (left derives from --_i) so a swap yields a
  // real dx and the fly path runs; it still has no rAF / .animate / getComputedStyle.
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
      this.isConnected = true
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    append(...children) {
      this.children.push(...children)
    }
    getBoundingClientRect() {
      const i = Number(this.attributes.get("style:--_i") ?? 0)
      return { left: i * 20, top: 0, width: 100, height: 200, right: i * 20 + 100, bottom: 200 }
    }
    closest(selector) {
      return this.__reduced && selector === ".steptrace--reduced" ? this : null
    }
  }
  const previousDocument = globalThis.document
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
  }
  const frames = [
    { array: [3, 1, 2], sorted: [], candidate: null, active: [0, 1], type: "compare", swaps: 0 },
    { array: [1, 3, 2], sorted: [], candidate: null, active: [0, 1], type: "swap", swaps: 1 },
  ]
  try {
    const { makeSortView } = loadStepTraceModule("src", "render.ts")

    // (1) with motion allowed the swap fly runs: a beat sets data-stage and the
    // bar springs from its FLIP origin — all without a layout engine throwing.
    // The travel beat fires immediately (no anticipation hold), so the first
    // observable stage is "travel" and translateX is already being written.
    const view = makeSortView(frames)
    const bar0 = view.nodes[0].children[0]
    assert.doesNotThrow(() => {
      view.paint(frames[0], 0)
      view.paint(frames[1], 1) // the swap frame exercises the staged fly path
    })
    assert.equal(bar0.dataset.stage, "travel")
    assert.match(bar0.style.transform, /translateX/)
    view.destroy()

    // (2) reduced motion snaps: the fly path early-returns, so no beat is staged
    // and no transform is written — the value just updates in place
    const reducedView = makeSortView(frames)
    const reducedStage = reducedView.nodes[0]
    reducedStage.__reduced = true
    const rbar0 = reducedStage.children[0]
    assert.doesNotThrow(() => {
      reducedView.paint(frames[0], 0)
      reducedView.paint(frames[1], 1)
    })
    assert.equal(rbar0.dataset.stage, undefined, "no staging under reduced motion")
    assert.equal(rbar0.children[1].textContent, 1, "swapped value still written in place")
    reducedView.destroy()
  } finally {
    globalThis.document = previousDocument
  }
})

test("the marker loop idles only once both the spring and its target are quiet", () => {
  const { markerIsMoving } = loadStepTraceModule("src", "render.ts")
  const { springStep, springOmega, SPRINGS } = loadStepTraceModule("src", "motion.ts")
  const at = (x, y) => ({ x, y })

  assert.equal(markerIsMoving(null, at(10, 5), at(10, 5)), true)
  assert.equal(markerIsMoving(at(10, 5), at(10, 5), at(10, 5)), false)
  assert.equal(markerIsMoving(at(10, 5), at(10, 5), at(4, 5)), true)
  // on target, but the bar underneath is still flying
  assert.equal(markerIsMoving(at(10, 5), at(14, 5), at(14, 5)), true)
  assert.equal(markerIsMoving(at(10, 5), at(10, 9), at(10, 9)), true)

  // the tracker now also gates on residual velocity: keep stepping until the
  // spring is both on target and quiet, mirroring frameStep's idle test
  const cfg = { omega0: springOmega(107), zeta: SPRINGS.marker.zeta }
  let pos = 0
  let vel = 0
  let ticks = 0
  const quiet = () => !markerIsMoving(at(100, 0), at(100, 0), at(pos, 0)) && Math.abs(vel) <= 0.5
  while (!quiet() && ticks < 200) {
    const s = springStep(pos, vel, 100, 16, cfg)
    pos = s.pos
    vel = s.vel
    ticks++
  }
  assert.ok(ticks < 200, "spring must reach the idle threshold")
  assert.ok(Math.abs(pos - 100) < 0.4 && Math.abs(vel) <= 0.5)
})

test("the sort view paints headlessly without a layout engine", () => {
  // FakeNode has no getBoundingClientRect / requestAnimationFrame / getComputedStyle
  // / closest — the tracker and the spring-driven swap must no-throw and simply
  // not move (the values still update in place).
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
    const { makeSortView } = loadStepTraceModule("src", "render.ts")
    const frames = [
      { array: [3, 1, 2], sorted: [], candidate: null, active: [0, 1], type: "compare", swaps: 0 },
      { array: [1, 3, 2], sorted: [], candidate: null, active: [0, 1], type: "swap", swaps: 1 },
      { array: [1, 2, 3], sorted: [0, 1, 2], candidate: null, active: [], type: "done", swaps: 1 },
    ]
    const view = makeSortView(frames)
    assert.doesNotThrow(() => {
      view.paint(frames[0], 0)
      view.paint(frames[1], 1) // swap frame exercises the spring-driven fly path
      view.paint(frames[2], 2)
      view.watch(frames[1])
      view.destroy()
    })
  } finally {
    globalThis.document = previousDocument
  }
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
    "Z-box",
    "source",
    "Z[i]",
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

test("trie uses the typed prefix-character family and preserves shared paths and terminals", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const operations = [
    ["insert", "car"],
    ["insert", "card"],
    ["insert", "care"],
    ["insert", "cat"],
    ["insert", "dog"],
    ["prefix", "ca"],
    ["search", "car"],
  ]
  const result = api.buildFrames({ algorithm: "trie", operations })
  const frames = result.frames
  const final = frames.at(-1)
  const prefix = frames.find((frame) => frame.type === "complete-prefix")
  const search = frames.find((frame) => frame.type === "complete-search")
  const secondInsert = frames.findIndex(
    (frame) => frame.type === "begin" && frame.operation === "insert" && frame.key === "card",
  )
  const reuseAfterCar = frames
    .slice(secondInsert)
    .filter((frame) => frame.key === "card" && frame.type === "reuse-edge")

  assert.equal(api.kindOf("trie"), "string")
  assert.equal(result.kind, "string")
  assert.equal(result.family.id, "prefix-character")
  assert.deepEqual(
    frames[0].nodes.map((node) => node.id),
    ["root", "c", "d", "ca", "do", "car", "cat", "dog", "card", "care"],
  )
  assert.ok(frames[0].nodes.every((node) => node.x >= 35 && node.x <= 305))
  assert.ok(frames[0].nodes.every((node) => node.y >= 38 && node.y <= 270))
  assert.equal(frames[0].edges.length, 9)
  assert.deepEqual(
    reuseAfterCar.map((frame) => frame.activeEdge),
    ["root->c", "c->ca", "ca->car"],
  )
  assert.ok(
    frames.every(
      (frame, index) =>
        index === 0 || frame.visibleNodes.length >= frames[index - 1].visibleNodes.length,
    ),
  )
  assert.deepEqual(final.visibleNodes, [
    "root",
    "c",
    "ca",
    "car",
    "card",
    "care",
    "cat",
    "d",
    "do",
    "dog",
  ])
  assert.deepEqual(final.visibleEdges, [
    "root->c",
    "c->ca",
    "ca->car",
    "car->card",
    "car->care",
    "ca->cat",
    "root->d",
    "d->do",
    "do->dog",
  ])
  assert.deepEqual(final.terminalNodes, ["car", "card", "care", "cat", "dog"])
  assert.equal(prefix.testKind, "path")
  assert.equal(prefix.result, true)
  assert.equal(prefix.key, "ca")
  assert.equal(prefix.terminalNodes.includes("ca"), false)
  assert.equal(search.testKind, "terminal")
  assert.equal(search.result, true)
  const { buildMilestones, milestoneAt, summaryFor } = loadStepTraceModule("src", "render.ts")
  assert.equal(
    summaryFor("trie", "string", final),
    "Stored keys car, card, care, cat, dog · 10 trie nodes.",
  )
  const milestones = buildMilestones("trie", "string", frames)
  const labelAt = (predicate) => milestoneAt(milestones, frames.findIndex(predicate)).label
  assert.equal(
    labelAt((frame) => frame.type === "create-node" && frame.key === "car"),
    "Insert car",
  )
  assert.equal(
    labelAt((frame) => frame.type === "reuse-edge" && frame.key === "card"),
    "Insert card",
  )
  assert.equal(
    labelAt((frame) => frame.type === "create-node" && frame.key === "care"),
    "Insert care",
  )
  assert.equal(
    labelAt((frame) => frame.type === "create-node" && frame.key === "cat"),
    "Insert cat",
  )
  assert.equal(
    labelAt((frame) => frame.type === "create-node" && frame.key === "dog"),
    "Insert dog",
  )
  assert.equal(
    labelAt((frame) => frame.type === "complete-prefix"),
    "Prefix ca",
  )
  assert.equal(
    labelAt((frame) => frame.type === "complete-search"),
    "Search car",
  )
  assert.equal(milestoneAt(milestones, frames.length - 1).label, "Trie complete")
  assert.doesNotMatch(milestones.map((mark) => mark.label).join(" "), /\bShift\b/)
  assert.ok(
    frames
      .slice(search ? frames.indexOf(search) : -1)
      .every((frame) => frame.terminalNodes.includes("car")),
  )
  assert.deepEqual(
    new Set(frames.map((frame) => frame.type)),
    new Set([
      "begin",
      "reuse-edge",
      "create-node",
      "mark-terminal",
      "complete-prefix",
      "complete-search",
      "done",
    ]),
  )

  assert.throws(
    () => api.buildFrames({ algorithm: "trie", operations: [] }),
    /requires a non-empty "operations" array/,
  )
  assert.throws(
    () => api.buildFrames({ algorithm: "trie", operations: [["remove", "car"]] }),
    /operations must be/,
  )
})

test("Aho-Corasick reuses prefix-character frames for failure, goto, fallback, and output", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "aho-corasick",
    patterns: ["he", "she", "his", "hers"],
    text: "ushers",
  })
  const frames = result.frames
  const final = frames.at(-1)
  const outputs = frames.filter((frame) => frame.type === "output")
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")
  const milestones = buildMilestones("aho-corasick", "string", frames).map((mark) => mark.label)

  assert.equal(result.family.id, "prefix-character")
  assert.deepEqual(final.terminalNodes, ["he", "she", "his", "hers"])
  assert.ok(frames.some((frame) => frame.type === "failure-link"))
  assert.ok(frames.some((frame) => frame.type === "goto"))
  assert.ok(frames.some((frame) => frame.type === "fallback"))
  assert.deepEqual(
    outputs.map((frame) => [frame.textCursor, frame.outputs]),
    [
      [3, ["she", "he"]],
      [5, ["hers"]],
    ],
  )
  assert.deepEqual(final.matches, [
    { pattern: "she", end: 3 },
    { pattern: "he", end: 3 },
    { pattern: "hers", end: 5 },
  ])
  assert.ok(final.edges.some((edge) => edge.kind === "failure"))
  assert.equal(summaryFor("aho-corasick", "string", final), "Matches she@3, he@3, hers@5.")
  assert.ok(milestones.includes("Emit she + he"))
  assert.ok(milestones.includes("Emit hers"))
  assert.equal(milestones.at(-1), "Scan complete")
  assert.doesNotMatch(milestones.join(" "), /\bShift\b/)
  const custom = api.buildFrames({ algorithm: "aho-corasick", patterns: ["a"], text: "a" })
  assert.deepEqual(custom.frames.at(-1).matches, [{ pattern: "a", end: 0 }])
  assert.equal(custom.frames.at(-1).message, "Scan complete.")
  assert.throws(
    () => api.buildFrames({ algorithm: "aho-corasick", patterns: [], text: "ushers" }),
    /non-empty "patterns"/,
  )
})

test("ternary search tree exposes lo/eq/hi roles and consumes characters only through eq", () => {
  const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
  const result = api.buildFrames({
    algorithm: "ternary-search-tree",
    operations: [
      ["insert", "cat"],
      ["insert", "car"],
      ["insert", "cup"],
      ["insert", "bat"],
      ["search", "car"],
    ],
  })
  const frames = result.frames
  const final = frames.at(-1)
  const edgeById = new Map(final.edges.map((edge) => [edge.id, edge]))
  const search = frames.find((frame) => frame.type === "complete-search")
  const { buildMilestones, summaryFor } = loadStepTraceModule("src", "render.ts")

  assert.equal(result.family.id, "prefix-character")
  assert.deepEqual(new Set(final.edges.map((edge) => edge.role)), new Set(["eq", "lo", "hi"]))
  for (let index = 1; index < frames.length; index++) {
    const frame = frames[index]
    const previous = frames[index - 1]
    if (
      !frame.activeEdge ||
      frame.key !== previous.key ||
      frame.operation !== previous.operation ||
      !["create-node", "reuse-edge"].includes(frame.type)
    )
      continue
    const role = edgeById.get(frame.activeEdge)?.role
    if (role === "lo" || role === "hi") assert.equal(frame.cursor, previous.cursor)
    if (frame.cursor !== previous.cursor) assert.equal(role, "eq")
  }
  assert.equal(final.terminalNodes.length, 4)
  assert.equal(search.key, "car")
  assert.equal(search.result, true)
  assert.equal(
    summaryFor("ternary-search-tree", "string", final),
    "4 terminal keys · 9 character nodes.",
  )
  assert.deepEqual(
    buildMilestones("ternary-search-tree", "string", frames).map((mark) => mark.label),
    ["Insert cat", "Insert car", "Insert cup", "Insert bat", "Search car", "TST complete"],
  )
  assert.throws(
    () =>
      api.buildFrames({
        algorithm: "ternary-search-tree",
        operations: [["prefix", "ca"]],
      }),
    /operations must be/,
  )
})

test("prefix-character renderer keeps stable accessible topology and compact Watch rows", () => {
  class FakeNode {
    constructor(tagName, text = "") {
      this.tagName = tagName
      this.textContent = text
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
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
    const { trie } = loadStepTraceModule("src", "algorithms", "trie.ts")
    const config = trie.parse({
      algorithm: "trie",
      operations: [
        ["insert", "car"],
        ["insert", "card"],
        ["insert", "care"],
        ["insert", "cat"],
        ["insert", "dog"],
        ["prefix", "ca"],
        ["search", "car"],
      ],
    })
    const recorder = trie.family.createRecorder(config)
    trie.run(config, recorder)
    const view = trie.family.createView(recorder.frames)
    const [root, legend] = view.nodes
    const svg = root.children.find((node) => node.tagName === "svg")
    const topology = svg.children.slice()
    const terminalMarkers = svg.children
      .filter((node) => node.tagName === "g")
      .map((node) => node.children[2])

    view.paint(recorder.frames[0], 0, recorder.frames.length)
    assert.equal(root.attributes.get("role"), "region")
    assert.equal(root.tabIndex, 0)
    assert.equal(svg.attributes.get("viewBox"), "0 0 360 300")
    assert.equal(svg.attributes.get("role"), "img")
    assert.match(svg.attributes.get("aria-labelledby"), /title.*description/)
    assert.equal(svg.children.filter((node) => node.tagName === "line").length, 9)
    assert.equal(svg.children.filter((node) => node.tagName === "g").length, 10)
    assert.equal(svg.children.filter((node) => node.tagName === "text").length, 0)
    assert.equal(legend.children.length, 4)
    assert.ok(
      terminalMarkers.every(
        (marker) =>
          marker.attributes.get("class") ===
            "steptrace__success-marker steptrace__prefix-terminal" &&
          marker.attributes.get("x") === "10" &&
          marker.attributes.get("y") === "-22" &&
          marker.innerHTML.includes("<circle") &&
          marker.innerHTML.includes('d="M20 6 9 17l-5-5"'),
      ),
    )
    assert.ok(view.watch(recorder.frames[0]).length <= 3)

    view.paint(recorder.frames.at(-2), recorder.frames.length - 2, recorder.frames.length)
    assert.deepEqual(svg.children, topology)
    assert.match(svg.children[0].textContent, /Trie search: car/)
    assert.match(svg.children[1].textContent, /Search "car" tests IsEnd/)
    assert.deepEqual(
      view.watch(recorder.frames.at(-2)).map((row) => row.k),
      ["operation", "character", "test"],
    )
  } finally {
    globalThis.document = previousDocument
  }
})

test("production mount verifies persistent structures, binary ordered trees, and Trie summary", () => {
  class FakeNode {
    constructor(tagName, text = "") {
      this.tagName = tagName
      this.textContent = text
      this.innerHTML = ""
      this.children = []
      this.attributes = new Map()
      this.dataset = {}
      this.listeners = new Map()
      this.className = ""
      this.id = ""
      this.tabIndex = -1
      this.hidden = false
      this.clientHeight = 0
      this.focused = false
      this.rect = null
      this.style = {
        cssText: "",
        setProperty: (key, value) => this.attributes.set(`style:${key}`, value),
        removeProperty: (key) => this.attributes.delete(`style:${key}`),
      }
      this.classList = {
        add: (...names) => this.setClasses([...this.classes(), ...names]),
        remove: (...names) =>
          this.setClasses(this.classes().filter((name) => !names.includes(name))),
        toggle: (name, force) => {
          const present = this.classes().includes(name)
          const next = force == null ? !present : force
          this.setClasses(
            next
              ? [...this.classes(), name]
              : this.classes().filter((candidate) => candidate !== name),
          )
          return next
        },
        contains: (name) => this.classes().includes(name),
      }
    }
    classes() {
      return this.className.split(/\s+/).filter(Boolean)
    }
    setClasses(names) {
      this.className = [...new Set(names)].join(" ")
    }
    setAttribute(key, value) {
      this.attributes.set(key, String(value))
    }
    getAttribute(key) {
      return this.attributes.get(key) ?? null
    }
    removeAttribute(key) {
      this.attributes.delete(key)
    }
    append(...children) {
      this.children.push(...children)
      for (const child of children) if (child && typeof child === "object") child.parentNode = this
    }
    replaceChildren(...children) {
      this.children = []
      this.append(...children)
    }
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) || []
      listeners.push(listener)
      this.listeners.set(type, listeners)
    }
    removeEventListener(type, listener) {
      this.listeners.set(
        type,
        (this.listeners.get(type) || []).filter((candidate) => candidate !== listener),
      )
    }
    cloneNode(deep) {
      const clone = new FakeNode(this.tagName, this.textContent)
      clone.className = this.className
      clone.hidden = this.hidden
      if (deep) clone.append(...this.children.map((child) => child.cloneNode?.(true) || child))
      return clone
    }
    remove() {
      if (this.parentNode)
        this.parentNode.children = this.parentNode.children.filter((child) => child !== this)
    }
    focus() {
      this.focused = true
    }
    getBoundingClientRect() {
      return this.rect || { left: 0, top: 0, width: 360, height: 20 }
    }
  }
  const findByClass = (node, className) => {
    if (node.classList?.contains(className)) return node
    for (const child of node.children || []) {
      const found = findByClass(child, className)
      if (found) return found
    }
    return null
  }
  const findAllByClass = (node, className, found = []) => {
    if (node.classList?.contains(className)) found.push(node)
    for (const child of node.children || []) findAllByClass(child, className, found)
    return found
  }
  const findByAttribute = (node, name, value) => {
    if (node.attributes?.get(name) === value) return node
    for (const child of node.children || []) {
      const found = findByAttribute(child, name, value)
      if (found) return found
    }
    return null
  }
  const findByTag = (node, tagName) => {
    if (node.tagName === tagName) return node
    for (const child of node.children || []) {
      const found = findByTag(child, tagName)
      if (found) return found
    }
    return null
  }
  const previous = {
    document: globalThis.document,
    matchMedia: globalThis.matchMedia,
    getComputedStyle: globalThis.getComputedStyle,
    ResizeObserver: globalThis.ResizeObserver,
  }
  const documentListeners = new Map()
  globalThis.document = {
    createElement: (tagName) => new FakeNode(tagName),
    createElementNS: (_namespace, tagName) => new FakeNode(tagName),
    createTextNode: (value) => new FakeNode("#text", value),
    addEventListener(type, listener) {
      documentListeners.set(type, listener)
    },
    removeEventListener(type) {
      documentListeners.delete(type)
    },
  }
  const mediaQueries = []
  let mediaMatches = false
  globalThis.matchMedia = () => {
    const listeners = []
    const query = {
      matches: mediaMatches,
      listeners,
      addEventListener(type, listener) {
        if (type === "change") listeners.push(listener)
      },
      removeEventListener(type, listener) {
        if (type === "change")
          query.listeners = query.listeners.filter((candidate) => candidate !== listener)
      },
    }
    mediaQueries.push(query)
    return query
  }
  globalThis.getComputedStyle = () => ({ rowGap: "0", lineHeight: "10" })
  const resizeObservers = []
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback
      this.observed = []
      this.disconnected = false
      resizeObservers.push(this)
    }
    observe(node) {
      this.observed.push(node)
    }
    disconnect() {
      this.disconnected = true
    }
    trigger() {
      this.callback()
    }
  }
  try {
    const api = loadEngine(readFileSync(join(here, "generated", "engine.js"), "utf8"))
    for (const [file, algorithm] of [
      ["Exponential Search.md", "exponential-search"],
      ["Interpolation Search.md", "interpolation-search"],
      ["Jump Search.md", "jump-search"],
    ]) {
      const note = readFileSync(
        join(
          repoRoot,
          "Vault",
          "Home",
          "Computer Science",
          "Algorithms",
          "Search Algorithms",
          file,
        ),
        "utf8",
      )
      const config = [...note.matchAll(/```steptrace\n([\s\S]*?)\n```/g)]
        .map((match) => JSON.parse(match[1]))
        .find((candidate) => candidate.algorithm === algorithm)
      const quartzConfig = JSON.parse(JSON.stringify(config))
      assert.equal(typeof config.target, "number", `${file} must give Obsidian a numeric target`)
      assert.equal(
        typeof quartzConfig.target,
        "number",
        `${file} must give Quartz a numeric target`,
      )
      const searchRoot = new FakeNode("div")
      let searchHandle
      assert.doesNotThrow(() => {
        searchHandle = api.mount(searchRoot, quartzConfig)
      })
      assert.equal(searchRoot.dataset.visualFamily, "indexed-array-search")
      searchHandle.destroy()
    }

    const rabinRoot = new FakeNode("div")
    const rabinHandle = api.mount(rabinRoot, {
      algorithm: "rabin-karp",
      text: "ABABACABA",
      pattern: "ABAC",
    })
    const rabinPhaseCopy = findByClass(rabinRoot, "steptrace__phase-copy")
    assert.match(rabinPhaseCopy.textContent, /Rabin-Karp search/)
    findByAttribute(rabinRoot, "aria-label", "Step forward").listeners.get("click")[0]()
    assert.equal(rabinPhaseCopy.textContent, "")
    assert.match(
      findAllByClass(rabinRoot, "steptrace__log-text")
        .map((line) => line.textContent)
        .join(" "),
      /Window \[0, 3\]: window hash \d+ [=≠] pattern hash \d+/,
    )
    rabinHandle.destroy()

    const root = new FakeNode("div")
    let handle
    assert.doesNotThrow(() => {
      handle = api.mount(root, {
        algorithm: "trie",
        operations: [
          ["insert", "car"],
          ["insert", "card"],
          ["insert", "care"],
          ["insert", "cat"],
          ["insert", "dog"],
          ["prefix", "ca"],
          ["search", "car"],
        ],
      })
    })
    assert.equal(root.dataset.visualFamily, "prefix-character")
    assert.equal(findByTag(root, "title").textContent, "Trie insert: car")
    assert.equal(findByClass(root, "steptrace__prefix-text").hidden, true)
    assert.equal(
      findByClass(root, "steptrace__insight-text").textContent,
      "Stored keys car, card, care, cat, dog · 10 trie nodes.",
    )
    const foot = findByClass(root, "steptrace__foot")
    assert.deepEqual(
      foot.children.map((child) => child.className),
      ["steptrace__phase", "steptrace__transport", "steptrace__timeline", "steptrace__utility"],
    )
    const phaseName = findByClass(root, "steptrace__phase-name")
    const phaseCopy = findByClass(root, "steptrace__phase-copy")
    assert.ok(phaseCopy.textContent)
    const milestones = findAllByClass(root, "steptrace__milestone")
    assert.ok(milestones.length > 1)
    assert.ok(milestones.every((milestone) => findByClass(milestone, "steptrace__milestone-label")))
    assert.equal(milestones[0].attributes.get("style:--start"), "0%")
    assert.notEqual(
      milestones[0].attributes.get("style:--start"),
      milestones[0].attributes.get("style:--end"),
    )
    const forward = findByAttribute(root, "aria-label", "Step forward")
    const phaseLabels = [phaseName.textContent]
    while (!forward.disabled) {
      forward.listeners.get("click")[0]()
      phaseLabels.push(phaseName.textContent)
    }
    assert.deepEqual(
      [...new Set(phaseLabels)],
      [
        "Insert car",
        "Insert card",
        "Insert care",
        "Insert cat",
        "Insert dog",
        "Prefix ca",
        "Search car",
        "Trie complete",
      ],
    )
    assert.doesNotMatch(phaseLabels.join(" "), /\bShift\b/)
    const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
    assert.match(sharedStyles, /\.steptrace__foot \{[^}]*grid-template-areas:/s)
    assert.match(
      sharedStyles,
      /\.steptrace__milestone-label \{[^}]*left: 50%;[^}]*transform: translate\(-50%, 0\.2rem\);/s,
    )
    const renderSource = readFileSync(join(here, "src", "render.ts"), "utf8")
    for (const icon of ["rotate-ccw", "skip-back", "play", "pause", "skip-forward", "ellipsis"])
      assert.match(renderSource, new RegExp(`lucide-${icon}`))
    handle.destroy()

    const branchRoot = new FakeNode("div")
    const branchHandle = api.mount(branchRoot, { algorithm: "branch-and-bound" })
    assert.equal(branchRoot.dataset.visualFamily, "execution-tree")
    assert.equal(branchRoot.classList.contains("steptrace--stable-stage"), true)
    assert.equal(
      findByTag(branchRoot, "title").textContent,
      "Branch and bound knapsack decision tree: divide",
    )
    assert.equal(
      findByClass(branchRoot, "steptrace__insight-text").textContent,
      "Best value 105 · take A + C · weight 7/7 · 7 branches pruned.",
    )
    assert.deepEqual(
      findAllByClass(branchRoot, "steptrace__watch-k").map((row) => row.textContent),
      ["decision", "load", "upper bound", "incumbent"],
    )
    const branchForward = findByAttribute(branchRoot, "aria-label", "Step forward")
    while (!branchForward.disabled) branchForward.listeners.get("click")[0]()
    assert.equal(findByClass(branchRoot, "steptrace__phase-name").textContent, "Best value 105")
    assert.match(findByTag(branchRoot, "desc").textContent, /best feasible set is A \+ C/i)
    branchHandle.destroy()

    const aStarRoot = new FakeNode("div")
    const aStarHandle = api.mount(aStarRoot, {
      algorithm: "a-star",
      variant: "coordinate-grid",
    })
    assert.equal(findByClass(aStarRoot, "steptrace__graph-state").dataset.racks, undefined)
    assert.equal(findAllByClass(aStarRoot, "steptrace__gs-racks").length, 0)
    aStarHandle.destroy()

    const bellmanRoot = new FakeNode("div")
    const bellmanHandle = api.mount(bellmanRoot, { algorithm: "bellman-ford" })
    assert.equal(bellmanRoot.dataset.visualFamily, "graph-state")
    assert.equal(findByClass(bellmanRoot, "steptrace__graph-state").dataset.racks, undefined)
    assert.equal(findAllByClass(bellmanRoot, "steptrace__gs-racks").length, 0)
    assert.equal(
      findByClass(bellmanRoot, "steptrace__insight-text").textContent,
      "Distances 0:0, 1:4, 2:2, 3:5.",
    )
    bellmanHandle.destroy()

    const ahoRoot = new FakeNode("div")
    const ahoHandle = api.mount(ahoRoot, {
      algorithm: "aho-corasick",
      patterns: ["he", "she", "his", "hers"],
      text: "ushers",
    })
    assert.equal(ahoRoot.dataset.visualFamily, "prefix-character")
    assert.equal(findByTag(ahoRoot, "title").textContent, "Aho-Corasick insert: he")
    assert.equal(
      findByClass(ahoRoot, "steptrace__insight-text").textContent,
      "Matches she@3, he@3, hers@5.",
    )
    const ahoTextRow = findByClass(ahoRoot, "steptrace__prefix-text")
    const ahoTextCells = findAllByClass(ahoRoot, "steptrace__prefix-text-cell")
    assert.equal(ahoTextCells.map((cell) => cell.textContent).join(""), "ushers")
    assert.equal(ahoTextRow.hidden, false)
    assert.equal(ahoTextRow.dataset.visible, "0")
    assert.equal(ahoTextRow.attributes.get("aria-hidden"), "true")
    const ahoForward = findByAttribute(ahoRoot, "aria-label", "Step forward")
    const ahoPhase = findByClass(ahoRoot, "steptrace__phase-name")
    const ahoLabels = [ahoPhase.textContent]
    let sawActiveTextCursor = false
    let sawMatchedText = false
    while (!ahoForward.disabled) {
      ahoForward.listeners.get("click")[0]()
      ahoLabels.push(ahoPhase.textContent)
      sawActiveTextCursor ||= ahoTextCells.some((cell) => cell.dataset.active === "1")
      sawMatchedText ||= ahoTextCells.some((cell) => cell.dataset.matched === "1")
    }
    assert.equal(findByClass(ahoRoot, "steptrace__prefix-text"), ahoTextRow)
    assert.equal(ahoTextRow.hidden, false)
    assert.equal(ahoTextRow.dataset.visible, "1")
    assert.equal(ahoTextRow.attributes.get("aria-hidden"), "false")
    assert.equal(sawActiveTextCursor, true)
    assert.equal(sawMatchedText, true)
    assert.ok(ahoLabels.includes("Emit she + he"))
    assert.ok(ahoLabels.includes("Emit hers"))
    assert.equal(ahoLabels.at(-1), "Scan complete")
    ahoHandle.destroy()

    const tstRoot = new FakeNode("div")
    const tstHandle = api.mount(tstRoot, {
      algorithm: "ternary-search-tree",
      operations: [
        ["insert", "cat"],
        ["insert", "car"],
        ["insert", "cup"],
        ["insert", "bat"],
        ["search", "car"],
      ],
    })
    assert.equal(tstRoot.dataset.visualFamily, "prefix-character")
    assert.equal(findByTag(tstRoot, "title").textContent, "Ternary Search Tree insert: cat")
    assert.equal(findByClass(tstRoot, "steptrace__prefix-text").hidden, true)
    assert.equal(
      findByClass(tstRoot, "steptrace__insight-text").textContent,
      "4 terminal keys · 9 character nodes.",
    )
    const tstForward = findByAttribute(tstRoot, "aria-label", "Step forward")
    const tstPhase = findByClass(tstRoot, "steptrace__phase-name")
    while (!tstForward.disabled) tstForward.listeners.get("click")[0]()
    assert.equal(tstPhase.textContent, "TST complete")
    tstHandle.destroy()

    const queueRoot = new FakeNode("div")
    const queueHandle = api.mount(queueRoot, { algorithm: "queue" })
    const queueInput = findByAttribute(queueRoot, "aria-label", "Value to enqueue")
    const enqueue = findByClass(queueRoot, "steptrace__queue-action--primary")
    const dequeue = findAllByClass(queueRoot, "steptrace__queue-action").find(
      (button) => button.textContent === "Dequeue",
    )
    const queueReset = findByClass(queueRoot, "steptrace__queue-reset")
    const queueStatus = findByClass(queueRoot, "steptrace__queue-status")
    const queueCells = findAllByClass(queueRoot, "steptrace__contiguous-cell")
    const queueCounter = findByClass(queueRoot, "steptrace__counter")
    const queueControls = findByClass(queueRoot, "steptrace__structure-controls")
    const click = (node) => node.listeners.get("click")[0]()
    const enter = () =>
      queueInput.listeners.get("keydown")[0]({
        key: "Enter",
        preventDefault() {},
      })
    const enqueueValue = (value, withEnter = false) => {
      queueInput.value = value
      if (withEnter) enter()
      else click(enqueue)
    }

    assert.equal(queueRoot.dataset.visualFamily, "contiguous-storage")
    assert.equal(dequeue.disabled, true)
    assert.equal(enqueue.disabled, false)
    assert.equal(queueCounter.innerHTML, "<b>0</b> / 6")
    assert.equal(queueInput.placeholder, "Value")
    assert.equal(queueControls.classList.contains("steptrace__foot"), true)
    assert.equal(findByClass(queueRoot, "steptrace__rail-label"), null)
    assert.equal(findByClass(queueRoot, "steptrace__queue-order"), null)
    assert.equal(findByClass(queueRoot, "steptrace__contiguous-marker"), null)
    assert.equal(findByClass(queueRoot, "steptrace__queue-state"), null)
    assert.equal(findByClass(queueRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(queueRoot, "steptrace__transport"), null)
    assert.equal(queueCells[0].children[1].textContent, "HEAD / TAIL")
    assert.equal(queueCells[1].children[1].textContent, "1")
    assert.equal(queueCells[0].attributes.get("aria-label"), "slot 0, empty, head and tail")

    enqueueValue("A", true)
    for (const value of ["B", "C", "D", "E", "F"]) enqueueValue(value)
    assert.equal(queueCounter.innerHTML, "<b>6</b> / 6")
    assert.equal(enqueue.disabled, true)
    assert.equal(queueInput.disabled, true)
    assert.equal(queueCells[0].children[1].textContent, "HEAD / TAIL")
    assert.equal(queueCells[0].attributes.get("aria-label"), "slot 0, value A, head and tail")

    click(dequeue)
    click(dequeue)
    enqueueValue("G")
    enqueueValue("H")
    assert.equal(queueCounter.innerHTML, "<b>6</b> / 6")
    assert.equal(queueCells[2].children[1].textContent, "HEAD / TAIL")
    assert.equal(queueCells[2].attributes.get("aria-label"), "slot 2, value C, head and tail")
    assert.deepEqual(
      queueCells.map((cell) => cell.children[0].textContent),
      ["G", "H", "C", "D", "E", "F"],
    )

    click(queueReset)
    assert.equal(queueCounter.innerHTML, "<b>0</b> / 6")
    assert.equal(dequeue.disabled, true)
    assert.match(queueStatus.textContent, /Queue reset/)
    click(enqueue)
    assert.match(queueCells[0].children[0].textContent, /^\d{2}$/)
    assert.equal(queueCells[0].children[1].textContent, "HEAD")
    assert.equal(queueCells[1].children[1].textContent, "TAIL")
    assert.match(queueStatus.textContent, /Enqueued \d{2} at slot 0/)

    const listeners = [enqueue, dequeue, queueReset, queueInput]
    queueHandle.destroy()
    assert.equal(queueRoot.children.length, 0)
    assert.equal(queueRoot.dataset.visualFamily, undefined)
    assert.ok(
      listeners.every((node) => [...node.listeners.values()].every((items) => !items.length)),
    )

    const stackRoot = new FakeNode("div")
    const stackHandle = api.mount(stackRoot, {
      algorithm: "stack",
      capacity: 6,
      values: ["A", "B", "C"],
    })
    const stackInput = findByAttribute(stackRoot, "aria-label", "Value to push")
    const stackButtons = findAllByClass(stackRoot, "steptrace__structure-action")
    const stackButton = (label) => stackButtons.find((button) => button.textContent === label)
    const stackStatus = findByClass(stackRoot, "steptrace__structure-status")
    const stackCounter = findByClass(stackRoot, "steptrace__counter")
    const stackCells = findAllByClass(stackRoot, "steptrace__stack-cell")

    assert.equal(stackRoot.dataset.visualFamily, "stack-sequence")
    assert.equal(stackRoot.dataset.structure, "stack")
    assert.equal(stackRoot.attributes.get("role"), "group")
    assert.equal(stackCells.length, 6)
    assert.equal(stackCounter.innerHTML, "<b>3</b> / 6")
    assert.equal(stackStatus.textContent, "Push a value to begin.")
    assert.equal(findByClass(stackRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(stackRoot, "steptrace__transport"), null)
    assert.equal(
      findByAttribute(stackRoot, "aria-label", "stack slot 2, value C, top").children[1]
        .textContent,
      "TOP · 2",
    )

    stackInput.value = "D"
    click(stackButton("Push"))
    assert.equal(stackCounter.innerHTML, "<b>4</b> / 6")
    assert.match(stackStatus.textContent, /Pushed D/)
    assert.equal(
      findByAttribute(stackRoot, "aria-label", "stack slot 3, value D, top").dataset.operation,
      "push",
    )
    click(stackButton("Peek"))
    assert.equal(stackCounter.innerHTML, "<b>4</b> / 6")
    assert.equal(stackStatus.textContent, "Peeked D. The stack did not change.")
    click(stackButton("Pop"))
    assert.equal(stackCounter.innerHTML, "<b>3</b> / 6")
    assert.equal(stackStatus.textContent, "Popped D.")
    const poppedStackCell = findByAttribute(stackRoot, "aria-label", "stack slot 3, empty")
    assert.equal(poppedStackCell.dataset.operation, "pop")
    assert.equal(poppedStackCell.children[2].textContent, "D")
    click(stackButton("Pop"))
    click(stackButton("Pop"))
    click(stackButton("Pop"))
    assert.equal(stackCounter.innerHTML, "<b>0</b> / 6")
    click(stackButton("Pop"))
    assert.match(stackStatus.textContent, /underflow/)
    assert.equal(stackCounter.innerHTML, "<b>0</b> / 6")
    click(stackButton("Peek"))
    assert.match(stackStatus.textContent, /underflow/)
    assert.equal(stackCounter.innerHTML, "<b>0</b> / 6")

    const stackRandom = Math.random
    Math.random = () => 0
    click(stackButton("Push"))
    Math.random = stackRandom
    assert.equal(
      findByAttribute(stackRoot, "aria-label", "stack slot 0, value 10, top") != null,
      true,
    )
    click(stackButton("Reset"))
    assert.equal(stackCounter.innerHTML, "<b>3</b> / 6")
    assert.match(stackStatus.textContent, /reset to 3 initial values/)

    const stackListeners = [stackInput, ...stackButtons]
    stackHandle.destroy()
    assert.equal(stackRoot.children.length, 0)
    assert.equal(stackRoot.dataset.visualFamily, undefined)
    assert.ok(
      stackListeners.every((node) => [...node.listeners.values()].every((items) => !items.length)),
    )

    const graphRoot = new FakeNode("div")
    const graphHandle = api.mount(graphRoot, { algorithm: "graph" })
    const graphFrom = findByAttribute(graphRoot, "aria-label", "From vertex")
    const graphTo = findByAttribute(graphRoot, "aria-label", "To vertex")
    const graphButtons = findAllByClass(graphRoot, "steptrace__structure-action")
    const graphAdd = graphButtons.find((button) => button.textContent === "Add edge")
    const graphRemove = graphButtons.find((button) => button.textContent === "Remove edge")
    const graphReset = graphButtons.find((button) => button.textContent === "Reset")
    const graphStatus = findByClass(graphRoot, "steptrace__structure-status")
    const graphCounter = findByClass(graphRoot, "steptrace__counter")
    const graphControls = findByClass(graphRoot, "steptrace__structure-controls")
    const graphStorage = findByClass(graphRoot, "steptrace__graph-rep-storage")
    const graphMatrixPanel = findByClass(graphRoot, "steptrace__graph-rep-matrix")
    const graphLists = findByClass(graphRoot, "steptrace__graph-rep-lists")
    const graphListRows = findAllByClass(graphRoot, "steptrace__graph-rep-list-row")
    const graphEdgeRows = findAllByClass(graphRoot, "steptrace__graph-rep-edge-row")
    const graphSvg = findByTag(graphRoot, "svg")
    const graphTopologyEdges = graphSvg.children[1].children
    const graphMatrixCell = (from, to) =>
      findByAttribute(graphRoot, "aria-label", `edge ${from} to ${to}`)
    const graphTopologyEdge = (from, to) =>
      graphTopologyEdges.find((edge) => edge.dataset.edge === `${from}|${to}`)
    const storedGraphEdges = () =>
      graphEdgeRows
        .filter((row) => row.dataset.empty === "0")
        .map((row) => row.children[0].textContent)
    const graphNeighbors = (vertex) => graphListRows[vertex].children[0].textContent
    const graphMatrixValue = (from, to) => graphMatrixCell(from, to).children[0].textContent

    assert.equal(graphRoot.dataset.visualFamily, "graph-representation")
    assert.equal(graphControls.classList.contains("steptrace__graph-rep-controls"), false)
    assert.equal(graphRoot.attributes.get("role"), "group")
    assert.equal(findByClass(graphRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(graphRoot, "steptrace__transport"), null)
    assert.equal(graphSvg.attributes.get("role"), "img")
    assert.equal(findByClass(graphRoot, "steptrace__dp-wrap").tagName, "div")
    assert.equal(findByClass(graphRoot, "steptrace__dp").tagName, "table")
    assert.equal(graphStorage.children[0], graphMatrixPanel)
    assert.equal(graphStorage.children[1], graphLists)
    assert.equal(graphLists.children.length, 2)
    assert.equal(graphFrom.classList.contains("steptrace__select"), true)
    assert.equal(graphTo.classList.contains("steptrace__select"), true)
    assert.equal(graphFrom.value, "")
    assert.equal(graphTo.value, "")
    assert.equal(graphFrom.children[0].textContent, "From")
    assert.equal(graphTo.children[0].textContent, "To")
    assert.equal(graphFrom.children[0].disabled, true)
    assert.equal(graphTo.children[0].disabled, true)
    assert.equal(findAllByClass(graphRoot, "steptrace__contiguous-array").length, 2)
    assert.equal(findAllByClass(graphRoot, "steptrace__graph-rep-list-body").length, 1)
    assert.equal(findAllByClass(graphRoot, "steptrace__graph-rep-edge-strip").length, 1)
    assert.equal(graphEdgeRows.length, 12)
    assert.deepEqual(
      graphListRows.map((row) => row.children[1].textContent),
      ["vertex 0", "vertex 1", "vertex 2", "vertex 3"],
    )
    assert.equal(graphCounter.innerHTML, "<b>4</b> edges")
    assert.equal(graphStatus.textContent, "Add or remove an edge to inspect each representation.")
    assert.deepEqual(storedGraphEdges(), ["0 → 1", "0 → 2", "1 → 3", "2 → 3"])
    assert.equal(graphNeighbors(3), "∅")
    assert.equal(graphMatrixValue("3", "0"), "0")
    assert.equal(graphTopologyEdge("3", "0").dataset.present, "0")

    graphFrom.value = "3"
    graphTo.value = "0"
    click(graphAdd)
    assert.equal(graphCounter.innerHTML, "<b>5</b> edges")
    assert.equal(graphNeighbors(3), "0")
    assert.equal(graphMatrixValue("3", "0"), "1")
    assert.equal(graphMatrixCell("3", "0").dataset.changed, "1")
    assert.equal(graphTopologyEdge("3", "0").dataset.present, "1")
    assert.equal(graphTopologyEdge("3", "0").dataset.changed, "1")
    assert.deepEqual(storedGraphEdges().at(-1), "3 → 0")
    assert.match(graphStatus.textContent, /Added 3 → 0/)

    click(graphAdd)
    assert.equal(graphCounter.innerHTML, "<b>5</b> edges")
    assert.equal(storedGraphEdges().filter((edge) => edge === "3 → 0").length, 1)
    assert.match(graphStatus.textContent, /already exists/)

    graphTo.value = "3"
    click(graphAdd)
    assert.equal(graphCounter.innerHTML, "<b>5</b> edges")
    assert.match(graphStatus.textContent, /Self-edges/)

    graphTo.value = "1"
    click(graphAdd)
    assert.equal(graphCounter.innerHTML, "<b>6</b> edges")
    assert.deepEqual(graphNeighbors(3), "0, 1")
    graphTo.value = "0"
    click(graphRemove)
    assert.equal(graphCounter.innerHTML, "<b>5</b> edges")
    assert.equal(graphNeighbors(3), "1")
    assert.equal(graphMatrixValue("3", "0"), "0")
    assert.equal(graphTopologyEdge("3", "0").dataset.present, "0")
    assert.equal(graphTopologyEdge("3", "0").dataset.changed, "0")
    assert.deepEqual(storedGraphEdges().at(-1), "3 → 1")

    graphTo.value = "2"
    click(graphRemove)
    assert.equal(graphCounter.innerHTML, "<b>5</b> edges")
    assert.match(graphStatus.textContent, /does not exist/)

    click(graphReset)
    assert.equal(graphCounter.innerHTML, "<b>4</b> edges")
    assert.equal(graphNeighbors(3), "∅")
    assert.equal(graphMatrixValue("3", "1"), "0")
    assert.deepEqual(storedGraphEdges(), ["0 → 1", "0 → 2", "1 → 3", "2 → 3"])
    assert.match(graphStatus.textContent, /Graph reset/)

    const graphListeners = [graphAdd, graphRemove, graphReset]
    graphHandle.destroy()
    assert.equal(graphRoot.children.length, 0)
    assert.equal(graphRoot.dataset.visualFamily, undefined)
    assert.ok(
      graphListeners.every((node) => [...node.listeners.values()].every((items) => !items.length)),
    )

    const avlRoot = new FakeNode("div")
    const avlHandle = api.mount(avlRoot, {
      algorithm: "avl-tree",
      values: [30, 20, 40, 10],
      value: 5,
    })
    const avlInput = findByAttribute(avlRoot, "aria-label", "AVL key")
    const avlButtons = findAllByClass(avlRoot, "steptrace__structure-action")
    const avlButton = (label) => avlButtons.find((button) => button.textContent === label)
    const avlStatus = findByClass(avlRoot, "steptrace__structure-status")
    const avlNodes = () =>
      findByTag(avlRoot, "svg").children[1].children.filter((node) => node.tagName === "g")

    assert.equal(avlRoot.dataset.visualFamily, "binary-tree")
    assert.equal(avlRoot.dataset.structure, "avl-tree")
    assert.equal(findByClass(avlRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(avlRoot, "steptrace__transport"), null)
    assert.equal(findByTag(avlRoot, "svg").attributes.get("role"), "img")
    assert.equal(findByClass(avlRoot, "steptrace__counter").innerHTML, "<b>4</b> keys")
    assert.equal(avlInput.value, "5")
    assert.equal(findAllByClass(avlRoot, "steptrace__structure-input").length, 1)
    assert.deepEqual(
      avlButtons.map((button) => button.textContent),
      ["Insert", "Search", "Remove", "Reset"],
    )

    click(avlButton("Insert"))
    assert.match(avlStatus.textContent, /LL at 20 restored/)
    assert.ok(
      avlNodes().some(
        (node) => node.attributes.get("aria-label") === "Key 10, height 2, balance factor 0",
      ),
    )
    assert.equal(avlNodes().filter((node) => node.dataset.state === "rotation").length >= 2, true)

    avlInput.value = "5"
    click(avlButton("Insert"))
    assert.match(avlStatus.textContent, /already exists/)
    assert.equal(findByClass(avlRoot, "steptrace__counter").innerHTML, "<b>5</b> keys")

    avlInput.value = "40"
    click(avlButton("Search"))
    assert.match(avlStatus.textContent, /Search path 30 → 40 found 40/)
    assert.equal(avlNodes().filter((node) => node.dataset.state === "path").length, 2)

    click(avlButton("Reset"))
    assert.equal(findByClass(avlRoot, "steptrace__counter").innerHTML, "<b>4</b> keys")
    assert.equal(avlInput.value, "5")
    assert.match(avlStatus.textContent, /initial AVL tree/)
    avlHandle.destroy()
    assert.equal(avlRoot.children.length, 0)
    assert.ok(
      [avlInput, ...avlButtons].every((node) =>
        [...node.listeners.values()].every((items) => !items.length),
      ),
    )

    for (const { values, inserted, rotation } of [
      { values: [10, 20], inserted: 30, rotation: "RR at 10" },
      { values: [30, 10], inserted: 20, rotation: "LR at 30" },
      { values: [10, 30], inserted: 20, rotation: "RL at 10" },
    ]) {
      const rotationRoot = new FakeNode("div")
      const rotationHandle = api.mount(rotationRoot, { algorithm: "avl-tree", values })
      findByAttribute(rotationRoot, "aria-label", "AVL key").value = String(inserted)
      click(
        findAllByClass(rotationRoot, "steptrace__structure-action").find(
          (button) => button.textContent === "Insert",
        ),
      )
      assert.match(
        findByClass(rotationRoot, "steptrace__structure-status").textContent,
        new RegExp(rotation),
      )
      rotationHandle.destroy()
    }

    const deleteAvlRoot = new FakeNode("div")
    const deleteAvlHandle = api.mount(deleteAvlRoot, {
      algorithm: "avl-tree",
      values: [9, 5, 10, 0, 6, 11, -1, 1, 2],
    })
    const deleteInput = findByAttribute(deleteAvlRoot, "aria-label", "AVL key")
    deleteInput.value = "10"
    click(
      findAllByClass(deleteAvlRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Remove",
      ),
    )
    assert.match(findByClass(deleteAvlRoot, "steptrace__structure-status").textContent, / at /)
    assert.ok(
      findAllByClass(deleteAvlRoot, "steptrace__binary-tree-node").every((node) =>
        /balance factor -?1|balance factor 0/.test(node.attributes.get("aria-label")),
      ),
    )
    deleteAvlHandle.destroy()

    const treeButtons = (root) => findAllByClass(root, "steptrace__structure-action")
    const treeButton = (root, label) =>
      treeButtons(root).find((button) => button.textContent === label)
    const treeNodes = (root) =>
      findByTag(root, "svg").children[1].children.filter(
        (item) => item.tagName === "g" && item.dataset.exiting !== "1",
      )
    const treeEdges = (root) =>
      findByTag(root, "svg").children[0].children.filter(
        (item) => item.tagName === "line" && item.dataset.exiting !== "1",
      )
    const treeRootKey = (root) => {
      const edges = treeEdges(root)
      const children = new Set(edges.map((edge) => edge.dataset.to))
      const rootKey = edges.map((edge) => edge.dataset.from).find((key) => !children.has(key))
      return Number(rootKey ?? treeNodes(root)[0].dataset.key)
    }
    const assertOrderedTree = (root) => {
      const nodes = new Map(
        treeNodes(root).map((item) => [
          Number(item.dataset.key),
          { color: item.dataset.color, left: null, right: null },
        ]),
      )
      for (const edge of treeEdges(root))
        nodes.get(Number(edge.dataset.from))[edge.dataset.side] = Number(edge.dataset.to)
      const visit = (key) => {
        if (key == null) return []
        const current = nodes.get(key)
        return [...visit(current.left), key, ...visit(current.right)]
      }
      const ordered = visit(treeRootKey(root))
      assert.deepEqual(
        ordered,
        [...nodes.keys()].sort((a, b) => a - b),
      )
      return nodes
    }
    const assertRedBlackTree = (root) => {
      const nodes = assertOrderedTree(root)
      const rootKey = treeRootKey(root)
      assert.equal(nodes.get(rootKey).color, "black")
      const blackHeight = (key) => {
        if (key == null) return 1
        const current = nodes.get(key)
        if (current.color === "red") {
          assert.notEqual(current.left == null ? "black" : nodes.get(current.left).color, "red")
          assert.notEqual(current.right == null ? "black" : nodes.get(current.right).color, "red")
        }
        const left = blackHeight(current.left)
        const right = blackHeight(current.right)
        assert.equal(left, right)
        return left + (current.color === "black" ? 1 : 0)
      }
      blackHeight(rootKey)
    }

    const bstRoot = new FakeNode("div")
    const bstHandle = api.mount(bstRoot, {
      algorithm: "binary-search-tree",
      values: [40, 20, 60, 10, 30, 50, 70],
      value: 80,
    })
    const bstInput = findByAttribute(bstRoot, "aria-label", "Binary search tree key")
    click(treeButton(bstRoot, "Insert"))
    assert.match(findByClass(bstRoot, "steptrace__structure-status").textContent, /height 3 → 4/)
    assertOrderedTree(bstRoot)
    bstInput.value = "10"
    click(treeButton(bstRoot, "Remove"))
    assertOrderedTree(bstRoot)
    bstInput.value = "60"
    click(treeButton(bstRoot, "Remove"))
    assertOrderedTree(bstRoot)
    bstInput.value = "40"
    click(treeButton(bstRoot, "Remove"))
    assertOrderedTree(bstRoot)
    bstInput.value = "50"
    click(treeButton(bstRoot, "Search"))
    assert.match(findByClass(bstRoot, "steptrace__structure-status").textContent, /found 50/)
    click(treeButton(bstRoot, "Reset"))
    assert.equal(treeRootKey(bstRoot), 40)
    assert.equal(findByClass(bstRoot, "steptrace__counter").innerHTML, "<b>7</b> keys")
    bstHandle.destroy()

    for (const { values, removed } of [
      { values: [40, 20, 60, 10], removed: 20 },
      { values: [40, 20, 60, 10, 30, 50, 70], removed: 40 },
    ]) {
      const root = new FakeNode("div")
      const handle = api.mount(root, { algorithm: "binary-search-tree", values })
      findByAttribute(root, "aria-label", "Binary search tree key").value = String(removed)
      click(treeButton(root, "Remove"))
      assertOrderedTree(root)
      assert.equal(
        treeNodes(root).some((item) => item.dataset.key === String(removed)),
        false,
      )
      handle.destroy()
    }

    const rbRoot = new FakeNode("div")
    const rbHandle = api.mount(rbRoot, {
      algorithm: "red-black-tree",
      values: [10, 5, 15, 1],
      value: 0,
    })
    assertRedBlackTree(rbRoot)
    click(treeButton(rbRoot, "Insert"))
    assert.match(findByClass(rbRoot, "steptrace__structure-status").textContent, /Black-height/)
    assert.ok(treeNodes(rbRoot).filter((item) => item.dataset.state === "rotation").length >= 2)
    assertRedBlackTree(rbRoot)
    for (const removed of [15, 10, 1, 5]) {
      findByAttribute(rbRoot, "aria-label", "Red-black tree key").value = String(removed)
      click(treeButton(rbRoot, "Remove"))
      assert.match(findByClass(rbRoot, "steptrace__structure-status").textContent, /Black-height/)
      assertRedBlackTree(rbRoot)
    }
    findByAttribute(rbRoot, "aria-label", "Red-black tree key").value = "0"
    click(treeButton(rbRoot, "Search"))
    assert.match(findByClass(rbRoot, "steptrace__structure-status").textContent, /found 0/)
    click(treeButton(rbRoot, "Reset"))
    assertRedBlackTree(rbRoot)
    assert.equal(findByClass(rbRoot, "steptrace__counter").innerHTML, "<b>4</b> keys")
    rbHandle.destroy()

    for (const { values, searched, expectedCase } of [
      { values: [20, 10], searched: 10, expectedCase: "zig" },
      { values: [30, 20, 10], searched: 10, expectedCase: "zig-zig" },
      { values: [30, 10, 20], searched: 20, expectedCase: "zig-zag" },
    ]) {
      const root = new FakeNode("div")
      const handle = api.mount(root, { algorithm: "splay-tree", values, value: searched })
      click(treeButton(root, "Search"))
      assert.equal(treeRootKey(root), searched)
      assert.match(
        findByClass(root, "steptrace__structure-status").textContent,
        new RegExp(expectedCase),
      )
      assertOrderedTree(root)
      handle.destroy()
    }

    const splayRoot = new FakeNode("div")
    const splayHandle = api.mount(splayRoot, {
      algorithm: "splay-tree",
      values: [100, 50, 150, 25, 75, 60],
      value: 60,
    })
    click(treeButton(splayRoot, "Search"))
    assert.equal(treeRootKey(splayRoot), 60)
    assert.match(findByClass(splayRoot, "steptrace__structure-status").textContent, /zig-zag → zig/)
    const splayInput = findByAttribute(splayRoot, "aria-label", "Splay tree key")
    splayInput.value = "65"
    click(treeButton(splayRoot, "Search"))
    assert.equal(treeRootKey(splayRoot), 75)
    assert.match(
      findByClass(splayRoot, "steptrace__structure-status").textContent,
      /canonical splay moves last accessed 75 to the root/,
    )
    assertOrderedTree(splayRoot)
    splayInput.value = "65"
    click(treeButton(splayRoot, "Insert"))
    assert.equal(treeRootKey(splayRoot), 65)
    splayInput.value = "65"
    click(treeButton(splayRoot, "Remove"))
    assert.equal(
      treeNodes(splayRoot).some((item) => item.dataset.key === "65"),
      false,
    )
    assertOrderedTree(splayRoot)
    click(treeButton(splayRoot, "Reset"))
    assert.equal(treeRootKey(splayRoot), 100)
    assert.equal(splayInput.value, "60")
    splayHandle.destroy()

    const multiwayButtons = (root) => findAllByClass(root, "steptrace__structure-action")
    const multiwayButton = (root, label) =>
      multiwayButtons(root).find((button) => button.textContent === label)
    const findAllMultiway = (node, className, found = []) => {
      if ((node.attributes?.get("class") || "").split(/\s+/).includes(className)) found.push(node)
      for (const child of node.children || []) findAllMultiway(child, className, found)
      return found
    }
    const multiwayNodes = (root, role) =>
      findAllMultiway(root, "steptrace__multiway-tree-node").filter(
        (node) => role == null || node.dataset.role === role,
      )
    const multiwayKeys = (node) =>
      findAllMultiway(node, "steptrace__multiway-tree-cell")
        .map((cell) => Number(cell.dataset.key))
        .filter(Number.isFinite)

    const bTreeRoot = new FakeNode("div")
    const bTreeHandle = api.mount(bTreeRoot, {
      algorithm: "b-tree",
      values: [10, 20, 5],
      value: 6,
      order: 4,
    })
    assert.equal(bTreeRoot.dataset.visualFamily, "multiway-tree")
    assert.equal(bTreeRoot.dataset.structure, "b-tree")
    assert.equal(findByClass(bTreeRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(bTreeRoot, "steptrace__transport"), null)
    assert.equal(findByTag(bTreeRoot, "svg").attributes.get("role"), "img")
    assert.equal(findByTag(bTreeRoot, "svg").attributes.get("viewBox"), "0 0 360 280")
    assert.equal(
      findByClass(bTreeRoot, "steptrace__structure-status").attributes.get("role"),
      "status",
    )
    assert.equal(
      findByClass(bTreeRoot, "steptrace__structure-status").attributes.get("aria-live"),
      "polite",
    )
    assert.deepEqual(
      multiwayButtons(bTreeRoot).map((button) => button.textContent),
      ["Insert", "Search", "Reset"],
    )
    click(multiwayButton(bTreeRoot, "Insert"))
    assert.deepEqual(multiwayKeys(multiwayNodes(bTreeRoot, "internal")[0]), [10])
    assert.deepEqual(multiwayNodes(bTreeRoot, "leaf").map(multiwayKeys), [[5, 6], [20]])
    assert.equal(
      findAllMultiway(bTreeRoot, "steptrace__multiway-tree-cell").filter(
        (cell) => cell.dataset.state === "special",
      )[0].dataset.key,
      "10",
    )
    bTreeHandle.destroy()

    const bPlusRoot = new FakeNode("div")
    const bPlusHandle = api.mount(bPlusRoot, {
      algorithm: "b-plus-tree",
      values: [5, 9, 12, 17, 33, 40, 21],
      value: 25,
      range: [15, 40],
      order: 4,
    })
    assert.equal(bPlusRoot.dataset.visualFamily, "multiway-tree")
    assert.equal(bPlusRoot.dataset.structure, "b-plus-tree")
    assert.deepEqual(
      multiwayButtons(bPlusRoot).map((button) => button.textContent),
      ["Insert", "Search", "Range scan", "Reset"],
    )
    assert.deepEqual(
      findAllByClass(bPlusRoot, "steptrace__structure-input").map((input) => input.placeholder),
      ["Key", "From", "To"],
    )
    click(multiwayButton(bPlusRoot, "Insert"))
    assert.deepEqual(multiwayKeys(multiwayNodes(bPlusRoot, "internal")[0]), [12, 21, 33])
    assert.deepEqual(multiwayNodes(bPlusRoot, "leaf").map(multiwayKeys), [
      [5, 9],
      [12, 17],
      [21, 25],
      [33, 40],
    ])
    assert.deepEqual(
      findAllMultiway(bPlusRoot, "steptrace__multiway-tree-cell")
        .filter((cell) => cell.dataset.state === "special")
        .map((cell) => cell.dataset.key),
      ["21", "21"],
    )
    const bPlusKey = findByAttribute(bPlusRoot, "aria-label", "B+ tree key")
    bPlusKey.value = "21"
    click(multiwayButton(bPlusRoot, "Search"))
    assert.equal(
      multiwayNodes(bPlusRoot, "leaf").filter((node) => node.dataset.path === "1").length,
      1,
    )
    assert.equal(
      multiwayNodes(bPlusRoot, "internal").filter((node) => node.dataset.path === "1").length,
      1,
    )
    assert.deepEqual(
      findAllMultiway(bPlusRoot, "steptrace__multiway-tree-cell")
        .filter((cell) => cell.dataset.state === "found")
        .map((cell) => cell.dataset.key),
      ["21"],
    )
    click(multiwayButton(bPlusRoot, "Range scan"))
    assert.equal(
      findByClass(bPlusRoot, "steptrace__structure-status").textContent,
      "Range [15, 40] returned 17, 21, 25, 33, 40 by following leaf links.",
    )
    assert.deepEqual(
      findAllMultiway(bPlusRoot, "steptrace__multiway-tree-cell")
        .filter((cell) => cell.dataset.state === "found")
        .map((cell) => Number(cell.dataset.key)),
      [17, 21, 25, 33, 40],
    )
    assert.equal(
      multiwayNodes(bPlusRoot, "leaf").filter((node) => node.dataset.path === "1").length,
      3,
    )
    assert.equal(
      findAllMultiway(bPlusRoot, "steptrace__multiway-tree-link").filter(
        (link) => link.dataset.state === "active",
      ).length,
      2,
    )
    bPlusHandle.destroy()

    mediaMatches = true
    const reducedTreeRoot = new FakeNode("div")
    const reducedTreeHandle = api.mount(reducedTreeRoot, { algorithm: "b-tree" })
    assert.equal(reducedTreeRoot.classList.contains("steptrace--reduced"), true)
    reducedTreeHandle.destroy()
    mediaMatches = false

    const cappedTreeRoot = new FakeNode("div")
    api.mount(cappedTreeRoot, {
      algorithm: "binary-search-tree",
      values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    })
    assert.match(cappedTreeRoot.textContent, /supports at most 9 values/)

    const invalidHashRoot = new FakeNode("div")
    const invalidHashHandle = api.mount(invalidHashRoot, {
      algorithm: "hash-map",
      variant: "quadratic-probing",
    })
    assert.match(invalidHashRoot.textContent, /hash-map "variant" must be/)
    assert.equal(invalidHashRoot.dataset.visualFamily, undefined)
    invalidHashHandle.destroy()
    for (const config of [
      { algorithm: "hash-set", capacity: 10 },
      { algorithm: "hash-set", variant: "closed-addressing" },
      { algorithm: "bloom-filter", capacity: 12 },
      { algorithm: "bloom-filter", variant: "counting" },
    ]) {
      const invalidRoot = new FakeNode("div")
      const invalidHandle = api.mount(invalidRoot, config)
      assert.match(invalidRoot.textContent, /steptrace: (?:hash-set|bloom-filter)/)
      assert.equal(invalidRoot.dataset.visualFamily, undefined)
      invalidHandle.destroy()
    }

    const realSetTimeout = globalThis.setTimeout
    const realClearTimeout = globalThis.clearTimeout
    const realRandom = Math.random
    let timerSerial = 0
    const motionTimers = new Map()
    globalThis.setTimeout = (callback, delay = 0) => {
      const id = ++timerSerial
      motionTimers.set(id, { callback, delay })
      return id
    }
    globalThis.clearTimeout = (id) => motionTimers.delete(id)
    const flushNextMotion = () => {
      const next = motionTimers.entries().next().value
      if (!next) return
      const [id, { callback }] = next
      motionTimers.delete(id)
      callback()
    }
    const flushMotion = () => {
      while (motionTimers.size) flushNextMotion()
    }
    const currentHashRoot = (root, index) =>
      findAllByClass(root, "steptrace__hash-index")[index].parentNode.parentNode
    const hashControls = (root) => findByClass(root, "steptrace__hash-controls")
    const hashInput = (root, label) => findByAttribute(root, "aria-label", label)
    const hashButton = (root, label) =>
      findAllByClass(root, "steptrace__structure-action").find(
        (button) => button.textContent === label,
      )
    const putHash = (root, key, value) => {
      hashInput(root, "Hash map key").value = String(key)
      hashInput(root, "Hash map value").value = value
      click(hashButton(root, "Put"))
      flushMotion()
    }

    const hashMediaIndex = mediaQueries.length
    const hashRoot = new FakeNode("div")
    const hashHandle = api.mount(hashRoot, {
      tabs: [
        {
          name: "Closed Addressing",
          algorithm: "hash-map",
          variant: "closed-addressing",
        },
        {
          name: "Open Addressing",
          algorithm: "hash-map",
          variant: "open-addressing",
        },
        { name: "Bucket Hashing", algorithm: "hash-map", variant: "buckets" },
      ],
    })
    const tabButtons = findAllByClass(hashRoot, "steptrace__tab")
    const closedRoot = currentHashRoot(hashRoot, 0)
    const closedKey = hashInput(closedRoot, "Hash map key")
    const closedValue = hashInput(closedRoot, "Hash map value")
    const closedInteractive = [
      closedKey,
      closedValue,
      ...findAllByClass(closedRoot, "steptrace__structure-action"),
    ]

    assert.equal(tabButtons.length, 3)
    assert.equal(closedRoot.dataset.visualFamily, "hash-index")
    assert.equal(findAllByClass(closedRoot, "steptrace__hash-cell").length, 12)
    assert.equal(findByClass(closedRoot, "steptrace__hash-buckets").attributes.get("role"), "list")
    assert.equal(closedKey.type, "number")
    assert.equal(closedKey.placeholder, "Key")
    assert.equal(closedValue.placeholder, "Value")
    assert.equal(findAllByClass(hashControls(closedRoot), "steptrace__structure-input").length, 2)
    assert.deepEqual(
      hashControls(closedRoot).children.map((child) => child.className),
      ["steptrace__hash-fields", "steptrace__hash-actions", "steptrace__structure-status"],
    )
    assert.deepEqual(
      findAllByClass(closedRoot, "steptrace__structure-action").map((button) => button.textContent),
      ["Put", "Search", "Remove", "Reset"],
    )
    assert.equal(findByClass(closedRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(closedRoot, "steptrace__transport"), null)
    assert.equal(findAllByClass(closedRoot, "steptrace__hash-chain-slot").length, 36)
    assert.ok(findByClass(closedRoot, "steptrace__hash-canvas"))
    assert.equal(findByTag(closedRoot, "svg"), null)
    assert.equal(findByClass(closedRoot, "steptrace__hash-head"), null)
    assert.ok(
      findAllByClass(closedRoot, "steptrace__hash-chain").every(
        (column) => !column.attributes.has("role"),
      ),
    )

    const randomValues = [0, 0, 0.012, 0.04, 0, 0.08, 0, 0.12]
    Math.random = () => randomValues.shift() ?? 0
    const closedToken = findByClass(closedRoot, "steptrace__hash-token")
    closedToken.rect = { left: 0, top: 0, width: 40, height: 24 }
    const closedHomeCell = findAllByClass(closedRoot, "steptrace__hash-cell")[10]
    closedHomeCell.rect = { left: 100, top: 100, width: 30, height: 40 }
    const targetChain = findAllByClass(closedRoot, "steptrace__hash-chain")[10]
    const targetSlot = findAllByClass(targetChain, "steptrace__hash-chain-slot")[0]
    targetSlot.rect = { left: 130, top: 20, width: 24, height: 28 }
    click(hashButton(closedRoot, "Put"))
    assert.equal(closedKey.value ?? "", "")
    assert.equal(closedValue.value ?? "", "")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-inline").textContent, "10:A")
    assert.equal(findByClass(closedRoot, "steptrace__hash-calculation").textContent, "10 % 12 = 10")
    assert.equal(closedToken.dataset.motion, "arrival")
    assert.ok(closedToken.attributes.has("style:--steptrace-token-x"))
    assert.ok(closedInteractive.every((control) => control.disabled))
    assert.equal(motionTimers.size, 1)
    assert.equal(targetSlot.dataset.selected, "0")
    assert.equal(targetSlot.dataset.path, "0")
    assert.equal(targetSlot.dataset.filled, "0")
    assert.equal(closedHomeCell.dataset.probe, "")
    assert.equal(targetSlot.attributes.has("role"), false)
    assert.equal(findByClass(targetSlot, "steptrace__hash-key"), null)
    assert.equal([...motionTimers.values()][0].delay, 180)
    assert.equal(closedToken.attributes.get("style:--steptrace-token-x"), "130px")
    assert.equal(closedToken.attributes.get("style:--steptrace-token-y"), "20px")
    assert.equal(closedToken.attributes.get("style:--steptrace-token-width"), "24px")
    assert.equal(closedToken.attributes.get("style:--steptrace-token-height"), "28px")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-key").textContent, "10")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-value").textContent, "A")
    assert.equal(findByClass(targetSlot, "steptrace__hash-key"), null)
    flushNextMotion()
    assert.equal(findByClass(targetSlot, "steptrace__hash-key").textContent, "10")
    assert.equal(closedToken.dataset.motion, "idle")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-inline").textContent, "k:v")
    assert.equal(closedToken.attributes.has("style:--steptrace-token-x"), false)
    assert.equal(closedToken.attributes.has("style:--steptrace-token-width"), false)
    assert.ok(closedInteractive.every((control) => !control.disabled))
    let closedCells = findAllByClass(closedRoot, "steptrace__hash-cell")
    let closedChains = findAllByClass(closedRoot, "steptrace__hash-chain")
    assert.equal(findByClass(closedCells[10], "steptrace__hash-key"), null)
    assert.equal(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot").filter(
        (slot) => slot.dataset.filled === "1",
      ).length,
      1,
    )
    assert.equal(findByClass(closedChains[10], "steptrace__hash-key").textContent, "10")
    assert.equal(closedChains[10].dataset.count, "1")
    assert.equal(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot")[0].attributes.get("role"),
      "listitem",
    )

    click(hashButton(closedRoot, "Put"))
    assert.equal(closedKey.value ?? "", "")
    assert.equal(closedValue.value ?? "", "")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-inline").textContent, "11:B")
    assert.equal(findByClass(closedRoot, "steptrace__hash-calculation").textContent, "11 % 12 = 11")
    flushMotion()
    assert.match(
      findByClass(closedRoot, "steptrace__structure-status").textContent,
      /Put 11:B in bucket 11/,
    )
    click(hashButton(closedRoot, "Put"))
    assert.equal(closedKey.value ?? "", "")
    assert.equal(closedValue.value ?? "", "")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-inline").textContent, "12:C")
    flushMotion()
    assert.deepEqual(
      findAllByClass(closedRoot, "steptrace__hash-key")
        .map((node) => node.textContent)
        .sort((left, right) => Number(left) - Number(right)),
      ["10", "11", "12"],
    )

    click(hashButton(closedRoot, "Reset"))
    assert.equal(closedKey.value, "")
    assert.equal(closedValue.value, "")
    putHash(closedRoot, 10, "A")
    assert.equal(closedKey.value, "10")
    assert.equal(closedValue.value, "A")
    closedKey.value = ""
    closedValue.value = ""
    click(hashButton(closedRoot, "Put"))
    assert.equal(closedKey.value, "")
    assert.equal(closedValue.value, "")
    assert.equal(findByClass(closedToken, "steptrace__hash-token-inline").textContent, "11:D")
    flushMotion()
    assert.deepEqual(
      findAllByClass(closedRoot, "steptrace__hash-key").map((node) => node.textContent),
      ["10", "11"],
    )

    click(hashButton(closedRoot, "Reset"))
    putHash(closedRoot, 10, "A")
    closedCells = findAllByClass(closedRoot, "steptrace__hash-cell")
    closedChains = findAllByClass(closedRoot, "steptrace__hash-chain")

    putHash(closedRoot, 22, "B")
    closedCells = findAllByClass(closedRoot, "steptrace__hash-cell")
    closedChains = findAllByClass(closedRoot, "steptrace__hash-chain")
    assert.deepEqual(
      findAllByClass(closedChains[10], "steptrace__hash-key").map((node) => node.textContent),
      ["10", "22"],
    )
    assert.equal(closedChains[10].dataset.count, "2")
    assert.equal(findByTag(closedRoot, "svg"), null)
    assert.ok(closedCells.every((cell) => findByClass(cell, "steptrace__hash-key") == null))
    putHash(closedRoot, 11, "C")
    assert.equal(findByClass(closedChains[11], "steptrace__hash-key").textContent, "11")
    closedKey.value = "22"
    closedValue.value = "Bee"
    const closedTargetSlot = findAllByClass(closedChains[10], "steptrace__hash-chain-slot")[1]
    closedTargetSlot.rect = { left: 140, top: 10, width: 24, height: 28 }
    click(hashButton(closedRoot, "Put"))
    assert.equal(closedToken.dataset.motion, "arrival")
    assert.equal(closedTargetSlot.dataset.path, "0")
    assert.equal(closedTargetSlot.dataset.selected, "0")
    assert.equal(closedTargetSlot.dataset.result, "")
    flushMotion()
    assert.equal(findAllByClass(closedChains[10], "steptrace__hash-value")[1].textContent, "Bee")
    closedKey.value = "22"
    click(hashButton(closedRoot, "Search"))
    assert.equal([...motionTimers.values()][0].delay, 320)
    flushNextMotion()
    assert.equal(closedToken.dataset.motion, "travel")
    assert.equal(closedToken.attributes.get("style:--steptrace-token-x"), "132px")
    assert.equal(closedToken.attributes.get("style:--steptrace-token-y"), "12px")
    assert.equal([...motionTimers.values()][0].delay, 320)
    flushNextMotion()
    assert.equal(closedToken.dataset.motion, "success")
    assert.equal(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot")[1].dataset.result,
      "success",
    )
    flushMotion()
    assert.match(findByClass(closedRoot, "steptrace__structure-status").textContent, /found Bee/)
    assert.ok(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot").every(
        (node) =>
          node.dataset.path === "0" && node.dataset.selected === "0" && node.dataset.result === "",
      ),
    )
    assert.ok(closedCells.every((cell) => cell.dataset.probe === ""))
    closedKey.value = "10"
    click(hashButton(closedRoot, "Remove"))
    flushNextMotion()
    assert.equal(closedToken.dataset.motion, "travel")
    flushNextMotion()
    assert.equal(closedToken.dataset.motion, "extract")
    assert.equal(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot")[0].dataset.result,
      "remove",
    )
    assert.equal(findAllByClass(closedChains[10], "steptrace__hash-key")[0].textContent, "10")
    flushNextMotion()
    assert.equal(closedToken.dataset.motion, "handoff")
    assert.deepEqual(
      findAllByClass(closedChains[10], "steptrace__hash-key").map((node) => node.textContent),
      ["22"],
    )
    assert.ok(closedCells.every((cell) => cell.dataset.probe === ""))
    assert.ok(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot").every(
        (node) =>
          node.dataset.path === "0" && node.dataset.selected === "0" && node.dataset.result === "",
      ),
    )
    assert.equal(findByClass(closedRoot, "svg"), null)
    assert.match(
      findByClass(closedRoot, "steptrace__structure-status").textContent,
      /repaired its external chain/,
    )
    closedKey.value = ""
    click(hashButton(closedRoot, "Search"))
    assert.equal(closedKey.value, "22")
    flushMotion()
    closedKey.value = ""
    click(hashButton(closedRoot, "Remove"))
    assert.equal(closedKey.value, "22")
    flushMotion()
    assert.equal(
      findAllByClass(closedChains[10], "steptrace__hash-chain-slot").filter(
        (slot) => slot.dataset.filled === "1",
      ).length,
      0,
    )
    assert.equal(closedChains[10].attributes.has("role"), false)
    assert.equal(closedChains[10].attributes.has("aria-label"), false)
    putHash(closedRoot, 22, "B")

    click(tabButtons[1])
    const openRoot = currentHashRoot(hashRoot, 1)
    assert.ok(
      findAllByClass(openRoot, "steptrace__hash-cell").every((cell) => cell.dataset.empty === "1"),
    )
    putHash(openRoot, 10, "A")
    const openCellsBeforeProbe = findAllByClass(openRoot, "steptrace__hash-cell")
    openCellsBeforeProbe[10].rect = { left: 100, top: 20, width: 20, height: 60 }
    openCellsBeforeProbe[11].rect = { left: 120, top: 20, width: 20, height: 60 }
    hashInput(openRoot, "Hash map key").value = "22"
    hashInput(openRoot, "Hash map value").value = "B"
    click(hashButton(openRoot, "Put"))
    assert.equal([...motionTimers.values()][0].delay, 320)
    assert.deepEqual(
      openCellsBeforeProbe
        .map((cell, index) => (cell.dataset.probe ? index : null))
        .filter((index) => index != null),
      [10],
    )
    assert.equal(openCellsBeforeProbe[10].dataset.probe, "collision")
    assert.equal(findByClass(openCellsBeforeProbe[11], "steptrace__hash-key"), null)
    const firstProbeX = findByClass(openRoot, "steptrace__hash-token").attributes.get(
      "style:--steptrace-token-x",
    )
    flushNextMotion()
    assert.deepEqual(
      openCellsBeforeProbe
        .map((cell, index) => (cell.dataset.probe ? index : null))
        .filter((index) => index != null),
      [10],
    )
    assert.equal(openCellsBeforeProbe[10].dataset.probe, "collision")
    assert.equal(openCellsBeforeProbe[11].dataset.probe, "")
    assert.equal(findByClass(openCellsBeforeProbe[11], "steptrace__hash-key"), null)
    assert.notEqual(
      findByClass(openRoot, "steptrace__hash-token").attributes.get("style:--steptrace-token-x"),
      firstProbeX,
    )
    assert.equal(findByClass(openCellsBeforeProbe[11], "steptrace__hash-key"), null)
    assert.equal(findByClass(openRoot, "steptrace__hash-token").dataset.motion, "arrival")
    assert.equal([...motionTimers.values()][0].delay, 180)
    flushNextMotion()
    assert.equal(findByClass(openCellsBeforeProbe[11], "steptrace__hash-key").textContent, "22")
    assert.equal(findByClass(openRoot, "steptrace__hash-token").dataset.motion, "idle")
    const openKey = hashInput(openRoot, "Hash map key")
    openKey.value = "10"
    click(hashButton(openRoot, "Remove"))
    flushMotion()
    let openCells = findAllByClass(openRoot, "steptrace__hash-cell")
    assert.equal(openCells[10].dataset.tombstone, "1")
    openKey.value = "22"
    click(hashButton(openRoot, "Search"))
    flushMotion()
    assert.match(findByClass(openRoot, "steptrace__structure-status").textContent, /found B/)
    assert.ok(openCells.every((cell) => cell.dataset.probe === ""))
    openCells = findAllByClass(openRoot, "steptrace__hash-cell")
    openKey.value = "34"
    hashInput(openRoot, "Hash map value").value = "C"
    const tombstoneValue = findByClass(openCells[10], "steptrace__hash-cell-value")
    tombstoneValue.rect = { left: 110, top: 24, width: 12, height: 26 }
    click(hashButton(openRoot, "Put"))
    assert.deepEqual(
      openCells
        .map((cell, index) => (cell.dataset.probe ? index : null))
        .filter((index) => index != null),
      [],
    )
    assert.equal(openCells[10].dataset.probe, "")
    assert.equal(openCells[10].dataset.tombstone, "1")
    assert.equal(findByClass(openCells[10], "steptrace__hash-key"), null)
    const tombstoneArrivalX = findByClass(openRoot, "steptrace__hash-token").attributes.get(
      "style:--steptrace-token-x",
    )
    assert.equal(findByClass(openCells[10], "steptrace__hash-key"), null)
    assert.equal(findByClass(openRoot, "steptrace__hash-token").dataset.motion, "arrival")
    assert.equal(tombstoneArrivalX, "110px")
    assert.equal(
      findByClass(openRoot, "steptrace__hash-token").attributes.get(
        "style:--steptrace-token-width",
      ),
      "12px",
    )
    flushNextMotion()
    assert.equal(openCells[10].dataset.tombstone, "0")
    assert.equal(findByClass(openCells[10], "steptrace__hash-key").textContent, "34")
    assert.equal(openCells[10].dataset.probe, "")
    assert.equal(findByClass(openRoot, "steptrace__hash-token").dataset.motion, "idle")
    assert.ok(openCells.every((cell) => cell.dataset.probe === ""))
    assert.match(
      findByClass(openRoot, "steptrace__structure-status").textContent,
      /reused tombstone cell 10/,
    )
    openKey.value = "46"
    hashInput(openRoot, "Hash map value").value = "Z"
    click(hashButton(openRoot, "Put"))
    assert.equal(motionTimers.size, 1)
    click(hashButton(openRoot, "Reset"))
    assert.equal(motionTimers.size, 0)
    assert.equal(findByClass(openRoot, "steptrace__hash-token").dataset.motion, "idle")
    assert.equal(
      findByClass(openRoot, "steptrace__hash-token").attributes.has("style:--steptrace-token-x"),
      false,
    )
    assert.equal(
      findByClass(openRoot, "steptrace__hash-token").attributes.has(
        "style:--steptrace-token-radius",
      ),
      false,
    )
    assert.ok(
      findAllByClass(openRoot, "steptrace__hash-cell").every((cell) => cell.dataset.empty === "1"),
    )

    mediaMatches = false
    click(tabButtons[2])
    const bucketRoot = currentHashRoot(hashRoot, 2)
    assert.equal(findByClass(bucketRoot, "steptrace__hash-buckets").dataset.strategy, "buckets")
    for (const [key, value] of [
      [3, "A"],
      [7, "B"],
      [11, "C"],
    ])
      putHash(bucketRoot, key, value)
    hashInput(bucketRoot, "Hash map key").value = "15"
    hashInput(bucketRoot, "Hash map value").value = "D"
    click(hashButton(bucketRoot, "Put"))
    const bucketCells = findAllByClass(bucketRoot, "steptrace__hash-cell")
    assert.equal([...motionTimers.values()][0].delay, 320)
    assert.deepEqual(
      bucketCells
        .map((cell, index) => (cell.dataset.probe ? index : null))
        .filter((index) => index != null),
      [9],
    )
    assert.equal(bucketCells[9].dataset.probe, "collision")
    assert.ok(bucketCells.every((cell) => !("bucket" in cell.dataset)))
    for (const expected of [
      [9, 10],
      [9, 10, 11],
      [9, 10, 11],
    ]) {
      flushNextMotion()
      assert.deepEqual(
        bucketCells
          .map((cell, index) => (cell.dataset.probe ? index : null))
          .filter((index) => index != null),
        expected,
      )
    }
    assert.equal(findByClass(bucketCells[0], "steptrace__hash-key"), null)
    assert.equal(bucketCells[0].dataset.probe, "")
    assert.ok(bucketCells.every((cell) => !("bucket" in cell.dataset)))
    assert.equal(findByClass(bucketRoot, "steptrace__hash-token").dataset.motion, "arrival")
    flushNextMotion()
    assert.equal(findByClass(bucketCells[0], "steptrace__hash-key").textContent, "15")
    assert.equal(findByClass(bucketRoot, "steptrace__hash-token").dataset.motion, "idle")
    assert.ok(bucketCells.every((cell) => cell.dataset.probe === ""))
    assert.equal(
      findByClass(bucketRoot, "steptrace__hash-calculation").textContent,
      "15 % 4 = bucket 3 → cells 9–11",
    )
    assert.match(
      findByClass(bucketRoot, "steptrace__structure-status").textContent,
      /Bucket 3 was full; overflow placed 15:D in bucket 0, cell 0/,
    )
    flushMotion()
    const bucketMedia = mediaQueries.at(-1)
    bucketMedia.matches = true
    hashInput(bucketRoot, "Hash map key").value = "7"
    click(hashButton(bucketRoot, "Remove"))
    assert.equal(motionTimers.size, 0)
    assert.equal(bucketCells[10].dataset.empty, "1")
    assert.match(
      findByClass(bucketRoot, "steptrace__structure-status").textContent,
      /Removed key 7 from bucket 3, cell 10/,
    )

    click(tabButtons[0])
    click(hashButton(closedRoot, "Reset"))
    for (const [key, value] of [
      [1, "A"],
      [13, "B"],
      [25, "C"],
    ])
      putHash(closedRoot, key, value)
    const cappedChain = findAllByClass(closedRoot, "steptrace__hash-chain")[1]
    assert.equal(
      findAllByClass(cappedChain, "steptrace__hash-chain-slot").filter(
        (slot) => slot.dataset.filled === "1",
      ).length,
      3,
    )
    assert.equal(cappedChain.dataset.count, "3")
    closedKey.value = "37"
    closedValue.value = "D"
    click(hashButton(closedRoot, "Put"))
    assert.equal(
      findAllByClass(cappedChain, "steptrace__hash-chain-slot").filter(
        (slot) => slot.dataset.filled === "1",
      ).length,
      3,
    )
    assert.equal(
      findAllByClass(cappedChain, "steptrace__hash-chain-slot").some(
        (node) => "pending" in node.dataset,
      ),
      false,
    )
    flushNextMotion()
    assert.equal(closedToken.dataset.motion, "return")
    assert.notEqual(closedToken.dataset.motion, "arrival")
    flushMotion()
    assert.equal(
      findAllByClass(cappedChain, "steptrace__hash-chain-slot").filter(
        (slot) => slot.dataset.filled === "1",
      ).length,
      3,
    )
    assert.match(
      findByClass(closedRoot, "steptrace__structure-status").textContent,
      /Bucket 1 chain is full \(3\); key 37 was not added/,
    )
    putHash(closedRoot, 13, "Bee")
    assert.equal(findAllByClass(cappedChain, "steptrace__hash-value")[1].textContent, "Bee")
    assert.equal(
      findAllByClass(cappedChain, "steptrace__hash-chain-slot").filter(
        (slot) => slot.dataset.filled === "1",
      ).length,
      3,
    )

    const closedKeysBeforeInvalid = findAllByClass(closedRoot, "steptrace__hash-key").map(
      (node) => node.textContent,
    )
    for (const action of ["Put", "Search", "Remove"]) {
      closedKey.value = "1.5"
      closedValue.value = "Keep"
      closedKey.focused = false
      click(hashButton(closedRoot, action))
      assert.equal(closedKey.value, "1.5")
      assert.equal(closedValue.value, "Keep")
      assert.equal(closedKey.focused, true)
      assert.equal(motionTimers.size, 0)
      assert.match(
        findByClass(closedRoot, "steptrace__structure-status").textContent,
        /Key must be a safe integer/,
      )
      assert.deepEqual(
        findAllByClass(closedRoot, "steptrace__hash-key").map((node) => node.textContent),
        closedKeysBeforeInvalid,
      )
    }

    const setRoot = new FakeNode("div")
    const setHandle = api.mount(setRoot, { algorithm: "hash-set" })
    const setKey = hashInput(setRoot, "Hash set key")
    const setCells = findAllByClass(setRoot, "steptrace__hash-cell")
    const setButtons = findAllByClass(setRoot, "steptrace__structure-action")
    assert.equal(setRoot.dataset.visualFamily, "hash-index")
    assert.equal(setCells.length, 12)
    assert.equal(findAllByClass(setRoot, "steptrace__structure-input").length, 1)
    assert.deepEqual(
      setButtons.map((button) => button.textContent),
      ["Add", "Contains", "Remove", "Reset"],
    )
    setKey.value = "5"
    click(hashButton(setRoot, "Add"))
    flushMotion()
    assert.equal(findAllByClass(setRoot, "steptrace__hash-key").length, 1)
    assert.equal(findByClass(setRoot, "steptrace__hash-value"), null)
    assert.equal(setCells[5].attributes.get("aria-label"), "cell 5, key 5")
    click(hashButton(setRoot, "Add"))
    flushMotion()
    assert.equal(findAllByClass(setRoot, "steptrace__hash-key").length, 1)
    assert.match(
      findByClass(setRoot, "steptrace__structure-status").textContent,
      /Add 5 rejected; the key already exists/,
    )
    click(hashButton(setRoot, "Contains"))
    flushMotion()
    assert.match(
      findByClass(setRoot, "steptrace__structure-status").textContent,
      /Contains 5: true/,
    )
    setKey.value = "6"
    click(hashButton(setRoot, "Contains"))
    flushMotion()
    assert.match(
      findByClass(setRoot, "steptrace__structure-status").textContent,
      /Contains 6: false/,
    )
    setKey.value = "5"
    click(hashButton(setRoot, "Remove"))
    flushMotion()
    assert.equal(findAllByClass(setRoot, "steptrace__hash-key").length, 0)
    assert.equal(setCells[5].dataset.tombstone, "1")
    click(hashButton(setRoot, "Reset"))
    assert.ok(setCells.every((cell) => cell.dataset.empty === "1"))
    const generatedRandom = Math.random
    const generatedValues = [0, 0]
    Math.random = () => generatedValues.shift() ?? 0
    setKey.value = ""
    click(hashButton(setRoot, "Add"))
    flushMotion()
    const firstGeneratedSetKey = findByClass(setRoot, "steptrace__hash-key").textContent
    click(hashButton(setRoot, "Add"))
    flushMotion()
    assert.deepEqual(
      findAllByClass(setRoot, "steptrace__hash-key").map((node) => node.textContent),
      [firstGeneratedSetKey, "11"],
    )
    assert.equal(setKey.value, "")
    Math.random = generatedRandom
    setHandle.destroy()
    assert.equal(setRoot.children.length, 0)

    const bloomRoot = new FakeNode("div")
    const bloomHandle = api.mount(bloomRoot, { algorithm: "bloom-filter" })
    const bloomValue = hashInput(bloomRoot, "Bloom filter value")
    const bloomCells = findAllByClass(bloomRoot, "steptrace__hash-cell")
    const bloomOperation = findByClass(bloomRoot, "steptrace__hash-operation")
    assert.equal(bloomRoot.dataset.visualFamily, "hash-index")
    assert.equal(bloomCells.length, 10)
    assert.deepEqual(
      findAllByClass(bloomRoot, "steptrace__structure-action").map((button) => button.textContent),
      ["Add", "Query", "Reset"],
    )
    assert.ok(
      bloomCells.every(
        (cell, index) =>
          cell.attributes.get("aria-label") === `bit ${index}, set to 0` &&
          cell.children[0].textContent === "0",
      ),
    )
    bloomValue.value = "5"
    click(hashButton(bloomRoot, "Add"))
    assert.equal(bloomCells[5].dataset.probe, "current")
    assert.equal(bloomCells[5].children[0].textContent, "1")
    flushNextMotion()
    assert.equal(bloomCells[6].dataset.probe, "current")
    flushNextMotion()
    assert.equal(bloomCells[9].dataset.probe, "current")
    flushNextMotion()
    assert.equal(bloomOperation.dataset.outcome, "added")
    assert.deepEqual(
      bloomCells
        .map((cell, index) => (cell.children[0].textContent === "1" ? index : null))
        .filter((index) => index != null),
      [5, 6, 9],
    )
    bloomValue.value = "12"
    click(hashButton(bloomRoot, "Add"))
    flushMotion()
    assert.deepEqual(
      bloomCells
        .map((cell, index) => (cell.children[0].textContent === "1" ? index : null))
        .filter((index) => index != null),
      [2, 5, 6, 7, 8, 9],
    )
    bloomValue.value = "7"
    click(hashButton(bloomRoot, "Query"))
    assert.equal(bloomCells[7].dataset.probe, "current")
    flushNextMotion()
    assert.equal(bloomCells[2].dataset.probe, "current")
    flushNextMotion()
    assert.equal(bloomCells[3].dataset.probe, "current")
    flushNextMotion()
    assert.equal(bloomOperation.dataset.outcome, "definitely-absent")
    assert.match(
      findByClass(bloomRoot, "steptrace__structure-status").textContent,
      /definitely absent; bit 3 is 0/,
    )
    bloomValue.value = "5"
    click(hashButton(bloomRoot, "Query"))
    flushMotion()
    assert.equal(bloomOperation.dataset.outcome, "possibly-present")
    assert.match(
      findByClass(bloomRoot, "steptrace__structure-status").textContent,
      /possibly present; all three bits are 1/,
    )
    assert.deepEqual(
      bloomCells
        .map((cell, index) => (cell.children[0].textContent === "1" ? index : null))
        .filter((index) => index != null),
      [2, 5, 6, 7, 8, 9],
    )
    click(hashButton(bloomRoot, "Reset"))
    assert.ok(bloomCells.every((cell) => cell.children[0].textContent === "0"))
    const bloomRandom = Math.random
    const blankValues = [0, 0]
    Math.random = () => blankValues.shift() ?? 0
    bloomValue.value = ""
    click(hashButton(bloomRoot, "Query"))
    const firstBlankCalculation = findByClass(bloomRoot, "steptrace__hash-calculation").textContent
    flushMotion()
    click(hashButton(bloomRoot, "Query"))
    const secondBlankCalculation = findByClass(bloomRoot, "steptrace__hash-calculation").textContent
    flushMotion()
    assert.notEqual(firstBlankCalculation, secondBlankCalculation)
    assert.equal(bloomValue.value, "")
    Math.random = bloomRandom
    bloomHandle.destroy()
    assert.equal(bloomRoot.children.length, 0)

    closedKey.value = "46"
    closedValue.value = "Z"
    click(hashButton(closedRoot, "Put"))
    assert.equal(motionTimers.size, 1)
    const hashMedia = mediaQueries.slice(hashMediaIndex)
    hashHandle.destroy()
    assert.equal(hashRoot.children.length, 0)
    assert.equal(motionTimers.size, 0)
    assert.ok(hashMedia.every((query) => query.listeners.length === 0))
    assert.ok(
      closedInteractive.every((node) =>
        [...node.listeners.values()].every((items) => !items.length),
      ),
    )
    globalThis.setTimeout = realSetTimeout
    globalThis.clearTimeout = realClearTimeout
    Math.random = realRandom
    mediaMatches = false

    for (const config of [
      { algorithm: "arrays", capacity: 2 },
      { algorithm: "circular-buffer", capacity: 2 },
      { algorithm: "deque", capacity: 6 },
      { algorithm: "dynamic-array", capacity: 6 },
      { algorithm: "span", values: [1, 2, 3], range: [2, 1] },
    ]) {
      const invalidRoot = new FakeNode("div")
      const invalidHandle = api.mount(invalidRoot, config)
      assert.match(invalidRoot.textContent, /steptrace: .+ requires/)
      assert.equal(invalidRoot.dataset.visualFamily, undefined)
      invalidHandle.destroy()
    }

    const structureCases = []

    const arrayRoot = new FakeNode("div")
    const arrayHandle = api.mount(arrayRoot, {
      algorithm: "arrays",
      capacity: 4,
      values: [1, 2, 3],
    })
    const arrayIndex = findByAttribute(arrayRoot, "aria-label", "Array index")
    const arrayValue = findByAttribute(arrayRoot, "aria-label", "Value to write")
    const arrayWrite = findAllByClass(arrayRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Write",
    )
    const arrayRead = findAllByClass(arrayRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Read",
    )
    arrayIndex.value = "1"
    arrayValue.value = "9"
    click(arrayWrite)
    assert.deepEqual(
      findAllByClass(arrayRoot, "steptrace__contiguous-cell").map(
        (cell) => cell.children[0].textContent,
      ),
      ["1", "9", "3", "·"],
    )
    assert.match(
      findByClass(arrayRoot, "steptrace__structure-status").textContent,
      /Replaced array\[1\] value 2 with 9/,
    )
    click(arrayRead)
    assert.match(
      findByClass(arrayRoot, "steptrace__structure-status").textContent,
      /address 0x1004/,
    )
    structureCases.push([arrayRoot, arrayHandle])

    const unionFindRoot = new FakeNode("div")
    const unionFindHandle = api.mount(unionFindRoot, { algorithm: "union-find", n: 7 })
    const unionFirst = findByAttribute(unionFindRoot, "aria-label", "First element")
    const unionSecond = findByAttribute(unionFindRoot, "aria-label", "Second element")
    const unionButton = findAllByClass(unionFindRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Union",
    )
    const findButton = findAllByClass(unionFindRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Find A",
    )
    const connectedButton = findAllByClass(unionFindRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Connected?",
    )
    const unionParents = () =>
      findAllByClass(unionFindRoot, "steptrace__contiguous-cell").map(
        (cell) => cell.children[0].textContent,
      )
    click(unionButton)
    unionFirst.value = "2"
    unionSecond.value = "3"
    click(unionButton)
    unionFirst.value = "0"
    unionSecond.value = "2"
    click(unionButton)
    assert.deepEqual(unionParents(), ["0", "0", "0", "2", "4", "5", "6"])
    unionFirst.value = "3"
    click(findButton)
    assert.deepEqual(unionParents(), ["0", "0", "0", "0", "4", "5", "6"])
    unionFirst.value = "1"
    unionSecond.value = "3"
    click(connectedButton)
    assert.match(
      findByClass(unionFindRoot, "steptrace__structure-status").textContent,
      /connected through root 0/,
    )
    assert.equal(unionFindRoot.dataset.visualFamily, "union-find")
    assert.equal(findByClass(unionFindRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(unionFindRoot, "steptrace__transport"), null)
    unionFindHandle.destroy()
    assert.equal(unionFindRoot.children.length, 0)

    const heapRoot = new FakeNode("div")
    const heapHandle = api.mount(heapRoot, {
      algorithm: "heap",
      array: [3, 5, 8, 9],
    })
    const heapValues = () =>
      findAllByClass(heapRoot, "steptrace__contiguous-cell").map(
        (cell) => cell.children[0].textContent,
      )
    const heapNodes = () =>
      findByTag(heapRoot, "svg")
        .children.filter((node) => node.tagName === "g")
        .map((node) => node.children[1].textContent)
    const heapNodeStates = () =>
      findByTag(heapRoot, "svg")
        .children.filter((node) => node.tagName === "g")
        .map((node) => node.dataset.state)
    const heapEdgePaths = () =>
      findByTag(heapRoot, "svg")
        .children.filter((node) => node.tagName === "line")
        .map((node) => node.dataset.path)
    const heapInput = findByAttribute(heapRoot, "aria-label", "Value to insert")
    const heapButton = (label) =>
      findAllByClass(heapRoot, "steptrace__structure-action").find(
        (button) => button.textContent === label,
      )
    assert.deepEqual(heapValues(), ["3", "5", "8", "9"])
    assert.deepEqual(heapNodes(), ["3", "5", "8", "9"])
    assert.deepEqual(heapNodeStates(), ["neutral", "neutral", "neutral", "neutral"])
    assert.deepEqual(heapEdgePaths(), ["0", "0", "0"])
    heapInput.value = "2"
    click(heapButton("Insert"))
    assert.deepEqual(heapValues(), ["2", "3", "8", "9", "5"])
    assert.deepEqual(heapNodes(), ["2", "3", "8", "9", "5"])
    assert.deepEqual(heapNodeStates(), ["settled", "compare", "neutral", "neutral", "compare"])
    assert.deepEqual(heapEdgePaths(), ["1", "0", "0", "1"])
    assert.match(
      findByClass(heapRoot, "steptrace__structure-status").textContent,
      /sift-up path 4 → 1 → 0 with 2 swaps/,
    )
    click(heapButton("Extract min"))
    assert.deepEqual(heapValues(), ["3", "5", "8", "9"])
    assert.deepEqual(heapNodes(), ["3", "5", "8", "9"])
    assert.match(
      findByClass(heapRoot, "steptrace__structure-status").textContent,
      /Extracted minimum 2; sift-down path 0 → 1 → 3 with 1 swap/,
    )
    heapInput.value = "1.5"
    click(heapButton("Insert"))
    assert.deepEqual(heapValues(), ["3", "5", "8", "9"])
    assert.equal(
      findByClass(heapRoot, "steptrace__structure-status").textContent,
      "Value must be a finite integer.",
    )
    assert.equal(heapRoot.dataset.visualFamily, "heap-selection")
    assert.equal(findByClass(heapRoot, "steptrace__timeline"), null)
    assert.equal(findByClass(heapRoot, "steptrace__transport"), null)
    heapHandle.destroy()
    assert.equal(heapRoot.children.length, 0)

    const binomialRoot = new FakeNode("div")
    const binomialHandle = api.mount(binomialRoot, { algorithm: "binomial-queue" })
    const binomialSlots = () =>
      findAllByClass(binomialRoot, "steptrace__contiguous-cell").map(
        (cell) => cell.children[0].textContent,
      )
    const binomialButton = (label) =>
      findAllByClass(binomialRoot, "steptrace__structure-action").find(
        (button) => button.textContent === label,
      )
    assert.deepEqual(binomialSlots(), ["7 + 3", "2", "·"])
    click(binomialButton("Meld"))
    assert.deepEqual(binomialSlots(), ["·", "2 + 3", "·"])
    assert.match(
      findByClass(binomialRoot, "steptrace__structure-status").textContent,
      /B₀ \+ B₀ links into a B₁ carry/,
    )
    click(binomialButton("Continue carry"))
    assert.deepEqual(binomialSlots(), ["·", "·", "2"])
    assert.match(
      findByClass(binomialRoot, "steptrace__structure-status").textContent,
      /B₁ \+ B₁ links again.*B₂ tree/,
    )
    binomialHandle.destroy()

    const fibonacciRoot = new FakeNode("div")
    const fibonacciHandle = api.mount(fibonacciRoot, {
      algorithm: "fibonacci-heap",
      array: [3, 7, 18, 24, 26, 39, 41, 52, 63],
    })
    const fibonacciButton = (label) =>
      findAllByClass(fibonacciRoot, "steptrace__structure-action").find(
        (button) => button.textContent === label,
      )
    assert.equal(findAllByClass(fibonacciRoot, "steptrace__contiguous-cell").length, 9)
    click(fibonacciButton("Extract min"))
    assert.match(
      findByClass(fibonacciRoot, "steptrace__structure-status").textContent,
      /Extracted minimum 3.*consolidated equal degrees/,
    )
    const currentKey = findByAttribute(fibonacciRoot, "aria-label", "Current key")
    const decreasedKey = findByAttribute(fibonacciRoot, "aria-label", "Decreased key")
    currentKey.value = "41"
    decreasedKey.value = "5"
    click(fibonacciButton("Decrease key"))
    assert.match(
      findByClass(fibonacciRoot, "steptrace__structure-status").textContent,
      /Decreased 41 to 5; the node was cut and parent 39 is now marked/,
    )
    currentKey.value = "52"
    decreasedKey.value = "4"
    click(fibonacciButton("Decrease key"))
    assert.match(
      findByClass(fibonacciRoot, "steptrace__structure-status").textContent,
      /Decreased 52 to 4; the cut removed a second child, so marked parent 39 cascaded/,
    )
    assert.equal(findByClass(fibonacciRoot, "steptrace__timeline"), null)
    fibonacciHandle.destroy()

    for (const [algorithm, rule] of [
      ["leftist-heap", /conditional child swap/],
      ["skew-heap", /swapped children unconditionally/],
    ]) {
      const mergeRoot = new FakeNode("div")
      const mergeHandle = api.mount(mergeRoot, { algorithm })
      const mergeButton = findAllByClass(mergeRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Merge",
      )
      click(mergeButton)
      assert.match(findByClass(mergeRoot, "steptrace__structure-status").textContent, rule)
      assert.equal(findByClass(mergeRoot, "steptrace__timeline"), null)
      assert.equal(findByClass(mergeRoot, "steptrace__transport"), null)
      mergeHandle.destroy()
    }

    const fenwickRoot = new FakeNode("div")
    const fenwickHandle = api.mount(fenwickRoot, {
      algorithm: "fenwick-tree",
      array: [3, 1, 4, 1, 5, 9, 2, 6],
    })
    const fenwickValues = () =>
      findAllByClass(fenwickRoot, "steptrace__contiguous-cell").map(
        (cell) => cell.children[0].textContent,
      )
    const fenwickBlocks = () =>
      findAllByClass(fenwickRoot, "steptrace__fenwick-block").map(
        (block) => findByClass(block, "steptrace__range-block-value").textContent,
      )
    assert.deepEqual(fenwickValues(), ["3", "1", "4", "1", "5", "9", "2", "6"])
    assert.deepEqual(fenwickBlocks(), ["3", "4", "4", "9", "5", "14", "2", "31"])
    findByAttribute(fenwickRoot, "aria-label", "Delta to add").value = "4"
    click(
      findAllByClass(fenwickRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Add delta",
      ),
    )
    assert.deepEqual(fenwickValues(), ["3", "1", "4", "1", "9", "9", "2", "6"])
    assert.deepEqual(fenwickBlocks(), ["3", "4", "4", "9", "9", "18", "2", "35"])
    assert.deepEqual(
      findAllByClass(fenwickRoot, "steptrace__fenwick-block").map((block, index) =>
        block.dataset.role === "update" ? index + 1 : null,
      ),
      [null, null, null, null, 5, 6, null, 8],
    )
    click(
      findAllByClass(fenwickRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Range sum",
      ),
    )
    assert.match(
      findByClass(fenwickRoot, "steptrace__structure-status").textContent,
      /Sum \[3\.\.7\].*= 25/,
    )
    findByAttribute(fenwickRoot, "aria-label", "Range start").value = "6"
    findByAttribute(fenwickRoot, "aria-label", "Range end").value = "6"
    click(
      findAllByClass(fenwickRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Range sum",
      ),
    )
    const sharedPrefixBlock = findAllByClass(fenwickRoot, "steptrace__fenwick-block")[3]
    assert.equal(sharedPrefixBlock.dataset.role, "cancelled")
    assert.equal(findByClass(sharedPrefixBlock, "steptrace__range-block-op").textContent, "±")
    assert.equal(fenwickRoot.dataset.visualFamily, "range-aggregate")
    assert.equal(findByClass(fenwickRoot, "steptrace__timeline"), null)
    fenwickHandle.destroy()
    assert.equal(fenwickRoot.children.length, 0)

    const segmentRoot = new FakeNode("div")
    const segmentHandle = api.mount(segmentRoot, {
      algorithm: "segment-tree",
      array: [3, 4, 1, 7, 2, 6, 5, 8],
    })
    const segmentValues = () =>
      findAllByClass(segmentRoot, "steptrace__contiguous-cell").map(
        (cell) => cell.children[0].textContent,
      )
    const segmentBlocks = () =>
      findAllByClass(segmentRoot, "steptrace__segment-block").map(
        (block) => findByClass(block, "steptrace__range-block-value").textContent,
      )
    assert.deepEqual(segmentValues(), ["3", "4", "1", "7", "2", "6", "5", "8"])
    assert.deepEqual(segmentBlocks(), [
      "36",
      "15",
      "7",
      "3",
      "4",
      "8",
      "1",
      "7",
      "21",
      "8",
      "2",
      "6",
      "13",
      "5",
      "8",
    ])
    findByAttribute(segmentRoot, "aria-label", "New value").value = "10"
    click(
      findAllByClass(segmentRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Set value",
      ),
    )
    assert.deepEqual(segmentValues(), ["3", "4", "1", "10", "2", "6", "5", "8"])
    assert.equal(segmentBlocks()[0], "39")
    assert.equal(
      findAllByClass(segmentRoot, "steptrace__segment-block").filter(
        (block) => block.dataset.role === "update",
      ).length,
      4,
    )
    click(
      findAllByClass(segmentRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Range sum",
      ),
    )
    assert.match(
      findByClass(segmentRoot, "steptrace__structure-status").textContent,
      /Sum \[3\.\.7\].*= 24/,
    )
    assert.deepEqual(
      findAllByClass(segmentRoot, "steptrace__segment-block")
        .filter((block) => block.dataset.role === "query")
        .map((block) => block.attributes.get("aria-label")),
      [
        "segment 3 through 4, sum 11, active query path",
        "segment 5 through 6, sum 8, active query path",
        "segment 7 through 7, sum 5, active query path",
      ],
    )
    assert.equal(segmentRoot.dataset.visualFamily, "range-aggregate")
    assert.equal(findByClass(segmentRoot, "steptrace__timeline"), null)
    segmentHandle.destroy()
    assert.equal(segmentRoot.children.length, 0)

    const bufferRoot = new FakeNode("div")
    const bufferHandle = api.mount(bufferRoot, {
      algorithm: "circular-buffer",
      capacity: 3,
    })
    const bufferInput = findByAttribute(bufferRoot, "aria-label", "Value to write")
    const bufferWrite = findAllByClass(bufferRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Write",
    )
    const bufferRead = findAllByClass(bufferRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Read oldest",
    )
    for (const value of ["A", "B", "C", "D"]) {
      bufferInput.value = value
      click(bufferWrite)
    }
    const bufferCells = findAllByClass(bufferRoot, "steptrace__contiguous-cell")
    assert.deepEqual(
      bufferCells.map((cell) => cell.children[0].textContent),
      ["D", "B", "C"],
    )
    assert.equal(bufferCells[1].children[1].textContent, "OLDEST / WRITE")
    assert.match(
      findByClass(bufferRoot, "steptrace__structure-status").textContent,
      /overwrote oldest/,
    )
    click(bufferRead)
    assert.equal(bufferCells[1].children[0].textContent, "·")
    structureCases.push([bufferRoot, bufferHandle])

    const dequeRoot = new FakeNode("div")
    const dequeHandle = api.mount(dequeRoot, { algorithm: "deque", capacity: 3 })
    const dequeInput = findByAttribute(dequeRoot, "aria-label", "Value to push")
    const pushBack = findAllByClass(dequeRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Push back",
    )
    const dequePopFront = findAllByClass(dequeRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Pop front",
    )
    const pushFront = findAllByClass(dequeRoot, "steptrace__structure-action").find(
      (button) => button.textContent === "Push front",
    )
    for (const value of ["A", "B", "C"]) {
      dequeInput.value = value
      click(pushBack)
    }
    click(dequePopFront)
    dequeInput.value = "D"
    click(pushBack)
    dequeInput.value = "E"
    click(pushFront)
    const dequeCells = findAllByClass(dequeRoot, "steptrace__contiguous-cell")
    assert.equal(dequeCells.length, 6)
    assert.deepEqual(
      dequeCells.map((cell) => cell.children[0].textContent),
      ["B", "C", "D", "·", "·", "E"],
    )
    assert.equal(dequeCells[5].children[1].textContent, "FRONT")
    assert.equal(dequeCells[2].children[1].textContent, "BACK")
    assert.match(
      findByClass(dequeRoot, "steptrace__structure-status").textContent,
      /growing and relinearizing/,
    )
    structureCases.push([dequeRoot, dequeHandle])

    const dynamicRoot = new FakeNode("div")
    const dynamicHandle = api.mount(dynamicRoot, {
      algorithm: "dynamic-array",
      capacity: 3,
      values: [1, 2, 3],
    })
    const dynamicInput = findByAttribute(dynamicRoot, "aria-label", "Value to append")
    dynamicInput.value = "4"
    click(
      findAllByClass(dynamicRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Append",
      ),
    )
    const dynamicCells = findAllByClass(dynamicRoot, "steptrace__contiguous-cell")
    assert.equal(dynamicCells.length, 6)
    assert.equal(dynamicCells[3].children[0].textContent, "4")
    assert.match(
      findByClass(dynamicRoot, "steptrace__structure-status").textContent,
      /allocated 6 slots, copied 3/,
    )
    click(
      findAllByClass(dynamicRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Remove last",
      ),
    )
    assert.equal(dynamicCells[3].children[0].textContent, "·")
    structureCases.push([dynamicRoot, dynamicHandle])

    const spanRoot = new FakeNode("div")
    const spanHandle = api.mount(spanRoot, {
      algorithm: "span",
      values: [10, 20, 30, 40, 50],
      range: [1, 4],
    })
    let spanCells = findAllByClass(spanRoot, "steptrace__contiguous-cell")
    assert.deepEqual(
      spanCells.map((cell) => cell.dataset.view),
      ["0", "1", "1", "1", "0"],
    )
    findByAttribute(spanRoot, "aria-label", "Span write offset").value = "1"
    findByAttribute(spanRoot, "aria-label", "Value to write through span").value = "99"
    click(
      findAllByClass(spanRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Write",
      ),
    )
    assert.equal(spanCells[2].children[0].textContent, "99")
    assert.match(findByClass(spanRoot, "steptrace__structure-status").textContent, /backing\[2\]/)
    findByAttribute(spanRoot, "aria-label", "Span start index").value = "0"
    findByAttribute(spanRoot, "aria-label", "Span length").value = "2"
    click(
      findAllByClass(spanRoot, "steptrace__structure-action").find(
        (button) => button.textContent === "Slice",
      ),
    )
    spanCells = findAllByClass(spanRoot, "steptrace__contiguous-cell")
    assert.deepEqual(
      spanCells.map((cell) => cell.dataset.view),
      ["1", "1", "0", "0", "0"],
    )
    structureCases.push([spanRoot, spanHandle])

    for (const [structureRoot, structureHandle] of structureCases) {
      assert.equal(structureRoot.dataset.visualFamily, "contiguous-storage")
      assert.equal(findByClass(structureRoot, "steptrace__timeline"), null)
      assert.equal(findByClass(structureRoot, "steptrace__transport"), null)
      const interactiveNodes = [
        ...findAllByClass(structureRoot, "steptrace__structure-input"),
        ...findAllByClass(structureRoot, "steptrace__structure-action"),
      ]
      structureHandle.destroy()
      assert.equal(structureRoot.children.length, 0)
      assert.equal(structureRoot.dataset.visualFamily, undefined)
      assert.ok(
        interactiveNodes.every((node) =>
          [...node.listeners.values()].every((items) => !items.length),
        ),
      )
    }
  } finally {
    globalThis.document = previous.document
    globalThis.matchMedia = previous.matchMedia
    globalThis.getComputedStyle = previous.getComputedStyle
    globalThis.ResizeObserver = previous.ResizeObserver
  }
})

test("contiguous structures share one persistent direct-operation contract in both hosts", () => {
  const family = readFileSync(join(here, "src", "families", "contiguous-storage.ts"), "utf8")
  const structure = readFileSync(join(here, "src", "families", "interactive-structure.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "contiguous-storage.scss"), "utf8")
  const structureStyles = readFileSync(
    join(here, "src", "styles", "interactive-structure.scss"),
    "utf8",
  )
  const sharedStyles = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const mount = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Linear Structures",
      "Queue.md",
    ),
    "utf8",
  )
  assert.match(mount, /structureRegistry\.get\(config\.algorithm\)/)
  assert.match(structure, /function createStructureShell\(/)
  assert.match(structure, /function createIndexedBoard\(/)
  assert.match(family, /export function ringOrder\(/)
  assert.match(family, /tail = \(tail \+ 1\) % config\.capacity/)
  assert.match(family, /head = \(head \+ 1\) % config\.capacity/)
  assert.match(structure, /event\.key !== "Enter"/)
  assert.match(family, /enqueue\.disabled = count === config\.capacity/)
  assert.match(family, /dequeue\.disabled = count === 0/)
  assert.match(structure, /cleanups\.push\(\(\) => node\.removeEventListener\(type, listener\)\)/)
  assert.match(family, /overwrote oldest value/)
  assert.match(family, /growing and relinearizing/)
  assert.match(family, /allocated \$\{capacity\} slots, copied/)
  assert.match(family, /wrote \$\{value\} through to backing/)
  for (const name of ["arrays", "circularBuffer", "deque", "dynamicArray", "queue", "span"])
    assert.match(algorithms, new RegExp(`\\b${name}\\b`))
  assert.match(structureStyles, /block-size: auto;/)
  assert.match(structureStyles, /min-block-size: 7rem;/)
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__pcells,[\s\S]*?\.steptrace \.steptrace__contiguous-array \{[^}]*--steptrace-array-radius: 9px;[^}]*overflow: hidden;/,
  )
  assert.match(
    sharedStyles,
    /\.steptrace \.steptrace__contiguous-array > \.steptrace__contiguous-cell:first-child \{[^}]*border-radius: calc\(var\(--steptrace-array-radius\) - 1px\)/s,
  )
  assert.match(styles, /\.steptrace__contiguous-cell \{[^}]*border-inline-end:/s)
  assert.doesNotMatch(styles, /\.steptrace__contiguous-cell \{[^}]*border-radius:/s)
  assert.match(styles, /\.steptrace__contiguous-index \{[^}]*border-block-start:/s)
  assert.doesNotMatch(styles, /steptrace__contiguous-marker/)
  assert.doesNotMatch(styles, /steptrace__queue-order/)
  assert.doesNotMatch(styles, /steptrace__queue-state/)
  assert.match(structure, /steptrace__foot steptrace__structure-controls/)
  assert.match(structure, /input\.placeholder = placeholder/)
  assert.match(structure, /select\.value = selected \?\? ""/)
  assert.match(family, /Math\.floor\(Math\.random\(\) \* 90\) \+ 10/)
  assert.match(structureStyles, /--steptrace-structure-control-size: 2\.75rem/)
  assert.match(
    structureStyles,
    /--steptrace-structure-control-radius: max\(2px, calc\(0\.85rem - 0\.65rem\)\)/,
  )
  assert.match(structureStyles, /--steptrace-structure-control-gap: 0\.55rem/)
  assert.match(structureStyles, /min-height: var\(--steptrace-structure-control-size\)/)
  assert.match(
    structureStyles,
    /\.steptrace \.steptrace__structure-controls \.steptrace__select \{[\s\S]*?min-height: var\(--steptrace-structure-control-size\)/,
  )
  assert.match(
    structureStyles,
    /\.steptrace \.steptrace__structure-controls \.steptrace__structure-input:focus-visible,[\s\S]*?\.steptrace \.steptrace__structure-controls \.steptrace__select:focus-visible \{[^}]*outline: 1px solid var\(--_blue\);[^}]*outline-offset: -1px;[^}]*box-shadow: none;/,
  )
  assert.match(structureStyles, /display: flex;/)
  assert.match(structureStyles, /flex-wrap: wrap;/)
  assert.match(structureStyles, /flex: 0 0 auto;/)
  assert.match(structureStyles, /flex: 1 1 6rem;/)
  assert.doesNotMatch(structureStyles, /flex-basis: 100%/)
  assert.match(structureStyles, /box-shadow: none;/)
  assert.match(styles, /\.steptrace__contiguous-cell\[data-view="1"\]/)
  assert.match(structureStyles, /@container steptrace-structure \(max-width: 36rem\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styleEntry, /@use "interactive-structure";/)
  assert.match(styleEntry, /@use "contiguous-storage";/)
  assert.match(quartzCss, /\.steptrace__contiguous-array/)
  assert.match(obsidianCss, /\.steptrace__contiguous-array/)
  assert.match(note, /```steptrace\n\{"algorithm":"queue"\}\n```/)
  assert.doesNotMatch(note, /Visualization pending/)
})

test("Union-Find is a persistent rank-and-compression forest in both hosts", () => {
  const algorithm = readFileSync(join(here, "src", "algorithms", "union-find.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "union-find.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "unionfind.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const notesRoot = join(
    repoRoot,
    "Vault",
    "Home",
    "Computer Science",
    "Data Structures",
    "Graph Structures",
  )
  const disjointSet = readFileSync(join(notesRoot, "Disjoint Set.md"), "utf8")
  const unionFind = readFileSync(join(notesRoot, "Union-Find.md"), "utf8")

  assert.match(algorithm, /family: "union-find"/)
  assert.match(algorithm, /mount: mountUnionFind/)
  assert.match(algorithm, /integer "n" from 4 to 7/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*unionFind,/)
  assert.doesNotMatch(algorithms, /fastAndSlowPointers,[\s\S]*unionFind,[\s\S]*kernighanPopcount/)
  assert.match(family, /createStructureShell\(/)
  assert.match(family, /createIndexedBoard\(/)
  assert.match(family, /findAndCompress\(/)
  assert.match(family, /rank\[parentRoot\] < rank\[childRoot\]/)
  assert.match(family, /rank\[parentRoot\] === rank\[childRoot\]/)
  assert.match(family, /shell\.select\("First element"/)
  assert.match(family, /shell\.button\("Connected\?"/)
  assert.match(family, /new ResizeObserver\(\(\) => syncWidth\(\)\)/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(styles, /\.steptrace__union-find-forest \{[^}]*place-items: center;/s)
  assert.match(styles, /--steptrace-uf-set-6:/)
  assert.match(styles, /\.steptrace__union-find-parent-label \{[^}]*border-top:/s)
  for (const note of [disjointSet, unionFind]) {
    assert.match(note, /```steptrace\n\{"algorithm":"union-find","n":7\}\n```/)
    assert.match(note, /# Interactive Forest/)
    assert.doesNotMatch(note, /Visualization pending/)
  }
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(
      artifact,
      /Interactive disjoint-set forest with union by rank and path compression/,
    )
    assert.match(artifact, /Union\(\$\{a\}, \$\{b\}\) linked root/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__union-find-forest/)
})

test("Fenwick Tree exposes persistent low-bit blocks for updates and range sums", () => {
  const algorithm = readFileSync(join(here, "src", "algorithms", "fenwick-tree.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "range-aggregate.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "range-aggregate.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Trees",
      "Fenwick Tree.md",
    ),
    "utf8",
  )

  assert.match(algorithm, /family: "range-aggregate"/)
  assert.match(algorithm, /4 to 8 finite integer values/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*fenwickTree,/)
  assert.match(family, /function lowbit\(index: number\)/)
  assert.match(family, /index \+= lowbit\(index\)/)
  assert.match(family, /index -= lowbit\(index\)/)
  assert.match(family, /createStructureShell\(/)
  assert.match(family, /createIndexedBoard\(/)
  assert.match(family, /shell\.button\("Add delta"/)
  assert.match(family, /shell\.button\("Range sum"/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(styles, /grid-column: var\(--steptrace-range-start\)/)
  assert.match(styles, /grid-row: var\(--steptrace-range-level\)/)
  assert.match(styles, /\[data-role="prefix-right"\]/)
  assert.match(styles, /@container steptrace-structure \(max-width: 36rem\)/)
  assert.match(styleEntry, /@use "range-aggregate";/)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"fenwick-tree","array":\[3,1,4,1,5,9,2,6\]\}\n```/,
  )
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive Fenwick tree with point updates and range-sum queries/)
    assert.match(artifact, /Added \$\{parsed\} at value/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__fenwick-blocks/)
})

test("Heap is registered as one direct persistent structure in both hosts", () => {
  const { parseHeapConfig } = loadStepTraceModule("src", "algorithms", "heap.ts")
  const algorithm = readFileSync(join(here, "src", "algorithms", "heap.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "heap-structure.ts"), "utf8")
  const selectionFamily = readFileSync(join(here, "src", "families", "heap-selection.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "heap-selection.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Trees",
      "Heap-like",
      "Heap.md",
    ),
    "utf8",
  )

  assert.match(algorithm, /family: "heap-selection"/)
  assert.match(algorithm, /finite integer values/)
  assert.match(algorithm, /valid binary min-heap array/)
  assert.throws(
    () => parseHeapConfig({ algorithm: "heap", array: [4, 2] }),
    /heap requires a valid binary min-heap array/,
  )
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*heap,/)
  assert.match(family, /createStructureShell\(/)
  assert.match(family, /createIndexedBoard\(/)
  assert.match(family, /heapPosition\(/)
  assert.match(family, /observeFixedSvgNodes\(/)
  assert.match(family, /trimGraphEdge\(/)
  assert.match(family, /shell\.button\("Insert"/)
  assert.match(family, /shell\.button\("Extract min"/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(selectionFamily, /export function heapPosition\(index: number\)/)
  assert.match(styles, /\.steptrace__heap-edge\[data-path="1"\]/)
  assert.match(styles, /@container steptrace-heap-selection \(max-width: 36rem\)/)
  assert.match(note, /```steptrace\n\{"algorithm":"heap","array":\[3,5,8,9\]\}\n```/)
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive binary min-heap/)
    assert.match(artifact, /Inserted \$\{value\}; sift-up path/)
    assert.match(artifact, /Extracted minimum \$\{minimum\}/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__heap-structure-tree/)
})

test("Stack is a vertical persistent direct-control structure in both hosts", () => {
  const { parseStackConfig } = loadStepTraceModule("src", "algorithms", "stack.ts")
  const algorithm = readFileSync(join(here, "src", "algorithms", "stack.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "stack-sequence.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "stack-sequence.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Linear Structures",
      "Stack.md",
    ),
    "utf8",
  )
  const harness = readFileSync(join(repoRoot, "g041-stack-review.html"), "utf8")

  assert.deepEqual(
    parseStackConfig({
      algorithm: "stack",
      capacity: 6,
      values: ["A", "B", "C"],
    }),
    { capacity: 6, values: ["A", "B", "C"] },
  )
  assert.throws(
    () => parseStackConfig({ algorithm: "stack", capacity: 2 }),
    /stack requires integer "capacity" from 3 to 8/,
  )
  assert.throws(
    () =>
      parseStackConfig({
        algorithm: "stack",
        capacity: 3,
        values: [1, 2, 3, 4],
      }),
    /no more values than slots/,
  )
  assert.match(algorithm, /family: "stack-sequence"/)
  assert.match(algorithms, /import \{ stack \} from "\.\/stack"/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*stack,/)
  assert.match(family, /createStructureShell\(/)
  assert.match(family, /shell\.button\("Push", true\)/)
  assert.match(family, /shell\.button\("Pop"\)/)
  assert.match(family, /shell\.button\("Peek"\)/)
  assert.match(family, /shell\.button\("Reset"\)/)
  assert.match(family, /input\.value\.trim\(\) \|\| randomValue\(\)/)
  assert.match(family, /Stack underflow:/)
  assert.match(family, /The stack did not change\./)
  assert.match(family, /steptrace__stack-pop-ghost/)
  assert.match(family, /void cell\.offsetWidth/)
  assert.doesNotMatch(
    family.slice(0, family.indexOf("export interface StackSequenceConfig")),
    /\bPlayer\b|\btimeline\b|\bframes\b/,
  )
  assert.match(styles, /\.steptrace \.steptrace__stack-board \{[^}]*flex-direction: column;/s)
  assert.match(styles, /\.steptrace \.steptrace__stack-cell \{[^}]*block-size: 2\.35rem;/s)
  assert.match(styles, /@keyframes steptrace-stack-push/)
  assert.match(styles, /@keyframes steptrace-stack-pop/)
  assert.match(styles, /@keyframes steptrace-stack-peek/)
  assert.match(
    styles,
    /@container steptrace-stack-sequence \(max-width: 36rem\)[\s\S]*\.steptrace \.steptrace__stack-controls \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
  )
  assert.match(
    styles,
    /\.steptrace__stack-controls \.steptrace__structure-input,[\s\S]*grid-column: 1 \/ -1/,
  )
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(harness, /--st-on-accent: #18210f/)
  assert.ok(contrastRatio("#18210f", "#92bd58") >= 4.5)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"stack","capacity":6,"values":\["A","B","C"\]\}\n```/,
  )
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive last-in, first-out stack/)
    assert.match(artifact, /Stack underflow: there is no top value to pop/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__stack-board/)
})

test("LinkedList exposes direct singly and doubly linked append controls in both hosts", () => {
  const { parseLinkedListConfig } = loadStepTraceModule("src", "algorithms", "linked-list.ts")
  const algorithm = readFileSync(join(here, "src", "algorithms", "linked-list.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "linked-topology.ts"), "utf8")
  const listFamily = family.slice(0, family.indexOf("export interface LinkedTopologyNode"))
  const styles = readFileSync(join(here, "src", "styles", "linked-topology.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Linear Structures",
      "LinkedList.md",
    ),
    "utf8",
  )

  assert.deepEqual(parseLinkedListConfig({ algorithm: "linked-list" }), {
    values: [12, 27, 39, 54],
    variant: "singly",
  })
  assert.throws(
    () => parseLinkedListConfig({ algorithm: "linked-list", array: [1] }),
    /linked-list requires 2 to 6 finite integer values/,
  )
  assert.throws(
    () => parseLinkedListConfig({ algorithm: "linked-list", array: [1, 2.5] }),
    /linked-list requires 2 to 6 finite integer values/,
  )
  assert.throws(
    () => parseLinkedListConfig({ algorithm: "linked-list", variant: "circular" }),
    /variant" must be "singly" or "doubly"/,
  )
  assert.match(algorithm, /family: "linked-topology"/)
  assert.match(algorithms, /import \{ linkedList \} from "\.\/linked-list"/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*linkedList,/)
  assert.match(family, /createStructureShell\(/)
  assert.match(listFamily, /steptrace__linked-list-board/)
  assert.match(listFamily, /steptrace__linked-list-node-card/)
  assert.match(listFamily, /array\.style\.setProperty\("--steptrace-capacity", "1"\)/)
  assert.match(family, /base \+ index \* 0x20/)
  assert.match(listFamily, /next \$\{nextAddress \?\? "null"\}/)
  assert.match(listFamily, /prev \$\{previousAddress \?\? "null"\}/)
  assert.match(listFamily, /steptrace__linked-list-link/)
  assert.match(listFamily, /shell\.button\("Append"/)
  assert.match(listFamily, /shell\.button\("Remove tail"/)
  assert.match(listFamily, /values\.push\(value\)/)
  assert.match(listFamily, /values\.pop\(\)/)
  assert.match(family, /Math\.floor\(Math\.random\(\) \* 90\) \+ 10/)
  assert.match(listFamily, /\$\{previousAddress\}\.next now stores \$\{nextAddress\}/)
  assert.match(listFamily, /\$\{nextAddress\}\.prev stores \$\{previousAddress\}/)
  assert.doesNotMatch(listFamily, /linkedSvgElement|steptrace__linked-list-svg/)
  assert.doesNotMatch(listFamily, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(styles, /\.steptrace \.steptrace__linked-list \{[^}]*min-block-size: 10\.5rem;/s)
  assert.match(
    styles,
    /\[data-variant="singly"\] \.steptrace__linked-list-cell \{[^}]*grid-template-rows: 2fr 1fr;/s,
  )
  assert.match(
    styles,
    /\[data-variant="doubly"\] \.steptrace__linked-list-cell \{[^}]*grid-template-rows: 2fr 1fr 1fr;/s,
  )
  assert.match(styles, /--steptrace-linked-gap:/)
  assert.match(styles, /max-inline-size: 5\.25rem/)
  assert.match(styles, /\.steptrace__linked-list-address/)
  assert.match(styles, /\.steptrace__linked-list-link\[data-pointer="next"\]/)
  assert.match(styles, /\.steptrace__linked-list-link\[data-pointer="prev"\]/)
  assert.match(
    styles,
    /\.steptrace__linked-list-node-card > \.steptrace__contiguous-array \{[^}]*position: relative;[^}]*border: 0;/s,
  )
  assert.match(
    styles,
    /\.steptrace__linked-list-node-card > \.steptrace__contiguous-array::after \{[^}]*z-index: 3;[^}]*inset: 0;[^}]*border: 1px solid color-mix\(in srgb, var\(--_text\) 22%, transparent\);[^}]*border-radius: inherit;[^}]*pointer-events: none;/s,
  )
  assert.match(
    styles,
    /\.steptrace__linked-list-node-card\[data-appended="1"\][\s\S]*> \.steptrace__contiguous-array::after \{[^}]*border: 2px solid var\(--_green\);/s,
  )
  assert.doesNotMatch(
    styles,
    /\.steptrace__linked-list-node-card\[data-appended="1"\] > \.steptrace__contiguous-array \{[^}]*box-shadow:/s,
  )
  assert.match(
    styles,
    /\.steptrace__linked-list-pointer::before \{[^}]*inset-inline: 1px;[^}]*border-block-start: 1px solid var\(--_border\);/s,
  )
  assert.doesNotMatch(styles, /\.steptrace__linked-list-pointer \{[^}]*border-block-start:/s)
  assert.doesNotMatch(styles, /\.steptrace__linked-list-cell \{[^}]*block-size: 7\.5rem;/s)
  assert.match(styles, /\[data-relinked="1"\][\s\S]*\[data-pointer="next"\]/)
  assert.match(styles, /@keyframes steptrace-linked-list-append/)
  assert.match(
    note,
    /```steptrace\n\{"tabs":\[\{"name":"Singly linked"[\s\S]*"variant":"doubly"[\s\S]*\]\}\n```/,
  )
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive \$\{config\.variant\} linked list/)
    assert.match(artifact, /\$\{previousAddress\}\.next now stores \$\{nextAddress\}/)
    assert.match(artifact, /Removed tail \$\{removed\}/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__linked-list-board/)
})

test("LRU Cache keeps one map and address-linked MRU-to-LRU chain in both hosts", () => {
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "linked-topology.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "linked-topology.scss"), "utf8")
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Composite Structures",
      "LRU Cache.md",
    ),
    "utf8",
  )
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )

  assert.match(algorithms, /import \{ lruCache \} from "\.\/lru-cache"/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*lruCache,/)
  assert.match(family, /function createAddressChain\(/)
  assert.match(family, /export function mountLruCache\(/)
  assert.match(family, /const capacity = 4/)
  assert.match(family, /let mapSlots: Array<string \| null> = \["A", "B", "C", null\]/)
  assert.match(family, /createIndexedBoard\(mapWrap, capacity/)
  assert.match(family, /mapSlots\.map\(\(storedKey, index\) =>/)
  assert.match(family, /entries\.find\(\(candidate\) => candidate\.key === storedKey\)/)
  assert.match(family, /active: Boolean\(entry && accessedKey && entry\.key === accessedKey\)/)
  assert.match(family, /changed: changedMapSlot != null && index === changedMapSlot/)
  assert.doesNotMatch(family, /active: entry\?\.key === accessedKey/)
  const lruSource = family.slice(
    family.indexOf("export function mountLruCache"),
    family.indexOf("export interface LinkedTopologyNode"),
  )
  assert.doesNotMatch(lruSource, /\brelinked\b/)
  assert.match(family, /const \[entry\] = entries\.splice\(index, 1\)/)
  assert.match(family, /entries\.unshift\(entry\)/)
  const promoteSource = family.slice(
    family.indexOf("function promote(index: number)"),
    family.indexOf("function onGet()"),
  )
  assert.doesNotMatch(promoteSource, /mapSlots/)
  assert.match(family, /entries\.length === capacity \? entries\.pop\(\)/)
  assert.match(family, /mapSlots\.findIndex\(\(storedKey\) => storedKey === evicted\.key\)/)
  assert.match(family, /mapSlots\[slot\] = target/)
  assert.match(family, /mapSlots = \["A", "B", "C", null\]/)
  assert.match(family, /changedMapSlot = undefined/)
  assert.match(family, /Get \$\{target\}: miss\. Cache state did not change\./)
  assert.match(family, /promoted \$\{entry\.address\} to MRU/)
  assert.match(family, /evicted LRU \$\{evicted\.key\}/)
  assert.match(family, /shell\.input\("Cache key", "Key"/)
  assert.match(family, /shell\.input\("Cache value", "Value"/)
  assert.doesNotMatch(lruSource, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(styles, /\.steptrace \.steptrace__lru-cache \{[^}]*min-block-size: 15rem;/s)
  assert.match(
    styles,
    /\.steptrace__lru-map \.steptrace__contiguous-cell\[data-active="1"\] \{[^}]*--steptrace-array-outline: var\(--_green\);[^}]*var\(--_green\) 16%/s,
  )
  assert.match(styles, /\[data-moved="1"\][\s\S]*border: 2px solid var\(--_green\)/)
  assert.match(note, /```steptrace\n\{"algorithm":"lru-cache"\}\n```/)
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive capacity-four least recently used cache/)
    assert.match(artifact, /evicted LRU/)
  }
})

test("meldable heap variants reuse one persistent forest family in both hosts", () => {
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "heap-structure.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "heap-selection.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const noteRoot = join(
    repoRoot,
    "Vault",
    "Home",
    "Computer Science",
    "Data Structures",
    "Trees",
    "Heap-like",
  )
  const notes = [
    ["Binomial Queues.md", /"algorithm":"binomial-queue"/],
    ["Fibonacci Heaps.md", /"algorithm":"fibonacci-heap"/],
    ["Leftist Heaps.md", /"algorithm":"leftist-heap"/],
    ["Skew Heaps.md", /"algorithm":"skew-heap"/],
  ]

  for (const name of ["binomialQueue", "fibonacciHeap", "leftistHeap", "skewHeap"])
    assert.match(algorithms, new RegExp(`interactiveStructures = \\[[\\s\\S]*${name},`))
  assert.match(family, /function paintForest\(/)
  assert.match(family, /function mergeBinaryHeaps\(/)
  assert.match(
    family,
    /mode === "skew" \|\| npl\(first\.children\[0\]\) < npl\(first\.children\[1\]\)/,
  )
  assert.match(family, /B₀ \+ B₀ links into a B₁ carry/)
  assert.match(family, /function consolidate\(\)/)
  assert.match(family, /function cascadingCut\(/)
  assert.match(family, /config\.values\.forEach\(insertValue\)/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(styles, /\.steptrace__heap-forest-svg/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  for (const [file, fence] of notes) {
    const note = readFileSync(join(noteRoot, file), "utf8")
    assert.match(note, fence)
    assert.doesNotMatch(note, /Visualization pending/)
  }
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive binomial queue meld/)
    assert.match(artifact, /Interactive Fibonacci heap/)
    assert.match(artifact, /`Interactive \$\{label\} meld`/)
    assert.match(artifact, /mountMergeHeap\(root, "leftist"\)/)
    assert.match(artifact, /mountMergeHeap\(root, "skew"\)/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__heap-forest-svg/)
})

test("Segment Tree reuses range blocks for point assignment and canonical range cover", () => {
  const algorithm = readFileSync(join(here, "src", "algorithms", "segment-tree.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "range-aggregate.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "range-aggregate.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Trees",
      "Segment Tree.md",
    ),
    "utf8",
  )

  assert.match(algorithm, /family: "range-aggregate"/)
  assert.match(algorithm, /4 to 8 finite integer values/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*segmentTree,/)
  assert.match(family, /function createRangeBlock\(/)
  assert.match(family, /function buildSegmentShape\(/)
  assert.match(family, /function coverRange\(/)
  assert.match(family, /shell\.button\("Set value"/)
  assert.match(family, /shell\.button\("Range sum"/)
  assert.match(styles, /\.steptrace__range-block \{/)
  assert.match(styles, /\.steptrace__segment-blocks \{/)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"segment-tree","array":\[3,4,1,7,2,6,5,8\]\}\n```/,
  )
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive segment tree with point assignment and range-sum queries/)
    assert.match(artifact, /recomputed its path to the root/)
  }
})

test("HashMap shares one fixed 12-cell renderer across three tabbed collision strategies", () => {
  const algorithm = readFileSync(join(here, "src", "algorithms", "hash-map.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "hash-index.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "hash-index.scss"), "utf8")
  const structureStyles = readFileSync(
    join(here, "src", "styles", "interactive-structure.scss"),
    "utf8",
  )
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const mount = readFileSync(join(here, "src", "mount.ts"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Hash-based Structures",
      "HashMap.md",
    ),
    "utf8",
  )
  const closedSource = family.slice(
    family.indexOf("function closedPath"),
    family.indexOf("function openProbe"),
  )
  const putArrivalSource = family.slice(
    family.indexOf('if (plan.finish === "put" && target)'),
    family.indexOf('if (plan.finish === "search-hit" && target)'),
  )

  assert.match(algorithm, /id: "hash-map"/)
  assert.match(algorithm, /family: "hash-index"/)
  assert.match(algorithm, /"closed-addressing", "open-addressing", "buckets"/)
  assert.match(algorithm, /fixed "capacity" 12/)
  assert.match(algorithms, /import \{ hashMap \} from "\.\/hash-map"/)
  assert.match(family, /const SIZE = 12/)
  assert.match(family, /const BUCKET_SIZE = 3/)
  assert.match(family, /const slots: Array<HashEntry \| null> = Array\(SIZE\)\.fill\(null\)/)
  assert.match(family, /const chains: HashEntry\[\]\[\] = Array\.from\(\{ length: SIZE \}/)
  assert.match(family, /function closedPut\(/)
  assert.match(family, /function openProbe\(/)
  assert.match(family, /function bucketPath\(/)
  assert.match(family, /tombstones\[target\] = false/)
  assert.match(closedSource, /chain\.push\(\{ key, value, home: lookup\.home, next: null \}\)/)
  assert.match(closedSource, /chain\.splice\(found, 1\)/)
  assert.doesNotMatch(closedSource, /slots\[|findIndex\(\(entry\) => entry == null\)|overflow cell/)
  assert.match(family, /Bucket \$\{traversal\.bucket\} was full; overflow/)
  assert.match(family, /Math\.floor\(Math\.random\(\) \* 90\) \+ 10/)
  assert.match(family, /const HOP_MS = 320/)
  assert.match(family, /const FINISH_MS = 180/)
  assert.match(family, /const RETURN_MS = 180/)
  assert.match(family, /if \(shell\.reducedMotion\(\)\)/)
  assert.match(family, /const CHAIN_CAPACITY = 3/)
  assert.match(family, /chain is full \(\$\{CHAIN_CAPACITY\}\)/)
  assert.match(family, /clearTimeout\(motionTimer\)/)
  assert.match(family, /typeof node\.animate === "function"/)
  assert.match(family, /for \(const animation of activeAnimations\) animation\.cancel\(\)/)
  assert.match(family, /finish: "put" \| "search-hit" \| "remove-hit" \| "return"/)
  assert.match(family, /x: targetRect\.left - tokenOrigin\.left/)
  assert.match(family, /y: targetRect\.top - tokenOrigin\.top/)
  assert.match(
    family,
    /x: targetRect\.left \+ targetRect\.width \/ 2 - tokenOrigin\.left - width \/ 2/,
  )
  assert.match(
    family,
    /y: targetRect\.top \+ targetRect\.height \/ 2 - tokenOrigin\.top - height \/ 2/,
  )
  assert.match(
    family,
    /motion === "travel" && target\s*\? centeredTokenFrame\(target, tokenOrigin\)/,
  )
  assert.match(family, /function arriveToken[\s\S]*?const next = tokenFrame\(target, tokenOrigin\)/)
  assert.match(
    family,
    /function finishEffect[\s\S]*?const next = centeredTokenFrame\(target, tokenOrigin\)/,
  )
  assert.match(family, /width: `\$\{next\.width\}px`/)
  assert.match(family, /height: `\$\{next\.height\}px`/)
  assert.match(family, /borderRadius: "5px"/)
  assert.match(family, /width: `\$\{fromWidth\}px`/)
  assert.match(family, /height: `\$\{fromHeight\}px`/)
  assert.match(family, /padding: "5px 7px"/)
  assert.match(family, /nativeAnimation\(tokenInline, \[\{ opacity: 1 \}, \{ opacity: 0 \}\]/)
  assert.match(family, /nativeAnimation\(tokenStored, \[\{ opacity: 0 \}, \{ opacity: 1 \}\]/)
  assert.match(family, /finishEffect\(target, "success"/)
  assert.match(family, /finishEffect\(target, "extract"/)
  assert.match(family, /finishPlan\(plan, tokenOrigin, false, true\)/)
  assert.match(
    family,
    /function restoreGenericToken\(\) \{[\s\S]*?tokenInline\.textContent = content === "map" \? "k:v" : "key"/,
  )
  assert.match(family, /if \(restoreChip\) restoreGenericToken\(\)\s*settleToken\(!restoreChip\)/)
  assert.match(family, /const probePath = plan\.finish === "put" \? plan\.path\.slice\(0, -1\)/)
  assert.doesNotMatch(putArrivalSource, /selected = plan\.target|activePath = plan\.path|paint\(\)/)
  assert.match(
    family,
    /if \(probePath\.length\) advance\(\)\s*else \{\s*activePath = \[\]\s*selected = null/,
  )
  assert.match(
    family,
    /if \(plan\.finish === "put"\) \{\s*activeChain = null\s*selectedChain = null/,
  )
  assert.match(family, /if \(plan\.chainTarget\) \{\s*moveToken\(target, "travel", HOP_MS/)
  assert.match(
    family,
    /function clearTransientState\(\) \{[\s\S]*?activePath = \[\][\s\S]*?activeKey = null/,
  )
  assert.match(family, /plan\.commit\?\.\(\)\s*clearTransientState\(\)\s*shell\.status/)
  assert.doesNotMatch(family, /pendingChainTarget|dataset\.pending|dataset\.bucket/)
  assert.match(family, /token\.style\.removeProperty\(property\)/)
  assert.doesNotMatch(family, /SVG_NS|ResizeObserver|drawArrows|marker-end|steptrace__hash-head/)
  assert.doesNotMatch(family, /steptrace__tab/)
  assert.doesNotMatch(family, /LOAD_THRESHOLD|capacity \*=|rehash/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b|\bTrace\b/)
  assert.match(mount, /if \(!handles\[next\]\) handles\[next\] = mount\(panelMounts\[next\]/)
  assert.match(structureStyles, /--steptrace-structure-control-size: 2\.75rem/)
  assert.match(structureStyles, /@container steptrace-structure \(max-width: 36rem\)/)
  assert.match(styles, /grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.steptrace__hash-index \{[^}]*block-size: 14\.65rem;/s)
  assert.match(styles, /\.steptrace__hash-canvas \{[^}]*block-size: 11rem;/s)
  assert.match(styles, /\.steptrace__hash-canvas \{[^}]*grid-template-rows: 7rem 4rem;/s)
  assert.match(
    styles,
    /\.steptrace__hash-chain \{[^}]*gap: 0\.28rem;[^}]*padding: 0\.2rem 0\.08rem 0\.28rem;/s,
  )
  assert.match(
    styles,
    /\.steptrace__hash-buckets\[data-strategy="closed-addressing"\] \{[^}]*align-self: start;/s,
  )
  assert.doesNotMatch(
    styles,
    /border-block-end-color: transparent|border-end-(?:start|end)-radius: 0/,
  )
  assert.match(
    styles,
    /\.steptrace__hash-chain-slot\[data-filled="1"\] \{[^}]*grid-template-rows: repeat\(2, minmax\(0, 1fr\)\);[^}]*align-items: stretch;[^}]*justify-content: stretch;[^}]*justify-items: stretch;[^}]*gap: 0;[^}]*padding: 0;/s,
  )
  assert.match(
    styles,
    /\.steptrace__hash-chain-slot\[data-filled="1"\] > \.steptrace__hash-key,[\s\S]*?> \.steptrace__hash-value \{[^}]*place-items: center;/,
  )
  assert.match(
    styles,
    /\.steptrace__hash-chain-slot\[data-filled="1"\] > \.steptrace__hash-value \{[^}]*border-block-start: 1px solid/,
  )
  assert.doesNotMatch(styles, /\.steptrace__hash-chain-slot\[data-filled="1"\]::after/)
  assert.doesNotMatch(styles, /\.steptrace__hash-chain(?:\[[^\]]+\])?::after/)
  assert.match(styles, /\.steptrace__hash-buckets \{[^}]*overflow: hidden;/s)
  assert.match(styles, /\.steptrace__hash-buckets \{[^}]*border-radius: 9px;/s)
  assert.match(styles, /\.steptrace__hash-cell \{[^}]*border-inline-end:/s)
  assert.match(
    styles,
    /\.steptrace__hash-cell \{[^}]*grid-template-rows: repeat\(2, minmax\(0, 1fr\)\);/s,
  )
  assert.match(styles, /\.steptrace__hash-cell \{[^}]*block-size: 4rem;/s)
  assert.match(
    styles,
    /\.steptrace__hash-buckets\[data-strategy="closed-addressing"\] \.steptrace__hash-cell \{[^}]*block-size: 2\.25rem;/s,
  )
  assert.doesNotMatch(styles, /\.steptrace__hash-cell \{[^}]*border-radius:/s)
  assert.match(styles, /\.steptrace__hash-index-label \{[^}]*border-block-start:/s)
  assert.doesNotMatch(styles, /overflow-x:\s*(auto|scroll)/)
  assert.match(styles, /\.steptrace__hash-operation \{[^}]*min-height: 3rem;/s)
  assert.match(family, /--steptrace-token-width/)
  assert.match(family, /--steptrace-token-height/)
  assert.match(styles, /\.steptrace__hash-token\[data-motion="arrival"\]/)
  assert.match(styles, /\.steptrace__hash-token\[data-motion="arrival"\] \{[^}]*max-width: none;/s)
  assert.match(
    styles,
    /\.steptrace__hash-token\[data-motion="return"\] \{[^}]*max-width: none;[^}]*opacity: 0;/s,
  )
  assert.match(styles, /\.steptrace__hash-token\[data-motion="handoff"\] \{[^}]*opacity: 0;/s)
  assert.doesNotMatch(
    styles,
    /\.steptrace__hash-token \{[^}]*transition:\s*(?:width|height|padding|border-radius|transform)/s,
  )
  assert.match(
    styles,
    /\.steptrace__hash-token\[data-motion="arrival"\] \.steptrace__hash-token-inline/,
  )
  assert.match(
    styles,
    /\.steptrace__hash-token\[data-motion="arrival"\] \.steptrace__hash-token-stored/,
  )
  assert.doesNotMatch(styles, /data-motion="morph"/)
  assert.doesNotMatch(styles, /\.steptrace__hash-token::after/)
  assert.doesNotMatch(styles, /--_orange|--_red/)
  assert.match(styles, /\.steptrace__hash-cell\[data-probe="collision"\]/)
  assert.match(styles, /\.steptrace__hash-cell\[data-probe="visited"\]/)
  assert.doesNotMatch(styles, /data-bucket=/)
  assert.doesNotMatch(styles, /svg|marker|steptrace__hash-arrow/)
  assert.match(
    styles,
    /\.steptrace__hash-buckets\[data-strategy="buckets"\][\s\S]*?nth-child\(3n\):not\(:last-child\)[^{]*\{[^}]*border-inline-end-width: 2px;/,
  )
  assert.match(styles, /\.steptrace__hash-controls \{[^}]*grid-template-areas:/s)
  assert.match(
    styles,
    /\.steptrace__hash-controls \{[^}]*var\(--steptrace-structure-control-size\)/s,
  )
  assert.match(styles, /\.steptrace__hash-fields \{[^}]*repeat\(2,/s)
  assert.match(styles, /\.steptrace__hash-actions \{[^}]*repeat\(4,/s)
  assert.match(
    styles,
    /@container steptrace-structure \(max-width: 36rem\)[^{]*\{[\s\S]*?\.steptrace__hash-actions \{[^}]*grid-template-columns: repeat\(2,/,
  )
  assert.match(
    styles,
    /@container steptrace-structure \(max-width: 36rem\)[^{]*\{[\s\S]*?\.steptrace__hash-fields > \.steptrace__structure-input:first-child \{[^}]*grid-column: auto;/,
  )
  assert.doesNotMatch(styles, /@media \(hover: hover\) and \(pointer: fine\)/)
  assert.doesNotMatch(styles, /min-height: 2rem|border-radius: 0\.35rem/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styleEntry, /@use "hash-index";/)
  assert.match(quartzJs, /Interactive hash map using/)
  assert.match(obsidianJs, /Interactive hash map using/)
  assert.match(quartzCss, /\.steptrace__hash-buckets/)
  assert.match(obsidianCss, /\.steptrace__hash-buckets/)
  for (const name of ["Closed Addressing", "Open Addressing", "Bucket Hashing"])
    assert.match(note, new RegExp(`"name":"${name}"`))
  for (const variant of ["closed-addressing", "open-addressing", "buckets"])
    assert.match(note, new RegExp(`"variant":"${variant}"`))
  assert.match(note, /each bucket points to its own external key\/value chain/)
  assert.match(note, /production maps usually resize or rebuild after crossing a load threshold/)
  assert.doesNotMatch(family, /\bmod\b/)
  assert.doesNotMatch(note, /\bmod\b/)
  assert.doesNotMatch(note, /Visualization pending/)
})

test("Hash Set and Bloom Filter reuse the persistent hash-index board with direct operations", () => {
  const family = readFileSync(join(here, "src", "families", "hash-index.ts"), "utf8")
  const hashSet = readFileSync(join(here, "src", "algorithms", "hash-set.ts"), "utf8")
  const bloomFilter = readFileSync(join(here, "src", "algorithms", "bloom-filter.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "hash-index.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const notesRoot = join(
    repoRoot,
    "Vault",
    "Home",
    "Computer Science",
    "Data Structures",
    "Hash-based Structures",
  )
  const mapNote = readFileSync(join(notesRoot, "HashMap.md"), "utf8")
  const collisionNote = readFileSync(join(notesRoot, "Collision Resolution.md"), "utf8")
  const setNote = readFileSync(join(notesRoot, "Hash Set.md"), "utf8")
  const bloomNote = readFileSync(join(notesRoot, "Bloom Filter.md"), "utf8")
  const tabConfig = (note) => note.match(/```steptrace\n(\{"tabs":.+\})\n```/)?.[1]

  assert.match(hashSet, /id: "hash-set"/)
  assert.match(hashSet, /family: "hash-index"/)
  assert.match(hashSet, /fixed "capacity" 12/)
  assert.match(hashSet, /"variant" must be "open-addressing"/)
  assert.match(bloomFilter, /id: "bloom-filter"/)
  assert.match(bloomFilter, /family: "hash-index"/)
  assert.match(bloomFilter, /fixed "capacity" 10/)
  assert.match(algorithms, /import \{ bloomFilter \} from "\.\/bloom-filter"/)
  assert.match(algorithms, /import \{ hashSet \} from "\.\/hash-set"/)
  assert.match(algorithms, /bloomFilter,[\s\S]*hashMap,[\s\S]*hashSet,/)
  assert.match(family, /function createHashIndexSurface\(/)
  assert.match(family, /export function mountHashSet\(/)
  assert.match(family, /export function mountBloomFilter\(/)
  assert.match(family, /Add \$\{key\} rejected; the key already exists/)
  assert.match(family, /Contains \$\{key\}: true/)
  assert.match(family, /Contains" : "Search"/)
  assert.match(family, /value\.append\(key\)\s*if \(content === "map"\)/)
  assert.match(family, /indexFor\(seed, 10\)/)
  assert.match(family, /indexFor\(seed \* 3 \+ 1, 10\)/)
  assert.match(family, /indexFor\(seed \* 7 \+ 4, 10\)/)
  assert.match(family, /if \(kind === "add"\) bits\[index\] = true/)
  assert.match(family, /if \(kind === "query" && !bits\[index\]\)/)
  assert.match(family, /"definitely-absent"/)
  assert.match(family, /"possibly-present"/)
  assert.match(family, /setTimeout\(completeStep, HOP_MS\)/)
  assert.match(family, /`bit \$\{index\}, \$\{bits\[index\] \? "set to 1" : "set to 0"\}`/)
  assert.match(styles, /\.steptrace__hash-buckets\[data-strategy="bits"\]/)
  assert.match(styles, /\.steptrace__hash-buckets\[data-strategy="bits"\] \{[^}]*repeat\(10,/s)
  assert.match(
    styles,
    /\.steptrace__hash-controls\[data-mode="bloom"\] \.steptrace__hash-actions \{[^}]*repeat\(3,/s,
  )
  assert.doesNotMatch(styles, /overflow-x:\s*(auto|scroll)/)
  assert.equal(tabConfig(collisionNote), tabConfig(mapNote))
  assert.match(setNote, /```steptrace\n\{"algorithm":"hash-set"\}\n```/)
  assert.match(bloomNote, /```steptrace\n\{"algorithm":"bloom-filter"\}\n```/)
  for (const note of [collisionNote, setNote, bloomNote])
    assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive key-only hash set/)
    assert.match(artifact, /Interactive 10-bit Bloom filter/)
    assert.match(artifact, /definitely absent/)
    assert.match(artifact, /possibly present/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__hash-buckets\[data-strategy=bits\]/)
})

test("prefix-character styles keep the stage stable, responsive, reduced, and Trace top-aligned", () => {
  const family = readFileSync(join(here, "src", "families", "prefix-character.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "prefix-character.scss"), "utf8")
  const shared = readFileSync(join(here, "src", "styles", "shared.scss"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")

  assert.match(family, /id: "prefix-character"/)
  assert.match(family, /stableStage: true/)
  assert.match(family, /"trie" \| "aho-corasick" \| "ternary-search-tree"/)
  assert.match(algorithms, /import \{ trie \} from "\.\/trie"/)
  assert.match(algorithms, /import \{ ahoCorasick \} from "\.\/aho-corasick"/)
  assert.match(algorithms, /import \{ ternarySearchTree \} from "\.\/ternary-search-tree"/)
  assert.match(styles, /width: min\(100%, 30rem\)/)
  assert.match(styles, /grid-template-rows: auto minmax\(0, 1fr\)/)
  assert.match(styles, /overflow-x: hidden/)
  assert.match(styles, /@media \(max-width: 560px\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styles, /transition-property: opacity, color, fill, stroke/)
  assert.match(styles, /\.steptrace__prefix-edge--failure \{[^}]*stroke-dasharray: 4 5;/s)
  assert.match(styles, /\.steptrace__prefix-edge-role \{[^}]*font-family: var\(--_font-mono\)/s)
  assert.match(styles, /\.steptrace__prefix-text-cell\[data-active="1"\]/)
  assert.match(
    styles,
    /\.steptrace__prefix-text\[data-visible="0"\] \{[^}]*visibility: hidden;[^}]*opacity: 0;/s,
  )
  assert.match(family, /textRow\.dataset\.visible = textVisible \? "1" : "0"/)
  assert.match(family, /textRow\.setAttribute\("aria-hidden", String\(!textVisible\)\)/)
  assert.doesNotMatch(family, /textRow\.hidden = !frame\.text/)
  const nodeType = styles.match(/\.steptrace__prefix-node > text \{[^}]*\}/s)?.[0] || ""
  assert.doesNotMatch(family, /steptrace__prefix-edge-label/)
  assert.doesNotMatch(styles, /steptrace__prefix-edge-label/)
  assert.match(nodeType, /font: 600 0\.66rem\/1 var\(--_font-head\)/)
  assert.match(family, /label\.setAttribute\("dominant-baseline", "central"\)/)
  assert.match(family, /label\.setAttribute\("dy", "0\.04em"\)/)
  assert.doesNotMatch(nodeType, /font(?:-size)?:[^;]*\d+px/)
  assert.doesNotMatch(styles, /overflow-x: auto/)
  assert.match(shared, /\.steptrace__log\s*\{[^}]*justify-content: flex-start;/s)
  assert.doesNotMatch(shared, /\.steptrace__log\s*\{[^}]*justify-content: flex-end;/s)
})

test("Graph registers one synchronized persistent representation in both hosts", () => {
  const algorithm = readFileSync(join(here, "src", "algorithms", "graph.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "graph-representation.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "graph-representation.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(
      repoRoot,
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Graph Structures",
      "Graph.md",
    ),
    "utf8",
  )
  const topologyStyles =
    styles.match(/\.steptrace \.steptrace__graph-rep-topology \{[^}]*\}/s)?.[0] || ""

  assert.match(algorithm, /id: "graph"/)
  assert.match(algorithm, /family: "graph-representation"/)
  assert.match(algorithms, /import \{ graphStructure \} from "\.\/graph"/)
  assert.match(algorithms, /graphStructure,[\s\S]*hashMap/)
  assert.match(family, /normalizeGraph\(/)
  assert.match(family, /adjacency\(graph\)/)
  assert.match(family, /const INITIAL_EDGES =/)
  assert.match(family, /\["0", "1"\]/)
  assert.match(family, /\["2", "3"\]/)
  assert.match(family, /Self-edges are not stored/)
  assert.match(family, /already exists/)
  assert.match(family, /does not exist/)
  assert.match(family, /edges\.push\(\{ from: source, to: target \}\)/)
  assert.match(family, /edges\.splice\(index, 1\)/)
  assert.match(family, /steptrace-graph-rep-arrow-/)
  assert.match(family, /viewBox: "0 0 580 210"/)
  assert.match(family, /markerWidth: 7/)
  assert.match(family, /\{ \.\.\.node, y: Math\.round\(105 \+ \(node\.y - 150\) \* 0\.63\) \}/)
  assert.match(family, /observeFixedSvgNodes\(/)
  assert.match(family, /svgElement\("circle", \{ r: GRAPH_NODE_RADIUS_PX \}\)/)
  assert.match(
    family,
    /line\.dataset\.changed = changedEdge === key && present\.has\(key\) \? "1" : "0"/,
  )
  assert.match(family, /if \(shell\.reducedMotion\(\)\)/)
  assert.match(family, /if \(changeTimer\) clearTimeout\(changeTimer\)/)
  assert.match(family, /steptrace__dp-wrap steptrace__graph-rep-matrix-wrap/)
  assert.match(family, /steptrace__dp steptrace__graph-rep-matrix-table/)
  assert.match(family, /document\.createElement\("thead"\)/)
  assert.match(family, /document\.createElement\("tbody"\)/)
  assert.match(family, /heading\.setAttribute\("scope", "row"\)/)
  assert.match(family, /steptrace__contiguous-array steptrace__graph-rep-list-body/)
  assert.match(family, /--steptrace-capacity", "4"/)
  assert.match(family, /--steptrace-capacity", "12"/)
  assert.match(family, /steptrace__contiguous-cell steptrace__graph-rep-edge-row/)
  assert.match(family, /shell\.select\("From vertex", "From", VERTICES\)/)
  assert.match(family, /shell\.select\("To vertex", "To", VERTICES\)/)
  assert.match(family, /classList\.add\("steptrace__graph-rep-select"\)/)
  assert.match(family, /Choose From and To vertices\./)
  assert.doesNotMatch(family, /\.children\.at\(/)
  assert.match(family, /Add or remove an edge to inspect each representation\./)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(
    styles,
    /\.steptrace__graph-rep-storage \{[^}]*grid-template-columns: minmax\(0, 1fr\)/s,
  )
  assert.match(
    styles,
    /\.steptrace__graph-rep-lists \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 3fr\)/s,
  )
  assert.match(styles, /min-block-size: 21rem/)
  assert.doesNotMatch(topologyStyles, /border|background|border-radius/)
  assert.match(styles, /\.steptrace__graph-rep-lists \{[^}]*display: grid;/s)
  assert.match(styles, /\.steptrace__graph-rep-matrix-wrap \{[^}]*overflow: hidden;/s)
  assert.match(styles, /steptrace__contiguous-value/)
  assert.match(styles, /white-space: nowrap/)
  assert.doesNotMatch(family, /steptrace__graph-rep-controls/)
  assert.doesNotMatch(styles, /steptrace__graph-rep-controls/)
  assert.doesNotMatch(styles, /graph-rep-select:focus-visible|background-(?:image|position)/)
  assert.match(styles, /@container steptrace-structure \(max-width: 36rem\)/)
  assert.match(
    styles,
    /@container steptrace-structure \(max-width: 36rem\)[\s\S]*?\.steptrace__graph-rep-lists \{[^}]*grid-template-columns: minmax\(0, 1fr\)/,
  )
  assert.doesNotMatch(styles, /overflow-x:\s*(auto|scroll)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(styleEntry, /@use "graph-representation";/)
  assert.match(note, /```steptrace\n\{"algorithm":"graph"\}\n```/)
  assert.match(note, /Add `3 → 0` first/)
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive directed unweighted graph storage inspector/)
    assert.match(artifact, /Self-edges are not stored/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__graph-rep-storage/)
})

test("AVL Tree registers one persistent balanced binary-tree prototype in both hosts", () => {
  const algorithm = readFileSync(join(here, "src", "algorithms", "avl-tree.ts"), "utf8")
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "binary-tree.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "binary-tree.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const note = readFileSync(
    join(repoRoot, "Vault", "Home", "Computer Science", "Data Structures", "Trees", "AVL Tree.md"),
    "utf8",
  )

  assert.match(algorithm, /id: "avl-tree"/)
  assert.match(algorithm, /family: "binary-tree"/)
  assert.match(algorithm, /const DEFAULT_VALUES = \[40, 20, 60, 10, 30, 50, 70\]/)
  assert.match(algorithm, /parseBinaryTreeConfig\(config, "avl-tree", DEFAULT_VALUES, 11\)/)
  assert.match(algorithms, /import \{ avlTree \} from "\.\/avl-tree"/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*avlTree,/)
  assert.match(family, /createStructureShell\(/)
  assert.match(family, /onEnter\(shell, input, onInsert\)/)
  assert.match(family, /observeFixedSvgNodes\(/)
  assert.match(family, /trimGraphEdge\(/)
  assert.match(family, /GRAPH_NODE_RADIUS_PX/)
  assert.match(family, /repairs\.push\(`LL at \$\{current\.key\}`\)/)
  assert.match(family, /repairs\.push\(`RR at \$\{current\.key\}`\)/)
  assert.match(family, /repairs\.push\(`LR at \$\{current\.key\}`\)/)
  assert.match(family, /repairs\.push\(`RL at \$\{current\.key\}`\)/)
  assert.match(family, /already exists, so the tree did not change/)
  assert.match(family, /Search path \$\{state\.path\.join\(" → "\)\}/)
  assert.match(family, /rebalanced the shortened path/)
  assert.match(family, /Math\.floor\(Math\.random\(\) \* 90\) \+ 10/)
  assert.match(family, /`h\$\{current\.height\} bf\$\{balanceFactor\(current\)\}`/)
  assert.match(family, /successMarker\("steptrace__binary-tree-success"\)/)
  assert.match(family, /const MAX_VALUES = 9/)
  assert.match(family, /kind === "avl-tree" \? 11 : MAX_VALUES/)
  assert.doesNotMatch(family, /settleLater|clearTimer|850/)
  assert.doesNotMatch(family, /✓|dataset\.tone/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b/)
  assert.match(styles, /min-block-size: 17rem/)
  assert.match(styles, /inline-size: min\(100%, 42rem\)/)
  assert.match(styles, /overflow: hidden/)
  assert.match(styles, /@container steptrace-binary-tree \(max-width: 36rem\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /structure-status\[data-tone/)
  assert.doesNotMatch(styles, /overflow-x:\s*(auto|scroll)/)
  assert.match(styleEntry, /@use "binary-tree";/)
  assert.match(
    note,
    /```steptrace\n\{"algorithm":"avl-tree","values":\[30,20,40,10\],"value":5\}\n```/,
  )
  assert.match(note, /Press \*\*Insert\*\* with the prefilled `5`/)
  assert.doesNotMatch(note, /Visualization pending/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive AVL tree/)
    assert.match(artifact, /rebalanced the shortened path/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__binary-tree-surface/)
})

test("BST, red-black, and splay trees share the direct binary-tree contract in both hosts", () => {
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "binary-tree.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "binary-tree.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )

  for (const [id, file, fence] of [
    ["binary-search-tree", "Binary Search Tree.md", /"value":80/],
    ["red-black-tree", "Red-Black Tree.md", /"value":0/],
    ["splay-tree", "Splay Tree.md", /"value":60/],
  ]) {
    const definition = readFileSync(join(here, "src", "algorithms", `${id}.ts`), "utf8")
    const note = readFileSync(
      join(repoRoot, "Vault", "Home", "Computer Science", "Data Structures", "Trees", file),
      "utf8",
    )
    assert.match(definition, new RegExp(`id: "${id}"`))
    assert.match(definition, /family: "binary-tree"/)
    assert.match(algorithms, new RegExp(`${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())},`))
    assert.match(note, new RegExp(`"algorithm":"${id}"`))
    assert.match(note, fence)
    assert.doesNotMatch(note, /Visualization pending/)
  }

  assert.match(family, /line\.dataset\.from = String\(parent\.node\.key\)/)
  assert.match(family, /line\.dataset\.to = String\(child\.node\.key\)/)
  assert.match(family, /line\.dataset\.side = child\.node === parent\.node\.left/)
  assert.match(family, /group\.dataset\.key = String\(entry\.node\.key\)/)
  assert.match(family, /group\.dataset\.color = kind === "red-black-tree"/)
  assert.match(family, /canonical splay moves last accessed/)
  assert.match(family, /Black-height \$\{blackHeight\(model\.root\)\} is equal on every path/)
  assert.match(styles, /\[data-color="red"\]/)
  assert.match(styles, /@media \(forced-colors: active\)/)
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive binary search tree/)
    assert.match(artifact, /Interactive red-black tree/)
    assert.match(artifact, /Interactive splay tree/)
  }
})

test("B-tree and B+ Tree preserve exact order-4 split, routing, and leaf-link invariants", () => {
  const { createMultiwayTreeModel, createMultiwayTreeOperationState } = loadStepTraceModule(
    "src",
    "families",
    "multiway-tree.ts",
  )
  const { bTree } = loadStepTraceModule("src", "algorithms", "b-tree.ts")
  const { bPlusTree } = loadStepTraceModule("src", "algorithms", "b-plus-tree.ts")
  const leaves = (root) => {
    const result = []
    const visit = (node) => {
      if (!node.children.length) result.push(node)
      else node.children.forEach(visit)
    }
    visit(root)
    return result
  }
  const assertOrderFour = (root) => {
    const leafDepths = new Set()
    const visit = (node, depth) => {
      assert.ok(node.keys.length <= 3)
      if (node.children.length) {
        assert.equal(node.children.length, node.keys.length + 1)
        node.children.forEach((child) => visit(child, depth + 1))
      } else leafDepths.add(depth)
    }
    visit(root, 0)
    assert.equal(leafDepths.size, 1)
  }

  assert.deepEqual(bTree.parse({ algorithm: "b-tree", order: 4 }), {
    values: [10, 20, 5],
    value: 6,
    range: undefined,
  })
  assert.deepEqual(bPlusTree.parse({ algorithm: "b-plus-tree", order: 4 }).range, [15, 40])
  assert.throws(() => bTree.parse({ algorithm: "b-tree", order: 3 }), /supports fixed order 4/)
  assert.throws(
    () => bTree.parse({ algorithm: "b-tree", values: [1, 1] }),
    /requires unique values/,
  )
  assert.throws(
    () => bTree.parse({ algorithm: "b-tree", values: [1, 2.5] }),
    /requires finite integer values/,
  )
  assert.throws(
    () =>
      bTree.parse({
        algorithm: "b-tree",
        values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      }),
    /supports at most 10 values/,
  )

  const bTreeModel = createMultiwayTreeModel("b-tree", [10, 20, 5])
  const bTreeInsert = createMultiwayTreeOperationState()
  bTreeModel.insert(6, bTreeInsert)
  assert.deepEqual(bTreeModel.root.keys, [10])
  assert.deepEqual(
    bTreeModel.root.children.map((node) => node.keys),
    [[5, 6], [20]],
  )
  assert.equal(bTreeInsert.special, 10)
  assertOrderFour(bTreeModel.root)

  const bPlusModel = createMultiwayTreeModel("b-plus-tree", [5, 9, 12, 17, 33, 40, 21])
  const bPlusInsert = createMultiwayTreeOperationState()
  bPlusModel.insert(25, bPlusInsert)
  assert.deepEqual(bPlusModel.root.keys, [12, 21, 33])
  assert.deepEqual(
    leaves(bPlusModel.root).map((node) => node.keys),
    [
      [5, 9],
      [12, 17],
      [21, 25],
      [33, 40],
    ],
  )
  assert.equal(bPlusInsert.special, 21)
  const bPlusLeaves = leaves(bPlusModel.root)
  assert.deepEqual(
    bPlusLeaves.map((leaf) => leaf.next?.id ?? null),
    [bPlusLeaves[1].id, bPlusLeaves[2].id, bPlusLeaves[3].id, null],
  )
  assertOrderFour(bPlusModel.root)

  const search = createMultiwayTreeOperationState()
  assert.equal(bPlusModel.search(21, search).found, true)
  assert.equal(search.path.has(bPlusModel.root.id), true)
  assert.equal(bPlusLeaves.filter((leaf) => search.path.has(leaf.id)).length, 1)
  assert.deepEqual([...search.found], [`${bPlusLeaves[2].id}:21`])

  const range = createMultiwayTreeOperationState()
  assert.deepEqual(bPlusModel.range(15, 40, range).matches, [17, 21, 25, 33, 40])
  assert.equal(bPlusLeaves.filter((leaf) => range.path.has(leaf.id)).length, 3)
  assert.deepEqual(
    [...range.links],
    [`${bPlusLeaves[1].id}->${bPlusLeaves[2].id}`, `${bPlusLeaves[2].id}->${bPlusLeaves[3].id}`],
  )

  const capped = createMultiwayTreeModel("b-tree", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(capped.insert(11, createMultiwayTreeOperationState()).changed, false)
  assert.deepEqual(capped.keys(), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

test("B-tree and B+ Tree register one direct responsive multiway-tree contract in both hosts", () => {
  const algorithms = readFileSync(join(here, "src", "algorithms", "index.ts"), "utf8")
  const family = readFileSync(join(here, "src", "families", "multiway-tree.ts"), "utf8")
  const styles = readFileSync(join(here, "src", "styles", "multiway-tree.scss"), "utf8")
  const styleEntry = readFileSync(join(here, "src", "styles", "index.scss"), "utf8")
  const quartzJs = readFileSync(join(here, "generated", "engine.js"), "utf8")
  const quartzCss = readFileSync(join(here, "generated", "engine.css"), "utf8")
  const obsidianJs = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "main.js"),
    "utf8",
  )
  const obsidianCss = readFileSync(
    join(repoRoot, "Vault", ".obsidian", "plugins", "steptrace", "styles.css"),
    "utf8",
  )
  const bTreeNote = readFileSync(
    join(repoRoot, "Vault", "Home", "Computer Science", "Data Structures", "Trees", "B-tree.md"),
    "utf8",
  )
  const bPlusNote = readFileSync(
    join(repoRoot, "Vault", "Home", "Computer Science", "Data Structures", "Trees", "B+ Tree.md"),
    "utf8",
  )

  assert.match(algorithms, /import \{ bTree \} from "\.\/b-tree"/)
  assert.match(algorithms, /import \{ bPlusTree \} from "\.\/b-plus-tree"/)
  assert.match(algorithms, /interactiveStructures = \[[\s\S]*bPlusTree,[\s\S]*bTree,/)
  assert.match(family, /createStructureShell\(/)
  assert.match(family, /const MAX_KEYS = 3/)
  assert.match(family, /const MAX_VALUES = 10/)
  assert.match(family, /const CELL_WIDTH = 33/)
  assert.match(family, /const NODE_GAP = 8/)
  assert.match(family, /Math\.round\(svg\.getBoundingClientRect\(\)\.width\)/)
  assert.match(family, /let cursor = \(viewWidth - levelWidth\) \/ 2/)
  assert.match(family, /supports fixed order 4/)
  assert.match(family, /upperBound\(current\.keys, key\)/)
  assert.match(family, /right\.next = current\.next/)
  assert.match(family, /current\.next = right/)
  assert.match(family, /group\.dataset\.role = node\.children\.length \? "internal" : "leaf"/)
  assert.match(family, /path\.dataset\.from = leaf\.id/)
  assert.match(family, /path\.dataset\.to = next\.id/)
  assert.match(family, /svg\.setAttribute\("viewBox", `0 0 \$\{VIEW_WIDTH\} \$\{VIEW_HEIGHT\}`\)/)
  assert.match(family, /status/)
  assert.doesNotMatch(family, /\bPlayer\b|\btimeline\b|\bframes\b|class\s+\w+/)
  assert.match(styles, /min-block-size: 15rem/)
  assert.match(styles, /font: 700 0\.8rem\/1 var\(--_font-mono\)/)
  assert.match(styles, /inline-size: min\(100%, 42rem\)/)
  assert.match(styles, /overflow: hidden/)
  assert.match(styles, /@container steptrace-multiway-tree \(min-width: 36rem\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
  assert.doesNotMatch(styles, /overflow-x:\s*(auto|scroll)/)
  assert.match(styleEntry, /@use "multiway-tree";/)
  assert.match(
    bTreeNote,
    /```steptrace\n\{"algorithm":"b-tree","values":\[10,20,5\],"value":6\}\n```/,
  )
  assert.match(
    bPlusNote,
    /```steptrace\n\{"algorithm":"b-plus-tree","values":\[5,9,12,17,33,40,21\],"value":25,"range":\[15,40\]\}\n```/,
  )
  for (const artifact of [quartzJs, obsidianJs]) {
    assert.match(artifact, /Interactive order-4 \$\{label\}/)
    assert.match(artifact, /id: "b-tree"/)
    assert.match(artifact, /id: "b-plus-tree"/)
    assert.match(artifact, /Range scan/)
  }
  for (const artifact of [quartzCss, obsidianCss])
    assert.match(artifact, /\.steptrace__multiway-tree-link/)
})
