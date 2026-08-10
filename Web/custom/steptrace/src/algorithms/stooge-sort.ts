import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const MAX_ITEMS = 7
// ponytail: seven items bound the recursive teaching trace; use sampled milestones before raising it.
const MAX_FRAMES = 900

export const stoogeSort = {
  id: "stooge-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Stooge sort" },
  parse: (config: StepTraceConfig) =>
    parseArraySortConfig(config, "stooge-sort", "stooge", MAX_ITEMS),
  run(_input, ops) {
    ops.init("Stooge sort recursively sorts the first, last, then first overlapping two-thirds.")
    const sort = (left: number, right: number) => {
      if (ops.frames.length >= MAX_FRAMES)
        throw new Error(`steptrace: stooge-sort exceeded ${MAX_FRAMES} frames.`)
      ops.range(left, right)
      ops.compare(left, right, `Compare the ends of [${left}, ${right}].`)
      if (ops.value[left] > ops.value[right]) ops.swap(left, right, "Swap the inverted endpoints.")
      if (right - left + 1 <= 2) return
      const third = Math.floor((right - left + 1) / 3)
      sort(left, right - third)
      sort(left + third, right)
      sort(left, right - third)
    }
    sort(0, ops.value.length - 1)
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`Sorted within the ${MAX_FRAMES}-frame teaching ceiling.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
