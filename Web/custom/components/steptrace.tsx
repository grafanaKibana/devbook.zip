import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
import styles from "./styles/steptrace.scss"

// steptrace — Quartz host component. Renders nothing server-side; only contributes
// css + an afterDOMLoaded hydrator. The SteptraceBlock transformer emits
// <div class="steptrace-mount" data-config="…"> nodes; this hydrator loads the
// engine at RUNTIME from /static/steptrace/engine.js (a classic <script>, NOT an
// ESM import or inlined file — keeps it decoupled from the Obsidian copy) and
// mounts each div.

const ENGINE_URL = "/static/steptrace/engine.js"
const STYLE_URL = "/static/steptrace/engine.css"

const hydrate = `
(function () {
  if (window.__steptraceHydrator) return;
  window.__steptraceHydrator = true;
  var stylePromise = null;
  var enginePromise = null;
  var mounted = new Map();
  function stylesheet() {
    var existing = document.querySelector('link[data-steptrace-style="1"]');
    if (stylePromise && existing && existing.isConnected) return stylePromise;
    stylePromise = null;
    stylePromise = new Promise(function (resolve, reject) {
      var link = existing;
      if (link && link.sheet) return resolve();
      var created = false;
      if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = ${JSON.stringify(STYLE_URL)};
        link.dataset.steptraceStyle = "1";
        created = true;
      }
      link.addEventListener("load", function () { resolve(); }, { once: true });
      link.addEventListener("error", function () {
        stylePromise = null;
        reject(new Error("could not load ${STYLE_URL}"));
      }, { once: true });
      if (created) document.head.appendChild(link);
    });
    return stylePromise;
  }
  function engine() {
    if (enginePromise) return enginePromise;
    enginePromise = new Promise(function (resolve, reject) {
      if (window.steptrace && window.steptrace.mount) return resolve(window.steptrace);
      var s = document.createElement("script");
      s.src = ${JSON.stringify(ENGINE_URL)};
      s.onload = function () { resolve(window.steptrace); };
      s.onerror = function () { reject(new Error("could not load ${ENGINE_URL}")); };
      document.head.appendChild(s);
    });
    return enginePromise;
  }
  function assets() {
    return stylesheet().then(engine);
  }
  function tabsReady(root) {
    for (var node = root.parentElement; node; node = node.parentElement) {
      if (node.classList.contains("tabsdown") && node.dataset.tabsdown !== "interactive") return false;
    }
    return true;
  }
  function fail(root, msg, e) {
    root.dataset.steptraceMounted = "1";
    var pre = document.createElement("pre");
    pre.textContent = "steptrace: " + msg + "\\n" + (e && e.message ? e.message : e);
    root.replaceChildren(pre);
  }
  function mountOne(root, st) {
    if (root.dataset.steptraceMounted) return;
    root.dataset.steptraceMounted = "1";
    var config;
    try { config = JSON.parse(root.dataset.config || "{}"); }
    catch (e) { fail(root, "invalid config", e); return; }
    try {
      var tabsdown = window.tabsdown;
      var handle = st.mount(root, config, tabsdown && tabsdown.mountTabs ? { mountTabs: tabsdown.mountTabs } : {});
      var destroyed = false;
      var destroy = function () {
        if (destroyed) return;
        destroyed = true;
        mounted.delete(root);
        if (handle && handle.destroy) handle.destroy();
      };
      mounted.set(root, destroy);
      if (window.addCleanup) {
        window.addCleanup(destroy);
      } else {
        // spa.inline.ts is appended AFTER component scripts, so on the initially
        // loaded page addCleanup isn't defined during this eager run() and the
        // mounted guard would then block the nav re-run from wiring teardown.
        // The router's first notifyNav() fires once addCleanup exists — hook it
        // once to register real cleanup (guards the play-timer against a
        // navigate-away leak). On non-SPA builds nav never fires, but those do
        // full reloads so there is nothing to leak.
        document.addEventListener("nav", function () { (window.addCleanup || function () {})(destroy); }, { once: true });
      }
    } catch (e) { fail(root, "mount failed", e); }
  }
  function destroyMounted() {
    Array.from(mounted.values()).forEach(function (destroy) { destroy(); });
  }
  function run() {
    var roots = Array.from(document.querySelectorAll(".steptrace-mount:not([data-steptrace-mounted])")).filter(tabsReady);
    if (!roots.length) return;
    assets().then(function (st) {
      if (!st || !st.mount) throw new Error("engine loaded but exposed no mount()");
      roots.forEach(function (root) { if (root.isConnected && tabsReady(root)) mountOne(root, st); });
    }).catch(function (e) {
      roots.forEach(function (root) { if (root.isConnected && tabsReady(root)) fail(root, "failed to load engine", e); });
    });
  }
  // The mount div can appear after this script (SPA render/swap), so run on every
  // hook: nav + render (Quartz SPA events), immediately, and via a MutationObserver
  // that only re-runs when an UNMOUNTED div exists (cheap during playback).
  document.addEventListener("nav", run);
  document.addEventListener("render", run);
  // Quartz dispatches prenav before its global cleanup set and before replacing
  // the page DOM. Destroy StepTrace children there; addCleanup remains the
  // idempotent full-reload/fallback path and Tabsdown keeps its single global
  // cleanup callback.
  document.addEventListener("prenav", destroyMounted);
  if (document.body) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].type === "attributes") {
          run();
          return;
        }
        for (var j = 0; j < records[i].addedNodes.length; j++) {
          var node = records[i].addedNodes[j];
          if (node.nodeType !== 1) continue;
          if (node.matches(".steptrace-mount:not([data-steptrace-mounted])") ||
              node.querySelector(".steptrace-mount:not([data-steptrace-mounted])")) {
            run();
            return;
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-tabsdown"] });
  }
  run();
})();
`

export const Steptrace: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = hydrate
  Component.css = styles
  return Component
}
