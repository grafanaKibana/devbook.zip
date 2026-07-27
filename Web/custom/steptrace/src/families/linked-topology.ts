import { el, makeLegend, statusEl, successMarker } from "../render"
import type { StepTraceView, VisualFamily, WatchRow } from "../types"

let linkedTopologyViewId = 0

export interface LinkedTopologyNode {
  id: string
  x: number
  y: number
}

export interface LinkedTopologyConfig {
  profile: "fast-slow-pointers"
  nodes: LinkedTopologyNode[]
  next: Readonly<Record<string, string>>
  cycle: string[]
  entry: string
}

export type LinkedPointer = "slow" | "fast"

export interface LinkedTopologyFrame {
  type: "init" | "move" | "meet" | "reset" | "entry"
  profile: LinkedTopologyConfig["profile"]
  nodes: LinkedTopologyNode[]
  next: Readonly<Record<string, string>>
  cycle: string[]
  phase: "detect" | "locate"
  slow: string
  fast: string
  moved: LinkedPointer | null
  meeting: string | null
  entry: string | null
  message: string
}

export interface LinkedTopologyOperations {
  begin(message: string): void
  move(pointer: LinkedPointer, to: string, message: string): void
  meet(pointer: LinkedPointer, to: string, message: string): void
  reset(pointer: LinkedPointer, to: string, message: string): void
  enter(pointer: LinkedPointer, to: string, message: string): void
}

export class LinkedTopologyRecorder implements LinkedTopologyOperations {
  readonly frames: LinkedTopologyFrame[] = []
  private phase: LinkedTopologyFrame["phase"] = "detect"
  private slow: string
  private fast: string
  private moved: LinkedPointer | null = null
  private meeting: string | null = null
  private entry: string | null = null

  constructor(private readonly config: LinkedTopologyConfig) {
    this.slow = config.nodes[0].id
    this.fast = config.nodes[0].id
  }

  private push(type: LinkedTopologyFrame["type"], message: string) {
    this.frames.push({
      type,
      profile: this.config.profile,
      nodes: this.config.nodes,
      next: this.config.next,
      cycle: this.config.cycle,
      phase: this.phase,
      slow: this.slow,
      fast: this.fast,
      moved: this.moved,
      meeting: this.meeting,
      entry: this.entry,
      message,
    })
  }

  private set(pointer: LinkedPointer, to: string) {
    if (pointer === "slow") this.slow = to
    else this.fast = to
    this.moved = pointer
  }

  begin(message: string) {
    this.push("init", message)
  }

  move(pointer: LinkedPointer, to: string, message: string) {
    this.set(pointer, to)
    this.push("move", message)
  }

  meet(pointer: LinkedPointer, to: string, message: string) {
    this.set(pointer, to)
    this.meeting = to
    this.push("meet", message)
  }

  reset(pointer: LinkedPointer, to: string, message: string) {
    this.phase = "locate"
    this.set(pointer, to)
    this.push("reset", message)
  }

  enter(pointer: LinkedPointer, to: string, message: string) {
    this.set(pointer, to)
    this.entry = to
    this.push("entry", message)
  }
}

function edgePath(from: LinkedTopologyNode, to: LinkedTopologyNode) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  return `M ${from.x + ux * 4} ${from.y + uy * 4} L ${to.x - ux * 5} ${to.y - uy * 5}`
}

function marker(label: string, role: LinkedPointer) {
  const node = el("div", `steptrace__linked-pointer steptrace__linked-pointer--${role}`)
  node.setAttribute("aria-hidden", "true")
  const text = el("span", "steptrace__linked-pointer-label")
  text.textContent = label
  node.append(text)
  return { node, text }
}

export function makeLinkedTopologyView(
  frames: readonly LinkedTopologyFrame[],
): StepTraceView<LinkedTopologyFrame> {
  const first = frames[0]
  const positions = new Map(first.nodes.map((node) => [node.id, node]))
  const root = el("div", "steptrace__linked-topology")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Fast and slow pointers on a linked cycle")

  const canvas = el("div", "steptrace__linked-canvas")
  canvas.setAttribute("role", "img")
  canvas.setAttribute("aria-label", "Linked structure with slow and fast pointers at A.")
  const topology = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  topology.setAttribute("class", "steptrace__linked-svg")
  topology.setAttribute("viewBox", "0 0 100 70")
  topology.setAttribute("preserveAspectRatio", "none")
  topology.setAttribute("aria-hidden", "true")

  const markerId = `steptrace-linked-arrow-${++linkedTopologyViewId}`
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "marker")
  arrow.setAttribute("id", markerId)
  arrow.setAttribute("viewBox", "0 0 10 10")
  arrow.setAttribute("refX", "8")
  arrow.setAttribute("refY", "5")
  arrow.setAttribute("markerWidth", "5")
  arrow.setAttribute("markerHeight", "5")
  arrow.setAttribute("orient", "auto-start-reverse")
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
  arrowPath.setAttribute("class", "steptrace__linked-arrow")
  arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z")
  arrow.append(arrowPath)
  defs.append(arrow)
  topology.append(defs)

  for (const [fromId, toId] of Object.entries(first.next)) {
    const from = positions.get(fromId)!
    const to = positions.get(toId)!
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("class", "steptrace__linked-edge")
    path.setAttribute("d", edgePath(from, to))
    path.setAttribute("marker-end", `url(#${markerId})`)
    if (first.cycle.includes(fromId) && first.cycle.includes(toId)) path.dataset.cycle = "1"
    topology.append(path)
  }
  canvas.append(topology)

  const nodes = new Map(
    first.nodes.map((node) => {
      const item = el("div", "steptrace__linked-node")
      item.style.setProperty("--_linked-x", String(node.x))
      item.style.setProperty("--_linked-y", String(node.y))
      item.dataset.node = node.id
      item.textContent = node.id
      const result = el("span", "steptrace__linked-node-result")
      result.append(successMarker())
      item.append(result)
      canvas.append(item)
      return [node.id, item] as const
    }),
  )

  const slow = marker("S", "slow")
  const fast = marker("F", "fast")
  canvas.append(slow.node, fast.node)

  const legend = makeLegend(
    [
      {
        label: "slow / cycle pointer",
        swatchClass: "steptrace__linked-swatch steptrace__linked-swatch--slow",
      },
      {
        label: "fast / head pointer",
        swatchClass: "steptrace__linked-swatch steptrace__linked-swatch--fast",
      },
      {
        label: "cycle edge",
        swatchClass: "steptrace__linked-swatch steptrace__linked-swatch--cycle",
      },
      {
        label: "cycle entry",
        swatchClass: "steptrace__linked-swatch steptrace__linked-swatch--entry",
      },
    ],
    "Linked topology state legend",
    "steptrace__linked-legend",
  )

  root.append(canvas)
  const status = statusEl()

  function place(pointer: HTMLElement, id: string) {
    const position = positions.get(id)!
    pointer.style.setProperty("--_linked-x", String(position.x))
    pointer.style.setProperty("--_linked-y", String(position.y))
  }

  function paint(frame: LinkedTopologyFrame) {
    place(slow.node, frame.slow)
    place(fast.node, frame.fast)
    slow.node.dataset.moving = frame.moved === "slow" ? "1" : "0"
    fast.node.dataset.moving = frame.moved === "fast" ? "1" : "0"
    fast.text.textContent = frame.phase === "locate" ? "H" : "F"
    root.dataset.phase = frame.phase
    root.dataset.frame = frame.type
    for (const [id, node] of nodes) {
      node.dataset.slow = String(id === frame.slow)
      node.dataset.fast = String(id === frame.fast)
      node.dataset.meeting = String(id === frame.meeting)
      node.dataset.entry = String(id === frame.entry)
    }
    canvas.setAttribute(
      "aria-label",
      `${frame.phase === "detect" ? "Cycle detection" : "Cycle entry search"}: slow at ${frame.slow}, ${frame.phase === "detect" ? "fast" : "head pointer"} at ${frame.fast}.`,
    )
    status.textContent = frame.message
  }

  const watch = (frame: LinkedTopologyFrame): WatchRow[] => [
    {
      k: "phase",
      v: frame.phase === "detect" ? "detect cycle" : "locate entry",
      sw: "var(--_neutral)",
    },
    {
      k: "slow",
      v: frame.slow,
      hint:
        frame.phase === "detect"
          ? "The pointer advancing one node per loop iteration."
          : "The pointer advancing from the phase-one meeting node.",
      sw: "var(--_blue)",
    },
    {
      k: frame.phase === "detect" ? "fast" : "head",
      v: frame.fast,
      hint:
        frame.phase === "detect"
          ? "The pointer advancing two nodes per loop iteration."
          : "The pointer reset to the list head; both pointers now advance one node.",
      sw: "var(--_violet)",
    },
    {
      k: frame.entry == null ? "meeting" : "entry",
      v: frame.entry ?? frame.meeting ?? "—",
      hint:
        frame.entry == null
          ? "The phase-one collision that proves a cycle exists."
          : "The phase-two collision at the cycle entry.",
      sw: frame.entry == null ? "var(--_amber)" : "var(--_green)",
    },
  ]

  return {
    nodes: [root, legend, status],
    stageAlignment: "center",
    stableStage: true,
    paint,
    watch,
    summary(frame) {
      return `Cycle detected at ${frame.meeting}; entry located at ${frame.entry}.`
    },
  }
}

export const linkedTopologyFamily = {
  id: "linked-topology",
  createRecorder(config) {
    return new LinkedTopologyRecorder(config)
  },
  createView(frames) {
    return makeLinkedTopologyView(frames)
  },
} satisfies VisualFamily<LinkedTopologyConfig, LinkedTopologyRecorder, LinkedTopologyFrame>
