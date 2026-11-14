import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { parse } from "yaml"
import { unified } from "unified"
import type { Element, Root } from "hast"
import { Links } from "../quartz/plugins/builtins/links"
import { SyncerFixups } from "./transformers/syncer-fixups"
import { QuestionCollector, type QuestionCallout } from "./transformers/question-collector"

const config = parse(readFileSync(new URL("../quartz.config.yaml", import.meta.url), "utf8"))

test("publication keeps the approved privacy, link and Markdown policies", () => {
  assert.equal(config.configuration.prefetch, "off")
  assert.equal(config.configuration.links.markdownLinkResolution, "shortest")
  assert.equal(config.configuration.drafts.publish, false)
  assert.equal(config.configuration.contentIndex.enableSiteMap, true)
  assert.equal(config.configuration.contentIndex.enableRSS, true)
  const ofm = config.plugins.find((p: { source: string }) =>
    p.source.endsWith("/obsidian-flavored-markdown"),
  )
  const gfm = config.plugins.find((p: { source: string }) =>
    p.source.endsWith("/github-flavored-markdown"),
  )
  assert.ok(gfm.order < ofm.order)
  assert.equal(ofm.options.preset, "strict")
  assert.equal(ofm.options.strictLineBreaks, true)
})

test("frozen vault links resolve before Questions clones and rebases callouts", async () => {
  const link: Element = {
    type: "element",
    tagName: "a",
    properties: { href: "Home/Programming/Target.md" },
    children: [{ type: "text", value: "Target" }],
  }
  const tree: Root = {
    type: "root",
    children: [
      {
        type: "element",
        tagName: "blockquote",
        properties: { className: ["callout", "qard"], dataCallout: "qard" },
        children: [link],
      },
    ],
  }
  const ctx = {
    allSlugs: ["programming/source", "programming/target"],
    cfg: { configuration: { baseUrl: "devbook.zip" } },
  } as never
  const file = {
    data: { slug: "programming/source", relativePath: "Programming/Source.md", frontmatter: {} },
  }
  await unified()
    .use(SyncerFixups().htmlPlugins?.(ctx) ?? [])
    .use(Links({ markdownLinkResolution: "shortest" }).htmlPlugins?.(ctx) ?? [])
    .use(QuestionCollector().htmlPlugins?.(ctx) ?? [])
    .run(tree, file as never)
  assert.equal(link.properties.href, "../programming/target")
  assert.ok(!(link.properties.className as string[]).includes("broken"))
  const cards = (file.data as typeof file.data & { questionCallouts: QuestionCallout[] })
    .questionCallouts
  assert.equal(cards.length, 1)
  assert.equal((cards[0].node.children[0] as Element).properties.href, "/programming/target")
})
