import { GRAPH_NODE_RADIUS_PX, observeFixedSvgNodes, trimGraphEdge } from "../graph-node"
import { el } from "../render"
import type { MountHandle } from "../types"
import { heapPosition } from "./heap-selection"
import { createIndexedBoard, createStructureShell, onEnter } from "./interactive-structure"

export interface HeapConfig {
  values: number[]
}

export interface HeapVariantConfig {}

export interface FibonacciHeapConfig {
  values: number[]
}

const SVG_NS = "http://www.w3.org/2000/svg"

function svgEl(tag: string, className: string) {
  const node = document.createElementNS(SVG_NS, tag)
  node.setAttribute("class", className)
  return node
}

export function mountHeap(root: HTMLElement, config: HeapConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "heap",
    "heap",
    "Interactive binary min-heap",
    "heap-selection",
    "steptrace__heap-structure",
  )
  const initial = [...config.values]
  const values = [...initial]
  let path: number[] = []
  let settled: number | null = null
  let geometry: { destroy(): void } | null = null

  const treeLabel = el("div", "steptrace__rail-label")
  treeLabel.textContent = "Min-heap tree"
  const tree = el("div", "steptrace__heap-structure-tree")
  const arrayLabel = el("div", "steptrace__rail-label steptrace__heap-array-label")
  arrayLabel.textContent = "Backing array"
  const arrayWrap = el("div", "steptrace__heap-array")
  const board = createIndexedBoard(arrayWrap, values.length, "Binary heap backing array")
  shell.stage.append(treeLabel, tree, arrayLabel, arrayWrap)

  const input = shell.input("Value to insert", "Value", 8)
  input.type = "number"
  input.step = "1"
  const insert = shell.button("Insert", true)
  const extract = shell.button("Extract min")
  const reset = shell.button("Reset")
  shell.controls.append(input, insert, extract, reset)

  function paintTree() {
    geometry?.destroy()
    tree.replaceChildren()
    if (!values.length) {
      geometry = null
      const empty = el("div", "steptrace__heap-empty")
      empty.textContent = "empty heap"
      tree.append(empty)
      return
    }

    const depth = Math.floor(Math.log2(values.length))
    const svg = svgEl("svg", "steptrace__heap-svg")
    svg.setAttribute("viewBox", `0 0 300 ${64 + depth * 68}`)
    svg.setAttribute("role", "img")
    svg.setAttribute("aria-label", `Binary min-heap tree with ${values.length} values`)
    const positions = values.map((_, index) => heapPosition(index))
    const pathEdges = new Set(
      path.slice(1).map((index, offset) => {
        const previous = path[offset]
        return `${Math.min(previous, index)}:${Math.max(previous, index)}`
      }),
    )
    const edges: Array<{ line: SVGElement; parent: number; child: number }> = []

    for (let child = 1; child < values.length; child++) {
      const parent = Math.floor((child - 1) / 2)
      const line = svgEl("line", "steptrace__edge steptrace__heap-edge")
      line.dataset.path = pathEdges.has(`${parent}:${child}`) ? "1" : "0"
      svg.append(line)
      edges.push({ line, parent, child })
    }

    const nodes = positions.map((position, index) => {
      const group = svgEl("g", "steptrace__node steptrace__heap-node")
      group.dataset.visible = "1"
      group.dataset.state =
        index === settled ? "settled" : path.includes(index) ? "compare" : "neutral"
      group.setAttribute("aria-label", `Heap index ${index}, value ${values[index]}`)
      const circle = svgEl("circle", "steptrace__ncirc")
      circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
      const value = svgEl("text", "steptrace__id")
      value.setAttribute("text-anchor", "middle")
      value.setAttribute("dominant-baseline", "central")
      value.textContent = String(values[index])
      group.append(circle, value)
      svg.append(group)
      return { group, position }
    })
    tree.append(svg)
    geometry = observeFixedSvgNodes(
      svg as SVGSVGElement,
      nodes.map(({ group, position }) => ({
        element: group as SVGGElement,
        point: position,
      })),
      (unitsPerCssPixel) => {
        const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
        for (const { line, parent, child } of edges) {
          const trimmed = trimGraphEdge(positions[parent], positions[child], radius)
          line.setAttribute("x1", String(trimmed.x1))
          line.setAttribute("y1", String(trimmed.y1))
          line.setAttribute("x2", String(trimmed.x2))
          line.setAttribute("y2", String(trimmed.y2))
        }
      },
    )
  }

  function paint(message = "") {
    board.paint(
      values.map((value, index) => ({
        value: String(value),
        active: path.includes(index),
        changed: index === settled,
        ariaLabel: `heap index ${index}, value ${value}`,
      })),
    )
    paintTree()
    shell.setCounter(String(values.length), values.length === 1 ? " value" : " values")
    shell.status.textContent =
      message || "Insert a finite integer, or extract the root and repair heap order."
    extract.disabled = values.length === 0
  }

  function onInsert() {
    const raw = input.value.trim()
    const value = raw === "" ? Math.floor(Math.random() * 90) + 10 : Number(raw)
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      shell.status.textContent = "Value must be a finite integer."
      return
    }

    values.push(value)
    path = [values.length - 1]
    let child = values.length - 1
    let swaps = 0
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2)
      path.push(parent)
      if (values[parent] <= values[child]) break
      ;[values[parent], values[child]] = [values[child], values[parent]]
      child = parent
      swaps++
    }
    settled = child
    input.value = ""
    paint(
      `Inserted ${value}; sift-up path ${path.join(" → ")}${
        swaps ? ` with ${swaps} swap${swaps === 1 ? "" : "s"}` : " already satisfied heap order"
      }.`,
    )
  }

  function onExtract() {
    if (!values.length) return
    const minimum = values[0]
    const last = values.pop()
    path = []
    settled = null
    let swaps = 0
    if (values.length && last != null) {
      values[0] = last
      let parent = 0
      path.push(parent)
      while (true) {
        const left = parent * 2 + 1
        if (left >= values.length) break
        const right = left + 1
        const child = right < values.length && values[right] < values[left] ? right : left
        path.push(child)
        if (values[parent] <= values[child]) break
        ;[values[parent], values[child]] = [values[child], values[parent]]
        parent = child
        swaps++
      }
      settled = parent
    }
    paint(
      `Extracted minimum ${minimum}${
        path.length
          ? `; sift-down path ${path.join(" → ")} with ${swaps} swap${swaps === 1 ? "" : "s"}`
          : "; heap is now empty"
      }.`,
    )
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    path = []
    settled = null
    input.value = ""
    paint("Reset the heap to its initial state.")
  }

  shell.listen(insert, "click", onInsert)
  shell.listen(extract, "click", onExtract)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onInsert)
  paint()
  const handle = shell.finish()
  return {
    destroy() {
      geometry?.destroy()
      handle.destroy()
    },
  }
}

interface ForestNode {
  id: string
  key: number
  children: ForestNode[]
  marked?: boolean
  npl?: number
}

interface ForestPaint {
  active?: ReadonlySet<string>
  settled?: ReadonlySet<string>
  meta?: (node: ForestNode) => string
  rootMeta?: ReadonlyMap<string, string>
  ariaLabel: string
}

function paintForest(
  target: HTMLElement,
  roots: readonly ForestNode[],
  options: ForestPaint,
): { destroy(): void } {
  target.replaceChildren()
  if (!roots.length) {
    const empty = el("div", "steptrace__heap-empty")
    empty.textContent = "empty forest"
    target.append(empty)
    return { destroy() {} }
  }

  const widths = new Map<string, number>()
  const measure = (node: ForestNode): number => {
    const width = Math.max(
      1,
      node.children.reduce((sum, child) => sum + measure(child), 0),
    )
    widths.set(node.id, width)
    return width
  }
  const totalWidth = roots.reduce((sum, root) => sum + measure(root), 0)
  const positions = new Map<string, { x: number; y: number }>()
  let maxDepth = 0
  const place = (node: ForestNode, left: number, depth: number) => {
    maxDepth = Math.max(maxDepth, depth)
    const width = widths.get(node.id) ?? 1
    positions.set(node.id, { x: 28 + (left + width / 2) * 66, y: 34 + depth * 62 })
    let childLeft = left
    for (const child of node.children) {
      place(child, childLeft, depth + 1)
      childLeft += widths.get(child.id) ?? 1
    }
  }
  let left = 0
  for (const root of roots) {
    place(root, left, 0)
    left += widths.get(root.id) ?? 1
  }

  const svg = svgEl("svg", "steptrace__heap-svg steptrace__heap-forest-svg")
  svg.setAttribute("viewBox", `0 0 ${Math.max(180, 56 + totalWidth * 66)} ${74 + maxDepth * 62}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", options.ariaLabel)
  const edges: Array<{ line: SVGElement; from: ForestNode; to: ForestNode }> = []
  const flat: ForestNode[] = []
  const visit = (node: ForestNode) => {
    flat.push(node)
    for (const child of node.children) {
      const line = svgEl("line", "steptrace__edge steptrace__heap-edge")
      line.dataset.path =
        options.active?.has(node.id) && options.active.has(child.id) ? "1" : "0"
      svg.append(line)
      edges.push({ line, from: node, to: child })
      visit(child)
    }
  }
  roots.forEach(visit)

  const nodes = flat.map((node) => {
    const point = positions.get(node.id)!
    const group = svgEl("g", "steptrace__node steptrace__heap-node")
    group.dataset.visible = "1"
    group.dataset.state = options.settled?.has(node.id)
      ? "settled"
      : options.active?.has(node.id)
        ? "compare"
        : "neutral"
    group.setAttribute(
      "aria-label",
      `Heap node ${node.key}${node.marked ? ", marked" : ""}${node.npl ? `, npl ${node.npl}` : ""}`,
    )
    const circle = svgEl("circle", "steptrace__ncirc")
    circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
    const value = svgEl("text", "steptrace__id")
    value.setAttribute("text-anchor", "middle")
    value.setAttribute("dominant-baseline", "central")
    value.textContent = String(node.key)
    group.append(circle, value)
    const detail = options.meta?.(node)
    if (detail) {
      const meta = svgEl("text", "steptrace__heap-node-meta")
      meta.setAttribute("text-anchor", "middle")
      meta.setAttribute("y", "23")
      meta.textContent = detail
      group.append(meta)
    }
    const rootLabel = options.rootMeta?.get(node.id)
    if (rootLabel) {
      const meta = svgEl("text", "steptrace__heap-root-label")
      meta.setAttribute("text-anchor", "middle")
      meta.setAttribute("y", "-20")
      meta.textContent = rootLabel
      group.append(meta)
    }
    if (node.marked) {
      const mark = svgEl("circle", "steptrace__heap-mark")
      mark.setAttribute("cx", "11")
      mark.setAttribute("cy", "-11")
      mark.setAttribute("r", "4")
      group.append(mark)
    }
    svg.append(group)
    return { element: group as SVGGElement, point }
  })
  target.append(svg)
  return observeFixedSvgNodes(svg as SVGSVGElement, nodes, (unitsPerCssPixel) => {
    const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
    for (const { line, from, to } of edges) {
      const trimmed = trimGraphEdge(positions.get(from.id)!, positions.get(to.id)!, radius)
      line.setAttribute("x1", String(trimmed.x1))
      line.setAttribute("y1", String(trimmed.y1))
      line.setAttribute("x2", String(trimmed.x2))
      line.setAttribute("y2", String(trimmed.y2))
    }
  })
}

export function mountBinomialQueue(root: HTMLElement, _config: HeapVariantConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "binomial-queue",
    "binomial queue",
    "Interactive binomial queue meld",
    "heap-selection",
    "steptrace__heap-structure steptrace__heap-variant",
  )
  const treeLabel = el("div", "steptrace__rail-label")
  treeLabel.textContent = "Two forests · 3 + 1 values"
  const tree = el("div", "steptrace__heap-structure-tree")
  const slotLabel = el("div", "steptrace__rail-label steptrace__heap-array-label")
  slotLabel.textContent = "Forest slots · binary carry"
  const slotWrap = el("div", "steptrace__heap-array")
  const slots = createIndexedBoard(slotWrap, 3, "Binomial forest slots by order")
  shell.stage.append(treeLabel, tree, slotLabel, slotWrap)
  const meld = shell.button("Meld", true)
  const reset = shell.button("Reset")
  shell.controls.append(meld, reset)

  const first: ForestNode = {
    id: "a1",
    key: 2,
    children: [{ id: "a2", key: 9, children: [] }],
  }
  const loose: ForestNode = { id: "a0", key: 7, children: [] }
  const second: ForestNode = { id: "b0", key: 3, children: [] }
  const result: ForestNode = {
    id: "r2",
    key: 2,
    children: [
      { id: "r1", key: 3, children: [{ id: "r0", key: 7, children: [] }] },
      { id: "r9", key: 9, children: [] },
    ],
  }
  let phase = 0
  let geometry: { destroy(): void } | null = null

  function paint(message = "") {
    geometry?.destroy()
    const rootMeta = new Map<string, string>()
    const carry: ForestNode = {
      id: "carry1",
      key: 3,
      children: [{ id: "carry0", key: 7, children: [] }],
    }
    if (phase === 0) {
      rootMeta.set(first.id, "A · B₁")
      rootMeta.set(loose.id, "A · B₀")
      rootMeta.set(second.id, "B · B₀")
    } else if (phase === 1) {
      rootMeta.set(first.id, "A · B₁")
      rootMeta.set(carry.id, "carry · B₁")
    } else rootMeta.set(result.id, "result · B₂")
    geometry = paintForest(
      tree,
      phase === 0 ? [first, loose, second] : phase === 1 ? [first, carry] : [result],
      {
        active:
          phase === 0
            ? new Set(["a0", "b0"])
            : phase === 1
              ? new Set(["a1", "carry1"])
              : new Set(["r2", "r1", "r0"]),
        settled:
          phase === 2 ? new Set(["r2"]) : phase === 1 ? new Set(["carry1"]) : undefined,
        rootMeta,
        ariaLabel:
          phase === 0
            ? "Two binomial forests containing three and one values"
            : phase === 1
              ? "First link produced an order one carry"
              : "Melded binomial queue with one order two tree",
      },
    )
    slots.paint(
      phase === 2
        ? [
            { value: null, label: "B₀", ariaLabel: "order zero empty after carry" },
            { value: null, label: "B₁", ariaLabel: "order one empty after carry" },
            {
              value: "2",
              label: "B₂",
              changed: true,
              ariaLabel: "order two tree rooted at 2",
            },
          ]
        : phase === 1
          ? [
              { value: null, label: "B₀", ariaLabel: "order zero emptied into carry" },
              {
                value: "2 + 3",
                label: "B₁",
                active: true,
                ariaLabel: "existing order one tree and order one carry collide",
              },
              { value: null, label: "B₂", ariaLabel: "order two empty" },
            ]
        : [
            {
              value: "7 + 3",
              label: "B₀",
              active: true,
              ariaLabel: "two order zero trees collide",
            },
            { value: "2", label: "B₁", ariaLabel: "one order one tree rooted at 2" },
            { value: null, label: "B₂", ariaLabel: "order two empty" },
          ],
    )
    shell.setCounter(
      phase === 2 ? "1" : phase === 1 ? "2" : "3",
      phase === 2 ? " tree" : " roots",
    )
    shell.status.textContent =
      message ||
      "Meld the 3-value forest with the singleton; equal orders link and carry right."
    meld.textContent = phase === 0 ? "Meld" : phase === 1 ? "Continue carry" : "Melded"
    meld.disabled = phase === 2
  }

  shell.listen(meld, "click", () => {
    phase++
    paint(
      phase === 1
        ? "B₀ + B₀ links into a B₁ carry; the next B₁ slot is already occupied."
        : "B₁ + B₁ links again, carrying one B₂ tree into the empty order-2 slot.",
    )
  })
  shell.listen(reset, "click", () => {
    phase = 0
    paint("Reset to two forests holding 3 and 1 values.")
  })
  paint()
  const handle = shell.finish()
  return {
    destroy() {
      geometry?.destroy()
      handle.destroy()
    },
  }
}

interface FibonacciNode extends ForestNode {
  parent: FibonacciNode | null
  children: FibonacciNode[]
}

export function mountFibonacciHeap(root: HTMLElement, config: FibonacciHeapConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "fibonacci-heap",
    "fibonacci heap",
    "Interactive Fibonacci heap",
    "heap-selection",
    "steptrace__heap-structure steptrace__heap-variant",
  )
  const treeLabel = el("div", "steptrace__rail-label")
  treeLabel.textContent = "Lazy forest"
  const tree = el("div", "steptrace__heap-structure-tree")
  const rootsLabel = el("div", "steptrace__rail-label steptrace__heap-array-label")
  rootsLabel.textContent = "Root list"
  const rootWrap = el("div", "steptrace__heap-array")
  const board = createIndexedBoard(rootWrap, 0, "Fibonacci heap root list")
  shell.stage.append(treeLabel, tree, rootsLabel, rootWrap)

  const insertInput = shell.input("Value to insert", "Value", 8)
  insertInput.type = "number"
  const insert = shell.button("Insert", true)
  const extract = shell.button("Extract min")
  const currentInput = shell.input("Current key", "Current", 8)
  currentInput.type = "number"
  const newInput = shell.input("Decreased key", "New key", 8)
  newInput.type = "number"
  const decrease = shell.button("Decrease key")
  const reset = shell.button("Reset")
  shell.controls.append(insertInput, insert, extract, currentInput, newInput, decrease, reset)

  let nextId = 0
  let roots: FibonacciNode[] = []
  let active = new Set<string>()
  let settled = new Set<string>()
  let operationCuts = 0
  let geometry: { destroy(): void } | null = null

  const allNodes = () => {
    const found: FibonacciNode[] = []
    const visit = (node: FibonacciNode) => {
      found.push(node)
      node.children.forEach(visit)
    }
    roots.forEach(visit)
    return found
  }
  const minimum = () => roots.reduce((best, node) => (node.key < best.key ? node : best))

  function insertValue(key: number) {
    const node: FibonacciNode = {
      id: `f${nextId++}`,
      key,
      children: [],
      parent: null,
      marked: false,
    }
    roots.push(node)
    active = new Set([node.id])
    settled = new Set([minimum().id])
    return node
  }

  function link(child: FibonacciNode, parent: FibonacciNode) {
    child.parent = parent
    child.marked = false
    parent.children.push(child)
  }

  function consolidate() {
    const byDegree = new Map<number, FibonacciNode>()
    for (const start of roots) {
      let node = start
      let degree = node.children.length
      while (byDegree.has(degree)) {
        let other = byDegree.get(degree)!
        byDegree.delete(degree)
        if (other.key < node.key) [node, other] = [other, node]
        link(other, node)
        active.add(node.id)
        active.add(other.id)
        degree = node.children.length
      }
      byDegree.set(degree, node)
    }
    roots = [...byDegree.values()]
    roots.forEach((node) => {
      node.parent = null
      node.marked = false
    })
  }

  function cut(node: FibonacciNode, parent: FibonacciNode) {
    parent.children = parent.children.filter((child) => child !== node)
    node.parent = null
    node.marked = false
    roots.push(node)
    active.add(node.id)
    active.add(parent.id)
    operationCuts++
  }

  function cascadingCut(node: FibonacciNode) {
    const parent = node.parent
    if (!parent) return
    if (!node.marked) node.marked = true
    else {
      cut(node, parent)
      cascadingCut(parent)
    }
  }

  function paint(message = "") {
    geometry?.destroy()
    const rootMeta = new Map(roots.map((node) => [node.id, `d${node.children.length}`]))
    geometry = paintForest(tree, roots, {
      active,
      settled,
      meta: (node) => (node.marked ? "marked" : ""),
      rootMeta,
      ariaLabel: `Fibonacci heap forest with ${allNodes().length} values and ${roots.length} roots`,
    })
    board.paint(
      roots.map((node) => ({
        value: String(node.key),
        label: `d${node.children.length}`,
        active: active.has(node.id),
        changed: settled.has(node.id),
        ariaLabel: `root ${node.key}, degree ${node.children.length}${
          settled.has(node.id) ? ", minimum" : ""
        }`,
      })),
    )
    const count = allNodes().length
    shell.setCounter(String(count), count === 1 ? " value" : " values")
    shell.status.textContent =
      message ||
      "This forest was built by public inserts; extract-min consolidates, decrease-key cuts."
    extract.disabled = roots.length === 0
    decrease.disabled = count === 0
  }

  function onInsert() {
    const raw = insertInput.value.trim()
    const value = raw === "" ? Math.floor(Math.random() * 90) + 10 : Number(raw)
    if (!Number.isInteger(value)) {
      shell.status.textContent = "Value must be a finite integer."
      return
    }
    insertValue(value)
    insertInput.value = ""
    paint(`Inserted ${value} as a new degree-0 root; no consolidation work is done yet.`)
  }

  function onExtract() {
    if (!roots.length) return
    active = new Set()
    settled = new Set()
    const min = minimum()
    roots = roots.filter((node) => node !== min)
    for (const child of min.children) {
      child.parent = null
      child.marked = false
      roots.push(child)
      active.add(child.id)
    }
    if (roots.length) {
      consolidate()
      settled.add(minimum().id)
    }
    paint(
      `Extracted minimum ${min.key}; promoted its children and consolidated equal degrees.${
        allNodes().some((node) => node.key === 41) && allNodes().some((node) => node.key === 52)
          ? " Next: decrease 41 to 5, then 52 to 4 to see a mark and cascading cut."
          : ""
      }`,
    )
  }

  function onDecrease() {
    const current = Number(currentInput.value)
    const next = Number(newInput.value)
    const node = allNodes().find((candidate) => candidate.key === current)
    if (!Number.isInteger(current) || !Number.isInteger(next) || !node || next >= current) {
      shell.status.textContent =
        "Enter an existing current key and a smaller finite integer as the new key."
      return
    }
    active = new Set([node.id])
    settled = new Set()
    operationCuts = 0
    node.key = next
    const parent = node.parent
    let cutOccurred = false
    if (parent && node.key < parent.key) {
      cut(node, parent)
      cascadingCut(parent)
      cutOccurred = true
    }
    settled.add(minimum().id)
    currentInput.value = ""
    newInput.value = ""
    paint(
      `Decreased ${current} to ${next}${
        operationCuts > 1
          ? `; the cut removed a second child, so marked parent ${parent?.key} cascaded to the root list`
          : cutOccurred && parent?.marked
            ? `; the node was cut and parent ${parent.key} is now marked after its first child loss. Decrease 52 to 4 next to cascade`
            : cutOccurred
              ? "; heap order broke, so the node was cut to the root list"
              : ""
      }.`,
    )
  }

  function onReset() {
    nextId = 0
    roots = []
    active = new Set()
    settled = new Set()
    operationCuts = 0
    config.values.forEach(insertValue)
    active.clear()
    settled = roots.length ? new Set([minimum().id]) : new Set()
    paint("Reset by replaying the configured values through public insert operations.")
  }

  shell.listen(insert, "click", onInsert)
  shell.listen(extract, "click", onExtract)
  shell.listen(decrease, "click", onDecrease)
  shell.listen(reset, "click", onReset)
  onEnter(shell, insertInput, onInsert)
  onReset()
  const handle = shell.finish()
  return {
    destroy() {
      geometry?.destroy()
      handle.destroy()
    },
  }
}

interface BinaryHeapNode extends ForestNode {
  children: [BinaryHeapNode | undefined, BinaryHeapNode | undefined]
}

function npl(node: BinaryHeapNode | undefined): number {
  return node?.npl ?? 0
}

function canonicalMergeHeaps(): [BinaryHeapNode, BinaryHeapNode] {
  return [
    {
      id: "a2",
      key: 2,
      npl: 2,
      children: [
        { id: "a7", key: 7, npl: 1, children: [undefined, undefined] },
        { id: "a10", key: 10, npl: 1, children: [undefined, undefined] },
      ],
    },
    {
      id: "b3",
      key: 3,
      npl: 2,
      children: [
        { id: "b5", key: 5, npl: 1, children: [undefined, undefined] },
        { id: "b8", key: 8, npl: 1, children: [undefined, undefined] },
      ],
    },
  ]
}

function cloneBinary(node: BinaryHeapNode): BinaryHeapNode {
  return {
    ...node,
    children: [
      node.children[0] ? cloneBinary(node.children[0]) : undefined,
      node.children[1] ? cloneBinary(node.children[1]) : undefined,
    ],
  }
}

function mergeBinaryHeaps(
  first: BinaryHeapNode | undefined,
  second: BinaryHeapNode | undefined,
  mode: "leftist" | "skew",
  active: Set<string>,
  swapped: Set<string>,
): BinaryHeapNode | undefined {
  if (!first) return second
  if (!second) return first
  if (first.key > second.key) [first, second] = [second, first]
  active.add(first.id)
  active.add(second.id)
  first.children[1] = mergeBinaryHeaps(first.children[1], second, mode, active, swapped)
  if (mode === "skew" || npl(first.children[0]) < npl(first.children[1])) {
    ;[first.children[0], first.children[1]] = [first.children[1], first.children[0]]
    swapped.add(first.id)
  }
  first.npl = npl(first.children[1]) + 1
  return first
}

function forestBinary(node: BinaryHeapNode): ForestNode {
  return {
    ...node,
    children: node.children.filter(Boolean).map((child) => forestBinary(child!)),
  }
}

function mountMergeHeap(
  root: HTMLElement,
  mode: "leftist" | "skew",
): MountHandle {
  const label = mode === "leftist" ? "leftist heap" : "skew heap"
  const shell = createStructureShell(
    root,
    `${mode}-heap`,
    label,
    `Interactive ${label} meld`,
    "heap-selection",
    "steptrace__heap-structure steptrace__heap-variant steptrace__merge-heap",
  )
  const treeLabel = el("div", "steptrace__rail-label")
  treeLabel.textContent = "Two heaps · [2, 7, 10] + [3, 5, 8]"
  const tree = el("div", "steptrace__heap-structure-tree")
  const ruleLabel = el("div", "steptrace__heap-rule")
  ruleLabel.textContent =
    mode === "leftist"
      ? "Conditional swap · keep npl(left) ≥ npl(right)"
      : "Unconditional swap · every touched node"
  shell.stage.append(treeLabel, tree, ruleLabel)
  const merge = shell.button("Merge", true)
  const reset = shell.button("Reset")
  shell.controls.append(merge, reset)

  let [first, second] = canonicalMergeHeaps()
  let result: BinaryHeapNode | undefined
  let active = new Set<string>()
  let swapped = new Set<string>()
  let geometry: { destroy(): void } | null = null

  function paint(message = "") {
    geometry?.destroy()
    const roots = result ? [forestBinary(result)] : [forestBinary(first), forestBinary(second)]
    const rootMeta = new Map<string, string>()
    if (!result) {
      rootMeta.set(first.id, "heap A")
      rootMeta.set(second.id, "heap B")
    } else rootMeta.set(result.id, "merged")
    geometry = paintForest(tree, roots, {
      active,
      settled: swapped,
      meta: mode === "leftist" ? (node) => `npl ${node.npl}` : undefined,
      rootMeta,
      ariaLabel: `${label} ${result ? "merged result" : "two input heaps"}`,
    })
    shell.setCounter(result ? "1" : "2", result ? " heap" : " heaps")
    shell.status.textContent =
      message ||
      (mode === "leftist"
        ? "Merge follows the right spines and swaps only when the npl invariant requires it."
        : "Merge follows the right spines and swaps children at every touched node.")
    merge.disabled = Boolean(result)
  }

  shell.listen(merge, "click", () => {
    active = new Set()
    swapped = new Set()
    result = mergeBinaryHeaps(cloneBinary(first), cloneBinary(second), mode, active, swapped)
    paint(
      mode === "leftist"
        ? `Merged along the right spines; ${swapped.size} conditional child swap${
            swapped.size === 1 ? "" : "s"
          } restored the npl invariant.`
        : `Merged along the right spines; all ${swapped.size} touched node${
            swapped.size === 1 ? "" : "s"
          } swapped children unconditionally.`,
    )
  })
  shell.listen(reset, "click", () => {
    ;[first, second] = canonicalMergeHeaps()
    result = undefined
    active = new Set()
    swapped = new Set()
    paint("Reset to the same two canonical min-heaps.")
  })
  paint()
  const handle = shell.finish()
  return {
    destroy() {
      geometry?.destroy()
      handle.destroy()
    },
  }
}

export function mountLeftistHeap(root: HTMLElement, _config: HeapVariantConfig): MountHandle {
  return mountMergeHeap(root, "leftist")
}

export function mountSkewHeap(root: HTMLElement, _config: HeapVariantConfig): MountHandle {
  return mountMergeHeap(root, "skew")
}
