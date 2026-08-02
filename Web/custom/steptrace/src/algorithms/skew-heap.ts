import { mountSkewHeap, type HeapVariantConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition } from "../types"

export const skewHeap = {
  id: "skew-heap",
  family: "heap-selection",
  meta: { label: "Skew heap" },
  parse: () => ({}),
  mount: mountSkewHeap,
} satisfies InteractiveStructureDefinition<HeapVariantConfig>
