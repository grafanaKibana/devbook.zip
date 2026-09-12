import { makeGraphStateView } from "../families/graph-state"
import type {
  FamilyAlgorithmDefinition,
  GraphStateEdge,
  GraphStateEdgeRole,
  GraphStateFrame,
  GraphStateNode,
  GraphStateNodeRole,
  VisualFamily,
} from "../types"

const nodes: GraphStateNode[] = [
  { id: "s", label: "s", x: 80, y: 160 },
  { id: "a", label: "a", x: 270, y: 80 },
  { id: "b", label: "b", x: 270, y: 240 },
  { id: "t", label: "t", x: 540, y: 160 },
]
const edges: GraphStateEdge[] = [
  { from: "s", to: "a", weight: 1, directed: true, showDirection: true },
  { from: "s", to: "b", weight: 1, directed: true, showDirection: true },
  { from: "a", to: "b", weight: 1, directed: true, showDirection: true },
  { from: "a", to: "t", weight: 1, directed: true, showDirection: true },
  { from: "b", to: "t", weight: 1, directed: true, showDirection: true },
]
const key = (from: string, to: string) => `${from}|${to}`

interface Config {
  nodes: readonly GraphStateNode[]
  edges: readonly GraphStateEdge[]
}

class Recorder {
  frames: GraphStateFrame[] = []

  add(
    message: string,
    path: readonly string[],
    flow: Readonly<Record<string, number>>,
    totalFlow: number,
    bottleneck: number | null = null,
  ) {
    const nodeState: Record<string, GraphStateNodeRole> = {}
    path.forEach((id) => {
      nodeState[id] = "frontier"
    })
    if (path.length) nodeState[path[path.length - 1]] = "active"
    const edgeState: Record<string, GraphStateEdgeRole> = {}
    for (const [edge, value] of Object.entries(flow)) {
      if (value > 0) edgeState[edge] = "accepted"
    }
    for (let index = 1; index < path.length; index++) {
      const from = path[index - 1]
      const to = path[index]
      const original = edges.some((edge) => edge.from === from && edge.to === to)
      edgeState[original ? key(from, to) : key(to, from)] = original ? "active" : "residual"
    }
    this.frames.push({
      type: "maximum-flow",
      profile: "graph",
      nodes,
      edges,
      decor: [],
      start: "s",
      target: "t",
      currentNode: path[path.length - 1] || null,
      currentEdge: path.length > 1 ? [path[path.length - 2], path[path.length - 1]] : null,
      selectedEdges: Object.keys(flow).filter((edge) => flow[edge] > 0),
      nodeState,
      edgeState,
      message,
      detail: {
        kind: "residual-flow",
        augmentingPath: path,
        bottleneck,
        totalFlow,
        flow,
      },
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = {
  id: "graph-state",
  createRecorder: () => new Recorder(),
  createView: makeGraphStateView,
}

export const maximumFlow = {
  id: "maximum-flow",
  kind: "graph",
  family,
  meta: { label: "Maximum Flow" },
  parse: () => ({ nodes, edges }),
  run(_config, recorder) {
    let flow: Record<string, number> = {
      "s|a": 0,
      "s|b": 0,
      "a|b": 0,
      "a|t": 0,
      "b|t": 0,
    }
    recorder.add(
      "Begin with zero flow and unit residual capacity on every forward edge.",
      ["s"],
      flow,
      0,
    )
    recorder.add("DFS chooses s → a.", ["s", "a"], flow, 0)
    recorder.add("Continue through a → b.", ["s", "a", "b"], flow, 0)
    recorder.add("Reach t through b → t; the bottleneck is 1.", ["s", "a", "b", "t"], flow, 0, 1)
    flow = { ...flow, "s|a": 1, "a|b": 1, "b|t": 1 }
    recorder.add("Augment s → a → b → t by 1; total flow is 1.", ["s", "a", "b", "t"], flow, 1, 1)
    recorder.add("The next search starts with the remaining edge s → b.", ["s", "b"], flow, 1)
    recorder.add(
      "Use residual edge b → a to retract the earlier a → b unit.",
      ["s", "b", "a"],
      flow,
      1,
    )
    recorder.add(
      "Continue through the free edge a → t; bottleneck is 1.",
      ["s", "b", "a", "t"],
      flow,
      1,
      1,
    )
    flow = { ...flow, "s|b": 1, "a|b": 0, "a|t": 1 }
    recorder.add(
      "Augment s → b → a → t: cancel a → b and raise total flow to 2.",
      ["s", "b", "a", "t"],
      flow,
      2,
      1,
    )
    recorder.add("No residual s → t path remains; the maximum flow is 2.", [], flow, 2)
  },
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
