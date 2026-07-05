import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { resolveRelative, htmlToJsx, type FullSlug } from "@quartz-community/utils"
import type { Element, Root as HastRoot } from "hast"

// Native replacement for the DataviewJS aggregation on Questions.md. Reads the
// question callouts collected by the question-collector transformer
// (file.data.questionCallouts), groups them by vault folder, and renders a table
// of contents + the grouped callouts with a source link each.
// Self-gates to the Questions page.

// Content is flattened, so notes live at the root (e.g. "07-security/encryption")
// and this page is at slug "questions".
const QUESTIONS_SLUG = "questions"

interface Item {
  node: Element
  sourceSlug: FullSlug
  sourceTitle: string
}
interface TreeNode {
  title: string
  slugId: string
  children: Map<string, TreeNode>
  items: Item[]
}

const toId = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

const stripPrefix = (s: string): string => s.replace(/^\d+\s+/, "").trim()

const prettify = (segment: string): string =>
  stripPrefix(
    segment
      .replace(/--and--/g, " & ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  )

const newNode = (title: string, slugId: string): TreeNode => ({
  title,
  slugId,
  children: new Map(),
  items: [],
})

const countItems = (node: TreeNode): number => {
  let n = node.items.length
  for (const c of node.children.values()) n += countItems(c)
  return n
}

const sortedEntries = (m: Map<string, TreeNode>): [string, TreeNode][] =>
  [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))

export const QuestionsIndex: QuartzComponentConstructor = () => {
  const Questions: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
    if (fileData.slug !== QUESTIONS_SLUG) return null

    const folderTitle = new Map<string, string>()
    for (const f of allFiles) {
      const slug = f.slug ?? ""
      if (slug.endsWith("/index")) {
        const folderSlug = slug.slice(0, -"/index".length)
        const title = (f.frontmatter as { title?: string } | undefined)?.title
        if (title) folderTitle.set(folderSlug, title)
      }
    }

    const root = newNode("", "")
    for (const f of allFiles) {
      const callouts = (f as { questionCallouts?: { node: Element }[] }).questionCallouts
      const slug = (f.slug ?? "") as string
      if (!callouts?.length || !slug) continue

      const segments = slug.split("/").filter(Boolean)
      const folderSegs = segments.slice(0, -1)

      let node = root
      let acc = ""
      for (const seg of folderSegs.slice(0, 6)) {
        acc = acc ? `${acc}/${seg}` : seg
        if (!node.children.has(seg)) {
          const title = folderTitle.has(acc) ? stripPrefix(folderTitle.get(acc)!) : prettify(seg)
          node.children.set(seg, newNode(title, toId(acc)))
        }
        node = node.children.get(seg)!
      }
      const sourceTitle =
        (f.frontmatter as { title?: string } | undefined)?.title ??
        segments[segments.length - 1] ??
        slug
      for (const c of callouts) {
        node.items.push({ node: c.node, sourceSlug: slug as FullSlug, sourceTitle })
      }
    }

    const total = countItems(root)

    const renderCallout = (item: Item, key: number) => {
      const tree: HastRoot = { type: "root", children: [item.node] }
      const href = resolveRelative(fileData.slug!, item.sourceSlug)
      return (
        <div class="qi-item" key={key}>
          {htmlToJsx(tree)}
          <div class="qi-source">
            <a class="internal" href={href}>
              {item.sourceTitle}
            </a>
          </div>
        </div>
      )
    }

    const renderTree = (node: TreeNode, depth: number): any[] => {
      const out: any[] = []
      for (const [, child] of sortedEntries(node.children)) {
        const level = Math.min(depth + 1, 6)
        const Heading = `h${level}` as keyof JSX.IntrinsicElements
        out.push(
          <Heading id={child.slugId} class="qi-heading">
            {child.title}
          </Heading>,
        )
        child.items.forEach((it, i) => out.push(renderCallout(it, i)))
        out.push(...renderTree(child, depth + 1))
      }
      return out
    }

    const topLevel = sortedEntries(root.children)

    return (
      <div class="questions-index">
        <div class="qi-toc">
          <h2>Table of Contents</h2>
          <p class="qi-total">Total questions: {total}</p>
          <ul>
            {topLevel.map(([, h1]) => (
              <li>
                <strong>
                  <a href={`#${h1.slugId}`}>{h1.title}</a> ({countItems(h1)})
                </strong>
                {h1.children.size > 0 && (
                  <ul>
                    {sortedEntries(h1.children).map(([, h2]) => (
                      <li>
                        <a href={`#${h2.slugId}`}>{h2.title}</a> ({countItems(h2)})
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <hr />
        </div>
        <div class="qi-content">{renderTree(root, 1)}</div>
      </div>
    )
  }

  Questions.css = `
.questions-index .qi-toc ul { list-style: none; padding-left: 0; }
.questions-index .qi-toc ul ul { padding-left: 1.2rem; margin: 0.15rem 0 0.4rem; }
.questions-index .qi-toc li { margin: 0.1rem 0; }
.questions-index .qi-toc .qi-total { color: var(--gray); margin-top: -0.4rem; }
.questions-index .qi-toc hr { margin: 1.5rem 0; }
.questions-index .qi-content .qi-heading { scroll-margin-top: 2rem; }
.questions-index .qi-content .qi-item { margin: 0.6rem 0 1rem; }
.questions-index .qi-content .callout { margin-bottom: 0.25rem; }
.questions-index .qi-content .qi-source { font-size: 0.75rem; font-style: italic; color: var(--gray); margin-top: 0.25rem; }
.questions-index .qi-content .qi-source::before { content: "— from "; }
`

  return Questions
}
