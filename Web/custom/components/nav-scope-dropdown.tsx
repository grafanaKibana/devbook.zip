import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"
import { lucideMap } from "../lib/lucide-icons"

// Explorer scope selector (issue #64).
//
// A dropdown pinned to the top of the left Explorer that scopes the file tree to
// a single top-level topic. Same override strategy as explorer-icons.tsx /
// explorer-order.tsx: we do NOT fork the community Explorer plugin
// (github:quartz-community/explorer, whose `.quartz/` cache is gitignored and off
// limits). Instead a component wired in quartz.ts contributes an inert JSON map +
// `afterDOMLoaded` script + `css`, and decorates the plugin's client-built DOM.
//
// The component renders a `slug -> {icon,color,order,name}` map (from each
// note's frontmatter, which Quartz Syncer publishes into content/). The browser
// script builds the dropdown from the *actual* top-level nodes of the rendered
// tree (`.explorer-ul > li`) — so it always mirrors what the Explorer shows —
// joining each node to the map by slug (the same key variants ExplorerOrder uses).
// Scoping is CSS-driven: the script toggles state classes on the top-level nodes
// and CSS (below) does the hiding, reusing the plugin's own `.folder-outer.open`
// hook to reveal the chosen folder's contents. The selection persists in
// localStorage and is re-applied on every SPA nav.
//
// The design (issue #64, chosen mock "Option B"): a boxed selector whose icon
// chip carries the topic's own colour (tinted background + coloured Lucide icon),
// the clean topic name, and a chevron; the menu lists every top-level entry with
// a matching coloured chip, plus an "All topics" entry to clear the scope.

// localStorage key for the persisted scope (a slug, or the ALL sentinel).
const STORE_KEY = "devbook:explorer-scope"
const ALL = "__all"

// Default icon for the loose top-level files the frontmatter map doesn't cover,
// keyed by the last slug segment (a plain "file" icon is the ultimate fallback).
const FILE_ICON_BY_NAME: Record<string, string> = {
  questions: "circle-help",
  roadmap: "map",
}

// Lucide icon names the dropdown always needs regardless of frontmatter: the
// selector chevron, the active-row check, the "All topics" grid, and the folder /
// file fallbacks. These plus every note's `icon:` are resolved from lucide-static
// at build time (see ../lib/lucide-icons) and inlined as `.ns-icons`.
const CHROME_ICONS = ["chevron-down", "check", "layout-grid", "book", "file"]

// Browser script. Reads the inlined slug -> meta map (`.ns-scope-map`), builds the
// dropdown from the Explorer's top-level nodes, wires selection + persistence, and
// scopes the tree. Idempotent; re-applies on every nav. State is CSS-driven.
const script = `
(function () {
  var FILE_ICON_BY_NAME = ${JSON.stringify(FILE_ICON_BY_NAME)};
  var STORE_KEY = ${JSON.stringify(STORE_KEY)};
  var ALL = ${JSON.stringify(ALL)};

  // name -> inner-svg, inlined as .ns-icons by the component (from lucide-static).
  // Refreshed each apply() so it tracks the current page's frontmatter icons.
  var ICONS = {};
  function readIcons() {
    var el = document.querySelector(".ns-icons");
    if (!el) return {};
    try {
      var m = JSON.parse(el.textContent || "{}");
      return m && typeof m === "object" ? m : {};
    } catch (e) { return {}; }
  }

  function svg(name, cls) {
    var inner = ICONS[name];
    if (!inner) return "";
    return '<svg class="ns-svg ' + (cls || "") + '" xmlns="http://www.w3.org/2000/svg"' +
      ' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner + '</svg>';
  }

  function readMap() {
    var el = document.querySelector(".ns-scope-map");
    if (!el) return {};
    try {
      var m = JSON.parse(el.textContent || "{}");
      return m && typeof m === "object" ? m : {};
    } catch (e) { return {}; }
  }

  function normalizeSlug(raw) {
    if (!raw) return "";
    var s = String(raw);
    // A folder's data-folderpath is already a root-relative slug (e.g.
    // "ai--and--ml/index"); only reduce genuinely rooted/absolute values (file
    // hrefs like "/questions") through URL(). Never resolve a bare slug as a
    // path relative to the current page — that would prefix it with the page dir.
    if (/^[a-z]+:\\/\\//i.test(s) || s.charAt(0) === "/") {
      try { s = new URL(s, location.href).pathname; } catch (e) {}
    }
    return decodeURIComponent(s).replace(/^\\/+/, "").replace(/\\/+$/, "");
  }

  // Match a slug against the map trying the same key variants ExplorerOrder uses,
  // so a folder note indexed as "Foo/index" still matches the folder path "Foo".
  function lookup(map, slug) {
    if (!slug) return null;
    return map[slug] || map[slug + "/index"] || map[slug.replace(/\\/index$/, "")] || null;
  }

  function stripPrefix(s) { return (s || "").replace(/^\\d+\\s+/, "").trim(); }
  function lastSeg(slug) {
    var parts = normalizeSlug(slug).split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  }

  function getStored() {
    try { return localStorage.getItem(STORE_KEY) || ALL; } catch (e) { return ALL; }
  }
  function setStored(v) {
    try { localStorage.setItem(STORE_KEY, v); } catch (e) {}
  }

  // Describe a top-level <li>: its scope slug, kind, name, icon and colour. The
  // frontmatter map supplies icon/colour/order/name where available; otherwise we
  // read the node's own label and fall back to a sensible default icon.
  function describe(li, map) {
    var fc = li.querySelector(":scope > .folder-container");
    if (fc && fc.dataset.folderpath != null) {
      var slug = normalizeSlug(fc.dataset.folderpath);
      var meta = lookup(map, slug) || {};
      return {
        slug: slug,
        kind: "folder",
        li: li,
        name: stripPrefix(meta.name || labelText(fc)),
        icon: (meta.icon && ICONS[meta.icon]) ? meta.icon : "book",
        color: meta.color || null,
        order: typeof meta.order === "number" ? meta.order : Infinity,
      };
    }
    var a = li.querySelector(":scope > a.nav-file-title");
    if (a) {
      var fslug = normalizeSlug(a.getAttribute("href") || a.href);
      var fmeta = lookup(map, fslug) || {};
      var seg = lastSeg(fslug);
      var segBase = seg.replace(/\\.[a-z0-9]+$/i, ""); // drop a trailing extension (e.g. roadmap.canvas)
      return {
        slug: fslug,
        kind: "file",
        li: li,
        href: a.getAttribute("href") || a.href, // navigate here on select (files open, not scope)
        name: stripPrefix(fmeta.name || labelText(a)),
        icon:
          fmeta.icon && ICONS[fmeta.icon]
            ? fmeta.icon
            : FILE_ICON_BY_NAME[seg] || FILE_ICON_BY_NAME[segBase] || "file",
        color: fmeta.color || null,
        order: typeof fmeta.order === "number" ? fmeta.order : Infinity,
      };
    }
    return null;
  }

  // The node's own label, ignoring any injected icon spans (which carry no text).
  function labelText(node) {
    return (node.textContent || "").replace(/\\s+/g, " ").trim();
  }

  function topLevelEntries(explorer, map) {
    var ul = explorer.querySelector(".explorer-ul");
    if (!ul) return [];
    var out = [];
    Array.prototype.forEach.call(ul.children, function (li) {
      if (li.tagName !== "LI") return;
      var d = describe(li, map);
      if (d) out.push(d);
    });
    // Stable sort by order (unordered entries keep DOM order via the index tie-break).
    out.forEach(function (d, i) { d._i = i; });
    out.sort(function (a, b) { return (a.order - b.order) || (a._i - b._i); });
    return out;
  }

  // ---- dropdown DOM (built once per explorer, refreshed each apply) ----
  function optHtml(o) {
    var attrs =
      ' data-slug="' + escAttr(o.slug) + '" data-kind="' + escAttr(o.kind || "") + '"' +
      (o.href ? ' data-href="' + escAttr(o.href) + '"' : "");
    return '<button type="button" role="option" aria-selected="' + (o.active ? "true" : "false") +
      '" class="ns-opt' + (o.slug === ALL ? " ns-opt-all" : "") + (o.active ? " is-active" : "") +
      '"' + attrs + ' style="--ns-topic:' + escAttr(o.topic) + '">' +
      '<span class="ns-chip">' + svg(o.icon, "ns-chip-svg") + '</span>' +
      '<span class="ns-opt-name">' + escHtml(o.label) + '</span>' +
      '<span class="ns-check">' + svg("check", "ns-check-svg") + '</span></button>';
  }

  function buildMenu(entries, current) {
    var html =
      optHtml({ slug: ALL, topic: "var(--gray)", icon: "layout-grid", label: "All topics", active: current === ALL }) +
      '<div class="ns-sep" role="presentation"></div>';
    html += entries
      .map(function (e) {
        return optHtml({
          slug: e.slug,
          topic: e.color || "var(--secondary)",
          icon: e.icon,
          label: e.name,
          kind: e.kind,
          href: e.href,
          // Files are navigation shortcuts, not a scope state, so they never
          // show the active/checked marker.
          active: e.kind !== "file" && current === e.slug,
        });
      })
      .join("");
    return html;
  }

  // SPA-navigate when Quartz's router is available, else a full load. Used for
  // file entries (Questions/Roadmap), which open their page rather than scope.
  function navigateTo(href) {
    if (!href) return;
    try {
      var url = new URL(href, location.href);
      if (typeof window.spaNavigate === "function") {
        window.spaNavigate(url);
        return;
      }
      window.location.assign(url.toString());
    } catch (e) {
      window.location.assign(href);
    }
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function escAttr(s) { return escHtml(s).replace(/'/g, "&#39;"); }

  function currentEntry(entries, current) {
    for (var i = 0; i < entries.length; i++) if (entries[i].slug === current) return entries[i];
    return null;
  }

  function isMobile() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(max-width: 800px)").matches
    );
  }

  // Where the selector lives depends on the viewport:
  //   desktop — the left sidebar, as the explorer's preceding sibling, so it sits
  //             ABOVE the "Topics" heading (outside the nav-files-container);
  //   mobile  — inside the explorer's slide-in panel, above the file tree, so it
  //             rides with the tree in the sidebar (the sidebar itself is just a
  //             fixed hamburger box on mobile).
  function placement(explorer) {
    if (isMobile()) {
      var ul = explorer.querySelector(".explorer-ul");
      if (ul && ul.parentNode) return { parent: ul.parentNode, anchor: ul };
    }
    return { parent: explorer.parentNode, anchor: explorer };
  }

  function ensureSelector(explorer) {
    var place = placement(explorer);
    if (!place.parent) return null;
    var scope = document.querySelector(".ns-scope");
    if (!scope) {
      scope = document.createElement("div");
      scope.className = "ns-scope";
      scope.innerHTML =
        '<button type="button" class="ns-trigger" aria-haspopup="listbox" aria-expanded="false">' +
          '<span class="ns-chip ns-trigger-chip"></span>' +
          '<span class="ns-name"></span>' +
          '<span class="ns-chev">' + svg("chevron-down", "ns-chev-svg") + '</span>' +
        '</button>' +
        '<div class="ns-menu" role="listbox" tabindex="-1"></div>';
      place.parent.insertBefore(scope, place.anchor);
      wireSelector(explorer, scope);
      return scope;
    }
    // Move it to the correct home if the viewport crossed the breakpoint or the
    // tree was rebuilt out from under it.
    if (scope.parentNode !== place.parent || scope.nextElementSibling !== place.anchor) {
      place.parent.insertBefore(scope, place.anchor);
    }
    return scope;
  }

  function wireSelector(explorer, scope) {
    var trigger = scope.querySelector(".ns-trigger");
    var menu = scope.querySelector(".ns-menu");

    function open() {
      scope.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      var first = menu.querySelector(".ns-opt.is-active") || menu.querySelector(".ns-opt");
      if (first) first.focus();
    }
    function close(focusTrigger) {
      scope.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      if (focusTrigger) trigger.focus();
    }

    trigger.addEventListener("click", function () {
      scope.classList.contains("open") ? close(false) : open();
    });

    menu.addEventListener("click", function (e) {
      var opt = e.target.closest(".ns-opt");
      if (!opt) return;
      close(true);
      // A file entry opens its page; a folder (or "All topics") scopes the tree.
      if (opt.dataset.kind === "file") {
        navigateTo(opt.dataset.href || opt.dataset.slug);
      } else {
        select(explorer, opt.dataset.slug);
      }
    });

    // Keyboard: Escape closes; Up/Down/Home/End roving through the options.
    scope.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { if (scope.classList.contains("open")) { e.preventDefault(); close(true); } return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
        if (!scope.classList.contains("open")) { if (e.target === trigger) { e.preventDefault(); open(); } return; }
        var opts = Array.prototype.slice.call(menu.querySelectorAll(".ns-opt"));
        if (!opts.length) return;
        e.preventDefault();
        var idx = opts.indexOf(document.activeElement);
        if (e.key === "Home") idx = 0;
        else if (e.key === "End") idx = opts.length - 1;
        else if (e.key === "ArrowDown") idx = idx < 0 ? 0 : (idx + 1) % opts.length;
        else idx = idx <= 0 ? opts.length - 1 : idx - 1;
        opts[idx].focus();
      }
    });
  }

  // Close any open menu on an outside click. Installed once for the page lifetime
  // (the selectors persist across nav), so it neither accumulates nor gets torn
  // down out from under a reused selector.
  var clickAwayInstalled = false;
  function installClickAway() {
    if (clickAwayInstalled) return;
    clickAwayInstalled = true;
    document.addEventListener("click", function (e) {
      document.querySelectorAll(".ns-scope.open").forEach(function (scope) {
        if (scope.contains(e.target)) return;
        scope.classList.remove("open");
        var trigger = scope.querySelector(".ns-trigger");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Re-place the selector when the viewport crosses the mobile breakpoint (it
  // moves between the sidebar and the explorer's slide-in panel). Installed once.
  var mqlBound = false;
  function bindBreakpoint() {
    if (mqlBound || typeof window === "undefined" || !window.matchMedia) return;
    mqlBound = true;
    var mql = window.matchMedia("(max-width: 800px)");
    var onChange = function () { apply(); };
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else if (mql.addListener) mql.addListener(onChange);
  }

  // ---- scoping: hide non-selected top-level nodes; reveal the chosen folder ----
  function applyScope(entries, current) {
    entries.forEach(function (e) {
      var li = e.li;
      var selected = current === e.slug;
      var scoping = current !== ALL;
      li.classList.toggle("ns-hidden", scoping && !selected);
      if (e.kind === "folder") {
        var fc = li.querySelector(":scope > .folder-container");
        var outer = li.querySelector(":scope > .folder-outer");
        var toggle = fc && fc.querySelector(".folder-button, .folder-icon, button");
        if (selected && scoping) {
          // Drop this folder's own header row (the dropdown already labels it)
          // and force it open so its contents show directly under the selector.
          // Mark the folder we forced so we can undo exactly that on unscope.
          if (fc) fc.classList.add("ns-head-hidden");
          if (outer && !outer.classList.contains("open")) {
            outer.classList.add("open");
            outer.dataset.nsForced = "1";
          }
          if (toggle) toggle.setAttribute("aria-expanded", "true");
        } else {
          if (fc) fc.classList.remove("ns-head-hidden");
          // Undo only the open state WE forced (never the plugin's/user's), and
          // never collapse the folder that holds the current page.
          if (outer && outer.dataset.nsForced) {
            delete outer.dataset.nsForced;
            var hasActive = outer.querySelector(
              "a.nav-file-title.active, a.nav-file-title.is-active",
            );
            if (!hasActive) {
              outer.classList.remove("open");
              if (toggle) toggle.setAttribute("aria-expanded", "false");
            }
          }
        }
      }
    });
  }

  function select(explorer, slug) {
    setStored(slug);
    apply(); // re-render all explorers so a change here reflects everywhere
  }

  function renderSelector(explorer, entries, current) {
    var scope = ensureSelector(explorer);
    if (!scope) return;
    var cur = currentEntry(entries, current);
    var isAll = current === ALL || !cur;
    var chip = scope.querySelector(".ns-trigger-chip");
    var name = scope.querySelector(".ns-name");
    var menu = scope.querySelector(".ns-menu");
    if (isAll) {
      scope.style.setProperty("--ns-topic", "var(--gray)");
      if (chip) chip.innerHTML = svg("layout-grid", "ns-chip-svg");
      if (name) name.textContent = "All topics";
    } else {
      scope.style.setProperty("--ns-topic", cur.color || "var(--secondary)");
      if (chip) chip.innerHTML = svg(cur.icon, "ns-chip-svg");
      if (name) name.textContent = cur.name;
    }
    if (menu) menu.innerHTML = buildMenu(entries, isAll ? ALL : current);
  }

  var busy = false;
  function apply() {
    if (busy) return;
    busy = true;
    try {
      ICONS = readIcons();
      var explorers = document.querySelectorAll("div.explorer");
      if (!explorers.length) return;
      var map = readMap();
      var current = getStored();
      explorers.forEach(function (explorer) {
        var entries = topLevelEntries(explorer, map);
        if (!entries.length) return;
        // Fall back to ALL when the stored scope no longer exists (renamed/removed
        // topic) or points at a file (files navigate, they are never a scope) so
        // the user is never left with an empty tree.
        var curEntry = current !== ALL ? currentEntry(entries, current) : null;
        if (current !== ALL && (!curEntry || curEntry.kind === "file")) current = ALL;
        renderSelector(explorer, entries, current);
        applyScope(entries, current);
      });
    } finally {
      busy = false;
    }
  }

  // The tree is (re)built asynchronously on each nav; observe the list and
  // re-apply. Idempotent guards (busy flag, class toggles) keep our own DOM
  // writes from re-triggering meaningful work.
  function observe() {
    document.querySelectorAll(".explorer-ul").forEach(function (ul) {
      if (ul.dataset.nsObserved) return;
      ul.dataset.nsObserved = "1";
      var obs = new MutationObserver(function () { apply(); });
      obs.observe(ul, { childList: true, subtree: true });
      if (typeof window !== "undefined" && window.addCleanup) {
        window.addCleanup(function () { obs.disconnect(); });
      }
    });
  }

  function run() { installClickAway(); bindBreakpoint(); observe(); apply(); }
  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  run();
})();
`

export const NavScopeDropdown: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = ({ allFiles }: QuartzComponentProps) => {
    // Inline a slug -> {icon,color,order,name} map so the browser script can label
    // and colour each top-level entry with no extra fetch. We emit every note that
    // carries any of these frontmatter fields (the topic folder-notes do); the
    // script only ever reads the top-level ones, so extra entries are harmless.
    // Every referenced icon name is collected and resolved from lucide-static, so
    // whatever `icon:` a note uses just works (no hard-coded icon list to update).
    const iconNames = new Set<string>(CHROME_ICONS)
    for (const fileIcon of Object.values(FILE_ICON_BY_NAME)) iconNames.add(fileIcon)

    const map: Record<string, { icon?: string; color?: string; order?: number; name?: string }> = {}
    for (const file of allFiles ?? []) {
      const fm = file?.frontmatter as
        | { icon?: unknown; color?: unknown; order?: unknown; title?: unknown }
        | undefined
      const slug = file?.slug
      if (typeof slug !== "string" || !fm) continue

      const icon = typeof fm.icon === "string" ? fm.icon : undefined
      const color = typeof fm.color === "string" ? fm.color : undefined
      const order =
        typeof fm.order === "number"
          ? fm.order
          : typeof fm.order === "string" &&
              fm.order.trim() !== "" &&
              Number.isFinite(Number(fm.order))
            ? Number(fm.order)
            : undefined
      const name = typeof fm.title === "string" ? fm.title : undefined

      if (icon === undefined && color === undefined && order === undefined && name === undefined) {
        continue
      }
      const entry: { icon?: string; color?: string; order?: number; name?: string } = {}
      if (icon !== undefined) {
        entry.icon = icon
        iconNames.add(icon)
      }
      if (color !== undefined) entry.color = color
      if (order !== undefined) entry.order = order
      if (name !== undefined) entry.name = name
      map[slug] = entry
    }

    // Resolve every collected name to its Lucide SVG; unresolved names are simply
    // absent, and the browser script falls back to the folder/file default icon.
    const icons = lucideMap(iconNames)

    return (
      <>
        <script
          type="application/json"
          class="ns-scope-map"
          // JSON is inert data (never executed); keys/values are slugs / meta.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(map) }}
        />
        <script
          type="application/json"
          class="ns-icons"
          // name -> inner-svg for every icon the dropdown might render.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(icons) }}
        />
      </>
    )
  }

  Component.afterDOMLoaded = script

  Component.css = `
/* Scope selector — sits in the left sidebar ABOVE the Explorer's "Topics"
   heading (it is the explorer's preceding sibling, outside .nav-files-container).
   The margin separates it from the Topics heading below. */
.sidebar .ns-scope {
  position: relative;
  margin: 0 0 0.75rem;
}

/* Trigger: a boxed selector — icon chip + name + chevron. The chip carries the
   active topic's colour (--ns-topic, set inline by the script). No colour rail. */
.sidebar .ns-trigger {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  cursor: pointer;
  text-align: left;
  color: var(--dark);
  font-family: inherit;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: var(--radius-m, 8px);
  padding: 0.45rem 0.5rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.sidebar .ns-trigger:hover {
  border-color: var(--gray);
  background: color-mix(in srgb, var(--gray) 6%, var(--light));
}
.sidebar .ns-trigger:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: 2px;
}

.sidebar .ns-chip {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
}
.sidebar .ns-svg {
  width: 16px;
  height: 16px;
}
.sidebar .ns-trigger-chip {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ns-topic, var(--secondary)) 20%, transparent);
  color: var(--ns-topic, var(--secondary));
}
.sidebar .ns-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 0.95rem;
}
.sidebar .ns-chev {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  color: var(--gray);
  transition: transform 0.18s ease;
}
.sidebar .ns-chev-svg {
  width: 15px;
  height: 15px;
}
.sidebar .ns-scope.open .ns-chev {
  transform: rotate(180deg);
}

/* Menu: a bordered panel below the trigger with one row per top-level entry. */
.sidebar .ns-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  display: none;
  background: var(--light);
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 0 18px 46px rgba(0, 0, 0, 0.16);
  padding: 0.35rem;
  max-height: min(60vh, 340px);
  overflow-y: auto;
}
.sidebar .ns-scope.open .ns-menu {
  display: block;
}
.sidebar .ns-sep {
  height: 1px;
  background: var(--lightgray);
  margin: 0.3rem 0.2rem;
}

.sidebar .ns-opt {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  cursor: pointer;
  text-align: left;
  color: var(--darkgray);
  font-family: inherit;
  font-size: 0.9rem;
  background: transparent;
  border: 0;
  border-radius: 7px;
  padding: 0.42rem 0.5rem;
}
.sidebar .ns-opt:hover {
  background: color-mix(in srgb, var(--gray) 14%, transparent);
  color: var(--dark);
}
.sidebar .ns-opt:focus-visible {
  outline: 2px solid var(--secondary);
  outline-offset: -2px;
}
.sidebar .ns-opt .ns-chip {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--ns-topic, var(--gray)) 18%, transparent);
  color: var(--ns-topic, var(--gray));
}
.sidebar .ns-opt-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar .ns-check {
  flex: 0 0 auto;
  color: var(--ns-topic, var(--secondary));
  opacity: 0;
}
.sidebar .ns-check-svg {
  width: 15px;
  height: 15px;
}
.sidebar .ns-opt.is-active {
  background: color-mix(in srgb, var(--ns-topic, var(--secondary)) 12%, transparent);
  color: var(--dark);
  font-weight: 600;
}
.sidebar .ns-opt.is-active .ns-check {
  opacity: 1;
}

/* Scoping: hide non-selected top-level nodes, and the chosen folder's own header
   row (the dropdown labels it) so only its contents show under the selector. */
.explorer .explorer-ul > li.ns-hidden {
  display: none;
}
.explorer .explorer-ul > li > .folder-container.ns-head-hidden {
  display: none;
}
/* The scoped folder's children are now the effective root, so drop the nested
   indent + guide line the plugin draws on a folder's child list (.folder-outer
   > ul). Only the scoped folder's direct list is reset; real nesting keeps its. */
.explorer .explorer-ul > li > .folder-container.ns-head-hidden + .folder-outer > ul {
  margin-left: 0;
  padding-left: 0;
  border-left: 0;
}

/* Mobile: the selector rides inside the explorer's slide-in panel, above the
   tree — give it room from the panel's top edge and a small side inset. */
@media (max-width: 800px) {
  .sidebar .ns-scope {
    margin: 1rem 0.55rem 1.1rem;
  }
}
`

  return Component
}
