import {
  GRAPH_EDGE_ARROW_GAP_PX,
  GRAPH_NODE_RADIUS_PX,
  observeFixedSvgNodes,
  trimGraphEdge,
} from "../graph-node"
import { el, makeLegend, statusEl, successMarker } from "../render"
import type { MountHandle, StepTraceView, VisualFamily, WatchRow } from "../types"
import { createIndexedBoard, createStructureShell, onEnter } from "./interactive-structure"

let linkedTopologyViewId = 0
export const LINKED_LIST_MAX_NODES = 6

export interface LinkedListConfig {
  values: number[]
  variant: "singly" | "doubly"
}

interface AddressChainNode {
  address: string
  value: string
}

function linkedAddress(index: number, base = 0x1000) {
  return `0x${(base + index * 0x20).toString(16).toUpperCase()}`
}

function createAddressChain(stage: HTMLElement, variant: "singly" | "doubly") {
  const board = el("div", "steptrace__linked-list-board")
  board.dataset.variant = variant
  board.setAttribute("role", "list")
  stage.append(board)

  function paint(
    nodes: readonly AddressChainNode[],
    state: { appended?: string; moved?: string; relinked?: string } = {},
  ) {
    board.replaceChildren(
      ...nodes.map((item, index) => {
        const node = el("div", "steptrace__linked-list-node-card")
        node.dataset.appended = item.address === state.appended ? "1" : "0"
        node.dataset.moved = item.address === state.moved ? "1" : "0"
        node.dataset.relinked = item.address === state.relinked ? "1" : "0"
        node.setAttribute("role", "listitem")
        const array = el("div", "steptrace__contiguous-array")
        array.style.setProperty("--steptrace-capacity", "1")
        const cell = el("div", "steptrace__contiguous-cell steptrace__linked-list-cell")
        cell.dataset.empty = "0"
        const valueField = el(
          "span",
          "steptrace__contiguous-value steptrace__linked-list-value-field",
        )
        const valueText = el("span", "steptrace__linked-list-value")
        valueText.textContent = item.value
        const ownAddress = el("span", "steptrace__linked-list-address")
        ownAddress.textContent = item.address
        valueField.append(valueText, ownAddress)
        const nextAddress = nodes[index + 1]?.address ?? null
        const nextField = el("span", "steptrace__linked-list-pointer")
        nextField.dataset.pointer = "next"
        nextField.textContent = `next ${nextAddress ?? "null"}`
        if (variant === "doubly") {
          const previousAddress = nodes[index - 1]?.address ?? null
          const previousField = el("span", "steptrace__linked-list-pointer")
          previousField.dataset.pointer = "prev"
          previousField.textContent = `prev ${previousAddress ?? "null"}`
          cell.append(valueField, previousField, nextField)
        } else cell.append(valueField, nextField)
        array.append(cell)
        node.append(array)
        if (nextAddress) {
          const nextLink = el("span", "steptrace__linked-list-link")
          nextLink.dataset.pointer = "next"
          nextLink.setAttribute("aria-hidden", "true")
          node.append(nextLink)
        }
        if (variant === "doubly" && index > 0) {
          const previousLink = el("span", "steptrace__linked-list-link")
          previousLink.dataset.pointer = "prev"
          previousLink.setAttribute("aria-hidden", "true")
          node.append(previousLink)
        }
        node.setAttribute(
          "aria-label",
          `${index === 0 ? "Head" : index === nodes.length - 1 ? "Tail" : `Node ${index}`}, address ${item.address}, value ${item.value}, ${
            variant === "doubly" ? `prev ${nodes[index - 1]?.address ?? "null"}, ` : ""
          }next ${nextAddress ?? "null"}`,
        )
        return node
      }),
    )
  }
  return { paint }
}

export function mountLinkedList(root: HTMLElement, config: LinkedListConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "linked-list",
    `${config.variant} linked list`,
    `Interactive ${config.variant} linked list`,
    "linked-topology",
    "steptrace__linked-list",
  )
  const initial = [...config.values]
  const values = [...initial]
  let appended: number | null = null
  let relinked: number | null = null

  const chain = createAddressChain(shell.stage, config.variant)
  const input = shell.input("Value to append", "Value", 8)
  input.type = "number"
  input.step = "1"
  const append = shell.button("Append", true)
  const remove = shell.button("Remove tail")
  const reset = shell.button("Reset")
  shell.controls.append(input, append, remove, reset)

  function paint(message = "") {
    chain.paint(
      values.map((value, index) => ({ value: String(value), address: linkedAddress(index) })),
      {
        appended: appended == null ? undefined : linkedAddress(appended),
        relinked: relinked == null ? undefined : linkedAddress(relinked),
      },
    )
    shell.setCounter(String(values.length), values.length === 1 ? " node" : " nodes")
    append.disabled = values.length >= LINKED_LIST_MAX_NODES
    input.disabled = values.length >= LINKED_LIST_MAX_NODES
    remove.disabled = values.length <= 1
    shell.status.textContent =
      message || "Append a node to update the tail pointer, or remove the current tail."
  }

  function onAppend() {
    const raw = input.value.trim()
    const value = raw === "" ? Math.floor(Math.random() * 90) + 10 : Number(raw)
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      shell.status.textContent = "Value must be a finite integer."
      return
    }
    if (values.length >= LINKED_LIST_MAX_NODES) return
    const previousAddress = linkedAddress(values.length - 1)
    const nextAddress = linkedAddress(values.length)
    relinked = values.length - 1
    values.push(value)
    appended = values.length - 1
    input.value = ""
    paint(
      config.variant === "doubly"
        ? `Appended ${value} at ${nextAddress}; ${previousAddress}.next now stores ${nextAddress}, and ${nextAddress}.prev stores ${previousAddress}.`
        : `Appended ${value} at ${nextAddress}; ${previousAddress}.next now stores ${nextAddress}.`,
    )
    input.focus?.()
  }

  function onRemove() {
    if (values.length <= 1) return
    const removed = values.pop()
    relinked = values.length - 1
    appended = null
    paint(`Removed tail ${removed}; ${linkedAddress(values.length - 1)}.next is null.`)
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    appended = null
    relinked = null
    input.value = ""
    paint("Reset the linked list to its initial nodes.")
  }

  shell.listen(append, "click", onAppend)
  shell.listen(remove, "click", onRemove)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onAppend)
  paint()
  return shell.finish()
}

interface LruEntry {
  key: string
  value: string
  address: string
}

export function mountLruCache(root: HTMLElement): MountHandle {
  const capacity = 4
  const initial: LruEntry[] = [
    { key: "A", value: "10", address: linkedAddress(0, 0x2000) },
    { key: "B", value: "20", address: linkedAddress(1, 0x2000) },
    { key: "C", value: "30", address: linkedAddress(2, 0x2000) },
  ]
  let entries = initial.map((entry) => ({ ...entry }))
  let mapSlots: Array<string | null> = ["A", "B", "C", null]
  let nextAddress = 3
  let moved: string | undefined
  let accessedKey: string | undefined
  let changedMapSlot: number | undefined
  const shell = createStructureShell(
    root,
    "lru-cache",
    "LRU cache",
    "Interactive capacity-four least recently used cache",
    "linked-topology",
    "steptrace__lru-cache",
  )
  const mapLabel = el("div", "steptrace__rail-label")
  mapLabel.textContent = "Map · key → node address"
  const mapWrap = el("div", "steptrace__lru-map")
  const map = createIndexedBoard(mapWrap, capacity, "LRU key to node address index")
  const chainLabel = el("div", "steptrace__rail-label")
  chainLabel.textContent = "Recency · MRU → LRU"
  const chainWrap = el("div", "steptrace__lru-chain")
  const chain = createAddressChain(chainWrap, "doubly")
  shell.stage.append(mapLabel, mapWrap, chainLabel, chainWrap)
  const keyInput = shell.input("Cache key", "Key", 4)
  const valueInput = shell.input("Cache value", "Value", 8)
  valueInput.type = "number"
  valueInput.step = "1"
  const put = shell.button("Put", true)
  const get = shell.button("Get")
  const reset = shell.button("Reset")
  shell.controls.append(keyInput, valueInput, put, get, reset)

  const randomKey = () => String.fromCharCode(65 + Math.floor(Math.random() * 26))
  const randomValue = () => String(Math.floor(Math.random() * 90) + 10)
  const key = () => (keyInput.value.trim() || randomKey()).toUpperCase()

  function paint(message = "") {
    map.paint(
      mapSlots.map((storedKey, index) => {
        const entry = entries.find((candidate) => candidate.key === storedKey)
        return {
          value: entry ? `${entry.key} → ${entry.address}` : null,
          active: Boolean(entry && accessedKey && entry.key === accessedKey),
          changed: changedMapSlot != null && index === changedMapSlot,
          ariaLabel: entry
            ? `key ${entry.key} maps to node ${entry.address}`
            : `map slot ${index}, empty`,
        }
      }),
    )
    chain.paint(
      entries.map((entry) => ({
        address: entry.address,
        value: `${entry.key}:${entry.value}`,
      })),
      { moved },
    )
    shell.setCounter(String(entries.length), ` / ${capacity}`)
    shell.status.textContent =
      message || "Put or get a key. The left node is MRU; the right node is LRU."
  }

  function promote(index: number) {
    const [entry] = entries.splice(index, 1)
    entries.unshift(entry)
    moved = entry.address
    return entry
  }

  function onGet() {
    const target = key()
    const index = entries.findIndex((entry) => entry.key === target)
    keyInput.value = ""
    changedMapSlot = undefined
    if (index < 0) {
      moved = undefined
      accessedKey = undefined
      paint(`Get ${target}: miss. Cache state did not change.`)
      return
    }
    const entry = promote(index)
    accessedKey = target
    paint(`Get ${target}: hit ${entry.value}; promoted ${entry.address} to MRU.`)
  }

  function onPut() {
    const target = key()
    const rawValue = valueInput.value.trim() || randomValue()
    if (!/^[A-Z0-9]{1,4}$/.test(target) || !Number.isInteger(Number(rawValue))) {
      shell.status.textContent = "Key must be 1–4 letters or digits; value must be an integer."
      return
    }
    const index = entries.findIndex((entry) => entry.key === target)
    let message: string
    if (index >= 0) {
      entries[index].value = rawValue
      const entry = promote(index)
      accessedKey = target
      changedMapSlot = undefined
      message = `Put ${target}:${rawValue}: updated ${entry.address} and promoted it to MRU.`
    } else {
      const evicted = entries.length === capacity ? entries.pop() : undefined
      const slot = evicted
        ? mapSlots.findIndex((storedKey) => storedKey === evicted.key)
        : mapSlots.findIndex((storedKey) => storedKey == null)
      const entry = {
        key: target,
        value: rawValue,
        address: linkedAddress(nextAddress++, 0x2000),
      }
      entries.unshift(entry)
      mapSlots[slot] = target
      moved = entry.address
      accessedKey = undefined
      changedMapSlot = slot
      message = evicted
        ? `Put ${target}:${rawValue}: evicted LRU ${evicted.key} at ${evicted.address}; inserted ${entry.address} at MRU.`
        : `Put ${target}:${rawValue}: inserted ${entry.address} at MRU.`
    }
    keyInput.value = ""
    valueInput.value = ""
    paint(message)
  }

  function onReset() {
    entries = initial.map((entry) => ({ ...entry }))
    mapSlots = ["A", "B", "C", null]
    nextAddress = 3
    moved = undefined
    accessedKey = undefined
    changedMapSlot = undefined
    keyInput.value = ""
    valueInput.value = ""
    paint("Reset the LRU cache.")
  }
  shell.listen(put, "click", onPut)
  shell.listen(get, "click", onGet)
  shell.listen(reset, "click", onReset)
  onEnter(shell, valueInput, onPut)
  paint()
  return shell.finish()
}

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

function edgePath(
  from: LinkedTopologyNode,
  to: LinkedTopologyNode,
  nodeRadius: number,
  arrowGap: number,
) {
  const edge = trimGraphEdge(from, to, nodeRadius, nodeRadius + arrowGap)
  return `M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`
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
  topology.setAttribute("preserveAspectRatio", "xMidYMid meet")
  topology.setAttribute("aria-hidden", "true")

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
  const markerBaseId = `steptrace-linked-arrow-${++linkedTopologyViewId}`
  const markerIds = new Map(
    (["neutral", "cycle"] as const).map((role) => {
      const id = `${markerBaseId}-${role}`
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "marker")
      arrow.setAttribute("id", id)
      arrow.setAttribute("viewBox", "0 0 10 10")
      arrow.setAttribute("refX", "8")
      arrow.setAttribute("refY", "5")
      arrow.setAttribute("markerWidth", "5")
      arrow.setAttribute("markerHeight", "5")
      arrow.setAttribute("orient", "auto-start-reverse")
      const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path")
      arrowPath.setAttribute("class", "steptrace__linked-arrow")
      arrowPath.setAttribute("data-role", role)
      arrowPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z")
      arrow.append(arrowPath)
      defs.append(arrow)
      return [role, id] as const
    }),
  )
  topology.append(defs)

  const edgeElements: Array<{
    path: SVGPathElement
    from: LinkedTopologyNode
    to: LinkedTopologyNode
  }> = []
  for (const [fromId, toId] of Object.entries(first.next)) {
    const from = positions.get(fromId)!
    const to = positions.get(toId)!
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("class", "steptrace__linked-edge")
    path.setAttribute("d", edgePath(from, to, GRAPH_NODE_RADIUS_PX, GRAPH_EDGE_ARROW_GAP_PX))
    const cycle = first.cycle.includes(fromId) && first.cycle.includes(toId)
    path.setAttribute("marker-end", `url(#${markerIds.get(cycle ? "cycle" : "neutral")!})`)
    if (cycle) path.dataset.cycle = "1"
    topology.append(path)
    edgeElements.push({ path, from, to })
  }
  canvas.append(topology)
  const geometry = observeFixedSvgNodes(topology, [], (unitsPerCssPixel) => {
    const radius = GRAPH_NODE_RADIUS_PX * unitsPerCssPixel
    const arrowGap = GRAPH_EDGE_ARROW_GAP_PX * unitsPerCssPixel
    for (const edge of edgeElements)
      edge.path.setAttribute("d", edgePath(edge.from, edge.to, radius, arrowGap))
  })

  const nodes = new Map(
    first.nodes.map((node) => {
      const position = positions.get(node.id)!
      const item = el("div", "steptrace__linked-node")
      item.style.setProperty("--_linked-x", String(position.x))
      item.style.setProperty("--_linked-y", String(position.y))
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
    destroy: geometry.destroy,
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
