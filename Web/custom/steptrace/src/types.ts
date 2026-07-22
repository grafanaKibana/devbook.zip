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
  "array-sort" | "execution-tree" | "indexed-array-search" | "matrix-grid"

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
  text: string
  pattern: string
  a: string
  b: string
  n: number
  x: number
  value: number
  width: number
  ops: Array<[string, number, number?]>
  start: string
  directed: boolean
}

export interface StepTraceConfig extends Partial<Omit<AlgorithmInput, "algorithm">> {
  algorithm: string
  nodes?: Array<RawGraphNode | number>
  edges?: Array<RawGraphEdge | [number, number, number]>
  speed?: number
  gaps?: number[]
  shrinkFactor?: number
  depthLimit?: number
  smallPartitionThreshold?: number
  values?: number[]
  goal?: string
  blockSize?: number
}

export interface StepTraceView<TFrame = unknown> {
  nodes: HTMLElement[]
  stageLayout?: "compact" | "fill"
  paint(frame: TFrame): void
  watch?(frame: TFrame): WatchRow[]
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
export type StringAlgorithmDefinition = AlgorithmDefinition<"string", StringRecorder>
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
  destroy(): void
}

export interface StepTraceApi {
  VERSION: string
  registerSort(id: string, meta: AlgorithmMeta, run: SortAlgorithmDefinition["run"]): void
  registerGraph(id: string, meta: AlgorithmMeta, run: GraphAlgorithmDefinition["run"]): void
  registerSearch(id: string, meta: AlgorithmMeta, run: SearchAlgorithmDefinition["run"]): void
  registerString(id: string, meta: AlgorithmMeta, run: StringAlgorithmDefinition["run"]): void
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
  mount(root: HTMLElement, config: StepTraceConfig, host?: StepTraceHost): MountHandle
}
