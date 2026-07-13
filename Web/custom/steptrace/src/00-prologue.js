// ============================================================================
//  steptrace — interactive, step-by-step algorithm-visualizer cards.
//  ONE self-contained file. No build, no dependencies. Runs verbatim in:
//    • the browser (Quartz inlines this file into an afterDOMLoaded script)
//    • Obsidian   (the steptrace plugin concatenates this file into its main.js)
//    • Node       (headless: new Function(src)(); then globalThis.steptrace)
//  It exposes a global `steptrace` (and module.exports) via the UMD wrapper at
//  the very bottom — no ESM import/export, so nothing needs compiling.
//
//  HOW IT'S ORGANISED (top → bottom):
//    1. STYLES        — ALL visual styling, in one place. Edit look here.
//    2. REGISTRY      — registerSort / registerGraph / buildFrames (extension API)
//    3. RECORDERS     — turn ops.* calls into immutable step frames
//    4. ALGORITHMS    — the built-ins, each in its own block. Add more here OR
//                       at runtime via steptrace.registerSort/registerGraph.
//    5. RENDER        — builds DOM only (semantic classes + data-driven geometry);
//                       it sets NO colours/layout — those live entirely in STYLES.
//    6. PLAYER        — play / pause / step / speed transport over the frames.
//    7. MOUNT         — assembles a card into a host element; returns { destroy }.
//
//  Two layers stay deliberately separate: buildFrames() is pure (no DOM), so the
//  algorithm runs ONCE and step-back is free; mount() only paints precomputed
//  frames. Theme-aware via --st-* tokens (a host rebinds them). Keyboard + aria.
// ============================================================================

;(function (root, factory) {
  const api = factory()
  root.steptrace = api
  if (typeof module !== "undefined" && module.exports) module.exports = api
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict"

  const VERSION = "2.0.0"

