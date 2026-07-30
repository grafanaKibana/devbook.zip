import { mountGraphRepresentation } from "../families/graph-representation"
import type { InteractiveStructureDefinition } from "../types"

export const graphStructure = {
  id: "graph",
  family: "graph-representation",
  meta: { label: "Graph" },
  parse: () => ({}),
  mount: mountGraphRepresentation,
} satisfies InteractiveStructureDefinition<Record<string, never>>
