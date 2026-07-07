// ============================================================================
//  steptrace — interactive, step-by-step algorithm-visualizer cards.
//  ONE self-contained file. No build, no dependencies. Runs verbatim in:
//    • the browser (Quartz inlines this file into an afterDOMLoaded script)
//    • Obsidian   (the devbook-steptrace plugin reads + evaluates this file)
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

  // ==========================================================================
  //  1. STYLES  —  the ONLY place visual styling lives.
  //  Colours are --st-* tokens (mapped to internal --_* with fallbacks) so a
  //  host rebinds the palette via the cascade without touching this file. The
  //  render section (§5) never sets a colour or layout inline — only data-driven
  //  geometry (bar heights, node coordinates). To restyle steptrace, edit here.
  // ==========================================================================

  const STYLE_ID = "steptrace-engine-style"
  const STYLES = `
.steptrace {
  --_amber: var(--st-state-amber, #d97706);
  --_violet: var(--st-state-violet, #7c3aed);
  --_blue: var(--st-state-blue, #2563eb);
  --_green: var(--st-state-green, #4c8000);
  --_neutral: var(--st-neutral, #9aa886);
  --_surface: var(--st-surface, #eef1e6);
  --_text: var(--st-text, #29301f);
  --_muted: var(--st-muted, #6e785e);
  --_border: var(--st-border, #c3cbaf);
  --_accent: var(--st-accent, #4c8000);
  --_on-accent: var(--st-on-accent, #ffffff);
  --_tween: 320ms;
  color: var(--_text);
  font: 400 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--_border);
  border-radius: 12px;
  padding: 1rem;
  background: var(--st-page, transparent);
}
.steptrace--reduced * {
  transition: none !important;
  animation: none !important;
}

/* ---- sort: bars ---- */
.steptrace__stage {
  display: flex;
  align-items: flex-end;
  gap: 0.4rem;
  height: 220px;
  padding: 0.5rem 0.5rem 0;
  border-bottom: 2px solid var(--_border);
}
.steptrace__bar {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  height: 100%;
  justify-content: flex-end;
}
.steptrace__fill {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: var(--_neutral);
  border: 2px solid transparent;
  transition:
    height var(--_tween) ease,
    background var(--_tween) ease,
    border-color var(--_tween) ease;
}
.steptrace__num {
  font: 600 12px/1 ui-monospace, "SF Mono", Menlo, monospace;
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__cue {
  font-size: 11px;
  line-height: 1;
  min-height: 12px;
  color: var(--_muted);
}
.steptrace__bar[data-state="compare"] .steptrace__fill {
  background: var(--_amber);
  border-color: var(--_amber);
}
.steptrace__bar[data-state="swap"] .steptrace__fill {
  background: var(--_violet);
  border-color: var(--_violet);
}
.steptrace__bar[data-state="candidate"] .steptrace__fill {
  background: var(--_surface);
  border-color: var(--_blue);
  border-style: dashed;
}
.steptrace__bar[data-state="sorted"] .steptrace__fill {
  background: var(--_green);
  border-color: var(--_green);
}
.steptrace__bar[data-state="sorted"] .steptrace__num {
  color: var(--_green);
}
.steptrace__bar[data-state="compare"] .steptrace__num,
.steptrace__bar[data-state="swap"] .steptrace__num {
  color: var(--_text);
}

/* ---- graph: svg ---- */
.steptrace__graph {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-start;
}
.steptrace__svg {
  flex: 1 1 300px;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 320px;
  overflow: visible;
}
.steptrace__arrow {
  fill: var(--_neutral);
}
.steptrace__edge {
  stroke: var(--_neutral);
  stroke-width: 2;
  transition:
    stroke var(--_tween) ease,
    stroke-width var(--_tween) ease;
}
.steptrace__edge[data-active="true"] {
  stroke: var(--_violet);
  stroke-width: 4;
}
.steptrace__edge-label {
  fill: var(--_muted);
  font: 600 11px ui-monospace, Menlo, monospace;
}
.steptrace__node circle {
  fill: var(--_surface);
  stroke: var(--_neutral);
  stroke-width: 2;
  transition:
    fill var(--_tween) ease,
    stroke var(--_tween) ease,
    stroke-width var(--_tween) ease;
}
.steptrace__node .steptrace__id {
  fill: var(--_text);
  font: 700 14px ui-sans-serif, system-ui, sans-serif;
}
.steptrace__node .steptrace__d {
  fill: var(--_muted);
  font: 600 10px ui-monospace, Menlo, monospace;
}
.steptrace__node[data-state="visited"] circle {
  fill: var(--_green);
  stroke: var(--_green);
}
.steptrace__node[data-state="frontier"] circle {
  fill: var(--_surface);
  stroke: var(--_amber);
  stroke-width: 3.5;
}
.steptrace__node[data-state="current"] circle {
  fill: var(--_blue);
  stroke: var(--_blue);
}
.steptrace__node[data-state="visited"] .steptrace__id,
.steptrace__node[data-state="current"] .steptrace__id {
  fill: var(--_on-accent);
}
.steptrace__aside {
  flex: 0 1 auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 130px;
}
.steptrace__queue-label,
.steptrace__legend-label {
  font: 700 11px ui-monospace, Menlo, monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--_muted);
}
.steptrace__queue {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: 0.3rem;
  min-height: 1.8rem;
}
.steptrace__chip {
  font: 600 12px ui-monospace, Menlo, monospace;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: var(--_surface);
  border: 1.5px solid var(--_amber);
  color: var(--_text);
}
.steptrace__queue-empty {
  font-size: 12px;
  color: var(--_muted);
  font-style: italic;
}
.steptrace__legend {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.3rem;
}
.steptrace__legend-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 12px;
  color: var(--_text);
}
.steptrace__swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}
.steptrace__swatch--current {
  background: var(--_blue);
}
.steptrace__swatch--frontier {
  background: var(--_amber);
}
.steptrace__swatch--visited {
  background: var(--_green);
}

/* ---- shared: status + toolbar ---- */
.steptrace__status {
  min-height: 2.6em;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: var(--_surface);
  color: var(--_text);
  font-size: 13px;
}
.steptrace__status .steptrace__counts {
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__key {
  color: var(--_blue);
  font-weight: 600;
}
.steptrace__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.5rem;
}
.steptrace__toolbar button,
.steptrace__toolbar select {
  font: inherit;
  font-size: 13px;
  color: var(--_text);
  background: var(--st-page, #fff);
  border: 1px solid var(--_border);
  border-radius: 7px;
  padding: 0.32rem 0.6rem;
  cursor: pointer;
  min-height: 34px;
  min-width: 34px;
}
.steptrace__toolbar button:hover,
.steptrace__toolbar select:hover {
  border-color: var(--_accent);
}
.steptrace__toolbar button.steptrace__play {
  background: var(--_accent);
  color: var(--_on-accent);
  border-color: var(--_accent);
  font-weight: 600;
}
.steptrace__toolbar :focus-visible {
  outline: 2px solid var(--_blue);
  outline-offset: 2px;
}
.steptrace__spacer {
  flex: 1 1 auto;
}
.steptrace__step {
  font: 600 12px/1 ui-monospace, Menlo, monospace;
  color: var(--_muted);
  font-variant-numeric: tabular-nums;
}
.steptrace__speed {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
  color: var(--_muted);
}
.steptrace__speed input {
  accent-color: var(--_accent);
}
`

  // ==========================================================================
  //  2. REGISTRY  —  the extension surface.
  //  Adding an algorithm = one registerSort/registerGraph call — from §4 below
  //  (a built-in) OR at runtime, e.g. from the Obsidian settings UI:
  //     steptrace.registerSort("my-sort", { label: "My sort" }, (input, ops) => {…})
  //  buildFrames() is pure (no DOM): it runs the algorithm once into frames.
  // ==========================================================================

  const sortReg = new Map()
  const graphReg = new Map()

  /** Register a sort algorithm. `fn(input, ops)` drives a SortRecorder via ops.*. */
  function registerSort(id, meta, fn) {
    sortReg.set(id, { meta, fn })
  }

  /** Register a graph algorithm. `fn(input, ops, graph)` drives a GraphRecorder. */
  function registerGraph(id, meta, fn) {
    graphReg.set(id, { meta, fn })
  }

  /** Kind of a registered algorithm id, or null if unknown. */
  function kindOf(id) {
    return sortReg.has(id) ? "sort" : graphReg.has(id) ? "graph" : null
  }

  /** List registered algorithms of a kind as [{ id, label }] for the toolbar select. */
  function listAlgorithms(kind) {
    const reg = kind === "graph" ? graphReg : sortReg
    return [...reg].map(([id, v]) => ({ id, label: v.meta.label }))
  }

  /** Pure: run the named algorithm once and return its precomputed frames. */
  function buildFrames(config) {
    if (sortReg.has(config.algorithm)) {
      const { fn } = sortReg.get(config.algorithm)
      const rec = new SortRecorder(config.array)
      fn(config, rec)
      return { kind: "sort", frames: rec.frames }
    }
    if (graphReg.has(config.algorithm)) {
      const graph = normalizeGraph(config)
      const { fn } = graphReg.get(config.algorithm)
      const rec = new GraphRecorder(graph)
      fn({ ...config, start: graph.start }, rec, graph)
      return { kind: "graph", frames: rec.frames, graph }
    }
    throw new Error(`steptrace: unknown algorithm "${config.algorithm}".`)
  }

  /** Adjacency list, neighbours sorted by id for deterministic traversal order.
   *  Available to graph algorithms as ops-adjacent helper `steptrace.adjacency`. */
  function adjacency(graph) {
    const adj = {}
    for (const n of graph.nodes) adj[n.id] = []
    for (const e of graph.edges) {
      adj[e.from].push(e.to)
      if (!graph.directed) adj[e.to].push(e.from)
    }
    for (const id of Object.keys(adj)) adj[id].sort()
    return adj
  }

  // ==========================================================================
  //  3. RECORDERS  —  turn semantic ops.* calls into immutable step frames.
  //  An algorithm NEVER builds a frame; it only calls ops.*. The Recorder owns
  //  all state and freezes a snapshot per step, so the renderer paints frames
  //  verbatim and step-back is free.
  // ==========================================================================

  // A SortFrame snapshot: { type, array, sorted[], active[], candidate|null,
  //   keyValue|null, comparisons, swaps, message }.
  class SortRecorder {
    constructor(array) {
      this.a = array.slice()
      this.frames = []
      this._sorted = new Set()
      this.comparisons = 0
      this.swaps = 0
      this._cand = null
      this._key = null
    }

    /** Current array as a defensive copy (algorithms read live values through this). */
    get value() {
      return this.a.slice()
    }

    _push(type, active, message) {
      this.frames.push(
        Object.freeze({
          type,
          array: this.a.slice(),
          sorted: [...this._sorted].sort((x, y) => x - y),
          active: active.slice(),
          candidate: this._cand,
          keyValue: this._key,
          comparisons: this.comparisons,
          swaps: this.swaps,
          message,
        }),
      )
    }

    init(message) {
      this._push("init", [], message)
    }

    /** Compare index i with j (pass j=null for a one-sided compare vs a held key). */
    compare(i, j, message) {
      this.comparisons++
      this._push("compare", j == null ? [i] : [i, j], message)
    }

    swap(i, j, message) {
      const a = this.a
      ;[a[i], a[j]] = [a[j], a[i]]
      this.swaps++
      this._push("swap", [i, j], message)
    }

    /** Overwrite index i with value v (insertion-style shift); counts as a move. */
    overwrite(i, v, message) {
      this.a[i] = v
      this.swaps++
      this._push("overwrite", [i], message)
    }

    /** Track a candidate index (running min / insertion target), or null to clear. */
    candidate(i, message) {
      this._cand = i
      this._push("select", i == null ? [] : [i], message)
    }

    /** Hold a value out of the array (insertion key); shows on subsequent frames. */
    holdKey(v) {
      this._key = v
    }

    markSorted(idxs, show, message) {
      idxs.forEach((k) => this._sorted.add(k))
      this._push("mark-sorted", show, message)
    }

    lockAll(idxs) {
      idxs.forEach((k) => this._sorted.add(k))
    } // no frame; faithful terminal state

    clearMarks() {
      this._cand = null
      this._key = null
    }

    done(message) {
      this.clearMarks()
      this._push("done", [], message)
    }
  }

  // A GraphFrame snapshot: { type, visited[], frontier[], current|null,
  //   edge:{from,to}|null, dist:{id:number}, message }.
  class GraphRecorder {
    constructor(graph) {
      this.graph = graph
      this.frames = []
      this._visited = new Set()
      this._frontier = []
      this._dist = {}
      this._current = null
    }

    get visitedCount() {
      return this._visited.size
    }
    dist(id) {
      return this._dist[id]
    }

    _push(type, edge, message) {
      this.frames.push(
        Object.freeze({
          type,
          visited: [...this._visited],
          frontier: [...this._frontier],
          current: this._current,
          edge: edge ? { from: edge.from, to: edge.to } : null,
          dist: { ...this._dist },
          message,
        }),
      )
    }

    init(message) {
      this._push("init", null, message)
    }

    /** Discover a node: set its distance and append it to the queue (frontier). */
    enqueue(node, d, message) {
      this._frontier.push(node)
      this._dist[node] = d
      this._push("frontier", null, message)
    }

    /** Explore an edge u -> v (highlight only; no state change). */
    edge(u, v, message) {
      this._push("edge", { from: u, to: v }, message)
    }

    /** Visit a node: dequeue it from the frontier and mark it visited. */
    visit(node, message) {
      this._current = node
      const i = this._frontier.indexOf(node)
      if (i >= 0) this._frontier.splice(i, 1)
      this._visited.add(node)
      this._push("visit", null, message)
    }

    done(message) {
      this._current = null
      this._push("done", null, message)
    }
  }

  // A small, sensible default graph so a bare { "algorithm": "bfs" } runs.
  const DEFAULT_GRAPH = {
    directed: false,
    start: "A",
    nodes: [
      { id: "A", x: 60, y: 60 },
      { id: "B", x: 200, y: 40 },
      { id: "C", x: 60, y: 180 },
      { id: "D", x: 200, y: 160 },
      { id: "E", x: 340, y: 80 },
      { id: "F", x: 340, y: 200 },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "A", to: "C" },
      { from: "B", to: "D" },
      { from: "B", to: "E" },
      { from: "C", to: "D" },
      { from: "D", to: "F" },
      { from: "E", to: "F" },
    ],
  }

  function normalizeGraph(config) {
    const src = Array.isArray(config.nodes) && config.nodes.length ? config : DEFAULT_GRAPH
    const nodes = src.nodes.map((n) => ({ id: String(n.id), x: Number(n.x), y: Number(n.y) }))
    const ids = new Set(nodes.map((n) => n.id))
    const edges = (src.edges || [])
      .filter((e) => ids.has(String(e.from)) && ids.has(String(e.to)))
      .map((e) => ({ from: String(e.from), to: String(e.to), weight: e.weight == null ? null : Number(e.weight) }))
    const directed = !!src.directed
    let start = config.start != null ? String(config.start) : src.start != null ? String(src.start) : nodes[0].id
    if (!ids.has(start)) start = nodes[0].id
    return { nodes, edges, directed, start }
  }

  // ==========================================================================
  //  4. ALGORITHMS  —  the built-ins. Each is one self-contained block: a
  //  register call + a pure fn(input, ops[, graph]) that only calls ops.*.
  //  Add another block here for a shipped algorithm, or register at runtime.
  // ==========================================================================

  // ───────────────────────────── bubble-sort ─────────────────────────────
  registerSort("bubble-sort", { label: "Bubble sort" }, (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Bubble sort — repeatedly compare adjacent values and swap the larger one rightward, bubbling the largest to the end each pass.`,
    )
    for (let i = 0; i < n - 1; i++) {
      let swapped = false
      for (let j = 0; j < n - 1 - i; j++) {
        const a = ops.value
        ops.compare(j, j + 1, `Compare index ${j} (${a[j]}) and index ${j + 1} (${a[j + 1]}).`)
        if (ops.value[j] > ops.value[j + 1]) {
          const b = ops.value
          ops.swap(j, j + 1, `${b[j]} is greater than ${b[j + 1]} — swap them.`)
          swapped = true
        }
      }
      ops.markSorted([n - 1 - i], [n - 1 - i], `Index ${n - 1 - i} now holds its final value.`)
      if (!swapped) {
        const rest = Array.from({ length: n - 1 - i }, (_, k) => k)
        ops.markSorted(rest, [], `A full pass made no swaps — the array is already sorted.`)
        break
      }
    }
    ops.lockAll(Array.from({ length: n }, (_, k) => k))
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  })

  // ───────────────────────────────── bfs ─────────────────────────────────
  registerGraph("bfs", { label: "Breadth-first search" }, (input, ops, graph) => {
    const adj = adjacency(graph)
    const start = input.start
    ops.init(`Breadth-first search from ${start} — explore the graph level by level using a first-in, first-out queue.`)
    const queue = [start]
    const seen = new Set([start])
    ops.enqueue(start, 0, `Enqueue the start node ${start} at distance 0.`)
    while (queue.length) {
      const u = queue.shift()
      ops.visit(u, `Dequeue ${u} (distance ${ops.dist(u)}) and mark it visited.`)
      for (const v of adj[u]) {
        if (seen.has(v)) continue
        ops.edge(u, v, `Explore edge ${u} → ${v}.`)
        seen.add(v)
        queue.push(v)
        ops.enqueue(v, ops.dist(u) + 1, `Discover ${v} — enqueue it at distance ${ops.dist(u) + 1}.`)
      }
    }
    ops.done(`Breadth-first search complete — visited ${ops.visitedCount} node${ops.visitedCount === 1 ? "" : "s"}.`)
  })

  // ==========================================================================
  //  5. RENDER  —  builds DOM only. Sets semantic classes + data attributes +
  //  data-driven geometry (bar heights, node coordinates). It sets NO colours
  //  or layout — every visual rule lives in STYLES (§1). To change appearance,
  //  edit §1, not this section.
  // ==========================================================================

  function injectStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return
    const style = document.createElement("style")
    style.id = STYLE_ID
    style.textContent = STYLES
    document.head.appendChild(style)
  }

  // ---- sort view: bars ----
  function makeSortView(frames) {
    const maxVal = Math.max(...frames[0].array, 1)
    const n = frames[0].array.length

    const stage = el("div", "steptrace__stage")
    const bars = []
    for (let k = 0; k < n; k++) {
      const bar = el("div", "steptrace__bar")
      const fill = el("div", "steptrace__fill")
      const num = el("div", "steptrace__num")
      const cue = el("div", "steptrace__cue")
      cue.setAttribute("aria-hidden", "true")
      bar.append(fill, num, cue)
      stage.append(bar)
      bars.push({ bar, fill, num, cue })
    }

    const status = statusEl()

    function paint(frame, i, total) {
      for (let k = 0; k < n; k++) {
        const b = bars[k]
        // data-driven geometry (the bar's value → height); not styling.
        b.fill.style.height = `${Math.max(2, (frame.array[k] / maxVal) * 100)}%`
        b.num.textContent = frame.array[k]
        let state = ""
        if (frame.sorted.includes(k)) state = "sorted"
        if (frame.candidate === k) state = "candidate"
        if (frame.active.includes(k)) state = frame.type === "swap" ? "swap" : "compare"
        b.bar.dataset.state = state
        b.cue.textContent = state === "sorted" ? "✓" : state === "candidate" ? "◦" : state ? "•" : ""
      }
      const key = frame.keyValue != null ? ` <span class="steptrace__key">key: ${frame.keyValue}</span>` : ""
      status.innerHTML =
        escapeHtml(frame.message) +
        key +
        ` <span class="steptrace__counts">· ${frame.comparisons} compares, ${frame.swaps} moves · step ${i + 1}/${total}</span>`
    }

    return { nodes: [stage, status], paint }
  }

  // ---- graph view: svg ----
  const SVGNS = "http://www.w3.org/2000/svg"
  const R = 18 // node radius

  function makeGraphView(frames, graph) {
    const pad = 34
    const xs = graph.nodes.map((n) => n.x)
    const ys = graph.nodes.map((n) => n.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const w = Math.max(...xs) - minX + pad * 2
    const h = Math.max(...ys) - minY + pad * 2
    const pos = Object.fromEntries(graph.nodes.map((n) => [n.id, { x: n.x - minX + pad, y: n.y - minY + pad }]))

    const svg = document.createElementNS(SVGNS, "svg")
    svg.setAttribute("class", "steptrace__svg")
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`)
    svg.setAttribute("role", "img")
    svg.setAttribute("aria-label", "Graph traversal")

    if (graph.directed) {
      const defs = document.createElementNS(SVGNS, "defs")
      defs.innerHTML =
        `<marker id="st-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
        `<path class="steptrace__arrow" d="M0,0 L10,5 L0,10 z"/></marker>`
      svg.append(defs)
    }

    // edges first (under nodes)
    const edgeEls = []
    for (const e of graph.edges) {
      const a = pos[e.from]
      const b = pos[e.to]
      const { x1, y1, x2, y2 } = trimToRadius(a, b, R + (graph.directed ? 3 : 0))
      const line = document.createElementNS(SVGNS, "line")
      line.setAttribute("class", "steptrace__edge")
      line.setAttribute("x1", x1)
      line.setAttribute("y1", y1)
      line.setAttribute("x2", x2)
      line.setAttribute("y2", y2)
      if (graph.directed) line.setAttribute("marker-end", "url(#st-arrow)")
      svg.append(line)
      edgeEls.push({ el: line, from: e.from, to: e.to })
      if (e.weight != null) {
        const label = document.createElementNS(SVGNS, "text")
        label.setAttribute("class", "steptrace__edge-label")
        label.setAttribute("x", (a.x + b.x) / 2)
        label.setAttribute("y", (a.y + b.y) / 2 - 4)
        label.setAttribute("text-anchor", "middle")
        label.textContent = e.weight
        svg.append(label)
      }
    }

    // nodes
    const nodeEls = {}
    for (const n of graph.nodes) {
      const p = pos[n.id]
      const g = document.createElementNS(SVGNS, "g")
      g.setAttribute("class", "steptrace__node")
      const circle = document.createElementNS(SVGNS, "circle")
      circle.setAttribute("cx", p.x)
      circle.setAttribute("cy", p.y)
      circle.setAttribute("r", R)
      const id = document.createElementNS(SVGNS, "text")
      id.setAttribute("class", "steptrace__id")
      id.setAttribute("x", p.x)
      id.setAttribute("y", p.y)
      id.setAttribute("text-anchor", "middle")
      id.setAttribute("dominant-baseline", "central")
      id.textContent = n.id
      const dist = document.createElementNS(SVGNS, "text")
      dist.setAttribute("class", "steptrace__d")
      dist.setAttribute("x", p.x)
      dist.setAttribute("y", p.y - R - 5)
      dist.setAttribute("text-anchor", "middle")
      g.append(circle, id, dist)
      svg.append(g)
      nodeEls[n.id] = { g, dist }
    }

    // aside: live queue + legend
    const aside = el("div", "steptrace__aside")
    const queueWrap = el("div")
    const queueLabel = el("div", "steptrace__queue-label")
    queueLabel.textContent = "Queue (front → back)"
    const queue = el("div", "steptrace__queue")
    queueWrap.append(queueLabel, queue)
    const legend = el("div", "steptrace__legend")
    const legendLabel = el("div", "steptrace__legend-label")
    legendLabel.textContent = "Legend"
    legend.append(legendLabel)
    for (const [word, stateKey] of [
      ["current", "current"],
      ["frontier (queued)", "frontier"],
      ["visited", "visited"],
    ]) {
      const row = el("div", "steptrace__legend-row")
      const sw = el("span", "steptrace__swatch steptrace__swatch--" + stateKey)
      row.append(sw, document.createTextNode(word))
      legend.append(row)
    }
    aside.append(queueWrap, legend)

    const graphWrap = el("div", "steptrace__graph")
    graphWrap.append(svg, aside)

    const status = statusEl()

    function paint(frame, i, total) {
      const visited = new Set(frame.visited)
      const frontier = new Set(frame.frontier)
      for (const n of graph.nodes) {
        const ne = nodeEls[n.id]
        let state = ""
        if (visited.has(n.id)) state = "visited"
        if (frontier.has(n.id)) state = "frontier"
        if (frame.current === n.id) state = "current"
        ne.g.dataset.state = state
        const d = frame.dist[n.id]
        ne.dist.textContent = d == null ? "" : `d:${d}`
      }
      for (const e of edgeEls) {
        const act =
          frame.edge &&
          ((frame.edge.from === e.from && frame.edge.to === e.to) ||
            (!graph.directed && frame.edge.from === e.to && frame.edge.to === e.from))
        e.el.dataset.active = act ? "true" : "false"
      }
      queue.replaceChildren()
      if (frame.frontier.length === 0) {
        const empty = el("span", "steptrace__queue-empty")
        empty.textContent = "empty"
        queue.append(empty)
      } else {
        for (const id of frame.frontier) {
          const chip = el("span", "steptrace__chip")
          chip.textContent = id
          queue.append(chip)
        }
      }
      status.innerHTML =
        escapeHtml(frame.message) +
        ` <span class="steptrace__counts">· ${frame.visited.length} visited · step ${i + 1}/${total}</span>`
    }

    return { nodes: [graphWrap, status], paint }
  }

  // ---- small DOM helpers (structure only; no styling) ----
  function trimToRadius(a, b, r) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    return { x1: a.x + ux * R, y1: a.y + uy * R, x2: b.x - ux * r, y2: b.y - uy * r }
  }

  function statusEl() {
    const status = el("div", "steptrace__status")
    status.setAttribute("role", "status")
    status.setAttribute("aria-live", "polite")
    return status
  }

  function el(tag, cls) {
    const n = document.createElement(tag)
    if (cls) n.className = cls
    return n
  }
  function spacer() {
    return el("span", "steptrace__spacer")
  }
  function button(label, glyph, extra) {
    const b = document.createElement("button")
    b.type = "button"
    b.className = "steptrace__btn" + (extra ? " " + extra : "")
    b.textContent = glyph
    b.setAttribute("aria-label", label)
    b.title = label
    return b
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
  }

  // ==========================================================================
  //  6. PLAYER  —  transport over precomputed frames. Step-back is a re-render
  //  at a lower index (free), because frames are immutable snapshots.
  // ==========================================================================

  class Player {
    constructor(frames, paint, speed) {
      this.frames = frames
      this.paint = paint
      this.i = 0
      this.speed = speed || 1
      this.playing = false
      this.timer = null
      this.baseDelay = 780
      this.onState = () => {}
    }
    render() {
      this.paint(this.frames[this.i], this.i, this.frames.length)
      this.onState()
    }
    _clear() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    }
    _loop() {
      if (!this.playing) return
      if (this.i >= this.frames.length - 1) {
        this.playing = false
        this.onState()
        return
      }
      this.timer = setTimeout(() => {
        this.i++
        this.render()
        this._loop()
      }, this.baseDelay / this.speed)
    }
    play() {
      if (this.i >= this.frames.length - 1) this.i = 0
      this.playing = true
      this.render()
      this.onState()
      this._loop()
    }
    pause() {
      this.playing = false
      this._clear()
      this.onState()
    }
    toggle() {
      this.playing ? this.pause() : this.play()
    }
    stepF() {
      this.pause()
      if (this.i < this.frames.length - 1) this.i++
      this.render()
    }
    stepB() {
      this.pause()
      if (this.i > 0) this.i--
      this.render()
    }
    reset() {
      this.pause()
      this.i = 0
      this.render()
    }
    setSpeed(s) {
      this.speed = s
    }
    destroy() {
      this.playing = false
      this._clear()
    }
  }

  // ==========================================================================
  //  7. MOUNT  —  assemble a card into `root` from a flat config, wire the
  //  toolbar + keyboard, and return { destroy } (host teardown: stops timers,
  //  drops listeners). sort: { algorithm, array?, speed? };
  //  graph: { algorithm, start?, directed?, nodes?, edges?, speed? }.
  // ==========================================================================

  function mount(root, config) {
    injectStyle()
    root.classList.add("steptrace")
    root.setAttribute("role", "group")
    root.setAttribute("aria-label", "Algorithm visualizer")

    const kind = kindOf(config.algorithm)
    if (!kind) {
      root.textContent = `steptrace: unknown algorithm "${config.algorithm}".`
      return { destroy: () => root.replaceChildren() }
    }

    const mq = matchMedia("(prefers-reduced-motion: reduce)")
    const applyMotion = () => root.classList.toggle("steptrace--reduced", mq.matches)
    mq.addEventListener("change", applyMotion)

    const state = {
      algorithm: config.algorithm,
      speed: config.speed || 1,
      array: Array.isArray(config.array) && config.array.length ? config.array.slice() : randomArray(),
      start: config.start != null ? String(config.start) : null,
      config,
    }

    let player = null

    // --- shared transport controls ---
    const btnReset = button("Reset", "↺")
    const btnBack = button("Step back", "⏮")
    const btnPlay = button("Play", "▶", "steptrace__play")
    const btnFwd = button("Step forward", "⏭")
    const stepLabel = el("span", "steptrace__step")

    const speedWrap = el("label", "steptrace__speed")
    const speedInput = document.createElement("input")
    speedInput.type = "range"
    speedInput.min = "0.25"
    speedInput.max = "4"
    speedInput.step = "0.25"
    speedInput.value = String(state.speed)
    speedInput.setAttribute("aria-label", "Playback speed")
    const speedVal = document.createElement("span")
    const showSpeed = () => (speedVal.textContent = `${Number(speedInput.value).toFixed(2)}×`)
    showSpeed()
    speedWrap.append("Speed ", speedInput, speedVal)

    // --- algorithm selector (algorithms of this kind) ---
    const algoSel = el("select")
    algoSel.setAttribute("aria-label", "Algorithm")
    for (const a of listAlgorithms(kind)) {
      const opt = document.createElement("option")
      opt.value = a.id
      opt.textContent = a.label
      if (a.id === state.algorithm) opt.selected = true
      algoSel.append(opt)
    }

    // --- kind-specific extra control (shuffle for sort, start-node for graph) ---
    let extra = null
    let startSel = null
    if (kind === "sort") {
      extra = button("Shuffle / new array", "⤨")
      extra.addEventListener("click", () => {
        state.array = randomArray()
        build()
      })
    } else {
      startSel = el("select")
      startSel.setAttribute("aria-label", "Start node")
      extra = startSel // populated after first build (needs the normalized graph)
    }

    const toolbar = el("div", "steptrace__toolbar")
    if (kind === "sort") {
      toolbar.append(algoSel, btnReset, btnBack, btnPlay, btnFwd, spacer(), speedWrap, extra, stepLabel)
    } else {
      toolbar.append(algoSel, startSel, btnReset, btnBack, btnPlay, btnFwd, spacer(), speedWrap, stepLabel)
    }

    const stageSlot = el("div")
    root.replaceChildren(stageSlot, toolbar)

    function syncButtons() {
      btnPlay.textContent = player.playing ? "❚❚" : "▶"
      btnPlay.setAttribute("aria-label", player.playing ? "Pause" : "Play")
      stepLabel.textContent = `${player.i + 1} / ${player.frames.length}`
    }

    function build() {
      if (player) player.destroy()
      const built = buildFrames({
        algorithm: state.algorithm,
        array: state.array,
        start: state.start,
        directed: state.config.directed,
        nodes: state.config.nodes,
        edges: state.config.edges,
      })
      const view = built.kind === "graph" ? makeGraphView(built.frames, built.graph) : makeSortView(built.frames)
      if (built.kind === "graph" && startSel) syncStartOptions(built.graph)
      stageSlot.replaceChildren(...view.nodes)
      player = new Player(built.frames, view.paint, state.speed)
      player.onState = syncButtons
      player.render()
      syncButtons()
    }

    function syncStartOptions(graph) {
      if (startSel.options.length && startSel.dataset.filled) return
      startSel.replaceChildren()
      for (const n of graph.nodes) {
        const opt = document.createElement("option")
        opt.value = n.id
        opt.textContent = `Start: ${n.id}`
        if (n.id === graph.start) opt.selected = true
        startSel.append(opt)
      }
      startSel.dataset.filled = "1"
      state.start = graph.start
    }

    build()

    // --- wiring ---
    algoSel.addEventListener("change", () => {
      state.algorithm = algoSel.value
      build()
    })
    if (startSel)
      startSel.addEventListener("change", () => {
        state.start = startSel.value
        build()
      })
    btnReset.addEventListener("click", () => player.reset())
    btnBack.addEventListener("click", () => player.stepB())
    btnPlay.addEventListener("click", () => player.toggle())
    btnFwd.addEventListener("click", () => player.stepF())
    speedInput.addEventListener("input", () => {
      state.speed = Number(speedInput.value)
      player.setSpeed(state.speed)
      showSpeed()
    })

    // keyboard: arrows step, space toggles — only when focus is inside the widget
    // and not on a form control; stopPropagation so host editors don't double-fire.
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === "ArrowRight") player.stepF()
      else if (e.key === "ArrowLeft") player.stepB()
      else if (e.key === " " || e.key === "Spacebar") player.toggle()
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    root.addEventListener("keydown", onKey)

    applyMotion()

    return {
      destroy() {
        if (player) player.destroy()
        mq.removeEventListener("change", applyMotion)
        root.removeEventListener("keydown", onKey)
        root.replaceChildren()
        root.classList.remove("steptrace", "steptrace--reduced")
      },
    }
  }

  // randomArray lives in the host layer (mount), never the pure engine, so
  // buildFrames stays deterministic. Distinct-ish heights 5..62.
  function randomArray(n = 12) {
    const pool = []
    for (let v = 5; v <= 62; v++) pool.push(v)
    for (let k = pool.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1))
      ;[pool[k], pool[r]] = [pool[r], pool[k]]
    }
    return pool.slice(0, n)
  }

  // ---- public API (the same object becomes globalThis.steptrace / module.exports) ----
  return {
    VERSION,
    registerSort,
    registerGraph,
    listAlgorithms,
    kindOf,
    buildFrames,
    adjacency,
    mount,
  }
})
