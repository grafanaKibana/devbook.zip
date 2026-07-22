import { ExecutionTreeRecorder } from "../recorders"
import { makeExecutionTreeView, type ExecutionTreeViewDescriptor } from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily } from "../types"

export type ExecutionTreeState =
  "call" | "split" | "base" | "return" | "combine" | "store" | "cache" | "prune"

export interface ExecutionTreeConfig {
  array?: number[]
  profile:
    | "divide-and-conquer"
    | "merge-sort"
    | "memoization"
    | "coin-change-top-down"
    | "grid-path-top-down"
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
  type: "tree" | "split" | "base" | "return" | "combine" | "store" | "cache" | "prune" | "done"
  profile: ExecutionTreeConfig["profile"]
  phase: "divide" | "conquer" | "return" | "combine" | "cache" | "complete"
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
  store(
    id: string,
    path: string[],
    key: string,
    result: readonly number[] | string,
    message: string,
  ): void
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

export function parseMemoizationConfig(config: StepTraceConfig): ExecutionTreeConfig {
  if (config.array !== undefined || config.n !== undefined)
    throw new Error("steptrace: memoization animates abstract states and takes no data input.")
  return { profile: "memoization" }
}

const stateLabels: Record<ExecutionTreeState, string> = {
  call: "call",
  split: "split",
  base: "base",
  return: "return",
  combine: "combine",
  store: "stored",
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

export const executionTreeCardMetrics = {
  shape: "card",
  nodeWidth: 84,
  nodeHeight: 40,
  minSvgWidth: 500,
  canvasScale: 0.84,
} as const

export const executionTreeViewDescriptor: ExecutionTreeViewDescriptor = {
  ariaLabel: "Execution tree",
  ...executionTreeCardMetrics,
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
    const subproblemLabel = frame.profile === "merge-sort" ? "subarray" : "subproblem"
    const pathLabelName = frame.profile === "merge-sort" ? "split path" : "call path"
    const resultLabel = Array.isArray(result) ? `[${result.join(", ")}]` : result || "—"
    return [
      { k: "phase", v: frame.phase, sw: "var(--_violet)" },
      {
        k: subproblemLabel,
        v: node ? `${node.label} · ${node.detail || `[${node.values.join(", ")}]`}` : "—",
        sw: "var(--_blue)",
      },
      { k: pathLabelName, v: pathLabel(frame), sw: "var(--_neutral)" },
      { k: "result", v: resultLabel, sw: "var(--_green)" },
    ]
  },
}

export const memoizationTreeViewDescriptor: ExecutionTreeViewDescriptor = {
  ariaLabel: "Memoization call tree",
  ...executionTreeCardMetrics,
  stateLabels,
  legend: [
    { state: "split", label: "expand new state" },
    { state: "base", label: "base result" },
    { state: "store", label: "store first result" },
    { state: "cache", label: "cache hit; skip branch" },
  ],
  frameModel,
  nodeLines(node: ExecutionTreeNode) {
    return [node.label, node.detail || ""]
  },
  watchRows(frame: ExecutionTreeFrame) {
    const node = activeNode(frame)
    const cached = frame.cache.map((entry) => `${entry.key} → ${entry.result}`).join(" · ")
    return [
      {
        k: "phase",
        v: frame.phase,
        sw: "var(--_violet)",
        hint: "Whether the trace is expanding, solving, storing, or reusing a state.",
      },
      {
        k: "state",
        v: node ? `${node.label} · ${node.detail || "no cache key"}` : "—",
        sw: "var(--_blue)",
        hint: "The active recursive state and the key used to recognize repeats.",
      },
      {
        k: "cache",
        v: cached || "empty",
        sw: "var(--_green)",
        hint: "Results already computed once and available for immediate reuse.",
      },
      {
        k: "work",
        v: `${frame.calls} calls · ${frame.pruned} skipped`,
        sw: "var(--_neutral)",
        hint: "Calls entered so far and recursive calls avoided by cache hits.",
      },
    ]
  },
}

export const dynamicProgrammingTreeViewDescriptor: ExecutionTreeViewDescriptor = {
  ariaLabel: "Top-down dynamic-programming recursion tree",
  ...executionTreeCardMetrics,
  nodeWidth: 92,
  nodeHeight: 44,
  minSvgWidth: 500,
  canvasScale: 1,
  fitWidth: true,
  stateLabels,
  legend: [
    { state: "split", label: "expand uncached state" },
    { state: "base", label: "base case" },
    { state: "store", label: "store result" },
    { state: "cache", label: "reuse cached result" },
  ],
  frameModel,
  nodeLines(node: ExecutionTreeNode) {
    return [node.label, node.detail || ""]
  },
  watchRows(frame: ExecutionTreeFrame) {
    const node = activeNode(frame)
    const cached = frame.cache.map((entry) => `${entry.key} → ${entry.result}`).join(" · ")
    return [
      {
        k: "phase",
        v: frame.phase,
        sw: "var(--_violet)",
        hint: "Whether recursion is expanding a new state, storing it, or reusing it.",
      },
      {
        k: "state",
        v: node ? node.label : "—",
        sw: "var(--_blue)",
        hint: "The amount or warehouse coordinate currently being solved.",
      },
      {
        k: "memo",
        v: cached || "empty",
        sw: "var(--_green)",
        hint: "Answers already computed once and available for immediate reuse.",
      },
      {
        k: "work",
        v: `${frame.calls} calls · ${frame.pruned} skipped`,
        sw: "var(--_neutral)",
        hint: "Recursive calls entered and child calls avoided by cache hits.",
      },
    ]
  },
}

export const executionTreeFamily = {
  id: "execution-tree",
  createRecorder(config) {
    return new ExecutionTreeRecorder(config) as ExecutionTreeRecorder & ExecutionTreeOperations
  },
  createView(frames) {
    const profile = frames[0]?.profile
    const descriptor =
      profile === "memoization"
        ? memoizationTreeViewDescriptor
        : profile === "coin-change-top-down" || profile === "grid-path-top-down"
          ? dynamicProgrammingTreeViewDescriptor
          : executionTreeViewDescriptor
    return makeExecutionTreeView(frames, descriptor) as StepTraceView<ExecutionTreeFrame>
  },
} satisfies VisualFamily<ExecutionTreeConfig, ExecutionTreeRecorder, ExecutionTreeFrame>
