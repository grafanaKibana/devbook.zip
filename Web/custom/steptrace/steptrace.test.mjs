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
  "counting-sort",
  "radix-sort",
  "bucket-sort",
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
  "union-find",
  "kernighan-popcount",
  "n-queens",
  "memoization",
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

function buildAbstractMemoization() {
  const { memoization } = loadStepTraceModule("src", "algorithms", "memoization.ts")
  const config = memoization.parse({ algorithm: "memoization" })
  const recorder = memoization.family.createRecorder(config)
  memoization.run(config, recorder)
  return { config, family: memoization.family, frames: recorder.frames }
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
  assert.match(
    readFileSync(join(here, "src", "styles", "shared.scss"), "utf8"),
    /\.steptrace__body\s*\{[^}]*block-size: clamp\(14rem, calc\(100dvh - 12rem\), 28rem\);/,
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
    "b4755a50a103ceaf38b2f787beca827ff9256dd10afcc4691d1afbfc827dd647",
    "the headless StepTrace behavior changed",
  )
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
  globalThis.document = { createElement: (tagName) => new FakeNode(tagName) }
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
    assert.equal(inputBars.children.length, 8)
    assert.equal(outputBars.children.length, 8)
    assert.match(source, /makeDistributionArrayBand/)
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
      /\.steptrace\[data-visual-family="distribution-sort"\] \.steptrace__rail \{\n    min-block-size: 16rem;\n  \}/,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) and \(pointer: coarse\) \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[\s\S]*column-gap: 0\.5rem;[\s\S]*min-height: calc\(2 \* 2\.75rem\);/,
    )
    assert.match(
      styleSource,
      /@media \(max-width: 560px\) \{[\s\S]*\.steptrace__distribution \{\n    gap: 0\.55rem;\n  \}/,
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
  globalThis.document = { createElement: (tagName) => new FakeNode(tagName) }
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
    const [radixStage] = radixView.nodes
    const [sourceBand, bucketBand, legend, outputBand] = radixStage.children
    const [sourceLabel, sourceBars] = sourceBand.children
    const [bucketLabel, board] = bucketBand.children
    const [outputLabel, outputBars] = outputBand.children

    assert.equal(radixView.stageLayout, "fill")
    assert.equal(radixView.stableStage, true)
    assert.deepEqual(
      [sourceLabel.textContent, bucketLabel.textContent, outputLabel.textContent],
      ["Current Array", "Digit Buckets", "Gathered Pass"],
    )
    assert.equal(sourceBars.children.length, 8)
    assert.equal(board.children.length, 10)
    assert.equal(outputBars.children.length, 8)
    assert.equal(legend.attributes.get("aria-label"), "Distribution state legend")

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
    const [bucketStage] = bucketView.nodes
    const [, rangeBand, , sortedBand] = bucketStage.children
    assert.equal(rangeBand.children[0].textContent, "Range Buckets")
    assert.equal(rangeBand.children[1].children.length, 5)
    assert.equal(sortedBand.children[0].textContent, "Sorted Array")

    assert.match(
      styleSource,
      /\.steptrace__distribution-bucket-board \{[\s\S]*block-size: clamp\(7rem, 17vh, 8\.5rem\);[\s\S]*overflow-x: auto;[\s\S]*border: 1px solid var\(--_distribution-border\);[\s\S]*border-radius: var\(--_distribution-radius\);/,
    )
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
      /\.steptrace__distribution-lane:first-child\[data-active="1"\]::after \{[\s\S]*border-start-start-radius:/,
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
    assert.equal(svg.attributes.get("viewBox"), "0 0 588 224")
    assert.equal(svg.attributes.get("style:--steptrace-tree-width"), "500px")
    assert.equal(surface.attributes.get("rx"), "7")
    assert.equal(ring.attributes.get("rx"), "9")
    assert.equal(surface.attributes.get("width"), "84")
    assert.equal(ring.attributes.get("width"), "88")
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
  assert.equal(executionTreeViewDescriptor.nodeWidth, 84)
  assert.equal(executionTreeViewDescriptor.nodeHeight, 40)
  assert.equal(executionTreeViewDescriptor.minSvgWidth, 500)
  assert.equal(executionTreeViewDescriptor.canvasScale, 0.84)
  assert.match(mountSource, /root\.dataset\.visualFamily = built\.family\.id/)
  assert.match(
    sharedStyles,
    /\.steptrace:is\([\s\S]*?\[data-visual-family="monotone-boundary"\][\s\S]*?\)\s*\{\s*container: steptrace-wide-stage \/ inline-size;/,
  )
  assert.match(
    sharedStyles,
    /@container steptrace-wide-stage \(max-width: 64rem\)[\s\S]*?\[data-visual-family="monotone-boundary"\][\s\S]*?\.steptrace__body\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/,
  )
  const wideStageFamilies = sharedStyles.match(
    /\.steptrace:is\(([^)]*)\)\s*\{\s*container: steptrace-wide-stage \/ inline-size;/,
  )
  assert.ok(wideStageFamilies)
  assert.doesNotMatch(wideStageFamilies[1], /execution-tree/)
  assert.match(styles, /\.steptrace \.steptrace__rectree/)
  assert.match(styles, /overflow-x: auto/)
  assert.match(styles, /place-items: center/)
  assert.match(styles, /inline-size: var\(--steptrace-tree-width, 100%\)/)
  assert.match(styles, /min-inline-size: var\(--steptrace-tree-width, 100%\)/)
  assert.match(styles, /\.steptrace \.steptrace__rtsvg text/)
  assert.match(styles, /\.steptrace__rtlabel[^}]*font: 600 12px\/1 var\(--_font-mono\);/s)
  assert.match(styles, /\.steptrace__rtdetail[^}]*font: 400 10\.5px\/1 var\(--_font-mono\);/s)
  assert.match(styles, /\[data-shape="card"\] \.steptrace__rtval/)
  assert.match(styles, /\.steptrace__rectree \+ \.steptrace__legend[^}]*margin-top: 0\.4rem;/s)
  assert.match(styles, /\.steptrace__rtbadge[^}]*font: 600 7px\/1 var\(--_font-head\);/s)
  assert.doesNotMatch(styles, /glow|drop-shadow/)
  assert.match(renderSource, /svg\.setAttribute\("aria-labelledby"/)
  assert.match(renderSource, /group\.setAttribute\("focusable", "false"\)/)
  assert.match(renderSource, /stageLayout: "fill"/)
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
  assert.ok(nodes.h1.x - nodes.g1.x > memoizationTreeViewDescriptor.nodeWidth)
  assert.ok(nodes.h2.x - nodes.g2.x > memoizationTreeViewDescriptor.nodeWidth)
  assert.equal(memoizationTreeViewDescriptor.nodeWidth, 84)
  assert.equal(memoizationTreeViewDescriptor.nodeHeight, 40)
  assert.equal(memoizationTreeViewDescriptor.minSvgWidth, 500)
  assert.equal(memoizationTreeViewDescriptor.canvasScale, 0.84)
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
  assert.equal(dynamicProgrammingTreeViewDescriptor.nodeWidth, 92)
  assert.equal(dynamicProgrammingTreeViewDescriptor.nodeHeight, 44)
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
  const family = readFileSync(join(here, "src", "families", "monotone-boundary.ts"), "utf8")

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
  globalThis.document = { createElement: (tagName) => new FakeNode(tagName) }
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
