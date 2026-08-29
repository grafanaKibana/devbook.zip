import { el } from "../render"
import type { MountHandle } from "../types"
import { createIndexedBoard, createStructureShell, onEnter } from "./interactive-structure"

export interface FenwickTreeConfig {
  values: number[]
}

export interface SegmentTreeConfig {
  values: number[]
}

type BlockRole = "idle" | "update" | "query" | "prefix-right" | "prefix-left" | "cancelled"

interface RangeBlock {
  block: HTMLElement
  operation: HTMLElement
  value: HTMLElement
}

function createRangeBlock(
  parent: HTMLElement,
  markerClass: string,
  headText: string,
  start: number,
  end: number,
  level: number,
): RangeBlock {
  const block = el("div", `steptrace__range-block ${markerClass}`)
  block.style.setProperty("--steptrace-range-start", String(start))
  block.style.setProperty("--steptrace-range-span", String(end - start + 1))
  block.style.setProperty("--steptrace-range-level", String(level))
  block.setAttribute("role", "listitem")
  const head = el("span", "steptrace__range-block-head")
  head.textContent = headText
  const operation = el("span", "steptrace__range-block-op")
  const value = el("strong", "steptrace__range-block-value")
  const range = el("span", "steptrace__range-block-range")
  range.textContent = start === end ? `[${start}]` : `[${start}..${end}]`
  block.append(head, operation, value, range)
  parent.append(block)
  return { block, operation, value }
}

function paintRangeBlock(target: RangeBlock, value: number, role: BlockRole) {
  target.block.dataset.role = role
  target.value.textContent = String(value)
  target.operation.textContent =
    role === "update"
      ? "U"
      : role === "query" || role === "prefix-right"
        ? "+"
        : role === "prefix-left"
          ? "−"
          : role === "cancelled"
            ? "±"
            : ""
  target.operation.setAttribute(
    "aria-label",
    role === "update"
      ? "updated path"
      : role === "query"
        ? "included in range result"
        : role === "prefix-right"
          ? "added by the right prefix"
          : role === "prefix-left"
            ? "subtracted by the left prefix"
            : role === "cancelled"
              ? "read by both prefixes and cancelled"
              : "inactive",
  )
}

function lowbit(index: number) {
  return index & -index
}

function buildFenwick(values: readonly number[]) {
  const tree = Array(values.length + 1).fill(0)
  values.forEach((value, offset) => {
    for (let index = offset + 1; index <= values.length; index += lowbit(index))
      tree[index] += value
  })
  return tree
}

function updatePath(start: number, size: number) {
  const path: number[] = []
  for (let index = start; index <= size; index += lowbit(index)) path.push(index)
  return path
}

function prefixPath(start: number) {
  const path: number[] = []
  for (let index = start; index > 0; index -= lowbit(index)) path.push(index)
  return path
}

function sumPath(tree: readonly number[], path: readonly number[]) {
  return path.reduce((sum, index) => sum + tree[index], 0)
}

export function mountFenwickTree(root: HTMLElement, config: FenwickTreeConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "fenwick-tree",
    "fenwick tree",
    "Interactive Fenwick tree with point updates and range-sum queries",
    "range-aggregate",
    "steptrace__range-aggregate steptrace__fenwick",
  )
  const initial = [...config.values]
  const values = [...initial]
  const tree = buildFenwick(values)
  let activeIndex: number | null = null
  let activeRange: [number, number] | null = null
  let roles = new Map<number, BlockRole>()

  const blocksLabel = el("div", "steptrace__rail-label")
  blocksLabel.textContent = "Fenwick blocks"
  const blocks = el("div", "steptrace__fenwick-blocks")
  blocks.style.setProperty("--steptrace-range-size", String(values.length))
  blocks.setAttribute("role", "list")
  blocks.setAttribute(
    "aria-label",
    "Fenwick aggregate slots positioned over the source ranges they summarize",
  )
  const levels = Math.floor(Math.log2(values.length)) + 1
  const blockNodes = Array.from({ length: values.length }, (_, offset) => {
    const index = offset + 1
    const span = lowbit(index)
    const start = index - span + 1
    const target = createRangeBlock(
      blocks,
      "steptrace__fenwick-block",
      String(index),
      start,
      index,
      levels - Math.log2(span),
    )
    return { ...target, start, index }
  })

  const valuesLabel = el("div", "steptrace__rail-label steptrace__fenwick-values-label")
  valuesLabel.textContent = "Values"
  const valuesWrap = el("div", "steptrace__fenwick-values")
  const valuesBoard = createIndexedBoard(valuesWrap, values.length, "One-based source values")
  shell.stage.append(blocksLabel, blocks, valuesLabel, valuesWrap)

  const options = values.map((_, index) => String(index + 1))
  const updateIndex = shell.select("Point update index", "Index", options, "5")
  const delta = shell.input("Delta to add", "Delta", 6)
  const update = shell.button("Add delta", true)
  const rangeStart = shell.select("Range start", "From", options, "3")
  const rangeEnd = shell.select("Range end", "To", options, "7")
  const query = shell.button("Range sum")
  const reset = shell.button("Reset")
  shell.controls.append(updateIndex, delta, update, rangeStart, rangeEnd, query, reset)

  function paint(message = "") {
    valuesBoard.paint(
      values.map((value, offset) => {
        const index = offset + 1
        return {
          value: String(value),
          label: String(index),
          active: activeRange != null && index >= activeRange[0] && index <= activeRange[1],
          changed: activeIndex === index,
          ariaLabel: `value ${index}, ${value}`,
        }
      }),
    )
    blockNodes.forEach(({ block, operation, value, start, index }) => {
      const role = roles.get(index) ?? "idle"
      paintRangeBlock({ block, operation, value }, tree[index], role)
      block.setAttribute(
        "aria-label",
        `BIT slot ${index}, value ${tree[index]}, summarizes source values ${start} through ${index}${
          role === "idle" ? "" : `, active ${role.replace("-", " ")} path`
        }`,
      )
    })
    shell.setCounter(String(values.length), " values")
    shell.status.textContent =
      message || "Add a delta to one value, or query a range to see which stored blocks compose it."
  }

  function onUpdate() {
    const index = Number(updateIndex.value)
    const parsed =
      delta.value.trim() === "" ? Math.floor(Math.random() * 9) + 1 : Number(delta.value)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      shell.status.textContent = "Delta must be a finite integer."
      return
    }
    const path = updatePath(index, values.length)
    values[index - 1] += parsed
    for (const slot of path) tree[slot] += parsed
    activeIndex = index
    activeRange = null
    roles = new Map(path.map((slot) => [slot, "update"]))
    delta.value = ""
    paint(
      `Added ${parsed} at value[${index}]; updated ${path
        .map((slot) => `BIT[${slot}]`)
        .join(" → ")}.`,
    )
  }

  function onQuery() {
    let left = Number(rangeStart.value)
    let right = Number(rangeEnd.value)
    if (left > right) [left, right] = [right, left]
    rangeStart.value = String(left)
    rangeEnd.value = String(right)
    const rightPath = prefixPath(right)
    const leftPath = prefixPath(left - 1)
    const rightSum = sumPath(tree, rightPath)
    const leftSum = sumPath(tree, leftPath)
    const leftSlots = new Set(leftPath)
    const rightSlots = new Set(rightPath)
    roles = new Map(
      [...new Set([...leftPath, ...rightPath])].map((slot) => [
        slot,
        leftSlots.has(slot) && rightSlots.has(slot)
          ? "cancelled"
          : rightSlots.has(slot)
            ? "prefix-right"
            : "prefix-left",
      ]),
    )
    activeIndex = null
    activeRange = [left, right]
    paint(
      `Sum [${left}..${right}] = Prefix(${right}) ${rightSum} − Prefix(${left - 1}) ${leftSum} = ${
        rightSum - leftSum
      }.`,
    )
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    tree.splice(0, tree.length, ...buildFenwick(values))
    activeIndex = null
    activeRange = null
    roles = new Map()
    updateIndex.value = "5"
    rangeStart.value = "3"
    rangeEnd.value = "7"
    delta.value = ""
    paint("Reset source values and every stored Fenwick aggregate.")
  }

  shell.listen(update, "click", onUpdate)
  shell.listen(query, "click", onQuery)
  shell.listen(reset, "click", onReset)
  shell.listen(updateIndex, "change", (() => paint()) as EventListener)
  shell.listen(rangeStart, "change", (() => paint()) as EventListener)
  shell.listen(rangeEnd, "change", (() => paint()) as EventListener)
  onEnter(shell, delta, onUpdate)
  paint()
  return shell.finish()
}

interface SegmentNode {
  index: number
  start: number
  end: number
  level: number
  left: SegmentNode | null
  right: SegmentNode | null
}

function buildSegmentShape(start: number, end: number, index = 1, level = 1): SegmentNode {
  if (start === end) return { index, start, end, level, left: null, right: null }
  const middle = Math.floor((start + end) / 2)
  return {
    index,
    start,
    end,
    level,
    left: buildSegmentShape(start, middle, index * 2, level + 1),
    right: buildSegmentShape(middle + 1, end, index * 2 + 1, level + 1),
  }
}

function flattenSegment(node: SegmentNode): SegmentNode[] {
  return [
    node,
    ...(node.left ? flattenSegment(node.left) : []),
    ...(node.right ? flattenSegment(node.right) : []),
  ]
}

function rangeTotal(values: readonly number[], start: number, end: number) {
  let total = 0
  for (let index = start; index <= end; index++) total += values[index - 1]
  return total
}

function coverRange(node: SegmentNode, start: number, end: number, result: SegmentNode[]) {
  if (end < node.start || node.end < start) return
  if (start <= node.start && node.end <= end) {
    result.push(node)
    return
  }
  if (node.left) coverRange(node.left, start, end, result)
  if (node.right) coverRange(node.right, start, end, result)
}

export function mountSegmentTree(root: HTMLElement, config: SegmentTreeConfig): MountHandle {
  const shell = createStructureShell(
    root,
    "segment-tree",
    "segment tree",
    "Interactive segment tree with point assignment and range-sum queries",
    "range-aggregate",
    "steptrace__range-aggregate steptrace__segment",
  )
  const initial = [...config.values]
  const values = [...initial]
  const shape = buildSegmentShape(1, values.length)
  const nodes = flattenSegment(shape)
  let roles = new Map<number, BlockRole>()
  let activeIndex: number | null = null
  let activeRange: [number, number] | null = null

  const treeLabel = el("div", "steptrace__rail-label")
  treeLabel.textContent = "Interval tree"
  const blocks = el("div", "steptrace__segment-blocks")
  blocks.style.setProperty("--steptrace-range-size", String(values.length))
  blocks.style.setProperty(
    "--steptrace-range-levels",
    String(Math.ceil(Math.log2(values.length)) + 1),
  )
  blocks.setAttribute("role", "list")
  blocks.setAttribute("aria-label", "Segment tree interval aggregates")
  const blockNodes = nodes.map((node) => ({
    node,
    target: createRangeBlock(
      blocks,
      "steptrace__segment-block",
      "Σ",
      node.start,
      node.end,
      node.level,
    ),
  }))

  const valuesLabel = el("div", "steptrace__rail-label steptrace__segment-values-label")
  valuesLabel.textContent = "Values"
  const valuesWrap = el("div", "steptrace__segment-values")
  const valuesBoard = createIndexedBoard(valuesWrap, values.length, "One-based source values")
  shell.stage.append(treeLabel, blocks, valuesLabel, valuesWrap)

  const options = values.map((_, index) => String(index + 1))
  const updateIndex = shell.select("Point update index", "Index", options, "4")
  const updateValue = shell.input("New value", "Value", 6)
  const update = shell.button("Set value", true)
  const rangeStart = shell.select("Range start", "From", options, "3")
  const rangeEnd = shell.select("Range end", "To", options, "7")
  const query = shell.button("Range sum")
  const reset = shell.button("Reset")
  shell.controls.append(updateIndex, updateValue, update, rangeStart, rangeEnd, query, reset)

  function paint(message = "") {
    valuesBoard.paint(
      values.map((value, offset) => {
        const index = offset + 1
        return {
          value: String(value),
          label: String(index),
          active: activeRange != null && index >= activeRange[0] && index <= activeRange[1],
          changed: activeIndex === index,
          ariaLabel: `value ${index}, ${value}`,
        }
      }),
    )
    for (const { node, target } of blockNodes) {
      const role = roles.get(node.index) ?? "idle"
      const value = rangeTotal(values, node.start, node.end)
      paintRangeBlock(target, value, role)
      target.block.setAttribute(
        "aria-label",
        `segment ${node.start} through ${node.end}, sum ${value}${
          role === "idle" ? "" : `, active ${role} path`
        }`,
      )
    }
    shell.setCounter(String(values.length), " values")
    shell.status.textContent =
      message || "Set one source value, or query a range to reveal its canonical covering nodes."
  }

  function onUpdate() {
    const index = Number(updateIndex.value)
    const parsed =
      updateValue.value.trim() === ""
        ? Math.floor(Math.random() * 20) + 1
        : Number(updateValue.value)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      shell.status.textContent = "Value must be a finite integer."
      return
    }
    const before = values[index - 1]
    values[index - 1] = parsed
    roles = new Map(
      nodes
        .filter((node) => node.start <= index && index <= node.end)
        .map((node) => [node.index, "update"]),
    )
    activeIndex = index
    activeRange = null
    updateValue.value = ""
    paint(`Set value[${index}] from ${before} to ${parsed}; recomputed its path to the root.`)
  }

  function onQuery() {
    let left = Number(rangeStart.value)
    let right = Number(rangeEnd.value)
    if (left > right) [left, right] = [right, left]
    rangeStart.value = String(left)
    rangeEnd.value = String(right)
    const cover: SegmentNode[] = []
    coverRange(shape, left, right, cover)
    roles = new Map(cover.map((node) => [node.index, "query"]))
    activeIndex = null
    activeRange = [left, right]
    const parts = cover.map(
      (node) =>
        `${node.start === node.end ? `[${node.start}]` : `[${node.start}..${node.end}]`} ${rangeTotal(
          values,
          node.start,
          node.end,
        )}`,
    )
    paint(`Sum [${left}..${right}] = ${parts.join(" + ")} = ${rangeTotal(values, left, right)}.`)
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    roles = new Map()
    activeIndex = null
    activeRange = null
    updateIndex.value = "4"
    rangeStart.value = "3"
    rangeEnd.value = "7"
    updateValue.value = ""
    paint("Reset source values and every segment aggregate.")
  }

  shell.listen(update, "click", onUpdate)
  shell.listen(query, "click", onQuery)
  shell.listen(reset, "click", onReset)
  onEnter(shell, updateValue, onUpdate)
  paint()
  return shell.finish()
}
