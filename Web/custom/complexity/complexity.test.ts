import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import type { Element } from "hast"

import { renderComplexityDom } from "./dom"
import { renderComplexityHast } from "./hast"
import { mountComplexityFigure } from "./interactions"
import { buildComplexityViewModel, COMPLEXITY_CHART, CURVE_IDS, curveValue } from "./model"
import { ComplexityBlock } from "../transformers/complexity-block"

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
    "log-n",
    "linear",
    "n-log-n",
    "quadratic",
    "exponential",
    "factorial",
  ])
  assert.equal(curveValue("constant", 10), 1)
  assert.equal(curveValue("log-n", 8), 3)
  assert.equal(curveValue("linear", 10), 10)
  assert.equal(curveValue("n-log-n", 8), 24)
  assert.equal(curveValue("quadratic", 10), 100)
  assert.equal(curveValue("exponential", 10), 1024)
  assert.equal(curveValue("factorial", 10), 3_628_800)
})

test("every representative function uses the fixed 0-origin and 1…10k log scale", () => {
  const evaluators = {
    constant: () => 1,
    "log-n": (n: number) => Math.log2(n),
    linear: (n: number) => n,
    "n-log-n": (n: number) => n * Math.log2(n),
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
  for (const path of view.paths) {
    assert.deepEqual(
      path.samples.map(({ n }) => n),
      [2, 3, 4, 5, 6, 7, 8, 9, 10],
    )
    for (const sample of path.samples) {
      const expected = evaluators[path.curveId](sample.n)
      assert.equal(sample.value, expected)
      assert.equal(
        sample.y,
        18 + (1 - Math.log10(expected) / Math.log10(maximum)) * (320 - 18 - 38 - 14),
      )
    }
    assert.match(path.geometry, /^M0\.00,282\.00 /)
    assert.equal(path.geometry.match(/ L/g)?.length, 33)
  }
  const factorialPath = view.paths.find(({ curveId }) => curveId === "factorial")
  assert.ok(factorialPath)
  const factorialYs = [...factorialPath.geometry.matchAll(/L[\d.]+,(-?[\d.]+)/g)].map(([, y]) => y)
  assert.equal(new Set(factorialYs).size, factorialYs.length)
  assert.deepEqual(
    view.ticks.map(({ value }) => value),
    [0, 1, 10, 100, 1_000, maximum],
  )
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
    ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2^n)", "O(n!)"],
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

test("duplicate case curves separate after sharing the visual origin", () => {
  const view = buildComplexityViewModel(cases)
  const best = view.paths.find((path) => path.label.startsWith("Best:"))
  const average = view.paths.find((path) => path.label.startsWith("Average:"))
  assert.notEqual(best?.geometry, average?.geometry)
  assert.match(best?.geometry ?? "", /^M0\.00,282\.00 /)
  assert.match(average?.geometry ?? "", /^M0\.00,282\.00 /)
  assert.notEqual(best?.id, average?.id)
  assert.equal(best?.color, "#22a06b")
  assert.equal(average?.color, "#d99a00")
  assert.equal(view.endpointLabels.find((label) => label.curveId === "n-log-n")?.pathIds.length, 2)
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
  assert.equal(new Set(constantPaths.map((path) => path.geometry)).size, constantPaths.length)
  assert.ok(constantPaths.every((path) => path.geometry.startsWith("M0.00,282.00 ")))
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
    ["Best", "Average", "Worst"],
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
  const value = node as { value?: unknown; children?: unknown[] }
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

test("dual-resource HAST has one accessible figure and labelled Time and Space groups", () => {
  const view = buildComplexityViewModel(dualResource, "quick-sort-hast")
  const hast = renderComplexityHast(view)
  const figure = findHastElement(hast, "figure")
  const resources = findAllHastByClass(hast, "complexity__resource")
  const labels = findAllHastByClass(hast, "complexity__resource-label")

  assert.equal(figure?.properties.ariaLabel, dualResource.label)
  assert.equal(findAllHastByClass(hast, "complexity__title").length, 0)
  assert.deepEqual(labels.map(hastText), ["Time", "Space"])
  assert.deepEqual(
    resources.map(({ properties }) => properties["data-complexity-resource"]),
    ["time", "space"],
  )
  assert.ok(resources.every(({ properties }) => properties.role === "group"))
  assert.ok(resources.every(({ properties }) => typeof properties.ariaLabelledBy === "string"))
  const legends = findAllHastByClass(hast, "complexity__legend")
  assert.equal(legends.length, 2)
  assert.deepEqual(
    legends.map(({ properties }) => (properties.className as string[]).at(-1)),
    ["is-ungrouped", "is-grouped"],
  )
  assert.equal(hastElements(hast, "button").length, 5)
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
  assert.equal(hastElements(hast, "button").length, 3)
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
    "Best",
    "Average",
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

  firstButton.dispatchEvent(new Event("click"))
  assert.equal(firstButton.attributes["aria-pressed"], "true")
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-subtle"))
  assert.ok(secondArea.classList.contains("is-subtle"))

  firstButton.dispatchEvent(new Event("click"))
  assert.equal(firstButton.attributes["aria-pressed"], "false")
  assert.ok(firstPath.classList.contains("is-highlighted"))
  assert.ok(secondPath.classList.contains("is-highlighted"))

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
  assert.equal(findAllFake(root, "li").length, 3)
  assert.equal(findAllFake(root, "button").length, 3)
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

test("complexity styles have no StepTrace tabs dependency and no top margin", () => {
  const styles = readFileSync(join(process.cwd(), "custom", "complexity", "styles.scss"), "utf8")
  assert.match(styles, /\.complexity\s*\{[^}]*container-type: inline-size;/s)
  assert.match(styles, /\.complexity__resource\s*\{[^}]*container-type: inline-size;/s)
  assert.match(
    styles,
    /\.complexity__resources:has\(> \.complexity__resource:only-child\)\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*overflow-x:\s*visible;/s,
  )
  assert.match(styles, /\.complexity\s*\{[^}]*margin:\s*0 0 1\.5rem;/s)
  assert.match(
    styles,
    /\.complexity__variables\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;[^}]*font:[^;]*0\.875rem/s,
  )
  assert.doesNotMatch(styles, /steptrace|complexity__tabs?|@use/)
  assert.match(
    styles,
    /th:nth-child\(6\):last-child,\s*td:nth-child\(6\):last-child\s*\{\s*min-width:\s*18rem;/s,
  )
  assert.doesNotMatch(styles, /\n\s*th:last-child,\s*\n\s*td:last-child/)
  assert.match(styles, /@container \(min-width: 600px\)/)
  assert.match(
    styles,
    /@container \(min-width: 600px\)[\s\S]*\.complexity__resource:only-child \.complexity__tick,[\s\S]*font-size:\s*12px;/,
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
  assert.match(styles, /\.complexity__resources\s*\{[^}]*display:\s*grid;[^}]*overflow-x:\s*auto;/s)
  assert.match(
    styles,
    /\.complexity__resources\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(/s,
  )
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
      /COMPLEXITY_FILTERS|ComplexityFilter|complexity__tabs?|steptrace__tabs?|data-filter|activeFilter|active-filter|role:\s*["']tab|role",\s*["']tab/,
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
