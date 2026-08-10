import {
  twoHeapsFamily,
  type TwoHeapsConfig,
  type TwoHeapsFrame,
  type TwoHeapsRecorder,
} from "../families/heap-selection"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export function parseTwoHeapsConfig(config: StepTraceConfig): TwoHeapsConfig {
  const array = config.array
  if (!Array.isArray(array) || array.length < 2 || array.length > 12)
    throw new Error('steptrace: two-heaps requires an "array" with 2 to 12 numbers.')
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    throw new Error('steptrace: two-heaps requires every "array" value to be a finite number.')
  return { profile: "two-heaps", array: array.slice() }
}

export const twoHeaps = {
  id: "two-heaps",
  kind: "pointers",
  family: twoHeapsFamily,
  meta: { label: "Two heaps" },
  parse: parseTwoHeapsConfig,
  run(input, ops) {
    ops.init("Keep the lower half in a max-heap and the upper half in a min-heap.")
    input.array.forEach((value, index) =>
      ops.insert(index, `Insert ${value}, then rebalance so heap sizes differ by at most one.`),
    )
    ops.done(
      "Every lower value is at most every upper value; the root or root average is the median.",
    )
  },
} satisfies FamilyAlgorithmDefinition<"pointers", TwoHeapsConfig, TwoHeapsRecorder, TwoHeapsFrame>
