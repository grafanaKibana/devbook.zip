import {
  makeGraphStateView,
  type GraphStateEdge,
  type GraphStateFrame,
  type GraphStateNode,
} from "../families/graph-state"
import type { FamilyAlgorithmDefinition, GraphStateDetail, VisualFamily } from "../types"

interface Config {
  nodes: GraphStateNode[]
  edges: GraphStateEdge[]
}

class Recorder {
  readonly frames: GraphStateFrame[] = []
  constructor(private readonly config: Config) {}
  record(
    type: string,
    current: string | null,
    edge: readonly [string, string] | null,
    discovery: Readonly<Record<string, number>>,
    low: Readonly<Record<string, number>>,
    stack: readonly string[],
    components: readonly (readonly string[])[],
    message: string,
  ) {
    const emitted = new Set(components.flat())
    const detail: GraphStateDetail = {
      kind: "low-link-components",
      discovery: { ...discovery },
      low: { ...low },
      stack: [...stack],
      components: components.map((component) => [...component]),
    }
    this.frames.push({
      type,
      profile: "strongly-connected-components",
      nodes: this.config.nodes,
      edges: this.config.edges,
      decor: [],
      start: "A",
      target: null,
      currentNode: current,
      currentEdge: edge,
      selectedEdges: [],
      nodeState: Object.fromEntries(
        this.config.nodes.map(({ id }) => [
          id,
          id === current
            ? "active"
            : emitted.has(id)
              ? "accepted"
              : stack.includes(id)
                ? "frontier"
                : id in discovery
                  ? "closed"
                  : "neutral",
        ]),
      ),
      edgeState: Object.fromEntries(
        this.config.edges.map(({ from, to }) => [
          `${from}|${to}`,
          edge?.[0] === from && edge[1] === to
            ? "active"
            : components.some((component) => component.includes(from) && component.includes(to))
              ? "accepted"
              : "neutral",
        ]),
      ),
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

function parse(): Config {
  return {
    nodes: [
      { id: "A", label: "A", x: 85, y: 120 },
      { id: "B", label: "B", x: 220, y: 55 },
      { id: "C", label: "C", x: 220, y: 190 },
      { id: "D", label: "D", x: 400, y: 190 },
      { id: "E", label: "E", x: 535, y: 120 },
    ],
    edges: [
      { from: "A", to: "B", weight: 1, directed: true, showDirection: true },
      { from: "B", to: "C", weight: 1, directed: true, showDirection: true },
      { from: "C", to: "A", weight: 1, directed: true, showDirection: true },
      { from: "C", to: "D", weight: 1, directed: true, showDirection: true },
      { from: "D", to: "E", weight: 1, directed: true, showDirection: true },
      { from: "E", to: "D", weight: 1, directed: true, showDirection: true },
    ],
  }
}

function run(_: Config, recorder: Recorder) {
  const disc: Record<string, number> = {}
  const low: Record<string, number> = {}
  const stack: string[] = []
  const components: string[][] = []
  const visit = (id: string, time: number, parent: string | null) => {
    disc[id] = low[id] = time
    stack.push(id)
    recorder.record(
      "discover",
      id,
      parent ? [parent, id] : null,
      disc,
      low,
      stack,
      components,
      `Push ${id}: disc ${time}, low ${time}.`,
    )
  }
  visit("A", 0, null)
  visit("B", 1, "A")
  visit("C", 2, "B")
  low["C"] = 0
  recorder.record(
    "back-edge",
    "C",
    ["C", "A"],
    disc,
    low,
    stack,
    components,
    "C→A reaches an active ancestor; low[C] becomes 0.",
  )
  visit("D", 3, "C")
  visit("E", 4, "D")
  low["E"] = 3
  recorder.record(
    "back-edge",
    "E",
    ["E", "D"],
    disc,
    low,
    stack,
    components,
    "E→D reaches an active ancestor; low[E] becomes 3.",
  )
  low["D"] = Math.min(low["D"], low["E"])
  recorder.record(
    "propagate",
    "D",
    ["D", "E"],
    disc,
    low,
    stack,
    components,
    "Propagate low[E] = 3 to D.",
  )
  components.push([stack.pop()!, stack.pop()!])
  recorder.record(
    "component",
    "D",
    null,
    disc,
    low,
    stack,
    components,
    "low[D] = disc[D]; pop E and D as one SCC.",
  )
  low["B"] = low["C"]
  recorder.record(
    "propagate",
    "B",
    ["B", "C"],
    disc,
    low,
    stack,
    components,
    "Propagate low[C] = 0 through B.",
  )
  low["A"] = low["B"]
  components.push([stack.pop()!, stack.pop()!, stack.pop()!])
  recorder.record(
    "component",
    "A",
    null,
    disc,
    low,
    stack,
    components,
    "low[A] = disc[A]; pop C, B, A as one SCC.",
  )
  recorder.record("done", null, null, disc, low, stack, components, "SCCs: {D,E} and {A,B,C}.")
}

export const stronglyConnectedComponents = {
  id: "strongly-connected-components",
  kind: "graph",
  family,
  meta: { label: "Strongly Connected Components" },
  parse,
  run,
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
