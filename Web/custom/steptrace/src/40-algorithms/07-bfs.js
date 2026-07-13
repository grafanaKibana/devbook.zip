  // ───────────────────────────────── bfs ─────────────────────────────────
  registerGraph("bfs", { label: "Breadth-first search" }, (input, ops, graph) => {
    const adj = adjacency(graph)
    const start = input.start
    const target = input.target != null && input.target !== start ? String(input.target) : null
    if (target) ops.target(target)
    ops.init(
      target
        ? `Breadth-first search for ${target}, starting at ${start} — explore level by level with a first-in, first-out queue until the target is dequeued.`
        : `Breadth-first search from ${start} — explore the graph level by level using a first-in, first-out queue.`,
    )
    const queue = [start]
    const seen = new Set([start])
    ops.enqueue(start, 0, `Enqueue the start node ${start} at distance 0.`)
    while (queue.length) {
      const u = queue.shift()
      ops.visit(u, `Dequeue ${u} (distance ${ops.dist(u)}) and mark it visited.`)
      if (u === target) {
        ops.done(
          `Found ${target} at distance ${ops.dist(u)} after visiting ${ops.visitedCount} nodes — BFS reaches it by a shortest path.`,
        )
        return
      }
      for (const v of adj[u]) {
        if (seen.has(v)) continue
        ops.edge(u, v, `Explore edge ${u} → ${v}.`)
        seen.add(v)
        queue.push(v)
        ops.enqueue(
          v,
          ops.dist(u) + 1,
          `Discover ${v} — enqueue it at distance ${ops.dist(u) + 1}.`,
        )
      }
    }
    ops.done(
      target
        ? `${target} is not reachable from ${start} — the queue emptied after ${ops.visitedCount} nodes.`
        : `Breadth-first search complete — visited ${ops.visitedCount} node${ops.visitedCount === 1 ? "" : "s"}.`,
    )
  })

