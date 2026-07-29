import type { MountHandle, StepTraceConfig } from "../types"
import { createStructureShell, onEnter } from "./interactive-structure"

export interface MultiwayTreeConfig {
  values: number[]
  value?: number
  range?: [number, number]
}

type TreeKind = "b-tree" | "b-plus-tree"

export interface MultiwayNode {
  id: string
  keys: number[]
  children: MultiwayNode[]
  next: MultiwayNode | null
}

export interface MultiwayTreeOperationState {
  path: Set<string>
  affected: Set<string>
  special: number | null
  found: Set<string>
  links: Set<string>
}

interface Split {
  separator: number
  right: MultiwayNode
}

const SVG_NS = "http://www.w3.org/2000/svg"
const VIEW_WIDTH = 620
const VIEW_HEIGHT = 280
const MAX_KEYS = 3
const MAX_VALUES = 10
const CELL_WIDTH = 33
const NODE_HEIGHT = 34
const NODE_GAP = 8
const VIEW_PADDING = 10

export function parseMultiwayTreeConfig(
  config: StepTraceConfig,
  algorithm: TreeKind,
  defaults: readonly number[],
  defaultValue: number,
  defaultRange?: [number, number],
): MultiwayTreeConfig {
  if (config.order != null && config.order !== 4)
    throw new Error(`steptrace: ${algorithm} supports fixed order 4.`)
  const values = Array.isArray(config.values) && config.values.length ? config.values : defaults
  if (
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(`steptrace: ${algorithm} requires finite integer values.`)
  if (new Set(values).size !== values.length)
    throw new Error(`steptrace: ${algorithm} requires unique values.`)
  if (values.length > MAX_VALUES)
    throw new Error(`steptrace: ${algorithm} supports at most ${MAX_VALUES} values.`)

  const value = config.value ?? defaultValue
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value))
    throw new Error(`steptrace: ${algorithm} value must be a finite integer.`)

  const range = config.range ?? defaultRange
  if (
    range &&
    (range.length !== 2 ||
      range.some(
        (bound) => typeof bound !== "number" || !Number.isFinite(bound) || !Number.isInteger(bound),
      ))
  )
    throw new Error(`steptrace: ${algorithm} range must contain two finite integers.`)
  return {
    values: [...values] as number[],
    value,
    range: range ? ([...range] as [number, number]) : undefined,
  }
}

function svgEl(tag: string, className: string) {
  const node = document.createElementNS(SVG_NS, tag)
  node.setAttribute("class", className)
  return node
}

export function createMultiwayTreeOperationState(): MultiwayTreeOperationState {
  return {
    path: new Set(),
    affected: new Set(),
    special: null,
    found: new Set(),
    links: new Set(),
  }
}

function upperBound(keys: readonly number[], key: number) {
  let index = 0
  while (index < keys.length && key >= keys[index]) index++
  return index
}

function lowerBound(keys: readonly number[], key: number) {
  let index = 0
  while (index < keys.length && key > keys[index]) index++
  return index
}

export function createMultiwayTreeModel(kind: TreeKind, values: readonly number[]) {
  let nextId = 0
  const makeNode = (keys: number[] = [], children: MultiwayNode[] = []): MultiwayNode => ({
    id: `m${nextId++}`,
    keys,
    children,
    next: null,
  })
  let root = makeNode()

  const splitNode = (current: MultiwayNode, state: MultiwayTreeOperationState): Split => {
    const splitAt = 2
    const separator = current.keys[splitAt]
    const rightKeys =
      kind === "b-plus-tree" && current.children.length === 0
        ? current.keys.splice(splitAt)
        : current.keys.splice(splitAt + 1)
    const rightChildren = current.children.length === 0 ? [] : current.children.splice(splitAt + 1)
    if (kind !== "b-plus-tree" || current.children.length > 0) current.keys.pop()
    const right = makeNode(rightKeys, rightChildren)
    if (kind === "b-plus-tree" && current.children.length === 0) {
      right.next = current.next
      current.next = right
    }
    state.affected.add(current.id).add(right.id)
    state.special = separator
    return { separator, right }
  }

  const insertInto = (
    current: MultiwayNode,
    key: number,
    state: MultiwayTreeOperationState,
  ): Split | null => {
    state.path.add(current.id)
    if (current.children.length === 0) {
      const index = lowerBound(current.keys, key)
      if (current.keys[index] === key) return null
      current.keys.splice(index, 0, key)
      state.affected.add(current.id)
    } else {
      const childIndex =
        kind === "b-plus-tree" ? upperBound(current.keys, key) : lowerBound(current.keys, key)
      if (kind === "b-tree" && current.keys[childIndex] === key) return null
      const split = insertInto(current.children[childIndex], key, state)
      if (split) {
        current.keys.splice(childIndex, 0, split.separator)
        current.children.splice(childIndex + 1, 0, split.right)
        state.affected.add(current.id)
      }
    }
    return current.keys.length > MAX_KEYS ? splitNode(current, state) : null
  }

  const model = {
    get root() {
      return root
    },
    insert(key: number, state: MultiwayTreeOperationState) {
      if (model.keys().includes(key))
        return { changed: false, detail: `${key} already exists, so the tree did not change.` }
      if (model.keys().length >= MAX_VALUES)
        return {
          changed: false,
          detail: `The review tree is capped at ${MAX_VALUES} records.`,
        }
      const split = insertInto(root, key, state)
      if (split) {
        root = makeNode([split.separator], [root, split.right])
        state.affected.add(root.id)
      }
      return {
        changed: true,
        detail:
          state.special != null
            ? kind === "b-plus-tree"
              ? `Inserted ${key}; copied separator ${state.special} into the parent and kept it in the right leaf.`
              : `Inserted ${key}; promoted median ${state.special} into the parent.`
            : `Inserted ${key}; every node remains within the order-4 limit.`,
      }
    },
    search(key: number, state: MultiwayTreeOperationState) {
      let current = root
      while (true) {
        state.path.add(current.id)
        const index =
          kind === "b-plus-tree" ? upperBound(current.keys, key) : lowerBound(current.keys, key)
        if (kind === "b-tree" && current.keys[index] === key) {
          state.found.add(`${current.id}:${key}`)
          return { found: true, detail: `Search found ${key} in node ${current.id}.` }
        }
        if (current.children.length === 0) {
          const found = current.keys.includes(key)
          if (found) state.found.add(`${current.id}:${key}`)
          return {
            found,
            detail: found
              ? `Search reached leaf ${current.id} and found ${key}.`
              : `Search reached leaf ${current.id}; ${key} is absent.`,
          }
        }
        current = current.children[index]
      }
    },
    range(from: number, to: number, state: MultiwayTreeOperationState) {
      let current = root
      while (current.children.length) {
        state.path.add(current.id)
        current = current.children[upperBound(current.keys, from)]
      }
      state.path.add(current.id)
      const matches: number[] = []
      while (current) {
        for (const key of current.keys) {
          if (key > to)
            return {
              matches,
              detail: `Range [${from}, ${to}] returned ${matches.join(", ") || "no keys"} by following leaf links.`,
            }
          if (key >= from) {
            matches.push(key)
            state.found.add(`${current.id}:${key}`)
          }
        }
        if (!current.next) break
        const next = current.next
        if (next.keys[0] > to) break
        state.links.add(`${current.id}->${next.id}`)
        current = next
        state.path.add(current.id)
      }
      return {
        matches,
        detail: `Range [${from}, ${to}] returned ${matches.join(", ") || "no keys"} by following leaf links.`,
      }
    },
    keys() {
      if (kind === "b-plus-tree") {
        let leaf = root
        while (leaf.children.length) leaf = leaf.children[0]
        const keys: number[] = []
        while (leaf) {
          keys.push(...leaf.keys)
          leaf = leaf.next!
        }
        return keys
      }
      const keys: number[] = []
      const visit = (current: MultiwayNode) => {
        current.keys.forEach((key, index) => {
          if (current.children[index]) visit(current.children[index])
          keys.push(key)
        })
        if (current.children[current.keys.length]) visit(current.children[current.keys.length])
      }
      visit(root)
      return keys
    },
  }

  for (const value of values) model.insert(value, createMultiwayTreeOperationState())
  return model
}

export function mountMultiwayTree(
  rootElement: HTMLElement,
  config: MultiwayTreeConfig,
  kind: TreeKind,
): MountHandle {
  const label = kind === "b-tree" ? "B-tree" : "B+ tree"
  const shell = createStructureShell(
    rootElement,
    kind,
    label,
    `Interactive order-4 ${label}`,
    "multiway-tree",
    "steptrace__multiway-tree",
  )
  const initial = [...config.values]
  let model = createMultiwayTreeModel(kind, initial)
  let state = createMultiwayTreeOperationState()

  const svg = svgEl("svg", "steptrace__multiway-tree-svg") as SVGSVGElement
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`)
  svg.setAttribute("role", "img")
  shell.stage.append(svg)
  let renderedWidth = VIEW_WIDTH

  const keyInput = shell.input(`${label} key`, "Key", 8)
  keyInput.type = "number"
  keyInput.step = "1"
  keyInput.value = String(config.value ?? "")
  const insert = shell.button("Insert", true)
  const search = shell.button("Search")
  const reset = shell.button("Reset")
  shell.controls.append(keyInput, insert, search)

  let fromInput: HTMLInputElement | null = null
  let toInput: HTMLInputElement | null = null
  let rangeButton: HTMLButtonElement | null = null
  if (kind === "b-plus-tree") {
    fromInput = shell.input("Range start", "From", 8)
    fromInput.type = "number"
    fromInput.step = "1"
    fromInput.value = String(config.range?.[0] ?? "")
    toInput = shell.input("Range end", "To", 8)
    toInput.type = "number"
    toInput.step = "1"
    toInput.value = String(config.range?.[1] ?? "")
    rangeButton = shell.button("Range scan")
    shell.controls.append(fromInput, toInput, rangeButton)
  }
  shell.controls.append(reset)

  function paintTree() {
    svg.replaceChildren()
    const marker = svgEl("marker", "steptrace__multiway-tree-arrow")
    marker.id = `${kind}-next-arrow`
    marker.setAttribute("viewBox", "0 0 10 10")
    marker.setAttribute("refX", "8")
    marker.setAttribute("refY", "5")
    marker.setAttribute("markerWidth", "5")
    marker.setAttribute("markerHeight", "5")
    marker.setAttribute("orient", "auto-start-reverse")
    const arrow = svgEl("path", "")
    arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z")
    marker.append(arrow)
    const defs = svgEl("defs", "")
    defs.append(marker)
    svg.append(defs)

    const levels: MultiwayNode[][] = []
    const visit = (current: MultiwayNode, depth: number) => {
      ;(levels[depth] ??= []).push(current)
      current.children.forEach((child) => visit(child, depth + 1))
    }
    visit(model.root, 0)
    const measuredWidth = Math.round(svg.getBoundingClientRect().width)
    if (measuredWidth > 0) renderedWidth = Math.min(measuredWidth, VIEW_WIDTH)
    const viewWidth = Math.max(
      renderedWidth,
      ...levels.map(
        (nodes) =>
          nodes.reduce((width, node) => width + Math.max(node.keys.length, 1) * CELL_WIDTH, 0) +
          Math.max(nodes.length - 1, 0) * NODE_GAP +
          VIEW_PADDING * 2,
      ),
    )
    svg.setAttribute("viewBox", `0 0 ${viewWidth} ${VIEW_HEIGHT}`)
    const positions = new Map<string, { x: number; y: number; width: number }>()
    levels.forEach((nodes, depth) => {
      const y = 30 + depth * (kind === "b-plus-tree" ? 80 : 92)
      const widths = nodes.map((node) => Math.max(node.keys.length, 1) * CELL_WIDTH)
      const levelWidth =
        widths.reduce((sum, width) => sum + width, 0) + Math.max(nodes.length - 1, 0) * NODE_GAP
      let cursor = (viewWidth - levelWidth) / 2
      nodes.forEach((node) => {
        const width = Math.max(node.keys.length, 1) * CELL_WIDTH
        positions.set(node.id, {
          x: cursor + width / 2,
          y,
          width,
        })
        cursor += width + NODE_GAP
      })
    })

    for (const nodes of levels) {
      for (const parent of nodes) {
        const from = positions.get(parent.id)!
        for (const child of parent.children) {
          const to = positions.get(child.id)!
          const line = svgEl("line", "steptrace__edge steptrace__multiway-tree-edge")
          line.setAttribute("x1", String(from.x))
          line.setAttribute("y1", String(from.y + NODE_HEIGHT / 2))
          line.setAttribute("x2", String(to.x))
          line.setAttribute("y2", String(to.y - NODE_HEIGHT / 2))
          line.dataset.state =
            state.path.has(parent.id) && state.path.has(child.id) ? "path" : "neutral"
          svg.append(line)
        }
      }
    }

    const leaves = levels.at(-1) ?? []
    if (kind === "b-plus-tree") {
      leaves.slice(0, -1).forEach((leaf, index) => {
        const next = leaves[index + 1]
        const from = positions.get(leaf.id)!
        const to = positions.get(next.id)!
        const path = svgEl("path", "steptrace__multiway-tree-link")
        path.setAttribute(
          "d",
          `M ${from.x + from.width / 2} ${from.y + NODE_HEIGHT / 2} V 248 H ${to.x - to.width / 2} V ${to.y + NODE_HEIGHT / 2 + 5}`,
        )
        path.setAttribute("marker-end", `url(#${kind}-next-arrow)`)
        path.dataset.from = leaf.id
        path.dataset.to = next.id
        path.dataset.state = state.links.has(`${leaf.id}->${next.id}`) ? "active" : "neutral"
        svg.append(path)
      })
    }

    for (const nodes of levels) {
      for (const node of nodes) {
        const position = positions.get(node.id)!
        const group = svgEl("g", "steptrace__multiway-tree-node")
        group.setAttribute(
          "transform",
          `translate(${position.x - position.width / 2} ${position.y - NODE_HEIGHT / 2})`,
        )
        group.dataset.path = state.path.has(node.id) ? "1" : "0"
        group.dataset.affected = state.affected.has(node.id) ? "1" : "0"
        group.dataset.nodeId = node.id
        group.dataset.role = node.children.length ? "internal" : "leaf"
        group.setAttribute(
          "aria-label",
          `${node.children.length ? "Internal node" : "Leaf"} ${node.id}, keys ${node.keys.join(", ") || "empty"}`,
        )
        const keys = node.keys.length ? node.keys : [null]
        keys.forEach((key, index) => {
          const cell = svgEl("rect", "steptrace__multiway-tree-cell")
          cell.setAttribute("x", String(index * CELL_WIDTH))
          cell.setAttribute("width", String(CELL_WIDTH))
          cell.setAttribute("height", String(NODE_HEIGHT))
          cell.setAttribute("rx", "4")
          cell.dataset.key = key == null ? "" : String(key)
          cell.dataset.state =
            key != null && state.found.has(`${node.id}:${key}`)
              ? "found"
              : key === state.special
                ? "special"
                : "neutral"
          const text = svgEl("text", "steptrace__multiway-tree-key")
          text.setAttribute("x", String(index * CELL_WIDTH + CELL_WIDTH / 2))
          text.setAttribute("y", String(NODE_HEIGHT / 2))
          text.setAttribute("text-anchor", "middle")
          text.setAttribute("dominant-baseline", "central")
          text.textContent = key == null ? "·" : String(key)
          group.append(cell, text)
        })
        const id = svgEl("text", "steptrace__multiway-tree-id")
        id.setAttribute("x", String(position.width / 2))
        id.setAttribute("y", "-6")
        id.setAttribute("text-anchor", "middle")
        id.textContent = node.id
        group.append(id)
        svg.append(group)
      }
    }
    svg.setAttribute(
      "aria-label",
      `${label} with ${model.keys().length} unique keys in ${levels.length} levels`,
    )
  }

  function paint(message: string) {
    paintTree()
    const count = model.keys().length
    shell.setCounter(String(count), count === 1 ? " record" : " records")
    shell.status.textContent = message
    insert.disabled = count >= MAX_VALUES
    search.disabled = count === 0
    if (rangeButton) rangeButton.disabled = count === 0
  }

  function integerFrom(input: HTMLInputElement, label: string) {
    const value = Number(input.value)
    if (input.value.trim() && Number.isFinite(value) && Number.isInteger(value)) return value
    paint(`${label} must be a finite integer.`)
    return null
  }

  function onInsert() {
    const key = integerFrom(keyInput, "Key")
    if (key == null) return
    state = createMultiwayTreeOperationState()
    const result = model.insert(key, state)
    keyInput.value = ""
    paint(result.detail)
  }

  function onSearch() {
    const key = integerFrom(keyInput, "Key")
    if (key == null) return
    state = createMultiwayTreeOperationState()
    const result = model.search(key, state)
    paint(result.detail)
  }

  function onRange() {
    const from = integerFrom(fromInput!, "From")
    if (from == null) return
    const to = integerFrom(toInput!, "To")
    if (to == null) return
    if (from > to) {
      paint("From must be less than or equal to To.")
      return
    }
    state = createMultiwayTreeOperationState()
    paint(model.range(from, to, state).detail)
  }

  function onReset() {
    model = createMultiwayTreeModel(kind, initial)
    state = createMultiwayTreeOperationState()
    keyInput.value = String(config.value ?? "")
    if (fromInput) fromInput.value = String(config.range?.[0] ?? "")
    if (toInput) toInput.value = String(config.range?.[1] ?? "")
    paint(`Reset to the initial order-4 ${label}.`)
  }

  shell.listen(insert, "click", onInsert)
  shell.listen(search, "click", onSearch)
  shell.listen(reset, "click", onReset)
  if (rangeButton) shell.listen(rangeButton, "click", onRange)
  onEnter(shell, keyInput, onInsert)
  if (fromInput) onEnter(shell, fromInput, onRange)
  if (toInput) onEnter(shell, toInput, onRange)
  paint(
    `Insert or search a key${kind === "b-plus-tree" ? ", or scan a range" : ""}. Order 4 means at most 3 keys per node.`,
  )
  const handle = shell.finish()
  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          const nextWidth = Math.min(Math.round(svg.getBoundingClientRect().width), VIEW_WIDTH)
          if (nextWidth <= 0 || nextWidth === renderedWidth) return
          renderedWidth = nextWidth
          paintTree()
        })
  resizeObserver?.observe(svg)
  return {
    destroy() {
      resizeObserver?.disconnect()
      handle.destroy()
    },
  }
}

export const mountBTree = (root: HTMLElement, config: MultiwayTreeConfig) =>
  mountMultiwayTree(root, config, "b-tree")

export const mountBPlusTree = (root: HTMLElement, config: MultiwayTreeConfig) =>
  mountMultiwayTree(root, config, "b-plus-tree")
