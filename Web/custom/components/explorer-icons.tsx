import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"

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
// Syncer publishes into content/ and which is inlined here per page as
// `.ec-icon-map`.

// Lucide inner markup (paths only), rendered inside a shared <svg> wrapper.
const ICONS: Record<string, string> = {
  // --- defaults ---
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>',
  "book-open":
    '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  "file-text":
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  // --- assigned icons: the topic folder-notes' frontmatter `icon:` values.
  //     Markup lifted verbatim from the homepage Topics dashboard so the tree
  //     matches the cards exactly. Add more here as notes gain icons. ---
  "code-2": '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  "flask-round": '<path d="M10 2v6.292a7 7 0 1 0 4 0V2"/><path d="M5 15h14"/><path d="M8.5 2h7"/>',
  database:
    '<ellipse ry="3" rx="9" cy="5" cx="12"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
  network:
    '<rect rx="1" height="6" width="6" y="16" x="16"/><rect rx="1" height="6" width="6" y="16" x="2"/><rect rx="1" height="6" width="6" y="2" x="9"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  "building-2":
    '<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
  "ruler-dimension-line":
    '<path d="M10 15v-3"/><path d="M14 15v-3"/><path d="M18 15v-3"/><path d="M2 8V4"/><path d="M22 6H2"/><path d="M22 8V4"/><path d="M6 15v-3"/><rect rx="2" height="8" width="20" y="12" x="2"/>',
  "brain-circuit":
    '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M9 13a4.5 4.5 0 0 0 3-4"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8"/><path d="M16 8V5a2 2 0 0 1 2-2"/><circle r=".5" cy="13" cx="16"/><circle r=".5" cy="3" cx="18"/><circle r=".5" cy="21" cx="20"/><circle r=".5" cy="8" cx="20"/>',
  lock: '<rect ry="2" rx="2" y="11" x="3" height="11" width="18"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  skull:
    '<path d="m12.5 17-.5-1-.5 1h1z"/><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><circle r="1" cy="12" cx="15"/><circle r="1" cy="12" cx="9"/>',
  "area-chart":
    '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 11.207a.5.5 0 0 1 .146-.353l2-2a.5.5 0 0 1 .708 0l3.292 3.292a.5.5 0 0 0 .708 0l4.292-4.292a.5.5 0 0 1 .854.353V16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/>',
}

const DEFAULTS = {
  folderClosed: "book",
  folderOpen: "book-open",
  fileIdle: "file",
  fileActive: "file-text",
}

// Browser script. Reads the inlined slug -> icon map (`.ec-icon-map`) and
// decorates the Explorer's client-built tree. Idempotent; state is CSS-driven.
const script = `
(function () {
  const ICONS = ${JSON.stringify(ICONS)};
  const DEFAULTS = ${JSON.stringify(DEFAULTS)};

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
    let s = raw;
    try { s = new URL(raw, location.href).pathname; } catch (e) {}
    return decodeURIComponent(s).replace(/^\\/+/, "").replace(/\\/+$/, "");
  }

  function pickAssigned(map, slug) {
    if (!slug) return null;
    const name = map[slug] || map[slug + "/index"] || map[slug.replace(/\\/index$/, "")] || null;
    return name && ICONS[name] ? name : null;
  }

  function decorateFolders(explorer, map) {
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
      const chevron = c.querySelector(".folder-icon");
      if (chevron && chevron.nextSibling) c.insertBefore(span, chevron.nextSibling);
      else if (chevron) c.appendChild(span);
      else c.insertBefore(span, c.firstChild);
    });
  }

  function decorateFiles(explorer, map) {
    explorer.querySelectorAll("a.nav-file-title").forEach(function (a) {
      if (a.dataset.ec) return;
      a.dataset.ec = "1";
      const name = pickAssigned(map, normalizeSlug(a.getAttribute("href") || a.href));
      const idle = name || DEFAULTS.fileIdle;
      const active = name || DEFAULTS.fileActive;
      const span = document.createElement("span");
      span.className = "ec-ico ec-file-ico" + (name ? " ec-assigned" : "");
      span.innerHTML = svg(idle, "ec-file-idle") + svg(active, "ec-file-active");
      a.insertBefore(span, a.firstChild);
    });
  }

  let busy = false;
  function decorate() {
    if (busy) return;
    busy = true;
    try {
      const explorers = document.querySelectorAll("div.explorer");
      if (!explorers.length) return;
      const map = readMap();
      explorers.forEach(function (ex) {
        decorateFolders(ex, map);
        decorateFiles(ex, map);
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
    // Inline the slug -> icon map so the browser script can render assigned
    // icons with no extra fetch. Only known (registry-backed) icons are emitted.
    const map: Record<string, string> = {}
    for (const file of allFiles ?? []) {
      const name = (file?.frontmatter as { icon?: unknown } | undefined)?.icon
      const slug = file?.slug
      if (typeof name === "string" && typeof slug === "string" && name in ICONS) {
        map[slug] = name
      }
    }

    return (
      <script
        type="application/json"
        class="ec-icon-map"
        // JSON is inert data (never executed); keys/values are slugs/icon names.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(map) }}
      />
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
  color: var(--secondary);
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
