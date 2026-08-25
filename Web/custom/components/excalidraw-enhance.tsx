import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
import { lucideMap } from "../lib/lucide-icons"

// Excalidraw client enhancer. Renders nothing; contributes only an
// afterDOMLoaded script that closes the interaction gap left by the pinned
// community plugin, WITHOUT editing plugin files. It runs on every page as a
// guarded no-op (the plugin's own interaction script is global-guarded too).
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

const controlIcons = JSON.stringify(lucideMap(["zoom-in", "zoom-out", "rotate-ccw"]))

const script = `
(function () {
  if (window.__devbookExcalidrawEnhance) return;
  window.__devbookExcalidrawEnhance = true;

  var ACTIVE = "excalidraw-active";
  var ICONS = ${controlIcons};

  function decorateControls(page) {
    [
      [".excalidraw-zoom-in", "zoom-in"],
      [".excalidraw-zoom-out", "zoom-out"],
      [".excalidraw-reset", "rotate-ccw"]
    ].forEach(function (entry) {
      var button = page.querySelector(entry[0]);
      var inner = ICONS[entry[1]];
      if (!button || !inner) return;
      button.innerHTML = '<svg class="lucide lucide-' + entry[1] + '" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
    });
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
    decorateControls(page);
    if (page.dataset.devbookExc) return;
    page.dataset.devbookExc = "1";

    page.addEventListener("wheel", gate, { capture: true, passive: true });
    page.addEventListener("touchmove", gate, { capture: true, passive: true });
    page.addEventListener("click", onClick);

    if (container) {
      container.setAttribute("tabindex", "0");
      container.setAttribute("role", "button");
      container.setAttribute("aria-pressed", "false");
      container.setAttribute("aria-label", "Activate diagram to pan and zoom; press Escape to release");
      container.addEventListener("keydown", onKeydown);
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
