import { visit, SKIP } from "unist-util-visit"
import type { Root as HastRoot, Element } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Cleans the markdown/HTML that Quartz Syncer commits into content so it renders
// correctly on the flattened web build. Two general fixups (not per-note):
//
//   1. Strip raw ```dataviewjs fenced blocks. Syncer cannot execute imperative
//      DataviewJS, so it publishes those blocks as raw source — meaningless code
//      dumps on the web (e.g. above the Questions index). Removed at the mdast
//      stage so they never reach HTML.
//
//   2. Normalize vault-absolute internal links. Syncer renders in-note Datacore
//      (dc.Link) to <a href="Home/…​.md"> using the *vault* path, but strips the
//      "Home" vault-root folder from the published tree — so those hrefs 404. We
//      drop a leading "Home/" segment before crawl-links (LinkProcessing)
//      resolves the link, so it slugifies to the same page as the real file.
//      Idempotent: links without the prefix are untouched.

const ROOT_FOLDER = "Home"

const isInternal = (href: string): boolean =>
  !!href &&
  !/^([a-z]+:)?\/\//i.test(href) &&
  !href.startsWith("#") &&
  !href.startsWith("mailto:")

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
      () => (tree: HastRoot) => {
        // mdast `code` nodes: drop the ones fenced as dataviewjs.
        visit(tree, "code", (node: { lang?: string | null }, index, parent) => {
          if (parent && typeof index === "number" && node.lang === "dataviewjs") {
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
