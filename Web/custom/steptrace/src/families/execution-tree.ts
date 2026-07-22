import { ExecutionTreeRecorder } from "../recorders"
import { makeExecutionTreeView, type ExecutionTreeViewDescriptor } from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily } from "../types"

export type ExecutionTreeState =
  "call" | "split" | "base" | "return" | "combine" | "cache" | "prune"

export interface ExecutionTreeConfig {
  array?: number[]
  profile: "divide-and-conquer"
}

export interface ExecutionTreeNode {
  id: string
  label: string
  values: number[]
  detail?: string
  x: number
  y: number
  depth: number
}

export interface ExecutionTreeEdge {
  from: string
  to: string
}

export interface ExecutionTreeFrame {
  type: "tree" | "split" | "base" | "return" | "combine" | "cache" | "prune" | "done"
  profile: ExecutionTreeConfig["profile"]
  phase: "divide" | "conquer" | "return" | "combine" | "complete"
  action: string
  nodes: readonly ExecutionTreeNode[]
  edges: readonly ExecutionTreeEdge[]
  active: string | null
  path: readonly string[]
  visible: readonly string[]
  states: Readonly<Record<string, ExecutionTreeState>>
  results: Readonly<Record<string, readonly number[] | string>>
  collapsed: readonly string[]
  cache: ReadonlyArray<Readonly<{ key: string; result: string }>>
  calls: number
  pruned: number
  message: string
}

export interface ExecutionTreeOperations {
  tree(
    nodes: ExecutionTreeNode[],
    edges: ExecutionTreeEdge[],
    rootId: string,
    message: string,
  ): void
  split(id: string, path: string[], childIds: string[], message: string): void
  base(id: string, path: string[], result: readonly number[] | string, message: string): void
  returnResult(
    id: string,
    path: string[],
    result: readonly number[] | string,
    message: string,
  ): void
  combine(id: string, path: string[], result: readonly number[] | string, message: string): void
  cacheHit(
    id: string,
    path: string[],
    key: string,
    result: readonly number[] | string,
    subtreeIds: string[],
    message: string,
  ): void
  prune(id: string, path: string[], subtreeIds: string[], message: string): void
  done(rootId: string, result: readonly number[] | string, message: string): void
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: divide-and-conquer ${message}`)
}

export function parseExecutionTreeConfig(config: StepTraceConfig): ExecutionTreeConfig {
  if (config.array !== undefined)
    invalidConfig('does not take an "array"; it animates the paradigm itself.')
  return { profile: "divide-and-conquer" }
}

const stateLabels: Record<ExecutionTreeState, string> = {
  call: "call",
  split: "split",
  base: "base",
  return: "return",
  combine: "combine",
  cache: "cached",
  prune: "pruned",
}

function frameModel(frame: ExecutionTreeFrame) {
  return {
    phase: frame.phase,
    action: frame.action,
    active: frame.active,
    path: frame.path.slice(),
    visible: frame.visible.slice(),
    states: frame.states,
    results: frame.results,
    collapsed: frame.collapsed.slice(),
  }
}

function activeNode(frame: ExecutionTreeFrame) {
  return frame.nodes.find((node) => node.id === frame.active) || null
}

function pathLabel(frame: ExecutionTreeFrame) {
  const labels = frame.path
    .map((id) => frame.nodes.find((node) => node.id === id)?.label)
    .filter(Boolean)
  return labels.length ? labels.join(" → ") : "—"
}

export const executionTreeViewDescriptor: ExecutionTreeViewDescriptor = {
  ariaLabel: "Execution tree",
  shape: "card",
  nodeWidth: 100,
  nodeHeight: 48,
  minSvgWidth: 560,
  stateLabels,
  legend: [
    { state: "split", label: "split subproblem" },
    { state: "base", label: "base case" },
    { state: "return", label: "returned result" },
    { state: "combine", label: "combined result" },
  ],
  frameModel,
  nodeLines(node: ExecutionTreeNode) {
    return [node.label, node.detail || `[${node.values.join(", ")}]`]
  },
  watchRows(frame: ExecutionTreeFrame) {
    const node = activeNode(frame)
    const result = node ? frame.results[node.id] : null
    const resultLabel = Array.isArray(result) ? `[${result.join(", ")}]` : result || "—"
    return [
      { k: "phase", v: frame.phase, sw: "var(--_violet)" },
      {
        k: "subproblem",
        v: node ? `${node.label} · ${node.detail || `[${node.values.join(", ")}]`}` : "—",
        sw: "var(--_blue)",
      },
      { k: "call path", v: pathLabel(frame), sw: "var(--_neutral)" },
      { k: "result", v: resultLabel, sw: "var(--_green)" },
    ]
  },
}

export const executionTreeFamily = {
  id: "execution-tree",
  createRecorder(config) {
    return new ExecutionTreeRecorder(config) as ExecutionTreeRecorder & ExecutionTreeOperations
  },
  createView(frames) {
    return makeExecutionTreeView(
      frames,
      executionTreeViewDescriptor,
    ) as StepTraceView<ExecutionTreeFrame>
  },
} satisfies VisualFamily<ExecutionTreeConfig, ExecutionTreeRecorder, ExecutionTreeFrame>
