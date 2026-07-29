import { GRAPH_NODE_RADIUS_PX, observeFixedSvgNodes, trimGraphEdge } from "../graph-node"
import { el, successMarker } from "../render"
import type { MountHandle } from "../types"
import { createStructureShell, onEnter } from "./interactive-structure"

export interface AvlTreeConfig {
  values: number[]
  value?: number
}

interface AvlNode {
  key: number
  height: number
  left: AvlNode | null
  right: AvlNode | null
}

interface OperationState {
  path: number[]
  changed: Set<number>
  rotating: Set<number>
  success: number | null
}

const SVG_NS = "http://www.w3.org/2000/svg"
const VIEW_WIDTH = 580
const VIEW_HEIGHT = 250
const MAX_VALUES = 11

function svgEl(tag: string, className: string) {
  const node = document.createElementNS(SVG_NS, tag)
  node.setAttribute("class", className)
  return node
}

function height(node: AvlNode | null) {
  return node?.height ?? 0
}

function balance(node: AvlNode) {
  return height(node.left) - height(node.right)
}

function update(node: AvlNode) {
  node.height = 1 + Math.max(height(node.left), height(node.right))
}

function rotateRight(node: AvlNode, state: OperationState) {
  const root = node.left!
  state.rotating.add(node.key).add(root.key)
  node.left = root.right
  root.right = node
  update(node)
  update(root)
  return root
}

function rotateLeft(node: AvlNode, state: OperationState) {
  const root = node.right!
  state.rotating.add(node.key).add(root.key)
  node.right = root.left
  root.left = node
  update(node)
  update(root)
  return root
}

function rebalance(node: AvlNode, state: OperationState, rotations: string[]) {
  update(node)
  const factor = balance(node)
  if (factor > 1) {
    if (balance(node.left!) < 0) {
      rotations.push(`LR at ${node.key}`)
      node.left = rotateLeft(node.left!, state)
    } else rotations.push(`LL at ${node.key}`)
    return rotateRight(node, state)
  }
  if (factor < -1) {
    if (balance(node.right!) > 0) {
      rotations.push(`RL at ${node.key}`)
      node.right = rotateRight(node.right!, state)
    } else rotations.push(`RR at ${node.key}`)
    return rotateLeft(node, state)
  }
  return node
}

function insertNode(
  node: AvlNode | null,
  key: number,
  state: OperationState,
  rotations: string[],
): [AvlNode, boolean] {
  if (!node) {
    state.changed.add(key)
    return [{ key, height: 1, left: null, right: null }, true]
  }
  state.path.push(node.key)
  if (key === node.key) return [node, false]
  let inserted: boolean
  if (key < node.key) [node.left, inserted] = insertNode(node.left, key, state, rotations)
  else [node.right, inserted] = insertNode(node.right, key, state, rotations)
  return [inserted ? rebalance(node, state, rotations) : node, inserted]
}

function minimumNode(node: AvlNode) {
  while (node.left) node = node.left
  return node
}

function removeNode(
  node: AvlNode | null,
  key: number,
  state: OperationState,
  rotations: string[],
): [AvlNode | null, boolean] {
  if (!node) return [null, false]
  state.path.push(node.key)
  let removed: boolean
  if (key < node.key) [node.left, removed] = removeNode(node.left, key, state, rotations)
  else if (key > node.key) [node.right, removed] = removeNode(node.right, key, state, rotations)
  else {
    removed = true
    state.changed.add(node.key)
    if (!node.left || !node.right) return [node.left || node.right, true]
    const successor = minimumNode(node.right)
    node.key = successor.key
    state.changed.add(successor.key)
    ;[node.right] = removeNode(node.right, successor.key, state, rotations)
  }
  return [removed ? rebalance(node, state, rotations) : node, removed]
}

function buildTree(values: readonly number[]) {
  let root: AvlNode | null = null
  for (const value of values) {
    const state = {
      path: [],
      changed: new Set<number>(),
      rotating: new Set<number>(),
      success: null,
    }
    ;[root] = insertNode(root, value, state, [])
  }
  return root
}

function orderedKeys(root: AvlNode | null) {
  const keys: number[] = []
  const visit = (node: AvlNode | null) => {
    if (!node) return
    visit(node.left)
    keys.push(node.key)
    visit(node.right)
  }
  visit(root)
  return keys
}

export function mountAvlTree(rootElement: HTMLElement, config: AvlTreeConfig): MountHandle {
  const shell = createStructureShell(
    rootElement,
    "avl-tree",
    "AVL tree",
    "Interactive AVL tree",
    "binary-tree",
    "steptrace__binary-tree",
  )
  const initial = [...config.values]
  let root = buildTree(initial)
  let state: OperationState = {
    path: [],
    changed: new Set(),
    rotating: new Set(),
    success: null,
  }
  let geometry: { destroy(): void } | null = null
  const exitTimers = new Set<ReturnType<typeof setTimeout>>()

  const surface = el("div", "steptrace__binary-tree-surface")
  const svg = svgEl("svg", "steptrace__binary-tree-svg") as SVGSVGElement
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`)
  svg.setAttribute("role", "img")
  const edgeLayer = svgEl("g", "steptrace__binary-tree-edges")
  const nodeLayer = svgEl("g", "steptrace__binary-tree-nodes")
  svg.append(edgeLayer, nodeLayer)
  surface.append(svg)
  shell.stage.append(surface)
  const nodeViews = new Map<
    number,
    {
      group: SVGGElement
      value: SVGTextElement
      meta: SVGTextElement
      badge: SVGSVGElement
    }
  >()
  const edgeViews = new Map<string, SVGLineElement>()
  const input = shell.input("AVL key", "Value", 8)
  input.type = "number"
  input.step = "1"
  input.value = config.value == null ? "" : String(config.value)
  const insert = shell.button("Insert", true)
  const search = shell.button("Search")
  const remove = shell.button("Remove")
  const reset = shell.button("Reset")
  shell.controls.append(input, insert, search, remove, reset)

  function positions() {
    const entries: Array<{ node: AvlNode; x: number; y: number }> = []
    const maxDepth = Math.max(height(root) - 1, 0)
    const visit = (node: AvlNode | null, depth: number, slot: number) => {
      if (!node) return
      const slots = 2 ** (depth + 1)
      entries.push({
        node,
        x: ((slot * 2 + 1) / slots) * VIEW_WIDTH,
        y: 28 + (maxDepth ? (depth * 182) / maxDepth : 0),
      })
      visit(node.left, depth + 1, slot * 2)
      visit(node.right, depth + 1, slot * 2 + 1)
    }
    visit(root, 0, 0)
    return entries
  }

  function paintTree() {
    geometry?.destroy()
    if (!root) {
      geometry = null
      svg.setAttribute("aria-label", "Empty AVL tree")
      for (const view of nodeViews.values()) view.group.remove()
      for (const line of edgeViews.values()) line.remove()
      nodeViews.clear()
      edgeViews.clear()
      return
    }

    const entries = positions()
    const byNode = new Map(entries.map((entry) => [entry.node, entry]))
    svg.setAttribute("aria-label", `AVL tree with ${entries.length} unique keys`)
    const edges: Array<{
      line: SVGLineElement
      from: (typeof entries)[number]
      to: (typeof entries)[number]
    }> = []
    const nextEdges = new Set<string>()

    for (const parent of entries) {
      for (const childNode of [parent.node.left, parent.node.right]) {
        if (!childNode) continue
        const child = byNode.get(childNode)!
        const key = `${parent.node.key}:${child.node.key}`
        nextEdges.add(key)
        let line = edgeViews.get(key)
        if (!line) {
          line = svgEl("line", "steptrace__edge steptrace__binary-tree-edge") as SVGLineElement
          line.dataset.entering = shell.reducedMotion() ? "0" : "1"
          edgeLayer.append(line)
          edgeViews.set(key, line)
          globalThis.requestAnimationFrame?.(() => {
            line!.dataset.entering = "0"
          })
        }
        const pathIndex = state.path.indexOf(parent.node.key)
        line.dataset.state =
          state.rotating.has(parent.node.key) && state.rotating.has(child.node.key)
            ? "rotation"
            : pathIndex >= 0 && state.path[pathIndex + 1] === child.node.key
              ? "path"
              : "neutral"
        edges.push({ line, from: parent, to: child })
      }
    }

    for (const [key, line] of edgeViews) {
      if (nextEdges.has(key)) continue
      edgeViews.delete(key)
      if (shell.reducedMotion()) line.remove()
      else {
        line.dataset.exiting = "1"
        const timer = setTimeout(() => {
          exitTimers.delete(timer)
          line.remove()
        }, 180)
        exitTimers.add(timer)
      }
    }

    const nextNodes = new Set(entries.map((entry) => entry.node.key))
    const nodes = entries.map((entry) => {
      let view = nodeViews.get(entry.node.key)
      if (!view) {
        const group = svgEl("g", "steptrace__node steptrace__binary-tree-node") as SVGGElement
        group.dataset.entering = shell.reducedMotion() ? "0" : "1"
        const circle = svgEl("circle", "steptrace__ncirc")
        circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
        const value = svgEl("text", "steptrace__id") as SVGTextElement
        value.setAttribute("text-anchor", "middle")
        value.setAttribute("dominant-baseline", "central")
        const meta = svgEl("text", "steptrace__binary-tree-meta") as SVGTextElement
        meta.setAttribute("text-anchor", "middle")
        meta.setAttribute("y", "22")
        const badge = successMarker("steptrace__binary-tree-success")
        badge.setAttribute("x", "7")
        badge.setAttribute("y", "-22")
        badge.setAttribute("width", "12")
        badge.setAttribute("height", "12")
        group.append(circle, value, meta, badge)
        nodeLayer.append(group)
        view = { group, value, meta, badge }
        nodeViews.set(entry.node.key, view)
        globalThis.requestAnimationFrame?.(() => {
          group.dataset.entering = "0"
        })
      }
      const { group, value, meta, badge } = view
      group.dataset.state = state.rotating.has(entry.node.key)
        ? "rotation"
        : state.changed.has(entry.node.key)
          ? "changed"
          : state.path.includes(entry.node.key)
            ? "path"
            : "neutral"
      group.setAttribute(
        "aria-label",
        `Key ${entry.node.key}, height ${entry.node.height}, balance factor ${balance(entry.node)}`,
      )
      value.textContent = String(entry.node.key)
      meta.textContent = `h${entry.node.height} bf${balance(entry.node)}`
      badge.dataset.visible = state.success === entry.node.key ? "1" : "0"
      return { element: group, point: { x: entry.x, y: entry.y } }
    })

    for (const [key, view] of nodeViews) {
      if (nextNodes.has(key)) continue
      nodeViews.delete(key)
      if (shell.reducedMotion()) view.group.remove()
      else {
        view.group.dataset.exiting = "1"
        const timer = setTimeout(() => {
          exitTimers.delete(timer)
          view.group.remove()
        }, 180)
        exitTimers.add(timer)
      }
    }

    geometry = observeFixedSvgNodes(svg, nodes, (unitsPerCssPixel) => {
      const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
      for (const { line, from, to } of edges) {
        const edge = trimGraphEdge(from, to, radius)
        line.setAttribute("x1", String(edge.x1))
        line.setAttribute("y1", String(edge.y1))
        line.setAttribute("x2", String(edge.x2))
        line.setAttribute("y2", String(edge.y2))
        line.style.setProperty("x1", `${edge.x1}px`)
        line.style.setProperty("y1", `${edge.y1}px`)
        line.style.setProperty("x2", `${edge.x2}px`)
        line.style.setProperty("y2", `${edge.y2}px`)
      }
    })
  }

  function paint(message: string) {
    paintTree()
    const count = orderedKeys(root).length
    shell.setCounter(String(count), count === 1 ? " key" : " keys")
    shell.status.textContent = message
    remove.disabled = count === 0
    search.disabled = count === 0
    insert.disabled = count >= MAX_VALUES
  }

  function valueFromInput(operation: "insert" | "search" | "remove") {
    const raw = input.value.trim()
    if (raw !== "") {
      const value = Number(raw)
      if (Number.isFinite(value) && Number.isInteger(value)) return value
      paint("Value must be a finite integer.")
      return null
    }
    const keys = orderedKeys(root)
    if (operation === "search") return root?.key ?? null
    if (operation === "remove") return keys.at(-1) ?? null
    if (keys.length >= MAX_VALUES) {
      paint(`The review tree is capped at ${MAX_VALUES} keys.`)
      return null
    }
    let value = Math.floor(Math.random() * 90) + 10
    while (keys.includes(value)) value = value === 99 ? 10 : value + 1
    return value
  }

  function onInsert() {
    const value = valueFromInput("insert")
    if (value == null) return
    state = { path: [], changed: new Set(), rotating: new Set(), success: null }
    const rotations: string[] = []
    let inserted: boolean
    ;[root, inserted] = insertNode(root, value, state, rotations)
    input.value = ""
    if (!inserted) {
      paint(
        `Compared ${state.path.join(" → ")}; ${value} already exists, so the tree did not change.`,
      )
      return
    }
    state.success = value
    paint(
      `Inserted ${value} via ${state.path.join(" → ") || "the root"}; ${
        rotations.length
          ? `${rotations.join(", ")} restored |balance| ≤ 1.`
          : "no rotation was needed."
      }`,
    )
  }

  function onSearch() {
    const value = valueFromInput("search")
    if (value == null) return
    state = { path: [], changed: new Set(), rotating: new Set(), success: null }
    let node = root
    while (node) {
      state.path.push(node.key)
      if (value === node.key) break
      node = value < node.key ? node.left : node.right
    }
    input.value = ""
    state.success = node?.key ?? null
    paint(
      node
        ? `Search path ${state.path.join(" → ")} found ${value}.`
        : `Search path ${state.path.join(" → ")} reached an empty child; ${value} is absent.`,
    )
  }

  function onRemove() {
    const value = valueFromInput("remove")
    if (value == null) return
    state = { path: [], changed: new Set(), rotating: new Set(), success: null }
    const rotations: string[] = []
    let removed: boolean
    ;[root, removed] = removeNode(root, value, state, rotations)
    input.value = ""
    if (!removed) {
      paint(`Compared ${state.path.join(" → ")}; ${value} is absent, so the tree did not change.`)
      return
    }
    paint(
      `Removed ${value} via ${state.path.join(" → ")}; ${
        rotations.length
          ? `${rotations.join(", ")} rebalanced the shortened path.`
          : "all ancestors stayed within |balance| ≤ 1."
      }`,
    )
  }

  function onReset() {
    root = buildTree(initial)
    state = { path: [], changed: new Set(), rotating: new Set(), success: null }
    input.value = config.value == null ? "" : String(config.value)
    paint("Reset to the initial AVL tree.")
  }

  shell.listen(insert, "click", onInsert)
  shell.listen(search, "click", onSearch)
  shell.listen(remove, "click", onRemove)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onInsert)
  paint("Insert, search, or remove a key; AVL repairs every imbalance immediately.")
  const handle = shell.finish()
  return {
    destroy() {
      for (const timer of exitTimers) clearTimeout(timer)
      geometry?.destroy()
      handle.destroy()
    },
  }
}
