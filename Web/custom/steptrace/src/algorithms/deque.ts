import { mountDeque, type DequeConfig } from "../families/contiguous-storage"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseDequeConfig(config: StepTraceConfig): DequeConfig {
  const capacity = config.capacity ?? 4
  if (!Number.isInteger(capacity) || capacity < 3 || capacity > 5)
    throw new Error(`steptrace: deque requires integer "capacity" from 3 to 5.`)
  return { capacity }
}

export const deque = {
  id: "deque",
  family: "contiguous-storage",
  meta: { label: "Deque" },
  parse: parseDequeConfig,
  mount: mountDeque,
} satisfies InteractiveStructureDefinition<DequeConfig>
