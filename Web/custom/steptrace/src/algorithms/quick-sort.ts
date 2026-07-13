import type { SortAlgorithmDefinition } from "../types"

// ─────────────────────────────── quick-sort ─────────────────────────────
export const quickSort = {
  id: "quick-sort",
  kind: "sort",
  meta: { label: "Quick sort" },
  run: (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Quick sort — pick a pivot, partition values so smaller ones go left and larger ones go right, then recurse on each side.`,
    )
    function partition(lo, hi) {
      const pivot = ops.value[hi]
      ops.range(lo, hi)
      ops.pivot(hi)
      ops.candidate(
        hi,
        `Partition [${lo}, ${hi}]: pivot ${pivot} (index ${hi}) — send values < ${pivot} left, > ${pivot} right.`,
      )
      let i = lo
      for (let j = lo; j < hi; j++) {
        ops.compare(j, hi, `Compare ${ops.value[j]} with pivot ${pivot}.`)
        if (ops.value[j] < pivot) {
          if (i !== j)
            ops.swap(
              i,
              j,
              `${ops.value[j]} < ${pivot}: move it into the left region at index ${i}.`,
            )
          i++
        }
      }
      if (i !== hi) ops.swap(i, hi, `Swap the pivot ${pivot} into index ${i}.`)
      ops.pivot(i)
      ops.candidate(
        null,
        `Pivot ${pivot} settles at index ${i} — everything left is < ${pivot}, everything right is > ${pivot}.`,
      )
      ops.pivot(null)
      ops.markSorted([i], [i], `Index ${i} is final — it never moves again.`)
      ops.range(null)
      return i
    }
    function qs(lo, hi) {
      if (lo > hi) return
      if (lo === hi) {
        ops.markSorted([lo], [lo], `A single element at index ${lo} is already in place.`)
        return
      }
      const p = partition(lo, hi)
      if (p - 1 - lo >= 1) {
        ops.range(lo, p - 1)
        ops.candidate(
          null,
          `Recurse into the left half [${lo}, ${p - 1}] (the values below the pivot).`,
        )
      }
      qs(lo, p - 1)
      if (hi - (p + 1) >= 1) {
        ops.range(p + 1, hi)
        ops.candidate(
          null,
          `Recurse into the right half [${p + 1}, ${hi}] (the values above the pivot).`,
        )
      }
      qs(p + 1, hi)
    }
    qs(0, n - 1)
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  },
} satisfies SortAlgorithmDefinition
