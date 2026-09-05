import assert from "node:assert/strict"
import test from "node:test"

import { extractFlowmaid } from "../src/authoring/extract"
import { buildFlowmaidIndex, findFlowmaidRecord } from "../src/authoring/index"
import { parseFlowmaidYaml } from "../src/authoring/yaml"
import { compileFlowmaid } from "../src/domain/compile"
import { createSimulation } from "../src/simulation/state"
import { read } from "./helpers"

test("same-fence carrier is exact, local, and newline-stable", () => {
  assert.deepEqual(extractFlowmaid("flowchart LR\nA-->B"), { kind: "none" })
  for (const newline of ["\n", "\r\n"]) {
    const result = extractFlowmaid(
      [
        "flowchart LR",
        "  %% flowmaid",
        "  %% sources:",
        "  %%   - { rate: 1, nodes: [A] }",
        "  %% ",
        "  %% /flowmaid",
      ].join(newline),
    )
    assert.equal(result.kind, "found")
    if (result.kind === "found") {
      assert.equal(result.value.yaml, "sources:\n  - { rate: 1, nodes: [A] }\n")
      assert.deepEqual([result.value.startLine, result.value.endLine], [2, 6])
    }
  }
  for (const source of [
    "%% flowmaid\nsources: []\n%% /flowmaid",
    "%% /flowmaid\n%% flowmaid",
    "%% flowmaid\n%% flowmaid\n%% /flowmaid",
    "%% flowmaid\n%% sources: []",
  ])
    assert.equal(extractFlowmaid(source).kind, "invalid", source)
  for (const source of ["A[%% flowmaid]", "%% mermaid-flow", "%% flowmaid v1", "```mermaid-flow"])
    assert.equal(extractFlowmaid(source).kind, "none", source)
})

test("strict YAML admits JSON-shaped core values and rejects unsafe YAML", () => {
  assert.equal(
    JSON.stringify(parseFlowmaidYaml("sources:\n  - rate: 1\n    nodes: [A]")),
    JSON.stringify({ sources: [{ rate: 1, nodes: ["A"] }] }),
  )
  for (const source of [
    "a: 1\na: 2",
    "---\na: 1\n---\nb: 2",
    "a: &x [1]\nb: *x",
    "sources: []\n<<: { sources: [] }",
    "a: !!str 1",
    "? [a, b]\n: 1",
    "a: null",
    "__proto__: polluted",
    "constructor: polluted",
  ])
    assert.throws(() => parseFlowmaidYaml(source), source)
  assert.equal(({} as { polluted?: unknown }).polluted, undefined)
})

test("MDAST index preserves document order and exact source-range binding", () => {
  const source = "graph LR\nA-->B\n%% flowmaid\n%% sources: [{ rate: 1, nodes: [A] }]\n%% /flowmaid"
  const node = (start: number) => ({
    type: "code",
    lang: "mermaid",
    value: source,
    position: { start: { line: start, column: 1 }, end: { line: start + 6, column: 1 } },
  })
  const index = buildFlowmaidIndex(
    {
      type: "root",
      children: [{ type: "paragraph" }, node(10), { type: "blockquote", children: [node(30)] }],
    },
    (yaml) => compileFlowmaid(parseFlowmaidYaml(yaml)),
  )
  assert.deepEqual(
    index.records.map(({ id }) => id),
    ["10:1:16:1", "30:1:36:1"],
  )
  assert.equal(findFlowmaidRecord(index, 9, 15, source)?.id, "10:1:16:1")
  assert.equal(findFlowmaidRecord(index, 29, 35, source)?.id, "30:1:36:1")
  assert.equal(findFlowmaidRecord(index, 9, 35, source), null)
  assert.equal("id" in index.records[0]!.program!, false)
})

test("README primary authoring example compiles and validates against its graph", () => {
  const example = read("Web/custom/flowmaid/README.md").match(/```mermaid\n([\s\S]*?)\n```/u)?.[1]
  assert.ok(example)
  const extracted = extractFlowmaid(example)
  assert.equal(extracted.kind, "found")
  if (extracted.kind === "found") {
    const program = compileFlowmaid(parseFlowmaidYaml(extracted.value.yaml))
    assert.equal(program.controls[0]?.id, "input")
    assert.deepEqual(program.sources, [{ rate: "input", nodes: ["api"] }])
    assert.deepEqual(program.distributions[0]?.weights, { a: 2, b: 1 })
    assert.doesNotThrow(() =>
      createSimulation(program, {
        nodes: ["api", "a", "b", "resultA", "resultB"],
        edges: [
          { id: "api-a", from: "api", to: "a" },
          { id: "api-b", from: "api", to: "b" },
          { id: "a-resultA", from: "a", to: "resultA" },
          { id: "b-resultB", from: "b", to: "resultB" },
        ],
      }),
    )
  }
})
