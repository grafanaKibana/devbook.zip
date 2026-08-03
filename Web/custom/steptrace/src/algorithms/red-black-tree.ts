import {
  mountRedBlackTree,
  parseBinaryTreeConfig,
  type BinaryTreeConfig,
} from "../families/binary-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [10, 5, 15, 1]

export const redBlackTree = {
  id: "red-black-tree",
  family: "binary-tree",
  meta: { label: "Red-Black Tree" },
  parse: (config: StepTraceConfig) =>
    parseBinaryTreeConfig(config, "red-black-tree", DEFAULT_VALUES),
  mount: mountRedBlackTree,
} satisfies InteractiveStructureDefinition<BinaryTreeConfig>
