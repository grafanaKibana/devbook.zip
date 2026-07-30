import {
  prefixSumFamily,
  type PrefixSumConfig,
  type PrefixSumFrame,
  type PrefixSumOperations,
  type PrefixSumRecorder,
} from "../families/prefix-sum"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const DEFAULT_ARRAY = [4, 7, 2, 9, 5, 3, 8]
const DEFAULT_RANGE: [number, number] = [2, 5]

export function parsePrefixSumConfig(config: StepTraceConfig): PrefixSumConfig {
  const array = config.array ?? DEFAULT_ARRAY
  const range = config.range ?? DEFAULT_RANGE
  if (!Array.isArray(array) || array.length < 2 || !array.every(Number.isFinite))
    throw new Error(`steptrace: prefix-sum requires a numeric "array" with at least two values.`)
  if (
    !Array.isArray(range) ||
    range.length !== 2 ||
    !range.every(Number.isInteger) ||
    range[0] < 0 ||
    range[0] > range[1] ||
    range[1] >= array.length
  )
    throw new Error(`steptrace: prefix-sum requires "range" as [left, right] inside the array.`)
  return { profile: "range-sum", array: array.slice(), range: [range[0], range[1]] }
}

export const prefixSum = {
  id: "prefix-sum",
  kind: "pointers",
  family: prefixSumFamily,
  meta: { label: "Prefix sum" },
  parse: parsePrefixSumConfig,
  run(input, ops) {
    ops.init("Seed prefix[0] = 0 for the empty prefix.")
    input.array.forEach((value, index) => {
      ops.add(
        index,
        `Read a[${index}] = ${value}; running total becomes ${input.array.slice(0, index + 1).reduce((sum, item) => sum + item, 0)}.`,
      )
      ops.write(index, `Write that total to prefix[${index + 1}].`)
    })

    const [left, right] = input.range
    ops.query(`Answer the inclusive range [${left}, ${right}] without rescanning it.`)
    ops.takeRight(`Take prefix[${right + 1}], the total through a[${right}].`)
    ops.takeLeft(`Take prefix[${left}], the shared head before a[${left}].`)
    const rightPrefix = input.array.slice(0, right + 1).reduce((sum, value) => sum + value, 0)
    const leftPrefix = input.array.slice(0, left).reduce((sum, value) => sum + value, 0)
    const result = rightPrefix - leftPrefix
    ops.subtract(
      `Subtract the shared head: prefix[${right + 1}] - prefix[${left}] = ${rightPrefix} - ${leftPrefix} = ${result}.`,
    )
    ops.done(
      `Range [${left}, ${right}] is ${result}: prefix[${right + 1}] - prefix[${left}] = ${rightPrefix} - ${leftPrefix}.`,
    )
  },
} satisfies FamilyAlgorithmDefinition<
  "pointers",
  PrefixSumConfig,
  PrefixSumRecorder & PrefixSumOperations,
  PrefixSumFrame
>
