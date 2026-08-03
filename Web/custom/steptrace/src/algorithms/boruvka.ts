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
  { id: "A", label: "A", x: 110, y: 80 },
  { id: "B", label: "B", x: 260, y: 55 },
  { id: "C", label: "C", x: 360, y: 190 },
  { id: "D", label: "D", x: 510, y: 120 },
]
const edges: GraphStateEdge[] = [
  { from: "A", to: "B", weight: 1, label: "1" },
  { from: "A", to: "C", weight: 4, label: "4" },
  { from: "B", to: "C", weight: 2, label: "2" },
  { from: "B", to: "D", weight: 5, label: "5" },
  { from: "C", to: "D", weight: 3, label: "3" },
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
    choices: readonly GraphStateEdge[],
    accepted: readonly GraphStateEdge[],
    current: GraphStateEdge | null = null,
  ) {
    const nodeState: Record<string, GraphStateNodeRole> = {}
    accepted.forEach((edge) => {
      nodeState[edge.from] = "accepted"
      nodeState[edge.to] = "accepted"
    })
    const edgeState: Record<string, GraphStateEdgeRole> = {}
    choices.forEach((edge) => { edgeState[key(edge)] = "candidate" })
    accepted.forEach((edge) => { edgeState[key(edge)] = "accepted" })
    if (current) edgeState[key(current)] = accepted.includes(current) ? "accepted" : "active"
    this.frames.push({
      type: "boruvka",
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
        kind: "mst-round",
        round: 1,
        components,
        choices,
        totalWeight: accepted.reduce((sum, edge) => sum + edge.weight, 0),
      },
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = {
  id: "graph-state",
  createRecorder: () => new Recorder(),
  createView: makeGraphStateView,
}

export const boruvka = {
  id: "boruvka",
  kind: "graph",
  family,
  meta: { label: "Borůvka's MST" },
  parse: () => ({ nodes, edges }),
  run(_config, recorder) {
    const components = [["A"], ["B"], ["C"], ["D"]]
    const [ab, , bc, , cd] = edges
    const choices: GraphStateEdge[] = []
    const accepted: GraphStateEdge[] = []
    recorder.add("Begin round 1 with four singleton components.", components, choices, accepted)
    choices.push(ab)
    recorder.add("Component A chooses its cheapest outgoing edge A—B (1).", components, choices, accepted, ab)
    recorder.add("Component B chooses the same cheapest edge B—A (1).", components, choices, accepted, ab)
    choices.push(bc)
    recorder.add("Component C chooses B—C (2).", components, choices, accepted, bc)
    choices.push(cd)
    recorder.add("Component D chooses C—D (3).", components, choices, accepted, cd)
    recorder.add("Deduplicate A—B; three distinct safe candidates remain.", components, choices, accepted)
    accepted.push(ab)
    recorder.add("Accept A—B; A and B merge.", [["A", "B"], ["C"], ["D"]], choices, accepted, ab)
    accepted.push(bc)
    recorder.add("Accept B—C; C joins the component.", [["A", "B", "C"], ["D"]], choices, accepted, bc)
    accepted.push(cd)
    recorder.add("Accept C—D; all vertices are connected.", [["A", "B", "C", "D"]], choices, accepted, cd)
    recorder.add("The MST is complete in one effective round with total weight 6.", [["A", "B", "C", "D"]], choices, accepted)
  },
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
