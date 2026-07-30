import { mountCircularBuffer, type CircularBufferConfig } from "../families/contiguous-storage"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseCircularBufferConfig(config: StepTraceConfig): CircularBufferConfig {
  const capacity = config.capacity ?? 6
  if (!Number.isInteger(capacity) || capacity < 3 || capacity > 10)
    throw new Error(`steptrace: circular-buffer requires integer "capacity" from 3 to 10.`)
  return { capacity }
}

export const circularBuffer = {
  id: "circular-buffer",
  family: "contiguous-storage",
  meta: { label: "Circular Buffer" },
  parse: parseCircularBufferConfig,
  mount: mountCircularBuffer,
} satisfies InteractiveStructureDefinition<CircularBufferConfig>
