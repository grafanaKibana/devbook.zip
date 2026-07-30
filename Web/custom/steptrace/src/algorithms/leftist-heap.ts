import { mountLeftistHeap, type HeapVariantConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseLeftistHeapConfig(_config: StepTraceConfig): HeapVariantConfig {
  return {}
}

export const leftistHeap = {
  id: "leftist-heap",
  family: "heap-selection",
  meta: { label: "Leftist heap" },
  parse: parseLeftistHeapConfig,
  mount: mountLeftistHeap,
} satisfies InteractiveStructureDefinition<HeapVariantConfig>
