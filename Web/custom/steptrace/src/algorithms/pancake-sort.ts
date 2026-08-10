import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export const pancakeSort = {
  id: "pancake-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Pancake sort" },
  parse: (config: StepTraceConfig) => parseArraySortConfig(config, "pancake-sort", "pancake"),
  run(_input, ops) {
    ops.init("Pancake sort places each suffix maximum using prefix reversals only.")
    const flip = (end: number) => {
      for (let left = 0, right = end; left < right; left++, right--)
        ops.swap(left, right, `Flip prefix [0, ${end}].`)
    }
    for (let end = ops.value.length - 1; end > 0; end--) {
      let maximum = 0
      for (let index = 1; index <= end; index++) {
        ops.compare(index, maximum, `Find the maximum in prefix [0, ${end}].`)
        if (ops.value[index] > ops.value[maximum]) maximum = index
      }
      if (maximum !== end) {
        if (maximum > 0) flip(maximum)
        flip(end)
      }
      ops.markSorted([end], [end], `The prefix maximum is fixed at index ${end}.`)
    }
    ops.lockAll([0])
    ops.done(`Sorted with ${ops.swaps} pair swaps inside prefix reversals.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
