import {
  mountSplayTree,
  parseBinaryTreeConfig,
  type BinaryTreeConfig,
} from "../families/binary-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [100, 50, 150, 25, 75, 60]

export const splayTree = {
  id: "splay-tree",
  family: "binary-tree",
  meta: { label: "Splay Tree" },
  parse: (config: StepTraceConfig) => parseBinaryTreeConfig(config, "splay-tree", DEFAULT_VALUES),
  mount: mountSplayTree,
} satisfies InteractiveStructureDefinition<BinaryTreeConfig>
