import { arraySortFamily, type ArraySortConfig, type ArraySortFrame } from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export interface CombSortConfig extends ArraySortConfig {
  shrinkFactor: number
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: comb-sort ${message}`)
}

export function parseCombSortConfig(config: StepTraceConfig): CombSortConfig {
  const { array } = config
  const shrinkFactor = config.shrinkFactor ?? 1.3
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two numbers.')
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    invalidConfig('requires every "array" value to be a finite number.')
  if (typeof shrinkFactor !== "number" || !Number.isFinite(shrinkFactor) || shrinkFactor <= 1)
    invalidConfig('requires "shrinkFactor" to be a finite number greater than 1.')

  return { array: array.slice(), shrinkFactor, profile: "comb" }
}

export const combSort = {
  id: "comb-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Comb sort" },
  parse: parseCombSortConfig,
  run(input, ops) {
    ops.init(
      `Comb sort — compare distant pairs, shrink the gap by ${input.shrinkFactor}, then finish with gap 1.`,
    )
    let gap = ops.value.length
    let swapped = true
    while (gap > 1 || swapped) {
      gap = Math.max(1, Math.floor(gap / input.shrinkFactor))
      ops.beginGap(gap, `Gap ${gap}: sweep every pair whose indices are ${gap} apart.`)
      swapped = false
      for (let left = 0; left + gap < ops.value.length; left++) {
        const right = left + gap
        const leftValue = ops.value[left]
        const rightValue = ops.value[right]
        ops.compareGapPair(
          left,
          right,
          `Compare ${leftValue} at index ${left} with ${rightValue} at index ${right}.`,
        )
        if (leftValue <= rightValue) continue
        ops.swapGapPair(
          left,
          right,
          `${leftValue} > ${rightValue}: swap the gap-${gap} pair.`,
        )
        swapped = true
      }
      ops.endGap(
        swapped,
        gap === 1 && !swapped
          ? "Gap 1 made no swap; no adjacent inversion remains."
          : `Gap ${gap} pass complete${swapped ? " with swaps" : " without a swap"}.`,
      )
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", CombSortConfig, ArraySortRecorder, ArraySortFrame>
