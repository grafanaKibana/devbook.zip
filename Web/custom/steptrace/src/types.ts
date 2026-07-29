import type {
  BacktrackRecorder,
  BitsRecorder,
  DPRecorder,
  GraphRecorder,
  PointerRecorder,
  RecTreeRecorder,
  SearchRecorder,
  SortRecorder,
  StringRecorder,
  UnionFindRecorder,
} from "./recorders"
import type { RawGraphEdge, RawGraphNode, StepTraceGraph } from "./graph"

export type AlgorithmKind =
  | "sort"
  | "graph"
  | "search"
  | "string"
  | "pointers"
  | "dp"
  | "unionfind"
  | "bits"
  | "backtrack"
  | "rectree"

export type VisualFamilyId =
  | "array-sort"
  | "distribution-sort"
  | "dp-story"
  | "execution-tree"
  | "graph-state"
  | "heap-selection"
  | "indexed-array-search"
  | "interval-track"
  | "linked-topology"
  | "matrix-grid"
  | "monotone-boundary"
  | "prefix-character"
  | "prefix-sum"
  | "run-stack"
  | "stack-sequence"
  | "contiguous-storage"
  | "hash-index"
  | "graph-representation"
  | "range-aggregate"
  | "binary-tree"
  | "union-find"

export interface AlgorithmMeta {
  label: string
  frontierLabel?: string
}

// Algorithms intentionally share one flat fence configuration. The index
// signature keeps extension algorithms possible while the named fields document
// the built-in contract and give the engine/hosts a stable public type.
export interface AlgorithmInput {
  [key: string]: unknown
  algorithm: string
  array: number[]
  target: any
  radix: number
  bucketCount: number
  mode: string
  text: string
  pattern: string
  patterns: string[]
  a: string
  b: string
  n: number
  x: number
  value: number
  width: number
  ops: Array<[string, number, number?]>
  operations: Array<[string, string]>
  start: string
  directed: boolean
}

export interface StepTraceConfig extends Partial<Omit<AlgorithmInput, "algorithm">> {
  algorithm: string
  nodes?: Array<RawGraphNode | number>
  edges?: Array<RawGraphEdge | [number, number, number]>
  speed?: number
  radix?: number
  mode?: string
  bucketCount?: number
  gaps?: number[]
  intervals?: Array<[number, number]>
  shrinkFactor?: number
  depthLimit?: number
  smallPartitionThreshold?: number
  minrun?: number
  values?: number[]
  goal?: string
  weights?: number[]
  days?: number
  blockSize?: number
  variant?: string
  range?: [number, number]
  k?: number
  capacity?: number
}

export interface StepTraceTabConfig extends StepTraceConfig {
  name: string
  description?: string
}

export interface StepTraceTabsConfig {
  tabs: StepTraceTabConfig[]
  selected?: number
}

export type StepTraceBlockConfig = StepTraceConfig | StepTraceTabsConfig

export interface StepTraceView<TFrame = unknown> {
  nodes: HTMLElement[]
  stageLayout?: "compact" | "fill"
  stageAlignment?: "bottom" | "center"
  stableStage?: boolean
  paint(frame: TFrame, index?: number, total?: number): void
  watch?(frame: TFrame): WatchRow[]
  summary?(frame: TFrame): string
  destroy?(): void
}

export interface WatchRow {
  k: string
  v: unknown
  sw?: string
  hint?: string
}

export interface VisualFamily<TConfig, TRecorder, TFrame> {
  id: VisualFamilyId
  createRecorder(config: TConfig): TRecorder
  createView(frames: readonly TFrame[]): StepTraceView<TFrame>
}

export interface InteractiveStructureDefinition<TConfig = unknown> {
  id: string
  family: VisualFamilyId
  meta: AlgorithmMeta
  parse(config: StepTraceConfig): TConfig
  mount(root: HTMLElement, config: TConfig): MountHandle
}

interface AlgorithmDefinition<
  TKind extends AlgorithmKind,
  TRecorder,
  TExtra extends unknown[] = [],
> {
  id: string
  kind: TKind
  meta: AlgorithmMeta
  run(input: AlgorithmInput, recorder: TRecorder, ...extra: TExtra): void
}

export type SortAlgorithmDefinition = AlgorithmDefinition<"sort", SortRecorder>

export interface FamilyAlgorithmDefinition<
  TKind extends AlgorithmKind,
  TConfig,
  TRecorder,
  TFrame,
> {
  id: string
  kind: TKind
  family: VisualFamily<TConfig, TRecorder, TFrame>
  meta: AlgorithmMeta
  parse(config: StepTraceConfig): TConfig
  run(input: TConfig, recorder: TRecorder): void
}
export type GraphAlgorithmDefinition = AlgorithmDefinition<"graph", GraphRecorder, [StepTraceGraph]>
export type SearchAlgorithmDefinition = AlgorithmDefinition<"search", SearchRecorder>
export type StringVisualProfile = "match" | "z-array" | "boyer-moore"
export interface StringAlgorithmDefinition extends AlgorithmDefinition<"string", StringRecorder> {
  profile?: StringVisualProfile
}
export type PointerAlgorithmDefinition = AlgorithmDefinition<"pointers", PointerRecorder>
export type DPAlgorithmDefinition = AlgorithmDefinition<"dp", DPRecorder>
export type UnionFindAlgorithmDefinition = AlgorithmDefinition<"unionfind", UnionFindRecorder>
export type BitsAlgorithmDefinition = AlgorithmDefinition<"bits", BitsRecorder>
export type BacktrackAlgorithmDefinition = AlgorithmDefinition<"backtrack", BacktrackRecorder>
export type RecTreeAlgorithmDefinition = AlgorithmDefinition<"rectree", RecTreeRecorder>

export type BuiltInAlgorithm =
  | SortAlgorithmDefinition
  | FamilyAlgorithmDefinition<AlgorithmKind, unknown, unknown, unknown>
  | GraphAlgorithmDefinition
  | SearchAlgorithmDefinition
  | StringAlgorithmDefinition
  | PointerAlgorithmDefinition
  | DPAlgorithmDefinition
  | UnionFindAlgorithmDefinition
  | BitsAlgorithmDefinition
  | BacktrackAlgorithmDefinition
  | RecTreeAlgorithmDefinition

export interface BuiltFrames {
  kind: AlgorithmKind
  frames: any[]
  family?: VisualFamily<unknown, unknown, unknown>
  graph?: StepTraceGraph
  frontierLabel?: string
  endpointSettings?: EndpointSettings
}

export interface EndpointSettings {
  startLabel: string
  targetLabel: string
  options: Array<{ value: string; label: string }>
  start: string
  target: string
}

export interface GraphStateNode {
  id: string
  label: string
  x: number
  y: number
}

export interface GraphStateEdge {
  from: string
  to: string
  weight: number
  directed?: boolean
  label?: string
  showDirection?: boolean
}

export type GraphStateDecor =
  | {
      kind: "rect"
      className: string
      x: number
      y: number
      width: number
      height: number
      rx?: number
    }
  | { kind: "line"; className: string; x1: number; y1: number; x2: number; y2: number }
  | { kind: "path"; className: string; d: string }
  | { kind: "text"; className: string; x: number; y: number; text: string }

export type GraphStateNodeRole =
  "neutral" | "frontier" | "active" | "closed" | "accepted" | "rejected"

export type GraphStateEdgeRole =
  "neutral" | "active" | "candidate" | "accepted" | "rejected" | "cut" | "residual"

export interface GraphStateScore {
  id: string
  g: number
  h: number
  f: number
}

export type GraphStateDetail =
  | {
      kind: "heuristic-search"
      policy: "a-star" | "greedy"
      open: readonly GraphStateScore[]
      closed: readonly string[]
      costs: Readonly<Record<string, number>>
      heuristic: Readonly<Record<string, number>>
      comparison: {
        primaryLabel: string
        primaryValue: number | null
        baselineLabel: string
        baselineValue: number | null
        metric: "expansions" | "cost"
      }
    }
  | {
      kind: "dual-search"
      forward: readonly string[]
      backward: readonly string[]
      visited: readonly string[]
      meeting: string | null
    }
  | {
      kind: "edge-relaxation"
      pass: number
      edge: readonly [string, string] | null
      distances: Readonly<Record<string, number>>
      changed: boolean
    }
  | {
      kind: "component-flood"
      component: number
      frontier: readonly string[]
      visited: readonly string[]
      groups?: readonly (readonly string[])[]
    }
  | {
      kind: "low-link-cuts"
      discovery: Readonly<Record<string, number>>
      low: Readonly<Record<string, number>>
      articulationPoints: readonly string[]
      bridges: readonly (readonly [string, string])[]
    }
  | {
      kind: "low-link-components"
      discovery: Readonly<Record<string, number>>
      low: Readonly<Record<string, number>>
      stack: readonly string[]
      components: readonly (readonly string[])[]
    }
  | {
      kind: "mst-scan"
      pending: readonly GraphStateEdge[]
      accepted: readonly GraphStateEdge[]
      totalWeight: number
      components?: readonly (readonly string[])[]
    }
  | {
      kind: "mst-round"
      round: number
      components: readonly (readonly string[])[]
      choices: readonly GraphStateEdge[]
      totalWeight: number
    }
  | {
      kind: "path-backtrack"
      path: readonly string[]
      candidates: readonly string[]
      rejected: readonly string[]
    }
  | {
      kind: "residual-flow"
      augmentingPath: readonly string[]
      bottleneck: number | null
      totalFlow: number
      flow: Readonly<Record<string, number>>
    }

export interface GraphStateFrame {
  type: string
  profile: string
  nodes: readonly GraphStateNode[]
  edges: readonly GraphStateEdge[]
  decor: readonly GraphStateDecor[]
  start: string | null
  target: string | null
  currentNode: string | null
  currentEdge: readonly [string, string] | null
  selectedEdges: readonly string[]
  nodeState: Readonly<Record<string, GraphStateNodeRole>>
  edgeState: Readonly<Record<string, GraphStateEdgeRole>>
  message: string
  detail: GraphStateDetail
}

export interface SpeedSliderOptions {
  min: number
  max: number
  step: number
  value: number
  label: string
  format(value: number): string
  onChange(value: number): void
}

export interface HostControlHandle {
  destroy(): void
}

export interface StepTraceHost {
  createSpeedSlider?(container: HTMLElement, options: SpeedSliderOptions): HostControlHandle
}

export interface MountHandle {
  pause?(): void
  destroy(): void
}

export interface StepTraceApi {
  VERSION: string
  registerSort(id: string, meta: AlgorithmMeta, run: SortAlgorithmDefinition["run"]): void
  registerGraph(id: string, meta: AlgorithmMeta, run: GraphAlgorithmDefinition["run"]): void
  registerSearch(id: string, meta: AlgorithmMeta, run: SearchAlgorithmDefinition["run"]): void
  registerString(
    id: string,
    meta: AlgorithmMeta,
    run: StringAlgorithmDefinition["run"],
    profile?: StringVisualProfile,
  ): void
  registerPointer(id: string, meta: AlgorithmMeta, run: PointerAlgorithmDefinition["run"]): void
  registerDP(id: string, meta: AlgorithmMeta, run: DPAlgorithmDefinition["run"]): void
  registerUnionFind(id: string, meta: AlgorithmMeta, run: UnionFindAlgorithmDefinition["run"]): void
  registerBits(id: string, meta: AlgorithmMeta, run: BitsAlgorithmDefinition["run"]): void
  registerBacktrack(id: string, meta: AlgorithmMeta, run: BacktrackAlgorithmDefinition["run"]): void
  registerRecTree(id: string, meta: AlgorithmMeta, run: RecTreeAlgorithmDefinition["run"]): void
  listAlgorithms(kind: AlgorithmKind): Array<{ id: string; label: string }>
  kindOf(id: string): AlgorithmKind | null
  buildFrames(config: StepTraceConfig): BuiltFrames
  adjacency(graph: StepTraceGraph): Record<string, string[]>
  mount(root: HTMLElement, config: StepTraceBlockConfig, host?: StepTraceHost): MountHandle
}
