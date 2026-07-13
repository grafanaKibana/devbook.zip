import type { BacktrackAlgorithmDefinition } from "../types"

// ───────────────────────────── n-queens ─────────────────────────────
export const nQueens = {
  id: "n-queens",
  kind: "backtrack",
  meta: { label: "N-Queens (backtracking)" },
  run: (input, ops) => {
    const n = Math.min(Math.max(input.n || 4, 4), 6)
    ops.board(
      n,
      `Place ${n} queens on a ${n}×${n} board so none attack another. Fill one queen per row; retreat whenever a row has no safe square.`,
    )
    const conflict = (row, col) => {
      // first attacker above in same column or on a diagonal, or -1 if none
      const q = ops.queens
      for (let r = 0; r < row; r++) if (q[r] === col || Math.abs(q[r] - col) === row - r) return r
      return -1
    }
    let solved = false
    const solve = (row) => {
      if (solved) return
      if (row === n) {
        ops.solved(`All ${n} rows filled — no queen attacks another.`)
        solved = true
        return
      }
      for (let col = 0; col < n; col++) {
        const bad = conflict(row, col)
        if (bad >= 0) {
          ops.reject(
            row,
            col,
            bad,
            `Row ${row}, column ${col} clashes with the queen in row ${bad} — prune this square.`,
          )
          continue
        }
        ops.place(row, col, `Column ${col} is safe — place a queen and descend to row ${row + 1}.`)
        solve(row + 1)
        if (solved) return
        ops.backtrack(
          row,
          `Row ${row + 1} had no safe square — remove the queen at (${row}, ${col}) and retreat.`,
        )
      }
    }
    solve(0)
    ops.done(solved ? `Solved — a valid ${n}-queens arrangement.` : `No solution for n = ${n}.`)
  },
} satisfies BacktrackAlgorithmDefinition
