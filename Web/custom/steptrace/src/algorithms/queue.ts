import { mountQueue, type QueueConfig } from "../families/contiguous-storage"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_CAPACITY = 6

export function parseQueueConfig(config: StepTraceConfig): QueueConfig {
  const capacity = config.capacity ?? DEFAULT_CAPACITY
  if (!Number.isInteger(capacity) || capacity < 3 || capacity > 10)
    throw new Error(`steptrace: queue requires integer "capacity" from 3 to 10.`)
  return { capacity }
}

export const queue = {
  id: "queue",
  family: "contiguous-storage",
  meta: { label: "Queue" },
  parse: parseQueueConfig,
  mount: mountQueue,
} satisfies InteractiveStructureDefinition<QueueConfig>
