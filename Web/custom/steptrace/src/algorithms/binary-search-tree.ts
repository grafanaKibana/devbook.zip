import {
  mountBinarySearchTree,
  parseBinaryTreeConfig,
  type BinaryTreeConfig,
} from "../families/binary-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [40, 20, 60, 10, 30, 50, 70]

export const binarySearchTree = {
  id: "binary-search-tree",
  family: "binary-tree",
  meta: { label: "Binary Search Tree" },
  parse: (config: StepTraceConfig) =>
    parseBinaryTreeConfig(config, "binary-search-tree", DEFAULT_VALUES),
  mount: mountBinarySearchTree,
} satisfies InteractiveStructureDefinition<BinaryTreeConfig>
