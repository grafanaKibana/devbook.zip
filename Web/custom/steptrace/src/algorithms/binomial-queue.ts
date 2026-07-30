import { mountBinomialQueue, type HeapVariantConfig } from "../families/heap-structure"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseBinomialQueueConfig(_config: StepTraceConfig): HeapVariantConfig {
  return {}
}

export const binomialQueue = {
  id: "binomial-queue",
  family: "heap-selection",
  meta: { label: "Binomial queue" },
  parse: parseBinomialQueueConfig,
  mount: mountBinomialQueue,
} satisfies InteractiveStructureDefinition<HeapVariantConfig>
