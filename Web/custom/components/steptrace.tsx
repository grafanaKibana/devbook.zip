import { readFileSync } from "fs"
import { fileURLToPath } from "url"
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

const ENGINE = readFileSync(fileURLToPath(new URL("../steptrace/engine.js", import.meta.url)), "utf8")

const hydrate = `
(function () {
  function fail(root, msg, e) {
    var pre = document.createElement("pre");
    pre.textContent = "steptrace: " + msg + "\\n" + (e && e.message ? e.message : e);
    root.replaceChildren(pre);
  }
  function run() {
    var st = window.steptrace;
    if (!st || !st.mount) return;
    document.querySelectorAll(".steptrace-mount:not([data-steptrace-mounted])").forEach(function (root) {
      root.dataset.steptraceMounted = "1";
      var config;
      try { config = JSON.parse(root.dataset.config || "{}"); }
      catch (e) { fail(root, "invalid config", e); return; }
      try {
        var handle = st.mount(root, config);
        if (typeof window !== "undefined" && window.addCleanup) {
          window.addCleanup(function () { if (handle && handle.destroy) handle.destroy(); });
        }
      } catch (e) { fail(root, "mount failed", e); }
    });
  }
  document.addEventListener("nav", run);
  run();
})();
`

export const Steptrace: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  // Engine (sets window.steptrace) then the hydration tail — one script, so order
  // is guaranteed and there is no load race.
  Component.afterDOMLoaded = ENGINE + "\n" + hydrate
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
