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
    forward: readonly string[],
    backward: readonly string[],
    meeting: string | null,
    path: readonly string[],
    message: string,
  ) {
    const visited = [...new Set([...forward, ...backward])]
    const detail: GraphStateDetail = {
      kind: "dual-search",
      forward: [...forward],
      backward: [...backward],
      visited,
      meeting,
    }
    const pathEdges = new Set(
      path.flatMap((id, index) =>
        index ? [`${path[index - 1]}|${id}`, `${id}|${path[index - 1]}`] : [],
      ),
    )
    this.frames.push({
      type,
      profile: "bidirectional-search",
      nodes: this.config.nodes,
      edges: this.config.edges,
      decor: [],
      start: "s",
      target: "t",
      currentNode: current,
      currentEdge: edge,
      selectedEdges: [...pathEdges],
      nodeState: Object.fromEntries(
        this.config.nodes.map(({ id }) => [
          id,
          path.includes(id)
            ? "accepted"
            : id === current || id === meeting
              ? "active"
              : forward.includes(id) || backward.includes(id)
                ? "frontier"
                : "neutral",
        ]),
      ),
      edgeState: Object.fromEntries(
        this.config.edges.map(({ from, to }) => [
          `${from}|${to}`,
          pathEdges.has(`${from}|${to}`)
            ? "accepted"
            : edge && ((from === edge[0] && to === edge[1]) || (from === edge[1] && to === edge[0]))
              ? "active"
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
      { id: "s", label: "s", x: 45, y: 150 },
      { id: "a", label: "a", x: 130, y: 90 },
      { id: "u", label: "u", x: 130, y: 220 },
      { id: "b", label: "b", x: 220, y: 70 },
      { id: "x", label: "x", x: 220, y: 140 },
      { id: "v", label: "v", x: 220, y: 230 },
      { id: "m", label: "m", x: 320, y: 65 },
      { id: "c", label: "c", x: 410, y: 100 },
      { id: "r", label: "r", x: 410, y: 235 },
      { id: "d", label: "d", x: 500, y: 90 },
      { id: "q", label: "q", x: 500, y: 210 },
      { id: "t", label: "t", x: 585, y: 150 },
    ],
    edges: [
      { from: "s", to: "a", weight: 1 },
      { from: "s", to: "u", weight: 1 },
      { from: "a", to: "b", weight: 1 },
      { from: "a", to: "x", weight: 1 },
      { from: "u", to: "v", weight: 1 },
      { from: "b", to: "m", weight: 1 },
      { from: "m", to: "c", weight: 1 },
      { from: "c", to: "d", weight: 1 },
      { from: "d", to: "t", weight: 1 },
      { from: "t", to: "q", weight: 1 },
      { from: "q", to: "r", weight: 1 },
    ],
  }
}

function run(_: Config, recorder: Recorder) {
  const forward = ["s"]
  const backward = ["t"]
  recorder.record(
    "init",
    null,
    null,
    forward,
    backward,
    null,
    [],
    "Seed a forward BFS at s and a backward BFS at t.",
  )
  for (const [from, to, side] of [
    ["s", "a", "forward"],
    ["s", "u", "forward"],
    ["t", "d", "backward"],
    ["t", "q", "backward"],
    ["a", "b", "forward"],
    ["a", "x", "forward"],
    ["u", "v", "forward"],
    ["d", "c", "backward"],
    ["q", "r", "backward"],
    ["b", "m", "forward"],
  ] as const) {
    ;(side === "forward" ? forward : backward).push(to)
    recorder.record(
      "expand",
      to,
      [from, to],
      forward,
      backward,
      null,
      [],
      `${side === "forward" ? "Forward" : "Backward"} BFS reaches ${to} from ${from}.`,
    )
  }
  backward.push("m")
  recorder.record(
    "meet",
    "m",
    ["c", "m"],
    forward,
    backward,
    "m",
    [],
    "Backward BFS reaches m, already visited by the forward search.",
  )
  const path = ["s", "a", "b", "m", "c", "d", "t"]
  recorder.record(
    "path",
    "m",
    null,
    forward,
    backward,
    "m",
    path,
    "Splice the two parent chains at m.",
  )
  recorder.record(
    "done",
    null,
    null,
    forward,
    backward,
    "m",
    path,
    "Shortest path: s → a → b → m → c → d → t.",
  )
}

export const bidirectionalSearch = {
  id: "bidirectional-search",
  kind: "graph",
  family,
  meta: { label: "Bidirectional Search" },
  parse,
  run,
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
