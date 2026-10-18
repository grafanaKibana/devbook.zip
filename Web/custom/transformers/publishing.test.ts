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
import { rootAssetData, SyncerFixups } from "./syncer-fixups"
import { CalloutDisclosure } from "./callout-disclosure"
import { ClickableImages } from "./clickable-images"

{
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
    assert.equal(
      isQuestionCallout({ ...blockquote({ className: ["qard"] }), tagName: "div" }),
      false,
    )
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
}

{
  test("rootAssetData normalizes local assets and preserves external URLs", () => {
    assert.equal(rootAssetData("assets/fixture.svg"), "/assets/fixture.svg")
    assert.equal(rootAssetData("/assets/fixture.svg"), "/assets/fixture.svg")
    assert.equal(
      rootAssetData("https://example.com/fixture.svg"),
      "https://example.com/fixture.svg",
    )
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
}

{
  const div = (className: string[]): Element => ({
    type: "element",
    tagName: "div",
    properties: { className },
    children: [],
  })

  const callout = (className: string, withContent = true): Element => ({
    type: "element",
    tagName: "blockquote",
    properties: { className },
    children: [
      { type: "text", value: "\n" },
      div(["callout-title"]),
      ...(withContent ? [div(["callout-content"])] : []),
    ],
  })

  const transform = (...children: Element[]) => {
    const tree: Root = { type: "root", children }
    const plugin = CalloutDisclosure().htmlPlugins?.({} as never)[0]
    assert.equal(typeof plugin, "function")
    ;(plugin as () => (tree: Root) => void)()(tree)
  }

  const title = (node: Element) => node.children[1] as Element
  const content = (node: Element) => node.children[2] as Element

  test("folded callouts get a collapsed button title and an inert body", () => {
    const folded = callout("callout question is-collapsible is-collapsed")

    transform(folded)

    assert.equal(title(folded).properties.role, "button")
    assert.equal(title(folded).properties.tabIndex, 0)
    assert.equal(title(folded).properties.ariaExpanded, "false")
    assert.equal(content(folded).properties.inert, true)
  })

  test("folded native Qard callouts retain keyboard and ARIA disclosure semantics", () => {
    const folded = callout("callout qard is-collapsible is-collapsed")

    transform(folded)

    assert.equal(title(folded).properties.role, "button")
    assert.equal(title(folded).properties.tabIndex, 0)
    assert.equal(title(folded).properties.ariaExpanded, "false")
    assert.equal(content(folded).properties.inert, true)
  })

  test("open foldable callouts report expanded and keep their body interactive", () => {
    const open = callout("callout example is-collapsible")

    transform(open)

    assert.equal(title(open).properties.ariaExpanded, "true")
    assert.equal(content(open).properties.inert, undefined)
  })

  test("static callouts and title-only folds are left alone or handled safely", () => {
    const plain = callout("callout note")
    const titleOnly = callout("callout question is-collapsible is-collapsed", false)

    transform(plain, titleOnly)

    assert.deepEqual(title(plain).properties, { className: ["callout-title"] })
    assert.equal(title(titleOnly).properties.ariaExpanded, "false")
  })
}

{
  const element = (tagName: string, properties: Element["properties"]): Element => ({
    type: "element",
    tagName,
    properties,
    children: [],
  })

  const transform = (...children: Element[]) => {
    const tree: Root = { type: "root", children }
    const plugin = ClickableImages().htmlPlugins?.({} as never)[0]
    assert.equal(typeof plugin, "function")
    ;(plugin as () => (tree: Root) => void)()(tree)
  }

  test("supported image carriers normalize theme, size, and accessible labels", () => {
    const raster = element("img", { src: "/assets/sample.PNG?x=1", alt: "640|theme-aware" })
    const vector = element("object", {
      data: "/assets/sample.svg#icon",
      type: "image/svg+xml",
      ariaLabel: "theme-aware",
    })

    transform(raster, vector)

    assert.equal(raster.properties["data-theme-aware"], "true")
    assert.equal(raster.properties.width, 640)
    assert.equal(raster.properties.alt, "sample")
    assert.equal(raster.properties.ariaLabel, "Zoom image: sample")
    assert.equal(vector.properties["data-theme-aware"], "true")
    assert.equal(vector.properties.ariaLabel, "sample")
  })

  test("unsupported carriers keep their theme marker literal", () => {
    const malformed = element("img", { src: "/assets/sample.png", alt: " theme-aware " })
    const unsupported = element("object", {
      data: "/assets/sample.png",
      type: "image/svg+xml",
      ariaLabel: "theme-aware",
    })

    transform(malformed, unsupported)

    assert.equal(malformed.properties["data-theme-aware"], undefined)
    assert.equal(malformed.properties.alt, " theme-aware ")
    assert.deepEqual(unsupported.properties, {
      data: "/assets/sample.png",
      type: "image/svg+xml",
      ariaLabel: "theme-aware",
    })
  })
}
