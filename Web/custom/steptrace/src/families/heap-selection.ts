import { el, ICON, makeArrayStrip, makeLegend, statusEl, successMarker } from "../render"
import { GRAPH_NODE_RADIUS_PX, observeFixedSvgNodes, trimGraphEdge } from "../graph-node"
import type { StepTraceView, VisualFamily, WatchRow } from "../types"

export interface HeapSelectionConfig {
  profile: "top-k-largest"
  array: number[]
  k: number
}

export interface HeapEntry {
  value: number
  source: number
}

export interface TwoHeapsConfig {
  profile: "two-heaps"
  array: number[]
}

export interface TwoHeapsFrame {
  type: "init" | "insert" | "done"
  profile: TwoHeapsConfig["profile"]
  array: number[]
  cursor: number | null
  lower: HeapEntry[]
  upper: HeapEntry[]
  median: number | null
  message: string
}

export class TwoHeapsRecorder {
  readonly frames: TwoHeapsFrame[] = []
  private lower: HeapEntry[] = []
  private upper: HeapEntry[] = []
  private cursor: number | null = null

  constructor(private readonly config: TwoHeapsConfig) {}

  init(message: string) {
    this.record("init", message)
  }

  insert(index: number, message: string) {
    this.cursor = index
    const entry = { value: this.config.array[index], source: index }
    if (!this.lower.length || entry.value <= this.lower[0].value) this.lower.push(entry)
    else this.upper.push(entry)
    this.lower.sort((left, right) => right.value - left.value || left.source - right.source)
    this.upper.sort((left, right) => left.value - right.value || left.source - right.source)
    if (this.lower.length > this.upper.length + 1) this.upper.push(this.lower.shift()!)
    if (this.upper.length > this.lower.length) this.lower.push(this.upper.shift()!)
    this.lower.sort((left, right) => right.value - left.value || left.source - right.source)
    this.upper.sort((left, right) => left.value - right.value || left.source - right.source)
    this.record("insert", message)
  }

  done(message: string) {
    this.cursor = null
    this.record("done", message)
  }

  private record(type: TwoHeapsFrame["type"], message: string) {
    let median: number | null
    if (this.lower.length === this.upper.length) {
      if (!this.lower.length) median = null
      else {
        const lower = this.lower[0].value
        const upper = this.upper[0].value
        median = lower < 0 === upper < 0 ? lower + (upper - lower) / 2 : (lower + upper) / 2
      }
    } else {
      median = this.lower[0].value
    }
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        array: this.config.array,
        cursor: this.cursor,
        lower: this.lower.map((entry) => ({ ...entry })),
        upper: this.upper.map((entry) => ({ ...entry })),
        median,
        message,
      }),
    )
  }
}

export type HeapSelectionPhase =
  | "init"
  | "read"
  | "insert"
  | "compare-parent"
  | "swap-up"
  | "compare-root"
  | "reject"
  | "replace-root"
  | "compare-children"
  | "compare-down"
  | "swap-down"
  | "done"

export interface HeapSelectionFrame {
  type: HeapSelectionPhase
  profile: HeapSelectionConfig["profile"]
  array: number[]
  k: number
  cursor: number | null
  heap: HeapEntry[]
  compared: [number, number] | null
  rejected: number[]
  evicted: number[]
  decision: string
  comparisons: number
  swaps: number
  message: string
}

export interface HeapSelectionOperations {
  init(message: string): void
  read(index: number, message: string): void
  insert(index: number, message: string): void
  compareParent(child: number, parent: number, message: string): void
  swapUp(child: number, parent: number, message: string): void
  compareRoot(index: number, message: string): void
  reject(index: number, message: string): void
  replaceRoot(index: number, message: string): void
  compareChildren(left: number, right: number, message: string): void
  compareDown(parent: number, child: number, message: string): void
  swapDown(parent: number, child: number, message: string): void
  done(message: string): void
}

export class HeapSelectionRecorder implements HeapSelectionOperations {
  readonly frames: HeapSelectionFrame[] = []
  private cursor: number | null = null
  private heap: HeapEntry[] = []
  private compared: [number, number] | null = null
  private rejected: number[] = []
  private evicted: number[] = []
  private decision = "fill the heap"
  private comparisons = 0
  private swaps = 0

  constructor(private readonly config: HeapSelectionConfig) {}

  init(message: string) {
    this.record("init", message)
  }

  read(index: number, message: string) {
    this.cursor = index
    this.compared = null
    this.decision = this.heap.length < this.config.k ? "fill" : "compare with root"
    this.record("read", message)
  }

  insert(index: number, message: string) {
    this.heap.push({ value: this.config.array[index], source: index })
    this.compared = null
    this.decision = "insert"
    this.record("insert", message)
  }

  compareParent(child: number, parent: number, message: string) {
    this.compared = [child, parent]
    this.comparisons++
    this.decision = "repair upward"
    this.record("compare-parent", message)
  }

  swapUp(child: number, parent: number, message: string) {
    ;[this.heap[parent], this.heap[child]] = [this.heap[child], this.heap[parent]]
    this.compared = [child, parent]
    this.swaps++
    this.decision = "swap upward"
    this.record("swap-up", message)
  }

  compareRoot(index: number, message: string) {
    this.cursor = index
    this.compared = this.heap.length ? [0, 0] : null
    this.comparisons++
    this.decision = `${this.config.array[index]} vs root ${this.heap[0]?.value ?? "—"}`
    this.record("compare-root", message)
  }

  reject(index: number, message: string) {
    this.rejected.push(index)
    this.compared = null
    this.decision = "reject"
    this.record("reject", message)
  }

  replaceRoot(index: number, message: string) {
    const previous = this.heap[0]
    if (!previous) throw new Error("steptrace: cannot replace the root of an empty top-k heap.")
    this.evicted.push(previous.source)
    this.heap[0] = { value: this.config.array[index], source: index }
    this.compared = [0, 0]
    this.decision = "replace root"
    this.record("replace-root", message)
  }

  compareChildren(left: number, right: number, message: string) {
    this.compared = [left, right]
    this.comparisons++
    this.decision = "choose weaker child"
    this.record("compare-children", message)
  }

  compareDown(parent: number, child: number, message: string) {
    this.compared = [parent, child]
    this.comparisons++
    this.decision = "repair downward"
    this.record("compare-down", message)
  }

  swapDown(parent: number, child: number, message: string) {
    ;[this.heap[parent], this.heap[child]] = [this.heap[child], this.heap[parent]]
    this.compared = [parent, child]
    this.swaps++
    this.decision = "swap downward"
    this.record("swap-down", message)
  }

  done(message: string) {
    this.cursor = null
    this.compared = null
    this.decision = "top k retained · heap order"
    this.record("done", message)
  }

  private record(type: HeapSelectionPhase, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        array: this.config.array,
        k: this.config.k,
        cursor: this.cursor,
        heap: this.heap.map((entry) => ({ ...entry })),
        compared: this.compared ? ([...this.compared] as [number, number]) : null,
        rejected: this.rejected.slice(),
        evicted: this.evicted.slice(),
        decision: this.decision,
        comparisons: this.comparisons,
        swaps: this.swaps,
        message,
      }),
    )
  }
}

const SVG_NS = "http://www.w3.org/2000/svg"

export function heapPosition(index: number) {
  const depth = Math.floor(Math.log2(index + 1))
  const offset = index - (2 ** depth - 1)
  const count = 2 ** depth
  return {
    x: (300 * (2 * offset + 1)) / (2 * count),
    y: 32 + depth * 68,
  }
}

function svgEl(tag: string, className: string) {
  const node = document.createElementNS(SVG_NS, tag)
  node.setAttribute("class", className)
  return node
}

function createTwoHeapTree(capacity: number, label: string, rootLabel: string) {
  const wrap = el("div", "steptrace__heap-tree")
  const svg = svgEl("svg", "steptrace__heap-svg")
  svg.setAttribute("viewBox", `0 0 300 ${capacity > 3 ? 192 : 124}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", label)
  const positions = Array.from({ length: capacity }, (_, index) => heapPosition(index))
  const edges: Array<{ line: SVGElement; child: number }> = []
  for (let index = 1; index < capacity; index++) {
    const parent = Math.floor((index - 1) / 2)
    const edge = trimGraphEdge(positions[parent], positions[index], GRAPH_NODE_RADIUS_PX)
    const line = svgEl("line", "steptrace__edge steptrace__heap-edge")
    line.setAttribute("x1", String(edge.x1))
    line.setAttribute("y1", String(edge.y1))
    line.setAttribute("x2", String(edge.x2))
    line.setAttribute("y2", String(edge.y2))
    svg.append(line)
    edges.push({ line, child: index })
  }
  const nodes = positions.map((position, index) => {
    const group = svgEl("g", "steptrace__node steptrace__heap-node")
    group.setAttribute("transform", `translate(${position.x} ${position.y})`)
    const circle = svgEl("circle", "steptrace__ncirc")
    circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
    const value = svgEl("text", "steptrace__id")
    value.setAttribute("text-anchor", "middle")
    value.setAttribute("dominant-baseline", "central")
    const tag = svgEl("text", "steptrace__heap-root-label")
    tag.setAttribute("text-anchor", "middle")
    tag.setAttribute("y", "-23")
    tag.textContent = index === 0 ? rootLabel : ""
    group.append(circle, value, tag)
    svg.append(group)
    return { group, value, tag }
  })
  wrap.append(svg)
  return {
    wrap,
    paint(entries: readonly HeapEntry[]) {
      nodes.forEach(({ group, value, tag }, index) => {
        const entry = entries[index]
        value.textContent = entry ? String(entry.value) : ""
        group.dataset.visible = entry ? "1" : "0"
        if (!entry) group.dataset.state = "empty"
        else if (index === 0) group.dataset.state = "weakest"
        else group.dataset.state = "winner"
        group.setAttribute("aria-hidden", entry ? "false" : "true")
        tag.dataset.visible = index === 0 && entry ? "1" : "0"
      })
      for (const { line, child } of edges) line.dataset.visible = entries[child] ? "1" : "0"
    },
  }
}

export function makeTwoHeapsView(frames: readonly TwoHeapsFrame[]): StepTraceView<TwoHeapsFrame> {
  const first = frames[0]
  const capacity = Math.ceil(first.array.length / 2)
  const root = el("div", "steptrace__heap-selection steptrace__two-heaps")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Running median with a lower max-heap and upper min-heap")
  const streamLabel = el("div", "steptrace__rail-label")
  streamLabel.textContent = "Stream"
  const stream = makeArrayStrip(first.array)
  stream.wrap.classList.add("steptrace__heap-stream")
  const heaps = el("div", "steptrace__two-heaps-grid")
  const lowerWrap = el("div", "steptrace__two-heaps-side")
  const lowerLabel = el("div", "steptrace__rail-label")
  lowerLabel.textContent = "Lower · max-heap"
  const lower = createTwoHeapTree(capacity, "Lower max-heap", "max")
  lowerWrap.append(lowerLabel, lower.wrap)
  const upperWrap = el("div", "steptrace__two-heaps-side")
  const upperLabel = el("div", "steptrace__rail-label")
  upperLabel.textContent = "Upper · min-heap"
  const upper = createTwoHeapTree(capacity, "Upper min-heap", "min")
  upperWrap.append(upperLabel, upper.wrap)
  heaps.append(lowerWrap, upperWrap)
  root.append(streamLabel, stream.wrap, heaps)
  const status = statusEl()

  function paint(frame: TwoHeapsFrame) {
    stream.cells.forEach((cell, index) => {
      if (index === frame.cursor) cell.dataset.state = "current"
      else if (index < (frame.cursor ?? frame.array.length)) cell.dataset.state = "seen"
      else cell.dataset.state = ""
    })
    lower.paint(frame.lower)
    upper.paint(frame.upper)
    status.textContent = frame.message
  }

  return {
    nodes: [root, status],
    stageLayout: "fill",
    stableStage: true,
    paint,
    watch(frame) {
      return [
        { k: "median", v: frame.median ?? "—", sw: "var(--_amber)" },
        { k: "lower max", v: frame.lower[0]?.value ?? "empty", sw: "var(--_violet)" },
        { k: "upper min", v: frame.upper[0]?.value ?? "empty", sw: "var(--_blue)" },
        { k: "sizes", v: `${frame.lower.length} / ${frame.upper.length}`, sw: "var(--_green)" },
      ]
    },
    summary(frame) {
      return `Median ${frame.median} · lower ${frame.lower.length} · upper ${frame.upper.length}.`
    },
  }
}

export function makeHeapSelectionView(
  frames: readonly HeapSelectionFrame[],
): StepTraceView<HeapSelectionFrame> {
  const first = frames[0]
  const root = el("div", "steptrace__heap-selection")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", `Top ${first.k} largest values with a min-heap`)

  const streamLabel = el("div", "steptrace__rail-label")
  streamLabel.textContent = "Stream"
  const stream = makeArrayStrip(first.array)
  stream.wrap.classList.add("steptrace__heap-stream")
  stream.wrap.setAttribute("role", "list")
  stream.wrap.setAttribute("aria-label", "Input stream")
  stream.cells.forEach((cell, index) => {
    cell.setAttribute("role", "listitem")
    cell.setAttribute("aria-label", `Stream value ${first.array[index]}`)
  })

  const heapLabel = el("div", "steptrace__rail-label steptrace__heap-tree-label")
  heapLabel.textContent = `Min-heap · capacity k = ${first.k}`
  const heapWrap = el("div", "steptrace__heap-tree")
  const svg = svgEl("svg", "steptrace__heap-svg")
  svg.setAttribute("viewBox", `0 0 300 ${first.k > 3 ? 192 : 124}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Fixed-size min-heap; root is the weakest current winner")

  const positions = Array.from({ length: first.k }, (_, index) => heapPosition(index))
  const edges: Array<{ line: SVGElement; parent: number; child: number }> = []
  for (let index = 1; index < first.k; index++) {
    const parent = Math.floor((index - 1) / 2)
    const line = svgEl("line", "steptrace__edge steptrace__heap-edge")
    line.setAttribute("x1", String(positions[parent].x))
    line.setAttribute("y1", String(positions[parent].y))
    line.setAttribute("x2", String(positions[index].x))
    line.setAttribute("y2", String(positions[index].y))
    svg.append(line)
    edges.push({ line, parent, child: index })
  }

  const nodes = positions.map((position, index) => {
    const group = svgEl("g", "steptrace__node steptrace__heap-node")
    group.setAttribute("transform", `translate(${position.x} ${position.y})`)
    const circle = svgEl("circle", "steptrace__ncirc")
    circle.setAttribute("r", String(GRAPH_NODE_RADIUS_PX))
    const value = svgEl("text", "steptrace__id")
    value.setAttribute("text-anchor", "middle")
    value.setAttribute("dominant-baseline", "central")
    const rootTag = svgEl("text", "steptrace__heap-root-label")
    rootTag.setAttribute("text-anchor", "middle")
    rootTag.setAttribute("y", "-23")
    rootTag.textContent = index === 0 ? "weakest winner" : ""
    group.append(circle, value, rootTag)
    svg.append(group)
    return { group, value, rootTag }
  })
  heapWrap.append(svg)
  root.append(streamLabel, stream.wrap, heapLabel, heapWrap)
  const geometry = observeFixedSvgNodes(
    svg as SVGSVGElement,
    nodes.map(({ group }, index) => ({
      element: group as SVGGElement,
      point: positions[index],
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

  const rejected = el("span")
  rejected.innerHTML = ICON.x
  const legend = makeLegend(
    [
      { label: "incoming", swatchClass: "steptrace__heap-swatch steptrace__heap-swatch--current" },
      {
        label: "retained winner",
        swatchClass: "steptrace__heap-swatch steptrace__heap-swatch--winner",
        marker: successMarker(),
      },
      {
        label: "weakest root",
        swatchClass: "steptrace__heap-swatch steptrace__heap-swatch--weakest",
      },
      {
        label: "rejected / evicted",
        swatchClass: "steptrace__heap-swatch steptrace__heap-swatch--rejected",
        marker: rejected,
      },
    ],
    "Heap selection state legend",
  )

  const status = statusEl()

  function paint(frame: HeapSelectionFrame) {
    const retained = new Set(frame.heap.map((entry) => entry.source))
    const rejected = new Set([...frame.rejected, ...frame.evicted])
    stream.cells.forEach((cell, index) => {
      const state =
        index === frame.cursor
          ? "current"
          : retained.has(index)
            ? "winner"
            : rejected.has(index)
              ? "rejected"
              : index < (frame.cursor ?? frame.array.length)
                ? "seen"
                : ""
      cell.dataset.state = state
      cell.setAttribute("aria-current", index === frame.cursor ? "step" : "false")
      cell.setAttribute(
        "aria-label",
        `Stream value ${frame.array[index]}, ${
          state === "winner"
            ? "retained winner"
            : state === "rejected"
              ? "rejected or evicted"
              : state || "unseen"
        }`,
      )
    })

    const compared = new Set(frame.compared ?? [])
    nodes.forEach(({ group, value, rootTag }, index) => {
      const entry = frame.heap[index]
      const visible = entry != null
      value.textContent = visible ? String(entry.value) : ""
      group.dataset.visible = visible ? "1" : "0"
      group.setAttribute("aria-hidden", visible ? "false" : "true")
      rootTag.dataset.visible = index === 0 && visible ? "1" : "0"
      group.dataset.state = compared.has(index)
        ? frame.type.startsWith("swap")
          ? "swap"
          : "compare"
        : index === 0 && entry
          ? "weakest"
          : entry
            ? "winner"
            : "empty"
      group.setAttribute(
        "aria-label",
        entry
          ? `Heap slot ${index}, value ${entry.value}${index === 0 ? ", weakest current winner" : ""}`
          : `Heap slot ${index}, empty`,
      )
    })
    for (const { line, child } of edges)
      line.dataset.visible = frame.heap[child] == null ? "0" : "1"
    status.textContent = frame.message
  }

  const watch = (frame: HeapSelectionFrame): WatchRow[] => [
    {
      k: "incoming",
      v: frame.cursor == null ? "complete" : frame.array[frame.cursor],
      sw: "var(--_blue)",
    },
    {
      k: "weakest root",
      v: frame.heap[0]?.value ?? "empty",
      sw: "var(--_amber)",
      hint: "Smallest retained value; this is the only winner a newcomer must beat.",
    },
    {
      k: "heap",
      v: `[${frame.heap.map((entry) => entry.value).join(", ")}]`,
      sw: "var(--_green)",
      hint: "Heap order, not globally sorted order.",
    },
    { k: "decision", v: frame.decision, sw: "var(--_violet)" },
  ]

  return {
    nodes: [root, legend, status],
    stageLayout: "fill",
    stableStage: true,
    paint,
    watch,
    summary(frame) {
      return `Top ${frame.k}: heap [${frame.heap.map((entry) => entry.value).join(", ")}] · root ${frame.heap[0]?.value} is the weakest winner · not globally sorted.`
    },
    destroy: geometry.destroy,
  }
}

export const heapSelectionFamily = {
  id: "heap-selection",
  createRecorder(config) {
    return new HeapSelectionRecorder(config)
  },
  createView(frames) {
    return makeHeapSelectionView(frames)
  },
} satisfies VisualFamily<HeapSelectionConfig, HeapSelectionRecorder, HeapSelectionFrame>

export const twoHeapsFamily = {
  id: "heap-selection",
  createRecorder(config) {
    return new TwoHeapsRecorder(config)
  },
  createView(frames) {
    return makeTwoHeapsView(frames)
  },
} satisfies VisualFamily<TwoHeapsConfig, TwoHeapsRecorder, TwoHeapsFrame>
