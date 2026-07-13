import type { SortAlgorithmDefinition } from "../types"

// ─────────────────────────────── insertion-sort ─────────────────────────
export const insertionSort = {
  id: "insertion-sort",
  kind: "sort",
  meta: { label: "Insertion sort" },
  run: (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Insertion sort — grow a sorted prefix on the left; take each next value and slide it left past larger values into place.`,
    )
    ops.markSorted([0], [0], `The first element alone is a sorted prefix.`)
    for (let i = 1; i < n; i++) {
      const key = ops.value[i]
      ops.holdKey(key)
      ops.compare(i, i - 1, `Take ${key} (index ${i}) and compare it into the sorted prefix.`)
      let j = i - 1
      while (j >= 0 && ops.value[j] > key) {
        ops.overwrite(
          j + 1,
          ops.value[j],
          `${ops.value[j]} > ${key}: shift it right into index ${j + 1}.`,
          j,
        )
        j--
        if (j >= 0) ops.compare(j, null, `Compare ${key} with ${ops.value[j]}.`)
      }
      ops.overwrite(j + 1, key, `Insert ${key} at index ${j + 1}.`)
      ops.holdKey(null)
      ops.markSorted(
        Array.from({ length: i + 1 }, (_, k) => k),
        [j + 1],
        `Sorted prefix now spans indices 0..${i}.`,
      )
    }
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} moves.`)
  },
} satisfies SortAlgorithmDefinition
