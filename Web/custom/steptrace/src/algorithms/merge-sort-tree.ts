import { executionTreeFamily } from "../families/execution-tree"
import type {
  ExecutionTreeConfig,
  ExecutionTreeNode,
  ExecutionTreeOperations,
} from "../families/execution-tree"
import type { ExecutionTreeFrame } from "../families/execution-tree"
import type { ExecutionTreeRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

type MergeSortTreeFrame = ExecutionTreeFrame

interface TreeMeta {
  id: string
  label: string
  values: number[]
  path: string[]
  depth: number
  from: number
  to: number
  children: [string, string] | null
  sorted: number[]
}

function merge(left: number[], right: number[]) {
  const output: number[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    output.push(left[i] <= right[j] ? left[i++] : right[j++])
  }
  while (i < left.length) output.push(left[i++])
  while (j < right.length) output.push(right[j++])
  return output
}

function buildTree(
  values: number[],
  from: number,
  to: number,
  depth: number,
  id: string,
  path: string[],
  nodes: ExecutionTreeNode[],
  edges: Array<{ from: string; to: string }>,
  metas: Map<string, TreeMeta>,
): TreeMeta {
  const segment = values.slice(from, to)
  const label = segment.length ? `[${from}\u2026${to - 1}]` : "[]"
  const detail = segment.join("  ")
  const widestValue = Math.max(...segment.map((value) => String(value).length))
  const cellWidth = Math.max(28, widestValue * 6.2 + 16)
  nodes.push({
    id,
    label,
    values: segment,
    detail,
    width: Math.max(40, segment.length * cellWidth, label.length * 5 + 20),
    x: ((from + to - 1) / 2) * 54,
    y: 30 + depth * 72,
    depth,
  })

  const meta: TreeMeta = {
    id,
    label,
    values: segment,
    path,
    depth,
    from,
    to,
    children: null,
    sorted: segment.slice(),
  }
  metas.set(id, meta)

  if (segment.length <= 1) return meta

  const mid = Math.floor((from + to) / 2)
  const leftId = `${id}-l`
  const rightId = `${id}-r`

  edges.push({ from: id, to: leftId }, { from: id, to: rightId })

  const leftMeta = buildTree(
    values,
    from,
    mid,
    depth + 1,
    leftId,
    [...path, leftId],
    nodes,
    edges,
    metas,
  )
  const rightMeta = buildTree(
    values,
    mid,
    to,
    depth + 1,
    rightId,
    [...path, rightId],
    nodes,
    edges,
    metas,
  )
  meta.children = [leftMeta.id, rightMeta.id]
  return meta
}

function revealSplits(
  id: string,
  metas: Map<string, TreeMeta>,
  ops: ExecutionTreeRecorder & ExecutionTreeOperations,
) {
  const node = metas.get(id)
  if (!node) return
  const label = node.values.length ? `[${node.from}\u2026${node.to - 1}]` : "[]"

  if (node.values.length <= 1) {
    const text = node.values.length ? `[${node.values[0]}]` : "[]"
    ops.base(id, node.path, node.values, `${text} is already sorted.`)
    return
  }

  const [leftId, rightId] = node.children || []
  const left = metas.get(leftId)
  const right = metas.get(rightId)
  if (!left || !right) return

  ops.split(
    id,
    node.path,
    [leftId, rightId],
    `Split ${label} into ${left.label} and ${right.label}.`,
  )
  revealSplits(leftId, metas, ops)
  revealSplits(rightId, metas, ops)
}

function mergeBottomUp(
  metas: Map<string, TreeMeta>,
  ops: ExecutionTreeRecorder & ExecutionTreeOperations,
) {
  const internalNodes = [...metas.values()]
    .filter((node) => node.children)
    .sort((a, b) => b.depth - a.depth || a.from - b.from)

  for (const node of internalNodes) {
    const [leftId, rightId] = node.children || []
    const left = metas.get(leftId)
    const right = metas.get(rightId)
    if (!left || !right) continue
    node.sorted = merge(left.sorted, right.sorted)
    ops.combine(
      node.id,
      node.path,
      node.sorted,
      `Merge [${left.sorted.join(", ")}] and [${right.sorted.join(", ")}] into [${node.sorted.join(", ")}].`,
    )
  }
}

export function parseMergeSortTreeConfig(config: StepTraceConfig) {
  if (!Array.isArray(config.array) || config.array.length < 2)
    throw new Error('steptrace: merge-sort-tree requires an "array" with at least two values.')
  if (!config.array.every((value) => typeof value === "number" && Number.isFinite(value)))
    throw new Error("steptrace: merge-sort-tree requires finite numeric values.")

  return {
    array: config.array.slice(),
    profile: "merge-sort",
  } satisfies ExecutionTreeConfig
}

export const mergeSortTree = {
  id: "merge-sort-tree",
  kind: "rectree",
  family: executionTreeFamily,
  meta: { label: "Merge sort (split tree)" },
  parse: parseMergeSortTreeConfig,
  run(input, ops) {
    const values = input.array.slice()
    const nodes: ExecutionTreeNode[] = []
    const edges: Array<{ from: string; to: string }> = []
    const metas = new Map<string, TreeMeta>()

    const rootId = "root"
    const rootMeta = buildTree(values, 0, values.length, 0, rootId, [rootId], nodes, edges, metas)
    rootMeta.from = 0
    rootMeta.to = values.length
    rootMeta.values = values.slice()
    nodes[0].label = `[0…${values.length - 1}]`

    const message = `Merge sort ${values.join(", ")}: split halves, then merge them sorted on return.`
    ops.tree(nodes, edges, rootId, message)
    revealSplits(rootId, metas, ops)
    mergeBottomUp(metas, ops)
    ops.done(rootId, rootMeta.sorted, `Sorted result [${rootMeta.sorted.join(", ")}].`)
  },
} satisfies FamilyAlgorithmDefinition<
  "rectree",
  ExecutionTreeConfig,
  ExecutionTreeRecorder & ExecutionTreeOperations,
  MergeSortTreeFrame
>
