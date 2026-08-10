import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export const oddEvenSort = {
  id: "odd-even-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Odd-even sort" },
  parse: (config: StepTraceConfig) => parseArraySortConfig(config, "odd-even-sort", "odd-even"),
  run(_input, ops) {
    ops.init("Odd-even sort alternates odd-index and even-index adjacent comparisons.")
    let swapped = true
    while (swapped) {
      swapped = false
      for (const start of [1, 0]) {
        for (let index = start; index + 1 < ops.value.length; index += 2) {
          ops.compare(
            index,
            index + 1,
            `${start ? "Odd" : "Even"} phase: compare ${index} and ${index + 1}.`,
          )
          if (ops.value[index] <= ops.value[index + 1]) continue
          ops.swap(index, index + 1, "Swap the inverted pair.")
          swapped = true
        }
      }
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`A full odd/even pair made no swap; the array is sorted.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
