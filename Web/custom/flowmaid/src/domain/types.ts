export type FlowmaidValue = string | number | boolean | readonly FlowmaidValue[] | FlowmaidObject

export interface FlowmaidObject {
  readonly [key: string]: FlowmaidValue
}

export interface FlowmaidDiagnostic {
  readonly code:
    "carrier-invalid" | "yaml-invalid" | "schema-invalid" | "graph-invalid" | "runtime-invalid"
  readonly path: string
  readonly message: string
  readonly line?: number
  readonly column?: number
}

export interface Control {
  readonly id: string
  readonly label: string
  readonly min: number
  readonly max: number
  readonly value: number
  readonly step: number
  readonly unit?: string
}

export interface Source {
  readonly rate: number | string
  readonly nodes: readonly string[]
}

export type DistributionStrategy = "roundRobin" | "weightedRoundRobin" | "random" | "broadcast"

export interface Distribution {
  readonly node: string
  readonly strategy: DistributionStrategy
  readonly weights?: Readonly<Record<string, number>>
}

export interface QueueDefinition {
  readonly node: string
  readonly capacity: number
}

export interface DotDefaults {
  readonly radius: number
  readonly durationMs: number
}

export interface FlowmaidProgram {
  readonly controls: readonly Control[]
  readonly initialControls: Readonly<Record<string, number>>
  readonly sources: readonly Source[]
  readonly distributions: readonly Distribution[]
  readonly queues: readonly QueueDefinition[]
  readonly dots: DotDefaults
}

export interface GraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
}

export interface DirectedGraph {
  readonly nodes: readonly string[]
  readonly edges: readonly GraphEdge[]
}

export type SemanticState = "normal" | "busy" | "warning" | "overloaded" | "inactive"

export interface NodeSnapshot {
  readonly rate: number
  readonly queued: number
  readonly processed: number
  readonly capacity?: number
  readonly load?: number
  readonly loadLabel?: string
  readonly metric: string
  readonly state: SemanticState
}

export interface EdgeSnapshot {
  readonly rate: number
  readonly records: number
  readonly dots: number
  readonly radius: number
  readonly durationMs: number
  readonly state: SemanticState
}

export interface SimulationSnapshot {
  readonly controls: Readonly<Record<string, number>>
  readonly nodes: Readonly<Record<string, NodeSnapshot>>
  readonly edges: Readonly<Record<string, EdgeSnapshot>>
}

export interface RangeSliderOptions {
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly value: number
  readonly format: (value: number) => string
  readonly onInput: (value: number) => void
}

export interface RangeSliderHandle {
  readonly element: HTMLElement
  setValue(value: number): void
  destroy(): void
}

export interface ControlHost {
  createRangeSlider?(container: HTMLElement, options: RangeSliderOptions): RangeSliderHandle
}

export interface ClockDependencies {
  readonly now: () => number
  readonly setInterval: (callback: () => void, milliseconds: number) => unknown
  readonly clearInterval: (handle: unknown) => void
}
