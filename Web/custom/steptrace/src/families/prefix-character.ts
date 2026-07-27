import { el, escapeHtml, statusEl, successMarker } from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily } from "../types"

export type PrefixCharacterOperation =
  | "insert"
  | "prefix"
  | "search"
  | "build failures"
  | "scan"
export type PrefixCharacterFrameType =
  | "begin"
  | "reuse-edge"
  | "create-node"
  | "mark-terminal"
  | "complete-prefix"
  | "complete-search"
  | "failure-link"
  | "goto"
  | "fallback"
  | "output"
  | "done"

export interface PrefixCharacterNode {
  id: string
  label: string
  x: number
  y: number
}

export interface PrefixCharacterEdge {
  id: string
  from: string
  to: string
  kind?: "tree" | "failure"
  role?: "lo" | "eq" | "hi"
}

export interface PrefixCharacterConfig {
  profile: "trie" | "aho-corasick" | "ternary-search-tree"
  operations: Array<[PrefixCharacterOperation, string]>
  nodes: PrefixCharacterNode[]
  edges: PrefixCharacterEdge[]
}

export interface PrefixCharacterFrame {
  type: PrefixCharacterFrameType
  profile: PrefixCharacterConfig["profile"]
  nodes: readonly PrefixCharacterNode[]
  edges: readonly PrefixCharacterEdge[]
  visibleNodes: readonly string[]
  visibleEdges: readonly string[]
  activePath: readonly string[]
  activeEdge: string | null
  terminalNodes: readonly string[]
  operation: PrefixCharacterOperation | null
  key: string
  cursor: number | null
  testKind: "path" | "terminal" | null
  result: boolean | null
  text: string
  textCursor: number | null
  outputs: readonly string[]
  matches: readonly Readonly<{ pattern: string; end: number }>[]
  message: string
}

export interface PrefixCharacterOperations {
  begin(operation: PrefixCharacterOperation, key: string, message: string): void
  reuseEdge(edgeId: string, nodeId: string, cursor: number, message: string): void
  createNode(edgeId: string, nodeId: string, cursor: number, message: string): void
  markTerminal(nodeId: string, message: string): void
  completePrefix(result: boolean, message: string): void
  completeSearch(result: boolean, message: string): void
  failureLink(edgeId: string | null, nodeId: string, message: string): void
  goto(edgeId: string, nodeId: string, textCursor: number, message: string): void
  fallback(edgeId: string | null, nodeId: string, textCursor: number, message: string): void
  output(patterns: string[], textCursor: number, message: string): void
  setText(text: string): void
  done(message: string): void
  hasVisibleEdge(edgeId: string): boolean
  hasTerminal(nodeId: string): boolean
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: trie ${message}`)
}

function layoutNodes(
  labels: ReadonlyMap<string, string>,
  edges: readonly PrefixCharacterEdge[],
): PrefixCharacterNode[] {
  const treeEdges = edges.filter((edge) => edge.kind !== "failure")
  const children = new Map<string, string[]>()
  for (const id of labels.keys()) children.set(id, [])
  for (const edge of treeEdges) children.get(edge.from)?.push(edge.to)
  const depths = new Map([["root", 0]])
  const visitDepth = (id: string) => {
    const depth = depths.get(id) || 0
    for (const child of children.get(id) || []) {
      depths.set(child, depth + 1)
      visitDepth(child)
    }
  }
  visitDepth("root")
  const leaves = [...labels.keys()].filter((id) => (children.get(id)?.length || 0) === 0)
  const leafStep = leaves.length > 1 ? 270 / (leaves.length - 1) : 0
  const leafX = new Map(leaves.map((id, index) => [id, 35 + index * leafStep]))
  const xFor = (id: string): number => {
    const descendants = children.get(id) || []
    if (!descendants.length) return leafX.get(id) || 180
    return descendants.reduce((sum, child) => sum + xFor(child), 0) / descendants.length
  }
  const maxDepth = Math.max(...depths.values(), 1)
  const stepY = Math.min(58, 232 / maxDepth)
  return [...labels].map(([id, label]) => ({
    id,
    label,
    x: xFor(id),
    y: 38 + (depths.get(id) || 0) * stepY,
  }))
}

export function prefixTopology(keys: readonly string[]) {
  const prefixes = new Set([""])
  for (const key of keys) {
    for (let index = 1; index <= key.length; index++) prefixes.add(key.slice(0, index))
  }
  const ordered = [...prefixes]
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
  const labels = new Map(
    ordered.map((prefix) => [prefix || "root", prefix ? prefix.at(-1) || "" : "root"]),
  )
  const edges = ordered
    .filter(Boolean)
    .map((prefix) => {
      const parent = prefix.slice(0, -1) || "root"
      return { id: `${parent}->${prefix}`, from: parent, to: prefix } satisfies PrefixCharacterEdge
    })
  return { nodes: layoutNodes(labels, edges), edges }
}

export function characterTopology(
  labels: ReadonlyMap<string, string>,
  edges: readonly PrefixCharacterEdge[],
) {
  return { nodes: layoutNodes(labels, edges), edges: edges.slice() }
}

function topology(operations: PrefixCharacterConfig["operations"]) {
  return prefixTopology(
    operations.filter(([operation]) => operation === "insert").map(([, key]) => key),
  )
}

export function parsePrefixCharacterConfig(config: StepTraceConfig): PrefixCharacterConfig {
  if (!Array.isArray(config.operations) || !config.operations.length)
    invalidConfig('requires a non-empty "operations" array.')
  const operations = config.operations.map((entry) => {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      !["insert", "prefix", "search"].includes(entry[0]) ||
      typeof entry[1] !== "string" ||
      !entry[1]
    )
      invalidConfig('operations must be ["insert"|"prefix"|"search", non-empty string] pairs.')
    return [entry[0], entry[1]] as [PrefixCharacterOperation, string]
  })
  const built = topology(operations)
  return { profile: "trie", operations, ...built }
}

export class PrefixCharacterRecorder implements PrefixCharacterOperations {
  readonly frames: PrefixCharacterFrame[] = []
  private readonly nodes: readonly PrefixCharacterNode[]
  private readonly edges: readonly PrefixCharacterEdge[]
  private readonly visibleNodes = new Set(["root"])
  private readonly visibleEdges = new Set<string>()
  private readonly terminalNodes = new Set<string>()
  private activePath = ["root"]
  private activeEdge: string | null = null
  private operation: PrefixCharacterOperation | null = null
  private key = ""
  private cursor: number | null = null
  private testKind: PrefixCharacterFrame["testKind"] = null
  private result: boolean | null = null
  private text = ""
  private textCursor: number | null = null
  private outputs: string[] = []
  private matches: Array<{ pattern: string; end: number }> = []

  constructor(private readonly config: PrefixCharacterConfig) {
    this.nodes = Object.freeze(config.nodes.map((node) => Object.freeze({ ...node })))
    this.edges = Object.freeze(config.edges.map((edge) => Object.freeze({ ...edge })))
  }

  hasVisibleEdge(edgeId: string) {
    return this.visibleEdges.has(edgeId)
  }

  hasTerminal(nodeId: string) {
    return this.terminalNodes.has(nodeId)
  }

  begin(operation: PrefixCharacterOperation, key: string, message: string) {
    this.operation = operation
    this.key = key
    this.cursor = 0
    this.activePath = ["root"]
    this.activeEdge = null
    this.testKind = null
    this.result = null
    this.textCursor = null
    this.outputs = []
    this.push("begin", message)
  }

  reuseEdge(edgeId: string, nodeId: string, cursor: number, message: string) {
    this.visibleEdges.add(edgeId)
    this.visibleNodes.add(nodeId)
    this.activePath.push(nodeId)
    this.activeEdge = edgeId
    this.cursor = cursor
    this.push("reuse-edge", message)
  }

  createNode(edgeId: string, nodeId: string, cursor: number, message: string) {
    this.visibleEdges.add(edgeId)
    this.visibleNodes.add(nodeId)
    this.activePath.push(nodeId)
    this.activeEdge = edgeId
    this.cursor = cursor
    this.push("create-node", message)
  }

  markTerminal(nodeId: string, message: string) {
    this.terminalNodes.add(nodeId)
    this.activeEdge = null
    this.push("mark-terminal", message)
  }

  completePrefix(result: boolean, message: string) {
    this.activeEdge = null
    this.testKind = "path"
    this.result = result
    this.push("complete-prefix", message)
  }

  completeSearch(result: boolean, message: string) {
    this.activeEdge = null
    this.testKind = "terminal"
    this.result = result
    this.push("complete-search", message)
  }

  setText(text: string) {
    this.text = text
  }

  failureLink(edgeId: string | null, nodeId: string, message: string) {
    if (edgeId) this.visibleEdges.add(edgeId)
    this.visibleNodes.add(nodeId)
    this.activePath = [nodeId]
    this.activeEdge = edgeId
    this.push("failure-link", message)
  }

  goto(edgeId: string, nodeId: string, textCursor: number, message: string) {
    this.visibleEdges.add(edgeId)
    this.visibleNodes.add(nodeId)
    this.activePath = [nodeId]
    this.activeEdge = edgeId
    this.textCursor = textCursor
    this.outputs = []
    this.push("goto", message)
  }

  fallback(edgeId: string | null, nodeId: string, textCursor: number, message: string) {
    if (edgeId) this.visibleEdges.add(edgeId)
    this.activePath = [nodeId]
    this.activeEdge = edgeId
    this.textCursor = textCursor
    this.outputs = []
    this.push("fallback", message)
  }

  output(patterns: string[], textCursor: number, message: string) {
    this.textCursor = textCursor
    this.outputs = patterns.slice()
    this.matches.push(...patterns.map((pattern) => ({ pattern, end: textCursor })))
    this.push("output", message)
  }

  done(message: string) {
    this.operation = null
    this.key = ""
    this.cursor = null
    this.activePath = []
    this.activeEdge = null
    this.testKind = null
    this.result = true
    this.push("done", message)
  }

  private push(type: PrefixCharacterFrameType, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        nodes: this.nodes,
        edges: this.edges,
        visibleNodes: Object.freeze([...this.visibleNodes]),
        visibleEdges: Object.freeze([...this.visibleEdges]),
        activePath: Object.freeze(this.activePath.slice()),
        activeEdge: this.activeEdge,
        terminalNodes: Object.freeze([...this.terminalNodes]),
        operation: this.operation,
        key: this.key,
        cursor: this.cursor,
        testKind: this.testKind,
        result: this.result,
        text: this.text,
        textCursor: this.textCursor,
        outputs: Object.freeze(this.outputs.slice()),
        matches: Object.freeze(this.matches.map((match) => Object.freeze({ ...match }))),
        message,
      }),
    )
  }
}

let viewSerial = 0
const SVGNS = "http://www.w3.org/2000/svg"

export function makePrefixCharacterView(
  frames: readonly PrefixCharacterFrame[],
): StepTraceView<PrefixCharacterFrame> {
  const topology = frames[0]
  const root = el("div", "steptrace__prefix-character")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Prefix character path debugger")
  root.tabIndex = 0
  const textRow = el("div", "steptrace__prefix-text")
  const railText = frames.find((frame) => frame.text)?.text || ""
  const textCells = Array.from(railText).map((character) => {
    const cell = el("span", "steptrace__prefix-text-cell")
    cell.textContent = character
    textRow.append(cell)
    return cell
  })
  textRow.hidden = textCells.length === 0
  textRow.dataset.visible = "0"
  textRow.setAttribute("aria-hidden", "true")
  const svg = document.createElementNS(SVGNS, "svg")
  const title = document.createElementNS(SVGNS, "title")
  const description = document.createElementNS(SVGNS, "desc")
  const id = `steptrace-prefix-character-${++viewSerial}`
  title.id = `${id}-title`
  description.id = `${id}-description`
  svg.setAttribute("class", "steptrace__prefix-svg")
  svg.setAttribute("viewBox", "0 0 360 300")
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet")
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-labelledby", `${title.id} ${description.id}`)
  svg.append(title, description)

  const positions = new Map(topology.nodes.map((node) => [node.id, node]))
  const edgeElements = new Map<
    string,
    { element: SVGGeometryElement; role: SVGTextElement | null }
  >()
  for (const edge of topology.edges) {
    const from = positions.get(edge.from)!
    const to = positions.get(edge.to)!
    const element = document.createElementNS(SVGNS, edge.kind === "failure" ? "path" : "line")
    element.setAttribute(
      "class",
      `steptrace__prefix-edge${edge.kind === "failure" ? " steptrace__prefix-edge--failure" : ""}`,
    )
    if (edge.kind === "failure") {
      const bend = from.x <= to.x ? -24 : 24
      element.setAttribute(
        "d",
        `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2 + bend} ${(from.y + to.y) / 2} ${to.x} ${to.y}`,
      )
    } else {
      element.setAttribute("x1", String(from.x))
      element.setAttribute("y1", String(from.y + 18))
      element.setAttribute("x2", String(to.x))
      element.setAttribute("y2", String(to.y - 18))
    }
    element.setAttribute("aria-hidden", "true")
    element.setAttribute("focusable", "false")
    svg.append(element)
    const role = edge.role ? document.createElementNS(SVGNS, "text") : null
    if (role) {
      role.setAttribute("class", "steptrace__prefix-edge-role")
      role.setAttribute("x", String((from.x + to.x) / 2 + 8))
      role.setAttribute("y", String((from.y + to.y) / 2))
      role.setAttribute("aria-hidden", "true")
      role.textContent = edge.role
      svg.append(role)
    }
    edgeElements.set(edge.id, { element, role })
  }

  const nodeElements = new Map<string, { group: SVGGElement; terminal: SVGSVGElement }>()
  for (const node of topology.nodes) {
    const group = document.createElementNS(SVGNS, "g")
    const circle = document.createElementNS(SVGNS, "circle")
    const label = document.createElementNS(SVGNS, "text")
    const terminal = successMarker("steptrace__prefix-terminal")
    group.setAttribute("class", "steptrace__prefix-node")
    group.setAttribute("transform", `translate(${node.x} ${node.y})`)
    group.setAttribute("aria-hidden", "true")
    group.setAttribute("focusable", "false")
    circle.setAttribute("r", "18")
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("dominant-baseline", "central")
    label.textContent = node.label
    terminal.setAttribute("x", "10")
    terminal.setAttribute("y", "-22")
    terminal.setAttribute("width", "13.2")
    terminal.setAttribute("height", "13.2")
    group.append(circle, label, terminal)
    svg.append(group)
    nodeElements.set(node.id, { group, terminal })
  }
  root.append(textRow, svg)

  const legend = el("div", "steptrace__legend")
  legend.setAttribute("aria-label", "Prefix character state legend")
  for (const [state, label] of [
    ["active", "active path"],
    ["reused", "reused edge"],
    ["created", "new node"],
    ["terminal", "terminal key"],
  ]) {
    const row = el("div", "steptrace__legend-row")
    const swatch = el("span", "steptrace__swatch steptrace__prefix-swatch")
    swatch.dataset.state = state
    row.append(swatch, document.createTextNode(label))
    legend.append(row)
  }
  const status = statusEl()

  function paint(frame: PrefixCharacterFrame, index = 0, total = frames.length) {
    const visibleNodes = new Set(frame.visibleNodes)
    const visibleEdges = new Set(frame.visibleEdges)
    const activePath = new Set(frame.activePath)
    const terminals = new Set(frame.terminalNodes)
    if (textCells.length) {
      const textVisible = Boolean(frame.text)
      textRow.dataset.visible = textVisible ? "1" : "0"
      textRow.setAttribute("aria-hidden", String(!textVisible))
    }
    textCells.forEach((cell, index) => {
      cell.dataset.active = frame.textCursor === index ? "1" : "0"
      cell.dataset.matched = frame.matches.some(
        (match) => index > match.end - match.pattern.length && index <= match.end,
      )
        ? "1"
        : "0"
    })
    const profileLabel = {
      trie: "Trie",
      "aho-corasick": "Aho-Corasick",
      "ternary-search-tree": "Ternary Search Tree",
    }[frame.profile]
    title.textContent = `${profileLabel} ${frame.operation || "complete"}: ${frame.key || "all operations"}`
    description.textContent = `${frame.message} Visible path ${frame.visibleNodes.join(" → ")}. Terminal keys ${frame.terminalNodes.filter((node) => node !== "root").join(", ") || "none"}.`
    for (const node of topology.nodes) {
      const elements = nodeElements.get(node.id)!
      elements.group.dataset.vis = visibleNodes.has(node.id) ? "1" : "0"
      elements.group.dataset.path = activePath.has(node.id) ? "1" : "0"
      elements.group.dataset.state =
        frame.type === "create-node" && frame.activePath.at(-1) === node.id
          ? "created"
          : frame.type === "reuse-edge" && frame.activePath.at(-1) === node.id
            ? "reused"
            : activePath.has(node.id)
              ? "active"
              : terminals.has(node.id)
                ? "terminal"
                : "settled"
      elements.terminal.dataset.visible = terminals.has(node.id) ? "1" : "0"
    }
    for (const edge of topology.edges) {
      const elements = edgeElements.get(edge.id)!
      const state =
        frame.activeEdge === edge.id
          ? frame.type === "create-node"
            ? "created"
            : "reused"
          : frame.activePath.includes(edge.from) && frame.activePath.includes(edge.to)
            ? "active"
            : "settled"
      elements.element.dataset.vis = visibleEdges.has(edge.id) ? "1" : "0"
      elements.element.dataset.state = frame.type === "fallback" ? "fallback" : state
      if (elements.role) {
        elements.role.dataset.vis = visibleEdges.has(edge.id) ? "1" : "0"
        elements.role.dataset.state = state
      }
    }
    status.innerHTML = `${escapeHtml(frame.message)} <span class="steptrace__counts">· step ${index + 1}/${total}</span>`
  }

  function watch(frame: PrefixCharacterFrame) {
    const character =
      frame.text && frame.textCursor != null
        ? frame.text[frame.textCursor] || "—"
        : frame.profile === "ternary-search-tree" && frame.cursor != null
          ? frame.key[frame.cursor] || "—"
          : frame.cursor && frame.cursor > 0
            ? frame.key[frame.cursor - 1] || "—"
            : frame.key[0] || "—"
    const rows = [
      {
        k: "operation",
        v: frame.operation ? `${frame.operation} ${frame.key}` : "complete",
        sw: "var(--_blue)",
      },
      { k: "character", v: character, sw: "var(--_violet)" },
    ]
    if (frame.testKind)
      rows.push({
        k: "test",
        v: `${frame.testKind} ${frame.result ? "found" : "missing"}`,
        sw: frame.result ? "var(--_green)" : "var(--_amber)",
      })
    else if (frame.text)
      rows.push({
        k: frame.outputs.length ? "output" : "state",
        v: frame.outputs.length
          ? frame.outputs.join(" + ")
          : frame.activePath.at(-1) || "root",
        sw: frame.outputs.length ? "var(--_green)" : "var(--_amber)",
      })
    return rows
  }

  return {
    nodes: [root, legend, status],
    stageLayout: "fill",
    stageAlignment: "center",
    stableStage: true,
    paint,
    watch,
  }
}

export const prefixCharacterFamily = {
  id: "prefix-character",
  createRecorder(config) {
    return new PrefixCharacterRecorder(config)
  },
  createView(frames) {
    return makePrefixCharacterView(frames)
  },
} satisfies VisualFamily<PrefixCharacterConfig, PrefixCharacterRecorder, PrefixCharacterFrame>
