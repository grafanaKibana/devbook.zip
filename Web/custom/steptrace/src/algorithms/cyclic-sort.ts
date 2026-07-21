import { arraySortFamily, type ArraySortConfig, type ArraySortFrame } from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export type CyclicSortConfig = ArraySortConfig

function invalidConfig(message: string): never {
  throw new Error(`steptrace: cyclic-sort ${message}`)
}

export function parseCyclicSortConfig(config: StepTraceConfig): CyclicSortConfig {
  const { array } = config
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two integers.')
  if (!array.every((value) => Number.isInteger(value) && value >= 1 && value <= array.length))
    invalidConfig('requires every value to be an integer in the range 1..array.length.')
  if (new Set(array).size !== array.length)
    invalidConfig('requires a permutation with no duplicate values.')

  return { array: array.slice(), profile: "cyclic" }
}

export const cyclicSort = {
  id: "cyclic-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Cyclic sort" },
  parse: parseCyclicSortConfig,
  run(_input, ops) {
    ops.init("Cyclic sort — value v belongs at index v − 1; keep the cursor still until its value is home.")
    let cursor = 0
    while (cursor < ops.value.length) {
      const value = ops.value[cursor]
      const home = value - 1
      ops.inspectHome(
        cursor,
        home,
        `At index ${cursor}, value ${value} belongs at home index ${home}.`,
      )
      if (cursor !== home) {
        const displaced = ops.value[home]
        ops.swapHome(
          cursor,
          home,
          `Send ${value} home to index ${home}; ${displaced} returns to index ${cursor}.`,
        )
        ops.settleHome(home, `Value ${value} is now fixed at its home index ${home}.`)
        continue
      }
      ops.settleHome(cursor, `Value ${value} is already home at index ${cursor}; advance.`)
      cursor++
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`Placed all values with ${ops.swaps} swaps.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", CyclicSortConfig, ArraySortRecorder, ArraySortFrame>
