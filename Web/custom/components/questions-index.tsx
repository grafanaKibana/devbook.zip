/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { resolveRelative, htmlToJsx, type FullSlug } from "@quartz-community/utils"
import type { Element, Root as HastRoot } from "hast"

// Questions reader: collected callouts, folder metadata, and one selected scope.
// The callouts and source links remain server-rendered; the client narrows them.

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
  path: string
  slugId: string
  children: Map<string, TreeNode>
  items: Item[]
  // Explorer/dashboard position from the folder note's frontmatter `order:`;
  // nodes without one sort after ordered ones, alphabetically.
  order?: number
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

const newNode = (title: string, path: string, order?: number): TreeNode => ({
  title,
  path,
  slugId: toId(path),
  children: new Map(),
  items: [],
  order,
})

const countItems = (node: TreeNode): number => {
  let n = node.items.length
  for (const c of node.children.values()) n += countItems(c)
  return n
}

// Frontmatter `order` first (the Explorer/home-dashboard ordering), then
// alphabetical for anything without one, in both controls and question sections.
const sortedEntries = (m: Map<string, TreeNode>): [string, TreeNode][] =>
  [...m.entries()].sort((a, b) => {
    const ao = a[1].order ?? Number.MAX_SAFE_INTEGER
    const bo = b[1].order ?? Number.MAX_SAFE_INTEGER
    return ao - bo || a[0].localeCompare(b[0], undefined, { numeric: true })
  })

export const QuestionsIndex: QuartzComponentConstructor = () => {
  const Questions: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
    if (fileData.slug !== QUESTIONS_SLUG) return null

    const folderMeta = new Map<string, { title?: string; order?: number; isTopic: boolean }>()
    for (const f of allFiles) {
      const slug = f.slug ?? ""
      if (slug.endsWith("/index")) {
        const folderSlug = slug.slice(0, -"/index".length)
        const fm = f.frontmatter as
          | {
              title?: string
              order?: number | string
              tags?: string[]
            }
          | undefined
        const order =
          fm?.order != null && !Number.isNaN(Number(fm.order)) ? Number(fm.order) : undefined
        const tags = (fm?.tags ?? []).map((tag) => tag.replace(/^#/, "").toLowerCase())
        folderMeta.set(folderSlug, {
          title: fm?.title,
          order,
          isTopic: tags.includes("foldernote") && !tags.includes("metricsignore"),
        })
      }
    }

    const root = newNode("", "")
    for (const [path, meta] of folderMeta) {
      if (path.includes("/") || !meta.isTopic) continue
      root.children.set(
        path,
        newNode(meta.title ? stripPrefix(meta.title) : prettify(path), path, meta.order),
      )
    }
    for (const f of allFiles) {
      const callouts = (f as { questionCallouts?: { node: Element }[] }).questionCallouts
      const slug = (f.slug ?? "") as string
      if (!callouts?.length || !slug || slug === QUESTIONS_SLUG) continue

      const segments = slug.split("/").filter(Boolean)
      const folderSegs = segments.slice(0, -1)
      if (!folderSegs.length) folderSegs.push("other")

      let node = root
      let acc = ""
      for (const seg of folderSegs) {
        acc = acc ? `${acc}/${seg}` : seg
        if (!node.children.has(seg)) {
          const meta = folderMeta.get(acc)
          const title = meta?.title ? stripPrefix(meta.title) : prettify(seg)
          node.children.set(seg, newNode(title, acc, meta?.order))
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

    const renderOptions = (node: TreeNode, trail: string[]): any[] => [
      <option
        value={node.path}
        data-qi-anchor={node.slugId}
        data-qi-title={node.title}
        data-qi-trail={trail.join(" / ")}
        data-qi-count={countItems(node)}
      >
        {trail.length === 1 ? `All ${node.title}` : trail.slice(1).join(" / ")}
        {` (${countItems(node)})`}
      </option>,
      ...sortedEntries(node.children).flatMap(([, child]) =>
        renderOptions(child, [...trail, child.title]),
      ),
    ]

    const renderSections = (node: TreeNode, trail: string[]): any[] => [
      <section id={node.slugId} class="qi-section" data-qi-path={node.path}>
        {node.items.length > 0 && trail.length > 1 && (
          <h3 class="qi-section-title">{trail.slice(1).join(" / ")}</h3>
        )}
        {node.items.map(renderCallout)}
      </section>,
      ...sortedEntries(node.children).flatMap(([, child]) =>
        renderSections(child, [...trail, child.title]),
      ),
    ]

    const topics = sortedEntries(root.children)
    return (
      <div class="questions-index">
        <p class="qi-total">{total} questions</p>
        <div class="qi-tabs" />
        <div class="qi-content">
          {topics.length === 0 && <p>No questions found.</p>}
          {topics.map(([, topic]) => (
            <section
              id={`qi-panel-${topic.slugId}`}
              class="qi-topic-panel"
              data-qi-topic={topic.path}
              data-qi-label={topic.title}
              data-qi-count={countItems(topic)}
              aria-labelledby={`qi-title-${topic.slugId}`}
            >
              <div class="qi-scope-control" hidden>
                <label for={`qi-scope-${topic.slugId}`}>Subtopic</label>
                <select
                  id={`qi-scope-${topic.slugId}`}
                  aria-controls={`qi-results-${topic.slugId}`}
                >
                  {renderOptions(topic, [topic.title])}
                </select>
              </div>
              <div class="qi-results-head">
                <h2 id={`qi-title-${topic.slugId}`} class="qi-title">
                  {topic.title}
                </h2>
                <span class="qi-scope-count" aria-live="polite">
                  {countItems(topic)} questions
                </span>
              </div>
              <p class="qi-path" hidden />
              <div id={`qi-results-${topic.slugId}`}>
                {countItems(topic) === 0 && <p>No questions in this topic yet.</p>}
                {renderSections(topic, [topic.title])}
              </div>
            </section>
          ))}
        </div>
      </div>
    )
  }

  Questions.css = `
.questions-index { container-type: inline-size; }
.questions-index [hidden] { display: none !important; }
.questions-index .qi-total { color: var(--darkgray); margin: 0 0 1rem; font-size: 0.85rem; }
.questions-index .qi-scope-control { display: grid; grid-template-columns: 5rem minmax(0, 1fr); align-items: center; gap: 0.75rem; padding: 1rem 0; border-block: 1px solid var(--lightgray); margin-bottom: 1.5rem; }
.questions-index .qi-scope-control label { color: var(--darkgray); font-size: 0.85rem; }
.questions-index .qi-scope-control select { width: 100%; min-width: 0; max-width: 100%; min-height: 2.75rem; padding: 0.5rem; border: 1px solid var(--lightgray); border-radius: 0.3rem; background: var(--light); color: var(--dark); font: inherit; font-size: 0.9rem; }
.questions-index .qi-results-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
.questions-index .qi-title { margin: 0; font-size: 1.3rem; }
.questions-index .qi-scope-count { color: var(--darkgray); font-size: 0.8rem; }
.questions-index .qi-path { margin: 0.5rem 0 1rem; color: var(--darkgray); font-size: 0.85rem; overflow-wrap: anywhere; }
.questions-index .qi-section { scroll-margin-top: 2rem; }
.questions-index .qi-section-title { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
.questions-index .qi-item { padding-bottom: 0.75rem; }
.questions-index .qi-item:has(+ .qi-item) { border-bottom: 1px solid var(--lightgray); }
.questions-index .qi-source { padding: 0 0.5rem; font-size: 0.8rem; font-style: italic; color: var(--darkgray); }
.questions-index .qi-source::before { content: "— from "; }
.questions-index a.internal { padding-block: 0.1rem; }
.questions-index .qi-source a.internal { padding-inline: 0.35rem; }
@container (max-width: 510px) {
  .questions-index .qi-scope-control { grid-template-columns: minmax(0, 1fr); gap: 0.375rem; }
}
`

  Questions.afterDOMLoaded = `
(function () {
  function setup() {
    var root = document.querySelector(".questions-index");
    if (!root || root.dataset.qiReady || !window.tabsdown) return;
    root.dataset.qiReady = "true";
    var panels = Array.from(root.querySelectorAll(".qi-topic-panel"));
    var tabsHost = root.querySelector(".qi-tabs");
    if (!panels.length || !tabsHost) return;
    root.querySelectorAll(".qi-scope-control").forEach(function (control) { control.hidden = false; });
    var controller;

    function choose(panel, path, updateHash) {
      var select = panel.querySelector("select");
      var option = Array.from(select.options).find(function (item) { return item.value === path; }) || select.options[0];
      select.value = option.value;
      panel.querySelectorAll(".qi-section").forEach(function (section) {
        var folder = section.dataset.qiPath;
        section.hidden = folder !== option.value && !folder.startsWith(option.value + "/");
      });
      panel.querySelector(".qi-title").textContent = option.dataset.qiTitle;
      var count = Number(option.dataset.qiCount);
      panel.querySelector(".qi-scope-count").textContent = count + (count === 1 ? " question" : " questions");
      var breadcrumb = panel.querySelector(".qi-path");
      breadcrumb.textContent = option.dataset.qiTrail;
      breadcrumb.hidden = option.value === panel.dataset.qiTopic;
      if (updateHash) history.replaceState(history.state, "", "#" + option.dataset.qiAnchor);
    }

    function fromHash() {
      var anchor;
      try { anchor = decodeURIComponent(location.hash.slice(1)); } catch (_) { return null; }
      var option = Array.from(root.querySelectorAll("option")).find(function (item) { return item.dataset.qiAnchor === anchor; });
      if (!option) return null;
      var panel = option.closest(".qi-topic-panel");
      if (controller) controller.setSelection(panel.dataset.qiTopic);
      choose(panel, option.value, false);
      return panel;
    }
    function change(event) {
      if (event.target.tagName !== "SELECT") return;
      var panel = event.target.closest(".qi-topic-panel");
      if (panel) choose(panel, event.target.value, true);
    }
    var initialPanel = fromHash();
    if (!initialPanel) {
      initialPanel = panels[0];
      choose(initialPanel, initialPanel.dataset.qiTopic, false);
    }
    controller = window.tabsdown.mountTabs(tabsHost, {
      label: "Question topics",
      tabs: panels.map(function (panel) {
        return {
          id: panel.dataset.qiTopic,
          label: panel.dataset.qiLabel + " (" + panel.dataset.qiCount + ")",
          panel: panel,
        };
      }),
      selection: initialPanel.dataset.qiTopic,
      onSelectionChange: function (selection, previous) {
        if (selection === null) {
          if (previous !== null) controller.setSelection(previous);
          return;
        }
        var panel = panels.find(function (item) { return item.dataset.qiTopic === selection; });
        if (panel) choose(panel, panel.dataset.qiTopic, true);
      },
    });
    root.addEventListener("change", change);
    window.addEventListener("hashchange", fromHash);
    window.addCleanup(function () {
      root.removeEventListener("change", change);
      window.removeEventListener("hashchange", fromHash);
      controller.destroy();
      delete root.dataset.qiReady;
    });
  }
  document.addEventListener("nav", setup);
})();
`
  return Questions
}
