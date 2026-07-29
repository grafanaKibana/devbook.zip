import { mountAvlTree, type AvlTreeConfig } from "../families/binary-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [40, 20, 60, 10, 30, 50, 70]

export function parseAvlTreeConfig(config: StepTraceConfig): AvlTreeConfig {
  const values =
    Array.isArray(config.values) && config.values.length ? config.values : DEFAULT_VALUES
  if (
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value),
    )
  )
    throw new Error("steptrace: avl-tree requires finite integer values.")
  if (new Set(values).size !== values.length)
    throw new Error("steptrace: avl-tree requires unique values.")
  if (values.length > 11) throw new Error("steptrace: avl-tree supports at most 11 values.")
  const value = config.value
  if (
    value != null &&
    (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value))
  )
    throw new Error("steptrace: avl-tree value must be a finite integer.")
  return { values: values as number[], value: value as number | undefined }
}

export const avlTree = {
  id: "avl-tree",
  family: "binary-tree",
  meta: { label: "AVL Tree" },
  parse: parseAvlTreeConfig,
  mount: mountAvlTree,
} satisfies InteractiveStructureDefinition<AvlTreeConfig>
