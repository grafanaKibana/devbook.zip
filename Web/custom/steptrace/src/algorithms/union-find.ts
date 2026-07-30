import { mountUnionFind, type UnionFindConfig } from "../families/union-find"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

export function parseUnionFindConfig(config: StepTraceConfig): UnionFindConfig {
  const size = typeof config.n === "number" ? config.n : 7
  if (!Number.isInteger(size) || size < 4 || size > 7)
    throw new Error(`steptrace: union-find requires integer "n" from 4 to 7.`)
  return { size }
}

export const unionFind = {
  id: "union-find",
  family: "union-find",
  meta: { label: "Union-Find" },
  parse: parseUnionFindConfig,
  mount: mountUnionFind,
} satisfies InteractiveStructureDefinition<UnionFindConfig>
