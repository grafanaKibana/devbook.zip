import { visit } from "unist-util-visit"
import type { Root, Element } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Collect every interview question callout into per-file data (file.data.questionCallouts)
// so the QuestionsIndex component can aggregate them on Questions.md — the native
// replacement for the old DataviewJS aggregation. Runs late (defaultOrder 65, after
// obsidian-flavored-markdown builds callouts and crawl-links resolves hrefs), then
// rewrites those hrefs to root-absolute so they still work once rendered elsewhere.

export interface QuestionCallout {
  node: Element
}

const QUESTION_CALLOUT_TYPES = new Set(["question", "qard"])
const QUESTION_CALLOUT_TAGS = new Set(["blockquote", "div"])

const normalize = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()

const classList = (el: Element): string[] => {
  const c = el.properties?.className
  if (Array.isArray(c)) return c.flatMap((value) => String(value).split(/\s+/)).map(normalize)
  if (typeof c === "string") return c.split(/\s+/).map(normalize)
  return []
}

export const isQuestionCallout = (node: Element): boolean => {
  // Raw OFM callouts are blockquotes; Syncer's frozen Datacore output uses divs.
  if (!QUESTION_CALLOUT_TAGS.has(node.tagName)) return false
  const classes = classList(node)
  if (!classes.includes("callout")) return false
  const dataCallout = normalize(node.properties?.dataCallout ?? node.properties?.["data-callout"])
  return (
    classes.some((className) => QUESTION_CALLOUT_TYPES.has(className)) ||
    QUESTION_CALLOUT_TYPES.has(dataCallout)
  )
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
          if (!isQuestionCallout(node)) return
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
