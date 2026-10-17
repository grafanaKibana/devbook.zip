import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { Element, Root } from "hast"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { ObsidianFlavoredMarkdown } from "../../.quartz/plugins/obsidian-flavored-markdown/dist/index.js"

import { isQuestionCallout, QuestionCollector, type QuestionCallout } from "./question-collector"

// Sanitized from .omx/execution/qard/syncer-preflight/actual-output/content/.
const actualSyncerContent = (name: string): string =>
  readFileSync(new URL(`./fixtures/qard-syncer-${name}`, import.meta.url), "utf8")

const textContent = (node: Element): string => {
  let value = ""
  const visit = (current: Element | Element["children"][number]) => {
    if (current.type === "text") value += current.value
    if ("children" in current) current.children.forEach(visit)
  }
  visit(node)
  return value
}

const collectTree = (tree: Root, slug = "programming/source") => {
  const file = { data: { slug } } as { data: Record<string, unknown> }
  const plugin = QuestionCollector().htmlPlugins?.({} as never)[0]
  assert.equal(typeof plugin, "function")
  ;(plugin as () => (tree: Root, file: { data: Record<string, unknown> }) => void)()(tree, file)
  return (file.data.questionCallouts ?? []) as QuestionCallout[]
}

const renderActualSyncerMarkdown = async (name: string, slug: string) => {
  const ofm = ObsidianFlavoredMarkdown()
  const ctx = { allSlugs: [] } as never
  const file = { data: { slug, frontmatter: {} } } as { data: Record<string, unknown> }
  const source = ofm.textTransform?.(ctx, actualSyncerContent(name)) ?? actualSyncerContent(name)
  const markdown = unified()
    .use(remarkParse)
    .use(ofm.markdownPlugins?.(ctx) ?? [])
  const mdast = await markdown.run(markdown.parse(source), file as never)
  const html = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(ofm.htmlPlugins?.(ctx) ?? [])
  const tree = (await html.run(mdast, file as never)) as Root
  return collectTree(tree, slug)
}

const renderActualSyncerHtml = async (name: string, slug: string) => {
  const ofm = ObsidianFlavoredMarkdown()
  const ctx = { allSlugs: [] } as never
  const file = { data: { slug, frontmatter: {} } } as { data: Record<string, unknown> }
  const source = actualSyncerContent(name)
  const markdown = unified().use(remarkParse)
  const mdast = await markdown.run(markdown.parse(source), file as never)
  const html = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(ofm.htmlPlugins?.(ctx) ?? [])
    .use(QuestionCollector().htmlPlugins?.(ctx) ?? [])
  await html.run(mdast, file as never)
  return (file.data.questionCallouts ?? []) as QuestionCallout[]
}

const blockquote = (properties: Element["properties"]): Element => ({
  type: "element",
  tagName: "blockquote",
  properties,
  children: [],
})

test("accepted callout predicate requires a rendered callout container and normalizes either type signal", () => {
  assert.equal(isQuestionCallout(blockquote({ className: "callout QARD" })), true)
  assert.equal(
    isQuestionCallout(blockquote({ className: ["callout", "note"], dataCallout: " QUESTION " })),
    true,
  )
  assert.equal(
    isQuestionCallout(blockquote({ className: ["callout", "note"], "data-callout": " qard " })),
    true,
  )
  assert.equal(isQuestionCallout(blockquote({ className: ["qard"] })), false)
  assert.equal(
    isQuestionCallout({ ...blockquote({ className: ["callout", "qard"] }), tagName: "div" }),
    true,
  )
  assert.equal(isQuestionCallout({ ...blockquote({ className: ["qard"] }), tagName: "div" }), false)
  assert.equal(
    isQuestionCallout({ ...blockquote({ className: ["callout", "qard"] }), tagName: "section" }),
    false,
  )
  assert.equal(
    isQuestionCallout({ ...blockquote({ className: ["callout", "note"] }), tagName: "div" }),
    false,
  )
  assert.equal(isQuestionCallout(blockquote({ className: ["callout", "note"] })), false)
})

test("a node exposing class and data-callout signals is collected once and cloned before rebasing", () => {
  const node = blockquote({ className: ["callout", "question"], dataCallout: "qard" })
  node.children.push({
    type: "element",
    tagName: "a",
    properties: { href: "related?view=full#answer" },
    children: [{ type: "text", value: "Related" }],
  })
  const original = structuredClone(node)

  const collected = collectTree({ type: "root", children: [node] }, "ai/rag/source")

  assert.equal(collected.length, 1)
  assert.deepEqual(node, original)
  const link = collected[0]!.node.children[0] as Element
  assert.equal(link.properties.href, "/ai/rag/related?view=full#answer")
})

test("installed OFM converts actual basic Syncer Qard Markdown into one collected card", async () => {
  const collected = await renderActualSyncerMarkdown("basic.md", "fixture/basic")

  assert.equal(collected.length, 1)
  assert.match(textContent(collected[0]!.node), /What does a native Qard callout preserve\?/)
  assert.match(textContent(collected[0]!.node), /one canonical prompt and answer/)
})

test("actual multiline Syncer Markdown remains one card without source marker leakage", async () => {
  const collected = await renderActualSyncerMarkdown("multiline.md", "fixture/multiline")

  assert.equal(collected.length, 1)
  const content = textContent(collected[0]!.node)
  assert.match(content, /A multiline prompt can contain rich Markdown/)
  assert.match(content, /The answer can contain:/)
  assert.doesNotMatch(content, /qard-answer|fenced lookalike|commented lookalike/)
  const links: Element[] = []
  visit(collected[0]!.node, "element", (node: Element) => {
    if (node.tagName === "a") links.push(node)
  })
  assert.equal(links[0]?.properties.href, "/fixture/Basic.md")
})

test("actual frozen Syncer HTML collects one native and one legacy card without rewriting tags", async () => {
  const collected = await renderActualSyncerHtml("questions.html", "fixture/questions")

  assert.equal(collected.length, 2)
  assert.deepEqual(
    collected.map(({ node }) => [node.tagName, node.properties.dataCallout]),
    [
      ["div", "qard"],
      ["div", "question"],
    ],
  )
  for (const { node } of collected) {
    assert.ok((node.properties.className as string[]).includes("node-insert-event"))
    assert.doesNotMatch(textContent(node), /qard-answer/)
  }
})
