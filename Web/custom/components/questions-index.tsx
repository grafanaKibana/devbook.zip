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

type HeadingTag = `h${1 | 2 | 3 | 4 | 5 | 6}`

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
        const Heading = `h${level}` as HeadingTag
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
          <div class="qi-grid">
            {topLevel.map(([, h1]) =>
              h1.children.size > 0 ? (
                <details class="qi-card">
                  <summary class="qi-card-head">
                    <span class="qi-card-title">{h1.title}</span>
                    <span class="qi-card-count">{countItems(h1)}</span>
                    <span class="qi-chevron" aria-hidden="true" />
                  </summary>
                  <div class="qi-chips">
                    <a class="qi-chip qi-chip-all" href={`#${h1.slugId}`}>
                      All
                    </a>
                    {sortedEntries(h1.children).map(([, h2]) => (
                      <a class="qi-chip" href={`#${h2.slugId}`}>
                        {h2.title}
                        <span class="qi-chip-n">{countItems(h2)}</span>
                      </a>
                    ))}
                  </div>
                </details>
              ) : (
                <div class="qi-card qi-card--flat">
                  <a class="qi-card-title" href={`#${h1.slugId}`}>
                    {h1.title}
                  </a>
                  <span class="qi-card-count">{countItems(h1)}</span>
                </div>
              ),
            )}
          </div>
          <hr />
        </div>
        <div class="qi-content">{renderTree(root, 1)}</div>
      </div>
    )
  }

  Questions.css = `
.questions-index .qi-toc .qi-total { color: var(--gray); margin-top: -0.4rem; }
.questions-index .qi-toc hr { margin: 1.5rem 0; }

/* Auto-fit card grid replacing the old nested <ul> ToC. */
.questions-index .qi-toc .qi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(clamp(180px, 22vw, 220px), 1fr));
  gap: clamp(0.5rem, 1.2vw, 0.85rem);
  align-items: start;
}

.questions-index .qi-toc .qi-card {
  border: 1px solid var(--lightgray);
  border-radius: var(--surface-radius);
  background: var(--light);
  padding: clamp(0.55rem, 1.2vw, 0.75rem);
}

.questions-index .qi-toc .qi-card--flat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.questions-index .qi-toc .qi-card--flat .qi-card-title {
  color: var(--dark);
  font-weight: 600;
  text-decoration: none;
}
.questions-index .qi-toc .qi-card--flat .qi-card-title:hover {
  color: var(--secondary);
}

.questions-index .qi-toc .qi-card-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  list-style: none;
}
.questions-index .qi-toc .qi-card-head::-webkit-details-marker {
  display: none;
}

.questions-index .qi-toc .qi-card-title {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 600;
  color: var(--dark);
}

.questions-index .qi-toc .qi-card-count {
  flex: 0 0 auto;
  font-size: 0.8rem;
  color: var(--gray);
  background: color-mix(in srgb, var(--gray) 12%, transparent);
  border-radius: 999px;
  padding: 0.05rem 0.5rem;
}

.questions-index .qi-toc .qi-chevron {
  flex: 0 0 auto;
  width: 0.5rem;
  height: 0.5rem;
  border-right: 2px solid var(--darkgray);
  border-bottom: 2px solid var(--darkgray);
  transform: rotate(45deg);
  transition: transform 0.15s ease;
  margin-right: 0.15rem;
}
.questions-index .qi-toc details[open] > .qi-card-head .qi-chevron {
  transform: rotate(-135deg);
}

.questions-index .qi-toc .qi-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.6rem;
}

.questions-index .qi-toc .qi-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--darkgray);
  text-decoration: none;
  background: color-mix(in srgb, var(--gray) 12%, transparent);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
}
.questions-index .qi-toc .qi-chip:hover {
  color: var(--secondary);
}

.questions-index .qi-toc .qi-chip-n {
  color: var(--gray);
  font-size: 0.75rem;
}

.questions-index .qi-toc .qi-card-head:focus-visible,
.questions-index .qi-toc .qi-card--flat .qi-card-title:focus-visible,
.questions-index .qi-toc .qi-chip:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 2px;
}

.questions-index .qi-content .qi-heading { scroll-margin-top: 2rem; }
.questions-index .qi-content .qi-item { margin: 0.6rem 0 1rem; }
.questions-index .qi-content .callout { margin-bottom: 0.25rem; }
.questions-index .qi-content .qi-source { font-size: 0.75rem; font-style: italic; color: var(--gray); margin-top: 0.25rem; }
.questions-index .qi-content .qi-source::before { content: "— from "; }
`

  // Fit controller (pattern: homepage-fit.tsx). The ToC ships collapsed by
  // default (SSR-safe, structurally short enough to fit any tablet+ viewport).
  // On tablet+ this expands every card and, only if the expanded ToC still
  // measures as fitting the first viewport, leaves it expanded; otherwise it
  // re-collapses (a no-op, since collapsed is the structural floor). Once a
  // user manually toggles any card, the controller stops touching `open`
  // state entirely (Amendment 2 — never clobber a manual choice).
  Questions.afterDOMLoaded = `
(function () {
  if (window.__devbookQuestionsFit) return;

  var fit = window.matchMedia("(min-width: 768px)");
  var frame = 0;
  var userDirty = false;
  var applying = false;

  function onToggle(e) {
    if (applying) return;
    userDirty = true;
  }

  function fits(toc) {
    var viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    var rect = toc.getBoundingClientRect();
    return rect.top + window.scrollY + toc.offsetHeight <= viewportHeight;
  }

  function chooseState() {
    frame = 0;
    var body = document.body;
    if (body.dataset.slug !== "questions") return;
    var toc = body.querySelector(".qi-toc .qi-grid");
    if (!toc) return;

    var cards = toc.querySelectorAll("details.qi-card");
    if (!cards.length) return;

    if (!fit.matches) {
      // A live drag-resize below the breakpoint (not a fresh mobile load, which
      // is already SSR-collapsed) can leave cards the controller previously
      // opened stuck open. Force them back to collapsed here too, unless the
      // user has manually taken over — never clobber a manual toggle.
      if (!userDirty) {
        applying = true;
        cards.forEach(function (c) { c.open = false; });
        setTimeout(function () { applying = false; }, 0);
      }
      return;
    }
    if (userDirty) return;

    applying = true;
    cards.forEach(function (c) { c.open = true; });
    // Force reflow so the expanded height is measured, not the pre-toggle one.
    void toc.offsetHeight;

    if (!fits(toc)) {
      cards.forEach(function (c) { c.open = false; });
    }
    // The "toggle" event fires as a queued task (not synchronously), so defer
    // clearing the flag past this turn of the event loop — otherwise the events
    // from our OWN mutations above would land after "applying" is already
    // false and get misread as a user edit.
    setTimeout(function () { applying = false; }, 0);
  }

  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(chooseState);
  }

  document.addEventListener("nav", function () {
    userDirty = false;
    schedule();
  });
  document.addEventListener("toggle", onToggle, true);
  window.addEventListener("resize", schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", schedule, { passive: true });
  }
  if (document.fonts) {
    document.fonts.ready.then(schedule);
  }

  if (typeof window.addCleanup === "function") {
    window.addCleanup(function () {
      document.removeEventListener("toggle", onToggle, true);
    });
  }

  window.__devbookQuestionsFit = { refresh: schedule };
  schedule();
})();
`

  return Questions
}
