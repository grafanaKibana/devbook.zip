import { DPRecorder, MatrixGridRecorder } from "../recorders"
import {
  makeDPView,
  makeExecutionTreeView,
  type ExecutionTreeViewDescriptor,
  type MatrixGridFooterModel,
  type MatrixGridRoleDescriptor,
  type MatrixGridViewSemantics,
} from "../render"
import { executionTreeCardMetrics } from "./execution-tree"
import type { StepTraceConfig, StepTraceView, VisualFamily } from "../types"

export interface MatrixGridConfig {
  nodes: number[]
  edges: Array<[number, number, number]>
  profile: "floyd-warshall"
}

export interface MatrixGridFrame {
  type: "init" | "stage" | "relax" | "negative-cycle" | "done"
  profile: MatrixGridConfig["profile"]
  rowLabels: string[]
  colLabels: string[]
  grid: Array<Array<number | null>>
  cur: [number, number] | null
  deps: Array<[number, number]>
  k: number | null
  candidate: number | null
  decision: "improve" | "keep" | null
  previous: number | null
  result: number | null
  operandA: number | null
  operandB: number | null
  negativeCycle: number[]
  message: string
}

export interface DynamicProgrammingConfig {
  profile: "dynamic-programming"
  variant: "abstract" | "concrete"
}

interface DynamicProgrammingNode {
  id: string
  label: string
  detail: string
  x: number
  y: number
  depth: number
}

interface DynamicProgrammingEdge {
  from: string
  to: string
}

export interface DynamicProgrammingFrame {
  type: "init" | "compute" | "trace" | "done"
  profile: DynamicProgrammingConfig["profile"]
  variant: DynamicProgrammingConfig["variant"]
  rowLabels: string[]
  colLabels: string[]
  grid: Array<Array<string | null>>
  cur: [number, number] | null
  deps: Array<[number, number]>
  path: Array<[number, number]>
  nodes: DynamicProgrammingNode[]
  edges: DynamicProgrammingEdge[]
  formula: string | null
  message: string
}

export interface DynamicProgrammingOperations {
  board(
    rowLabels: string[],
    colLabels: string[],
    message: string,
    topology?: { nodes: DynamicProgrammingNode[]; edges: DynamicProgrammingEdge[] },
  ): void
  set(
    row: number,
    column: number,
    value: string,
    dependencies: Array<[number, number]>,
    message: string,
    formula?: string,
  ): void
  done(message: string): void
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: floyd-warshall ${message}`)
}

export function parseMatrixGridConfig(config: StepTraceConfig): MatrixGridConfig {
  const { nodes, edges } = config
  if (!Array.isArray(nodes) || nodes.length === 0)
    invalidConfig('requires a non-empty numeric "nodes" array.')
  if (!nodes.every((node) => typeof node === "number" && Number.isFinite(node)))
    invalidConfig('requires every "nodes" entry to be a finite number.')
  if (new Set(nodes).size !== nodes.length) invalidConfig('requires unique "nodes" entries.')
  if (!Array.isArray(edges))
    invalidConfig('requires an "edges" array of [from, to, weight] tuples.')

  const knownNodes = new Set(nodes)
  const parsedEdges = edges.map((edge, index) => {
    if (
      !Array.isArray(edge) ||
      edge.length !== 3 ||
      !edge.every((value) => typeof value === "number" && Number.isFinite(value))
    ) {
      invalidConfig(`requires edge ${index} to be a finite [from, to, weight] tuple.`)
    }
    const [from, to, weight] = edge
    if (!knownNodes.has(from) || !knownNodes.has(to))
      invalidConfig(`requires edge ${index} to reference nodes declared in "nodes".`)
    return [from, to, weight] as [number, number, number]
  })

  return { nodes: nodes.slice() as number[], edges: parsedEdges, profile: "floyd-warshall" }
}

export function parseDynamicProgrammingConfig(config: StepTraceConfig): DynamicProgrammingConfig {
  if (config.array !== undefined || config.a !== undefined || config.b !== undefined)
    throw new Error("steptrace: dynamic-programming uses its built-in comparison examples.")
  const variant = config.variant || "abstract"
  if (variant !== "abstract" && variant !== "concrete")
    throw new Error('steptrace: dynamic-programming "variant" must be "abstract" or "concrete".')
  return { profile: "dynamic-programming", variant }
}

function formatDistance(value: number | null) {
  return value == null ? "∞" : String(value)
}

function distanceLabel(frame: MatrixGridFrame, cell: [number, number]) {
  const [row, column] = cell
  return `dist[${frame.rowLabels[row]}][${frame.colLabels[column]}] = ${formatDistance(frame.grid[row][column])}`
}

function stageIndex(frame: MatrixGridFrame) {
  return frame.k == null ? -1 : frame.rowLabels.indexOf(String(frame.k))
}

export function matrixGridRolesForCell(frame: MatrixGridFrame, row: number, column: number) {
  const roles: string[] = []
  const k = stageIndex(frame)
  if ((frame.type === "stage" || frame.type === "relax") && (row === k || column === k)) {
    roles.push("stage-axis")
  }
  if (frame.type === "relax") {
    if (frame.deps[0]?.[0] === row && frame.deps[0]?.[1] === column) roles.push("operand-a")
    if (frame.deps[1]?.[0] === row && frame.deps[1]?.[1] === column) roles.push("operand-b")
    if (frame.cur?.[0] === row && frame.cur?.[1] === column) roles.push("target")
  }
  if (
    frame.negativeCycle.includes(Number(frame.rowLabels[row])) &&
    frame.rowLabels[row] === frame.colLabels[column]
  ) {
    roles.push("negative-cycle")
  }
  return roles
}

export const matrixGridRoleLegend = [
  { role: "operand-a", badge: "A", label: "dist[i][k]" },
  { role: "operand-b", badge: "B", label: "dist[k][j]" },
  { role: "target", badge: "T", label: "dist[i][j]" },
  { role: "keep", badge: "K", label: "keep target" },
  { role: "write", badge: "W", label: "write target" },
  { role: "stage-axis", badge: "k", label: "active intermediate row/column" },
] satisfies readonly MatrixGridRoleDescriptor[]

export function matrixGridFooterModel(frame: MatrixGridFrame): MatrixGridFooterModel {
  const nodeCount = frame.rowLabels.length
  if (frame.negativeCycle.length) {
    return {
      context: "Negative cycle",
      summary: { text: "Cycle paths are unbounded" },
    }
  }
  if (frame.type === "init") {
    return {
      context: "Initialize distance matrix",
      summary: { text: "Seed diagonal, edges, and ∞" },
    }
  }
  if (frame.type === "stage") {
    return {
      context: `Stage k = ${frame.k}`,
      summary: { text: `Compare ${nodeCount * nodeCount} pairs through node ${frame.k}` },
    }
  }
  if (frame.type === "relax" && frame.cur) {
    const previous = formatDistance(frame.previous)
    const result = formatDistance(frame.result)
    return {
      context: `Stage k = ${frame.k}`,
      summary:
        frame.decision === "improve"
          ? { role: "write", text: `Write ${result} · ${previous} → ${result}` }
          : { role: "keep", text: `Keep ${previous} · via ${frame.k} is not shorter` },
    }
  }
  return {
    context: "All stages complete",
    summary: { text: `${nodeCount * nodeCount} distances ready` },
  }
}

export const matrixGridViewSemantics: MatrixGridViewSemantics = {
  tableLabel:
    "Floyd-Warshall distance matrix. Rows are source nodes and columns are destination nodes.",
  axisDescription: "Distance matrix: rows identify the from node and columns identify the to node.",
  cornerLabel: "from ↓ / to →",
  stageLayout: "fill",
  formatValue(value) {
    return formatDistance(value as number | null)
  },
  cellLabel(frame: MatrixGridFrame, row, column) {
    const base = distanceLabel(frame, [row, column])
    const roles = matrixGridRolesForCell(frame, row, column)
    if (!roles.includes("target"))
      return roles.length ? `${base}; roles: ${roles.join(", ")}` : base
    return `${base}; roles: ${roles.join(", ")}; previous ${formatDistance(frame.previous)}; candidate ${formatDistance(frame.candidate)}; decision ${frame.decision}; result ${formatDistance(frame.result)}`
  },
  stateForCell(frame: MatrixGridFrame, row, column) {
    if (frame.cur?.[0] === row && frame.cur?.[1] === column) return "cur"
    return frame.deps.some(([depRow, depColumn]) => depRow === row && depColumn === column)
      ? "dep"
      : ""
  },
  decisionForCell(frame: MatrixGridFrame, row, column) {
    return frame.cur?.[0] === row && frame.cur?.[1] === column ? frame.decision || "" : ""
  },
  rolesForCell: matrixGridRolesForCell,
  headerRole(frame: MatrixGridFrame, axis, index) {
    const k = stageIndex(frame)
    if ((frame.type !== "stage" && frame.type !== "relax") || index !== k) return ""
    return axis === "row" ? "stage-row" : "stage-column"
  },
  footerModel: matrixGridFooterModel,
  roleLegend: matrixGridRoleLegend,
  watchRows(frame: MatrixGridFrame) {
    const current = frame.cur
      ? `dist[${frame.rowLabels[frame.cur[0]]}][${frame.colLabels[frame.cur[1]]}] = ${formatDistance(frame.previous)} before this relaxation`
      : "—"
    const left = frame.deps[0]
      ? `dist[${frame.rowLabels[frame.deps[0][0]]}][${frame.colLabels[frame.deps[0][1]]}] = ${formatDistance(frame.operandA)}`
      : "—"
    const right = frame.deps[1]
      ? `dist[${frame.rowLabels[frame.deps[1][0]]}][${frame.colLabels[frame.deps[1][1]]}] = ${formatDistance(frame.operandB)}`
      : "—"
    const candidate =
      frame.candidate == null || !frame.deps[0] || !frame.deps[1]
        ? "—"
        : `${formatDistance(frame.operandA)} + ${formatDistance(frame.operandB)} = ${frame.candidate}`
    const rows = [
      { k: "stage k", v: frame.k == null ? "—" : String(frame.k), sw: "var(--_violet)" },
      { k: "dist[i][j]", v: current, sw: "var(--_blue)" },
      { k: "dist[i][k]", v: left, sw: "var(--_amber)" },
      { k: "dist[k][j]", v: right, sw: "var(--_amber)" },
      { k: "candidate", v: candidate, sw: "var(--_violet)" },
      {
        k: "decision",
        v:
          frame.decision === "improve"
            ? `write ${formatDistance(frame.previous)} → ${formatDistance(frame.result)}`
            : frame.decision === "keep"
              ? `keep ${formatDistance(frame.previous)}`
              : "—",
        sw: frame.decision === "improve" ? "var(--_green)" : "var(--_neutral)",
      },
    ]
    if (frame.negativeCycle.length) {
      rows.push({
        k: "negative cycle",
        v: frame.negativeCycle.join(", "),
        sw: "var(--_amber)",
      })
    }
    return rows
  },
}

export const matrixGridFamily = {
  id: "matrix-grid",
  createRecorder(config) {
    return new MatrixGridRecorder(config)
  },
  createView(frames) {
    return makeDPView(frames, matrixGridViewSemantics) as StepTraceView<MatrixGridFrame>
  },
} satisfies VisualFamily<MatrixGridConfig, MatrixGridRecorder, MatrixGridFrame>

const dynamicProgrammingRoles = [
  { role: "operand-a", badge: "A", label: "exclude current value" },
  { role: "operand-b", badge: "B", label: "include current value" },
  { role: "target", badge: "T", label: "prefix being solved" },
  { role: "stored", badge: "✓", label: "stored result" },
] satisfies readonly MatrixGridRoleDescriptor[]

function dynamicProgrammingRolesForCell(
  frame: DynamicProgrammingFrame,
  row: number,
  column: number,
) {
  const roles: string[] = []
  if (frame.grid[row][column] != null) roles.push("stored")
  if (frame.deps[0]?.[0] === row && frame.deps[0]?.[1] === column) roles.push("operand-a")
  if (frame.deps[1]?.[0] === row && frame.deps[1]?.[1] === column) roles.push("operand-b")
  if (frame.cur?.[0] === row && frame.cur?.[1] === column) roles.push("target")
  return roles
}

export const concreteDynamicProgrammingViewSemantics: MatrixGridViewSemantics = {
  tableLabel: "Maximum non-adjacent sum dynamic-programming table",
  axisDescription: "Each column stores the best total for a longer prefix of the input values.",
  cornerLabel: "prefix →",
  stageLayout: "fill",
  formatValue(value) {
    return value == null ? "—" : String(value)
  },
  cellLabel(frame: DynamicProgrammingFrame, row, column) {
    const value = frame.grid[row][column]
    const roles = dynamicProgrammingRolesForCell(frame, row, column)
    return `Prefix ${frame.colLabels[column]}: ${value ?? "not solved"}${roles.length ? `; roles: ${roles.join(", ")}` : ""}`
  },
  stateForCell(frame: DynamicProgrammingFrame, row, column) {
    if (frame.cur?.[0] === row && frame.cur?.[1] === column) return "cur"
    return frame.deps.some(([depRow, depColumn]) => depRow === row && depColumn === column)
      ? "dep"
      : ""
  },
  rolesForCell: dynamicProgrammingRolesForCell,
  footerModel(frame: DynamicProgrammingFrame) {
    if (frame.type === "init") {
      return {
        context: "Base prefix",
        summary: { text: "dp[0] = 0" },
      }
    }
    if (frame.type === "compute" && frame.cur) {
      const column = frame.cur[1]
      return {
        context: `Solve prefix ${frame.colLabels[column]}`,
        summary: {
          text: frame.formula || `Store ${frame.grid[0][column]}`,
        },
      }
    }
    return {
      context: "Best total",
      summary: { text: "dp[6] = 20" },
    }
  },
  roleLegend: dynamicProgrammingRoles,
  watchRows(frame: DynamicProgrammingFrame) {
    const currentColumn = frame.cur?.[1] ?? null
    const current = currentColumn == null ? "—" : frame.colLabels[currentColumn]
    const stored = frame.grid[0].filter((value) => value != null).length
    return [
      {
        k: "prefix",
        v: current,
        sw: "var(--_blue)",
        hint: "How many input values the current answer covers.",
      },
      {
        k: "recurrence",
        v: frame.formula || "—",
        sw: "var(--_amber)",
        hint: "The two valid choices: exclude the current value or include it and skip its neighbour.",
      },
      {
        k: "stored result",
        v: currentColumn == null ? "—" : frame.grid[0][currentColumn] || "—",
        sw: "var(--_green)",
        hint: "The best total for this prefix, stored for the next transitions.",
      },
      {
        k: "table",
        v: `${stored} / ${frame.colLabels.length} states ready`,
        sw: "var(--_neutral)",
        hint: "How much of the left-to-right table has been filled.",
      },
    ]
  },
}

export const dynamicProgrammingViewSemantics = concreteDynamicProgrammingViewSemantics

export const abstractDynamicProgrammingViewDescriptor: ExecutionTreeViewDescriptor = {
  ariaLabel: "Dynamic-programming dependency graph",
  ...executionTreeCardMetrics,
  stateLabels: {
    call: "pending",
    base: "base",
    store: "stored",
  },
  legend: [
    { state: "call", label: "waiting for dependencies" },
    { state: "base", label: "base state stored" },
    { state: "store", label: "dependent state stored" },
  ],
  frameModel(frame: DynamicProgrammingFrame) {
    const currentColumn = frame.cur?.[1] ?? null
    const active = currentColumn == null ? null : frame.colLabels[currentColumn]
    const results = Object.fromEntries(
      frame.colLabels.flatMap((label, column) => {
        const value = frame.grid[0][column]
        return value == null ? [] : [[label, value]]
      }),
    )
    const states = Object.fromEntries(
      frame.nodes.map((node) => {
        const column = frame.colLabels.indexOf(node.id)
        const solved = column >= 0 && frame.grid[0][column] != null
        const isBase = !frame.edges.some((edge) => edge.from === node.id)
        return [node.id, solved ? (isBase ? "base" : "store") : "call"]
      }),
    )
    const dependencies = frame.deps.map(([, column]) => frame.colLabels[column])
    return {
      phase:
        frame.type === "done" ? "Target ready" : active ? `Solve ${active}` : "Dependency graph",
      action: frame.message,
      active,
      path: active ? [active, ...dependencies] : [],
      visible: frame.nodes.map((node) => node.id),
      states,
      results,
      collapsed: [],
    }
  },
  nodeLines(node: DynamicProgrammingNode) {
    return [node.label, node.detail]
  },
  watchRows(frame: DynamicProgrammingFrame) {
    const currentColumn = frame.cur?.[1] ?? null
    const dependencies = frame.deps.map(([, column]) => frame.colLabels[column])
    const stored = frame.grid[0].filter((value) => value != null).length
    return [
      {
        k: "state",
        v: currentColumn == null ? "—" : frame.colLabels[currentColumn],
        sw: "var(--_blue)",
        hint: "The state currently becoming available.",
      },
      {
        k: "depends on",
        v: dependencies.length ? dependencies.join(" + ") : "base state",
        sw: "var(--_amber)",
        hint: "States that must already be stored before this state can be solved.",
      },
      {
        k: "stored result",
        v: currentColumn == null ? "—" : frame.grid[0][currentColumn] || "—",
        sw: "var(--_green)",
        hint: "The result written once and reused by every outgoing dependency.",
      },
      {
        k: "progress",
        v: `${stored} / ${frame.colLabels.length} states ready`,
        sw: "var(--_neutral)",
        hint: "How many states have been solved in dependency order.",
      },
    ]
  },
}

export const dynamicProgrammingFamily = {
  id: "matrix-grid",
  createRecorder(config) {
    return new DPRecorder("dynamic-programming", config.variant)
  },
  createView(frames) {
    return (
      frames[0]?.variant === "abstract"
        ? makeExecutionTreeView(frames, abstractDynamicProgrammingViewDescriptor)
        : makeDPView(frames, concreteDynamicProgrammingViewSemantics)
    ) as StepTraceView<DynamicProgrammingFrame>
  },
} satisfies VisualFamily<DynamicProgrammingConfig, DPRecorder, DynamicProgrammingFrame>
