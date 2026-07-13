export interface RawGraphNode {
  id: string | number
  x?: number
  y?: number
}

export interface RawGraphEdge {
  from: string | number
  to: string | number
  weight?: number | null
}

export interface GraphNode {
  id: string
  x: number
  y: number
}

export interface GraphEdge {
  from: string
  to: string
  weight: number | null
}

export interface StepTraceGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
  directed: boolean
  start: string
}

export interface GraphConfig {
  nodes?: RawGraphNode[]
  edges?: RawGraphEdge[]
  directed?: boolean
  start?: string | number | null
}

const DEFAULT_GRAPH: Required<GraphConfig> = {
  directed: false,
  start: "A",
  nodes: [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }, { id: "F" }],
  edges: [
    { from: "A", to: "B" },
    { from: "A", to: "C" },
    { from: "B", to: "D" },
    { from: "B", to: "E" },
    { from: "C", to: "D" },
    { from: "D", to: "F" },
    { from: "E", to: "F" },
  ],
}

function layeredLayout(
  rawNodes: RawGraphNode[],
  rawEdges: RawGraphEdge[],
  directed: boolean,
  start: string,
): Map<string, { x: number; y: number }> {
  const X0 = 40
  const X1 = 540
  const Y0 = 34
  const Y1 = 266
  const YC = (Y0 + Y1) / 2
  const STAG = 8
  const ids = rawNodes.map((node) => String(node.id))
  const idSet = new Set(ids)
  const edges = (rawEdges || [])
    .map((edge) => ({ from: String(edge.from), to: String(edge.to) }))
    .filter((edge) => idSet.has(edge.from) && idSet.has(edge.to))
  const out = new Map(ids.map((id) => [id, [] as string[]]))
  const incoming = new Map(ids.map((id) => [id, [] as string[]]))
  const undirected = new Map(ids.map((id) => [id, [] as string[]]))

  for (const edge of edges) {
    out.get(edge.from)!.push(edge.to)
    incoming.get(edge.to)!.push(edge.from)
    undirected.get(edge.from)!.push(edge.to)
    undirected.get(edge.to)!.push(edge.from)
  }

  const layer = new Map<string, number>()
  const assignBfsLayers = (adjacency: Map<string, string[]>, root: string) => {
    const queue = idSet.has(root) ? [root] : []
    if (queue.length) layer.set(root, 0)
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]
      for (const neighbour of adjacency.get(current) ?? []) {
        if (!layer.has(neighbour)) {
          layer.set(neighbour, layer.get(current)! + 1)
          queue.push(neighbour)
        }
      }
    }
    let maxLayer = 0
    for (const value of layer.values()) maxLayer = Math.max(maxLayer, value)
    for (const id of ids) if (!layer.has(id)) layer.set(id, maxLayer + 1)
  }

  if (directed) {
    const indegree = new Map(ids.map((id) => [id, incoming.get(id)!.length]))
    const queue = ids.filter((id) => indegree.get(id) === 0).sort()
    for (const id of ids) layer.set(id, 0)
    let seen = 0
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head]
      seen++
      for (const neighbour of out.get(current) ?? []) {
        if (layer.get(neighbour)! < layer.get(current)! + 1) {
          layer.set(neighbour, layer.get(current)! + 1)
        }
        const nextDegree = indegree.get(neighbour)! - 1
        indegree.set(neighbour, nextDegree)
        if (nextDegree === 0) queue.push(neighbour)
      }
    }
    if (seen < ids.length) {
      layer.clear()
      assignBfsLayers(out, start)
    }
  } else {
    assignBfsLayers(undirected, start)
  }

  let maxLayer = 0
  for (const value of layer.values()) maxLayer = Math.max(maxLayer, value)
  const buckets = Array.from({ length: maxLayer + 1 }, () => [] as string[])
  for (const id of ids) buckets[layer.get(id)!].push(id)
  for (const bucket of buckets) bucket.sort()
  const layers = buckets.filter((bucket) => bucket.length)

  const positions = (items: string[]) => new Map(items.map((id, index) => [id, index]))
  const sweep = (layerIndex: number, reference: Map<string, number>) => {
    const current = layers[layerIndex]
    const key = new Map<string, number>()
    current.forEach((id, index) => {
      const neighbours = undirected.get(id)!.filter((value) => reference.has(value))
      key.set(
        id,
        neighbours.length
          ? neighbours.reduce((sum, value) => sum + reference.get(value)!, 0) / neighbours.length
          : index,
      )
    })
    current.sort(
      (left, right) =>
        key.get(left)! - key.get(right)! || (left < right ? -1 : left > right ? 1 : 0),
    )
  }

  for (let pass = 0; pass < 4; pass++) {
    if (pass % 2 === 0) {
      for (let index = 1; index < layers.length; index++) {
        sweep(index, positions(layers[index - 1]))
      }
    } else {
      for (let index = layers.length - 2; index >= 0; index--) {
        sweep(index, positions(layers[index + 1]))
      }
    }
  }

  const coordinates = new Map<string, { x: number; y: number }>()
  const layerCount = layers.length
  layers.forEach((current, layerIndex) => {
    const x = layerCount === 1 ? (X0 + X1) / 2 : X0 + (layerIndex * (X1 - X0)) / (layerCount - 1)
    const offset = (layerIndex % 2) * STAG
    current.forEach((id, index) => {
      const y = current.length === 1 ? YC : Y0 + offset + (index * (Y1 - Y0)) / (current.length - 1)
      coordinates.set(id, { x: Math.round(x), y: Math.round(y) })
    })
  })
  return coordinates
}

export function normalizeGraph(config: GraphConfig): StepTraceGraph {
  const source = Array.isArray(config.nodes) && config.nodes.length ? config : DEFAULT_GRAPH
  const nodes = source.nodes!
  const edges = source.edges ?? []
  const needsLayout = nodes.some((node) => node.x == null || node.y == null)
  let start =
    config.start != null
      ? String(config.start)
      : source.start != null
        ? String(source.start)
        : String(nodes[0].id)
  if (!nodes.some((node) => String(node.id) === start)) start = String(nodes[0].id)
  const layout = needsLayout ? layeredLayout(nodes, edges, !!source.directed, start) : null
  const normalizedNodes = needsLayout
    ? nodes.map((node) => ({ id: String(node.id), ...layout!.get(String(node.id))! }))
    : nodes.map((node) => ({ id: String(node.id), x: Number(node.x), y: Number(node.y) }))
  const ids = new Set(normalizedNodes.map((node) => node.id))
  const normalizedEdges = edges
    .filter((edge) => ids.has(String(edge.from)) && ids.has(String(edge.to)))
    .map((edge) => ({
      from: String(edge.from),
      to: String(edge.to),
      weight: edge.weight == null ? null : Number(edge.weight),
    }))
  return {
    nodes: normalizedNodes,
    edges: normalizedEdges,
    directed: !!source.directed,
    start: ids.has(start) ? start : normalizedNodes[0].id,
  }
}

export function adjacency(graph: StepTraceGraph): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const node of graph.nodes) result[node.id] = []
  for (const edge of graph.edges) {
    result[edge.from].push(edge.to)
    if (!graph.directed) result[edge.to].push(edge.from)
  }
  for (const id of Object.keys(result)) result[id].sort()
  return result
}
