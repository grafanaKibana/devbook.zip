  // ==========================================================================
  //  2. REGISTRY  —  the extension surface.
  //  Adding an algorithm = one registerSort/registerGraph call — from §4 below
  //  (a built-in) OR at runtime, e.g. from the Obsidian settings UI:
  //     steptrace.registerSort("my-sort", { label: "My sort" }, (input, ops) => {…})
  //  buildFrames() is pure (no DOM): it runs the algorithm once into frames.
  // ==========================================================================

  const sortReg = new Map()
  const graphReg = new Map()
  const searchReg = new Map()
  const stringReg = new Map()
  const pointerReg = new Map()
  const dpReg = new Map()
  const ufReg = new Map()
  const bitsReg = new Map()
  const btReg = new Map()
  const rtReg = new Map()

  /** Register a sort algorithm. `fn(input, ops)` drives a SortRecorder via ops.*. */
  function registerSort(id, meta, fn) {
    sortReg.set(id, { meta, fn })
  }

  /** Register a graph algorithm. `fn(input, ops, graph)` drives a GraphRecorder. */
  function registerGraph(id, meta, fn) {
    graphReg.set(id, { meta, fn })
  }

  /** Register a search algorithm (array + target). `fn(input, ops)` drives a SearchRecorder. */
  function registerSearch(id, meta, fn) {
    searchReg.set(id, { meta, fn })
  }

  /** Register a string-matching algorithm (text + pattern). `fn(input, ops)` drives a StringRecorder. */
  function registerString(id, meta, fn) {
    stringReg.set(id, { meta, fn })
  }

  /** Register an array-pointer algorithm (array + target). `fn(input, ops)` drives a PointerRecorder. */
  function registerPointer(id, meta, fn) {
    pointerReg.set(id, { meta, fn })
  }

  /** Register a DP-table algorithm. `fn(input, ops)` drives a DPRecorder (2-D grid). */
  function registerDP(id, meta, fn) {
    dpReg.set(id, { meta, fn })
  }

  /** Register a union-find algorithm. `fn(input, ops)` drives a UnionFindRecorder (forest). */
  function registerUnionFind(id, meta, fn) {
    ufReg.set(id, { meta, fn })
  }

  /** Register a bit-manipulation algorithm. `fn(input, ops)` drives a BitsRecorder (3 lanes). */
  function registerBits(id, meta, fn) {
    bitsReg.set(id, { meta, fn })
  }

  /** Register a backtracking algorithm. `fn(input, ops)` drives a BacktrackRecorder (board + path). */
  function registerBacktrack(id, meta, fn) {
    btReg.set(id, { meta, fn })
  }

  /** Register a recursion-tree algorithm. `fn(input, ops)` drives a RecTreeRecorder (naive tree → memo DAG). */
  function registerRecTree(id, meta, fn) {
    rtReg.set(id, { meta, fn })
  }

  /** Kind of a registered algorithm id, or null if unknown. */
  function kindOf(id) {
    if (sortReg.has(id)) return "sort"
    if (graphReg.has(id)) return "graph"
    if (searchReg.has(id)) return "search"
    if (stringReg.has(id)) return "string"
    if (pointerReg.has(id)) return "pointers"
    if (dpReg.has(id)) return "dp"
    if (ufReg.has(id)) return "unionfind"
    if (bitsReg.has(id)) return "bits"
    if (btReg.has(id)) return "backtrack"
    if (rtReg.has(id)) return "rectree"
    return null
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
      const { fn, meta } = graphReg.get(config.algorithm)
      const rec = new GraphRecorder(graph)
      fn({ ...config, start: graph.start }, rec, graph)
      return { kind: "graph", frames: rec.frames, graph, frontierLabel: meta.frontierLabel }
    }
    if (searchReg.has(config.algorithm)) {
      const { fn } = searchReg.get(config.algorithm)
      const rec = new SearchRecorder(config.array, config.target)
      fn(config, rec)
      return { kind: "search", frames: rec.frames }
    }
    if (stringReg.has(config.algorithm)) {
      const { fn } = stringReg.get(config.algorithm)
      const rec = new StringRecorder(config.text, config.pattern)
      fn(config, rec)
      return { kind: "string", frames: rec.frames }
    }
    if (pointerReg.has(config.algorithm)) {
      const { fn } = pointerReg.get(config.algorithm)
      const rec = new PointerRecorder(config.array)
      fn(config, rec)
      return { kind: "pointers", frames: rec.frames }
    }
    if (dpReg.has(config.algorithm)) {
      const { fn } = dpReg.get(config.algorithm)
      const rec = new DPRecorder()
      fn(config, rec)
      return { kind: "dp", frames: rec.frames }
    }
    if (ufReg.has(config.algorithm)) {
      const { fn } = ufReg.get(config.algorithm)
      const rec = new UnionFindRecorder(config.n || 7)
      fn(config, rec)
      return { kind: "unionfind", frames: rec.frames }
    }
    if (bitsReg.has(config.algorithm)) {
      const { fn } = bitsReg.get(config.algorithm)
      const rec = new BitsRecorder(config.width || 8)
      fn(config, rec)
      return { kind: "bits", frames: rec.frames }
    }
    if (btReg.has(config.algorithm)) {
      const { fn } = btReg.get(config.algorithm)
      const rec = new BacktrackRecorder()
      fn(config, rec)
      return { kind: "backtrack", frames: rec.frames }
    }
    if (rtReg.has(config.algorithm)) {
      const { fn } = rtReg.get(config.algorithm)
      const rec = new RecTreeRecorder()
      fn(config, rec)
      return { kind: "rectree", frames: rec.frames }
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

