import { mountBinomialQueue, type HeapVariantConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition } from "../types"

export const binomialQueue = {
  id: "binomial-queue",
  family: "heap-selection",
  meta: { label: "Binomial queue" },
  parse: () => ({}),
  mount: mountBinomialQueue,
} satisfies InteractiveStructureDefinition<HeapVariantConfig>
