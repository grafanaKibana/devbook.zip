import {
  indexedArraySearchFamily,
  parseIndexedArraySearchConfig,
  type IndexedArraySearchConfig,
  type IndexedSearchFrame,
} from "../families/indexed-array-search"
import { IndexedSearchRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseInterpolationSearchConfig(config: StepTraceConfig): IndexedArraySearchConfig {
  return parseIndexedArraySearchConfig(config, "interpolation-search", "interpolation")
}

export const interpolationSearch = {
  id: "interpolation-search",
  kind: "search",
  family: indexedArraySearchFamily,
  meta: { label: "Interpolation search" },
  parse: parseInterpolationSearchConfig,
  run(input, ops) {
    const values = ops.value
    const { target } = input

    ops.init(
      `Interpolation search for ${target}: estimate probe positions from value ratios, then narrow the range.`,
    )
    ops.beginPhase(
      0,
      values.length - 1,
      `Interpolation phase: probe by relative position inside [${0}, ${values.length - 1}].`,
      "interpolation",
    )

    let lo = 0
    let hi = values.length - 1
    while (lo <= hi && target >= values[lo] && target <= values[hi]) {
      if (values[lo] === values[hi]) {
        ops.annotatedProbe(
          lo,
          hi,
          lo,
          "estimate",
          `index ${lo}`,
          `The value span is flat, so the estimate stays at index ${lo}.`,
        )
        if (values[lo] === target) {
          ops.hit(lo, `${target} equals ${values[lo]} at index ${lo}.`)
          ops.done(`Found ${target} at index ${lo} after ${ops.comparisons} probes.`)
          return
        }
        break
      }

      const numerator = (target - values[lo]) * (hi - lo)
      const denominator = values[hi] - values[lo]
      const pos = Math.floor(lo + numerator / denominator)
      const ratio = Math.round(((target - values[lo]) / denominator) * 100)
      ops.annotatedProbe(
        lo,
        hi,
        pos,
        "estimate",
        `${ratio}% → [${pos}]`,
        `${target} is ${ratio}% through [${values[lo]}, ${values[hi]}]: project to index ${pos}.`,
      )

      if (values[pos] === target) {
        ops.hit(pos, `${values[pos]} equals ${target} — found it at index ${pos}.`)
        ops.done(`Found ${target} after ${ops.comparisons} probes.`)
        return
      }
      if (values[pos] < target) {
        lo = pos + 1
        ops.narrow(lo, hi, `${values[pos]} < ${target}: search indices ${lo} through ${hi}.`)
      } else {
        hi = pos - 1
        ops.narrow(lo, hi, `${values[pos]} > ${target}: search indices ${lo} through ${hi}.`)
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
