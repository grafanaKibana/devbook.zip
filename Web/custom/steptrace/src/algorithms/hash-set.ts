import { mountHashSet, type HashSetConfig } from "../families/hash-index"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseHashSetConfig(config: StepTraceConfig): HashSetConfig {
  if (config.variant != null && config.variant !== "open-addressing")
    throw new Error(`steptrace: hash-set "variant" must be "open-addressing".`)
  if (config.capacity != null && config.capacity !== 12)
    throw new Error(`steptrace: hash-set uses fixed "capacity" 12.`)
  return { strategy: "open-addressing" }
}

export const hashSet = {
  id: "hash-set",
  family: "hash-index",
  meta: { label: "Hash Set" },
  parse: parseHashSetConfig,
  mount: mountHashSet,
} satisfies InteractiveStructureDefinition<HashSetConfig>
