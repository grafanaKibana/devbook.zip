import { visit, SKIP } from "unist-util-visit"
import type { Root as HastRoot, Element } from "hast"
import type { Code, Root as MdastRoot } from "mdast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Cleans the markdown/HTML that Quartz Syncer commits into content so it renders
// correctly on the flattened web build. Three general fixups (not per-note):
//
//   1. Strip raw dataview/datacore fenced blocks. Syncer freezes `datacore*` and
//      declarative `dataview` fences to static HTML, but imperative DataviewJS it
//      cannot execute — those it publishes as raw source (a meaningless code dump
//      on the web, e.g. above the Questions index). Any such fence that survives
//      to content/ means the freeze fell back to raw, so we drop it at the mdast
//      stage before it reaches HTML.
//
//   2. Strip the frozen output of the Questions index block. Questions.md carries
//      a `datacorejsx` block (a `dc-questions-index` wrapper) whose only job is
//      the in-Obsidian render; on the web the page is built by the QuestionsIndex
//      component from the question-collector transformer. Syncer freezes the
//      block to static HTML at publish, so we remove that wrapper here — before
//      the link fixup below and before QuestionCollector runs — so the page has a
//      single renderer and the block's own callouts aren't re-aggregated.
//
//   3. Normalize vault-absolute internal links. Syncer renders in-note Datacore
//      (dc.Link) to <a href="Home/…​.md"> using the *vault* path, but strips the
//      "Home" vault-root folder from the published tree — so those hrefs 404. We
//      drop a leading "Home/" segment before crawl-links (LinkProcessing)
//      resolves the link, so it slugifies to the same page as the real file.
//      Idempotent: links without the prefix are untouched.

const ROOT_FOLDER = "Home"

// Query-engine fences that are dead weight if Syncer ever commits them raw
// (failed freeze). datacorejsx is the current Questions engine; dataviewjs is the
// pre-migration one; the rest round out the family so a stray fence can't leak.
const RAW_QUERY_FENCES = new Set([
  "dataview",
  "dataviewjs",
  "datacore",
  "datacorejs",
  "datacorejsx",
  "datacorets",
  "datacoretsx",
])

// Wrapper class emitted by the Questions.md datacorejsx block; the web renderer
// is the QuestionsIndex component, so the frozen block output is removed.
const QUESTIONS_BLOCK_CLASS = "dc-questions-index"

const isInternal = (href: string): boolean =>
  !!href && !/^([a-z]+:)?\/\//i.test(href) && !href.startsWith("#") && !href.startsWith("mailto:")

const hasClass = (node: Element, cls: string): boolean => {
  const c = node.properties?.className
  if (Array.isArray(c)) return c.map(String).includes(cls)
  if (typeof c === "string") return c.split(/\s+/).includes(cls)
  return false
}

const stripRootPrefix = (href: string): string => {
  // Keep any ?query/#hash aside; only the path can carry the vault-root folder.
  const splitIdx = href.search(/[?#]/)
  const pathPart = splitIdx === -1 ? href : href.slice(0, splitIdx)
  const suffix = splitIdx === -1 ? "" : href.slice(splitIdx)

  let decoded: string
  try {
    decoded = decodeURIComponent(pathPart)
  } catch {
    decoded = pathPart
  }

  // Tolerate "./" or "/" prefixes before the folder name.
  const lead = decoded.replace(/^\.?\/+/, "")
  if (lead !== ROOT_FOLDER && !lead.startsWith(ROOT_FOLDER + "/")) return href

  return lead.slice(ROOT_FOLDER.length).replace(/^\/+/, "") + suffix
}

export const SyncerFixups: QuartzTransformerPlugin = () => ({
  name: "SyncerFixups",
  markdownPlugins() {
    return [
      () => (tree: MdastRoot) => {
        // mdast `code` nodes: drop raw dataview/datacore query fences.
        visit(tree, "code", (node: Code, index, parent) => {
          if (parent && typeof index === "number" && node.lang && RAW_QUERY_FENCES.has(node.lang)) {
            parent.children.splice(index, 1)
            return [SKIP, index]
          }
        })
      },
    ]
  },
  htmlPlugins() {
    return [
      () => (tree: HastRoot) => {
        // Remove the frozen Questions index block (see fixup #2). Runs before the
        // link normalization below and before QuestionCollector.
        visit(tree, "element", (node: Element, index, parent) => {
          if (parent && typeof index === "number" && hasClass(node, QUESTIONS_BLOCK_CLASS)) {
            parent.children.splice(index, 1)
            return [SKIP, index]
          }
        })
        // Normalize vault-absolute internal links (see fixup #3).
        visit(tree, "element", (node: Element) => {
          if (node.tagName !== "a") return
          const href = node.properties?.href
          if (typeof href !== "string" || !isInternal(href)) return
          node.properties!.href = stripRootPrefix(href)
        })
      },
    ]
  },
})
