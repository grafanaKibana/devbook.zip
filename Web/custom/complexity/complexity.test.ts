import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import type { Element } from "hast"

import { renderComplexityDom } from "./dom"
import { renderComplexityHast } from "./hast"
import { mountComplexityFigure } from "./interactions"
import { buildComplexityViewModel, COMPLEXITY_CHART, CURVE_IDS, curveValue } from "./model"
import { ComplexityBlock } from "../transformers/complexity-block"

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.name.endsWith(".md") ? [path] : []
  })
}

const variables = { n: "number of input elements" }
const cases = {
  version: 1,
  mode: "cases",
  title: "Quick Sort complexity",
  variables,
  entries: [
    {
      kind: "case",
      role: "Best",
      curveId: "n-log-n",
    },
    {
      kind: "case",
      role: "Average",
      curveId: "n-log-n",
    },
    {
      kind: "case",
      role: "Worst",
      curveId: "quadratic",
    },
  ],
}
const operations = {
  version: 1,
  mode: "operations",
  title: "HashMap complexity",
  variables,
  entries: [
    {
      kind: "operation",
      operation: "Lookup",
      bounds: [
        {
          kind: "text",
          formula: "O(bucket length)",
          role: "Collision-bound",
        },
        {
          kind: "catalogue",
          curveId: "constant",
          role: "Average",
        },
      ],
    },
  ],
}

const dualResource = {
  version: 2,
  label: "Quick Sort complexity",
  variables: {
    inputSize: {
      symbol: "n",
      description: "number of input elements",
    },
  },
  resources: {
    space: {
      mode: "operations",
      entries: [
        {
          kind: "operation",
          operation: "Recursion stack",
          bounds: [
            { kind: "curve", role: "Best", formula: "O(log n)", curveId: "log-n" },
            { kind: "text", role: "Implementation dependent", formula: "tail-call stack" },
          ],
        },
      ],
    },
    time: {
      mode: "cases",
      entries: [
        { kind: "case", role: "Best", formula: "O(n log n)", curveId: "n-log-n" },
        {
          kind: "case",
          role: "Average",
          formula: "O(n log n) expected",
          curveId: "n-log-n",
        },
        { kind: "case", role: "Worst", formula: "O(n²)", curveId: "quadratic" },
      ],
    },
  },
}

const empiricalResource = {
  version: 2,
  label: "A* observed complexity",
  variables: {
    depth: {
      symbol: "d",
      description: "optimal solution depth",
    },
  },
  resources: {
    time: {
      mode: "operations",
      entries: [
        {
          kind: "operation",
          operation: "Observed average",
          bounds: [
            {
              kind: "samples",
              role: "Average expansions",
              formula: "Mean expansions",
              samples: [
                { n: 1, value: 2.05 },
                { n: 2, value: 3.33 },
                { n: 3, value: 5.21 },
              ],
            },
          ],
        },
      ],
    },
    space: {
      mode: "operations",
      entries: [
        {
          kind: "operation",
          operation: "Observed average",
          bounds: [
            {
              kind: "samples",
              role: "Average peak stored",
              formula: "Mean peak stored",
              samples: [
                { n: 1, value: 5.26 },
                { n: 2, value: 7.87 },
                { n: 3, value: 10.95 },
              ],
            },
          ],
        },
      ],
    },
  },
}

const comparison = {
  version: 2,
  label: "Dynamic Programming complexity",
  variables: { inputSize: { symbol: "n", description: "number of input elements" } },
  resources: {
    time: {
      mode: "comparison",
      entries: [
        {
          kind: "approach",
          label: "Naive (enumerate subsets)",
          formula: "O(2^n)",
          curveId: "exponential",
        },
        { kind: "approach", label: "Dynamic programming", formula: "O(n)", curveId: "linear" },
      ],
    },
    space: {
      mode: "comparison",
      entries: [
        { kind: "text", label: "Naive (enumerate subsets)", formula: "O(1), no table" },
        { kind: "approach", label: "Dynamic programming", formula: "O(n)", curveId: "linear" },
      ],
    },
  },
}

test("a comparison resource plots approaches into one ungrouped legend", () => {
  const view = buildComplexityViewModel(comparison, "dp-comparison")
  const [time, space] = view.resources

  assert.deepEqual(
    view.resources.map(({ mode }) => mode),
    ["comparison", "comparison"],
  )
  assert.equal(time.legend.length, 1)
  assert.equal(time.legend[0].label, undefined)
  assert.deepEqual(
    time.legend[0].items.map((item) => [item.kind, item.label]),
    [
      ["plotted", "Naive (enumerate subsets)"],
      ["plotted", "Dynamic programming"],
    ],
  )
  assert.deepEqual(
    time.paths.map((path) => path.color),
    ["#e05252", "#22a06b"],
  )
  assert.ok(time.paths.every((path) => path.legendGroup === undefined))
  assert.deepEqual(
    time.endpointLabels.filter((label) => !label.dimmed).map((label) => label.formula),
    ["O(2^n)", "O(n)"],
  )

  assert.equal(space.legend.length, 1)
  assert.equal(space.legend[0].label, undefined)
  assert.deepEqual(
    space.legend[0].items.map((item) => [item.kind, item.label]),
    [
      ["semantic", "Naive (enumerate subsets): O(1), no table"],
      ["plotted", "Dynamic programming"],
    ],
  )

  const hast = renderComplexityHast(view)
  const legends = findAllHastByClass(hast, "complexity__legend")
  assert.deepEqual(
    legends.map(({ properties }) => (properties.className as string[]).at(-1)),
    ["is-ungrouped", "is-ungrouped"],
  )
  assert.equal(findAllHastByClass(hast, "complexity__legend-group-button").length, 0)
})

const banded = {
  ...comparison,
  resources: {
    ...comparison.resources,
    time: {
      mode: "comparison",
      entries: [
        {
          kind: "approach",
          label: "Naive (rescan every window)",
          formula: "O(n·k)",
          curveFrom: "linear",
          curveTo: "quadratic",
        },
        { kind: "approach", label: "Sliding window", formula: "O(n)", curveId: "linear" },
      ],
    },
  },
}

test("a band spans two rungs without renaming either of them", () => {
  const time = buildComplexityViewModel(banded, "band").resources[0]
  const [span, single] = time.paths

  assert.equal(span.curveId, "linear")
  assert.equal(span.bandTo, "quadratic")
  assert.ok(span.bandGeometry, "a bounded band strokes its ceiling")
  assert.ok(span.area.endsWith(" Z"), "the band fill is a closed region")
  assert.ok(span.area.includes(span.bandGeometry), "the fill runs along the upper edge")
  assert.equal(single.bandTo, undefined)
  assert.equal(single.bandGeometry, undefined)

  // The ladder keeps its canonical rungs; O(n·k) belongs to the band, not to O(n).
  const rung = (curveId: string) =>
    time.endpointLabels.find((label) => label.curveId === curveId)?.formula
  assert.equal(rung("linear"), "O(n)")
  assert.equal(rung("quadratic"), "O(n²)")
  // Only the plain O(n) line owns the linear rung; the band that starts there does not.
  const linear = time.endpointLabels.find((label) => label.curveId === "linear")
  assert.deepEqual(linear?.pathIds, [single.id])
  assert.equal(linear?.color, single.color)
  assert.deepEqual(
    time.legend[0].items.map((item) => item.label),
    ["Naive (rescan every window): O(n·k)", "Sliding window"],
  )
  assert.deepEqual(
    time.legend[0].items.map((item) => item.kind === "plotted" && item.banded),
    [true, false],
  )
})

test("an unbounded band runs off the plot instead of borrowing a ceiling", () => {
  const open = {
    ...banded,
    resources: {
      ...banded.resources,
      time: {
        mode: "comparison",
        entries: [
          {
            kind: "approach",
            label: "Naive (recurse every choice)",
            formula: "O(D^W)",
            curveFrom: "exponential",
            curveTo: "unbounded",
          },
          banded.resources.time.entries[1],
        ],
      },
    },
  }
  const [span] = buildComplexityViewModel(open, "open").resources[0].paths

  assert.equal(span.bandTo, "unbounded")
  assert.equal(span.bandGeometry, undefined, "there is no ceiling curve to stroke")
  const topY = Math.min(
    ...[...span.area.matchAll(/(?:^|[ MLC])-?[\d.]+,(-?[\d.]+)/g)].map(([, y]) => Number(y)),
  )
  assert.ok(topY < COMPLEXITY_CHART.top, `fill must exit the plot, got ${topY}`)
  // The rung stays a neutral reference: a band must not recolour or rename it at mount.
  const rung = buildComplexityViewModel(open, "open-rung").resources[0].endpointLabels.find(
    (label) => label.curveId === "exponential",
  )
  assert.deepEqual(rung?.pathIds, [])
  assert.equal(rung?.dimmed, true)
  assert.equal(rung?.formula, "O(2^n)")

  const hast = renderComplexityHast(buildComplexityViewModel(open, "open-hast"))
  assert.equal(findAllHastByClass(hast, "complexity__curve--band-top").length, 0)
  assert.equal(
    findAllHastByClass(
      renderComplexityHast(buildComplexityViewModel(banded, "closed-hast")),
      "complexity__curve--band-top",
    ).length,
    1,
  )
})

test("a band is rejected when it has no span or double-declares its curve", () => {
  const withFirst = (first: Record<string, unknown>) => ({
    ...banded,
    resources: {
      ...banded.resources,
      time: { mode: "comparison", entries: [first, banded.resources.time.entries[1]] },
    },
  })
  const base = { kind: "approach", label: "Naive (a)", formula: "O(a)" }

  assert.throws(
    () =>
      buildComplexityViewModel(
        withFirst({ ...base, curveFrom: "quadratic", curveTo: "linear" }),
        "down",
      ),
    /resources\.time\.entries\[0\]\.curveTo: must grow faster than quadratic/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel(
        withFirst({ ...base, curveFrom: "linear", curveTo: "linear" }),
        "flat",
      ),
    /must grow faster than linear/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel(
        withFirst({ ...base, curveId: "linear", curveFrom: "linear", curveTo: "quadratic" }),
        "both",
      ),
    /resources\.time\.entries\[0\]\.curveId: cannot be combined with curveFrom and curveTo/,
  )
})

test("comparison colour tracks growth, not authoring order", () => {
  const withCurves = (first: string, second: string) => ({
    ...comparison,
    resources: {
      ...comparison.resources,
      time: {
        mode: "comparison",
        entries: [
          { kind: "approach", label: "Naive (a)", formula: "O(a)", curveId: first },
          { kind: "approach", label: "Technique", formula: "O(b)", curveId: second },
        ],
      },
    },
  })
  const colors = (config: unknown, namespace: string) =>
    buildComplexityViewModel(config, namespace).resources[0].paths.map((path) => path.color)

  assert.deepEqual(colors(withCurves("quadratic", "linear"), "wins"), ["#e05252", "#22a06b"])
  // A band ranks by its ceiling: an approach is only as cheap as its worst case.
  const spanned = (first: Record<string, unknown>, second: Record<string, unknown>) => ({
    ...comparison,
    resources: {
      ...comparison.resources,
      time: {
        mode: "comparison",
        entries: [
          { kind: "approach", label: "Naive (a)", formula: "O(a)", ...first },
          { kind: "approach", label: "Technique", formula: "O(b)", ...second },
        ],
      },
    },
  })
  assert.deepEqual(
    colors(spanned({ curveFrom: "linear", curveTo: "quadratic" }, { curveId: "linear" }), "ceil"),
    ["#e05252", "#22a06b"],
  )
  // Equal ceilings tie even though the band reaches lower — the win is conditional.
  assert.deepEqual(
    colors(
      spanned({ curveId: "n-log-n" }, { curveFrom: "linear", curveTo: "n-log-n" }),
      "conditional",
    ),
    ["#1597b8", "#9b6bd6"],
  )
  // Unbounded outranks every rung on the ladder.
  assert.deepEqual(
    colors(
      spanned({ curveFrom: "factorial", curveTo: "unbounded" }, { curveId: "factorial" }),
      "open",
    ),
    ["#e05252", "#22a06b"],
  )
  // A technique that costs more must not be painted as the win just for being second.
  assert.deepEqual(colors(withCurves("constant", "linear"), "trades"), ["#22a06b", "#e05252"])
  // Equal growth gets a neutral pair: red/green would claim a difference the formulas deny.
  assert.deepEqual(colors(withCurves("linear", "linear"), "ties"), ["#1597b8", "#9b6bd6"])
  // One plotted curve has nothing to rank against.
  assert.deepEqual(
    buildComplexityViewModel(comparison, "single").resources[1].paths.map((path) => path.color),
    ["#9b6bd6"],
  )
})

test("a comparison resource rejects a single approach, duplicates, and unknown kinds", () => {
  const withEntries = (entries: unknown[]) => ({
    ...comparison,
    resources: { ...comparison.resources, time: { mode: "comparison", entries } },
  })
  assert.throws(
    () => buildComplexityViewModel(withEntries([comparison.resources.time.entries[0]]), "one"),
    /resources\.time\.entries: must compare at least two approaches/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel(
        withEntries([comparison.resources.time.entries[0], comparison.resources.time.entries[0]]),
        "dupe",
      ),
    /resources\.time\.entries\[1\]\.label: duplicates Naive \(enumerate subsets\)/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel(
        withEntries([
          { kind: "case", role: "Best", formula: "O(n)", curveId: "linear" },
          comparison.resources.time.entries[1],
        ]),
        "kind",
      ),
    /resources\.time\.entries\[0\]\.kind: must be approach or text/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel(
        withEntries([
          { kind: "text", label: "Naive (a)", formula: "O(a)" },
          { kind: "text", label: "Technique", formula: "O(b)" },
        ]),
        "unplottable",
      ),
    /resources\.time\.entries: must plot at least one approach/,
  )
})

test("version 2 rejects approximate curve projections", () => {
  assert.throws(
    () =>
      buildComplexityViewModel(
        {
          ...dualResource,
          resources: {
            ...dualResource.resources,
            time: {
              ...dualResource.resources.time,
              entries: [
                { ...dualResource.resources.time.entries[0], approximate: true },
                ...dualResource.resources.time.entries.slice(1),
              ],
            },
          },
        },
        "approx-rejected",
      ),
    /resources\.time\.entries\[0\]\.approximate: is not supported/,
  )
})

test("Quartz registers complexity before syntax highlighting", () => {
  const source = readFileSync(join(process.cwd(), "quartz.ts"), "utf8")
  const lookup = source.indexOf("const syntaxHighlightingIdx =")
  const insertion = source.indexOf("config.plugins.transformers.splice(", lookup)
  const complexity = source.indexOf("ComplexityBlock()", insertion)
  const laterTransformer = source.indexOf(
    "config.plugins.transformers.push(SteptraceBlock())",
    complexity,
  )
  assert.ok(
    lookup >= 0 && lookup < insertion && insertion < complexity && complexity < laterTransformer,
  )
})

test("the catalogue is closed and representative values are exact for n=2…10", () => {
  assert.deepEqual(CURVE_IDS, [
    "constant",
    "log-log-n",
    "log-n",
    "linear",
    "n-log-n",
    "quadratic",
    "exponential",
    "factorial",
  ])
  assert.equal(curveValue("constant", 10), 1)
  // The log rungs are shifted by one so they are defined at n = 0 and climb out of the
  // origin; log 9 rather than log 8 is the price of a ladder with no gap at the left edge.
  assert.equal(curveValue("log-log-n", 8), Math.log2(1 + Math.log2(9)))
  assert.equal(curveValue("log-n", 8), Math.log2(9))
  assert.equal(curveValue("linear", 10), 10)
  assert.equal(curveValue("n-log-n", 8), 8 * Math.log2(9))
  // Both start at 0, so no rung has a stretch of the axis it cannot be drawn on.
  assert.equal(curveValue("log-log-n", 0), 0)
  assert.equal(curveValue("log-n", 0), 0)
  assert.equal(curveValue("n-log-n", 0), 0)
  assert.equal(curveValue("quadratic", 10), 100)
  assert.equal(curveValue("exponential", 10), 1024)
  assert.equal(curveValue("factorial", 10), 3_628_800)
})

test("every representative function uses the fixed 0-origin and 1…10k log scale", () => {
  const evaluators = {
    constant: () => 1,
    "log-log-n": (n: number) => Math.log2(1 + Math.log2(1 + n)),
    "log-n": (n: number) => Math.log2(1 + n),
    linear: (n: number) => n,
    "n-log-n": (n: number) => n * Math.log2(1 + n),
    quadratic: (n: number) => n * n,
    exponential: (n: number) => 2 ** n,
    factorial: (n: number) => {
      let value = 1
      for (let factor = 2; factor <= n; factor++) value *= factor
      return value
    },
  }
  const view = buildComplexityViewModel({
    version: 1,
    mode: "catalogue",
    title: "Common complexity classes",
    variables,
    entries: CURVE_IDS.map((curveId) => ({
      kind: "catalogue",
      curveId,
    })),
  })
  const maximum = 10_000
  const [zero, one, ten] = view.ticks
  const decade = ten.y - one.y
  for (const path of view.paths) {
    assert.deepEqual(
      path.samples.map(({ n }) => n),
      [2, 3, 4, 5, 6, 7, 8, 9, 10],
    )
    for (const sample of path.samples) {
      const expected = evaluators[path.curveId](sample.n)
      assert.equal(sample.value, expected)
      // Every value sits where its own decade puts it, measured off the rendered ticks.
      assert.ok(
        Math.abs(sample.y - (one.y + Math.log10(expected) * decade)) < 1e-9,
        `${path.curveId} n=${sample.n}`,
      )
    }
    // The line is the curve and nothing else: sampling starts at n = 0 and steps one
    // sample at a time, so there is no straight run from the axis to the first sample.
    assert.match(path.geometry, /^M0\.00,[\d.]+ C[\d.,]+ [\d.,]+ 10\.94,/)
    assert.equal(path.geometry.match(/ C/g)?.length, 64)
    assert.doesNotMatch(path.geometry, / L/)
  }
  const factorialPath = view.paths.find(({ curveId }) => curveId === "factorial")
  assert.ok(factorialPath)
  const factorialYs = factorialPath.geometry
    .split(" C")
    .slice(1)
    .map((segment) => segment.trim().split(" ").at(-1)!.split(",")[1])
  assert.equal(new Set(factorialYs).size, factorialYs.length)
  assert.deepEqual(
    view.ticks.map(({ value }) => value),
    [0, 1, 10, 100, 1_000, maximum],
  )
  // Decades stay evenly spaced, and the 0-to-1 band is exactly the width that makes a
  // straight run across it leave at the log branch's own slope. Any narrower and the
  // scale would have to curve into 1, which is what put an S in every line.
  const decades = view.ticks.slice(2).map((tick, index) => tick.y - view.ticks[index + 1].y)
  assert.ok(
    decades.every((gap) => Math.abs(gap - decades[0]) < 1e-9),
    `decades ${decades}`,
  )
  assert.ok(Math.abs(one.y - zero.y - decade / Math.LN10) < 1e-9, "toe meets the log slope")
})

test("catalogue config derives formulas without redundant chart commentary", () => {
  const config = {
    version: 1,
    mode: "catalogue",
    title: "Common complexity classes",
    variables,
    entries: CURVE_IDS.map((curveId) => ({
      kind: "catalogue",
      curveId,
    })),
  }
  const view = buildComplexityViewModel(config)
  assert.deepEqual(
    view.paths.filter((path) => !path.dimmed).map((path) => path.formula),
    ["O(1)", "O(log log n)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2^n)", "O(n!)"],
  )
  assert.equal(view.paths.find((path) => path.curveId === "factorial")?.samples.length, 9)
  assert.equal(
    view.paths.find((path) => path.curveId === "factorial")?.samples.at(-1)?.value,
    3_628_800,
  )
  assert.equal("caption" in view, false)
  assert.equal(view.endpointLabels.length, CURVE_IDS.length)
  assert.throws(
    () =>
      buildComplexityViewModel({
        ...config,
        entries: [{ ...config.entries[0], formula: "O(wrong)" }],
      }),
    /entries\[0\]\.formula: is not supported/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel({
        ...config,
        entries: [{ ...config.entries[0], id: "authored" }],
      }),
    /entries\[0\]\.id: is not supported/,
  )
})

test("the 10k ceiling clips visually without changing representative values", () => {
  const view = buildComplexityViewModel(cases)
  const factorial = view.paths.find((path) => path.curveId === "factorial")
  assert.equal(factorial?.samples.at(-1)?.value, 3_628_800)
  assert.ok((factorial?.samples.at(-1)?.y ?? 18) < 18)
  assert.equal(view.ticks.at(-1)?.value, 10_000)
  assert.equal(view.ticks[0]?.label, "0")
  assert.ok(view.ticks.every((tick, index) => index === 0 || tick.y < view.ticks[index - 1].y))
  assert.deepEqual(
    view.xTicks.map(({ value }) => value),
    [2, 4, 6, 8, 10],
  )
})

test("duplicate case curves merge into one labelled path", () => {
  const view = buildComplexityViewModel(cases)
  const combined = view.paths.find((path) => path.label.startsWith("Average/Best:"))
  const endpoint = view.endpointLabels.find((label) => label.curveId === "n-log-n")
  assert.match(combined?.geometry ?? "", /^M0\.00,/)
  assert.equal(combined?.category, "average")
  assert.equal(combined?.color, "#d99a00")
  assert.equal(endpoint?.pathIds.length, 1)
  assert.equal(endpoint?.color, combined?.color)

  const hast = renderComplexityHast(view)
  const hastCurves = findAllHastByClass(hast, "complexity__curve").filter(
    ({ properties }) =>
      properties["data-curve-id"] === "n-log-n" && properties["data-context"] === "false",
  )
  assert.deepEqual(
    hastCurves.map(({ properties }) => properties.stroke),
    [combined?.color],
  )
  assert.equal(
    findAllHastByClass(hast, "complexity__endpoint-label").find(
      ({ properties }) => properties["data-curve-id"] === "n-log-n",
    )?.properties.style,
    `--complexity-label-color:${combined?.color}`,
  )

  const document = new FakeDocument()
  const root = document.createElement("div")
  renderComplexityDom(root as unknown as HTMLElement, view)
  const domCurves = findAllFake(root, "path").filter(
    ({ attributes }) =>
      attributes["data-curve-id"] === "n-log-n" && attributes["data-context"] === "false",
  )
  assert.deepEqual(
    domCurves.map(({ attributes }) => attributes.stroke),
    [combined?.color],
  )
  assert.equal(
    findAllFake(root, "text")
      .find(({ attributes }) => attributes["data-curve-id"] === "n-log-n")
      ?.style.values.get("--complexity-label-color"),
    combined?.color,
  )
})

test("operation text bounds stay semantic-only while catalogue bounds plot", () => {
  const view = buildComplexityViewModel(operations)
  assert.equal(view.paths.filter((path) => !path.dimmed).length, 1)
  assert.equal(view.paths.find((path) => !path.dimmed)?.curveId, "constant")
  assert.ok(view.paths.flatMap((path) => path.samples).every(({ y }) => Number.isFinite(y)))
  assert.deepEqual(
    view.legend[0].items.map((item) => ({
      kind: item.kind,
      label: item.label,
      interactive: "pathId" in item,
    })),
    [
      { kind: "semantic", label: "Collision-bound: O(bucket length)", interactive: false },
      { kind: "plotted", label: "Average", interactive: true },
    ],
  )
})

test("operation legends group each operation and shade its plotted bounds", () => {
  const view = buildComplexityViewModel({
    version: 1,
    mode: "operations",
    title: "Grouped operations",
    variables,
    entries: ["Lookup", "Insert"].map((operation) => ({
      kind: "operation",
      operation,
      bounds: [
        { kind: "catalogue", curveId: "constant", role: "Best" },
        { kind: "catalogue", curveId: "constant", role: "Average" },
        { kind: "catalogue", curveId: "linear", role: "Worst single op" },
      ],
    })),
  })

  assert.deepEqual(
    view.legend.map((group) => ({
      label: group.label,
      labels: group.items.map((item) => item.label),
      colors: group.items.map((item) => item.color),
    })),
    [
      {
        label: "Lookup",
        labels: ["Best", "Average", "Worst single op"],
        colors: ["#8bb8e8", "#4c89cb", "#245b98"],
      },
      {
        label: "Insert",
        labels: ["Best", "Average", "Worst single op"],
        colors: ["#bd9ee8", "#8d62c7", "#65379e"],
      },
    ],
  )
  const constantPaths = view.paths.filter((path) => !path.dimmed && path.curveId === "constant")
  assert.equal(new Set(constantPaths.map((path) => path.geometry)).size, 1)
  assert.ok(constantPaths.every((path) => path.geometry.startsWith("M0.00,")))
})

test("semantic duplicates and unknown fields fail at their exact field", () => {
  assert.throws(
    () =>
      buildComplexityViewModel({
        ...cases,
        entries: [cases.entries[0], cases.entries[0], cases.entries[2]],
      }),
    /entries\[1\]\.role: duplicates Best/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel({
        ...operations,
        entries: [
          {
            ...operations.entries[0],
            latency: "variable",
          },
        ],
      }),
    /entries\[0\]\.latency: is not supported/,
  )
  assert.throws(
    () => buildComplexityViewModel({ ...cases, variables: { size: "items" } }),
    /variables\.n: is required/,
  )
})

test("all duplicate, missing, override, and unknown catalogue fields fail locally", () => {
  const catalogueEntry = {
    kind: "catalogue",
    curveId: "constant",
  }
  const catalogue = {
    version: 1,
    mode: "catalogue",
    title: "Catalogue",
    variables,
    entries: [catalogueEntry],
  }
  const invalid: [unknown, RegExp][] = [
    [{ ...catalogue, title: "" }, /title: must be a non-empty string/],
    [
      { ...catalogue, entries: [catalogueEntry, catalogueEntry] },
      /entries\[1\]\.curveId: duplicates constant/,
    ],
    [
      { ...catalogue, entries: [{ ...catalogueEntry, curveId: "cubic" }] },
      /entries\[0\]\.curveId: must be one of/,
    ],
    [
      { ...catalogue, entries: [{ ...catalogueEntry, representativeFunction: "n" }] },
      /entries\[0\]\.representativeFunction: is not supported/,
    ],
    [{ ...catalogue, extra: true }, /config\.extra: is not supported/],
    [
      {
        ...operations,
        entries: [operations.entries[0], operations.entries[0]],
      },
      /entries\[1\]\.operation: duplicates Lookup/,
    ],
    [
      {
        ...operations,
        entries: [
          {
            ...operations.entries[0],
            bounds: [operations.entries[0].bounds[0], operations.entries[0].bounds[0]],
          },
        ],
      },
      /entries\[0\]\.bounds\[1\]\.role: duplicates Collision-bound/,
    ],
    [
      {
        ...operations,
        entries: [
          {
            ...operations.entries[0],
            bounds: [{ ...operations.entries[0].bounds[1], formula: "O(wrong)" }],
          },
        ],
      },
      /entries\[0\]\.bounds\[0\]\.formula: is not supported/,
    ],
  ]
  for (const [config, message] of invalid) {
    assert.throws(() => buildComplexityViewModel(config), message)
  }
})

test("version 2 accepts exact dual-resource keys and renders Time before Space", () => {
  const view = buildComplexityViewModel(dualResource, "quick-sort-1")

  assert.deepEqual(
    view.resources.map(({ key, label, mode }) => ({ key, label, mode })),
    [
      { key: "time", label: "Time", mode: "cases" },
      { key: "space", label: "Space", mode: "operations" },
    ],
  )
  assert.equal(view.label, dualResource.label)
  assert.deepEqual(view.variables, Object.values(dualResource.variables))
})

test("version 2 keeps plotted formulas exact and semantic-only bounds geometry-free", () => {
  const view = buildComplexityViewModel(dualResource, "quick-sort-2")
  const [time, space] = view.resources

  assert.deepEqual(
    time.paths.map(({ formula, curveId }) => ({ formula, curveId })),
    [
      { formula: "O(n log n)", curveId: "n-log-n" },
      { formula: "O(n log n) expected", curveId: "n-log-n" },
      { formula: "O(n²)", curveId: "quadratic" },
    ],
  )
  assert.deepEqual(
    space.semanticBounds.map(({ role, formula }) => ({ role, formula })),
    [{ role: "Implementation dependent", formula: "tail-call stack" }],
  )
  assert.ok(space.paths.every(({ curveId }) => CURVE_IDS.includes(curveId)))
  assert.deepEqual(
    time.legend.flatMap(({ items }) => items.map(({ label }) => label)),
    ["Best", "Average: O(n log n) expected", "Worst"],
  )
  assert.equal(space.legend[0].items[0].label, "Best")
  assert.equal(space.legend[0].items[1].label, "Implementation dependent: tail-call stack")
})

test("endpoint labels use the authored formula when highlighted paths agree", () => {
  const view = buildComplexityViewModel(
    {
      version: 2,
      label: "A* shape labels",
      variables: {
        depth: { symbol: "d", description: "optimal solution depth" },
      },
      resources: {
        time: {
          mode: "operations",
          entries: [
            {
              kind: "operation",
              operation: "Best",
              bounds: [{ kind: "curve", role: "Expansions", formula: "Θ(d)", curveId: "linear" }],
            },
          ],
        },
        space: {
          mode: "operations",
          entries: [
            {
              kind: "operation",
              operation: "Worst",
              bounds: [
                { kind: "curve", role: "Stored nodes", formula: "O(b^d)", curveId: "exponential" },
              ],
            },
          ],
        },
      },
    },
    "a-star-labels",
  )

  assert.equal(
    view.resources[0].endpointLabels.find(({ curveId }) => curveId === "linear")?.formula,
    "Θ(d)",
  )
  assert.equal(
    view.resources[1].endpointLabels.find(({ curveId }) => curveId === "exponential")?.formula,
    "O(b^d)",
  )
})

test("empirical bounds stay semantic-only and use the regular legend treatment", () => {
  const view = buildComplexityViewModel(empiricalResource, "a-star-observed")

  for (const resource of view.resources) {
    assert.equal(resource.contextPaths.length, CURVE_IDS.length)
    assert.equal(resource.paths.length, 0)
    assert.equal(resource.semanticBounds.length, 1)
    assert.equal(resource.legend.length, 1)
    assert.equal(resource.legend[0].items.length, 1)
    assert.equal(resource.legend[0].items[0].kind, "semantic")
    assert.equal("pathId" in resource.legend[0].items[0], false)
    assert.ok(resource.endpointLabels.every(({ dimmed }) => dimmed))
  }
  assert.deepEqual(
    view.resources[0].xTicks.map(({ value }) => value),
    [2, 4, 6, 8, 10],
  )
  assert.deepEqual(
    view.resources[0].ticks.map(({ value }) => value),
    [0, 1, 10, 100, 1_000, 10_000],
  )
})

test("empirical bounds reject non-increasing or non-positive samples", () => {
  const invalidN = structuredClone(empiricalResource)
  invalidN.resources.time.entries[0].bounds[0].samples[1].n = 1
  assert.throws(
    () => buildComplexityViewModel(invalidN, "invalid-n"),
    /samples\[1\]\.n: must be finite, positive, and strictly increasing/,
  )

  const invalidValue = structuredClone(empiricalResource)
  invalidValue.resources.space.entries[0].bounds[0].samples[0].value = 0
  assert.throws(
    () => buildComplexityViewModel(invalidValue, "invalid-value"),
    /samples\[0\]\.value: must be a finite positive number/,
  )
})

test("version 2 rejects missing resources, catalogue mode, unknown keys, and duplicate roles locally", () => {
  const invalid: [unknown, RegExp][] = [
    [
      { ...dualResource, resources: { time: dualResource.resources.time } },
      /resources\.space: is required/,
    ],
    [
      {
        ...dualResource,
        resources: {
          ...dualResource.resources,
          time: { mode: "catalogue", entries: [] },
        },
      },
      /resources\.time\.mode: must be one of cases, operations/,
    ],
    [{ ...dualResource, title: "visible" }, /config\.title: is not supported/],
    [
      {
        ...dualResource,
        resources: {
          ...dualResource.resources,
          time: { ...dualResource.resources.time, title: "Time" },
        },
      },
      /resources\.time\.title: is not supported/,
    ],
    [
      {
        ...dualResource,
        resources: {
          ...dualResource.resources,
          time: {
            ...dualResource.resources.time,
            entries: [
              dualResource.resources.time.entries[0],
              dualResource.resources.time.entries[0],
              dualResource.resources.time.entries[2],
            ],
          },
        },
      },
      /resources\.time\.entries\[1\]\.role: duplicates Best/,
    ],
  ]

  for (const [config, message] of invalid) {
    assert.throws(() => buildComplexityViewModel(config, "invalid"), message)
  }
})

test("version 2 variables use strict ASCII keys and exact symbol metadata", () => {
  const graph = structuredClone(dualResource)
  graph.variables = {
    vertices: { symbol: "|V|", description: "number of vertices" },
    inverseAckermann: { symbol: "α(n)", description: "inverse Ackermann factor" },
  }
  assert.deepEqual(
    buildComplexityViewModel(graph, "graph-1").variables,
    Object.values(graph.variables),
  )

  assert.throws(
    () =>
      buildComplexityViewModel(
        { ...graph, variables: { "α(n)": graph.variables.inverseAckermann } },
        "invalid-variable",
      ),
    /variables\.α\(n\): has an invalid name/,
  )
  assert.throws(
    () =>
      buildComplexityViewModel(
        {
          ...graph,
          variables: {
            vertices: { ...graph.variables.vertices, executable: "n => n" },
          },
        },
        "invalid-variable-field",
      ),
    /variables\.vertices\.executable: is not supported/,
  )
})

function hastText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const value = node as { tagName?: unknown; value?: unknown; children?: unknown[] }
  return `${typeof value.value === "string" ? value.value : ""}${(value.children ?? [])
    .map(hastText)
    .join("")}`
}

function allHastElements(node: unknown): Element[] {
  if (!node || typeof node !== "object") return []
  const value = node as Element
  return [
    ...(value.type === "element" ? [value] : []),
    ...(value.children ?? []).flatMap(allHastElements),
  ]
}

function hastElements(node: unknown, tagName: string): Element[] {
  return allHastElements(node).filter((element) => element.tagName === tagName)
}

function findHastElement(node: unknown, tagName: string): Element | undefined {
  return hastElements(node, tagName)[0]
}

function findHastByClass(node: unknown, className: string): Element | undefined {
  return findAllHastByClass(node, className)[0]
}

function findAllHastByClass(node: unknown, className: string): Element[] {
  return allHastElements(node).filter(
    ({ properties }) =>
      Array.isArray(properties.className) && properties.className.includes(className),
  )
}

function referencedIds(node: unknown): string[] {
  return allHastElements(node).flatMap(({ properties }) =>
    Object.entries(properties).flatMap(([name, value]) => {
      if (name === "ariaLabelledBy" && typeof value === "string") return value.split(/\s+/)
      if (typeof value !== "string") return []
      const url = /^url\(#(.+)\)$/.exec(value)
      return url ? [url[1]] : []
    }),
  )
}

test("dual-resource HAST has one accessible figure and Time and Space tab panels", () => {
  const view = buildComplexityViewModel(dualResource, "quick-sort-hast")
  const hast = renderComplexityHast(view)
  const figure = findHastElement(hast, "figure")
  const resources = findAllHastByClass(hast, "complexity__resource")
  const tabs = findAllHastByClass(hast, "complexity__tab")

  assert.equal(figure?.properties.ariaLabel, dualResource.label)
  assert.equal(findAllHastByClass(hast, "complexity__title").length, 0)
  assert.equal(findAllHastByClass(hast, "complexity__resource-label").length, 0)
  assert.equal(hastElements(hast, "noscript").length, 0)
  assert.deepEqual(tabs.map(hastText), ["Time", "Space"])
  assert.equal(findHastByClass(hast, "complexity__tabs")?.properties.role, "tablist")
  assert.ok(
    tabs.every(({ tagName, properties }) => tagName === "button" && properties.role === "tab"),
  )
  assert.deepEqual(
    tabs.map(({ properties }) => [properties.ariaSelected, properties.tabIndex]),
    [
      ["true", 0],
      ["false", -1],
    ],
  )
  assert.deepEqual(
    resources.map(({ properties }) => properties["data-complexity-resource"]),
    ["time", "space"],
  )
  assert.ok(resources.every(({ properties }) => properties.role === "tabpanel"))
  assert.deepEqual(
    resources.map(({ properties }) => properties.hidden),
    [undefined, true],
  )
  assert.deepEqual(
    tabs.map(({ properties }) => properties.ariaControls),
    resources.map(({ properties }) => properties.id),
  )
  assert.deepEqual(
    resources.map(({ properties }) => properties.ariaLabelledBy),
    tabs.map(({ properties }) => properties.id),
  )
  const legends = findAllHastByClass(hast, "complexity__legend")
  assert.equal(legends.length, 2)
  assert.deepEqual(
    legends.map(({ properties }) => (properties.className as string[]).at(-1)),
    ["is-ungrouped", "is-grouped"],
  )
  assert.equal(hastElements(hast, "button").length, 7)
  const groupButtons = findAllHastByClass(hast, "complexity__legend-group-button")
  assert.equal(groupButtons.length, 1)
  assert.equal(groupButtons[0].tagName, "button")
  assert.equal(typeof groupButtons[0].properties["data-path-ids"], "string")
  assert.equal(groupButtons[0].properties.ariaPressed, "false")
  const staticEntries = findAllHastByClass(hast, "complexity__legend-static")
  assert.equal(staticEntries.length, 1)
  assert.equal(staticEntries[0].tagName, "span")
  assert.equal(staticEntries[0].properties["data-path-id"], undefined)
  assert.equal(staticEntries[0].properties.ariaPressed, undefined)
  assert.equal(findAllHastByClass(hast, "complexity__legend-entry").length, 5)
  assert.equal(findAllHastByClass(hast, "complexity__semantic-bounds").length, 0)
})

test("host namespaces prevent duplicate IDs and keep every IDREF inside its figure", () => {
  const figures = ["page-occurrence-1", "page-occurrence-2"].map((namespace) =>
    renderComplexityHast(buildComplexityViewModel(dualResource, namespace)),
  )
  const idsByFigure = figures.map((figure) =>
    allHastElements(figure)
      .map(({ properties }) => properties.id)
      .filter((id): id is string => typeof id === "string"),
  )

  assert.equal(new Set(idsByFigure.flat()).size, idsByFigure.flat().length)
  for (const [index, figure] of figures.entries()) {
    const ids = new Set(idsByFigure[index])
    for (const reference of referencedIds(figure)) assert.ok(ids.has(reference), reference)
  }
})

test("Quartz HAST renders the complete case union without renderer-owned tabs", () => {
  const view = buildComplexityViewModel(cases)
  const hast = renderComplexityHast(view)
  assert.equal(hast.type, "element")
  if (hast.type !== "element") return
  const svg = findHastElement(hast, "svg")
  assert.equal(svg?.type, "element")
  if (svg?.type === "element") {
    assert.equal(svg.properties.ariaHidden, "true")
    assert.equal(svg.properties.role, "presentation")
  }
  assert.equal(hastElements(hast, "table").length, 0)
  assert.equal(hastElements(hast, "clipPath").length, 1)
  assert.equal(hastElements(hast, "button").length, 2)
  assert.equal(
    findAllHastByClass(hast, "complexity__tick")[0].properties.y,
    COMPLEXITY_CHART.axisY + 18,
  )
  assert.equal(
    hastElements(hast, "text").length,
    view.ticks.length + view.xTicks.length + CURVE_IDS.length,
  )
  const elements = allHastElements(hast)
  assert.ok(
    elements.every(
      ({ properties }) =>
        !["tab", "tablist", "tabpanel"].includes(String(properties.role)) &&
        !Object.keys(properties).some((name) =>
          ["data-filter", "data-active-filter", "data-category"].includes(name),
        ) &&
        !(properties.className as unknown[] | undefined)?.some((name) =>
          ["steptrace__tab", "steptrace__tabs", "complexity__tab", "complexity__tabs"].includes(
            String(name),
          ),
        ),
    ),
  )
  const plotGroups = findHastByClass(hast, "complexity__areas")
  const curveGroups = findHastByClass(hast, "complexity__curves")
  assert.ok(plotGroups)
  assert.ok(curveGroups)
  assert.equal(
    hastElements(hast, "path").filter(({ properties }) => properties.id).length,
    view.paths.length,
  )
  assert.deepEqual(findAllHastByClass(hast, "complexity__legend-button").map(hastText), [
    "Average/Best",
    "Worst",
  ])
  assert.doesNotMatch(hastText(hast), /Curves begin at/)
  assert.doesNotMatch(hastText(hast), /Expected balanced partitions/)
  assert.doesNotMatch(hastText(hast), /<script/i)
})

test("Quartz transforms only complexity fences and keeps invalid source readable", () => {
  const transform = ComplexityBlock().htmlPlugins?.()[0]?.()
  assert.ok(transform)
  const tree = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-complexity"] },
            children: [{ type: "text", value: JSON.stringify(cases) }],
          },
        ],
      },
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-typescript"] },
            children: [{ type: "text", value: "{}" }],
          },
        ],
      },
    ],
  }
  transform?.(tree as never)
  assert.equal(tree.children[0]?.tagName, "figure")
  assert.equal(tree.children[1]?.tagName, "pre")

  const invalid = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: { className: ["language-complexity"] },
            children: [{ type: "text", value: "{broken" }],
          },
        ],
      },
    ],
  }
  transform?.(invalid as never)
  assert.equal(invalid.children[0]?.tagName, "pre")
  assert.match(hastText(invalid), /{broken/)
})

test("Quartz assigns distinct page-local namespaces to repeated version 2 fences", () => {
  const transform = ComplexityBlock().htmlPlugins?.()[0]?.()
  assert.ok(transform)
  const fence = () => ({
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties: { className: ["language-complexity"] },
        children: [{ type: "text", value: JSON.stringify(dualResource) }],
      },
    ],
  })
  const tree = { type: "root", children: [fence(), fence()] }
  transform?.(tree as never)

  const figures = tree.children as unknown as Element[]
  const figureIds = figures.map(({ properties }) => properties.id)
  assert.equal(new Set(figureIds).size, 2)
  for (const figure of figures) {
    const ids = new Set(
      allHastElements(figure)
        .map(({ properties }) => properties.id)
        .filter((id): id is string => typeof id === "string"),
    )
    for (const reference of referencedIds(figure)) assert.ok(ids.has(reference), reference)
  }
})

class FakeStyle {
  readonly values = new Map<string, string>()
  setProperty(name: string, value: string) {
    this.values.set(name, value)
  }
}

class FakeNode {
  children: FakeNode[] = []
  textContent = ""
  append(...children: FakeNode[]) {
    this.children.push(...children)
  }
  replaceChildren(...children: FakeNode[]) {
    this.children = children
  }
}

class FakeElement extends FakeNode {
  readonly tagName: string
  readonly ownerDocument: FakeDocument
  className = ""
  dataset: Record<string, string> = {}
  scope = ""
  style = new FakeStyle()
  attributes: Record<string, string> = {}
  constructor(tagName: string, ownerDocument: FakeDocument) {
    super()
    this.tagName = tagName
    this.ownerDocument = ownerDocument
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value
  }
}

class FakeDocument {
  createElement(tagName: string) {
    return new FakeElement(tagName, this)
  }
  createElementNS(_namespace: string, tagName: string) {
    return new FakeElement(tagName, this)
  }
  createTextNode(value: string) {
    const node = new FakeNode()
    node.textContent = value
    return node
  }
}

class FakeClassList {
  readonly values = new Set<string>()
  toggle(name: string, force?: boolean) {
    const enabled = force ?? !this.values.has(name)
    if (enabled) this.values.add(name)
    else this.values.delete(name)
    return enabled
  }
  contains(name: string) {
    return this.values.has(name)
  }
}

class InteractiveElement extends EventTarget {
  readonly classList = new FakeClassList()
  readonly dataset: Record<string, string> = {}
  readonly style = new FakeStyle()
  readonly attributes: Record<string, string> = {}
  readonly matches = new Map<string, InteractiveElement[]>()
  focus() {}
  setAttribute(name: string, value: string) {
    this.attributes[name] = value
  }
  getAttribute(name: string) {
    return this.attributes[name] ?? null
  }
  querySelectorAll<T>(selector: string): T[] {
    return (this.matches.get(selector) ?? []) as T[]
  }
}

function interactiveResource(pathId: string) {
  const resource = new InteractiveElement()
  const button = new InteractiveElement()
  const selectedPath = new InteractiveElement()
  const otherPath = new InteractiveElement()
  const selectedArea = new InteractiveElement()
  const otherArea = new InteractiveElement()
  const label = new InteractiveElement()
  button.dataset.pathId = selectedPath.dataset.pathId = selectedArea.dataset.pathId = pathId
  otherPath.dataset.pathId = otherArea.dataset.pathId = `${pathId}-other`
  selectedPath.setAttribute("stroke", "green")
  otherPath.setAttribute("stroke", "red")
  label.dataset.pathIds = `${pathId},${pathId}-other`
  resource.matches.set(".complexity__legend-button", [button])
  resource.matches.set(".complexity__curve", [selectedPath, otherPath])
  resource.matches.set(".complexity__area", [selectedArea, otherArea])
  resource.matches.set(".complexity__endpoint-label", [label])
  return { resource, button, selectedPath, otherPath }
}

function findFake(node: FakeNode, tagName: string): FakeElement | undefined {
  return findAllFake(node, tagName)[0]
}

function findAllFake(node: FakeNode, tagName: string): FakeElement[] {
  return [
    ...(node instanceof FakeElement && node.tagName === tagName ? [node] : []),
    ...node.children.flatMap((child) => findAllFake(child, tagName)),
  ]
}

function fakeText(node: FakeNode): string {
  return `${node.textContent}${node.children.map(fakeText).join("")}`
}

test("legend selection isolates one curve, restores the union, and cleans up", () => {
  const figure = new InteractiveElement()
  const firstButton = new InteractiveElement()
  const secondButton = new InteractiveElement()
  const firstPath = new InteractiveElement()
  const secondPath = new InteractiveElement()
  const contextPath = new InteractiveElement()
  const firstArea = new InteractiveElement()
  const secondArea = new InteractiveElement()
  const label = new InteractiveElement()

  firstButton.dataset.pathId = firstPath.dataset.pathId = firstArea.dataset.pathId = "best"
  secondButton.dataset.pathId = secondPath.dataset.pathId = secondArea.dataset.pathId = "worst"
  contextPath.dataset.pathId = "context"
  contextPath.dataset.context = "true"
  firstPath.setAttribute("stroke", "green")
  secondPath.setAttribute("stroke", "red")
  label.dataset.pathIds = "best,worst"

  figure.matches.set(".complexity__legend-button", [firstButton, secondButton])
  figure.matches.set(".complexity__curve", [firstPath, secondPath, contextPath])
  figure.matches.set(".complexity__area", [firstArea, secondArea])
  figure.matches.set(".complexity__endpoint-label", [label])

  const handle = mountComplexityFigure(figure as unknown as HTMLElement)
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-highlighted"))
  assert.ok(contextPath.classList.contains("is-subtle"))
  assert.equal(label.style.values.get("--complexity-label-color"), "red")

  firstButton.dispatchEvent(new Event("click"))
  assert.equal(firstButton.attributes["aria-pressed"], "true")
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-subtle"))
  assert.ok(secondArea.classList.contains("is-subtle"))
  assert.equal(label.style.values.get("--complexity-label-color"), "green")

  firstButton.dispatchEvent(new Event("click"))
  assert.equal(firstButton.attributes["aria-pressed"], "false")
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-highlighted"))
  assert.equal(label.style.values.get("--complexity-label-color"), "red")

  handle.destroy()
  assert.equal(figure.dataset.complexityMounted, undefined)
  firstButton.dispatchEvent(new Event("click"))
  assert.equal(firstButton.attributes["aria-pressed"], "false")
})

test("legend hover previews one curve and restores the clicked selection", () => {
  const figure = new InteractiveElement()
  const preview = interactiveResource("best")
  const otherButton = new InteractiveElement()
  otherButton.dataset.pathId = preview.otherPath.dataset.pathId
  preview.resource.matches.set(".complexity__legend-button", [preview.button, otherButton])
  figure.matches.set(".complexity__resource", [preview.resource])

  const handle = mountComplexityFigure(figure as unknown as HTMLElement)
  preview.button.dispatchEvent(new Event("pointerenter"))
  assert.equal(preview.button.attributes["aria-pressed"], "false")
  assert.ok(preview.selectedPath.classList.contains("is-highlighted"))
  assert.ok(preview.otherPath.classList.contains("is-subtle"))

  preview.button.dispatchEvent(new Event("pointerleave"))
  assert.ok(preview.otherPath.classList.contains("is-highlighted"))

  otherButton.dispatchEvent(new Event("click"))
  preview.button.dispatchEvent(new Event("pointerenter"))
  assert.ok(preview.selectedPath.classList.contains("is-highlighted"))
  assert.ok(preview.otherPath.classList.contains("is-subtle"))
  preview.button.dispatchEvent(new Event("pointerleave"))
  assert.equal(otherButton.attributes["aria-pressed"], "true")
  assert.ok(preview.selectedPath.classList.contains("is-subtle"))
  assert.ok(preview.otherPath.classList.contains("is-highlighted"))
  handle.destroy()
})

test("legend selection changes only its owning resource", () => {
  const figure = new InteractiveElement()
  const time = interactiveResource("time-best")
  const space = interactiveResource("space-best")
  figure.matches.set(".complexity__resource", [time.resource, space.resource])

  const handle = mountComplexityFigure(figure as unknown as HTMLElement)
  time.button.dispatchEvent(new Event("click"))

  assert.equal(time.button.attributes["aria-pressed"], "true")
  assert.ok(time.otherPath.classList.contains("is-subtle"))
  assert.ok(space.selectedPath.classList.contains("is-highlighted"))
  assert.ok(space.otherPath.classList.contains("is-highlighted"))
  handle.destroy()
})

test("resource tabs reveal one panel by click and by arrow key", () => {
  const figure = new InteractiveElement()
  const time = interactiveResource("time-best")
  const space = interactiveResource("space-best")
  const timeTab = new InteractiveElement()
  const spaceTab = new InteractiveElement()
  figure.matches.set(".complexity__resource", [time.resource, space.resource])
  figure.matches.set(".complexity__tab", [timeTab, spaceTab])
  space.resource.hidden = true

  const handle = mountComplexityFigure(figure as unknown as HTMLElement)
  spaceTab.dispatchEvent(new Event("click"))
  assert.equal(time.resource.hidden, true)
  assert.equal(space.resource.hidden, false)
  assert.equal(spaceTab.attributes["aria-selected"], "true")
  assert.equal(spaceTab.tabIndex, 0)

  spaceTab.dispatchEvent(Object.assign(new Event("keydown"), { key: "ArrowRight" }))
  assert.equal(time.resource.hidden, false)
  assert.equal(space.resource.hidden, true)
  assert.equal(timeTab.attributes["aria-selected"], "true")

  handle.destroy()
  spaceTab.dispatchEvent(new Event("click"))
  assert.equal(space.resource.hidden, true)
})

test("a legend group button selects every plotted item in its row", () => {
  const figure = new InteractiveElement()
  const groupButton = new InteractiveElement()
  const firstButton = new InteractiveElement()
  const secondButton = new InteractiveElement()
  const otherButton = new InteractiveElement()
  const firstPath = new InteractiveElement()
  const secondPath = new InteractiveElement()
  const otherPath = new InteractiveElement()

  groupButton.dataset.pathIds = "lookup-best,lookup-worst"
  firstButton.dataset.pathId = firstPath.dataset.pathId = "lookup-best"
  secondButton.dataset.pathId = secondPath.dataset.pathId = "lookup-worst"
  otherButton.dataset.pathId = otherPath.dataset.pathId = "insert-best"
  figure.matches.set(".complexity__legend-button", [firstButton, secondButton, otherButton])
  figure.matches.set(".complexity__legend-group-button", [groupButton])
  figure.matches.set(".complexity__curve", [firstPath, secondPath, otherPath])

  const handle = mountComplexityFigure(figure as unknown as HTMLElement)
  groupButton.dispatchEvent(new Event("pointerenter"))
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-highlighted"))
  assert.ok(otherPath.classList.contains("is-subtle"))

  groupButton.dispatchEvent(new Event("pointerleave"))
  assert.ok(otherPath.classList.contains("is-highlighted"))

  groupButton.dispatchEvent(new Event("click"))

  assert.equal(groupButton.attributes["aria-pressed"], "true")
  assert.equal(firstButton.attributes["aria-pressed"], "true")
  assert.equal(secondButton.attributes["aria-pressed"], "true")
  assert.equal(otherButton.attributes["aria-pressed"], "false")
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-highlighted"))
  assert.ok(otherPath.classList.contains("is-subtle"))

  groupButton.dispatchEvent(new Event("click"))
  assert.equal(groupButton.attributes["aria-pressed"], "false")
  assert.ok(otherPath.classList.contains("is-highlighted"))
  handle.destroy()
})

test("HAST and DOM normalize to the same IDs, labels, controls, and safe text", () => {
  const hostile = structuredClone(operations)
  hostile.title = "<img src=x onerror=alert(1)>"
  hostile.entries[0].operation = "<script>alert(1)</script>"
  const view = buildComplexityViewModel(hostile)
  const hast = renderComplexityHast(view)
  const document = new FakeDocument()
  const root = document.createElement("div")
  renderComplexityDom(root as unknown as HTMLElement, view)

  const hastPaths = hastElements(hast, "path")
    .map(({ properties }) => properties.id)
    .filter((id): id is string => typeof id === "string")
  const domPaths = findAllFake(root, "path")
    .map(({ attributes }) => attributes.id)
    .filter((id): id is string => typeof id === "string")
  const hastLegend = hastElements(hast, "li").map((item) => item.properties)
  const domLegend = findAllFake(root, "li")

  assert.deepEqual(hastPaths, domPaths)
  assert.equal(hastLegend.length, domLegend.length)
  assert.equal(hastText(hast), fakeText(root))
  assert.match(hastText(hast), /<img src=x onerror=alert\(1\)>/)
  assert.match(hastText(hast), /<script>alert\(1\)<\/script>/)
  assert.equal(hastElements(hast, "script").length, 0)
  assert.equal(findAllFake(root, "script").length, 0)
  assert.equal(new Set(view.paths.map(({ id }) => id)).size, view.paths.length)
  assert.deepEqual(
    buildComplexityViewModel(hostile).paths.map(({ id }) => id),
    view.paths.map(({ id }) => id),
  )
})

test("version 2 variables render as the same description list in Quartz and Obsidian", () => {
  const view = buildComplexityViewModel(dualResource, "variable-key")
  const hast = renderComplexityHast(view)
  const document = new FakeDocument()
  const root = document.createElement("div")
  renderComplexityDom(root as unknown as HTMLElement, view)

  assert.deepEqual(hastElements(hast, "var").map(hastText), ["n"])
  assert.deepEqual(findAllFake(root, "var").map(fakeText), ["n"])
  assert.equal(hastElements(hast, "dl").length, 1)
  assert.equal(findAllFake(root, "dl").length, 1)
  assert.match(hastText(hast), /nnumber of input elements/)
  assert.equal(hastText(hast), fakeText(root))
})

test("Obsidian DOM keeps the version 1 label accessible but not visible", () => {
  const document = new FakeDocument()
  const root = document.createElement("div")
  const view = buildComplexityViewModel(cases)
  const handle = renderComplexityDom(root as unknown as HTMLElement, view)
  const svg = findFake(root, "svg")
  assert.equal(svg?.attributes["aria-hidden"], "true")
  assert.equal(findFake(root, "table"), undefined)
  assert.equal(findAllFake(root, "li").length, 2)
  assert.equal(findAllFake(root, "button").length, 2)
  assert.equal(findFake(root, "figcaption"), undefined)
  assert.equal(findFake(root, "dl"), undefined)
  assert.equal(findFake(root, "figure")?.attributes["aria-label"], view.title)
  const elements = findAllFake(root, "figure").flatMap((figure) => [figure, ...figure.children])
  assert.equal(
    findAllFake(root, "button").some(({ dataset }) => "filter" in dataset),
    false,
  )
  assert.equal(
    findAllFake(root, "path").some(({ dataset }) => "category" in dataset),
    false,
  )
  assert.equal(
    elements.some(({ attributes }) =>
      ["tab", "tablist", "tabpanel"].includes(attributes.role ?? ""),
    ),
    false,
  )
  handle.destroy()
  assert.equal(root.children.length, 0)
})

test("complexity styles own their resource tabs and have no top margin", () => {
  const styles = readFileSync(join(process.cwd(), "custom", "complexity", "styles.scss"), "utf8")
  assert.match(styles, /\.complexity\s*\{[^}]*container-type: inline-size;/s)
  assert.match(styles, /\.complexity__resource\s*\{[^}]*container-type: inline-size;/s)
  assert.match(styles, /\.complexity__resource\[hidden\]\s*\{[^}]*display:\s*none;/s)
  assert.match(
    styles,
    /\.complexity__tab\s*\{[^}]*min-height:\s*44px;[^}]*background:\s*transparent;[^}]*border-bottom:\s*var\(--cx-tab-underline\) solid transparent;/s,
  )
  // The strip has to track the Tabsdown settings, not restate them.
  assert.match(styles, /--cx-tab-underline:\s*var\(--tabsdown-underline-thickness,/)
  assert.match(styles, /--cx-tab-gap:\s*var\(--tabsdown-gap,/)
  assert.match(styles, /--cx-tab-speed:\s*var\(--tabsdown-animation-speed,/)
  assert.match(styles, /--cx-tab-font:\s*var\(--bodyFont,/)
  assert.match(
    styles,
    /\.complexity__tab\[aria-selected="true"\]\s*\{[^}]*color:\s*var\(--cx-accent\);[^}]*border-bottom-color:\s*var\(--cx-accent\);/s,
  )
  assert.doesNotMatch(
    styles,
    /\.complexity__tab\[aria-selected="true"\]\s*\{[^}]*background:\s*var/s,
  )
  assert.match(styles, /\.complexity__tab:focus-visible\s*\{[^}]*outline:/s)
  assert.match(styles, /\.complexity\s*\{[^}]*margin:\s*0 0 1\.5rem;/s)
  assert.match(
    styles,
    /\.complexity__variables\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*font:[^;]*0\.875rem/s,
  )
  assert.doesNotMatch(styles, /steptrace|@use/)
  assert.match(
    styles,
    /th:nth-child\(6\):last-child,\s*td:nth-child\(6\):last-child\s*\{\s*min-width:\s*18rem;/s,
  )
  assert.doesNotMatch(styles, /\n\s*th:last-child,\s*\n\s*td:last-child/)
  assert.match(styles, /@container \(min-width: 600px\)/)
  assert.match(
    styles,
    /@container \(min-width: 600px\)[\s\S]*\.complexity__resource \.complexity__tick,[\s\S]*font-size:\s*12px;/,
  )
  assert.match(styles, /@container \(min-width: 1000px\)[\s\S]*font-size:\s*10px;/)
  assert.match(styles, /@container \(min-width: 1200px\)[\s\S]*font-size:\s*8px;/)
  assert.doesNotMatch(styles, /@media \(min-width: 600px\)/)
  assert.doesNotMatch(styles, /\.complexity__title\b/)
  assert.match(styles, /\.complexity__endpoint-label\s*\{[^}]*font-size:\s*16px;/s)
  assert.match(styles, /\.complexity__curve\.is-highlighted\s*\{[^}]*stroke-width:\s*1\.5;/s)
  assert.match(styles, /\.complexity__curve\.is-subtle\s*\{[^}]*stroke-width:\s*1;/s)
  assert.match(styles, /\.complexity__legend-entry\s*\{[^}]*font:[^;]*0\.875rem/s)
  assert.match(
    styles,
    /\.complexity__legend\.is-ungrouped \.complexity__legend-items\s*\{[^}]*flex-wrap:\s*wrap;[^}]*justify-content:\s*center;/s,
  )
  assert.match(
    styles,
    /\.complexity__legend\.is-ungrouped \.complexity__legend-item\s*\{[^}]*flex:\s*0 0 auto;/s,
  )
  assert.match(styles, /\.complexity__legend-item\s*\{[^}]*margin-inline-start:\s*0;/s)
  assert.match(
    styles,
    /\.complexity__legend-button\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;[^}]*border-bottom:\s*2px solid/s,
  )
  assert.doesNotMatch(styles, /\.complexity__legend-group-button\s*\{[^}]*text-decoration/s)
  assert.match(
    styles,
    /\.complexity__legend-group \+ \.complexity__legend-group\s*\{[^}]*border-top:/s,
  )
  assert.doesNotMatch(styles, /\.complexity__legend\s*\{[^}]*(?:background|border(?:-radius)?):/s)
  assert.doesNotMatch(styles, /\.complexity__semantic-bounds\b/)
  assert.match(
    styles,
    /\.complexity__resources\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*overflow-x:\s*visible;/s,
  )
  assert.doesNotMatch(styles, /grid-template-columns:\s*repeat\(2,/)
  assert.doesNotMatch(styles, /\.complexity__plot-wrap\s*\{[^}]*overflow-x:\s*(?:auto|scroll)/s)
})

test("renderer sources contain no legacy complexity filter surface", () => {
  const sources = [
    "model.ts",
    "dom.ts",
    "hast.ts",
    "interactions.ts",
    join("..", "components", "complexity.tsx"),
  ].map((path) => readFileSync(join(process.cwd(), "custom", "complexity", path), "utf8"))
  for (const source of sources) {
    assert.doesNotMatch(
      source,
      /COMPLEXITY_FILTERS|ComplexityFilter|steptrace__tabs?|data-filter|activeFilter|active-filter/,
    )
  }
})

test("every source chart builds and repeated growth classes share exact geometry", () => {
  const root = join(process.cwd(), "..", "Vault", "Home")
  const exactCurveText =
    /^(?:O|Θ)\((?:1|[a-z]|log(?: [a-z]|\([a-z] \+ 1\))|n log n|[a-z]²|(?:[a-z]|1)(?: \+ (?:[a-z]|1))+|2\^[a-z]|[a-z]!)\)$/
  const genericVariableDescription =
    /^(?:number of input elements or states|secondary input, pattern, bucket, or sequence size|key range, digit count, or requested result count|search branching factor or radix base|algorithm-specific depth, digit count, or dimension|key, string, path, or sequence length)$/
  const charts = markdownFiles(root).flatMap((note) => {
    const source = readFileSync(note, "utf8")
    return [...source.matchAll(/```complexity\n([\s\S]*?)\n```/g)].map(
      (match, index) => [note, index, JSON.parse(match[1])] as const,
    )
  })

  assert.equal(charts.length, 98)
  for (const [note, index, config] of charts) {
    if (config.version === 2) {
      for (const variable of Object.values(config.variables) as {
        symbol: string
        description: string
      }[]) {
        assert.doesNotMatch(variable.symbol, /[A-Z]|\|/, `${note} uses canonical lowercase symbols`)
        assert.doesNotMatch(
          variable.description,
          genericVariableDescription,
          `${note} explains ${variable.symbol} with a note-specific legend`,
        )
      }
    }
    for (const resource of Object.values(config.resources ?? {}) as {
      entries: Record<string, unknown>[]
    }[]) {
      for (const entry of resource.entries) {
        const bounds = Array.isArray(entry.bounds) ? entry.bounds : [entry]
        for (const bound of bounds as Record<string, unknown>[]) {
          if (bound.kind === "text") {
            assert.doesNotMatch(
              String(bound.formula),
              exactCurveText,
              `${note} ${String(bound.formula)}`,
            )
          }
        }
      }
    }
    const view = buildComplexityViewModel(config, `source-${index}-${note}`)
    for (const resource of view.resources) {
      const byCurve = Map.groupBy(resource.paths, (path) => path.curveId)
      for (const [curveId, paths] of byCurve) {
        assert.equal(
          new Set(paths.map((path) => path.geometry)).size,
          1,
          `${note} ${resource.key} ${curveId}`,
        )
      }
    }
  }
})

test("Data Structures Time roles preserve standalone Time and never retain a lowercase time suffix", () => {
  const root = join(process.cwd(), "..", "Vault", "Home", "Computer Science", "Data Structures")
  let standaloneTime = 0
  for (const note of markdownFiles(root)) {
    const source = readFileSync(note, "utf8")
    for (const match of source.matchAll(/```complexity\n([\s\S]*?)\n```/g)) {
      const config = JSON.parse(match[1])
      if (config.version !== 2) continue
      for (const entry of config.resources.time.entries) {
        for (const bound of entry.bounds ?? [entry]) {
          if (typeof bound.role !== "string") continue
          assert.equal(
            bound.role.endsWith(" time"),
            false,
            `${note}: ${entry.operation ?? entry.label ?? "unnamed"} -> ${bound.role}`,
          )
          standaloneTime += Number(bound.role === "Time")
        }
      }
    }
  }
  assert.ok(standaloneTime > 0)
})

test("Data Structures keeps distinct Best and Amortized bounds and merges only exact equivalents", () => {
  const root = join(process.cwd(), "..", "Vault", "Home", "Computer Science", "Data Structures")
  const signature = ({ role: _role, ...bound }: Record<string, unknown>) =>
    JSON.stringify({
      kind: bound.kind,
      formula: bound.formula,
      curveId: bound.curveId,
      curveFrom: bound.curveFrom,
      curveTo: bound.curveTo,
      samples: bound.samples,
    })
  let merged = 0
  let distinct = 0
  for (const note of markdownFiles(root)) {
    const source = readFileSync(note, "utf8")
    for (const match of source.matchAll(/```complexity\n([\s\S]*?)\n```/g)) {
      const config = JSON.parse(match[1])
      if (config.version !== 2) continue
      for (const entry of config.resources.time.entries) {
        const bounds = entry.bounds ?? [entry]
        const byRole = new Map(bounds.map((bound: Record<string, unknown>) => [bound.role, bound]))
        if (byRole.has("Best/Amortized")) {
          merged++
          assert.equal(
            byRole.has("Best") || byRole.has("Amortized"),
            false,
            `${note}: ${entry.operation}`,
          )
        }
        if (byRole.has("Best") && byRole.has("Amortized")) {
          distinct++
          assert.notEqual(
            signature(byRole.get("Best")!),
            signature(byRole.get("Amortized")!),
            `${note}: ${entry.operation} has mergeable duplicate bounds`,
          )
        }
      }
    }
  }
  assert.ok(merged > 0)
  assert.ok(distinct > 0)
})

test("Stack exposes amortized Push and its resize spike alongside constant operations", () => {
  const note = readFileSync(
    join(
      process.cwd(),
      "..",
      "Vault",
      "Home",
      "Computer Science",
      "Data Structures",
      "Linear Structures",
      "Stack.md",
    ),
    "utf8",
  )
  const config = JSON.parse(note.match(/```complexity\n([\s\S]*?)\n```/)![1])
  const view = buildComplexityViewModel(config, "stack-contract")
  const [time, space] = view.resources

  assert.deepEqual([time.key, space.key], ["time", "space"])
  assert.equal(time.mode, "comparison")
  assert.equal(time.legend.length, 1)
  assert.equal(time.legend[0].label, undefined)
  assert.deepEqual(
    time.legend[0].items.map(({ label }) => label),
    ["Push (linked / array amortized)", "Push (array resize worst case)", "Pop", "Peek"],
  )
  assert.equal(time.paths.length, 4)
  assert.equal(time.paths.filter(({ curveId }) => curveId === "constant").length, 3)
  assert.equal(time.paths.filter(({ curveId }) => curveId === "linear").length, 1)
  assert.ok(space.paths.length + space.semanticBounds.length > 0)
  const prose = note.replace(/```complexity\n[\s\S]*?\n```/, "")
  assert.match(prose, /(?:resize|doubl)[^\n]*O\(n\)|O\(n\)[^\n]*(?:resize|doubl)/i)
})

test("Paradigms and Patterns keep comparison charts except Two Heaps operations", () => {
  const root = join(process.cwd(), "..", "Vault", "Home", "Computer Science", "Algorithms")
  const notes = ["Paradigms", "Patterns"].flatMap((folder) =>
    readdirSync(join(root, folder))
      .filter((name) => name.endsWith(".md"))
      .map((name) => join(root, folder, name)),
  )
  const charts = notes.flatMap((note) => {
    const fence = readFileSync(note, "utf8").match(/```complexity\n([\s\S]*?)\n```/)
    return fence ? [[note, JSON.parse(fence[1])] as const] : []
  })

  assert.equal(charts.length, 17)
  for (const [note, config] of charts) {
    if (note.endsWith("Two Heaps.md")) {
      assert.deepEqual(
        Object.values(config.resources).map(({ mode }: { mode: string }) => mode),
        ["operations", "operations"],
      )
      continue
    }
    for (const [key, resource] of Object.entries(config.resources)) {
      const { mode, entries } = resource as { mode: string; entries: { label: string }[] }
      assert.equal(mode, "comparison", `${note} ${key} mode`)
      assert.equal(entries.length, 2, `${note} ${key} entry count`)
      assert.match(entries[0].label, /^Naive \(/, `${note} ${key} baseline label`)
      assert.doesNotMatch(entries[1].label, /^Naive\b/, `${note} ${key} technique label`)
    }
    const [time, space] = ["time", "space"].map(
      (key) => config.resources[key].entries as { label: string }[],
    )
    assert.deepEqual(
      time.map(({ label }) => label),
      space.map(({ label }) => label),
      `${note} labels must match across resources`,
    )
    assert.equal(
      buildComplexityViewModel(config, "content-check").resources.every(
        (resource) => resource.legend.length === 1 && !resource.legend[0].label,
      ),
      true,
      `${note} legend must stay ungrouped`,
    )
  }
})

test("Big O keeps its standalone catalogue config", () => {
  const source = readFileSync(
    join(process.cwd(), "..", "Vault", "Home", "Computer Science", "Big O Notation.md"),
    "utf8",
  )
  assert.doesNotMatch(source, /~~~tabsdown|```steptrace/)
  const fence = source.match(/```complexity\n([\s\S]*?)\n```/)
  assert.ok(fence)
  assert.deepEqual(JSON.parse(fence[1]), {
    version: 1,
    mode: "catalogue",
    title: "Growth of common complexity classes",
    variables,
    entries: CURVE_IDS.map((curveId) => ({ kind: "catalogue", curveId })),
  })
})

test("Interpolation Search plots log-log time with inline merged case legends", () => {
  const source = readFileSync(
    join(
      process.cwd(),
      "..",
      "Vault",
      "Home",
      "Computer Science",
      "Algorithms",
      "Search Algorithms",
      "Interpolation Search.md",
    ),
    "utf8",
  )
  const config = JSON.parse(source.match(/```complexity\n([\s\S]*?)\n```/)![1])
  const [time, space] = buildComplexityViewModel(config, "interpolation-search").resources

  assert.equal(time.mode, "cases")
  assert.equal(time.legend.length, 1)
  assert.equal(time.legend[0].label, undefined)
  assert.equal(time.paths.find(({ curveId }) => curveId === "log-log-n")?.formula, "O(log log n)")
  assert.deepEqual(
    space.paths.map(({ legendLabel }) => legendLabel),
    ["Worst/Average/Best"],
  )
})
