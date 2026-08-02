import { mountLeftistHeap, type HeapVariantConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition } from "../types"

export const leftistHeap = {
  id: "leftist-heap",
  family: "heap-selection",
  meta: { label: "Leftist heap" },
  parse: () => ({}),
  mount: mountLeftistHeap,
} satisfies InteractiveStructureDefinition<HeapVariantConfig>
