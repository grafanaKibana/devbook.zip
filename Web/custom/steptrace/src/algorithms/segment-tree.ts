import { mountSegmentTree, type SegmentTreeConfig } from "../families/range-aggregate"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [3, 4, 1, 7, 2, 6, 5, 8]

export function parseSegmentTreeConfig(config: StepTraceConfig): SegmentTreeConfig {
  const values = Array.isArray(config.array) && config.array.length ? config.array : DEFAULT_VALUES
  if (
    values.length < 4 ||
    values.length > 8 ||
    values.some(
      (value) =>
        typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error(`steptrace: segment-tree requires 4 to 8 finite integer values.`)
  return { values: values as number[] }
}

export const segmentTree = {
  id: "segment-tree",
  family: "range-aggregate",
  meta: { label: "Segment Tree" },
  parse: parseSegmentTreeConfig,
  mount: mountSegmentTree,
} satisfies InteractiveStructureDefinition<SegmentTreeConfig>
