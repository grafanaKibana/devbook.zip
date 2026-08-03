import {
  mountBTree,
  parseMultiwayTreeConfig,
  type MultiwayTreeConfig,
} from "../families/multiway-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [10, 20, 5]

export const bTree = {
  id: "b-tree",
  family: "multiway-tree",
  meta: { label: "B-tree" },
  parse: (config: StepTraceConfig) => parseMultiwayTreeConfig(config, "b-tree", DEFAULT_VALUES, 6),
  mount: mountBTree,
} satisfies InteractiveStructureDefinition<MultiwayTreeConfig>
