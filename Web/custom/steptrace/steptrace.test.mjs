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
  "jump-search",
  "ternary-search",
  "exponential-search",
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
  assert.match(obsidianCss, /--st-held-bg: #fbbf24/)
  assert.match(obsidianCss, /--st-held-fg: #1f2937/)
  assert.match(quartzHostStyles, /--st-held-bg: #92400e/)
  assert.match(quartzHostStyles, /--st-held-fg: #ffffff/)
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
        : algorithm === "shell-sort"
          ? { gaps: [4, 2, 1] }
          : algorithm === "cyclic-sort"
            ? { array: [5, 3, 1, 4, 2] }
            : ["exponential-search", "jump-search"].includes(algorithm)
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
    "ee0315779ec86617d90dbbd9c7adfb760f29c97cadf47addb5eb01bd8b8743fb",
    "the headless StepTrace behavior changed",
  )
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
