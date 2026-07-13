import { adjacency } from "../graph"
import type { GraphAlgorithmDefinition } from "../types"

// ───────────────────────────────── dfs ─────────────────────────────────
export const dfs = {
  id: "dfs",
  kind: "graph",
  meta: { label: "Depth-first search", frontierLabel: "Stack (bottom → top)" },
  run: (input, ops, graph) => {
    const adj = adjacency(graph)
    const start = input.start
    const target = input.target != null && input.target !== start ? String(input.target) : null
    if (target) ops.target(target)
    ops.init(
      target
        ? `Depth-first search for ${target}, starting at ${start} — dive as deep as possible with a stack, backtracking at dead ends, until the target is popped.`
        : `Depth-first search from ${start} — dive as deep as possible using a stack, backtracking when a node has no unvisited neighbours.`,
    )
    const stack = [start]
    const seen = new Set([start])
    ops.enqueue(start, 0, `Push the start node ${start} onto the stack.`)
    while (stack.length) {
      const u = stack.pop()
      ops.visit(u, `Pop ${u} off the stack and mark it visited.`)
      if (u === target) {
        ops.done(
          `Found ${target} after visiting only ${ops.visitedCount} nodes — but along a depth-${ops.dist(u)} path, with no shortest-path guarantee.`,
        )
        return
      }
      // Push unvisited neighbours in reverse so the lowest id is explored first.
      const neighbours = adj[u].slice().reverse()
      for (const v of neighbours) {
        if (seen.has(v)) continue
        ops.edge(u, v, `Explore edge ${u} → ${v}.`)
        seen.add(v)
        stack.push(v)
        ops.enqueue(v, ops.dist(u) + 1, `Push ${v} onto the stack (depth ${ops.dist(u) + 1}).`)
      }
    }
    ops.done(
      target
        ? `${target} is not reachable from ${start} — the stack emptied after ${ops.visitedCount} nodes.`
        : `Depth-first search complete — visited ${ops.visitedCount} node${ops.visitedCount === 1 ? "" : "s"}.`,
    )
  },
} satisfies GraphAlgorithmDefinition
