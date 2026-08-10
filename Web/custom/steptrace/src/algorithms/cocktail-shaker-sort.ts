import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export const cocktailShakerSort = {
  id: "cocktail-shaker-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Cocktail shaker sort" },
  parse: (config: StepTraceConfig) =>
    parseArraySortConfig(config, "cocktail-shaker-sort", "cocktail-shaker"),
  run(_input, ops) {
    ops.init("Cocktail shaker sort sweeps forward, then backward, shrinking both ends.")
    let left = 0
    let right = ops.value.length - 1
    let swapped = true
    while (swapped && left < right) {
      swapped = false
      ops.range(left, right)
      for (let index = left; index < right; index++) {
        ops.compare(index, index + 1, `Forward: compare indices ${index} and ${index + 1}.`)
        if (ops.value[index] <= ops.value[index + 1]) continue
        ops.swap(index, index + 1, "Swap the inverted adjacent pair.")
        swapped = true
      }
      ops.markSorted([right], [right], `The largest remaining value is fixed at ${right}.`)
      right--
      if (!swapped) break
      swapped = false
      ops.range(left, right)
      for (let index = right; index > left; index--) {
        ops.compare(index - 1, index, `Backward: compare indices ${index - 1} and ${index}.`)
        if (ops.value[index - 1] <= ops.value[index]) continue
        ops.swap(index - 1, index, "Swap the inverted adjacent pair.")
        swapped = true
      }
      ops.markSorted([left], [left], `The smallest remaining value is fixed at ${left}.`)
      left++
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
