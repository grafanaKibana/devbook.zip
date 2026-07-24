import {
  distributionSortFamily,
  parseCountingSortConfig,
  type DistributionSortConfig,
  type DistributionSortFrame,
  type DistributionSortRecorder,
} from "../families/distribution-sort"
import type { FamilyAlgorithmDefinition } from "../types"

export const countingSort = {
  id: "counting-sort",
  kind: "sort",
  family: distributionSortFamily,
  meta: { label: "Counting sort" },
  parse: parseCountingSortConfig,
  run(input, ops) {
    ops.intro(
      `Keys span ${input.min}…${input.max}. Count by value first; no pair of keys is compared.`,
    )
    for (let index = 0; index < input.array.length; index++) {
      const key = input.array[index]
      ops.tally(index, `Read input[${index}] = ${key}; add one to frequency[${key}].`)
    }
    for (let key = input.min; key <= input.max; key++) {
      ops.prefix(
        key,
        key === input.min
          ? `Position[${key}] starts at ${key}'s frequency: keys ≤ ${key} end before this index.`
          : `Add position[${key - 1}] into position[${key}]; it now counts keys ≤ ${key}.`,
      )
    }
    for (let index = input.array.length - 1; index >= 0; index--) {
      const key = input.array[index]
      ops.place(
        index,
        `Read input[${index}] = ${key} from the tail; decrement its end position, then write output there.`,
      )
    }
    ops.done(`Every key is in its value block. Tail-first placement kept equal keys in input order.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "sort",
  DistributionSortConfig,
  DistributionSortRecorder,
  DistributionSortFrame
>
