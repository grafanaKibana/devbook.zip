import {
  mountBPlusTree,
  parseMultiwayTreeConfig,
  type MultiwayTreeConfig,
} from "../families/multiway-tree"
import type { InteractiveStructureDefinition, StepTraceConfig } from "../types"

const DEFAULT_VALUES = [5, 9, 12, 17, 33, 40, 21]

export const bPlusTree = {
  id: "b-plus-tree",
  family: "multiway-tree",
  meta: { label: "B+ Tree" },
  parse: (config: StepTraceConfig) =>
    parseMultiwayTreeConfig(config, "b-plus-tree", DEFAULT_VALUES, 25, [15, 40]),
  mount: mountBPlusTree,
} satisfies InteractiveStructureDefinition<MultiwayTreeConfig>
