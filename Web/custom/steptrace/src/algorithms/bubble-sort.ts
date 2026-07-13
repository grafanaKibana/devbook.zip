import type { SortAlgorithmDefinition } from "../types"

// ==========================================================================
//  4. ALGORITHMS  —  the built-ins. Each is one self-contained block: a
//  register call + a pure fn(input, ops[, graph]) that only calls ops.*.
//  Add another block here for a shipped algorithm, or register at runtime.
// ==========================================================================

// ───────────────────────────── bubble-sort ─────────────────────────────
export const bubbleSort = {
  id: "bubble-sort",
  kind: "sort",
  meta: { label: "Bubble sort" },
  run: (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Bubble sort — repeatedly compare adjacent values and swap the larger one rightward, bubbling the largest to the end each pass.`,
    )
    for (let i = 0; i < n - 1; i++) {
      let swapped = false
      for (let j = 0; j < n - 1 - i; j++) {
        const a = ops.value
        ops.compare(j, j + 1, `Compare index ${j} (${a[j]}) and index ${j + 1} (${a[j + 1]}).`)
        if (ops.value[j] > ops.value[j + 1]) {
          const b = ops.value
          ops.swap(j, j + 1, `${b[j]} is greater than ${b[j + 1]} — swap them.`)
          swapped = true
        }
      }
      ops.markSorted([n - 1 - i], [n - 1 - i], `Index ${n - 1 - i} now holds its final value.`)
      if (!swapped) {
        const rest = Array.from({ length: n - 1 - i }, (_, k) => k)
        ops.markSorted(rest, [], `A full pass made no swaps — the array is already sorted.`)
        break
      }
    }
    ops.lockAll(Array.from({ length: n }, (_, k) => k))
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  },
} satisfies SortAlgorithmDefinition
