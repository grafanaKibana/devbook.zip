import type { GraphAlgorithmDefinition } from "../types"

// ────────────────────────── topological-sort ───────────────────────────
export const topologicalSort = {
  id: "topological-sort",
  kind: "graph",
  meta: { label: "Topological sort (Kahn)", frontierLabel: "Ready queue (in-degree 0)" },
  run: (input, ops, graph) => {
    const adj = {}
    const indeg = {}
    for (const nd of graph.nodes) {
      adj[nd.id] = []
      indeg[nd.id] = 0
    }
    for (const e of graph.edges) {
      adj[e.from].push(e.to)
      indeg[e.to] = (indeg[e.to] || 0) + 1
    }
    ops.init(
      `Topological sort (Kahn's algorithm) — repeatedly take a node with no remaining prerequisites (in-degree 0) and append it to the order; removing it may make others ready.`,
    )
    const ready = []
    for (const nd of graph.nodes) {
      if (indeg[nd.id] === 0) {
        ready.push(nd.id)
        ops.enqueue(nd.id, null, `${nd.id} has in-degree 0 — ready.`)
      }
    }
    const order = []
    while (ready.length) {
      ready.sort()
      const u = ready.shift()
      ops.visit(u, `Output ${u} (position ${order.length + 1} in the order).`)
      order.push(u)
      for (const v of adj[u].slice().sort()) {
        ops.edge(u, v, `Remove edge ${u}→${v}: in-degree of ${v} becomes ${indeg[v] - 1}.`)
        indeg[v]--
        if (indeg[v] === 0) {
          ready.push(v)
          ops.enqueue(v, null, `${v} is now ready.`)
        }
      }
    }
    ops.done(
      order.length === graph.nodes.length
        ? `Topological order: ${order.join(" → ")}.`
        : `A cycle remains (${graph.nodes.length - order.length} node(s) unresolved) — no valid ordering.`,
    )
  },
} satisfies GraphAlgorithmDefinition
