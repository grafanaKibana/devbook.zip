import { arraySortFamily, type ArraySortConfig, type ArraySortFrame } from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export interface ShellSortConfig extends ArraySortConfig {
  gaps: number[]
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: shell-sort ${message}`)
}

export function parseShellSortConfig(config: StepTraceConfig): ShellSortConfig {
  const { array, gaps } = config
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two numbers.')
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    invalidConfig('requires every "array" value to be a finite number.')
  if (!Array.isArray(gaps) || gaps.length === 0)
    invalidConfig('requires a non-empty "gaps" array ending in 1.')
  if (!gaps.every((gap) => Number.isInteger(gap) && gap > 0 && gap < array.length))
    invalidConfig("requires every gap to be a positive integer smaller than the array length.")
  if (gaps.at(-1) !== 1) invalidConfig("requires the final gap to be 1.")
  if (gaps.some((gap, index) => index > 0 && gap >= gaps[index - 1]))
    invalidConfig("requires gaps in strictly decreasing order.")

  return { array: array.slice(), gaps: gaps.slice(), profile: "shell" }
}

export const shellSort = {
  id: "shell-sort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Shell sort" },
  parse: parseShellSortConfig,
  run(input, ops) {
    ops.init("Shell sort — insertion-sort interleaved subsequences, then shrink the gap to 1.")
    for (const gap of input.gaps) {
      ops.beginGap(gap, `Gap ${gap}: sort each subsequence whose indices are ${gap} apart.`)
      for (let start = 0; start < gap; start++) {
        const indices = []
        for (let index = start; index < ops.value.length; index += gap) indices.push(index)
        if (indices.length < 2) continue
        ops.selectSubsequence(indices, `Gap ${gap}, subsequence ${indices.join(" → ")}.`)
        for (let index = start + gap; index < ops.value.length; index += gap) {
          const key = ops.value[index]
          ops.holdKeyAt(
            key,
            index,
            `Lift ${key} from index ${index}; index ${index} becomes the insertion hole.`,
          )
          let cursor = index - gap
          ops.compareHeldAt(
            cursor,
            `Hold ${key} from index ${index}; compare it with ${ops.value[cursor]} at index ${cursor}.`,
          )
          while (cursor >= start && ops.value[cursor] > key) {
            ops.shiftHeld(
              cursor + gap,
              cursor,
              `${ops.value[cursor]} > ${key}: shift it from ${cursor} to ${cursor + gap}.`,
            )
            cursor -= gap
            if (cursor >= start)
              ops.compareHeldAt(
                cursor,
                `Compare ${key} with ${ops.value[cursor]} at index ${cursor}.`,
              )
          }
          ops.placeHeld(cursor + gap, key, `Place ${key} at index ${cursor + gap}.`)
          ops.releaseHeldKey()
        }
      }
    }
    ops.lockAll(Array.from({ length: ops.value.length }, (_, index) => index))
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} gapped moves.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", ShellSortConfig, ArraySortRecorder, ArraySortFrame>
