  // ---- public API (the same object becomes globalThis.steptrace / module.exports) ----
  return {
    VERSION,
    registerSort,
    registerGraph,
    registerSearch,
    registerString,
    registerPointer,
    registerDP,
    registerUnionFind,
    registerBits,
    registerBacktrack,
    registerRecTree,
    listAlgorithms,
    kindOf,
    buildFrames,
    adjacency,
    mount,
  }
}); // trailing ";" is load-bearing — an ASI guard so this IIFE stays separate when concatenated into Obsidian's main.js.
