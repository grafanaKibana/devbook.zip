import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// Excalidraw client enhancer. Renders nothing; contributes only an
// afterDOMLoaded script that closes two gaps the pinned community plugin leaves
// open, WITHOUT editing plugin files. It runs on every page as a guarded no-op
// (the plugin's own interaction script is global-guarded the same way).
//
//  1. Scroll-safe activation. The plugin attaches wheel + touchmove listeners on
//     .excalidraw-container that preventDefault, trapping page scroll over every
//     diagram (upstream: enableInteraction:false doesn't detach them). We gate in
//     the CAPTURE phase on .excalidraw-page — a strict ancestor of the container —
//     so our listener always fires before the plugin's bubble-phase handlers
//     regardless of registration order. While a diagram is inactive we
//     stopPropagation() (never preventDefault), so the event never reaches the
//     plugin and the browser scrolls the page natively. An explicit click/tap or
//     Enter/Space activates pan/zoom; Esc or a click outside releases it. The
//     touch-action side of the trap (set in CSS) is lifted by the same active
//     class in custom.scss.
//  2. Authored background. resolveBgColor emits a literal viewBackgroundColor into
//     the svg's data-bg-color for non-white/non-transparent scenes; nothing
//     consumes it. We apply that literal color to the container in BOTH themes
//     (authored color is authoritative — never theme-adapted). Sentinel values
//     (var(...) for white/transparent, or literal white) keep the plugin's
//     theme-following default.

const script = `
(function () {
  if (window.__devbookExcalidrawEnhance) return;
  window.__devbookExcalidrawEnhance = true;

  var ACTIVE = "excalidraw-active";

  function isSentinelBg(value) {
    if (!value) return true;
    var s = value.trim().toLowerCase();
    if (s.indexOf("var(") === 0) return true;
    return s === "transparent" || s === "#ffffff" || s === "#ffffffff";
  }

  function applyAuthoredBg(container) {
    var svg = container.querySelector("svg");
    if (!svg) return;
    var bg = svg.getAttribute("data-bg-color");
    if (isSentinelBg(bg)) return;
    // The plugin sets container.style.backgroundColor on every nav, which would
    // clobber a background-color we set here. Publish the authored color as a
    // custom property the plugin never touches; a scoped !important rule in
    // custom.scss paints it (author !important beats the plugin's inline value)
    // identically in light and dark — authored color is authoritative.
    container.style.setProperty("--exc-authored-bg", bg);
  }

  // Inject an "open original" link into the control cluster, embeds only. The
  // standalone drawing page already IS the original, so it gets no such link. The
  // plugin renders no header/source link for a transcluded drawing; this button,
  // grouped with the +/−/⟲ controls, is the way back to the full drawing. Href is
  // the transclude's resolved drawing slug, taken as a sibling of the host note.
  function addOpenOriginal(page) {
    var controls = page.querySelector(".excalidraw-controls");
    if (!controls || controls.querySelector(".excalidraw-open-original")) return;
    var tc = page.closest("blockquote.transclude");
    if (!tc) return;
    var url = tc.getAttribute("data-url");
    if (!url) return;
    var a = document.createElement("a");
    a.className = "excalidraw-open-original";
    a.textContent = "↗";
    a.setAttribute("aria-label", "Open original drawing");
    a.setAttribute("title", "Open original drawing");
    try { a.href = new URL(url, window.location.href).pathname; }
    catch (e) { a.href = url; }
    controls.appendChild(a);
  }

  function pages() {
    return document.querySelectorAll(".excalidraw-page");
  }

  function control(page) {
    return page.querySelector(".excalidraw-container");
  }

  function activate(page) {
    if (page.classList.contains(ACTIVE)) return;
    page.classList.add(ACTIVE);
    var c = control(page);
    if (c) c.setAttribute("aria-pressed", "true");
  }

  function deactivate(page) {
    if (!page.classList.contains(ACTIVE)) return;
    page.classList.remove(ACTIVE);
    var c = control(page);
    if (c) c.setAttribute("aria-pressed", "false");
  }

  function deactivateAll(except) {
    pages().forEach(function (p) { if (p !== except) deactivate(p); });
  }

  function gate(e) {
    if (!e.currentTarget.classList.contains(ACTIVE)) e.stopPropagation();
  }

  function onClick(e) {
    var page = e.currentTarget;
    if (e.target.closest(".excalidraw-controls") || e.target.closest("a")) return;
    if (!page.classList.contains(ACTIVE)) {
      deactivateAll(page);
      activate(page);
    }
  }

  function onKeydown(e) {
    var page = e.currentTarget.closest(".excalidraw-page");
    if (!page) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (page.classList.contains(ACTIVE)) { deactivate(page); }
      else { deactivateAll(page); activate(page); }
    } else if (e.key === "Escape" || e.key === "Esc") {
      deactivate(page);
    }
  }

  function setup(page) {
    var container = control(page);
    if (page.dataset.devbookExc) {
      if (container) applyAuthoredBg(container);
      addOpenOriginal(page);
      return;
    }
    page.dataset.devbookExc = "1";
    addOpenOriginal(page);

    page.addEventListener("wheel", gate, { capture: true, passive: true });
    page.addEventListener("touchmove", gate, { capture: true, passive: true });
    page.addEventListener("click", onClick);

    if (container) {
      container.setAttribute("tabindex", "0");
      container.setAttribute("role", "button");
      container.setAttribute("aria-pressed", "false");
      container.setAttribute("aria-label", "Activate diagram to pan and zoom; press Escape to release");
      container.addEventListener("keydown", onKeydown);
      applyAuthoredBg(container);
    }
  }

  function run() {
    pages().forEach(setup);
  }

  function onDocClick(e) {
    if (!e.target.closest(".excalidraw-page")) deactivateAll(null);
  }

  function onDocKeydown(e) {
    if (e.key === "Escape" || e.key === "Esc") deactivateAll(null);
  }

  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  document.addEventListener("click", onDocClick, true);
  document.addEventListener("keydown", onDocKeydown);
  run();
})();
`

export const ExcalidrawEnhance: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = script
  return Component
}
