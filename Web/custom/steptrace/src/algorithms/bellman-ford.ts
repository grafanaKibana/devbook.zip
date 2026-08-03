import { makeGraphStateView, type GraphStateEdge, type GraphStateFrame, type GraphStateNode } from "../families/graph-state"
import type { FamilyAlgorithmDefinition, GraphStateDetail, VisualFamily } from "../types"

interface Config { nodes: GraphStateNode[]; edges: GraphStateEdge[] }

class Recorder {
  readonly frames: GraphStateFrame[] = []
  constructor(private readonly config: Config) {}
  record(pass: number, edge: readonly [string, string] | null, distances: Readonly<Record<string, number>>, changed: boolean, message: string) {
    const reachable = new Set(Object.entries(distances).filter(([, value]) => Number.isFinite(value)).map(([id]) => id))
    const detail: GraphStateDetail = { kind: "edge-relaxation", pass, edge, distances: { ...distances }, changed }
    this.frames.push({
      type: edge ? "relax" : pass ? "done" : "init",
      profile: "bellman-ford",
      nodes: this.config.nodes,
      edges: this.config.edges,
      decor: [],
      start: "0",
      target: null,
      currentNode: edge?.[0] ?? null,
      currentEdge: edge,
      selectedEdges: [],
      nodeState: Object.fromEntries(this.config.nodes.map(({ id }) => [id, id === edge?.[0] ? "active" : reachable.has(id) ? "closed" : "neutral"])),
      edgeState: Object.fromEntries(this.config.edges.map(({ from, to }) => [`${from}|${to}`, edge?.[0] === from && edge[1] === to ? "active" : "neutral"])),
      message,
      detail,
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = { id: "graph-state", createRecorder: (config) => new Recorder(config), createView: makeGraphStateView }

function parse(): Config {
  return {
    nodes: [
      { id: "0", label: "0", x: 70, y: 160 },
      { id: "1", label: "1", x: 230, y: 70 },
      { id: "2", label: "2", x: 390, y: 160 },
      { id: "3", label: "3", x: 550, y: 160 },
    ],
    edges: [
      { from: "2", to: "3", weight: 3, label: "3", directed: true, showDirection: true },
      { from: "1", to: "2", weight: -2, label: "−2", directed: true, showDirection: true },
      { from: "0", to: "2", weight: 5, label: "5", directed: true, showDirection: true },
      { from: "0", to: "1", weight: 4, label: "4", directed: true, showDirection: true },
    ],
  }
}

function run(config: Config, recorder: Recorder) {
  const distances: Record<string, number> = { "0": 0, "1": Infinity, "2": Infinity, "3": Infinity }
  recorder.record(0, null, distances, false, "Set dist[0] = 0; all other distances start at ∞.")
  for (let pass = 1; pass <= 3; pass++) {
    for (const edge of config.edges) {
      const before = distances[edge.to]
      const candidate = distances[edge.from] + edge.weight
      const changed = Number.isFinite(candidate) && candidate < before
      if (changed) distances[edge.to] = candidate
      recorder.record(pass, [edge.from, edge.to], distances, changed, changed ? `Pass ${pass}: ${edge.from}→${edge.to} lowers dist[${edge.to}] from ${before} to ${candidate}.` : `Pass ${pass}: ${edge.from}→${edge.to} cannot improve dist[${edge.to}].`)
    }
  }
  let changed = false
  for (const edge of config.edges) {
    const relaxes = Number.isFinite(distances[edge.from]) && distances[edge.from] + edge.weight < distances[edge.to]
    changed ||= relaxes
    recorder.record(4, [edge.from, edge.to], distances, relaxes, `Check ${edge.from}→${edge.to}: ${relaxes ? "it still relaxes" : "no change"}.`)
  }
  recorder.record(4, null, distances, changed, "The confirming sweep changes nothing; no reachable negative cycle exists.")
}

export const bellmanFord = {
  id: "bellman-ford",
  kind: "graph",
  family,
  meta: { label: "Bellman-Ford" },
  parse,
  run,
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
