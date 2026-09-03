export type VisualStateName = "normal" | "busy" | "warning" | "overloaded" | "inactive"
export type Direction = "forward" | "reverse"

export interface NodeVisual {
  readonly metric?: string
  readonly load?: number
  readonly loadLabel?: string
  readonly state: VisualStateName
}

export interface EdgeVisual {
  readonly radius: number
  readonly particlesPerCycle: number
  readonly direction: Direction
  readonly delayMs: number
  readonly visible: boolean
  readonly travelMs: number
  readonly state: VisualStateName
}

export interface VisualState {
  readonly nodes: Readonly<Record<string, NodeVisual>>
  readonly edges: Readonly<Record<string, EdgeVisual>>
}

export type NodePatch = Partial<NodeVisual>
export type EdgePatch = Partial<EdgeVisual>
export interface VisualPatch {
  readonly nodes: Readonly<Record<string, NodePatch>>
  readonly edges: Readonly<Record<string, EdgePatch>>
}

export interface ScenarioControl {
  readonly id: string
  readonly type: "scenario"
  readonly label: string
  readonly default: string
  readonly options: readonly string[]
}

export interface RangeControl {
  readonly id: string
  readonly type: "range"
  readonly label: string
  readonly min: number
  readonly max: number
  readonly step: number
  readonly default: number
}

export interface ResetControl {
  readonly id: string
  readonly type: "reset"
  readonly label: string
}

export type Control = ScenarioControl | RangeControl | ResetControl
export type ControlValues = Readonly<Record<string, string | number>>

export type NodeProperty = keyof NodeVisual
export type EdgeProperty = keyof EdgeVisual
export type Target =
  | { readonly node: string; readonly property: NodeProperty }
  | { readonly edge: string; readonly property: EdgeProperty }

export interface Scenario {
  readonly id: string
  readonly patch: VisualPatch
}

export interface Binding {
  readonly control: string
  readonly target: Target
  readonly format?: string
  readonly transform?: NumericTransform
}

export interface NumericTransform {
  readonly scale?: number
  readonly offset?: number
  readonly min?: number
  readonly max?: number
  readonly round?: boolean
}

export interface QueueSimulation {
  readonly control: string
  readonly arrival: NumericTransform
  readonly capacityPerSecond: number
  readonly queueNode: string
  readonly consumerNode: string
  readonly queueFormat: string
  readonly consumerFormat: string
}

export type ThresholdBand =
  | { readonly below: number; readonly value: string | number | boolean }
  | { readonly otherwise: string | number | boolean }

export interface Threshold {
  readonly control: string
  readonly target: Target
  readonly bands: readonly ThresholdBand[]
}

export interface NormalizedConfig {
  readonly version: 1
  readonly for: string
  readonly defaults: VisualState
  readonly controls: readonly Control[]
  readonly scenarios: readonly Scenario[]
  readonly bindings: readonly Binding[]
  readonly thresholds: readonly Threshold[]
  readonly queues: readonly QueueSimulation[]
  readonly initialControls: ControlValues
}

export interface RangeSliderOptions {
  readonly min: number
  readonly max: number
  readonly step: number
  readonly value: number
  readonly label: string
  readonly format: (value: number) => string
  readonly onChange: (value: number) => void
}

export interface RangeSliderHandle {
  readonly element: HTMLInputElement
  setValue(value: number): void
  destroy(): void
}

export interface MermaidFlowHost {
  createRangeSlider?(container: HTMLElement, options: RangeSliderOptions): RangeSliderHandle
}

export interface ConfigDiagnostic {
  readonly code: "runtime-schema-invalid"
  readonly path: string
  readonly message: string
}

export type ConfigResult =
  | { readonly ok: true; readonly config: NormalizedConfig }
  | { readonly ok: false; readonly error: ConfigDiagnostic }
