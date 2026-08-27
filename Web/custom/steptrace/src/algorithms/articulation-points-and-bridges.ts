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
    currentNode: string | null,
    currentEdge: readonly [string, string] | null,
    discovery: Readonly<Record<string, number>>,
    low: Readonly<Record<string, number>>,
    articulationPoints: readonly string[],
    bridges: readonly (readonly [string, string])[],
    message: string,
  ) {
    const visited = new Set(Object.keys(discovery))
    const cuts = new Set(articulationPoints)
    const bridgeKeys = new Set(bridges.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]))
    const detail: GraphStateDetail = {
      kind: "low-link-cuts",
      discovery: { ...discovery },
      low: { ...low },
      articulationPoints: [...articulationPoints],
      bridges: bridges.map((edge) => [...edge] as const),
    }
    this.frames.push({
      type,
      profile: "articulation-points-and-bridges",
      nodes: this.config.nodes,
      edges: this.config.edges,
      decor: [],
      start: "0",
      target: null,
      currentNode,
      currentEdge,
      selectedEdges: [...bridgeKeys],
      nodeState: Object.fromEntries(
        this.config.nodes.map(({ id }) => [
          id,
          cuts.has(id)
            ? "accepted"
            : id === currentNode
              ? "active"
              : visited.has(id)
                ? "closed"
                : "neutral",
        ]),
      ),
      edgeState: Object.fromEntries(
        this.config.edges.map(({ from, to }) => [
          `${from}|${to}`,
          bridgeKeys.has(`${from}|${to}`)
            ? "cut"
            : currentEdge &&
                ((from === currentEdge[0] && to === currentEdge[1]) ||
                  (from === currentEdge[1] && to === currentEdge[0]))
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
      { id: "0", label: "0", x: 90, y: 120 },
      { id: "1", label: "1", x: 220, y: 55 },
      { id: "2", label: "2", x: 220, y: 185 },
      { id: "3", label: "3", x: 390, y: 185 },
      { id: "4", label: "4", x: 540, y: 185 },
    ],
    edges: [
      { from: "0", to: "1", weight: 1 },
      { from: "1", to: "2", weight: 1 },
      { from: "2", to: "0", weight: 1 },
      { from: "2", to: "3", weight: 1 },
      { from: "3", to: "4", weight: 1 },
    ],
  }
}

function run(_: Config, recorder: Recorder) {
  const disc: Record<string, number> = {}
  const low: Record<string, number> = {}
  const cuts: string[] = []
  const bridges: Array<readonly [string, string]> = []
  const visit = (id: string, time: number, parent: string | null) => {
    disc[id] = low[id] = time
    recorder.record(
      "discover",
      id,
      parent ? [parent, id] : null,
      disc,
      low,
      cuts,
      bridges,
      `Discover ${id}: disc ${time}, low ${time}.`,
    )
  }
  visit("0", 0, null)
  visit("1", 1, "0")
  visit("2", 2, "1")
  low["2"] = 0
  recorder.record(
    "back-edge",
    "2",
    ["2", "0"],
    disc,
    low,
    cuts,
    bridges,
    "Back edge 2—0 lowers low[2] to 0.",
  )
  visit("3", 3, "2")
  visit("4", 4, "3")
  bridges.push(["3", "4"])
  if (!cuts.includes("3")) cuts.push("3")
  recorder.record(
    "cut",
    "3",
    ["3", "4"],
    disc,
    low,
    cuts,
    bridges,
    "low[4] > disc[3]: 3—4 is a bridge and 3 is a cut vertex.",
  )
  low["3"] = Math.min(low["3"], low["4"])
  bridges.push(["2", "3"])
  if (!cuts.includes("2")) cuts.push("2")
  recorder.record(
    "cut",
    "2",
    ["2", "3"],
    disc,
    low,
    cuts,
    bridges,
    "low[3] > disc[2]: 2—3 is a bridge and 2 is a cut vertex.",
  )
  low["1"] = Math.min(low["1"], low["2"])
  recorder.record(
    "propagate",
    "1",
    ["1", "2"],
    disc,
    low,
    cuts,
    bridges,
    "Propagate low[2] = 0 to vertex 1; the triangle remains connected.",
  )
  low["0"] = Math.min(low["0"], low["1"])
  recorder.record(
    "done",
    null,
    null,
    disc,
    low,
    cuts,
    bridges,
    "Cut vertices: 2, 3. Bridges: 2—3, 3—4.",
  )
}

export const articulationPointsAndBridges = {
  id: "articulation-points-and-bridges",
  kind: "graph",
  family,
  meta: { label: "Articulation Points and Bridges" },
  parse,
  run,
} satisfies FamilyAlgorithmDefinition<"graph", Config, Recorder, GraphStateFrame>
