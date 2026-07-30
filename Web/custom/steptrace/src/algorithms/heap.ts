import { mountHeap, type HeapConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [3, 5, 8, 9]

export function parseHeapConfig(config: StepTraceConfig): HeapConfig {
  const values = Array.isArray(config.array) && config.array.length ? config.array : DEFAULT_VALUES
  if (
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(`steptrace: heap requires finite integer values.`)
  if (values.some((value, index) => index > 0 && values[(index - 1) >> 1] > value))
    throw new Error(`steptrace: heap requires a valid binary min-heap array.`)
  return { values: values as number[] }
}

export const heap = {
  id: "heap",
  family: "heap-selection",
  meta: { label: "Heap" },
  parse: parseHeapConfig,
  mount: mountHeap,
} satisfies InteractiveStructureDefinition<HeapConfig>
