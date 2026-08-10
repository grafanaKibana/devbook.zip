import {
  arraySortFamily,
  parseArraySortConfig,
  type ArraySortConfig,
  type ArraySortFrame,
} from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export const gnomeSort = {
  id: "gnome-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Gnome sort" },
  parse: (config: StepTraceConfig) => parseArraySortConfig(config, "gnome-sort", "gnome"),
  run(_input, ops) {
    ops.init("Gnome sort advances across ordered neighbors and steps back after each swap.")
    let index = 1
    while (index < ops.value.length) {
      ops.compare(index - 1, index, `Compare neighbors ${index - 1} and ${index}.`)
      if (ops.value[index - 1] <= ops.value[index]) index++
      else {
        ops.swap(index - 1, index, `Swap the inversion and step back from index ${index}.`)
        index = Math.max(1, index - 1)
      }
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, i) => i))
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ArraySortConfig, ArraySortRecorder, ArraySortFrame>
