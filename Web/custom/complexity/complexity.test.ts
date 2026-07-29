import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import type { Element } from "hast"

import { renderComplexityDom } from "./dom"
import { renderComplexityHast } from "./hast"
import { buildComplexityViewModel, COMPLEXITY_FILTERS, CURVE_IDS, curveValue } from "./model"
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
      qualifiers: ["balanced partitions"],
      details: { auxiliarySpace: "O(log n)", cause: "Balanced partitions." },
    },
    {
      kind: "case",
      role: "Average",
      curveId: "n-log-n",
      qualifiers: ["expected with a randomized pivot"],
      details: { auxiliarySpace: "O(log n)", cause: "Expected balanced partitions." },
    },
    {
      kind: "case",
      role: "Worst",
      curveId: "quadratic",
      qualifiers: ["repeatedly unbalanced pivot"],
      details: { auxiliarySpace: "O(n)", cause: "Partitions shrink by one element." },
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
          kind: "catalogue",
          curveId: "constant",
          role: "Average",
          qualifiers: ["well-distributed hash"],
        },
        {
          kind: "text",
          formula: "O(bucket length)",
          role: "Collision-bound",
          details: { assumptions: ["separate chaining"] },
        },
      ],
      details: {
        structureSpace: "O(n)",
        auxiliarySpace: "O(1)",
        cause: "Hashing selects a bucket.",
      },
    },
  ],
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
      description: `${curveId} description`,
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
  }
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
      description: `${curveId} description`,
    })),
  }
  const view = buildComplexityViewModel(config)
  assert.deepEqual(
    view.rows.map((row) => row.formula),
    ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2^n)", "O(n!)"],
  )
  assert.equal(view.paths.find((path) => path.curveId === "factorial")?.samples.length, 9)
  assert.equal(
    view.paths.find((path) => path.curveId === "factorial")?.samples.at(-1)?.value,
    3_628_800,
  )
  assert.equal("caption" in view, false)
  assert.deepEqual(view.availableCategories, ["other"])
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
  assert.deepEqual(view.availableCategories, ["best", "average", "worst"])
  assert.equal(view.endpointLabels.find((label) => label.curveId === "n-log-n")?.pathIds.length, 2)
  assert.deepEqual(
    view.rows.map((row) => [row.label, row.formula, row.auxiliarySpace, row.cause]),
    [
      ["Best", "O(n log n)", "O(log n)", "Balanced partitions."],
      ["Average", "O(n log n)", "O(log n)", "Expected balanced partitions."],
      ["Worst", "O(n²)", "O(n)", "Partitions shrink by one element."],
    ],
  )
})

test("operation text bounds stay semantic-only while catalogue bounds plot", () => {
  const view = buildComplexityViewModel(operations)
  assert.equal(view.rows[0]?.formula, "O(1)")
  assert.equal(view.rows[1]?.formula, "O(bucket length)")
  assert.deepEqual(view.rows[1]?.assumptions, ["separate chaining"])
  assert.equal(view.rows[1]?.structureSpace, "O(n)")
  assert.equal(view.paths.filter((path) => !path.dimmed).length, 1)
  assert.equal(view.paths.find((path) => !path.dimmed)?.curveId, "constant")
  assert.ok(view.paths.flatMap((path) => path.samples).every(({ y }) => Number.isFinite(y)))
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
        labels: ["Best O(1)", "Avg O(1)", "Worst O(n)"],
        colors: ["#8bb8e8", "#4c89cb", "#245b98"],
      },
      {
        label: "Insert",
        labels: ["Best O(1)", "Avg O(1)", "Worst O(n)"],
        colors: ["#bd9ee8", "#8d62c7", "#65379e"],
      },
    ],
  )
  const constantPaths = view.paths.filter((path) => !path.dimmed && path.curveId === "constant")
  assert.equal(new Set(constantPaths.map((path) => path.geometry)).size, constantPaths.length)
  assert.ok(constantPaths.every((path) => path.geometry.startsWith("M0.00,282.00 ")))
})

test("semantic duplicates and unknown details fail at their exact field", () => {
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
            details: { ...operations.entries[0].details, latency: "variable" },
          },
        ],
      }),
    /entries\[0\]\.details\.latency: is not supported/,
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
    description: "Constant.",
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
      { ...catalogue, entries: [{ kind: "catalogue", curveId: "constant" }] },
      /entries\[0\]\.description: must be a non-empty string/,
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
      /entries\[0\]\.bounds\[1\]\.role: duplicates Average/,
    ],
    [
      {
        ...operations,
        entries: [
          {
            ...operations.entries[0],
            bounds: [{ ...operations.entries[0].bounds[0], formula: "O(wrong)" }],
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

function hastText(node: unknown): string {
  if (!node || typeof node !== "object") return ""
  const value = node as { value?: unknown; children?: unknown[] }
  return `${typeof value.value === "string" ? value.value : ""}${(value.children ?? [])
    .map(hastText)
    .join("")}`
}

function hastElements(node: unknown, tagName: string): { properties: Record<string, unknown> }[] {
  if (!node || typeof node !== "object") return []
  const value = node as {
    type?: unknown
    tagName?: unknown
    properties?: Record<string, unknown>
    children?: unknown[]
  }
  return [
    ...(value.type === "element" && value.tagName === tagName
      ? [{ properties: value.properties ?? {} }]
      : []),
    ...(value.children ?? []).flatMap((child) => hastElements(child, tagName)),
  ]
}

function findHastElement(node: unknown, tagName: string): Element | undefined {
  if (!node || typeof node !== "object") return undefined
  const value = node as { type?: unknown; tagName?: unknown; children?: unknown[] }
  if (value.type === "element" && value.tagName === tagName) return value as Element
  for (const child of value.children ?? []) {
    const found = findHastElement(child, tagName)
    if (found) return found
  }
  return undefined
}

function findHastByClass(node: unknown, className: string): Element | undefined {
  if (!node || typeof node !== "object") return undefined
  const value = node as Element
  if (
    value.type === "element" &&
    Array.isArray(value.properties?.className) &&
    value.properties.className.includes(className)
  ) {
    return value
  }
  for (const child of value.children ?? []) {
    const found = findHastByClass(child, className)
    if (found) return found
  }
  return undefined
}

test("Quartz HAST is interactive static-first markup without an embedded details table", () => {
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
  assert.equal(hastElements(hast, "button").length, COMPLEXITY_FILTERS.length + 3)
  assert.equal(
    hastElements(hast, "text").length,
    view.ticks.length + view.xTicks.length + CURVE_IDS.length,
  )
  assert.ok(findHastByClass(hast, "steptrace__tabs"))
  const plotGroups = findHastByClass(hast, "complexity__areas")
  const curveGroups = findHastByClass(hast, "complexity__curves")
  assert.ok(plotGroups)
  assert.ok(curveGroups)
  assert.match(hastText(hast), /Avg O\(n log n\)/)
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
  createTHead() {
    const node = this.ownerDocument.createElement("thead")
    this.append(node)
    return node
  }
  createTBody() {
    const node = this.ownerDocument.createElement("tbody")
    this.append(node)
    return node
  }
  insertRow() {
    const node = this.ownerDocument.createElement("tr")
    this.append(node)
    return node
  }
  insertCell() {
    const node = this.ownerDocument.createElement("td")
    this.append(node)
    return node
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

function findFake(node: FakeNode, tagName: string): FakeElement | undefined {
  if (node instanceof FakeElement && node.tagName === tagName) return node
  for (const child of node.children) {
    const found = findFake(child, tagName)
    if (found) return found
  }
  return undefined
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

test("HAST and DOM normalize to the same IDs, labels, controls, rows, and safe text", () => {
  const hostile = structuredClone(operations)
  hostile.title = "<img src=x onerror=alert(1)>"
  hostile.entries[0].details.cause = "<script>alert(1)</script>"
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
  const hastRows = hastElements(hast, "tr")
    .map(({ properties }) => properties["data-complexity-row"])
    .filter((id): id is string => typeof id === "string")
  const domRows = findAllFake(root, "tr")
    .map(({ dataset }) => dataset.complexityRow)
    .filter((id): id is string => typeof id === "string")
  const hastLegend = hastElements(hast, "li").map((item) => item.properties)
  const domLegend = findAllFake(root, "li")

  assert.deepEqual(hastPaths, domPaths)
  assert.deepEqual(hastRows, domRows)
  assert.equal(hastLegend.length, domLegend.length)
  assert.equal(hastText(hast), fakeText(root))
  assert.match(hastText(hast), /<img src=x onerror=alert\(1\)>/)
  assert.doesNotMatch(hastText(hast), /<script>alert\(1\)<\/script>/)
  assert.equal(hastElements(hast, "script").length, 0)
  assert.equal(findAllFake(root, "script").length, 0)
  assert.equal(new Set(view.paths.map(({ id }) => id)).size, view.paths.length)
  assert.equal(new Set(view.rows.map(({ id }) => id)).size, view.rows.length)
  assert.deepEqual(
    buildComplexityViewModel(hostile).paths.map(({ id }) => id),
    view.paths.map(({ id }) => id),
  )
  assert.deepEqual(
    view.rows.map((row) => ({
      label: row.label,
      formula: row.formula,
      variables: row.variables,
      qualifiers: row.qualifiers,
      cause: row.cause,
      assumptions: row.assumptions,
      auxiliarySpace: row.auxiliarySpace,
      structureSpace: row.structureSpace,
    })),
    [
      {
        label: "Lookup — Average",
        formula: "O(1)",
        variables: "n: number of input elements",
        qualifiers: ["well-distributed hash"],
        cause: "<script>alert(1)</script>",
        assumptions: undefined,
        auxiliarySpace: "O(1)",
        structureSpace: "O(n)",
      },
      {
        label: "Lookup — Collision-bound",
        formula: "O(bucket length)",
        variables: "n: number of input elements",
        qualifiers: undefined,
        cause: "<script>alert(1)</script>",
        assumptions: ["separate chaining"],
        auxiliarySpace: "O(1)",
        structureSpace: "O(n)",
      },
    ],
  )
})

test("Obsidian DOM exposes equivalent labels and clears itself on teardown", () => {
  const document = new FakeDocument()
  const root = document.createElement("div")
  const view = buildComplexityViewModel(cases)
  const handle = renderComplexityDom(root as unknown as HTMLElement, view)
  const svg = findFake(root, "svg")
  assert.equal(svg?.attributes["aria-hidden"], "true")
  assert.equal(findFake(root, "table"), undefined)
  assert.equal(findAllFake(root, "li").length, 3)
  assert.equal(findAllFake(root, "button").length, COMPLEXITY_FILTERS.length + 3)
  assert.equal(findFake(root, "figcaption")?.textContent, view.title)
  handle.destroy()
  assert.equal(root.children.length, 0)
})
