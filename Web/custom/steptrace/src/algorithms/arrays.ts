import { mountArray, type ArrayConfig } from "../families/contiguous-storage"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [12, 7, 31, 18, 9, 25]

export function parseArrayConfig(config: StepTraceConfig): ArrayConfig {
  const values = (config.values?.length ? config.values : DEFAULT_VALUES).map(String)
  const capacity = config.capacity ?? values.length
  if (!Number.isInteger(capacity) || capacity < 3 || capacity > 10 || values.length > capacity)
    throw new Error(
      `steptrace: arrays requires integer "capacity" from 3 to 10 with no more values than slots.`,
    )
  return { capacity, values }
}

export const arrays = {
  id: "arrays",
  family: "contiguous-storage",
  meta: { label: "Arrays" },
  parse: parseArrayConfig,
  mount: mountArray,
} satisfies InteractiveStructureDefinition<ArrayConfig>
