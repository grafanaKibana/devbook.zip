import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const MAX_ITEMS = 5
// ponytail: exhaustive deterministic permutations cap the teaching trace; raise only with a sampled renderer.
const MAX_ATTEMPTS = 120

function ordered(values: readonly number[]) {
  return values.every((value, index) => index === 0 || values[index - 1] <= value)
}

export const bogoSort = {
  id: "bogo-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Bogo sort" },
  parse: (config: StepTraceConfig) => parseArraySortConfig(config, "bogo-sort", "bogo", MAX_ITEMS),
  run(_input, ops) {
    ops.init("Bogo sort checks the order, then tries a deterministic sequence of permutations.")
    let attempts = 0
    while (!ordered(ops.value) && attempts < MAX_ATTEMPTS) {
      const values = ops.value
      let pivot = values.length - 2
      while (pivot >= 0 && values[pivot] >= values[pivot + 1]) pivot--
      if (pivot < 0) {
        for (let left = 0, right = values.length - 1; left < right; left++, right--)
          ops.swap(left, right, "Wrap to the first deterministic permutation.")
      } else {
        let successor = values.length - 1
        while (values[successor] <= values[pivot]) successor--
        ops.swap(pivot, successor, `Permutation ${attempts + 1}: advance the pivot.`)
        for (let left = pivot + 1, right = values.length - 1; left < right; left++, right--)
          ops.swap(left, right, "Restore the smallest suffix for the next permutation.")
      }
      attempts++
    }
    if (!ordered(ops.value))
      throw new Error(`steptrace: bogo-sort exceeded ${MAX_ATTEMPTS} attempts.`)
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`A sorted permutation appeared after ${attempts} bounded attempts.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
