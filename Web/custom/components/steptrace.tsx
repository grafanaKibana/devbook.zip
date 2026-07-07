import { readFileSync } from "fs"
import { join } from "path"
import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"

// steptrace — live algorithm-visualizer cards on the published site.
//
// Renders nothing server-side (like ExplorerIcons): it only contributes css +
// afterDOMLoaded. The SteptraceBlock transformer turns each ```steptrace fence
// into <div class="steptrace-mount" data-config="…">; this script hydrates each
// by calling the shared engine's mount(). Wired on the SPA `nav` event with
// window.addCleanup so cards mount after client-side navigation and tear down
// (stop timers/listeners) when leaving the page.
//
// The engine is the SAME custom/steptrace/engine.js the Obsidian plugin uses.
// It's a UMD file (sets window.steptrace); we read it at build time and inline
// it here, so the served script is always fresh from source — no /static file,
// no manual copy, and no ESM import (afterDOMLoaded is transform-only anyway).

// Quartz bundles the config into quartz/.quartz-cache before running it, so
// import.meta.url points at the cache dir — not this file. Resolve from the
// project root instead (cwd is always the Web/ Quartz project at build time).
const ENGINE = readFileSync(join(process.cwd(), "custom", "steptrace", "engine.js"), "utf8")

const hydrate = `
(function () {
  if (window.__steptraceHydrator) return;
  window.__steptraceHydrator = true;
  function fail(root, msg, e) {
    var pre = document.createElement("pre");
    pre.textContent = "steptrace: " + msg + "\\n" + (e && e.message ? e.message : e);
    root.replaceChildren(pre);
  }
  function mountOne(root) {
    if (root.dataset.steptraceMounted) return;
    root.dataset.steptraceMounted = "1";
    var config;
    try { config = JSON.parse(root.dataset.config || "{}"); }
    catch (e) { fail(root, "invalid config", e); return; }
    try {
      var handle = window.steptrace.mount(root, config);
      if (window.addCleanup) window.addCleanup(function () { if (handle && handle.destroy) handle.destroy(); });
    } catch (e) { fail(root, "mount failed", e); }
  }
  function run() {
    if (!window.steptrace || !window.steptrace.mount) return;
    document.querySelectorAll(".steptrace-mount:not([data-steptrace-mounted])").forEach(mountOne);
  }
  // The mount div can appear after this script (SPA render/swap), so run on every
  // hook: nav + render (Quartz SPA events), immediately, and via a MutationObserver
  // that only re-runs when an UNMOUNTED div exists (cheap during playback).
  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  if (document.body) {
    new MutationObserver(function () {
      if (document.querySelector(".steptrace-mount:not([data-steptrace-mounted])")) run();
    }).observe(document.body, { childList: true, subtree: true });
  }
  run();
})();
`

export const Steptrace: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  // Engine (sets window.steptrace) then the hydration tail — one script, so order
  // is guaranteed and there is no load race. The explicit `;` separator prevents
  // ASI from parsing the engine IIFE's return value as a call on the next line.
  Component.afterDOMLoaded = ENGINE + "\n;\n" + hydrate
  // The only per-host piece: bind the neutral --st-* tokens to Quartz's palette.
  Component.css = `
.steptrace {
  --st-page: var(--light);
  --st-surface: var(--lightgray);
  --st-text: var(--darkgray);
  --st-muted: var(--gray);
  --st-border: var(--gray);
  --st-accent: var(--secondary);
  --st-on-accent: var(--light);
  --st-neutral: var(--gray);
  --st-state-amber: #d97706;
  --st-state-violet: #7c3aed;
  --st-state-blue: #2563eb;
  --st-state-green: var(--secondary);
}
:root[saved-theme="dark"] .steptrace {
  --st-state-amber: #f59e0b;
  --st-state-violet: #a78bfa;
  --st-state-blue: #60a5fa;
}
`
  return Component
}
