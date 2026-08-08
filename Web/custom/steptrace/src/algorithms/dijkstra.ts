import {
  makeGraphStateView,
  parseGraphStateConfig,
  type GraphStateDecor,
  type GraphStateEdge,
  type GraphStateFrame,
  type GraphStateNode,
  type GraphStateProfile,
} from "../families/graph-state"
import { normalizeGraph } from "../graph"
import type {
  EndpointSettings,
  FamilyAlgorithmDefinition,
  GraphStateDetail,
  GraphStateEdgeRole,
  GraphStateNodeRole,
  StepTraceConfig,
  VisualFamily,
} from "../types"

interface Config {
  profile: GraphStateProfile | "dijkstra"
  nodes: GraphStateNode[]
  edges: GraphStateEdge[]
  decor: GraphStateDecor[]
  start: string
  target: string
  endpointSettings: EndpointSettings
}

class Recorder {
  readonly frames: GraphStateFrame[] = []
  constructor(private readonly config: Config) {}

  record(
    type: string,
    currentNode: string | null,
    currentEdge: readonly [string, string] | null,
    distances: Readonly<Record<string, number>>,
    settled: ReadonlySet<string>,
    selectedEdges: readonly string[],
    changed: boolean,
    message: string,
  ) {
    const frontier = new Set(
      this.config.nodes
        .map(({ id }) => id)
        .filter((id) => Number.isFinite(distances[id]) && !settled.has(id)),
    )
    const nodeState = Object.fromEntries(
      this.config.nodes.map(({ id }) => [
        id,
        id === currentNode
          ? "active"
          : settled.has(id)
            ? "closed"
            : frontier.has(id)
              ? "frontier"
              : "neutral",
      ]),
    ) as Record<string, GraphStateNodeRole>
    const edgeState = Object.fromEntries(
      this.config.edges.map((edge) => {
        const key = `${edge.from}|${edge.to}`
        const reverseKey = `${edge.to}|${edge.from}`
        const selected =
          selectedEdges.includes(key) || (!edge.directed && selectedEdges.includes(reverseKey))
        const active =
          currentEdge &&
          ((currentEdge[0] === edge.from && currentEdge[1] === edge.to) ||
            (!edge.directed && currentEdge[0] === edge.to && currentEdge[1] === edge.from))
        return [key, selected ? "accepted" : active ? "active" : "neutral"]
      }),
    ) as Record<string, GraphStateEdgeRole>
    const detail: GraphStateDetail = {
      kind: "edge-relaxation",
      pass: settled.size,
      edge: currentEdge,
      distances: { ...distances },
      changed,
    }
    this.frames.push({
      type,
      profile: this.config.profile,
      nodes: this.config.nodes,
      edges: this.config.edges,
      decor: this.config.decor,
      start: this.config.start,
      target: this.config.target,
      currentNode,
      currentEdge,
      selectedEdges: [...selectedEdges],
      nodeState,
      edgeState,
      message,
      detail,
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = {
  id: "graph-state",
  createRecorder: (config) => new Recorder(config),
  createView: makeGraphStateView,
}

function parse(config: StepTraceConfig): Config {
  const variant = config.variant == null ? null : String(config.variant)
  if (variant && variant !== "midtown-map" && variant !== "ukraine-cities") {
    throw new Error('steptrace: dijkstra "variant" must be midtown-map or ukraine-cities.')
  }

  let profile: Config["profile"] = "dijkstra"
  let decor: GraphStateDecor[] = []
  let nodes: GraphStateNode[]
  let edges: GraphStateEdge[]
  let start: string
  let target: string
  let directed: boolean | null = null

  if (variant) {
    const scenario = parseGraphStateConfig({ ...config, variant })
    const ids = new Set(scenario.nodes.map(({ id }) => id))
    profile = scenario.profile
    decor = scenario.decor
    nodes = scenario.nodes
    edges = scenario.edges
    start = ids.has(String(config.start)) ? String(config.start) : scenario.start
    target = ids.has(String(config.target)) ? String(config.target) : scenario.target
  } else {
    const graph = normalizeGraph(config as Parameters<typeof normalizeGraph>[0])
    nodes = graph.nodes.map((node) => ({ ...node, label: node.id }))
    edges = graph.edges.map((edge) => ({
      ...edge,
      weight: edge.weight ?? 1,
    }))
    directed = graph.directed
    start = graph.start
    const requestedTarget = config.target == null ? nodes.at(-1)!.id : String(config.target)
    target = nodes.some(({ id }) => id === requestedTarget) ? requestedTarget : nodes.at(-1)!.id
  }

  edges = edges.map((edge) => {
    const weight = edge.weight ?? 1
    if (!Number.isFinite(weight) || weight < 0)
      throw new Error("steptrace: dijkstra edge weights must be finite and non-negative.")
    const edgeDirected = directed ?? Boolean(edge.directed)
    return {
      ...edge,
      weight,
      label: String(weight),
      directed: edgeDirected,
      showDirection: edgeDirected,
    }
  })
  const edgeKeys = new Set<string>()
  for (const edge of edges) {
    const key = edge.directed
      ? `${edge.from}|${edge.to}`
      : [edge.from, edge.to].sort().join("|")
    if (edgeKeys.has(key))
      throw new Error("steptrace: dijkstra parallel edges are not supported.")
    edgeKeys.add(key)
  }
  return {
    profile,
    nodes,
    edges,
    decor,
    start,
    target,
    endpointSettings: {
      startLabel: "From",
      targetLabel: "To",
      options: nodes.map(({ id, label }) => ({ value: id, label })),
      start,
      target,
    },
  }
}

function adjacency(config: Config) {
  const result = new Map(
    config.nodes.map(({ id }) => [id, [] as Array<{ to: string; weight: number }>]),
  )
  for (const edge of config.edges) {
    result.get(edge.from)!.push({ to: edge.to, weight: edge.weight })
    if (!edge.directed) result.get(edge.to)!.push({ to: edge.from, weight: edge.weight })
  }
  for (const neighbours of result.values())
    neighbours.sort((left, right) => left.to.localeCompare(right.to))
  return result
}

function run(config: Config, recorder: Recorder) {
  const neighbours = adjacency(config)
  const distances = Object.fromEntries(
    config.nodes.map(({ id }) => [id, id === config.start ? 0 : Infinity]),
  ) as Record<string, number>
  const predecessor: Record<string, string> = {}
  const settled = new Set<string>()
  recorder.record(
    "init",
    null,
    null,
    distances,
    settled,
    [],
    false,
    `Set dist[${config.start}] = 0; all other distances start at ∞.`,
  )

  while (settled.size < config.nodes.length) {
    const current = config.nodes
      .map(({ id }) => id)
      .filter((id) => !settled.has(id) && Number.isFinite(distances[id]))
      .sort((left, right) => distances[left] - distances[right] || left.localeCompare(right))[0]
    if (!current) break
    settled.add(current)
    recorder.record(
      "expand",
      current,
      null,
      distances,
      settled,
      [],
      false,
      `Settle ${current} at distance ${distances[current]}; its shortest distance is final.`,
    )
    for (const edge of neighbours.get(current)!) {
      if (settled.has(edge.to)) continue
      const candidate = distances[current] + edge.weight
      const before = distances[edge.to]
      const changed = candidate < before
      if (changed) {
        distances[edge.to] = candidate
        predecessor[edge.to] = current
      }
      recorder.record(
        "relax",
        current,
        [current, edge.to],
        distances,
        settled,
        [],
        changed,
        changed
          ? `Relax ${current} → ${edge.to}: ${candidate} improves ${Number.isFinite(before) ? before : "∞"}.`
          : `Keep dist[${edge.to}] = ${before}; ${candidate} is not shorter.`,
      )
    }
  }

  if (!Number.isFinite(distances[config.target])) {
    recorder.record(
      "done",
      null,
      null,
      distances,
      settled,
      [],
      false,
      `${config.target} is unreachable from ${config.start}.`,
    )
    return
  }
  const path = [config.target]
  while (path[0] !== config.start) path.unshift(predecessor[path[0]])
  const selectedEdges = path.slice(1).map((to, index) => `${path[index]}|${to}`)
  recorder.record(
    "done",
    null,
    null,
    distances,
    settled,
    selectedEdges,
    false,
    `Shortest path ${path.join(" → ")} — total cost ${distances[config.target]}.`,
  )
}

export const dijkstra = {
  id: "dijkstra",
  kind: "graph",
  family,
  meta: { label: "Dijkstra" },
  parse,
  run,
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
