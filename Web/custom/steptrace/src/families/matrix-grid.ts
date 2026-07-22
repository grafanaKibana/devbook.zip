import { MatrixGridRecorder } from "../recorders"
import {
  makeDPView,
  type MatrixGridFooterModel,
  type MatrixGridRoleDescriptor,
  type MatrixGridViewSemantics,
} from "../render"
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
