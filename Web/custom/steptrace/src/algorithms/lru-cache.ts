import { mountLruCache } from "../families/linked-topology"
import type { InteractiveStructureDefinition } from "../types"

export const lruCache = {
  id: "lru-cache",
  family: "linked-topology",
  meta: { label: "LRU Cache" },
  parse: () => ({}),
  mount: mountLruCache,
} satisfies InteractiveStructureDefinition<Record<string, never>>
