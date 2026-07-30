import {
  graphStateAdjacency,
  graphStateFamily,
  graphStateShortestDistances,
  parseGraphStateConfig,
  type GraphStateConfig,
  type GraphStateOperations,
  type GraphStateScore,
} from "../families/graph-state"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

interface QueueEntry extends GraphStateScore {
  order: number
}

function parse(config: StepTraceConfig): GraphStateConfig {
  return {
    ...parseGraphStateConfig({ ...config, variant: "coordinate-grid" }),
    policy: "greedy",
  }
}

function visibleQueue(queue: readonly QueueEntry[]) {
  return queue
    .slice()
    .sort((left, right) => left.h - right.h || left.order - right.order || left.id.localeCompare(right.id))
    .map(({ id, g, h, f }) => ({ id, g, h, f }))
}

function runGreedyBestFirst(config: GraphStateConfig, ops: GraphStateOperations) {
  const neighbours = graphStateAdjacency(config)
  const heuristic = new Map(config.nodes.map((node) => [node.id, node.h]))
  const pathCost: Record<string, number> = { [config.start]: 0 }
  const parent: Record<string, string> = {}
  const visited = new Set([config.start])
  const closed: string[] = []
  const queue: QueueEntry[] = [{
    id: config.start,
    g: 0,
    h: heuristic.get(config.start)!,
    f: heuristic.get(config.start)!,
    order: 0,
  }]
  let order = 1

  ops.init(pathCost, visibleQueue(queue), `Seed OPEN with ${config.start}; rank it by h alone.`)

  while (queue.length) {
    queue.sort((left, right) => left.h - right.h || left.order - right.order || left.id.localeCompare(right.id))
    const current = queue.shift()!
    closed.push(current.id)
    ops.expand(
      current.id,
      pathCost,
      visibleQueue(queue),
      closed,
      `Move ${current.id} to CLOSED: h ${current.h} is smallest; path cost ${current.g} is ignored.`,
    )

    if (current.id === config.target) {
      const path = [current.id]
      while (path[0] !== config.start) path.unshift(parent[path[0]])
      const greedyCost = pathCost[config.target]
      const optimalCost = graphStateShortestDistances(config.nodes, config.edges, config.target).get(config.start)!
      ops.path(path, pathCost, `Reconstruct Greedy's first route ${path.join(" → ")}.`)
      ops.done(
        path,
        pathCost,
        greedyCost,
        optimalCost,
        `Greedy stops at cost ${greedyCost}; A* reaches the same goal with optimal cost ${optimalCost}.`,
      )
      return
    }

    for (const edge of neighbours.get(current.id)!) {
      ops.edge(
        current.id,
        edge.to,
        pathCost,
        visibleQueue(queue),
        closed,
        `Inspect ${current.id} → ${edge.to}; only h(${edge.to}) will rank it.`,
      )
      if (visited.has(edge.to)) continue
      visited.add(edge.to)
      parent[edge.to] = current.id
      pathCost[edge.to] = current.g + edge.weight
      const h = heuristic.get(edge.to)!
      queue.push({ id: edge.to, g: pathCost[edge.to], h, f: h, order: order++ })
      ops.relax(
        current.id,
        edge.to,
        pathCost,
        visibleQueue(queue),
        closed,
        `Add ${edge.to} to OPEN with h ${h}; accumulated cost ${pathCost[edge.to]} does not affect priority.`,
      )
    }
  }

  ops.done([], pathCost, 0, 0, `${config.target} is unreachable from ${config.start}.`)
}

export const greedyBestFirstSearch = {
  id: "greedy-best-first-search",
  kind: "graph",
  family: graphStateFamily,
  meta: { label: "Greedy Best-First Search" },
  parse,
  run: runGreedyBestFirst,
} satisfies FamilyAlgorithmDefinition<
  "graph",
  GraphStateConfig,
  GraphStateOperations,
  unknown
>
