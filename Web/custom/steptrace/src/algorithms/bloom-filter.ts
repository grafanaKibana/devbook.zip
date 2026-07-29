import { mountBloomFilter, type BloomFilterConfig } from "../families/hash-index"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseBloomFilterConfig(config: StepTraceConfig): BloomFilterConfig {
  if (config.variant != null)
    throw new Error(`steptrace: bloom-filter does not accept a "variant".`)
  if (config.capacity != null && config.capacity !== 10)
    throw new Error(`steptrace: bloom-filter uses fixed "capacity" 10.`)
  return { capacity: 10 }
}

export const bloomFilter = {
  id: "bloom-filter",
  family: "hash-index",
  meta: { label: "Bloom Filter" },
  parse: parseBloomFilterConfig,
  mount: mountBloomFilter,
} satisfies InteractiveStructureDefinition<BloomFilterConfig>
