import assert from "node:assert/strict"
import test from "node:test"
import type { Element, RootContent } from "hast"

import { renderComplexityDom } from "./dom"
import { renderComplexityHast } from "./hast"
import { buildComplexityViewModel, CURVE_IDS, curveValue } from "./model"
import { ComplexityBlock } from "../transformers/complexity-block"

const variables = { n: "input size" }

const catalogue = {
  version: 1,
  mode: "catalogue",
  title: "Complexity",
  variables,
  entries: CURVE_IDS.map((curveId) => ({ kind: "catalogue", curveId })),
}

const cases = {
  version: 1,
  mode: "cases",
  title: "Cases",
  variables,
  entries: [
    { kind: "case", role: "Best", curveId: "linear" },
    { kind: "case", role: "Average", curveId: "linear" },
    { kind: "case", role: "Worst", curveId: "quadratic" },
  ],
}

const operations = {
  version: 1,
  mode: "operations",
  title: "Operations",
  variables,
  entries: [
    {
      kind: "operation",
      operation: "Action",
      bounds: [
        { kind: "catalogue", role: "Expected", curveId: "constant" },
        { kind: "text", role: "Limit", formula: "implementation-defined" },
      ],
    },
  ],
}

const resources = {
  version: 2,
  label: "Resource complexity",
  variables: {
    input: { symbol: "n", description: "input size" },
  },
  resources: {
    time: {
      mode: "cases",
      entries: [
        { kind: "case", role: "Best", formula: "O(n)", curveId: "linear" },
        { kind: "case", role: "Average", formula: "O(n)", curveId: "linear" },
        { kind: "case", role: "Worst", formula: "O(n²)", curveId: "quadratic" },
      ],
    },
    space: {
      mode: "operations",
      entries: [
        {
          kind: "operation",
          operation: "Storage",
          bounds: [
            {
              kind: "curve",
              role: "Range",
              formula: "O(n)..O(n²)",
              curveFrom: "linear",
              curveTo: "quadratic",
            },
            {
              kind: "samples",
              role: "Measured",
              formula: "samples",
              samples: [
                { n: 1, value: 1 },
                { n: 2, value: 3 },
              ],
            },
            { kind: "text", role: "Note", formula: "implementation-defined" },
          ],
        },
      ],
    },
  },
}

const comparison = {
  version: 2,
  label: "Comparison",
  variables: resources.variables,
  resources: Object.fromEntries(
    ["time", "space"].map((key) => [
      key,
      {
        mode: "comparison",
        entries: [
          { kind: "approach", label: "Option A", formula: "O(n)", curveId: "linear" },
          { kind: "approach", label: "Option B", formula: "O(n²)", curveId: "quadratic" },
        ],
      },
    ]),
  ),
}

function elements(node: RootContent): Element[] {
  if (node.type !== "element") return []
  return [
    node,
    ...node.children.flatMap((child) => (child.type === "element" ? elements(child) : [])),
  ]
}

function hasClass(node: Element, className: string): boolean {
  const names = node.properties.className
  return Array.isArray(names) && names.includes(className)
}

function textOf(node: RootContent): string {
  if (node.type === "text") return node.value
  if (node.type !== "element") return ""
  return node.children.map(textOf).join("")
}

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
  id = ""
  className = ""
  dataset: Record<string, string> = {}
  hidden = false
  tabIndex = 0
  style = new FakeStyle()
  attributes: Record<string, string> = {}
  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeDocument,
  ) {
    super()
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = String(value)
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

function fakeElements(node: FakeNode): FakeElement[] {
  return [...(node instanceof FakeElement ? [node] : []), ...node.children.flatMap(fakeElements)]
}

test("every public schema mode builds a finite view model", () => {
  for (const [index, config] of [catalogue, cases, operations, resources, comparison].entries()) {
    const view = buildComplexityViewModel(config, `unit-${index}`)
    assert.ok(view.resources.length > 0)
    assert.ok(view.paths.length > 0)
    for (const path of view.paths) {
      assert.match(path.geometry, /^M/)
      assert.ok(path.samples.every(({ n, value, x, y }) => [n, value, x, y].every(Number.isFinite)))
    }
  }
})

test("malformed schema is rejected at the public boundary", () => {
  for (const invalid of [
    null,
    {},
    { ...catalogue, version: 3 },
    { ...catalogue, unsupported: true },
    { ...resources, resources: { time: resources.resources.time } },
  ]) {
    assert.throws(() => buildComplexityViewModel(invalid, "invalid"), /complexity\./)
  }
})

test("curve functions stay finite, non-negative, and ordered", () => {
  const samples = CURVE_IDS.map((curveId) => [curveId, curveValue(curveId, 8)] as const)
  assert.ok(samples.every(([, value]) => Number.isFinite(value) && value >= 0))
  for (let index = 1; index < samples.length; index++) {
    assert.ok(samples[index - 1][1] <= samples[index][1], samples[index][0])
  }
})

test("HAST keeps accessibility, namespaces, and variables inside the figure", () => {
  const figures = ["first", "second"].map((namespace) =>
    renderComplexityHast(buildComplexityViewModel(resources, namespace)),
  )
  const allIds = figures.flatMap((figure) =>
    elements(figure)
      .map(({ properties }) => properties.id)
      .filter((id): id is string => typeof id === "string"),
  )
  assert.equal(new Set(allIds).size, allIds.length)

  for (const figure of figures) {
    assert.equal(figure.type, "element")
    if (figure.type !== "element") continue
    assert.equal(figure.tagName, "figure")
    assert.equal(figure.properties.ariaLabel, resources.label)
    const nodes = elements(figure)
    assert.equal(nodes.filter((node) => node.properties.role === "tab").length, 2)
    assert.equal(nodes.filter((node) => node.properties.role === "tabpanel").length, 2)
    assert.equal(nodes.filter((node) => node.tagName === "table").length, 0)
    const resourcesIndex = figure.children.findIndex(
      (child) => child.type === "element" && hasClass(child, "complexity__resources"),
    )
    const variablesIndex = figure.children.findIndex(
      (child) => child.type === "element" && hasClass(child, "complexity__variables"),
    )
    assert.ok(variablesIndex > resourcesIndex)
  }
})

test("the DOM renderer exposes the same figure contract and destroys cleanly", () => {
  const document = new FakeDocument()
  const root = new FakeElement("root", document)
  const view = buildComplexityViewModel(resources, "dom")
  const handle = renderComplexityDom(root as unknown as HTMLElement, view)
  const nodes = fakeElements(root)
  const figure = nodes.find(({ tagName }) => tagName === "figure")

  assert.equal(figure?.attributes["aria-label"], view.label)
  assert.equal(nodes.filter(({ attributes }) => attributes.role === "tab").length, 2)
  assert.equal(nodes.filter(({ attributes }) => attributes.role === "tabpanel").length, 2)
  assert.ok(
    nodes.findIndex(({ className }) => className === "complexity__variables") >
      nodes.findIndex(({ className }) => className === "complexity__resources"),
  )
  handle.destroy()
  assert.equal(root.children.length, 0)
})

test("the transformer replaces only valid complexity fences", () => {
  const transform = ComplexityBlock().htmlPlugins?.()[0]?.()
  assert.ok(transform)
  const fence = (language: string, source: string) => ({
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties: { className: [`language-${language}`] },
        children: [{ type: "text", value: source }],
      },
    ],
  })
  const tree = {
    type: "root",
    children: [
      fence("complexity", JSON.stringify(cases)),
      fence("typescript", "{}"),
      fence("complexity", "{invalid"),
    ],
  }

  transform(tree as never)
  assert.equal(tree.children[0].tagName, "figure")
  assert.equal(tree.children[1].tagName, "pre")
  assert.equal(tree.children[2].tagName, "pre")
  assert.match(textOf(tree.children[2] as RootContent), /{invalid/)
})
