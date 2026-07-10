import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"

// Explorer file-tree ordering (issue #57).
//
// The topic folders used to carry a numeric name prefix (`01 Programming`, …)
// purely to coerce the community Explorer's alphabetical sort into the intended
// order. That prefix leaked into names, titles, slugs and breadcrumbs. Now the
// order is data: each topic folder-note has an `order` frontmatter number, and
// this component sorts the tree by it — mirroring how ExplorerIcons decorates
// the same client-built tree from the sanctioned override surface (quartz.ts),
// since the community Explorer's sort is configured in YAML and can't carry a
// frontmatter-aware comparator.
//
// The component itself renders only an inert `slug -> order` JSON map (built
// from each note's frontmatter `order`, which Quartz Syncer publishes into
// content/). Its afterDOMLoaded script reads that map and reorders the top-level
// nodes; folders without an `order` fall back to their existing (alphabetical)
// position via a stable sort.

// Browser script. Reads the inlined slug -> order map (`.eo-order-map`) and
// stably reorders the Explorer's top-level nodes. Idempotent: it only touches
// the DOM when the current order differs from the desired one, so it settles
// even though its own reordering is observed.
const script = `
(function () {
  function readMap() {
    const el = document.querySelector(".eo-order-map");
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

  // slug -> order, trying the same key variants ExplorerIcons uses so a folder
  // note indexed as "Foo/index" still matches the folder path "Foo".
  function lookup(map, slug) {
    if (!slug) return undefined;
    const v = map[slug] != null ? map[slug]
      : map[slug + "/index"] != null ? map[slug + "/index"]
      : map[slug.replace(/\\/index$/, "")];
    return typeof v === "number" && isFinite(v) ? v : undefined;
  }

  function orderOf(li, map) {
    // Top-level folder: its own .folder-container carries data-folderpath (slug).
    const fc = li.querySelector(":scope > .folder-container");
    if (fc && fc.dataset.folderpath != null) {
      const o = lookup(map, normalizeSlug(fc.dataset.folderpath));
      if (o !== undefined) return o;
    }
    // Top-level file: its anchor's href is the slug.
    const a = li.querySelector(":scope > a.nav-file-title");
    if (a) {
      const o = lookup(map, normalizeSlug(a.getAttribute("href") || a.href));
      if (o !== undefined) return o;
    }
    return Infinity; // unordered nodes keep their relative (alphabetical) place
  }

  function reorderList(ul, map) {
    const items = Array.prototype.filter.call(
      ul.children, function (el) { return el.tagName === "LI"; }
    );
    if (items.length < 2) return;
    // Decorate-sort-undecorate for a stable sort keyed on (order, original index).
    const decorated = items.map(function (li, i) { return { li: li, o: orderOf(li, map), i: i }; });
    const sorted = decorated.slice().sort(function (a, b) { return (a.o - b.o) || (a.i - b.i); });
    // Idempotency guard: bail unless the order actually changed.
    var changed = false;
    for (var k = 0; k < sorted.length; k++) {
      if (sorted[k].li !== items[k]) { changed = true; break; }
    }
    if (!changed) return;
    sorted.forEach(function (d) { ul.appendChild(d.li); });
  }

  var busy = false;
  function reorder() {
    if (busy) return;
    busy = true;
    try {
      const map = readMap();
      // Only the root list (.explorer-ul) is reordered; nested folders keep the
      // plugin's alphabetical order.
      document.querySelectorAll("div.explorer .explorer-ul").forEach(function (ul) {
        reorderList(ul, map);
      });
    } finally {
      busy = false;
    }
  }

  // The tree is (re)built asynchronously on each nav; observe the list and
  // reorder. The idempotency guard means our own moves don't re-trigger work.
  function observe() {
    document.querySelectorAll(".explorer-ul").forEach(function (ul) {
      if (ul.dataset.eoObserved) return;
      ul.dataset.eoObserved = "1";
      const obs = new MutationObserver(function () { reorder(); });
      obs.observe(ul, { childList: true, subtree: true });
      if (typeof window !== "undefined" && window.addCleanup) {
        window.addCleanup(function () { obs.disconnect(); });
      }
    });
  }

  function run() { observe(); reorder(); }
  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  run();
})();
`

export const ExplorerOrder: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = ({ allFiles }: QuartzComponentProps) => {
    // Inline the slug -> order map so the browser script can sort with no extra
    // fetch. Only notes carrying a finite `order` (published by Syncer into the
    // note's frontmatter) are emitted; everything else falls back to alphabetical.
    const map: Record<string, number> = {}
    for (const file of allFiles ?? []) {
      const raw = (file?.frontmatter as { order?: unknown } | undefined)?.order
      const order = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN
      const slug = file?.slug
      if (typeof slug === "string" && Number.isFinite(order)) {
        map[slug] = order
      }
    }

    return (
      <script
        type="application/json"
        class="eo-order-map"
        // JSON is inert data (never executed); keys/values are slugs/order numbers.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(map) }}
      />
    )
  }

  Component.afterDOMLoaded = script

  return Component
}
