import assert from "node:assert/strict"
import test from "node:test"
import type { Root as HastRoot } from "hast"
import type { Root as MdastRoot } from "mdast"
import { unified } from "unified"
import remarkParse from "remark-parse"

import { MermaidFlowBlock, MermaidFlowPairMarkers } from "./mermaid-flow-block"

const transform = async (markdown: string): Promise<MdastRoot> => {
  const tree = unified().use(remarkParse).parse(markdown) as MdastRoot
  const plugin = MermaidFlowBlock().markdownPlugins?.()[0]
  assert.ok(plugin)
  await plugin()(tree, undefined)
  return tree
}

const pair = (id: string) =>
  [
    "```mermaid",
    `%% mermaid-flow: ${id}`,
    "A --> B",
    "```",
    "```mermaid-flow",
    JSON.stringify({ for: id }),
    "```",
  ].join("\n")

test("emits one bare mount and one matching Mermaid marker for a valid adjacent pair", async () => {
  const tree = await transform(pair("orders"))
  const mermaid = tree.children[0]
  const mount = tree.children[1] as unknown as {
    type: string
    data: { hName: string; hProperties: Record<string, unknown>; hChildren: unknown[] }
  }

  assert.equal(mermaid.type, "code")
  assert.equal(
    (mermaid.data?.hProperties as Record<string, unknown>)["data-mermaid-flow-pair"],
    "orders",
  )
  assert.equal(mount.type, "mermaidFlowBlock")
  assert.equal(mount.data.hName, "div")
  assert.deepEqual(mount.data.hProperties.className, ["mermaid-flow-mount"])
  assert.equal(mount.data.hProperties["data-mermaid-flow-pair"], "orders")
  assert.equal(mount.data.hProperties["data-config"], '{"for":"orders"}')
  assert.deepEqual(mount.data.hChildren, [])
})

test("restamps the rendered Mermaid wrapper and code after syntax highlighting", async () => {
  const tree: HastRoot = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [{ type: "element", tagName: "code", properties: {}, children: [] }],
      },
      { type: "text", value: "\n" },
      {
        type: "element",
        tagName: "div",
        properties: {
          className: ["mermaid-flow-mount"],
          "data-mermaid-flow-pair": "orders",
        },
        children: [],
      },
    ],
  }
  const plugin = MermaidFlowPairMarkers().htmlPlugins?.()[0]
  assert.ok(plugin)
  await plugin()(tree, undefined)
  const wrapper = tree.children[0]
  assert.equal(wrapper.type, "element")
  if (wrapper.type !== "element") return
  assert.equal(wrapper.properties["data-mermaid-flow-pair"], "orders")
  const code = wrapper.children[0]
  assert.equal(code.type, "element")
  if (code.type !== "element") return
  assert.equal(code.properties["data-mermaid-flow-pair"], "orders")
})

test("proves two configured pairs while leaving one unconfigured Mermaid block unchanged", async () => {
  const tree = await transform(
    [pair("orders"), pair("payments"), "```mermaid\nX --> Y\n```"].join("\n"),
  )
  assert.equal(tree.children.filter((node) => node.type === "mermaidFlowBlock").length, 2)
  const plain = tree.children.at(-1)
  assert.equal(plain?.type, "code")
  assert.equal(plain?.data?.hProperties, undefined)
})

test("pairs within a nested blockquote without escaping its local container", async () => {
  const nested = pair("nested")
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")
  const tree = await transform(nested)
  const quote = tree.children[0]
  assert.equal(quote.type, "blockquote")
  if (quote.type !== "blockquote") return
  assert.equal(quote.children[1]?.type, "mermaidFlowBlock")
})

test("fails closed for malformed, mismatched, duplicate-marker, and non-adjacent pairs", async () => {
  const cases = [
    "```mermaid\n%% mermaid-flow: orders\nA --> B\n```\n```mermaid-flow\n{\n```",
    '```mermaid\n%% mermaid-flow: orders\nA --> B\n```\n```mermaid-flow\n{"for":"payments"}\n```',
    '```mermaid\n%% mermaid-flow: orders\n%% mermaid-flow: orders\nA --> B\n```\n```mermaid-flow\n{"for":"orders"}\n```',
    '```mermaid\n%% mermaid-flow: orders\nA --> B\n```\ntext\n```mermaid-flow\n{"for":"orders"}\n```',
  ]

  for (const markdown of cases) {
    const before = unified().use(remarkParse).parse(markdown)
    const after = await transform(markdown)
    const diagnostics = after.children.filter((node) => node.type === "mermaidFlowDiagnostic")
    assert.equal(diagnostics.length, 1)
    assert.equal(
      after.children.some((node) => node.type === "mermaidFlowBlock"),
      false,
    )
    assert.deepEqual(
      after.children.filter((node) => node.type !== "mermaidFlowDiagnostic"),
      before.children,
    )
    assert.match(JSON.stringify(diagnostics[0]?.data), /Mermaid Flow:/u)
  }
})
