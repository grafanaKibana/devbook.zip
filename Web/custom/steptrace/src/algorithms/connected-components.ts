import { makeGraphStateView, type GraphStateEdge, type GraphStateFrame, type GraphStateNode } from "../families/graph-state"
import type { FamilyAlgorithmDefinition, GraphStateDetail, VisualFamily } from "../types"

interface Config { nodes: GraphStateNode[]; edges: GraphStateEdge[] }

class Recorder {
  readonly frames: GraphStateFrame[] = []
  constructor(private readonly config: Config) {}
  record(component: number, current: string | null, frontier: readonly string[], visited: readonly string[], groups: readonly (readonly string[])[], message: string) {
    const detail: GraphStateDetail = { kind: "component-flood", component, frontier: [...frontier], visited: [...visited], groups: groups.map((group) => [...group]) }
    this.frames.push({
      type: current ? "visit" : "done",
      profile: "connected-components",
      nodes: this.config.nodes,
      edges: this.config.edges,
      decor: [],
      start: null,
      target: null,
      currentNode: current,
      currentEdge: null,
      selectedEdges: [],
      nodeState: Object.fromEntries(this.config.nodes.map(({ id }) => [id, id === current ? "active" : frontier.includes(id) ? "frontier" : visited.includes(id) ? "accepted" : "neutral"])),
      edgeState: Object.fromEntries(this.config.edges.map(({ from, to }) => [`${from}|${to}`, visited.includes(from) && visited.includes(to) ? "accepted" : "neutral"])),
      message,
      detail,
    })
  }
}

const family: VisualFamily<Config, Recorder, GraphStateFrame> = { id: "graph-state", createRecorder: (config) => new Recorder(config), createView: makeGraphStateView }

function parse(): Config {
  return {
    nodes: [
      { id: "A", label: "A", x: 100, y: 95 },
      { id: "B", label: "B", x: 210, y: 55 },
      { id: "C", label: "C", x: 210, y: 160 },
      { id: "D", label: "D", x: 380, y: 90 },
      { id: "E", label: "E", x: 490, y: 90 },
      { id: "F", label: "F", x: 530, y: 230 },
    ],
    edges: [
      { from: "A", to: "B", weight: 1 },
      { from: "B", to: "C", weight: 1 },
      { from: "C", to: "A", weight: 1 },
      { from: "D", to: "E", weight: 1 },
    ],
  }
}

function run(_: Config, recorder: Recorder) {
  const visited: string[] = []
  const groups: string[][] = []
  const flood = (component: number, order: readonly string[]) => {
    const frontier = [order[0]]
    recorder.record(component, order[0], frontier, visited, groups, `Start component ${component} at unvisited vertex ${order[0]}.`)
    for (const id of order) {
      frontier.splice(frontier.indexOf(id), 1)
      if (!visited.includes(id)) visited.push(id)
      const next = order.filter((candidate) => !visited.includes(candidate) && !frontier.includes(candidate))
      frontier.push(...next.slice(0, 1))
      const currentGroup = order.filter((member) => visited.includes(member))
      recorder.record(component, id, frontier, visited, [...groups, currentGroup], `Assign ${id} to component ${component}.`)
    }
    groups.push([...order])
  }
  flood(1, ["A", "B", "C"])
  flood(2, ["D", "E"])
  flood(3, ["F"])
  recorder.record(3, null, [], visited, groups, "All vertices are assigned: {A,B,C}, {D,E}, {F}.")
}

export const connectedComponents = {
  id: "connected-components",
  kind: "graph",
  family,
  meta: { label: "Connected Components" },
  parse,
  run,
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
