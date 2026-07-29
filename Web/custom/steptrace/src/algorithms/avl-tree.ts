import { mountAvlTree, parseBinaryTreeConfig, type BinaryTreeConfig } from "../families/binary-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [40, 20, 60, 10, 30, 50, 70]

export const parseAvlTreeConfig = (config: StepTraceConfig) =>
  parseBinaryTreeConfig(config, "avl-tree", DEFAULT_VALUES, 11)

export const avlTree = {
  id: "avl-tree",
  family: "binary-tree",
  meta: { label: "AVL Tree" },
  parse: parseAvlTreeConfig,
  mount: mountAvlTree,
} satisfies InteractiveStructureDefinition<BinaryTreeConfig>
