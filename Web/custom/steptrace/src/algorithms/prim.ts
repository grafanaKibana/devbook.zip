import type { GraphAlgorithmDefinition } from "../types"

// ───────────────────────────────── prim ────────────────────────────────
export const prim = {
  id: "prim",
  kind: "graph",
  meta: { label: "Prim's MST", frontierLabel: "Frontier" },
  run: (input, ops, graph) => {
    const adj = {}
    for (const nd of graph.nodes) adj[nd.id] = []
    for (const e of graph.edges) {
      const w = e.weight == null ? 1 : e.weight
      adj[e.from].push({ to: e.to, w })
      if (!graph.directed) adj[e.to].push({ to: e.from, w })
    }
    const start = input.start
    ops.init(
      `Prim's algorithm — grow a minimum spanning tree from ${start}, each step adding the cheapest edge that reaches a node not yet in the tree.`,
    )
    const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a)
    const inTree = new Set([start])
    const treeEdges = new Set() // pairKeys already in the MST — silent, never re-flagged
    const skipped = new Set() // chords already announced as cycle-forming
    ops.visit(start, `Start the tree at ${start}.`)
    let total = 0
    while (inTree.size < graph.nodes.length) {
      // Every edge incident to the tree, cheapest first (deduped by endpoints).
      const cand = []
      const seenPair = new Set()
      for (const u of inTree)
        for (const { to: v, w } of adj[u]) {
          const key = pairKey(u, v)
          if (seenPair.has(key)) continue
          seenPair.add(key)
          cand.push({ u, v, w, key })
        }
      cand.sort((a, b) => a.w - b.w || (a.key < b.key ? -1 : 1))
      let chosen = null
      for (const c of cand) {
        if (inTree.has(c.v)) {
          // Both endpoints already in the tree. Tree edges stay silent; a cheaper
          // chord is the tempting-but-illegal edge that would close a cycle.
          if (!treeEdges.has(c.key) && !skipped.has(c.key)) {
            skipped.add(c.key)
            ops.edge(
              c.u,
              c.v,
              `${c.u}–${c.v} (weight ${c.w}) links two nodes already in the tree — skip it, adding it would make a cycle.`,
            )
          }
          continue
        }
        chosen = c
        break
      }
      if (!chosen) break // graph is disconnected
      ops.edge(
        chosen.u,
        chosen.v,
        `Cheapest edge leaving the tree: ${chosen.u}–${chosen.v} (weight ${chosen.w}).`,
      )
      ops.selectEdge(chosen.u, chosen.v, `Add ${chosen.u}–${chosen.v} to the tree.`)
      treeEdges.add(chosen.key)
      inTree.add(chosen.v)
      ops.visit(chosen.v, `${chosen.v} joins the tree.`)
      total += chosen.w
    }
    ops.done(`Minimum spanning tree complete — total weight ${total}.`)
  },
} satisfies GraphAlgorithmDefinition
