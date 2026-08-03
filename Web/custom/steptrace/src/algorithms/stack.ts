import { mountStack, type StackConfig } from "../families/stack-sequence"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = ["A", "B", "C"]

export function parseStackConfig(config: StepTraceConfig): StackConfig {
  const values = (config.values?.length ? config.values : DEFAULT_VALUES).map(String)
  const capacity = config.capacity ?? 6
  if (!Number.isInteger(capacity) || capacity < 3 || capacity > 8 || values.length > capacity)
    throw new Error(
      `steptrace: stack requires integer "capacity" from 3 to 8 with no more values than slots.`,
    )
  return { capacity, values }
}

export const stack = {
  id: "stack",
  family: "stack-sequence",
  meta: { label: "Stack" },
  parse: parseStackConfig,
  mount: mountStack,
} satisfies InteractiveStructureDefinition<StackConfig>
