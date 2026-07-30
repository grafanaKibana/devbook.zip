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
  { id: "A", label: "A", x: 100, y: 160 },
  { id: "B", label: "B", x: 245, y: 65 },
  { id: "C", label: "C", x: 390, y: 160 },
  { id: "D", label: "D", x: 535, y: 65 },
]
const edges: GraphStateEdge[] = [
  { from: "A", to: "B", weight: 1, label: "1" },
  { from: "B", to: "C", weight: 2, label: "2" },
  { from: "A", to: "C", weight: 3, label: "3" },
  { from: "C", to: "D", weight: 4, label: "4" },
]
const key = (edge: GraphStateEdge) => `${edge.from}|${edge.to}`

interface Config {
  nodes: readonly GraphStateNode[]
  edges: readonly GraphStateEdge[]
}

class Recorder {
  frames: GraphStateFrame[] = []

  add(
    message: string,
    components: readonly (readonly string[])[],
    pending: readonly GraphStateEdge[],
    accepted: readonly GraphStateEdge[],
    current: GraphStateEdge | null = null,
    rejected: GraphStateEdge | null = null,
  ) {
    const nodeState: Record<string, GraphStateNodeRole> = {}
    accepted.forEach((edge) => {
      nodeState[edge.from] = "accepted"
      nodeState[edge.to] = "accepted"
    })
    const edgeState: Record<string, GraphStateEdgeRole> = {}
    accepted.forEach((edge) => { edgeState[key(edge)] = "accepted" })
    if (current && !accepted.includes(current)) edgeState[key(current)] = "active"
    if (rejected) edgeState[key(rejected)] = "rejected"
    this.frames.push({
      type: "kruskal",
      profile: "graph",
      nodes,
      edges,
      decor: [],
      start: null,
      target: null,
      currentNode: current?.from || null,
      currentEdge: current ? [current.from, current.to] : null,
      selectedEdges: accepted.map(key),
      nodeState,
      edgeState,
      message,
      detail: {
        kind: "mst-scan",
        pending,
        accepted: [...accepted],
        totalWeight: accepted.reduce((sum, edge) => sum + edge.weight, 0),
        components,
      },
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = {
  id: "graph-state",
  createRecorder: () => new Recorder(),
  createView: makeGraphStateView,
}

export const kruskal = {
  id: "kruskal",
  kind: "graph",
  family,
  meta: { label: "Kruskal's MST" },
  parse: () => ({ nodes, edges }),
  run(_config, recorder) {
    const accepted: GraphStateEdge[] = []
    recorder.add("Sort edges by weight: AB 1, BC 2, AC 3, CD 4.", [["A"], ["B"], ["C"], ["D"]], edges, accepted)
    recorder.add("Inspect A—B (1): its endpoints are in different components.", [["A"], ["B"], ["C"], ["D"]], edges, accepted, edges[0])
    accepted.push(edges[0])
    recorder.add("Accept A—B and merge A with B.", [["A", "B"], ["C"], ["D"]], edges.slice(1), accepted, edges[0])
    recorder.add("Inspect B—C (2): it joins two components.", [["A", "B"], ["C"], ["D"]], edges.slice(1), accepted, edges[1])
    accepted.push(edges[1])
    recorder.add("Accept B—C and merge C into the tree.", [["A", "B", "C"], ["D"]], edges.slice(2), accepted, edges[1])
    recorder.add("Inspect A—C (3): both endpoints already share a component.", [["A", "B", "C"], ["D"]], edges.slice(2), accepted, edges[2])
    recorder.add("Reject A—C because it would close a cycle.", [["A", "B", "C"], ["D"]], edges.slice(3), accepted, edges[2], edges[2])
    recorder.add("Inspect C—D (4): D is still separate.", [["A", "B", "C"], ["D"]], edges.slice(3), accepted, edges[3])
    accepted.push(edges[3])
    recorder.add("Accept C—D; V − 1 edges complete the MST with total weight 7.", [["A", "B", "C", "D"]], [], accepted, edges[3])
  },
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
