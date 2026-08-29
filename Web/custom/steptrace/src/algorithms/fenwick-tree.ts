import { mountFenwickTree, type FenwickTreeConfig } from "../families/range-aggregate"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [3, 1, 4, 1, 5, 9, 2, 6]

export function parseFenwickTreeConfig(config: StepTraceConfig): FenwickTreeConfig {
  const values = Array.isArray(config.array) && config.array.length ? config.array : DEFAULT_VALUES
  if (
    values.length < 4 ||
    values.length > 8 ||
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(`steptrace: fenwick-tree requires 4 to 8 finite integer values.`)
  return { values: values as number[] }
}

export const fenwickTree = {
  id: "fenwick-tree",
  family: "range-aggregate",
  meta: { label: "Fenwick Tree" },
  parse: parseFenwickTreeConfig,
  mount: mountFenwickTree,
} satisfies InteractiveStructureDefinition<FenwickTreeConfig>
