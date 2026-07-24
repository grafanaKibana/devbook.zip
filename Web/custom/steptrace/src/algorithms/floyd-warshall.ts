import {
  matrixGridFamily,
  parseMatrixGridConfig,
  type MatrixGridConfig,
  type MatrixGridFrame,
} from "../families/matrix-grid"
import { MatrixGridRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition } from "../types"

const displayMatrix = (matrix: number[][]) =>
  matrix.map((row) => row.map((value) => (Number.isFinite(value) ? value : null)))

export const floydWarshall = {
  id: "floyd-warshall",
  kind: "dp",
  family: matrixGridFamily,
  meta: { label: "Floyd-Warshall" },
  parse: parseMatrixGridConfig,
  run(input, ops) {
    const indexForNode = new Map(input.nodes.map((node, index) => [node, index]))
    const dist = Array.from({ length: input.nodes.length }, (_, row) =>
      Array.from({ length: input.nodes.length }, (_, column) => (row === column ? 0 : Infinity)),
    )

    for (const [from, to, weight] of input.edges) {
      const row = indexForNode.get(from)!
      const column = indexForNode.get(to)!
      dist[row][column] = Math.min(dist[row][column], weight)
    }

    ops.board(displayMatrix(dist), "Initialize direct-edge distances; missing edges are ∞.")

    for (let k = 0; k < input.nodes.length; k++) {
      const kNode = input.nodes[k]
      ops.stage(kNode, `Stage k = ${kNode}: allow node ${kNode} as an intermediate.`)
      for (let i = 0; i < input.nodes.length; i++) {
        for (let j = 0; j < input.nodes.length; j++) {
          const current = dist[i][j]
          const left = dist[i][k]
          const right = dist[k][j]
          const candidate =
            Number.isFinite(left) && Number.isFinite(right) ? left + right : Infinity
          const improve = candidate < current
          if (improve) dist[i][j] = candidate
          const from = input.nodes[i]
          const to = input.nodes[j]
          const currentLabel = Number.isFinite(current) ? current : "∞"
          const candidateLabel = Number.isFinite(candidate) ? candidate : "∞"
          ops.relax(
            i,
            j,
            [
              [i, k],
              [k, j],
            ],
            Number.isFinite(candidate) ? candidate : null,
            improve ? "improve" : "keep",
            Number.isFinite(dist[i][j]) ? dist[i][j] : null,
            improve
              ? `dist[${from}][${to}] improves through ${kNode}: ${currentLabel} → ${candidateLabel}.`
              : `Keep dist[${from}][${to}] = ${currentLabel}; the route through ${kNode} costs ${candidateLabel}.`,
          )
        }
      }
    }

    const negativeCycle = input.nodes.filter((node, index) => dist[index][index] < 0)
    if (negativeCycle.length) {
      ops.reportNegativeCycle(
        negativeCycle,
        `Negative cycle detected through ${negativeCycle.join(", ")}; shortest distances are undefined.`,
      )
      ops.done("Stopped after reporting the negative cycle.")
      return
    }
    ops.done("All stages complete: the matrix holds every finite shortest-path distance.")
  },
} satisfies FamilyAlgorithmDefinition<"dp", MatrixGridConfig, MatrixGridRecorder, MatrixGridFrame>
