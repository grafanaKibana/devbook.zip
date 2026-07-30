import { mountDynamicArray, type DynamicArrayConfig } from "../families/contiguous-storage"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [12, 7, 31]

export function parseDynamicArrayConfig(config: StepTraceConfig): DynamicArrayConfig {
  const values = (config.values?.length ? config.values : DEFAULT_VALUES).map(String)
  const capacity = config.capacity ?? 4
  if (!Number.isInteger(capacity) || capacity < 3 || capacity > 5 || values.length > capacity)
    throw new Error(
      `steptrace: dynamic-array requires integer "capacity" from 3 to 5 with no more values than slots.`,
    )
  return { capacity, values }
}

export const dynamicArray = {
  id: "dynamic-array",
  family: "contiguous-storage",
  meta: { label: "Dynamic Array" },
  parse: parseDynamicArrayConfig,
  mount: mountDynamicArray,
} satisfies InteractiveStructureDefinition<DynamicArrayConfig>
