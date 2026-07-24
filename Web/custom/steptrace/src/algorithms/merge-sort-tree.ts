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
  from: number
  to: number
  children: [string, string] | null
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
  x: number,
  y: number,
  id: string,
  nodes: ExecutionTreeNode[],
  edges: Array<{ from: string; to: string }>,
  metas: Map<string, TreeMeta>,
): TreeMeta {
  const segment = values.slice(from, to)
  const label = segment.length ? `[${from}\u2026${to - 1}]` : "[]"
  nodes.push({
    id,
    label,
    values: segment,
    x,
    y,
    depth,
  })

  const meta: TreeMeta = {
    id,
    label,
    values: segment,
    from,
    to,
    children: null,
  }
  metas.set(id, meta)

  if (segment.length <= 1) return meta

  const mid = Math.floor((from + to) / 2)
  const leftId = `${id}-l`
  const rightId = `${id}-r`

  edges.push({ from: id, to: leftId }, { from: id, to: rightId })

  const span = Math.max(1, values.length - 1)
  const childShift = (span - depth * 0.6 + 1) * 20

  const leftMeta = buildTree(values, from, mid, depth + 1, x - childShift, y + 90, leftId, nodes, edges, metas)
  const rightMeta = buildTree(values, mid, to, depth + 1, x + childShift, y + 90, rightId, nodes, edges, metas)
  meta.children = [leftMeta.id, rightMeta.id]
  return meta
}

function emitFrames(
  id: string,
  path: string[],
  metas: Map<string, TreeMeta>,
  ops: ExecutionTreeRecorder & ExecutionTreeOperations,
) {
  const node = metas.get(id)
  if (!node) return []
  const label = node.values.length ? `[${node.from}\u2026${node.to - 1}]` : "[]"

  if (node.values.length <= 1) {
    const text = node.values.length ? `[${node.values[0]}]` : "[]"
    ops.base(id, path, node.values, `${text} is already sorted.`)
    return node.values.slice()
  }

  const [leftId, rightId] = node.children || []
  const left = metas.get(leftId)
  const right = metas.get(rightId)
  if (!left || !right) return node.values.slice()

  ops.split(id, path, [leftId, rightId], `Split ${label} into ${left.label} and ${right.label}.`)

  const leftPath = [...path, leftId]
  const rightPath = [...path, rightId]
  const leftResult = emitFrames(leftId, leftPath, metas, ops)
  ops.returnResult(leftId, path, leftResult, `Return [${leftResult.join(", ")}] to ${label}.`)
  const rightResult = emitFrames(rightId, rightPath, metas, ops)
  ops.returnResult(rightId, path, rightResult, `Return [${rightResult.join(", ")}] to ${label}.`)

  const merged = merge(leftResult, rightResult)
  const combinePath = path.length > 1 ? path.slice(0, -1) : path
  ops.combine(id, combinePath, merged, `Merge ${left.label} and ${right.label} into [${merged.join(", ")}].`)
  if (path.length > 1) {
    ops.returnResult(id, combinePath, merged, `Return [${merged.join(", ")}] to parent call.`)
  }
  return merged
}

export function parseMergeSortTreeConfig(config: StepTraceConfig) {
  if (!Array.isArray(config.array) || config.array.length < 2)
    throw new Error('steptrace: merge-sort-tree requires an "array" with at least two values.')
  if (!config.array.every((value) => typeof value === "number" && Number.isFinite(value)))
    throw new Error("steptrace: merge-sort-tree requires finite numeric values.")

  return {
    array: config.array.slice(),
    profile: "divide-and-conquer",
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
    const rootMeta = buildTree(
      values,
      0,
      values.length,
      0,
      Math.max(1, values.length - 1) * 72,
      30,
      rootId,
      nodes,
      edges,
      metas,
    )
    rootMeta.from = 0
    rootMeta.to = values.length
    rootMeta.values = values.slice()
    nodes[0].label = `[0…${values.length - 1}]`

    const message = `Merge sort ${values.join(", ")} by splitting into halves and merging sorted halves on return.`
    ops.tree(nodes, edges, rootId, message)
    emitFrames(rootId, [rootId], metas, ops)
    ops.done(rootId, values.slice().sort((a, b) => a - b), `Sorted result [${values.sort((a, b) => a - b).join(", ")}].`)
  },
} satisfies
  FamilyAlgorithmDefinition<
    "rectree",
    ExecutionTreeConfig,
    ExecutionTreeRecorder & ExecutionTreeOperations,
    MergeSortTreeFrame
  >
