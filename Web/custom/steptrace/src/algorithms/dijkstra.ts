import type { GraphAlgorithmDefinition } from "../types"

// ─────────────────────────────── dijkstra ──────────────────────────────
export const dijkstra = {
  id: "dijkstra",
  kind: "graph",
  meta: { label: "Dijkstra", frontierLabel: "Frontier (settle nearest first)" },
  run: (input, ops, graph) => {
    // Weighted adjacency (missing weights default to 1); neighbours sorted by id.
    const adj = {}
    for (const nd of graph.nodes) adj[nd.id] = []
    for (const e of graph.edges) {
      const w = e.weight == null ? 1 : e.weight
      adj[e.from].push({ to: e.to, w })
      if (!graph.directed) adj[e.to].push({ to: e.from, w })
    }
    for (const id in adj) adj[id].sort((a, b) => (a.to < b.to ? -1 : 1))

    const start = input.start
    const target = input.target != null ? String(input.target) : null
    if (target) ops.target(target)
    ops.init(
      `Dijkstra from ${start} — repeatedly settle the nearest unsettled node, then relax its edges to shorten neighbours' distances.`,
    )
    const dist = { [start]: 0 }
    const pred = {} // predecessor on the current best path to each node
    const settled = new Set()
    const inQ = new Set([start])
    ops.enqueue(start, 0, `Start ${start} at distance 0.`)
    while (inQ.size) {
      let u = null
      for (const id of inQ) if (u === null || dist[id] < dist[u]) u = id
      inQ.delete(u)
      settled.add(u)
      ops.visit(u, `Settle ${u} (distance ${dist[u]}) — its shortest distance is now final.`)
      for (const { to: v, w } of adj[u]) {
        if (settled.has(v)) continue
        ops.edge(u, v, `Explore edge ${u} → ${v} (weight ${w}).`)
        const nd = dist[u] + w
        if (dist[v] === undefined || nd < dist[v]) {
          const had = dist[v] !== undefined
          dist[v] = nd
          pred[v] = u
          inQ.add(v)
          ops.relax(
            v,
            nd,
            had
              ? `Relax ${v}: a shorter path via ${u} improves its distance to ${nd}.`
              : `Relax ${v}: reach it via ${u} at distance ${nd}.`,
          )
        }
      }
    }
    if (target !== null) {
      // Highlight the single shortest path start → target by walking predecessors.
      if (dist[target] === undefined) {
        ops.done(`${target} is unreachable from ${start}.`)
      } else {
        const path = [target]
        for (let cur = target; pred[cur] !== undefined; cur = pred[cur]) path.push(pred[cur])
        path.reverse()
        for (let i = 0; i + 1 < path.length; i++)
          ops.selectEdge(
            path[i],
            path[i + 1],
            `Shortest path: keep edge ${path[i]}–${path[i + 1]} highlighted.`,
          )
        ops.done(`Shortest path ${path.join(" → ")} — total cost ${dist[target]}.`)
      }
    } else {
      // No target: highlight the whole shortest-path tree (one edge per reached node).
      const reached = graph.nodes
        .map((n) => n.id)
        .filter((id) => id !== start && pred[id] !== undefined)
      reached.sort()
      for (const v of reached)
        ops.selectEdge(pred[v], v, `Shortest-path tree: ${pred[v]}–${v} (distance ${dist[v]}).`)
      ops.done(`Dijkstra complete — shortest-path tree from ${start} highlighted.`)
    }
  },
} satisfies GraphAlgorithmDefinition
