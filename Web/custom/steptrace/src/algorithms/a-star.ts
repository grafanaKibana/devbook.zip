import {
  graphStateFamily,
  graphStateAdjacency,
  parseGraphStateConfig,
  type GraphStateConfig,
  type GraphStateEdge,
  type GraphStateOperations,
  type GraphStateScore,
} from "../families/graph-state"
import type { FamilyAlgorithmDefinition } from "../types"

interface QueueEntry extends GraphStateScore {
  order: number
}

function runCount(config: GraphStateConfig, heuristic: boolean) {
  const neighbours = graphStateAdjacency(config)
  const h = new Map(config.nodes.map((node) => [node.id, heuristic ? node.h : 0]))
  const g: Record<string, number> = { [config.start]: 0 }
  const closed = new Set<string>()
  const queue: QueueEntry[] = [{ id: config.start, g: 0, h: h.get(config.start)!, f: h.get(config.start)!, order: 0 }]
  let order = 1
  while (queue.length) {
    queue.sort((left, right) => left.f - right.f || left.h - right.h || left.order - right.order || left.id.localeCompare(right.id))
    const current = queue.shift()!
    if (closed.has(current.id) || current.g !== g[current.id]) continue
    closed.add(current.id)
    if (current.id === config.target) return closed.size
    for (const edge of neighbours.get(current.id)!) {
      if (closed.has(edge.to)) continue
      const tentative = current.g + edge.weight
      if (tentative >= (g[edge.to] ?? Number.POSITIVE_INFINITY)) continue
      g[edge.to] = tentative
      queue.push({ id: edge.to, g: tentative, h: h.get(edge.to)!, f: tentative + h.get(edge.to)!, order: order++ })
    }
  }
  return closed.size
}

function visibleQueue(queue: readonly QueueEntry[], closed: ReadonlySet<string>) {
  const best = new Map<string, QueueEntry>()
  for (const entry of queue) {
    if (closed.has(entry.id)) continue
    const current = best.get(entry.id)
    if (!current || entry.g < current.g) best.set(entry.id, entry)
  }
  return [...best.values()]
    .sort((left, right) => left.f - right.f || left.h - right.h || left.order - right.order || left.id.localeCompare(right.id))
    .map(({ id, g, h, f }) => ({ id, g, h, f }))
}

export function runAStar(config: GraphStateConfig, ops: GraphStateOperations) {
  const neighbours = graphStateAdjacency(config)
  const h = new Map(config.nodes.map((node) => [node.id, node.h]))
  const g: Record<string, number> = { [config.start]: 0 }
  const parent: Record<string, string> = {}
  const closed = new Set<string>()
  const closedOrder: string[] = []
  const queue: QueueEntry[] = [{
    id: config.start,
    g: 0,
    h: h.get(config.start)!,
    f: h.get(config.start)!,
    order: 0,
  }]
  let order = 1
  ops.init(g, visibleQueue(queue, closed), `Seed OPEN with ${config.start}; rank it by f = g + h.`)

  while (queue.length) {
    queue.sort((left, right) => left.f - right.f || left.h - right.h || left.order - right.order || left.id.localeCompare(right.id))
    const current = queue.shift()!
    if (closed.has(current.id) || current.g !== g[current.id]) continue
    closed.add(current.id)
    closedOrder.push(current.id)
    ops.expand(
      current.id,
      g,
      visibleQueue(queue, closed),
      closedOrder,
      `Move ${current.id} from OPEN to CLOSED: f ${current.f} is smallest.`,
    )
    if (current.id === config.target) {
      const path = [current.id]
      while (path[0] !== config.start) path.unshift(parent[path[0]])
      ops.path(path, g, `Reconstruct the optimal path ${path.join(" → ")}.`)
      const dijkstraExpanded = runCount(config, false)
      ops.done(
        path,
        g,
        closed.size,
        dijkstraExpanded,
        `Path cost ${g[config.target]}. A* expanded ${closed.size}; Dijkstra expanded ${dijkstraExpanded}.`,
      )
      return
    }
    for (const edge of neighbours.get(current.id)!) {
      if (closed.has(edge.to)) continue
      ops.edge(
        current.id,
        edge.to,
        g,
        visibleQueue(queue, closed),
        closedOrder,
        `Inspect ${current.id} → ${edge.to} with cost ${edge.weight}.`,
      )
      const tentative = current.g + edge.weight
      if (tentative >= (g[edge.to] ?? Number.POSITIVE_INFINITY)) continue
      g[edge.to] = tentative
      parent[edge.to] = current.id
      const entry = {
        id: edge.to,
        g: tentative,
        h: h.get(edge.to)!,
        f: tentative + h.get(edge.to)!,
        order: order++,
      }
      queue.push(entry)
      ops.relax(
        current.id,
        edge.to,
        g,
        visibleQueue(queue, closed),
        closedOrder,
        `Update ${edge.to}: g ${entry.g} + h ${entry.h} = f ${entry.f}.`,
      )
    }
  }
  ops.done([], g, closed.size, runCount(config, false), `${config.target} is unreachable from ${config.start}.`)
}

export const aStar = {
  id: "a-star",
  kind: "graph",
  family: graphStateFamily,
  meta: { label: "A*" },
  parse: parseGraphStateConfig,
  run: runAStar,
} satisfies FamilyAlgorithmDefinition<
  "graph",
  GraphStateConfig,
  GraphStateOperations,
  unknown
>
