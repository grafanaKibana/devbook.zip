import { el, makeLegend, statusEl } from "../render"
import {
  GRAPH_NODE_HALO_GAP_PX,
  GRAPH_NODE_RADIUS_PX,
  observeFixedSvgNodes,
  trimGraphEdge,
} from "../graph-node"
import type {
  EndpointSettings,
  GraphStateDecor,
  GraphStateDetail,
  GraphStateEdge,
  GraphStateEdgeRole,
  GraphStateFrame,
  GraphStateNode,
  GraphStateNodeRole,
  GraphStateScore,
  StepTraceConfig,
  StepTraceView,
  VisualFamily,
  WatchRow,
} from "../types"

export type {
  GraphStateDecor,
  GraphStateEdge,
  GraphStateFrame,
  GraphStateNode,
  GraphStateScore,
} from "../types"

export type GraphStateProfile =
  "coordinate-grid" | "ukraine-cities" | "building-floor" | "midtown-map"

export interface GraphStateHeuristicNode extends GraphStateNode {
  h: number
}

export interface GraphStateConfig {
  profile: GraphStateProfile
  policy: "a-star" | "greedy"
  nodes: GraphStateHeuristicNode[]
  edges: GraphStateEdge[]
  decor: GraphStateDecor[]
  start: string
  target: string
  endpointSettings?: EndpointSettings
  mapMode: boolean
  cityMode: boolean
}

export interface GraphStateOperations {
  init(g: Readonly<Record<string, number>>, open: readonly GraphStateScore[], message: string): void
  expand(
    node: string,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    message: string,
  ): void
  edge(
    from: string,
    to: string,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    message: string,
  ): void
  relax(
    from: string,
    to: string,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    message: string,
  ): void
  path(path: readonly string[], g: Readonly<Record<string, number>>, message: string): void
  done(
    path: readonly string[],
    g: Readonly<Record<string, number>>,
    primaryValue: number,
    baselineValue: number,
    message: string,
  ): void
}

const SVG_NS = "http://www.w3.org/2000/svg"
let graphStateViewId = 0
const GRAPH_STATE_MARKER_ROLES = ["neutral", "active", "selected", "cut"] as const
type GraphStateMarkerRole = (typeof GRAPH_STATE_MARKER_ROLES)[number]

function invalid(message: string): never {
  throw new Error(`steptrace: a-star ${message}`)
}

function pairKey(left: string, right: string) {
  return left < right ? `${left}|${right}` : `${right}|${left}`
}

function distance(a: Pick<GraphStateNode, "x" | "y">, b: Pick<GraphStateNode, "x" | "y">) {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function graphStateMarkerRole(role: GraphStateEdgeRole): GraphStateMarkerRole {
  if (role === "accepted") return "selected"
  if (role === "cut") return "cut"
  if (role === "active" || role === "candidate" || role === "residual") return "active"
  return "neutral"
}

export function graphStateAdjacency(config: GraphStateConfig) {
  const result = new Map(
    config.nodes.map((node) => [node.id, [] as Array<{ to: string; weight: number }>]),
  )
  for (const edge of config.edges) {
    result.get(edge.from)!.push({ to: edge.to, weight: edge.weight })
    if (!edge.directed) result.get(edge.to)!.push({ to: edge.from, weight: edge.weight })
  }
  for (const neighbours of result.values())
    neighbours.sort((left, right) => left.to.localeCompare(right.to))
  return result
}

export function graphStateShortestDistances(
  nodes: readonly GraphStateNode[],
  edges: readonly GraphStateEdge[],
  target: string,
) {
  const dist = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
  dist.set(target, 0)
  const pending = new Set(nodes.map((node) => node.id))
  while (pending.size) {
    let current: string | null = null
    for (const id of pending) {
      if (current == null || dist.get(id)! < dist.get(current)!) current = id
    }
    if (current == null || !Number.isFinite(dist.get(current)!)) break
    pending.delete(current)
    for (const edge of edges) {
      const candidates: Array<[string, string]> = [[edge.to, edge.from]]
      if (!edge.directed) candidates.push([edge.from, edge.to])
      for (const [from, to] of candidates) {
        if (from !== current || !pending.has(to)) continue
        dist.set(to, Math.min(dist.get(to)!, dist.get(from)! + edge.weight))
      }
    }
  }
  return dist
}

function gridScenario(): GraphStateConfig {
  const blocked = new Set(["1,1", "3,1", "4,1", "1,2", "3,2", "3,3"])
  const nodes: GraphStateHeuristicNode[] = []
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 6; column++) {
      const id = `${column},${row}`
      if (blocked.has(id)) continue
      nodes.push({
        id,
        label: id,
        x: 55 + column * 100,
        y: 50 + row * 70,
        h: Math.abs(5 - column) + Math.abs(2 - row),
      })
    }
  }
  const ids = new Set(nodes.map((node) => node.id))
  const edges: GraphStateEdge[] = []
  for (const node of nodes) {
    const [column, row] = node.id.split(",").map(Number)
    for (const [nextColumn, nextRow] of [
      [column + 1, row],
      [column, row + 1],
    ]) {
      const to = `${nextColumn},${nextRow}`
      if (ids.has(to)) edges.push({ from: node.id, to, weight: 1 })
    }
  }
  return {
    profile: "coordinate-grid",
    policy: "a-star",
    nodes,
    edges,
    decor: [...blocked].map((id) => {
      const [column, row] = id.split(",").map(Number)
      return {
        kind: "rect" as const,
        className: "steptrace__gs-wall",
        x: 31 + column * 100,
        y: 26 + row * 70,
        width: 48,
        height: 48,
        rx: 6,
      }
    }),
    start: "0,1",
    target: "5,2",
    mapMode: false,
    cityMode: false,
  }
}

const CITY_DATA = [
  ["Vinnytsia", 49.2331, 28.4682],
  ["Lutsk", 50.7472, 25.3254],
  ["Dnipro", 48.4647, 35.0462],
  ["Donetsk", 48.0159, 37.8028],
  ["Zhytomyr", 50.2547, 28.6587],
  ["Uzhhorod", 48.6208, 22.2879],
  ["Zaporizhzhia", 47.8388, 35.1396],
  ["Ivano-Frankivsk", 48.9226, 24.7111],
  ["Kyiv", 50.4501, 30.5234],
  ["Kropyvnytskyi", 48.5079, 32.2623],
  ["Luhansk", 48.574, 39.3078],
  ["Lviv", 49.8397, 24.0297],
  ["Mykolaiv", 46.975, 31.9946],
  ["Odesa", 46.4825, 30.7233],
  ["Poltava", 49.5883, 34.5514],
  ["Rivne", 50.6199, 26.2516],
  ["Sumy", 50.9077, 34.7981],
  ["Ternopil", 49.5535, 25.5948],
  ["Kharkiv", 49.9935, 36.2304],
  ["Kherson", 46.6354, 32.6169],
  ["Khmelnytskyi", 49.4229, 26.9871],
  ["Cherkasy", 49.4444, 32.0598],
  ["Chernivtsi", 48.2915, 25.9403],
  ["Chernihiv", 51.4982, 31.2893],
  ["Simferopol", 44.9521, 34.1024],
] as const

const CITY_NODE_OFFSETS: Readonly<Record<string, readonly [number, number]>> = {
  Lutsk: [-8, -4],
  Rivne: [5, 3],
  Lviv: [-6, 4],
  Ternopil: [5, -2],
  "Ivano-Frankivsk": [-7, 7],
  Chernivtsi: [2, 7],
  Khmelnytskyi: [7, -4],
  Vinnytsia: [-4, 5],
  Zhytomyr: [-4, -4],
  Kyiv: [5, -4],
  Cherkasy: [4, 5],
  Kropyvnytskyi: [0, 6],
  Dnipro: [-4, 4],
  Zaporizhzhia: [4, 5],
}

function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = radians(b.lat - a.lat)
  const dLon = radians(b.lon - a.lon)
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function cityScenario(start: string, target: string): GraphStateConfig {
  const raw = CITY_DATA.map(([id, lat, lon]) => {
    const [offsetX = 0, offsetY = 0] = CITY_NODE_OFFSETS[id] || []
    return {
      id,
      label: id,
      lat,
      lon,
      x: Math.max(24, Math.min(596, 40 + ((lon - 22.1) / 17.4) * 540 + offsetX)),
      y: Math.max(20, Math.min(300, 24 + ((51.7 - lat) / 7.1) * 266 + offsetY)),
    }
  })
  const lookup = new Map<string, (typeof raw)[number]>(raw.map((city) => [city.id, city]))
  const safeStart = lookup.has(start) ? start : "Lviv"
  const safeTarget =
    lookup.has(target) && target !== safeStart
      ? target
      : safeStart === "Kharkiv"
        ? "Lviv"
        : "Kharkiv"
  const edgeKeys = new Set<string>()
  const edges: GraphStateEdge[] = []
  for (const city of raw) {
    const neighbours = raw
      .filter((candidate) => candidate !== city)
      .sort((left, right) => haversine(city, left) - haversine(city, right))
      .slice(0, 3)
    for (const neighbour of neighbours) {
      const key = pairKey(city.id, neighbour.id)
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      edges.push({
        from: city.id,
        to: neighbour.id,
        weight: Math.ceil(haversine(city, neighbour) * 1.12),
      })
    }
  }
  const goal = lookup.get(safeTarget)!
  const nodes = raw.map((city) => ({
    id: city.id,
    label: city.label,
    x: city.x,
    y: city.y,
    h: Math.floor(haversine(city, goal)),
  }))
  const offsets: Record<string, [number, number]> = {
    Uzhhorod: [0, 14],
    Lviv: [-9, -10],
    Lutsk: [-8, -10],
    Rivne: [10, 13],
    Ternopil: [28, 6],
    "Ivano-Frankivsk": [-30, 18],
    Chernivtsi: [8, 18],
    Khmelnytskyi: [30, -12],
    Vinnytsia: [-13, 13],
    Zhytomyr: [-13, -10],
    Kyiv: [11, -10],
    Chernihiv: [8, -10],
    Cherkasy: [13, 13],
    Kropyvnytskyi: [0, 14],
    Odesa: [-9, 13],
    Mykolaiv: [12, -10],
    Kherson: [12, 13],
    Simferopol: [0, 14],
    Poltava: [10, -10],
    Sumy: [0, -10],
    Dnipro: [-11, 13],
    Zaporizhzhia: [14, 13],
    Kharkiv: [0, -10],
    Donetsk: [0, 14],
    Luhansk: [0, -10],
  }
  const decor: GraphStateDecor[] = nodes.map((city) => ({
    kind: "text",
    className: "steptrace__gs-map-label steptrace__gs-city-label",
    x: city.x + offsets[city.id][0],
    y: city.y + offsets[city.id][1],
    text: city.label,
  }))
  return {
    profile: "ukraine-cities",
    policy: "a-star",
    nodes,
    edges,
    decor,
    start: safeStart,
    target: safeTarget,
    endpointSettings: {
      startLabel: "From",
      targetLabel: "To",
      options: nodes.map((node) => ({ value: node.id, label: node.label })),
      start: safeStart,
      target: safeTarget,
    },
    mapMode: true,
    cityMode: true,
  }
}

function buildingScenario(): GraphStateConfig {
  const nodes = [
    ["S", "Studio door", 45, 155],
    ["W", "West hall", 100, 155],
    ["D1", "Meeting threshold", 180, 155],
    ["J1", "West junction", 280, 155],
    ["J2", "Fire door west", 340, 155],
    ["J3", "Fire door east", 380, 155],
    ["J4", "East junction", 421, 155],
    ["EU", "East stair", 510, 155],
    ["X", "Emergency exit", 575, 155],
    ["WL", "West lower turn", 100, 215],
    ["ML", "Lower hall west", 280, 215],
    ["D5", "Lower junction", 350, 215],
    ["EL", "Lower hall east", 421, 215],
    ["ER", "East lower turn", 510, 215],
    ["D2", "Kitchen threshold", 280, 130],
    ["D3", "Archive threshold", 421, 130],
    ["D4", "Ops threshold", 510, 240],
    ["D6", "Reception threshold", 100, 130],
  ].map(([id, label, x, y]) => ({
    id: String(id),
    label: String(label),
    x: Number(x),
    y: Number(y),
    h: 0,
  }))
  const pairs = [
    ["S", "W"],
    ["W", "D1"],
    ["D1", "J1"],
    ["J1", "J2"],
    ["J3", "J4"],
    ["J4", "EU"],
    ["EU", "X"],
    ["W", "WL"],
    ["WL", "ML"],
    ["ML", "D5"],
    ["D5", "EL"],
    ["EL", "ER"],
    ["ER", "EU"],
    ["J1", "D2"],
    ["J4", "D3"],
    ["ER", "D4"],
    ["W", "D6"],
  ]
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges = pairs.map(([from, to]) => {
    const a = byId.get(from)!
    const b = byId.get(to)!
    return { from, to, weight: Math.max(1, Math.ceil(distance(a, b) / 40)) }
  })
  const remaining = graphStateShortestDistances(nodes, edges, "X")
  nodes.forEach((node) => (node.h = remaining.get(node.id)!))
  const rooms = [
    [25, 25, 150, 105, "RECEPTION"],
    [175, 25, 120, 105, "MEETING"],
    [295, 25, 140, 105, "KITCHEN"],
    [435, 25, 160, 105, "OFFICES"],
    [25, 240, 150, 55, "STUDIO"],
    [175, 240, 120, 55, "STORAGE"],
    [295, 240, 140, 55, "ARCHIVE"],
    [435, 240, 160, 55, "OPERATIONS"],
  ] as const
  const decor: GraphStateDecor[] = rooms.flatMap(([x, y, width, height, text]) => [
    { kind: "rect", className: "steptrace__gs-room", x, y, width, height },
    {
      kind: "text",
      className: "steptrace__gs-map-label",
      x: x + width / 2,
      y: y + height / 2,
      text,
    },
  ])
  decor.push(
    {
      kind: "rect",
      className: "steptrace__gs-closure",
      x: 346,
      y: 143,
      width: 28,
      height: 24,
      rx: 2,
    },
    { kind: "text", className: "steptrace__gs-map-label", x: 360, y: 137, text: "LOCKED" },
  )
  return {
    profile: "building-floor",
    policy: "a-star",
    nodes,
    edges,
    decor,
    start: "S",
    target: "X",
    mapMode: true,
    cityMode: false,
  }
}

function midtownScenario(): GraphStateConfig {
  const rows: Record<number, number> = { 47: 48, 46: 92, 45: 136, 44: 180, 43: 224, 42: 268 }
  const nodes: GraphStateHeuristicNode[] = []
  for (const [street, y] of Object.entries(rows)) {
    nodes.push({ id: `6-${street}`, label: `Sixth & W${street}`, x: 170, y, h: 0 })
    nodes.push({ id: `7-${street}`, label: `Seventh & W${street}`, x: 405, y, h: 0 })
  }
  for (const [id, x, y] of [
    ["B47", 310, 28],
    ["B46", 356, 81],
    ["B44", 437, 175],
    ["B43", 480, 224],
    ["B42", 518, 268],
  ] as const) {
    nodes.push({ id, label: `Broadway ${id.slice(1)}`, x, y, h: 0 })
  }
  const pairs: Array<[string, string, boolean?]> = []
  for (let street = 47; street > 42; street--) {
    if (street !== 45) pairs.push([`7-${street}`, `7-${street - 1}`, true])
    pairs.push([`6-${street - 1}`, `6-${street}`, true])
  }
  pairs.push(
    ["7-47", "B47"],
    ["B47", "B46", true],
    ["B46", "B44", true],
    ["B44", "B43", true],
    ["B43", "B42", true],
    ["B42", "6-42"],
    ["6-47", "B47"],
    ["7-46", "B46"],
    ["6-46", "B46"],
    ["7-45", "B44"],
    ["6-43", "B43"],
    ["6-47", "7-47", true],
    ["7-46", "6-46", true],
    ["6-45", "7-45", true],
    ["6-43", "7-43", true],
    ["7-42", "6-42", true],
  )
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const edges = pairs.map(([from, to, directed]) => ({
    from,
    to,
    directed,
    weight: Math.max(1, Math.ceil(distance(byId.get(from)!, byId.get(to)!) / 45)),
  }))
  const remaining = graphStateShortestDistances(nodes, edges, "6-42")
  nodes.forEach((node) => (node.h = remaining.get(node.id) ?? 0))
  const decor: GraphStateDecor[] = [
    { kind: "path", className: "steptrace__gs-street", d: "M170 18 L170 300" },
    { kind: "path", className: "steptrace__gs-street", d: "M405 18 L405 300" },
    ...Object.values(rows).map((y) => ({
      kind: "path" as const,
      className: "steptrace__gs-street",
      d: `M55 ${y} L575 ${y}`,
    })),
    { kind: "path", className: "steptrace__gs-street", d: "M310 28 L540 292" },
  ]
  for (const y of [61, 105, 149, 193, 237]) {
    decor.push({
      kind: "rect",
      className: "steptrace__gs-building",
      x: 70,
      y,
      width: 80,
      height: 18,
    })
  }
  for (const [x, y, width] of [
    [190, 61, 120],
    [190, 105, 158],
    [190, 149, 195],
    [190, 193, 195],
    [190, 237, 195],
    [425, 61, 140],
    [425, 105, 140],
    [440, 149, 125],
    [480, 193, 85],
    [520, 237, 45],
  ] as const) {
    decor.push({ kind: "rect", className: "steptrace__gs-building", x, y, width, height: 18 })
  }
  decor.push(
    {
      kind: "rect",
      className: "steptrace__gs-closure",
      x: 272,
      y: 167,
      width: 62,
      height: 26,
      rx: 3,
    },
    { kind: "text", className: "steptrace__gs-map-label", x: 303, y: 184, text: "W44 CLOSED" },
    { kind: "text", className: "steptrace__gs-road-direction", x: 150, y: 113, text: "↑" },
    { kind: "text", className: "steptrace__gs-road-direction", x: 425, y: 113, text: "↓" },
    { kind: "text", className: "steptrace__gs-road-direction", x: 452, y: 199, text: "↘" },
  )
  return {
    profile: "midtown-map",
    policy: "a-star",
    nodes,
    edges,
    decor,
    start: "7-47",
    target: "6-42",
    mapMode: true,
    cityMode: false,
  }
}

export function parseGraphStateConfig(config: StepTraceConfig): GraphStateConfig {
  const profile = config.variant || "coordinate-grid"
  if (!["coordinate-grid", "ukraine-cities", "building-floor", "midtown-map"].includes(profile)) {
    invalid('"variant" must be coordinate-grid, ukraine-cities, building-floor, or midtown-map.')
  }
  if (profile === "ukraine-cities") {
    return cityScenario(String(config.start || "Lviv"), String(config.target || "Kharkiv"))
  }
  if (profile === "building-floor") return buildingScenario()
  if (profile === "midtown-map") return midtownScenario()
  return gridScenario()
}

export class GraphStateRecorder implements GraphStateOperations {
  readonly frames: GraphStateFrame[] = []
  constructor(private readonly config: GraphStateConfig) {}

  private push(
    type: GraphStateFrame["type"],
    current: string | null,
    activeEdge: readonly [string, string] | null,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    selectedPath: readonly string[],
    message: string,
    comparison: [number | null, number | null] = [null, null],
  ) {
    const selectedEdges = [...pathEdgeSet(selectedPath)]
    const nodeState = Object.fromEntries(
      this.config.nodes.map((node) => [
        node.id,
        selectedPath.includes(node.id)
          ? "accepted"
          : node.id === current
            ? "active"
            : open.some((entry) => entry.id === node.id)
              ? "frontier"
              : closed.includes(node.id)
                ? "closed"
                : "neutral",
      ]),
    ) as Record<string, GraphStateNodeRole>
    const edgeState = Object.fromEntries(
      this.config.edges.map((edge) => {
        const selected = selectedEdges.includes(`${edge.from}|${edge.to}`)
        const active =
          (activeEdge?.[0] === edge.from && activeEdge[1] === edge.to) ||
          (!edge.directed && activeEdge?.[0] === edge.to && activeEdge[1] === edge.from)
        const role: GraphStateEdgeRole = selected
          ? "accepted"
          : active
            ? "active"
            : selectedPath.length
              ? "rejected"
              : "neutral"
        return [`${edge.from}|${edge.to}`, role]
      }),
    )
    const detail: GraphStateDetail = {
      kind: "heuristic-search",
      policy: this.config.policy,
      open: open.map((entry) => Object.freeze({ ...entry })),
      closed: closed.slice(),
      costs: Object.freeze({ ...g }),
      heuristic: Object.freeze(
        Object.fromEntries(this.config.nodes.map((node) => [node.id, node.h])),
      ),
      comparison:
        this.config.policy === "greedy"
          ? {
              primaryLabel: "Greedy",
              primaryValue: comparison[0],
              baselineLabel: "A*",
              baselineValue: comparison[1],
              metric: "cost",
            }
          : {
              primaryLabel: "A*",
              primaryValue: comparison[0],
              baselineLabel: "Dijkstra",
              baselineValue: comparison[1],
              metric: "expansions",
            },
    }
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        nodes: this.config.nodes,
        edges: this.config.edges,
        decor: this.config.decor,
        start: this.config.start,
        target: this.config.target,
        currentNode: current,
        currentEdge: activeEdge,
        selectedEdges,
        nodeState: Object.freeze(nodeState),
        edgeState: Object.freeze(edgeState),
        message,
        detail,
      }),
    )
  }

  init(g: Readonly<Record<string, number>>, open: readonly GraphStateScore[], message: string) {
    this.push("init", null, null, g, open, [], [], message)
  }
  expand(
    node: string,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    message: string,
  ) {
    this.push("expand", node, null, g, open, closed, [], message)
  }
  edge(
    from: string,
    to: string,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    message: string,
  ) {
    this.push("edge", from, [from, to], g, open, closed, [], message)
  }
  relax(
    from: string,
    to: string,
    g: Readonly<Record<string, number>>,
    open: readonly GraphStateScore[],
    closed: readonly string[],
    message: string,
  ) {
    this.push("relax", from, [from, to], g, open, closed, [], message)
  }
  path(path: readonly string[], g: Readonly<Record<string, number>>, message: string) {
    this.push("path", path.at(-1) || null, null, g, [], path, path, message)
  }
  done(
    path: readonly string[],
    g: Readonly<Record<string, number>>,
    primaryValue: number,
    baselineValue: number,
    message: string,
  ) {
    this.push("done", null, null, g, [], path, path, message, [primaryValue, baselineValue])
  }
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  kind: K,
  attributes: Record<string, string | number> = {},
) {
  const node = document.createElementNS(SVG_NS, kind)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  return node
}

function decorElement(shape: GraphStateDecor) {
  const className = shape.className
  if (shape.kind === "rect")
    return svgElement("rect", {
      class: className,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      rx: shape.rx || 0,
    })
  if (shape.kind === "line")
    return svgElement("line", {
      class: className,
      x1: shape.x1,
      y1: shape.y1,
      x2: shape.x2,
      y2: shape.y2,
    })
  if (shape.kind === "path") return svgElement("path", { class: className, d: shape.d })
  const text = svgElement("text", { class: className, x: shape.x, y: shape.y })
  text.textContent = shape.text
  return text
}

function pathEdgeSet(path: readonly string[]) {
  const edges = new Set<string>()
  for (let index = 0; index + 1 < path.length; index++) {
    edges.add(`${path[index]}|${path[index + 1]}`)
    edges.add(`${path[index + 1]}|${path[index]}`)
  }
  return edges
}

export function graphStateSummary(frame: GraphStateFrame) {
  switch (frame.detail.kind) {
    case "heuristic-search": {
      const cost = frame.target ? frame.detail.costs[frame.target] : null
      const path =
        frame.start && frame.selectedEdges.length
          ? [
              frame.start,
              ...frame.selectedEdges
                .filter((_, index) => index % 2 === 0)
                .map((edge) => edge.split("|")[1]),
            ]
          : []
      const { comparison: result } = frame.detail
      const comparison =
        result.primaryValue != null && result.baselineValue != null
          ? result.metric === "cost"
            ? ` · ${result.primaryLabel} cost ${result.primaryValue} vs ${result.baselineLabel} cost ${result.baselineValue}`
            : ` · ${result.primaryLabel} ${result.primaryValue} vs ${result.baselineLabel} ${result.baselineValue} expansions`
          : ""
      if (
        path.length &&
        result.metric === "cost" &&
        result.primaryLabel === "Greedy" &&
        result.primaryValue != null &&
        result.baselineValue != null
      )
        return `Greedy ${path.join("→\u200b")}: cost ${result.primaryValue} vs A* cost ${result.baselineValue} (optimal).`
      return frame.target && cost == null
        ? `${frame.target} is unreachable.`
        : `Path ${path.length ? path.join(" → ") : "pending"}${cost == null ? "" : ` · cost ${cost}`}${comparison}.`
    }
    case "dual-search":
      return frame.detail.meeting
        ? `Frontiers meet at ${frame.detail.meeting}.`
        : "No meeting point was found."
    case "edge-relaxation":
      if (frame.target && frame.type === "done") return frame.message
      return `Distances ${Object.entries(frame.detail.distances)
        .map(([id, value]) => `${id}:${Number.isFinite(value) ? value : "∞"}`)
        .join(", ")}.`
    case "component-flood":
      return `${frame.detail.groups?.length ?? frame.detail.component} connected components.`
    case "low-link-cuts":
      return `${frame.detail.articulationPoints.length} articulation points · ${frame.detail.bridges.length} bridges.`
    case "low-link-components":
      return `${frame.detail.components.length} strongly connected components.`
    case "mst-scan":
      return `${frame.detail.accepted.length} tree edges · total weight ${frame.detail.totalWeight}.`
    case "mst-round":
      return `${frame.detail.components.length} component${frame.detail.components.length === 1 ? "" : "s"} · total weight ${frame.detail.totalWeight}.`
    case "path-backtrack": {
      const [first] = frame.detail.path
      const last = frame.detail.path.at(-1)
      const closesCycle =
        first != null &&
        last != null &&
        frame.edges.some(
          (edge) =>
            ((edge.from === last && edge.to === first) ||
              (edge.from === first && edge.to === last)) &&
            frame.selectedEdges.includes(`${edge.from}|${edge.to}`),
        )
      return frame.detail.path.length
        ? `Cycle ${[...frame.detail.path, ...(closesCycle ? [first] : [])].join(" → ")}.`
        : "No Hamiltonian cycle was found."
    }
    case "residual-flow":
      return `Maximum flow ${frame.detail.totalFlow}.`
  }
}

function graphStateLegend(kind: GraphStateDetail["kind"]) {
  switch (kind) {
    case "heuristic-search":
      return [
        ["current", "current"],
        ["open", "open"],
        ["closed / path", "closed"],
        ["goal", "goal"],
      ] as const
    case "dual-search":
      return [
        ["current", "current"],
        ["frontiers", "open"],
        ["visited / path", "closed"],
        ["meeting", "goal"],
      ] as const
    case "edge-relaxation":
      return [
        ["active edge", "current"],
        ["candidate", "open"],
        ["settled", "closed"],
        ["source", "goal"],
      ] as const
    case "component-flood":
      return [
        ["current", "current"],
        ["frontier", "open"],
        ["component", "closed"],
        ["seed", "goal"],
      ] as const
    case "low-link-cuts":
      return [
        ["current", "current"],
        ["DFS frontier", "open"],
        ["visited", "closed"],
        ["cut", "goal"],
      ] as const
    case "low-link-components":
      return [
        ["current", "current"],
        ["stack", "open"],
        ["component", "closed"],
        ["root", "goal"],
      ] as const
    case "mst-scan":
    case "mst-round":
      return [
        ["active edge", "current"],
        ["candidate", "open"],
        ["tree", "closed"],
        ["rejected", "goal"],
      ] as const
    case "path-backtrack":
      return [
        ["current", "current"],
        ["candidate", "open"],
        ["path", "closed"],
        ["rejected", "goal"],
      ] as const
    case "residual-flow":
      return [
        ["active edge", "current"],
        ["residual", "open"],
        ["flow", "closed"],
        ["cut", "goal"],
      ] as const
  }
}

function graphStateGroups(detail: GraphStateDetail) {
  if (detail.kind === "component-flood") return detail.groups || []
  if (detail.kind === "low-link-components") return detail.components
  if (detail.kind === "mst-round") return detail.components
  if (detail.kind === "mst-scan") return detail.components || []
  return []
}

export function makeGraphStateView(
  frames: readonly GraphStateFrame[],
): StepTraceView<GraphStateFrame> {
  const first = frames[0]
  const shell = el("div", "steptrace__graph-state")
  shell.dataset.profile = first.profile
  const graph = el("div", "steptrace__gs-graph")
  const svg = svgElement("svg", {
    class: "steptrace__gs-svg",
    viewBox: "0 0 620 320",
    role: "img",
    "aria-label": "Graph algorithm state",
  })
  const defs = svgElement("defs")
  const markerBaseId = `steptrace-gs-arrow-${++graphStateViewId}`
  const markerIds = new Map(
    GRAPH_STATE_MARKER_ROLES.map((role) => {
      const id = `${markerBaseId}-${role}`
      const marker = svgElement("marker", {
        id,
        viewBox: "0 0 6 6",
        refX: 6,
        refY: 3,
        markerWidth: 5,
        markerHeight: 5,
        markerUnits: "strokeWidth",
        orient: "auto-start-reverse",
      })
      marker.append(
        svgElement("path", {
          class: "steptrace__gs-arrow",
          d: "M 0 0 L 6 3 L 0 6 Z",
          "data-role": role,
        }),
      )
      defs.append(marker)
      return [role, id] as const
    }),
  )
  const decorLayer = svgElement("g", { class: "steptrace__gs-decor" })
  decorLayer.append(...first.decor.map(decorElement))
  const edgeLayer = svgElement("g", { class: "steptrace__gs-edges" })
  const edgeLabelLayer = svgElement("g", { class: "steptrace__gs-edge-labels" })
  const nodeLayer = svgElement("g", { class: "steptrace__gs-nodes" })
  svg.append(defs, decorLayer, edgeLayer, edgeLabelLayer, nodeLayer)
  graph.append(svg)

  const positions = new Map(first.nodes.map((node) => [node.id, node]))
  const compactMapNodes = first.profile === "building-floor" || first.profile === "midtown-map"
  const mapMarkers = first.profile === "ukraine-cities" || compactMapNodes
  const nodeRadius =
    first.profile === "ukraine-cities" ? 5 : compactMapNodes ? 6 : GRAPH_NODE_RADIUS_PX
  const weighted =
    ["heuristic-search", "edge-relaxation", "mst-scan", "mst-round", "residual-flow"].includes(
      first.detail.kind,
    ) || first.edges.some((edge) => edge.weight !== 1 || edge.label != null)
  const edgeElements = first.edges.map((edge) => {
    const from = positions.get(edge.from)!
    const to = positions.get(edge.to)!
    const line = svgElement("line", {
      class: "steptrace__gs-edge",
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    })
    if (edge.showDirection) line.setAttribute("marker-end", `url(#${markerIds.get("neutral")!})`)
    edgeLayer.append(line)
    const label = weighted
      ? svgElement("text", {
          class: "steptrace__gs-edge-label",
          x: (from.x + to.x) / 2,
          y: (from.y + to.y) / 2 - 7,
        })
      : null
    if (label) {
      label.textContent = edge.label ?? String(edge.weight)
      edgeLabelLayer.append(label)
    }
    return { edge, line, label, from, to }
  })
  const nodeElements = new Map(
    first.nodes.map((node) => {
      const group = svgElement("g", {
        class: `steptrace__gs-node${first.profile === "ukraine-cities" ? " steptrace__gs-node--city" : compactMapNodes ? " steptrace__gs-node--map" : ""}`,
        transform: `translate(${node.x} ${node.y})`,
      })
      const title = svgElement("title")
      title.textContent = node.label
      const halo = svgElement("circle", {
        class: "steptrace__gs-target",
        r: mapMarkers ? 13 : GRAPH_NODE_RADIUS_PX + GRAPH_NODE_HALO_GAP_PX,
      })
      const circle = svgElement("circle", {
        class: "steptrace__gs-node-circle",
        r: nodeRadius,
      })
      const label = svgElement("text", { class: "steptrace__gs-node-label", x: 0, y: 0 })
      label.textContent = node.label
      group.append(title, halo, circle, label)
      nodeLayer.append(group)
      return [node.id, group] as const
    }),
  )
  const applyEdgeGeometry = (radius: number, trimAll: boolean) => {
    for (const { edge, line, from, to } of edgeElements) {
      const inset = trimAll || edge.showDirection ? radius : 0
      const trimmed = trimGraphEdge(from, to, inset)
      line.setAttribute("x1", String(trimmed.x1))
      line.setAttribute("y1", String(trimmed.y1))
      line.setAttribute("x2", String(trimmed.x2))
      line.setAttribute("y2", String(trimmed.y2))
    }
  }
  const geometry = mapMarkers
    ? (applyEdgeGeometry(nodeRadius, false), null)
    : observeFixedSvgNodes(
        svg,
        first.nodes.map((node) => ({
          element: nodeElements.get(node.id)!,
          point: node,
        })),
        (unitsPerCssPixel) => {
          applyEdgeGeometry(GRAPH_NODE_RADIUS_PX * unitsPerCssPixel, true)
        },
      )

  const legend = makeLegend(
    graphStateLegend(first.detail.kind).map(([label, state]) => ({
      label,
      swatchClass: `steptrace__gs-swatch steptrace__gs-swatch--${state}`,
    })),
    "Graph state legend",
    "steptrace__gs-legend",
  )
  shell.append(graph)
  const status = statusEl()

  function paint(frame: GraphStateFrame) {
    const groups = graphStateGroups(frame.detail)
    const groupByNode = new Map(
      groups.flatMap((members, index) => members.map((id) => [id, index + 1] as const)),
    )
    for (const [id, group] of nodeElements) {
      const role = frame.nodeState[id] || "neutral"
      const component = groupByNode.get(id)
      group.dataset.group = component ? String(component) : ""
      group.dataset.state =
        role === "frontier"
          ? "open"
          : role === "active"
            ? "current"
            : role === "accepted" && !component
              ? "path"
              : role === "closed"
                ? "closed"
                : role === "rejected"
                  ? "rejected"
                  : ""
      group.dataset.target = String(id === frame.target)
      const node = positions.get(id)!
      if (frame.detail.kind === "heuristic-search") {
        const g = frame.detail.costs[id]
        const h = frame.detail.heuristic[id]
        group.children[0].textContent =
          frame.detail.policy === "greedy"
            ? `${node.label}: h ${h}; path cost ${g ?? "∞"} is ignored for priority`
            : `${node.label}: g ${g ?? "∞"}, h ${h}, f ${g == null ? "∞" : g + h}`
      } else {
        group.children[0].textContent = node.label
      }
    }
    for (const { edge, line, label } of edgeElements) {
      const role = frame.edgeState[`${edge.from}|${edge.to}`] || "neutral"
      line.dataset.active = String(role === "active" || role === "candidate" || role === "residual")
      line.dataset.selected = String(role === "accepted")
      line.dataset.cut = String(role === "cut")
      line.dataset.dim = String(role === "rejected")
      if (edge.showDirection) {
        const markerUrl = `url(#${markerIds.get(graphStateMarkerRole(role))!})`
        if (role === "residual") {
          line.setAttribute("marker-start", markerUrl)
          line.removeAttribute("marker-end")
        } else {
          line.removeAttribute("marker-start")
          line.setAttribute("marker-end", markerUrl)
        }
      }
      if (label) {
        label.textContent =
          frame.detail.kind === "residual-flow"
            ? `${frame.detail.flow[`${edge.from}|${edge.to}`] || 0}/${edge.weight}`
            : (edge.label ?? String(edge.weight))
      }
    }
    status.textContent = frame.message
  }

  function watch(frame: GraphStateFrame): WatchRow[] {
    const currentId = frame.currentNode || frame.currentEdge?.[0] || null
    const current = currentId ? positions.get(currentId)! : null
    const rows: WatchRow[] = [{ k: "current", v: current?.label || "—", sw: "var(--_blue)" }]
    if (frame.detail.kind === "heuristic-search") {
      const g = frame.currentNode ? frame.detail.costs[frame.currentNode] : null
      const h = frame.currentNode ? frame.detail.heuristic[frame.currentNode] : null
      rows.push(
        {
          k: "score",
          v:
            current && g != null && h != null
              ? frame.detail.policy === "greedy"
                ? `h ${h}`
                : `g ${g} · h ${h} · f ${g + h}`
              : "—",
          sw: "var(--_amber)",
        },
        {
          k: "open",
          v: frame.detail.open.map((entry) => entry.id).join(" · ") || "—",
          sw: "var(--_amber)",
        },
        {
          k: "closed",
          v: frame.detail.closed.join(" · ") || "—",
          sw: "var(--_green)",
        },
      )
    }
    if (
      frame.detail.kind === "heuristic-search" &&
      frame.detail.comparison.primaryValue != null &&
      frame.detail.comparison.baselineValue != null
    ) {
      const comparison = frame.detail.comparison
      rows.push({
        k: comparison.metric === "expansions" ? "expanded" : "comparison",
        v: `${comparison.primaryLabel} ${comparison.primaryValue} · ${comparison.baselineLabel} ${comparison.baselineValue}`,
        sw: "var(--_green)",
      })
    }
    switch (frame.detail.kind) {
      case "dual-search":
        rows.push(
          {
            k: "frontiers",
            v: `F ${frame.detail.forward.length} · B ${frame.detail.backward.length}`,
            sw: "var(--_amber)",
          },
          { k: "meeting", v: frame.detail.meeting || "—", sw: "var(--_violet)" },
        )
        break
      case "edge-relaxation": {
        const distances = frame.detail.distances
        const distanceWatch = frame.nodes
          .map(({ id }) => {
            const value = distances[id]
            return `${id}:${Number.isFinite(value) ? value : "∞"}`
          })
          .join(" · ")
        rows.push(
          {
            k: "distances",
            v: distanceWatch,
            sw: "var(--_blue)",
            hint: distanceWatch,
          },
          { k: "pass", v: String(frame.detail.pass), sw: "var(--_violet)" },
          { k: "edge", v: frame.detail.edge?.join(" → ") || "—", sw: "var(--_amber)" },
          {
            k: "change",
            v: frame.detail.changed ? "updated" : "kept",
            sw: frame.detail.changed ? "var(--_green)" : "var(--_neutral)",
          },
        )
        break
      }
      case "component-flood":
        rows.push(
          { k: "component", v: String(frame.detail.component), sw: "var(--_violet)" },
          { k: "frontier", v: String(frame.detail.frontier.length), sw: "var(--_amber)" },
          { k: "visited", v: String(frame.detail.visited.length), sw: "var(--_green)" },
        )
        break
      case "low-link-cuts": {
        const id = currentId || ""
        rows.push(
          {
            k: "disc / low",
            v: id ? `${frame.detail.discovery[id] ?? "—"} / ${frame.detail.low[id] ?? "—"}` : "—",
            sw: "var(--_amber)",
          },
          {
            k: "cut vertices",
            v: frame.detail.articulationPoints.join(" · ") || "—",
            sw: "var(--_violet)",
          },
          {
            k: "bridges",
            v: frame.detail.bridges.map(([from, to]) => `${from}—${to}`).join(" · ") || "—",
            sw: "var(--_green)",
          },
        )
        break
      }
      case "low-link-components": {
        const id = currentId || ""
        rows.push(
          {
            k: "disc / low",
            v: id ? `${frame.detail.discovery[id] ?? "—"} / ${frame.detail.low[id] ?? "—"}` : "—",
            sw: "var(--_amber)",
          },
          { k: "stack", v: frame.detail.stack.join(" · ") || "—", sw: "var(--_violet)" },
          { k: "components", v: String(frame.detail.components.length), sw: "var(--_green)" },
        )
        break
      }
      case "mst-scan":
        rows.push(
          { k: "pending", v: String(frame.detail.pending.length), sw: "var(--_amber)" },
          {
            k: "components",
            v: String(frame.detail.components?.length ?? "—"),
            sw: "var(--_violet)",
          },
          { k: "weight", v: String(frame.detail.totalWeight), sw: "var(--_violet)" },
        )
        break
      case "mst-round":
        rows.push(
          { k: "round", v: String(frame.detail.round), sw: "var(--_violet)" },
          { k: "components", v: String(frame.detail.components.length), sw: "var(--_amber)" },
          { k: "weight", v: String(frame.detail.totalWeight), sw: "var(--_green)" },
        )
        break
      case "path-backtrack":
        rows.push(
          { k: "path", v: frame.detail.path.join(" → ") || "—", sw: "var(--_green)" },
          { k: "candidates", v: frame.detail.candidates.join(" · ") || "—", sw: "var(--_amber)" },
          { k: "rejected", v: frame.detail.rejected.join(" · ") || "—", sw: "var(--_violet)" },
        )
        break
      case "residual-flow":
        rows.push(
          { k: "path", v: frame.detail.augmentingPath.join(" → ") || "—", sw: "var(--_amber)" },
          {
            k: "bottleneck",
            v: frame.detail.bottleneck == null ? "—" : String(frame.detail.bottleneck),
            sw: "var(--_violet)",
          },
          { k: "flow", v: String(frame.detail.totalFlow), sw: "var(--_green)" },
        )
        break
      case "heuristic-search":
        break
    }
    return rows
  }

  return {
    nodes: [shell, legend, status],
    stableStage: true,
    stageLayout: "fill",
    paint,
    watch,
    summary: graphStateSummary,
    destroy: () => geometry?.destroy(),
  }
}

export const graphStateFamily: VisualFamily<GraphStateConfig, GraphStateRecorder, GraphStateFrame> =
  {
    id: "graph-state",
    createRecorder(config) {
      return new GraphStateRecorder(config)
    },
    createView(frames) {
      return makeGraphStateView(frames)
    },
  }
