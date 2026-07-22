import { builtInAlgorithms } from "./algorithms"
import { adjacency } from "./graph"
import { createMount } from "./mount"
import { createRegistry } from "./registry"
import type { StepTraceApi } from "./types"

const VERSION = "2.0.0"
const registry = createRegistry(builtInAlgorithms)
const mount = createMount(registry)

// The composition root is the complete engine body. Imports define dependency
// order; the explicit built-in list defines product registration order.
export const steptrace: StepTraceApi = {
  VERSION,
  ...registry,
  adjacency,
  mount,
}

export type {
  AlgorithmKind,
  AlgorithmMeta,
  MountHandle,
  StepTraceApi,
  StepTraceBlockConfig,
  StepTraceConfig,
  StepTraceHost,
  StepTraceTabConfig,
  StepTraceTabsConfig,
} from "./types"
