import { mountHashMap, type HashMapConfig, type HashMapStrategy } from "../families/hash-index"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const STRATEGIES = new Set<HashMapStrategy>(["closed-addressing", "open-addressing", "buckets"])

export function parseHashMapConfig(config: StepTraceConfig): HashMapConfig {
  const strategy = config.variant ?? "closed-addressing"
  if (!STRATEGIES.has(strategy as HashMapStrategy))
    throw new Error(
      `steptrace: hash-map "variant" must be "closed-addressing", "open-addressing", or "buckets".`,
    )
  if (config.capacity != null && config.capacity !== 12)
    throw new Error(`steptrace: hash-map uses fixed "capacity" 12.`)
  return { strategy: strategy as HashMapStrategy }
}

export const hashMap = {
  id: "hash-map",
  family: "hash-index",
  meta: { label: "HashMap" },
  parse: parseHashMapConfig,
  mount: mountHashMap,
} satisfies InteractiveStructureDefinition<HashMapConfig>
