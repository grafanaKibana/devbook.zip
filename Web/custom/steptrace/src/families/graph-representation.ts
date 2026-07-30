import { adjacency, normalizeGraph } from "../graph"
import { GRAPH_NODE_RADIUS_PX, observeFixedSvgNodes, trimGraphEdge } from "../graph-node"
import { el } from "../render"
import type { MountHandle } from "../types"
import { createStructureShell } from "./interactive-structure"

const SVG_NS = "http://www.w3.org/2000/svg"
const VERTICES = ["0", "1", "2", "3"] as const
const INITIAL_EDGES = [
  ["0", "1"],
  ["0", "2"],
  ["1", "3"],
  ["2", "3"],
] as const
const CHANGE_MS = 520
let graphRepresentationId = 0

function svgElement<K extends keyof SVGElementTagNameMap>(
  kind: K,
  attributes: Record<string, string | number> = {},
) {
  const node = document.createElementNS(SVG_NS, kind)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  return node
}

function edgeKey(from: string, to: string) {
  return `${from}|${to}`
}

export function mountGraphRepresentation(root: HTMLElement): MountHandle {
  const shell = createStructureShell(
    root,
    "graph",
    "graph",
    "Interactive directed unweighted graph storage inspector",
    "graph-representation",
    "steptrace__graph-representation",
  )
  const edges: Array<{ from: string; to: string }> = INITIAL_EDGES.map(([from, to]) => ({
    from,
    to,
  }))
  let changedEdge: string | null = null
  let changeTimer: ReturnType<typeof setTimeout> | null = null

  const topology = el("section", "steptrace__graph-rep-topology")
  topology.setAttribute("aria-label", "Directed graph topology")
  const svg = svgElement("svg", {
    class: "steptrace__graph-rep-svg",
    viewBox: "0 0 580 210",
    role: "img",
    "aria-label": "Directed graph with vertices 0 through 3",
  })
  const markerId = `steptrace-graph-rep-arrow-${++graphRepresentationId}`
  const marker = svgElement("marker", {
    id: markerId,
    viewBox: "0 0 6 6",
    refX: 5,
    refY: 3,
    markerWidth: 7,
    markerHeight: 7,
    markerUnits: "strokeWidth",
    orient: "auto",
  })
  marker.append(
    svgElement("path", { class: "steptrace__graph-rep-arrow", d: "M 0 0 L 6 3 L 0 6 Z" }),
  )
  const defs = svgElement("defs")
  defs.append(marker)
  const edgeLayer = svgElement("g", { class: "steptrace__graph-rep-edges" })
  const nodeLayer = svgElement("g", { class: "steptrace__graph-rep-nodes" })
  svg.append(defs, edgeLayer, nodeLayer)
  topology.append(svg)

  const layout = normalizeGraph({
    directed: true,
    start: "0",
    nodes: VERTICES.map((id) => ({ id })),
    edges: INITIAL_EDGES.map(([from, to]) => ({ from, to })),
  })
  const positions = new Map(
    layout.nodes.map((node) => [node.id, { ...node, y: Math.round(105 + (node.y - 150) * 0.63) }]),
  )
  const topologyEdges = new Map<string, SVGLineElement>()
  for (const from of VERTICES) {
    for (const to of VERTICES) {
      if (from === to) continue
      const start = positions.get(from)!
      const end = positions.get(to)!
      const line = svgElement("line", {
        class: "steptrace__graph-rep-edge",
        x1: start.x,
        y1: start.y,
        x2: end.x,
        y2: end.y,
        "marker-end": `url(#${markerId})`,
      })
      line.dataset.edge = edgeKey(from, to)
      edgeLayer.append(line)
      topologyEdges.set(edgeKey(from, to), line)
    }
  }
  const topologyNodes = new Map<string, SVGGElement>()
  for (const vertex of VERTICES) {
    const position = positions.get(vertex)!
    const node = svgElement("g", {
      class: "steptrace__graph-rep-node",
      transform: `translate(${position.x} ${position.y})`,
    })
    const circle = svgElement("circle", { r: GRAPH_NODE_RADIUS_PX })
    const label = svgElement("text")
    label.textContent = vertex
    node.append(circle, label)
    nodeLayer.append(node)
    topologyNodes.set(vertex, node)
  }
  const geometry = observeFixedSvgNodes(
    svg,
    VERTICES.map((vertex) => ({
      element: topologyNodes.get(vertex)!,
      point: positions.get(vertex)!,
    })),
    (unitsPerCssPixel) => {
      const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
      for (const [key, line] of topologyEdges) {
        const [from, to] = key.split("|")
        const trimmed = trimGraphEdge(positions.get(from)!, positions.get(to)!, radius)
        line.setAttribute("x1", String(trimmed.x1))
        line.setAttribute("y1", String(trimmed.y1))
        line.setAttribute("x2", String(trimmed.x2))
        line.setAttribute("y2", String(trimmed.y2))
      }
    },
  )

  const storage = el("div", "steptrace__graph-rep-storage")
  const matrixPanel = el("section", "steptrace__graph-rep-group steptrace__graph-rep-matrix")
  const lists = el("div", "steptrace__graph-rep-lists")
  const listPanel = el("section", "steptrace__graph-rep-group steptrace__graph-rep-list")
  const edgePanel = el("section", "steptrace__graph-rep-group steptrace__graph-rep-edge-list")
  const panel = (target: HTMLElement, title: string, label: string) => {
    target.setAttribute("aria-label", label)
    const heading = el("h3", "steptrace__graph-rep-heading")
    heading.textContent = title
    target.append(heading)
  }
  panel(listPanel, "Adjacency list", "Adjacency list representation")
  panel(matrixPanel, "0 / 1 matrix", "Adjacency matrix representation")
  panel(edgePanel, "Edge list", "Ordered edge list representation")

  const list = el("div", "steptrace__contiguous-array steptrace__graph-rep-list-body")
  list.style.setProperty("--steptrace-capacity", "4")
  list.setAttribute("role", "list")
  const listRows = new Map<
    string,
    { row: HTMLElement; neighbors: HTMLElement; neighborCell: HTMLElement }
  >()
  for (const vertex of VERTICES) {
    const row = el("div", "steptrace__contiguous-cell steptrace__graph-rep-list-row")
    row.setAttribute("role", "listitem")
    row.dataset.empty = "0"
    const neighbors = el("span", "steptrace__contiguous-value")
    const vertexIndex = el("span", "steptrace__contiguous-index")
    vertexIndex.textContent = `vertex ${vertex}`
    row.append(neighbors, vertexIndex)
    list.append(row)
    listRows.set(vertex, { row, neighbors, neighborCell: row })
  }
  listPanel.append(list)

  const matrixWrap = el("div", "steptrace__dp-wrap steptrace__graph-rep-matrix-wrap")
  const matrix = el("table", "steptrace__dp steptrace__graph-rep-matrix-table")
  matrix.setAttribute("aria-label", "Rows are from vertices and columns are to vertices")
  const caption = document.createElement("caption")
  caption.className = "steptrace__dp-caption"
  caption.textContent = "Directed adjacency matrix; rows are from and columns are to vertices"
  matrix.append(caption)
  const matrixHead = document.createElement("thead")
  const matrixHeader = document.createElement("tr")
  const corner = document.createElement("th")
  corner.className = "steptrace__dp-corner"
  corner.setAttribute("scope", "col")
  corner.textContent = "from / to"
  matrixHeader.append(corner)
  for (const vertex of VERTICES) {
    const heading = document.createElement("th")
    heading.textContent = vertex
    heading.setAttribute("scope", "col")
    matrixHeader.append(heading)
  }
  matrixHead.append(matrixHeader)
  matrix.append(matrixHead)
  const matrixBody = document.createElement("tbody")
  const matrixCells = new Map<string, HTMLElement>()
  for (const from of VERTICES) {
    const row = document.createElement("tr")
    const heading = document.createElement("th")
    heading.textContent = from
    heading.setAttribute("scope", "row")
    row.append(heading)
    for (const to of VERTICES) {
      const cell = el("td", "steptrace__graph-rep-matrix-cell")
      cell.setAttribute("aria-label", `edge ${from} to ${to}`)
      cell.append(el("span", "steptrace__dp-value"))
      row.append(cell)
      matrixCells.set(edgeKey(from, to), cell)
    }
    matrixBody.append(row)
  }
  matrix.append(matrixBody)
  matrixWrap.append(matrix)
  matrixPanel.append(matrixWrap)

  const edgeList = el(
    "div",
    "steptrace__contiguous-array steptrace__graph-rep-edge-list-body steptrace__graph-rep-edge-strip",
  )
  edgeList.style.setProperty("--steptrace-capacity", "12")
  edgeList.setAttribute("role", "list")
  const edgeRows = Array.from({ length: VERTICES.length * (VERTICES.length - 1) }, (_, index) => {
    const row = el("div", "steptrace__contiguous-cell steptrace__graph-rep-edge-row")
    row.setAttribute("role", "listitem")
    const value = el("span", "steptrace__contiguous-value")
    const indexLabel = el("span", "steptrace__contiguous-index")
    indexLabel.textContent = String(index)
    row.append(value, indexLabel)
    edgeList.append(row)
    return { row, value }
  })
  edgePanel.append(edgeList)
  lists.append(listPanel, edgePanel)
  storage.append(matrixPanel, lists)
  shell.stage.append(topology, storage)

  const from = shell.select("From vertex", "From", VERTICES)
  const to = shell.select("To vertex", "To", VERTICES)
  from.classList.add("steptrace__graph-rep-select")
  to.classList.add("steptrace__graph-rep-select")
  const add = shell.button("Add edge", true)
  const remove = shell.button("Remove edge")
  const reset = shell.button("Reset")
  reset.classList.add("steptrace__graph-rep-reset")
  shell.controls.append(from, to, add, remove, reset)

  function hasEdge(source: string, target: string) {
    return edges.some((edge) => edge.from === source && edge.to === target)
  }

  function paint() {
    const graph = normalizeGraph({
      directed: true,
      start: "0",
      nodes: VERTICES.map((id) => ({ id, ...positions.get(id)! })),
      edges,
    })
    const neighbors = adjacency(graph)
    const present = new Set(edges.map((edge) => edgeKey(edge.from, edge.to)))

    for (const [key, line] of topologyEdges) {
      line.dataset.present = present.has(key) ? "1" : "0"
      line.dataset.changed = changedEdge === key && present.has(key) ? "1" : "0"
    }
    for (const vertex of VERTICES) {
      const { row, neighbors: values, neighborCell } = listRows.get(vertex)!
      values.textContent = neighbors[vertex].length ? neighbors[vertex].join(", ") : "∅"
      neighborCell.dataset.changed = changedEdge?.startsWith(`${vertex}|`) ? "1" : "0"
      row.setAttribute(
        "aria-label",
        `vertex ${vertex}, neighbors ${neighbors[vertex].length ? neighbors[vertex].join(", ") : "none"}`,
      )
    }
    for (const fromVertex of VERTICES) {
      for (const toVertex of VERTICES) {
        const key = edgeKey(fromVertex, toVertex)
        const cell = matrixCells.get(key)!
        cell.children[0].textContent = present.has(key) ? "1" : "0"
        cell.dataset.value = present.has(key) ? "1" : "0"
        cell.dataset.changed = changedEdge === key ? "1" : "0"
      }
    }
    edgeRows.forEach(({ row, value }, index) => {
      const edge = edges[index]
      value.textContent = edge ? `${edge.from} → ${edge.to}` : "·"
      row.dataset.empty = edge ? "0" : "1"
      row.dataset.changed = edge && changedEdge === edgeKey(edge.from, edge.to) ? "1" : "0"
      row.setAttribute("aria-hidden", edge ? "false" : "true")
    })
    shell.setCounter(String(edges.length), " edges")
  }

  function flash(key: string) {
    changedEdge = key
    paint()
    if (changeTimer) clearTimeout(changeTimer)
    if (shell.reducedMotion()) {
      changedEdge = null
      paint()
      return
    }
    changeTimer = setTimeout(() => {
      changedEdge = null
      paint()
      changeTimer = null
    }, CHANGE_MS)
  }

  function addEdge() {
    const source = from.value
    const target = to.value
    if (!source || !target) {
      shell.status.textContent = "Choose From and To vertices."
      return
    }
    if (source === target) {
      shell.status.textContent = "Self-edges are not stored."
      return
    }
    if (hasEdge(source, target)) {
      shell.status.textContent = `Edge ${source} → ${target} already exists.`
      return
    }
    edges.push({ from: source, to: target })
    shell.status.textContent = `Added ${source} → ${target}.`
    flash(edgeKey(source, target))
  }

  function removeEdge() {
    const source = from.value
    const target = to.value
    if (!source || !target) {
      shell.status.textContent = "Choose From and To vertices."
      return
    }
    const index = edges.findIndex((edge) => edge.from === source && edge.to === target)
    if (source === target || index < 0) {
      shell.status.textContent = `Edge ${source} → ${target} does not exist.`
      return
    }
    edges.splice(index, 1)
    shell.status.textContent = `Removed ${source} → ${target}.`
    flash(edgeKey(source, target))
  }

  function resetGraph() {
    edges.splice(
      0,
      edges.length,
      ...INITIAL_EDGES.map(([source, target]) => ({ from: source, to: target })),
    )
    changedEdge = null
    if (changeTimer) clearTimeout(changeTimer)
    changeTimer = null
    paint()
    shell.status.textContent = "Graph reset."
  }

  shell.listen(add, "click", addEdge)
  shell.listen(remove, "click", removeEdge)
  shell.listen(reset, "click", resetGraph)
  paint()
  shell.status.textContent = "Add or remove an edge to inspect each representation."

  const handle = shell.finish()
  return {
    destroy() {
      if (changeTimer) clearTimeout(changeTimer)
      geometry.destroy()
      handle.destroy()
    },
  }
}
