import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export const cycleSort = {
  id: "cycle-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Cycle sort" },
  parse: (config: StepTraceConfig) => parseArraySortConfig(config, "cycle-sort", "cycle"),
  run(_input, ops) {
    ops.init("Cycle sort rotates each value directly toward its final position, minimizing writes.")
    for (let start = 0; start < ops.value.length - 1; start++) {
      let item = ops.value[start]
      let position = start
      for (let index = start + 1; index < ops.value.length; index++) {
        ops.compare(index, start, `Count values smaller than ${item}.`)
        if (ops.value[index] < item) position++
      }
      if (position === start) continue
      while (item === ops.value[position]) position++
      const displaced = ops.value[position]
      ops.overwrite(position, item, `Write the cycle item to final index ${position}.`)
      item = displaced
      while (position !== start) {
        position = start
        for (let index = start + 1; index < ops.value.length; index++)
          if (ops.value[index] < item) position++
        while (item === ops.value[position]) position++
        const displaced = ops.value[position]
        ops.overwrite(position, item, `Rotate ${item} into index ${position}.`)
        item = displaced
      }
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`Sorted with ${ops.swaps} writes.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
