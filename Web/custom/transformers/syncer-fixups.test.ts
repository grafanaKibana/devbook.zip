import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { Element, Root } from "hast"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { ObsidianFlavoredMarkdown } from "../../.quartz/plugins/obsidian-flavored-markdown/dist/index.js"

import { rootAssetData, SyncerFixups } from "./syncer-fixups"

test("rootAssetData normalizes local assets and preserves external URLs", () => {
  assert.equal(rootAssetData("assets/fixture.svg"), "/assets/fixture.svg")
  assert.equal(rootAssetData("/assets/fixture.svg"), "/assets/fixture.svg")
  assert.equal(rootAssetData("https://example.com/fixture.svg"), "https://example.com/fixture.svg")
})

test("actual frozen Syncer Questions output is stripped once with both Qard and legacy cards", async () => {
  const source = readFileSync(
    new URL("./fixtures/qard-syncer-questions.html", import.meta.url),
    "utf8",
  )
  assert.equal((source.match(/class="dc-questions-index"/g) ?? []).length, 1)
  assert.match(source, /data-callout="qard"/)
  assert.match(source, /data-callout="question"/)

  const ofm = ObsidianFlavoredMarkdown()
  const ctx = { allSlugs: [] } as never
  const file = { data: { slug: "questions", frontmatter: {} } } as never
  const markdown = unified()
    .use(remarkParse)
    .use(ofm.markdownPlugins?.(ctx) ?? [])
  const mdast = await markdown.run(markdown.parse(source), file)
  const html = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(ofm.htmlPlugins?.(ctx) ?? [])
    .use(SyncerFixups().htmlPlugins?.(ctx) ?? [])
  const tree = (await html.run(mdast, file)) as Root
  const wrappers: Element[] = []
  const frozenCallouts: Element[] = []
  visit(tree, "element", (node: Element) => {
    const classes = Array.isArray(node.properties.className)
      ? node.properties.className.map(String)
      : String(node.properties.className ?? "").split(/\s+/)
    if (classes.includes("dc-questions-index")) wrappers.push(node)
    if (node.properties.dataCallout === "qard" || node.properties.dataCallout === "question") {
      frozenCallouts.push(node)
    }
  })

  assert.equal(wrappers.length, 0)
  assert.equal(frozenCallouts.length, 0)
})
