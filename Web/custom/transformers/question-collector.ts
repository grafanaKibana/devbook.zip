import { visit } from "unist-util-visit"
import type { Root, Element } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Collect every `> [!QUESTION]` callout into per-file data (file.data.questionCallouts)
// so the QuestionsIndex component can aggregate them on Questions.md — the native
// replacement for the old DataviewJS aggregation. Runs late (defaultOrder 65, after
// obsidian-flavored-markdown builds callouts and crawl-links resolves hrefs), then
// rewrites those hrefs to root-absolute so they still work once rendered elsewhere.

export interface QuestionCallout {
  node: Element
}

const classList = (el: Element): string[] => {
  const c = el.properties?.className
  if (Array.isArray(c)) return c.map(String)
  if (typeof c === "string") return c.split(/\s+/)
  return []
}

const isInternalRelative = (href: string): boolean =>
  !!href &&
  !/^([a-z]+:)?\/\//i.test(href) &&
  !href.startsWith("/") &&
  !href.startsWith("#") &&
  !href.startsWith("mailto:")

const toRootAbsolute = (href: string, sourceSlug: string): string => {
  try {
    const url = new URL(href, `https://h/${sourceSlug}`)
    return url.pathname + url.search + url.hash
  } catch {
    return href
  }
}

const rebaseLinks = (root: Element, sourceSlug: string): void => {
  visit(root, "element", (el: Element) => {
    if (el.tagName === "a" && typeof el.properties?.href === "string") {
      const href = el.properties.href
      if (isInternalRelative(href)) {
        el.properties.href = toRootAbsolute(href, sourceSlug)
      }
    }
  })
}

export const QuestionCollector: QuartzTransformerPlugin = () => ({
  name: "QuestionCollector",
  htmlPlugins() {
    return [
      () => (tree: Root, file: { data: Record<string, unknown> }) => {
        const slug = file.data.slug as string | undefined
        if (!slug) return
        const collected: QuestionCallout[] = []
        visit(tree, "element", (node: Element) => {
          if (node.tagName !== "blockquote") return
          const classes = classList(node)
          if (!classes.includes("callout") || !classes.includes("question")) return
          const clone = structuredClone(node) as Element
          rebaseLinks(clone, slug)
          collected.push({ node: clone })
        })
        if (collected.length > 0) {
          file.data.questionCallouts = collected
        }
      },
    ]
  },
})
