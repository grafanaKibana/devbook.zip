import {
  indexedArraySearchFamily,
  type IndexedArraySearchConfig,
  type IndexedSearchFrame,
  parseIndexedArraySearchConfig,
} from "../families/indexed-array-search"
import { IndexedSearchRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseExponentialSearchConfig(config: StepTraceConfig): IndexedArraySearchConfig {
  return parseIndexedArraySearchConfig(config, "exponential-search", "exponential")
}

export const exponentialSearch = {
  id: "exponential-search",
  kind: "search",
  family: indexedArraySearchFamily,
  meta: { label: "Exponential search" },
  parse: parseExponentialSearchConfig,
  run(input, ops) {
    const values = ops.value
    const { target } = input
    ops.init(
      `Exponential search for ${target}: gallop by powers of two, then binary-search the bracket.`,
    )

    ops.gallopProbe(-1, 0, `Check index 0 first: it holds ${values[0]}.`)
    if (values[0] === target) {
      ops.hit(0, `${target} is at index 0.`)
      ops.done(`Found ${target} at index 0 after ${ops.comparisons} probe.`)
      return
    }
    if (values[0] > target) {
      ops.done(`${target} is smaller than the first value, so it is not in the array.`)
      return
    }

    let previousBound = 0
    let bound = 1
    while (bound < values.length) {
      ops.gallopProbe(
        previousBound,
        bound,
        `Gallop to index ${bound}: ${values[bound]} ${values[bound] < target ? "is below" : "reaches or passes"} ${target}.`,
      )
      if (values[bound] >= target) break
      previousBound = bound
      bound *= 2
    }

    const lo = Math.floor(bound / 2)
    const hi = Math.min(bound, values.length - 1)
    ops.beginPhase(lo, hi, `The target is bracketed in [${lo}, ${hi}]; switch to binary search.`)

    let left = lo
    let right = hi
    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      ops.probe(
        left,
        right,
        mid,
        `Binary-search [${left}, ${right}]: index ${mid} holds ${values[mid]}.`,
      )
      if (values[mid] === target) {
        ops.hit(mid, `${values[mid]} equals ${target} — found it at index ${mid}.`)
        ops.done(`Found ${target} after ${ops.comparisons} probes.`)
        return
      }
      if (values[mid] < target) {
        left = mid + 1
        ops.narrow(left, right, `${values[mid]} < ${target}: discard through index ${mid}.`)
      } else {
        right = mid - 1
        ops.narrow(left, right, `${values[mid]} > ${target}: discard from index ${mid}.`)
      }
    }
    ops.done(`${target} is not in the array after ${ops.comparisons} probes.`)
  },
} satisfies FamilyAlgorithmDefinition<
  "search",
  IndexedArraySearchConfig,
  IndexedSearchRecorder,
  IndexedSearchFrame
>
