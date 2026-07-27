import { el, ICON, makeArrayStrip, statusEl, successMarker } from "../render"
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

function heapPosition(index: number) {
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
  const streamIcons = stream.cells.map((cell, index) => {
    cell.setAttribute("role", "listitem")
    const icon = el("span", "steptrace__heap-stream-icon")
    icon.setAttribute("aria-hidden", "true")
    cell.append(icon)
    cell.setAttribute("aria-label", `Stream value ${first.array[index]}`)
    return icon
  })

  const heapLabel = el("div", "steptrace__rail-label")
  heapLabel.textContent = `Min-heap · capacity k = ${first.k}`
  const heapWrap = el("div", "steptrace__heap-tree")
  const svg = svgEl("svg", "steptrace__heap-svg")
  svg.setAttribute("viewBox", `0 0 300 ${first.k > 3 ? 184 : 116}`)
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Fixed-size min-heap; root is the weakest current winner")

  const positions = Array.from({ length: first.k }, (_, index) => heapPosition(index))
  for (let index = 1; index < first.k; index++) {
    const parent = Math.floor((index - 1) / 2)
    const line = svgEl("line", "steptrace__edge steptrace__heap-edge")
    line.setAttribute("x1", String(positions[parent].x))
    line.setAttribute("y1", String(positions[parent].y))
    line.setAttribute("x2", String(positions[index].x))
    line.setAttribute("y2", String(positions[index].y))
    svg.append(line)
  }

  const nodes = positions.map((position, index) => {
    const group = svgEl("g", "steptrace__node steptrace__heap-node")
    group.setAttribute("transform", `translate(${position.x} ${position.y})`)
    const circle = svgEl("circle", "steptrace__ncirc")
    circle.setAttribute("r", "20")
    const value = svgEl("text", "steptrace__id")
    value.setAttribute("text-anchor", "middle")
    value.setAttribute("dominant-baseline", "central")
    const rootTag = svgEl("text", "steptrace__heap-root-label")
    rootTag.setAttribute("text-anchor", "middle")
    rootTag.setAttribute("y", "-27")
    rootTag.textContent = index === 0 ? "weakest winner" : ""
    group.append(circle, value, rootTag)
    svg.append(group)
    return { group, value }
  })
  heapWrap.append(svg)
  root.append(streamLabel, stream.wrap, heapLabel, heapWrap)

  const legend = el("div", "steptrace__legend steptrace__heap-legend")
  for (const [label, state, icon] of [
    ["incoming", "current", ""],
    ["retained winner", "winner", ICON.check],
    ["weakest root", "weakest", ""],
    ["rejected / evicted", "rejected", ICON.x],
  ] as const) {
    const row = el("span", "steptrace__legend-row")
    const swatch = el("i", `steptrace__heap-swatch steptrace__heap-swatch--${state}`)
    swatch.innerHTML = icon
    row.append(swatch, document.createTextNode(label))
    legend.append(row)
  }

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
      const icon = streamIcons[index]
      icon.replaceChildren()
      if (state === "winner" && frame.type === "done") icon.append(successMarker())
      else if (state === "rejected") icon.innerHTML = ICON.x
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
    nodes.forEach(({ group, value }, index) => {
      const entry = frame.heap[index]
      value.textContent = entry ? String(entry.value) : "·"
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
