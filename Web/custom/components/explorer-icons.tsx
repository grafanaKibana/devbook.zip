import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { lucideMap } from "../lib/lucide-icons"

// Explorer file-tree icons (issue #51).
//
// The community Explorer plugin (github:quartz-community/explorer) builds the
// file tree client-side from `<template>` clones and exposes no icon slot, and
// `.quartz/` is a gitignored plugin cache we must not edit. So instead of
// forking the plugin we decorate its rendered DOM from the sanctioned override
// surface: a component wired in quartz.ts that contributes `css` +
// `afterDOMLoaded` and inlines a small slug -> icon map for assigned icons.
//
// State is driven entirely by CSS, reusing the exact hooks the plugin already
// sets: `.folder-outer.open` (via `:has()`, mirroring the plugin's own chevron
// rule) for folders, and `a.nav-file-title.active` for the current note. The
// script's only job is to inject the (idempotent) icon markup once per node.
//
// Icons are Lucide (https://lucide.dev), matching the set the plugin itself
// ships. Defaults: folder = book -> book-open, note = file -> file-text. A note's
// assigned icon (frontmatter `icon:`, a Lucide name) overrides the default for
// that node; the topic folder-notes carry one (e.g. `code-2`), which Quartz
// Syncer publishes into content/. Every referenced icon is resolved from
// lucide-static at build time (see ../lib/lucide-icons) and inlined here as
// `.ec-icons`, alongside the slug -> icon-name map `.ec-icon-map` — so adding or
// changing a note's `icon:` just works, with no hard-coded icon list to update.

const DEFAULTS = {
  folderClosed: "book",
  folderOpen: "book-open",
  fileIdle: "file",
  fileActive: "file-text",
}

// Icons for pages that can't carry an `icon:` in their own frontmatter — Obsidian
// canvases are JSON, so their icons (assigned in Obsidian's notebook-navigator)
// are mirrored here by slug. Keyed by the emitted slug (canvas slugs keep the
// `.canvas` suffix). A note that *can* use frontmatter should use it instead.
const MANUAL_ICONS: Record<string, string> = {
  "roadmap.canvas": "map",
}

// Browser script. Reads the inlined slug -> icon map (`.ec-icon-map`) and
// decorates the Explorer's client-built tree. Idempotent; state is CSS-driven.
const script = `
(function () {
  const DEFAULTS = ${JSON.stringify(DEFAULTS)};

  // name -> inner-svg, inlined as .ec-icons by the component (from lucide-static).
  // Refreshed each decorate() so it tracks the current page's frontmatter icons.
  var ICONS = {};
  function readIcons() {
    const el = document.querySelector(".ec-icons");
    if (!el) return {};
    try {
      const m = JSON.parse(el.textContent || "{}");
      return m && typeof m === "object" ? m : {};
    } catch (e) {
      return {};
    }
  }

  function svg(name, cls) {
    const inner = ICONS[name];
    if (!inner) return "";
    return '<svg class="ec-svg ' + cls + '" xmlns="http://www.w3.org/2000/svg"' +
      ' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner + '</svg>';
  }

  // slug -> assigned icon name, inlined by the component from note frontmatter.
  function readMap() {
    const el = document.querySelector(".ec-icon-map");
    if (!el) return {};
    try {
      const m = JSON.parse(el.textContent || "{}");
      return m && typeof m === "object" ? m : {};
    } catch (e) {
      return {};
    }
  }

  function normalizeSlug(raw) {
    if (!raw) return "";
    let s = String(raw);
    // A folder's data-folderpath is already a root-relative slug (e.g.
    // "ai--and--ml/index"); only reduce genuinely rooted/absolute values (file
    // hrefs like "/questions") through URL(). Resolving a bare slug relative to
    // the current page would prefix it with the page dir and break the map join.
    if (/^[a-z]+:\\/\\//i.test(s) || s.charAt(0) === "/") {
      try { s = new URL(s, location.href).pathname; } catch (e) {}
    }
    return decodeURIComponent(s).replace(/^\\/+/, "").replace(/\\/+$/, "");
  }

  function pickAssigned(map, slug) {
    if (!slug) return null;
    const name = map[slug] || map[slug + "/index"] || map[slug.replace(/\\/index$/, "")] || null;
    return name && ICONS[name] ? name : null;
  }

  // slug -> topic colour (a CSS colour string), inlined by the component from the
  // topic folder-notes' \`color:\` frontmatter — the same value the scope selector
  // tints its chip with.
  function readColorMap() {
    const el = document.querySelector(".ec-color-map");
    if (!el) return {};
    try {
      const m = JSON.parse(el.textContent || "{}");
      return m && typeof m === "object" ? m : {};
    } catch (e) {
      return {};
    }
  }

  // The top-level <li> a node lives under (a direct child of .explorer-ul).
  function topLevelLi(el) {
    let li = el.closest("li");
    while (li) {
      const parent = li.parentElement;
      if (parent && parent.classList.contains("explorer-ul")) return li;
      li = parent ? parent.closest("li") : null;
    }
    return null;
  }

  // The topic tint for a node: the colour of its top-level topic folder, so a
  // whole subtree shares that topic's hue (matching the design, where each topic
  // folder's glyph carries its colour). Returns null to fall back to the accent.
  function topicColor(el, colorMap) {
    const top = topLevelLi(el);
    if (!top) return null;
    const fc = top.querySelector(":scope > .folder-container");
    if (!fc || fc.dataset.folderpath == null) return null;
    const slug = normalizeSlug(fc.dataset.folderpath);
    return (
      colorMap[slug] || colorMap[slug + "/index"] || colorMap[slug.replace(/\\/index$/, "")] || null
    );
  }

  function decorateFolders(explorer, map, colorMap) {
    explorer.querySelectorAll(".folder-container").forEach(function (c) {
      if (c.dataset.ec) return;
      c.dataset.ec = "1";
      const name = pickAssigned(map, normalizeSlug(c.dataset.folderpath));
      // An assigned icon is used for both states; otherwise book -> book-open.
      const closed = name || DEFAULTS.folderClosed;
      const open = name || DEFAULTS.folderOpen;
      const span = document.createElement("span");
      span.className = "ec-ico ec-folder-ico" + (name ? " ec-assigned" : "");
      span.innerHTML = svg(closed, "ec-folder-closed") + svg(open, "ec-folder-open");
      // Tint the glyph to its topic's colour (the design puts the accent on the
      // folder icon); nested folders inherit their top-level topic's hue.
      const color = topicColor(c, colorMap);
      if (color) span.style.setProperty("--ec-topic", color);
      const chevron = c.querySelector(".folder-icon");
      if (chevron && chevron.nextSibling) c.insertBefore(span, chevron.nextSibling);
      else if (chevron) c.appendChild(span);
      else c.insertBefore(span, c.firstChild);
    });
  }

  function decorateFiles(explorer, map, colorMap) {
    explorer.querySelectorAll("a.nav-file-title").forEach(function (a) {
      if (a.dataset.ec) return;
      a.dataset.ec = "1";
      const name = pickAssigned(map, normalizeSlug(a.getAttribute("href") || a.href));
      const idle = name || DEFAULTS.fileIdle;
      const active = name || DEFAULTS.fileActive;
      const span = document.createElement("span");
      span.className = "ec-ico ec-file-ico" + (name ? " ec-assigned" : "");
      span.innerHTML = svg(idle, "ec-file-idle") + svg(active, "ec-file-active");
      // Same subtree tint as the folder glyph, so a page under a topic carries
      // that topic's hue; root pages (Credits, Questions, Roadmap) have no topic
      // folder above them, so topicColor returns null and the icon falls back to
      // the accent.
      const color = topicColor(a, colorMap);
      if (color) span.style.setProperty("--ec-topic", color);
      a.insertBefore(span, a.firstChild);
    });
  }

  let busy = false;
  function decorate() {
    if (busy) return;
    busy = true;
    try {
      ICONS = readIcons();
      const explorers = document.querySelectorAll("div.explorer");
      if (!explorers.length) return;
      const map = readMap();
      const colorMap = readColorMap();
      explorers.forEach(function (ex) {
        decorateFolders(ex, map, colorMap);
        decorateFiles(ex, map, colorMap);
      });
    } finally {
      busy = false;
    }
  }

  // The tree is (re)built asynchronously on each nav; a MutationObserver on the
  // list is the reliable hook. Decoration is idempotent (data-ec guards), so the
  // observer firing on our own inserts simply finds nothing new and settles.
  function observe() {
    document.querySelectorAll(".explorer-ul").forEach(function (ul) {
      if (ul.dataset.ecObserved) return;
      ul.dataset.ecObserved = "1";
      const obs = new MutationObserver(function () { decorate(); });
      obs.observe(ul, { childList: true, subtree: true });
      if (typeof window !== "undefined" && window.addCleanup) {
        window.addCleanup(function () { obs.disconnect(); });
      }
    });
  }

  function run() { observe(); decorate(); }
  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  run();
})();
`

export const ExplorerIcons: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = ({ allFiles }: QuartzComponentProps) => {
    // Inline a slug -> icon-name map and a name -> inner-svg map, both built from
    // frontmatter. Every referenced icon (plus the folder/file defaults) is
    // resolved from lucide-static, so any `icon:` a note uses renders; unresolved
    // names are absent and the browser script falls back to the default icon.
    // Also inline a slug -> topic-colour map from the topic folder-notes' `color:`
    // frontmatter, so the browser script can tint each folder glyph to its topic's
    // hue (the same colour the scope selector uses).
    const iconNames = new Set<string>(Object.values(DEFAULTS))
    const map: Record<string, string> = {}
    const colorMap: Record<string, string> = {}
    for (const file of allFiles ?? []) {
      const fm = file?.frontmatter as { icon?: unknown; color?: unknown } | undefined
      const slug = file?.slug
      if (typeof slug !== "string") continue
      const name = fm?.icon
      if (typeof name === "string") {
        map[slug] = name
        iconNames.add(name)
      }
      const color = fm?.color
      if (typeof color === "string" && color.trim() !== "") {
        colorMap[slug] = color
      }
    }
    // Fold in the manual icons for frontmatter-less pages (e.g. canvases), unless
    // the note already declared one itself.
    for (const [slug, name] of Object.entries(MANUAL_ICONS)) {
      if (!map[slug]) {
        map[slug] = name
        iconNames.add(name)
      }
    }
    const icons = lucideMap(iconNames)

    return (
      <>
        <script
          type="application/json"
          class="ec-icon-map"
          // JSON is inert data (never executed); keys/values are slugs/icon names.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(map) }}
        />
        <script
          type="application/json"
          class="ec-color-map"
          // JSON is inert data (never executed); keys/values are slugs/topic colours.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(colorMap) }}
        />
        <script
          type="application/json"
          class="ec-icons"
          // name -> inner-svg for every icon the tree might render.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(icons) }}
        />
      </>
    )
  }

  Component.afterDOMLoaded = script

  Component.css = `
.explorer .ec-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 0.4em;
  vertical-align: -0.18em;
}
.explorer .ec-svg {
  width: 15px;
  height: 15px;
}

/* Folder — book (collapsed) -> book-open (expanded). Reuses the plugin's own
   open-state hook (.folder-outer.open) via :has(), matching how it rotates the
   collapse chevron. An assigned icon (.ec-assigned) is the same in both states. */
.explorer .ec-folder-ico {
  color: var(--ec-topic, var(--secondary));
}
.explorer .ec-folder-open {
  display: none;
}
.explorer .ec-folder-closed {
  display: inline;
}
.explorer li:has(> .folder-outer.open) > .folder-container .ec-folder-closed {
  display: none;
}
.explorer li:has(> .folder-outer.open) > .folder-container .ec-folder-open {
  display: inline;
}

/* Note — file (inactive) -> file-text (active/current page). Icon lives inside
   the anchor, so it inherits the link's colour and the plugin's active styling
   for free. */
.explorer .nav-file-title .ec-file-active {
  display: none;
}
.explorer .nav-file-title .ec-file-idle {
  display: inline;
}
.explorer .nav-file-title.active .ec-file-idle,
.explorer .nav-file-title.is-active .ec-file-idle {
  display: none;
}
.explorer .nav-file-title.active .ec-file-active,
.explorer .nav-file-title.is-active .ec-file-active {
  display: inline;
}
`

  return Component
}
