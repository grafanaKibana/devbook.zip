// ==========================================================================
//  3. RECORDERS  —  turn semantic ops.* calls into immutable step frames.
//  An algorithm NEVER builds a frame; it only calls ops.*. The Recorder owns
//  all state and freezes a snapshot per step, so the renderer paints frames
//  verbatim and step-back is free.
// ==========================================================================

// A SortFrame snapshot: { type, array, sorted[], active[], candidate|null,
//   keyValue|null, comparisons, swaps, message }.
export class SortRecorder {
  [key: string]: any
  constructor(array) {
    this.a = array.slice()
    this.frames = []
    this._sorted = new Set()
    this.comparisons = 0
    this.swaps = 0
    this._cand = null
    this._key = null
    this._range = null // [lo, hi] active subarray (quick/merge); null = whole array
    this._pivot = null // pivot index (quick); persists across the partition's frames
  }

  /** Current array as a defensive copy (algorithms read live values through this). */
  get value() {
    return this.a.slice()
  }

  _push(type, active, message) {
    const frame: any = {
      type,
      array: this.a.slice(),
      sorted: [...this._sorted].sort((x, y) => x - y),
      active: active.slice(),
      candidate: this._cand,
      keyValue: this._key,
      comparisons: this.comparisons,
      swaps: this.swaps,
      message,
    }
    // Optional recursion-aware fields — absent unless the algorithm set them,
    // so bubble/insertion/selection frames stay byte-identical.
    if (this._range) frame.range = this._range.slice()
    if (this._pivot != null) frame.pivot = this._pivot
    if (this._from != null) frame.from = this._from
    this.frames.push(Object.freeze(frame))
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

  /** Overwrite index i with value v (insertion-style shift); counts as a move.
   *  `from` is the index the value travelled from — the view animates the bar
   *  sliding along that path. Omit when the value has no on-screen origin. */
  overwrite(i, v, message, from = null) {
    this.a[i] = v
    this.swaps++
    this._from = from == null ? null : from
    this._push("overwrite", [i], message)
    this._from = null
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

  /** Set the active subarray [lo, hi] carried into later frames (pass lo=null to
   *  clear). Emits no frame — state only, like holdKey. */
  range(lo, hi = null) {
    this._range = lo == null ? null : [lo, hi]
  }

  /** Set the pivot index carried into later frames (pass null to clear). Emits
   *  no frame — state only. */
  pivot(idx) {
    this._pivot = idx == null ? null : idx
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
    this._range = null
    this._pivot = null
    this._from = null
  }

  done(message) {
    this.clearMarks()
    this._push("done", [], message)
  }
}

export class ArraySortRecorder extends SortRecorder {
  constructor(array, profile = "shell") {
    super(array)
    this._profile = profile
    this._movementUnit = profile === "shell" || profile === "introsort" ? "moves" : "swaps"
    this._showComparisons = profile !== "cyclic"
    this._gap = null
    this._subsequence = null
    this._passSwapped = null
    this._cursor = null
    this._home = null
    this._keyOrigin = null
    this._hole = null
    this._tokenSerial = 0
    this._tokenId = null
    this._strategy = null
    this._depthUsed = null
    this._depthLimit = null
    this._cutoff = null
  }

  _push(type, active, message) {
    super._push(type, active, message)
    const frame = this.frames[this.frames.length - 1]
    this.frames[this.frames.length - 1] = Object.freeze({
      ...frame,
      profile: this._profile,
      movementUnit: this._movementUnit,
      showComparisons: this._showComparisons,
      gap: this._gap,
      subsequence: this._subsequence ? this._subsequence.slice() : null,
      passSwapped: this._passSwapped,
      cursor: this._cursor,
      home: this._home,
      keyOrigin: this._keyOrigin,
      hole: this._hole,
      tokenId: this._tokenId,
      strategy: this._strategy,
      depthUsed: this._depthUsed,
      depthLimit: this._depthLimit,
      cutoff: this._cutoff,
    })
  }

  beginGap(gap, message) {
    this._gap = gap
    this._subsequence = null
    this._passSwapped = false
    this._push("gap", [], message)
  }

  selectSubsequence(indices, message) {
    this._subsequence = indices.slice()
    this._push("subsequence", indices, message)
  }

  compareGapPair(left, right, message) {
    this._subsequence = [left, right]
    this.compare(left, right, message)
  }

  swapGapPair(left, right, message) {
    this._subsequence = [left, right]
    this._passSwapped = true
    this.swap(left, right, message)
  }

  endGap(swapped, message) {
    this._passSwapped = swapped
    this._subsequence = null
    this._push("gap-complete", [], message)
  }

  inspectHome(cursor, home, message) {
    this._cursor = cursor
    this._home = home
    this._push("home-check", [cursor, home], message)
  }

  swapHome(cursor, home, message) {
    this._cursor = cursor
    this._home = home
    this.swap(cursor, home, message)
  }

  settleHome(index, message) {
    this._cursor = index
    this._home = index
    this.markSorted([index], [index], message)
  }

  holdKeyAt(value, origin, message) {
    this._key = value
    this._keyOrigin = origin
    this._hole = origin
    this._tokenId = ++this._tokenSerial
    this._push("hold-key", [], message)
  }

  compareHeldAt(index, message) {
    this.comparisons++
    this._push("compare-held", [index], message)
  }

  shiftHeld(to, from, message) {
    this.a[to] = this.a[from]
    this.swaps++
    this._from = from
    this._hole = from
    this._push("shift-held", [to], message)
    this._from = null
  }

  placeHeld(index, value, message) {
    this.a[index] = value
    this.swaps++
    this._push("place-held", [index], message)
  }

  releaseHeldKey() {
    this._key = null
    this._keyOrigin = null
    this._hole = null
    this._tokenId = null
  }

  configureIntrosort(depthLimit, cutoff) {
    this._depthLimit = depthLimit
    this._cutoff = cutoff
  }

  introsortStrategy(strategy, depthUsed, type, message) {
    this._strategy = strategy
    this._depthUsed = depthUsed
    this._push(type, [], message)
  }

  clearMarks() {
    super.clearMarks()
    this._subsequence = null
    this._passSwapped = null
    this._cursor = null
    this._home = null
    this._keyOrigin = null
    this._hole = null
    this._tokenId = null
    this._strategy = null
    this._depthUsed = null
  }
}

// A GraphFrame snapshot: { type, visited[], frontier[], current|null,
//   edge:{from,to}|null, dist:{id:number}, message }.
export class GraphRecorder {
  [key: string]: any
  constructor(graph) {
    this.graph = graph
    this.frames = []
    this._visited = new Set()
    this._frontier = []
    this._dist = {}
    this._current = null
    this._selected = [] // edges in the built tree (MST) — stay highlighted
    this._target = null // search goal (bfs/dfs) — constant across frames
  }

  /** Declare the node this traversal is searching for (call before init). */
  target(id) {
    this._target = id == null ? null : String(id)
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
        selected: this._selected.map((s) => s.slice()),
        target: this._target,
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

  /** Relax a node to a shorter distance (Dijkstra): update its distance and
   *  make sure it is shown in the frontier. */
  relax(node, d, message) {
    this._dist[node] = d
    if (this._frontier.indexOf(node) < 0) this._frontier.push(node)
    this._push("relax", null, message)
  }

  /** Explore an edge u -> v (highlight only; no state change). */
  edge(u, v, message) {
    this._push("edge", { from: u, to: v }, message)
  }

  /** Add an edge to the built tree (MST) — it stays highlighted afterwards. */
  selectEdge(u, v, message) {
    this._selected.push([u, v])
    this._push("select", { from: u, to: v }, message)
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

// A SearchRecorder snapshot: { type, array, lo, hi, mid, found, target,
//   comparisons, message }. Rendered as a bar row with the live [lo, hi] range,
//   the probed middle, and the eliminated halves faded out.
export class SearchRecorder {
  [key: string]: any
  constructor(array, target) {
    this.a = (array || []).slice()
    this.target = target
    this.frames = []
    this.lo = 0
    this.hi = this.a.length - 1
    this.mid = null
    this.found = null
    this.comparisons = 0
    // "range" = eliminating search (binary): watch shows the live [lo, hi].
    // "scan"  = linear scan: nothing is eliminated, so watch shows progress.
    this.mode = "range"
  }
  get value() {
    return this.a.slice()
  }
  _push(type, message) {
    this.frames.push(
      Object.freeze({
        type,
        array: this.a.slice(),
        lo: this.lo,
        hi: this.hi,
        mid: this.mid,
        found: this.found,
        target: this.target,
        comparisons: this.comparisons,
        mode: this.mode,
        message,
      }),
    )
  }
  init(message) {
    this._push("init", message)
  }
  /** Probe the middle of the current [lo, hi] range. */
  probe(lo, hi, mid, message) {
    this.lo = lo
    this.hi = hi
    this.mid = mid
    this.comparisons++
    this._push("probe", message)
  }
  /** Narrow the range after a probe (discard a half). */
  narrow(lo, hi, message) {
    this.lo = lo
    this.hi = hi
    this.mid = null
    this._push("narrow", message)
  }
  /** Mark the target found at index mid. */
  hit(mid, message) {
    this.found = mid
    this.mid = mid
    this._push("found", message)
  }
  done(message) {
    this._push("done", message)
  }
}

export class IndexedSearchRecorder extends SearchRecorder {
  constructor(config) {
    super(config.array, config.target)
    this._profile = config.profile
    this._phase =
      config.profile === "exponential"
        ? "gallop"
        : config.profile === "jump"
          ? "jump"
          : config.profile
    this._goal = config.goal ?? null
    this._blockSize = config.blockSize ?? null
    this._bound = null
    this._previousBound = -1
    this._bracket = null
    this._mid2 = null
  }

  _push(type, message) {
    super._push(type, message)
    const frame = this.frames[this.frames.length - 1]
    this.frames[this.frames.length - 1] = Object.freeze({
      ...frame,
      profile: this._profile,
      phase: this._phase,
      bound: this._bound,
      previousBound: this._previousBound,
      bracket: this._bracket ? this._bracket.slice() : null,
      mid2: this._mid2,
      goal: this._goal,
      blockSize: this._blockSize,
    })
  }

  probe(lo, hi, mid, message) {
    this._mid2 = null
    super.probe(lo, hi, mid, message)
  }

  dualProbe(lo, hi, mid, mid2, message) {
    this.lo = lo
    this.hi = hi
    this.mid = mid
    this._mid2 = mid2
    this.comparisons += 2
    this._push("probe", message)
  }

  narrow(lo, hi, message) {
    this._mid2 = null
    super.narrow(lo, hi, message)
  }

  hit(mid, message) {
    this._mid2 = null
    super.hit(mid, message)
  }

  strideProbe(phase, previousBound, bound, message) {
    this._phase = phase
    this._previousBound = previousBound
    this._bound = bound
    this._mid2 = null
    this.lo = Math.max(0, previousBound + 1)
    this.hi = bound
    this.mid = bound
    this.comparisons++
    this._push("probe", message)
  }

  gallopProbe(previousBound, bound, message) {
    this.strideProbe("gallop", previousBound, bound, message)
  }

  jumpProbe(previousBound, bound, message) {
    this.strideProbe("jump", previousBound, bound, message)
  }

  beginPhase(
    lo,
    hi,
    message,
    phase: "binary" | "scan" | "ternary" = "binary",
  ) {
    this._phase = phase
    this._bracket = [lo, hi]
    this.lo = lo
    this.hi = hi
    this.mid = null
    this._mid2 = null
    this._push("phase", message)
  }
}

// A StringRecorder snapshot: { text, pattern, shift, cmpT, cmpP, cmpResult,
//   found[], hash, message }. Renders the text with the pattern aligned under
//   it at `shift`; compared cells and matched regions are highlighted.
export class StringRecorder {
  [key: string]: any
  constructor(text, pattern) {
    this.text = String(text || "")
    this.pattern = String(pattern || "")
    this.frames = []
    this.shift = 0
    this.found = []
    this.hash = null
  }
  _push(type, extra, message) {
    this.frames.push(
      Object.freeze({
        type,
        text: this.text,
        pattern: this.pattern,
        shift: this.shift,
        cmpT: extra.cmpT == null ? null : extra.cmpT,
        cmpP: extra.cmpP == null ? null : extra.cmpP,
        cmpResult: extra.cmpResult || null,
        found: this.found.slice(),
        hash: this.hash,
        message,
      }),
    )
  }
  init(message) {
    this._push("init", {}, message)
  }
  /** Compare text[ti] with pattern[pj] at alignment `shift`. */
  compare(ti, pj, shift, isMatch, message) {
    this.shift = shift
    this._push(
      "compare",
      { cmpT: ti, cmpP: pj, cmpResult: isMatch ? "match" : "mismatch" },
      message,
    )
  }
  /** Slide the pattern to a new alignment. */
  slide(shift, message) {
    this.shift = shift
    this._push("slide", {}, message)
  }
  /** Record a full match starting at `shift`. */
  matchAt(shift, message) {
    this.shift = shift
    if (this.found.indexOf(shift) < 0) this.found.push(shift)
    this._push("match", {}, message)
  }
  /** Rabin-Karp: show the window hash vs the pattern hash (stays visible after). */
  hashStep(shift, windowHash, patternHash, message) {
    this.shift = shift
    this.hash = { window: windowHash, pattern: patternHash }
    this._push("hash", {}, message)
  }
  done(message) {
    this._push("done", {}, message)
  }
}

// A PointerRecorder snapshot: { array, pointers{name:idx}, window[lo,hi]|null,
//   marked[], message }. Renders a value-cell row with named pointer markers,
//   an optional highlighted window, and marked (result) cells.
export class PointerRecorder {
  [key: string]: any
  constructor(array) {
    this.a = (array || []).slice()
    this.frames = []
    this.pointers = {}
    this.window = null
    this.marked = []
  }
  get value() {
    return this.a.slice()
  }
  _push(type, message) {
    this.frames.push(
      Object.freeze({
        type,
        array: this.a.slice(),
        pointers: { ...this.pointers },
        window: this.window ? this.window.slice() : null,
        marked: this.marked.slice(),
        message,
      }),
    )
  }
  init(message) {
    this._push("init", message)
  }
  /** One logical step: update named pointers, the window span, and/or marks. */
  step(update, message) {
    update = update || {}
    if (update.pointers) this.pointers = { ...update.pointers }
    if ("window" in update) this.window = update.window ? update.window.slice() : null
    if (update.mark) this.marked = this.marked.concat(update.mark)
    this._push(update.mark ? "match" : "step", message)
  }
  done(message) {
    this._push("done", message)
  }
}

// A DPRecorder snapshot: { rowLabels, colLabels, grid, cur, deps, path, message }.
//   Rendered as a 2-D table that fills cell by cell, highlighting the current
//   cell, the cells it reads (deps), and the final backtrack path.
export class DPRecorder {
  [key: string]: any
  constructor() {
    this.frames = []
    this.rowLabels = []
    this.colLabels = []
    this.grid = []
    this.cur = null
    this.deps = []
    this.path = []
  }
  board(rowLabels, colLabels, message) {
    this.rowLabels = rowLabels.slice()
    this.colLabels = colLabels.slice()
    this.grid = rowLabels.map(() => colLabels.map(() => null))
    this._push("init", message)
  }
  set(r, c, val, deps, message) {
    this.cur = [r, c]
    this.deps = (deps || []).map((d) => d.slice())
    this.grid[r][c] = val
    this._push("compute", message)
  }
  markPath(cells, message) {
    this.path = cells.map((p) => p.slice())
    this.cur = null
    this.deps = []
    this._push("trace", message)
  }
  done(message) {
    this.cur = null
    this.deps = []
    this._push("done", message)
  }
  _push(type, message) {
    this.frames.push(
      Object.freeze({
        type,
        rowLabels: this.rowLabels.slice(),
        colLabels: this.colLabels.slice(),
        grid: this.grid.map((row) => row.slice()),
        cur: this.cur ? this.cur.slice() : null,
        deps: this.deps.map((d) => d.slice()),
        path: this.path.map((p) => p.slice()),
        message,
      }),
    )
  }
}

// A UnionFindRecorder snapshot: { n, parent[], roots[], highlight[], activeEdge,
//   message }. Rendered as a row of elements with parent-pointer arcs above;
//   nodes are coloured by their set (root).
export class UnionFindRecorder {
  [key: string]: any
  constructor(n) {
    this.n = n
    this.parent = Array.from({ length: n }, (_, i) => i)
    this.frames = []
    this.highlight = []
    this.activeEdge = null
  }
  _root(x) {
    while (this.parent[x] !== x) x = this.parent[x]
    return x
  }
  _push(type, message) {
    const roots = []
    for (let i = 0; i < this.n; i++) roots.push(this._root(i))
    this.frames.push(
      Object.freeze({
        type,
        n: this.n,
        parent: this.parent.slice(),
        roots,
        highlight: this.highlight.slice(),
        activeEdge: this.activeEdge ? this.activeEdge.slice() : null,
        message,
      }),
    )
  }
  init(message) {
    this._push("init", message)
  }
  /** Highlight the parent-pointer path root-ward from a node. */
  findPath(path, message) {
    this.highlight = path.slice()
    this.activeEdge = null
    this._push("find", message)
  }
  /** Point `child` at `par` (a union link or path compression). */
  setParent(child, par, message) {
    this.parent[child] = par
    this.activeEdge = [child, par]
    this._push("link", message)
  }
  /** Clear transient highlights. */
  clear(message) {
    this.highlight = []
    this.activeEdge = null
    this._push("clear", message)
  }
  done(message) {
    this.highlight = []
    this.activeEdge = null
    this._push("done", message)
  }
}

// A BitsRecorder snapshot: { type, width, labels{a,b,r}, a, b, r, value, sub,
//   low, pop, total, just, message }. Three aligned lanes read as an equation
//   (a = x, b = x−1, r = x & (x−1)); each lane is { bits[width] (bits[0]=LSB),
//   state[width], live }. `total` = popcount of the ORIGINAL value (the tally
//   width, fixed for zero jitter), `pop` = how many 1s cleared so far, `just` =
//   the tally square that filled on THIS frame (−1 otherwise). Three states
//   only: die / borrow / gone. The algorithm only calls ops.* — never a frame.
export class BitsRecorder {
  [key: string]: any
  constructor(width) {
    this.width = width
    this.mask = 2 ** width - 1
    this.frames = []
    this.a = this._lane()
    this.b = this._lane()
    this.r = this._lane()
    this.a.live = true
    this.labels = { a: "x", b: "− 1", r: "&" }
    this.value = 0
    this.sub = null
    this.low = -1
    this.pop = 0
    this.total = 0
    this.just = -1
    this._result = 0
  }
  _lane() {
    return { bits: Array(this.width).fill(0), state: Array(this.width).fill(""), live: false }
  }
  /** Zero-padded binary string, MSB-left, `width` chars. */
  bin(x) {
    return ((x >>> 0) & this.mask).toString(2).padStart(this.width, "0")
  }
  /** Index of the lowest set bit (bits[0]=LSB), or -1 when x is zero. */
  lowestSetBit(x) {
    x = (x >>> 0) & this.mask
    return x === 0 ? -1 : 31 - Math.clz32(x & -x)
  }
  /** Population count — the number of iterations (and the tally width). */
  popcount(x) {
    x = (x >>> 0) & this.mask
    let c = 0
    while (x) {
      x &= x - 1
      c++
    }
    return c
  }
  _fill(lane, x) {
    x = (x >>> 0) & this.mask
    for (let i = 0; i < this.width; i++) lane.bits[i] = (x >> i) & 1
  }
  _snap(lane) {
    return { bits: lane.bits.slice(), state: lane.state.slice(), live: lane.live }
  }
  _push(type, message) {
    this.frames.push(
      Object.freeze({
        type,
        width: this.width,
        labels: { ...this.labels },
        a: this._snap(this.a),
        b: this._snap(this.b),
        r: this._snap(this.r),
        value: this.value,
        sub: this.sub,
        low: this.low,
        pop: this.pop,
        total: this.total,
        just: this.just,
        message,
      }),
    )
  }
  init(x, labels, message) {
    this.value = (x >>> 0) & this.mask
    if (labels) this.labels = { a: labels.a, b: labels.b, r: labels.r }
    this.total = this.popcount(this.value)
    this._fill(this.a, this.value)
    this.a.state.fill("")
    this.a.live = true
    this.b = this._lane()
    this.r = this._lane()
    this.low = -1
    this.sub = null
    this.pop = 0
    this.just = -1
    this._push("init", message)
  }
  /** Locate + decrement in one beat: in lane x the lowest 1 turns amber (it is
   *  about to die); lane x−1 goes live showing that 1 flipped to 0 (amber) and
   *  the zeros beneath it borrowed up to 1 (blue). */
  subtract(sub, low, message) {
    this.sub = (sub >>> 0) & this.mask
    this.low = low
    this.just = -1
    this.a.state.fill("")
    this.a.state[low] = "die"
    this.b.live = true
    this._fill(this.b, this.sub)
    this.b.state.fill("")
    this.b.state[low] = "die"
    for (let i = 0; i < low; i++) this.b.state[i] = "borrow"
    this._push("subtract", message)
  }
  /** AND the two lanes: lane r goes live; bit `low` and everything under it are
   *  struck out (gone), the surviving 1s above stay plain. Lane x keeps its
   *  amber marker so the eye tracks the removed bit across the equation. */
  and(res, low, message) {
    this._result = (res >>> 0) & this.mask
    this.low = low
    this.just = -1
    this.b.state.fill("")
    this.r.live = true
    this._fill(this.r, this._result)
    this.r.state.fill("")
    for (let i = 0; i <= low; i++) this.r.state[i] = "gone"
    this._push("and", message)
  }
  /** Commit x ← result: lane x becomes the survivors, lanes b/r dim back to
   *  placeholders, and one more tally square fills (just = its index). */
  commit(message) {
    this.value = this._result
    this._fill(this.a, this.value)
    this.a.state.fill("")
    this.b = this._lane()
    this.r = this._lane()
    this.low = -1
    this.just = this.pop
    this.pop += 1
    this._push("commit", message)
  }
  done(message) {
    this.low = -1
    this.just = -1
    this._push("done", message)
  }
}

// A BacktrackRecorder snapshot: { type, n, queens[n] (col|null per row = the
//   root-to-node path), cursor:{row,col}|null (the square being tried / torn
//   off), conflict:{row,col}|null (the attacker above that vetoes cursor),
//   placed, pruned, depth, solved, message }. The board IS the tree: row =
//   recursion depth, queen columns = the current partial candidate. `attacked`
//   is NOT stored — the renderer derives it from `queens` (small frames).
export class BacktrackRecorder {
  [key: string]: any
  constructor() {
    this.n = 0
    this.frames = []
    this._queens = []
    this.placed = 0
    this.pruned = 0
    this.depth = 0
    this._solved = false
  }
  /** Committed placements, live (algorithm reads this for its conflict check). */
  get queens() {
    return this._queens.slice()
  }
  _push(type, cursor, conflict, message) {
    this.frames.push(
      Object.freeze({
        type,
        n: this.n,
        queens: this._queens.slice(),
        cursor,
        conflict,
        placed: this.placed,
        pruned: this.pruned,
        depth: this.depth,
        solved: this._solved,
        message,
      }),
    )
  }
  board(n, message) {
    this.n = n
    this._queens = Array(n).fill(null)
    this._push("board", null, null, message)
  }
  /** Try (row,col) fails: it clashes with the queen already in `attackerRow`. */
  reject(row, col, attackerRow, message) {
    this.pruned++
    this._push(
      "reject",
      { row, col },
      { row: attackerRow, col: this._queens[attackerRow] },
      message,
    )
  }
  place(row, col, message) {
    this._queens[row] = col
    this.placed++
    this.depth++
    this._push("place", { row, col }, null, message)
  }
  /** Retreat: capture the square BEFORE clearing so the renderer flashes the tear-off. */
  backtrack(row, message) {
    const cursor = { row, col: this._queens[row] }
    this._queens[row] = null
    this.depth--
    this._push("backtrack", cursor, null, message)
  }
  solved(message) {
    this._solved = true
    this._push("solved", null, null, message)
  }
  done(message) {
    this._push("done", null, null, message)
  }
}

// A RecTreeRecorder snapshot: { type, nodes:[{id,label,x,y,depth}], edges:[{from,to}],
//   active:id|null, vis:[ids], state:{id->"compute"|"base"|"miss"|"hit"}, vals:{id->v},
//   collapsed:[ids], memo:[{k,v}], calls, hits, phase:"naive"|"memo", message }.
//   nodes/edges are the FULL naive tree, laid out ONCE and frozen — the SAME
//   arrays are handed to every frame, so the renderer's node set / viewBox /
//   stage height never change (zero jitter). Reveal is a per-node vis toggle;
//   a cache hit adds a subtree to `collapsed` (dimmed) — nothing is inserted or
//   removed. `calls` is the running count for the ACTIVE phase (reset on memo).
export class RecTreeRecorder {
  [key: string]: any
  constructor() {
    this.frames = []
    this._nodes = Object.freeze([])
    this._edges = Object.freeze([])
    this._vis = new Set()
    this._state = {}
    this._vals = {}
    this._collapsed = new Set()
    this._memo = []
    this.calls = 0
    this.hits = 0
    this._phase = "naive"
    this._active = null
  }
  _push(type, message) {
    this.frames.push(
      Object.freeze({
        type,
        nodes: this._nodes,
        edges: this._edges,
        active: this._active,
        vis: Object.freeze([...this._vis]),
        state: Object.freeze({ ...this._state }),
        vals: Object.freeze({ ...this._vals }),
        collapsed: Object.freeze([...this._collapsed]),
        memo: Object.freeze(this._memo.map((m) => Object.freeze({ ...m }))),
        calls: this.calls,
        hits: this.hits,
        phase: this._phase,
        message,
      }),
    )
  }
  /** The full naive call tree — laid out once, reused (same frozen arrays) forever. */
  tree(nodes, edges, message) {
    this._nodes = Object.freeze(nodes.map((n) => Object.freeze({ ...n })))
    this._edges = Object.freeze(edges.map((e) => Object.freeze({ ...e })))
    this._active = null
    this._push("tree", message)
  }
  /** Enter a new phase: "memo" re-runs the SAME tree, so wipe reveal + counters. */
  phase(name, message) {
    this._phase = name
    if (name === "memo") {
      this._vis = new Set()
      this._state = {}
      this._vals = {}
      this._collapsed = new Set()
      this._memo = []
      this.calls = 0
      this.hits = 0
    }
    this._active = null
    this._push("phase", message)
  }
  /** naive: an internal call — recompute both children from scratch. */
  enter(id, message) {
    this._active = id
    this._vis.add(id)
    this._state[id] = "compute"
    this.calls++
    this._push("enter", message)
  }
  /** naive: a base case leaf (k < 2). */
  base(id, val, message) {
    this._active = id
    this._vis.add(id)
    this._state[id] = "base"
    this._vals[id] = val
    this.calls++
    this._push("base", message)
  }
  /** memo: first sight of f(k) — compute + store it. */
  miss(id, k, val, message) {
    this._active = id
    this._vis.add(id)
    this._state[id] = "miss"
    this._vals[id] = val
    this._memo.push({ k, v: val })
    this.calls++
    this._push("miss", message)
  }
  /** memo: f(k) already stored — reuse it and collapse (dim) the subtree it saved. */
  hit(id, k, val, subtreeIds, message) {
    this._active = id
    this._vis.add(id)
    this._state[id] = "hit"
    this._vals[id] = val
    for (const s of subtreeIds) {
      this._vis.add(s) // reveal the saved subtree, but dimmed via collapsed
      this._collapsed.add(s)
    }
    this.calls++
    this.hits++
    this._push("hit", message)
  }
  done(message) {
    this._active = null
    this._push("done", message)
  }
}
