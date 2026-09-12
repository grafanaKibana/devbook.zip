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
  { id: "A", label: "A", x: 160, y: 70 },
  { id: "B", label: "B", x: 460, y: 70 },
  { id: "C", label: "C", x: 460, y: 240 },
  { id: "D", label: "D", x: 160, y: 240 },
]
const edges: GraphStateEdge[] = [
  { from: "A", to: "B", weight: 1 },
  { from: "B", to: "C", weight: 1 },
  { from: "C", to: "D", weight: 1 },
  { from: "D", to: "A", weight: 1 },
  { from: "A", to: "C", weight: 1 },
]
const edgeKey = (left: string, right: string) => {
  const edge = edges.find(
    (candidate) =>
      (candidate.from === left && candidate.to === right) ||
      (candidate.from === right && candidate.to === left),
  )
  return edge ? `${edge.from}|${edge.to}` : ""
}

interface Config {
  nodes: readonly GraphStateNode[]
  edges: readonly GraphStateEdge[]
}

class Recorder {
  frames: GraphStateFrame[] = []

  add(
    message: string,
    path: readonly string[],
    candidates: readonly string[],
    rejected: readonly string[] = [],
    rejectedEdge: readonly [string, string] | null = null,
  ) {
    const nodeState: Record<string, GraphStateNodeRole> = {}
    path.forEach((id) => {
      nodeState[id] = "accepted"
    })
    candidates.forEach((id) => {
      nodeState[id] = "frontier"
    })
    rejected.forEach((id) => {
      nodeState[id] = "rejected"
    })
    if (path.length) nodeState[path[path.length - 1]] = "active"
    const edgeState: Record<string, GraphStateEdgeRole> = {}
    for (let index = 1; index < path.length; index++) {
      edgeState[edgeKey(path[index - 1], path[index])] = "accepted"
    }
    if (path.length === nodes.length && edgeKey(path[path.length - 1], path[0])) {
      edgeState[edgeKey(path[path.length - 1], path[0])] = "accepted"
    }
    if (rejectedEdge) {
      const key = edgeKey(rejectedEdge[0], rejectedEdge[1])
      if (key) edgeState[key] = "rejected"
    }
    this.frames.push({
      type: "hamiltonian-cycle",
      profile: "graph",
      nodes,
      edges,
      decor: [],
      start: "A",
      target: "A",
      currentNode: path[path.length - 1] || null,
      currentEdge: path.length > 1 ? [path[path.length - 2], path[path.length - 1]] : null,
      selectedEdges: Object.keys(edgeState).filter((key) => edgeState[key] === "accepted"),
      nodeState,
      edgeState,
      message,
      detail: { kind: "path-backtrack", path, candidates, rejected },
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = {
  id: "graph-state",
  createRecorder: () => new Recorder(),
  createView: makeGraphStateView,
}

export const hamiltonianCycle = {
  id: "hamiltonian-cycle",
  kind: "graph",
  family,
  meta: { label: "Hamiltonian Cycle" },
  parse: () => ({ nodes, edges }),
  run(_config, recorder) {
    recorder.add("Start at A; try unused neighbours in the order C, B, D.", ["A"], ["C", "B", "D"])
    recorder.add("Choose C first.", ["A", "C"], ["B", "D"])
    recorder.add("Choose B from C.", ["A", "C", "B"], [])
    recorder.add(
      "Dead end: B cannot reach the only unused vertex D.",
      ["A", "C", "B"],
      [],
      ["D"],
      ["B", "D"],
    )
    recorder.add("Backtrack from B to C.", ["A", "C"], ["D"], ["B"])
    recorder.add("Choose D from C.", ["A", "C", "D"], [])
    recorder.add(
      "Dead end: D cannot reach the only unused vertex B.",
      ["A", "C", "D"],
      [],
      ["B"],
      ["D", "B"],
    )
    recorder.add("Backtrack from D to C.", ["A", "C"], [], ["D"])
    recorder.add("Both C branches failed; backtrack to A.", ["A"], ["B", "D"], ["C"])
    recorder.add("Choose B from A.", ["A", "B"], ["C"])
    recorder.add("Choose C from B.", ["A", "B", "C"], ["D"])
    recorder.add("Choose D from C.", ["A", "B", "C", "D"], [])
    recorder.add("D connects back to A, closing the Hamiltonian cycle.", ["A", "B", "C", "D"], [])
    recorder.add("Cycle found: A → B → C → D → A.", ["A", "B", "C", "D"], [])
  },
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
