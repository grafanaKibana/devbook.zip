import assert from "node:assert/strict"
import test from "node:test"
import type { Root } from "mdast"
import remarkParse from "remark-parse"
import { unified } from "unified"

import { buildPairIndex, findPairRecord, type AuthoringNode } from "./src/authoring/pair-index"
import { ObsidianPairIndexCache } from "./src/authoring/obsidian-index"
import { MermaidFlowBlock } from "../transformers/mermaid-flow-block"

const parser = unified().use(remarkParse)
const parse = (source: string): Root => parser.parse(source)
const source = (id: string) => JSON.stringify({ for: id })
const pair = (id: string, fence = "```", close = fence) =>
  [
    `${fence}mermaid`,
    `%% mermaid-flow: ${id}`,
    "A --> B",
    close,
    `${fence}mermaid-flow`,
    source(id),
    close,
  ].join("\n")

const count = (root: AuthoringNode, type: string): number =>
  (root.type === type ? 1 : 0) +
  (root.children?.reduce((total, child) => total + count(child, type), 0) ?? 0)

const transform = async (markdown: string): Promise<AuthoringNode> => {
  const tree = parse(markdown)
  const plugin = MermaidFlowBlock().markdownPlugins?.()[0]
  assert.ok(plugin)
  await plugin()(tree, undefined)
  return tree as unknown as AuthoringNode
}

const unordered = [
  "- ```mermaid",
  "  %% mermaid-flow: unordered",
  "  A --> B",
  "  ```",
  "  ```mermaid-flow",
  `  ${source("unordered")}`,
  "  ```",
].join("\n")
const ordered = unordered
  .replace("- ```mermaid", "1. ```mermaid")
  .replaceAll("  ", "   ")
  .replaceAll("unordered", "ordered")
const nested = unordered
  .split("\n")
  .map((line) => `    ${line}`)
  .toSpliced(0, 0, "- Outer")
  .join("\n")
  .replaceAll("unordered", "nested")
const callout = [
  "> [!example]",
  ">",
  ...pair("callout")
    .split("\n")
    .map((line) => `> ${line}`),
].join("\n")
const tabbed = [
  "- Tabbed",
  ...pair("tabbed")
    .split("\n")
    .map((line) => `\t${line}`),
].join("\n")
const documented = [pair("documented"), "", "````markdown", pair("documented"), "````"].join("\n")
const eofClosed = pair("eof").split("\n").slice(0, -1).join("\n")
const rawHtml = [
  pair("raw"),
  "",
  ...["pre", "script", "style", "textarea"].flatMap((tag) => [
    `<${tag}>`,
    pair("raw"),
    `</${tag}>`,
    "",
  ]),
].join("\n")

test("Obsidian index and Quartz transformer agree across parser-owned Markdown containers", async () => {
  const valid = [
    pair("top"),
    pair("tilde", "~~~", "~~~~"),
    pair("long", "```", "`````"),
    unordered,
    ordered,
    nested,
    callout,
    tabbed,
    documented,
    eofClosed,
    rawHtml,
  ]
  const invalid = [
    `${pair("comment").split("\n").slice(0, 4).join("\n")}\n<!-- gap -->\n${pair("comment").split("\n").slice(4).join("\n")}`,
    `${pair("paragraph").split("\n").slice(0, 4).join("\n")}\nintervening\n${pair("paragraph").split("\n").slice(4).join("\n")}`,
  ]

  for (const markdown of valid) {
    const index = buildPairIndex(parse(markdown) as unknown as AuthoringNode)
    assert.equal(index.records.length, 1, markdown)
    assert.equal(index.records[0].failure, null, markdown)
    const quartz = await transform(markdown)
    assert.equal(count(quartz, "mermaidFlowBlock"), 1, markdown)
    assert.equal(count(quartz, "mermaidFlowDiagnostic"), 0, markdown)
  }

  for (const markdown of invalid) {
    const index = buildPairIndex(parse(markdown) as unknown as AuthoringNode)
    assert.equal(index.records.length, 1, markdown)
    assert.equal(
      index.records[0].failure,
      "configuration must immediately follow its Mermaid fence",
    )
    const quartz = await transform(markdown)
    assert.equal(count(quartz, "mermaidFlowBlock"), 0)
    assert.equal(count(quartz, "mermaidFlowDiagnostic"), 1)
  }
})

test("shared index keeps per-fence duplicate diagnostics and exact position/source records", async () => {
  const markdown = `${pair("same")}\n\n${pair("same")}`
  const index = buildPairIndex(parse(markdown) as unknown as AuthoringNode)
  assert.equal(index.records.length, 2)
  assert.ok(index.records.every((record) => record.failure === "pairing ID `same` is duplicated"))
  assert.notEqual(index.records[0].position?.start.line, index.records[1].position?.start.line)
  for (const record of index.records) {
    assert.ok(record.position)
    assert.equal(
      findPairRecord(
        index,
        record.position.start.line - 1,
        record.position.end.line - 1,
        record.source,
      ),
      record,
    )
  }
  assert.equal(findPairRecord(index, 0, 0, source("same")), null)
  assert.equal(findPairRecord(index, 4, 6, `${source("same")} `), null)

  const quartz = await transform(markdown)
  assert.equal(count(quartz, "mermaidFlowBlock"), 0)
  assert.equal(count(quartz, "mermaidFlowDiagnostic"), 2)
})

test("Obsidian cache parses once per unchanged path/content, reparses changes, evicts, and clears", () => {
  let parses = 0
  const cache = new ObsidianPairIndexCache(2, (markdown) => {
    parses += 1
    return parse(markdown) as unknown as AuthoringNode
  })
  const first = pair("first")
  const changed = pair("changed")

  assert.equal(cache.get("a.md", first), cache.get("a.md", first))
  assert.equal(parses, 1)
  cache.get("a.md", changed)
  cache.get("b.md", changed)
  assert.equal(parses, 3)
  cache.get("a.md", changed)
  cache.get("c.md", changed)
  cache.get("b.md", changed)
  assert.equal(parses, 5)
  cache.clear()
  cache.get("a.md", changed)
  assert.equal(parses, 6)
})
