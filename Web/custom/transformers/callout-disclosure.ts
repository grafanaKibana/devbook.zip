import { visit } from "unist-util-visit"
import type { Root, Element } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Gives foldable callouts (`> [!TYPE]-` / `+`) disclosure semantics. The
// obsidian-flavored-markdown plugin renders the fold as a plain <div> title with
// a click-only listener, so keyboard and screen-reader users can neither reach
// nor operate it. The title becomes a focusable button that reports its state,
// and the folded body goes inert so its links leave the tab order while hidden.
//
// Spliced directly after ObsidianFlavoredMarkdown in quartz.ts: the callout
// title only exists as hast once that plugin's rehype-raw pass has run, and
// QuestionCollector (appended later) clones the callouts with these attributes.

const classList = (el: Element): string[] => {
  const c = el.properties?.className
  if (Array.isArray(c)) return c.map(String)
  if (typeof c === "string") return c.split(/\s+/)
  return []
}

const childWithClass = (el: Element, cls: string): Element | undefined =>
  el.children.find(
    (child): child is Element => child.type === "element" && classList(child).includes(cls),
  )

// Quartz emits this afterDOMReady script as a data-persist file, so it runs once
// per session; the delegated document listeners cover callouts that arrive by
// SPA navigation, popovers, and the Questions index alike.
const script = `
(function () {
  if (window.__devbookCalloutDisclosure) return;
  window.__devbookCalloutDisclosure = true;

  var TITLE = ".callout.is-collapsible > .callout-title";

  // Bubbles to the document after the plugin's own listener on the title has
  // toggled .is-collapsed, so it mirrors the settled state.
  function sync(title) {
    var callout = title.parentElement;
    var collapsed = callout.classList.contains("is-collapsed");
    title.setAttribute("aria-expanded", collapsed ? "false" : "true");
    var content = callout.querySelector(":scope > .callout-content");
    if (content) content.inert = collapsed;
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    var title = t && t.closest ? t.closest(TITLE) : null;
    if (title) sync(title);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    var t = e.target;
    if (!t || !t.matches || !t.matches(TITLE)) return;
    e.preventDefault();
    if (!e.repeat) t.click();
  });
})();
`

export const CalloutDisclosure: QuartzTransformerPlugin = () => ({
  name: "CalloutDisclosure",
  htmlPlugins() {
    return [
      () => (tree: Root) => {
        visit(tree, "element", (node: Element) => {
          if (node.tagName !== "blockquote") return
          const classes = classList(node)
          if (!classes.includes("callout") || !classes.includes("is-collapsible")) return
          const title = childWithClass(node, "callout-title")
          if (!title) return
          const collapsed = classes.includes("is-collapsed")
          title.properties.role = "button"
          title.properties.tabIndex = 0
          title.properties.ariaExpanded = collapsed ? "false" : "true"
          const content = childWithClass(node, "callout-content")
          if (content && collapsed) content.properties.inert = true
        })
      },
    ]
  },
  externalResources() {
    return {
      js: [{ loadTime: "afterDOMReady", contentType: "inline", script }],
    }
  },
})
