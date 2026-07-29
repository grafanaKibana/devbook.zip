import { el } from "../render"
import type { MountHandle } from "../types"
import { createIndexedBoard, createStructureShell } from "./interactive-structure"

export interface UnionFindConfig {
  size: number
}

const SVG_NS = "http://www.w3.org/2000/svg"
const WIDTH = 700
const HEIGHT = 220
const TOP = 34
const LEVEL_GAP = 66
const NODE_RADIUS = 18
let markerSerial = 0

function svgElement<K extends keyof SVGElementTagNameMap>(
  kind: K,
  attributes: Record<string, string | number> = {},
) {
  const node = document.createElementNS(SVG_NS, kind)
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value))
  return node
}

export function mountUnionFind(root: HTMLElement, config: UnionFindConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "union-find",
    "union-find",
    "Interactive disjoint-set forest with union by rank and path compression",
    "union-find",
    "steptrace__union-find",
  )
  const parent = Array.from({ length: config.size }, (_, index) => index)
  const rank = Array(config.size).fill(0)
  let highlighted = new Set<number>()
  let activeRoot: number | null = null
  let layoutWidth = WIDTH

  const forest = el("section", "steptrace__union-find-forest")
  forest.setAttribute("aria-label", "Disjoint-set parent forest")
  const svg = svgElement("svg", {
    class: "steptrace__union-find-svg",
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    role: "img",
    "aria-label": "Each arrow points from an element to its parent; roots point to themselves",
  })
  const markerId = `steptrace-union-find-arrow-${++markerSerial}`
  const marker = svgElement("marker", {
    id: markerId,
    viewBox: "0 0 6 6",
    refX: 5,
    refY: 3,
    markerWidth: 6,
    markerHeight: 6,
    orient: "auto",
  })
  marker.append(svgElement("path", { d: "M 0 0 L 6 3 L 0 6 Z" }))
  const defs = svgElement("defs")
  defs.append(marker)
  const edges = svgElement("g", { class: "steptrace__union-find-edges" })
  const nodes = svgElement("g", { class: "steptrace__union-find-nodes" })
  svg.append(defs, edges, nodes)
  forest.append(svg)

  const edgeNodes = Array.from({ length: config.size }, () => {
    const edge = svgElement("path", {
      class: "steptrace__union-find-edge",
      "marker-end": `url(#${markerId})`,
    })
    edges.append(edge)
    return edge
  })
  const nodeNodes = Array.from({ length: config.size }, (_, index) => {
    const group = svgElement("g", { class: "steptrace__union-find-node" })
    const circle = svgElement("circle", { r: NODE_RADIUS })
    const value = svgElement("text", { "text-anchor": "middle", "dominant-baseline": "central" })
    const rootLabel = svgElement("text", {
      class: "steptrace__union-find-root-label",
      x: 0,
      y: 31,
      "text-anchor": "middle",
    })
    value.textContent = String(index)
    rootLabel.textContent = "root"
    group.append(circle, value, rootLabel)
    nodes.append(group)
    return { group, rootLabel }
  })

  const parentLabel = el("div", "steptrace__rail-label steptrace__union-find-parent-label")
  parentLabel.textContent = "Parent array"
  const parentWrap = el("div", "steptrace__union-find-parent")
  const parentBoard = createIndexedBoard(parentWrap, config.size, "Parent index for each element")
  shell.stage.append(forest, parentLabel, parentWrap)

  const values = Array.from({ length: config.size }, (_, index) => String(index))
  const first = shell.select("First element", "Element A", values, "0")
  const second = shell.select("Second element", "Element B", values, "1")
  const union = shell.button("Union", true)
  const find = shell.button("Find A")
  const connected = shell.button("Connected?")
  const reset = shell.button("Reset")
  shell.controls.append(first, second, union, find, connected, reset)

  function rootOf(start: number) {
    let current = start
    while (parent[current] !== current) current = parent[current]
    return current
  }

  function findAndCompress(start: number) {
    const path = [start]
    let current = start
    while (parent[current] !== current) {
      current = parent[current]
      path.push(current)
    }
    for (const node of path) parent[node] = current
    return { root: current, path }
  }

  function layout() {
    const children = Array.from({ length: config.size }, () => [] as number[])
    const roots: number[] = []
    for (let index = 0; index < config.size; index++) {
      if (parent[index] === index) roots.push(index)
      else children[parent[index]].push(index)
    }
    const widths = Array(config.size).fill(1)
    const measure = (node: number): number => {
      widths[node] = Math.max(
        1,
        children[node].reduce((sum, child) => sum + measure(child), 0),
      )
      return widths[node]
    }
    const gap = 0.45
    const total = roots.reduce((sum, root) => sum + measure(root), 0) + gap * (roots.length - 1)
    const positions = Array.from({ length: config.size }, () => ({ x: 0, y: 0 }))
    const place = (node: number, start: number, depth: number) => {
      positions[node] = {
        x: 35 + ((start + widths[node] / 2) / total) * (layoutWidth - 70),
        y: TOP + depth * LEVEL_GAP,
      }
      let cursor = start
      for (const child of children[node]) {
        place(child, cursor, depth + 1)
        cursor += widths[child]
      }
    }
    let cursor = 0
    for (const root of roots) {
      place(root, cursor, 0)
      cursor += widths[root] + gap
    }
    return { positions, roots }
  }

  function paint(message = "") {
    const { positions, roots } = layout()
    const selected = new Set([Number(first.value), Number(second.value)])
    nodeNodes.forEach(({ group, rootLabel }, index) => {
      const position = positions[index]
      const root = rootOf(index)
      group.setAttribute("transform", `translate(${position.x} ${position.y})`)
      group.dataset.root = String(parent[index] === index)
      group.dataset.active = String(highlighted.has(index))
      group.dataset.selected = String(selected.has(index))
      group.dataset.representative = String(activeRoot === index)
      group.style.setProperty("--steptrace-uf-set", `var(--steptrace-uf-set-${root})`)
      group.setAttribute(
        "aria-label",
        `element ${index}, parent ${parent[index]}, representative ${root}${
          parent[index] === index ? ", root" : ""
        }`,
      )
      rootLabel.style.display = parent[index] === index ? "" : "none"

      const edge = edgeNodes[index]
      if (parent[index] === index) {
        edge.style.display = "none"
        return
      }
      const target = positions[parent[index]]
      const dx = target.x - position.x
      const dy = target.y - position.y
      const distance = Math.hypot(dx, dy)
      const startX = position.x + (dx * NODE_RADIUS) / distance
      const startY = position.y + (dy * NODE_RADIUS) / distance
      const endX = target.x - (dx * (NODE_RADIUS + 5)) / distance
      const endY = target.y - (dy * (NODE_RADIUS + 5)) / distance
      edge.style.display = ""
      edge.dataset.active = String(highlighted.has(index))
      edge.setAttribute(
        "d",
        `M ${startX} ${startY} C ${startX} ${(startY + endY) / 2}, ${endX} ${(startY + endY) / 2}, ${endX} ${endY}`,
      )
    })
    parentBoard.paint(
      parent.map((value, index) => ({
        value: String(value),
        active: parent[index] === index,
        changed: highlighted.has(index),
        ariaLabel: `element ${index}, parent ${value}`,
      })),
    )
    shell.setCounter(String(roots.length), roots.length === 1 ? " set" : " sets")
    shell.status.textContent =
      message || "Union two elements, find A's representative, or compare their sets."
  }

  function selectedPair() {
    const a = Number(first.value)
    const b = Number(second.value)
    return Number.isInteger(a) && Number.isInteger(b) ? ([a, b] as const) : null
  }

  function onUnion() {
    const pair = selectedPair()
    if (!pair) return
    const [a, b] = pair
    const left = findAndCompress(a)
    const right = findAndCompress(b)
    highlighted = new Set([...left.path, ...right.path])
    if (left.root === right.root) {
      activeRoot = left.root
      paint(`${a} and ${b} already share root ${left.root}.`)
      return
    }
    let parentRoot = left.root
    let childRoot = right.root
    if (rank[parentRoot] < rank[childRoot]) [parentRoot, childRoot] = [childRoot, parentRoot]
    parent[childRoot] = parentRoot
    if (rank[parentRoot] === rank[childRoot]) rank[parentRoot]++
    highlighted.add(childRoot)
    highlighted.add(parentRoot)
    activeRoot = parentRoot
    paint(`Union(${a}, ${b}) linked root ${childRoot} under root ${parentRoot} by rank.`)
  }

  function onFind() {
    const a = Number(first.value)
    if (!Number.isInteger(a)) return
    const result = findAndCompress(a)
    highlighted = new Set(result.path)
    activeRoot = result.root
    paint(
      result.path.length > 1
        ? `Find(${a}) followed ${result.path.join(" → ")} and compressed the path to root ${result.root}.`
        : `Find(${a}) = ${result.root}; it is already a root.`,
    )
  }

  function onConnected() {
    const pair = selectedPair()
    if (!pair) return
    const [a, b] = pair
    const left = findAndCompress(a)
    const right = findAndCompress(b)
    highlighted = new Set([...left.path, ...right.path])
    activeRoot = left.root === right.root ? left.root : null
    paint(
      left.root === right.root
        ? `${a} and ${b} are connected through root ${left.root}.`
        : `${a} and ${b} are separate: roots ${left.root} and ${right.root}.`,
    )
  }

  function onReset() {
    parent.forEach((_, index) => (parent[index] = index))
    rank.fill(0)
    highlighted = new Set()
    activeRoot = null
    first.value = "0"
    second.value = "1"
    paint("Reset to singleton sets; every element is its own root.")
  }

  shell.listen(union, "click", onUnion)
  shell.listen(find, "click", onFind)
  shell.listen(connected, "click", onConnected)
  shell.listen(reset, "click", onReset)
  shell.listen(first, "change", (() => paint()) as EventListener)
  shell.listen(second, "change", (() => paint()) as EventListener)
  paint()
  const syncWidth = () => {
    const measured = Math.round(forest.getBoundingClientRect().width)
    if (measured <= 0) return
    const next = Math.max(320, Math.min(WIDTH, measured))
    if (next === layoutWidth) return
    layoutWidth = next
    svg.setAttribute("viewBox", `0 0 ${layoutWidth} ${HEIGHT}`)
    paint()
  }
  const observer =
    typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => syncWidth())
  syncWidth()
  observer?.observe(forest)
  const handle = shell.finish()
  return {
    destroy() {
      observer?.disconnect()
      handle.destroy()
    },
  }
}
