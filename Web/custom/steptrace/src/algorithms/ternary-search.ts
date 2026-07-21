import {
  indexedArraySearchFamily,
  type IndexedArraySearchConfig,
  type IndexedSearchFrame,
} from "../families/indexed-array-search"
import { IndexedSearchRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseTernarySearchConfig(config: StepTraceConfig): IndexedArraySearchConfig {
  const array = config.array ?? config.values

  if (!Array.isArray(array) || array.length < 3)
    throw new Error('steptrace: ternary-search requires an "array" with at least three values.')
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    throw new Error('steptrace: ternary-search requires every "array" value to be a finite number.')
  if (config.goal !== "maximum")
    throw new Error('steptrace: ternary-search requires goal: "maximum".')

  let peak = 1
  while (peak < array.length && array[peak] > array[peak - 1]) peak++
  if (
    peak === 1 ||
    peak === array.length ||
    array.slice(peak).some((value, index) => value >= array[peak + index - 1])
  )
    throw new Error(
      "steptrace: ternary-search requires a strictly increasing then strictly decreasing array.",
    )

  return { array: array.slice(), target: null, profile: "ternary", goal: "maximum" }
}

export const ternarySearch = {
  id: "ternary-search",
  kind: "search",
  family: indexedArraySearchFamily,
  meta: { label: "Ternary search" },
  parse: parseTernarySearchConfig,
  run(input, ops) {
    const values = ops.value
    ops.init("Ternary search for the maximum: compare two third-points and keep the rising side.")
    ops.beginPhase(
      0,
      values.length - 1,
      "Probe both third-points together; the larger value shows which side still contains the peak.",
      "ternary",
    )

    let left = 0
    let right = values.length - 1

    while (right - left > 2) {
      const third = Math.floor((right - left) / 3)
      const mid1 = left + third
      const mid2 = right - third

      ops.dualProbe(
        left,
        right,
        mid1,
        mid2,
        `Compare [${mid1}] = ${values[mid1]} with [${mid2}] = ${values[mid2]}.`,
      )

      if (values[mid1] < values[mid2]) {
        left = mid1 + 1
        ops.narrow(left, right, `The sequence is higher at ${mid2}; keep [${left}, ${right}].`)
      } else if (values[mid1] > values[mid2]) {
        right = mid2 - 1
        ops.narrow(left, right, `The sequence is higher at ${mid1}; keep [${left}, ${right}].`)
      } else {
        left = mid1 + 1
        right = mid2 - 1
        ops.narrow(
          left,
          right,
          `Equal third-points place the strict peak inside [${left}, ${right}].`,
        )
      }
    }

    ops.beginPhase(
      left,
      right,
      `Only [${left}, ${right}] remains; scan these final values.`,
      "scan",
    )
    let best = left
    for (let index = left; index <= right; index++) {
      ops.probe(left, right, index, `Check final candidate [${index}] = ${values[index]}.`)
      if (values[index] > values[best]) best = index
    }

    ops.hit(best, `${values[best]} is the maximum at index ${best}.`)
    ops.done(`Found the maximum ${values[best]} at index ${best} after ${ops.comparisons} probes.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "search",
  IndexedArraySearchConfig,
  IndexedSearchRecorder,
  IndexedSearchFrame
>
