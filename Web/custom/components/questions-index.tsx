import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { resolveRelative, htmlToJsx, type FullSlug } from "@quartz-community/utils"
import type { Element, Root as HastRoot } from "hast"
import { lucideInner } from "../lib/lucide-icons"

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
  // "R, G, B" for --card-accent/--topic-rgb — the home dashboard's accent
  // recipe, from the folder note's frontmatter `color:` (hex). Falls back to a
  // neutral gray when the folder carries no color.
  accent: string
  // Lucide kebab-case icon name from the folder note's frontmatter `icon:`.
  icon?: string
  // Explorer/dashboard position from the folder note's frontmatter `order:`;
  // nodes without one sort after ordered ones, alphabetically.
  order?: number
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

const DEFAULT_ACCENT = "125, 125, 125"

// Hex (3 or 6 digit, with or without "#") -> "R, G, B", matching the home
// dashboard's --card-accent/--topic-rgb convention. Falls back to a neutral
// gray for a missing or malformed value.
const hexToRgb = (hex: string | undefined): string => {
  if (!hex) return DEFAULT_ACCENT
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return DEFAULT_ACCENT
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1]
  const n = parseInt(h, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

const newNode = (
  title: string,
  slugId: string,
  accent: string,
  icon?: string,
  order?: number,
): TreeNode => ({
  title,
  slugId,
  children: new Map(),
  items: [],
  accent,
  icon,
  order,
})

const countItems = (node: TreeNode): number => {
  let n = node.items.length
  for (const c of node.children.values()) n += countItems(c)
  return n
}

// Frontmatter `order` first (the Explorer/home-dashboard ordering), then
// alphabetical for anything without one — used for both the ToC cards and the
// question sections below them, so the two always agree.
const sortedEntries = (m: Map<string, TreeNode>): [string, TreeNode][] =>
  [...m.entries()].sort((a, b) => {
    const ao = a[1].order ?? Number.MAX_SAFE_INTEGER
    const bo = b[1].order ?? Number.MAX_SAFE_INTEGER
    return ao - bo || a[0].localeCompare(b[0], undefined, { numeric: true })
  })

// Build-time icon chip: resolves a Lucide name to its inner SVG shapes (Node
// build only, via lucide-static — see ../lib/lucide-icons) and inlines it
// directly into the server-rendered markup, matching the wrapper attributes
// the Explorer/nav components use for their client-inlined icons.
const iconChip = (icon: string | undefined) => {
  if (!icon) return null
  const inner = lucideInner(icon)
  if (!inner) return null
  return (
    <span class="qi-card-chip">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    </span>
  )
}

export const QuestionsIndex: QuartzComponentConstructor = () => {
  const Questions: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
    if (fileData.slug !== QUESTIONS_SLUG) return null

    const folderMeta = new Map<
      string,
      { title?: string; color?: string; icon?: string; order?: number }
    >()
    for (const f of allFiles) {
      const slug = f.slug ?? ""
      if (slug.endsWith("/index")) {
        const folderSlug = slug.slice(0, -"/index".length)
        const fm = f.frontmatter as
          | { title?: string; color?: string; icon?: string; order?: number | string }
          | undefined
        const order =
          fm?.order != null && !Number.isNaN(Number(fm.order)) ? Number(fm.order) : undefined
        if (fm?.title || fm?.color || fm?.icon || order != null) {
          folderMeta.set(folderSlug, { title: fm?.title, color: fm?.color, icon: fm?.icon, order })
        }
      }
    }

    const root = newNode("", "", DEFAULT_ACCENT)
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
          const meta = folderMeta.get(acc)
          const title = meta?.title ? stripPrefix(meta.title) : prettify(seg)
          node.children.set(
            seg,
            newNode(title, toId(acc), hexToRgb(meta?.color), meta?.icon, meta?.order),
          )
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

    // Two fixed, independent columns (masonry): opening a card pushes down
    // only the cards beneath it in its own column — the other column never
    // moves or stretches. The split is sequential, so the frontmatter order
    // reads down the left column then the right, and stacks in exact order
    // when the columns collapse to one on narrow screens.
    const splitAt = Math.ceil(topLevel.length / 2)
    const columns = [topLevel.slice(0, splitAt), topLevel.slice(splitAt)]

    const renderCard = ([, h1]: [string, TreeNode]) => {
      const style = `--card-accent: ${h1.accent}; --topic-rgb: ${h1.accent};`
      return (
        <details class="qi-card" style={style}>
          <summary class="qi-card-head">
            {iconChip(h1.icon)}
            <span class="qi-card-title">{h1.title}</span>
            <span class="qi-card-count">{countItems(h1)}</span>
            <span class="qi-chevron" aria-hidden="true" />
          </summary>
          <div
            class="qi-chips"
            style={`--qi-chip-basis: calc((100% - ${Math.ceil((h1.children.size + 1) / 2) - 1} * 0.3rem) / ${Math.ceil((h1.children.size + 1) / 2)});`}
          >
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
      )
    }

    return (
      <div class="questions-index">
        <div class="qi-toc">
          <p class="qi-total">Total questions: {total}</p>
          <div class="qi-grid">
            {columns.map((col) => (
              <div class="qi-col">{col.map(renderCard)}</div>
            ))}
          </div>
          <hr />
        </div>
        <div class="qi-content">{renderTree(root, 1)}</div>
      </div>
    )
  }

  Questions.css = `
.questions-index .qi-toc .qi-total { color: var(--gray); margin-top: 0; }
.questions-index .qi-toc hr { margin: 1.5rem 0; }

/* Two independent masonry columns: each is its own flex stack, so opening a
   card only pushes down the cards beneath it in that column. Cards are
   content-height (no row stretching, no interior dead space by construction). */
.questions-index .qi-toc .qi-grid {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}
.questions-index .qi-toc .qi-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (max-width: 430px) {
  .questions-index .qi-toc .qi-grid {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Card chrome — the home dashboard's .db-card recipe, replicated under our own
   class names (never referencing .db-card so the two stay independently
   themeable), scoped under .qi-toc. */
.questions-index .qi-toc .qi-card {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--background-modifier-border, var(--lightgray));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--light);
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.questions-index .qi-toc .qi-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.questions-index .qi-toc .qi-card:hover,
.questions-index .qi-toc .qi-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--light));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.questions-index .qi-toc .qi-card:hover::before,
.questions-index .qi-toc .qi-card:focus-within::before {
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .questions-index .qi-toc .qi-card,
  .questions-index .qi-toc .qi-card::before {
    transition: none;
  }
  .questions-index .qi-toc .qi-card:hover,
  .questions-index .qi-toc .qi-card:focus-within {
    transform: none;
  }
}

.questions-index .qi-toc .qi-card-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  list-style: none;
}
.questions-index .qi-toc .qi-card-head::-webkit-details-marker {
  display: none;
}

.questions-index .qi-toc .qi-card-chip {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  background: rgba(var(--topic-rgb, 125, 125, 125), 0.13);
  color: rgb(var(--topic-rgb, 125, 125, 125));
}
.questions-index .qi-toc .qi-card-chip svg {
  display: block;
  width: 1.3rem;
  height: 1.3rem;
}

.questions-index .qi-toc .qi-card-title {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 700;
  font-size: 1.04rem;
  color: var(--dark);
  overflow-wrap: break-word;
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

/* Pills follow the skill-tags pattern: each card renders them in exactly two
   rows (one for a lone pill) of equal-width tiles — the per-card column count
   ceil(n/2) is baked into --qi-chip-basis at build time. Cards are
   content-height in the masonry columns, so the tiles ARE the card body. */
.questions-index .qi-toc .qi-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-content: flex-start;
  min-height: 0;
  margin-top: 0.85rem;
  opacity: 0;
  transform: translateY(-0.25rem);
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.02, 0.01, 0.47, 1);
}
.questions-index .qi-toc details.qi-card[open] .qi-chips {
  opacity: 1;
  transform: none;
}
/* Animated expand/collapse using the site's own fold technique (see the
   callout fold in callouts.scss): the details' content wrapper
   (::details-content) is a grid whose single row animates 0fr <-> 1fr with
   the same easing curve, sliding the pills open and pushing the cards
   beneath (same column only) down in one motion; content-visibility with
   allow-discrete keeps the pills rendered through the closing animation.
   Browsers without ::details-content simply toggle instantly. */
.questions-index .qi-toc details.qi-card::details-content {
  display: grid;
  grid-template-rows: 0fr;
  overflow: clip;
  transition:
    grid-template-rows 0.2s cubic-bezier(0.02, 0.01, 0.47, 1),
    content-visibility 0.2s allow-discrete;
}
.questions-index .qi-toc details.qi-card[open]::details-content {
  grid-template-rows: 1fr;
}
@media (prefers-reduced-motion: reduce) {
  .questions-index .qi-toc details.qi-card::details-content,
  .questions-index .qi-toc .qi-chips {
    transition: none;
  }
}

.questions-index .qi-toc .qi-chip {
  /* Equal-width tiles at the card's computed column count; box-sizing keeps
     padding inside the basis so pairs actually fit a row, and the 6.5rem
     floor drops a too-narrow card to fewer columns instead of cramming long
     labels into slivers. */
  box-sizing: border-box;
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: max(var(--qi-chip-basis, calc(50% - 0.3rem)), 6.5rem);
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.3rem;
  max-width: 100%;
  /* Comfortable tile height, with a constant corner radius regardless of
     size (no capsule ballooning). */
  min-height: 1.8rem;
  font-size: 0.8rem;
  color: var(--darkgray);
  text-decoration: none;
  background: rgba(var(--topic-rgb, 125, 125, 125), 0.1);
  border-radius: 0.7rem;
  padding: 0.2rem 0.6rem;
}
.questions-index .qi-toc .qi-chip:hover {
  background: rgba(var(--topic-rgb, 125, 125, 125), 0.18);
}

.questions-index .qi-toc .qi-chip-n {
  color: var(--gray);
  font-size: 0.75rem;
}

.questions-index .qi-toc .qi-card-head:focus-visible,
.questions-index .qi-toc .qi-chip:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: 2px;
}

/* Tablet+ non-collapsible affordance (user decision: "Always-visible pills,
   home mosaic"): once the fit controller confirms the expanded ToC fits
   (data-qi-state="expanded"), the card reads as a static home card — hide the
   chevron and make the summary inert (the "All" pill remains the topic jump
   link). Below 768px, and in the short-viewport "collapsed" fallback, it
   stays the interactive mobile accordion exactly as before. */
@media (min-width: 768px) {
  .questions-index .qi-toc .qi-grid[data-qi-state="expanded"] .qi-chevron {
    display: none;
  }
  .questions-index .qi-toc .qi-grid[data-qi-state="expanded"] .qi-card-head {
    pointer-events: none;
  }
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
  // measures as fitting the first viewport, leaves it expanded (and marks the
  // grid data-qi-state="expanded" so CSS can present it as a static home-style
  // mosaic — see the [data-qi-state="expanded"] rules above); otherwise it
  // re-collapses (a no-op, since collapsed is the structural floor) and marks
  // data-qi-state="collapsed", keeping the interactive mobile accordion. Once
  // a user manually toggles any card, the controller stops touching `open`
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
    var card = e.target;
    if (!card || card.tagName !== "DETAILS" || !card.classList || !card.classList.contains("qi-card")) return;
    // The masonry columns are independent, so a manual open only pushes down
    // that column — no sibling coordination needed; just stop the controller
    // from ever clobbering the user's choice.
    userDirty = true;
  }

  function fits(toc) {
    // "Fits" means the expanded mosaic itself occupies at most one screen
    // (issue #72's constraint), not that it squeezes into the first viewport
    // below the page title — the reader scrolls past the H1 and then sees the
    // whole ToC at once. Small margin so it never lands exactly flush.
    var viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    return toc.offsetHeight <= viewportHeight - 32;
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
        toc.dataset.qiState = "collapsed";
        setTimeout(function () { applying = false; }, 0);
      }
      return;
    }
    if (userDirty) return;

    applying = true;
    cards.forEach(function (c) { c.open = true; });
    // Force reflow so the expanded height is measured, not the pre-toggle one.
    void toc.offsetHeight;

    if (fits(toc)) {
      toc.dataset.qiState = "expanded";
    } else {
      cards.forEach(function (c) { c.open = false; });
      toc.dataset.qiState = "collapsed";
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
  // Deliberately NOT re-deciding on plain window/visualViewport resizes:
  // browser-chrome and scrollbar changes fire them constantly, and a
  // borderline fit re-measured mid-session would collapse cards out from
  // under the reader (e.g. right after following a pill's anchor). The
  // state is chosen at load and navigation; live resizes only matter when
  // they cross the mobile breakpoint, which the media query itself reports.
  if (typeof fit.addEventListener === "function") {
    fit.addEventListener("change", schedule);
  } else if (typeof fit.addListener === "function") {
    fit.addListener(schedule);
  }
  if (document.fonts) {
    document.fonts.ready.then(schedule);
  }

  // No addCleanup here: Quartz runs cleanup callbacks on EVERY SPA nav, but
  // this script is a one-shot singleton (guarded above) that never re-runs —
  // a cleanup would strip the toggle listener on the first navigation and
  // nothing would ever re-register it. The listener is document-level,
  // registered exactly once, and gates on .qi-card, so it is safe to keep
  // for the lifetime of the tab.
  window.__devbookQuestionsFit = { refresh: schedule };
  schedule();
})();
`

  return Questions
}
