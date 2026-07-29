import { mountSkewHeap, type HeapVariantConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseSkewHeapConfig(_config: StepTraceConfig): HeapVariantConfig {
  return {}
}

export const skewHeap = {
  id: "skew-heap",
  family: "heap-selection",
  meta: { label: "Skew heap" },
  parse: parseSkewHeapConfig,
  mount: mountSkewHeap,
} satisfies InteractiveStructureDefinition<HeapVariantConfig>
