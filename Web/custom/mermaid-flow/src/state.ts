import type {
  ControlValues,
  EdgeVisual,
  NodeVisual,
  NormalizedConfig,
  QueueSimulation,
  Target,
  VisualState,
} from "./types"
import { transformNumber } from "./numeric"

export interface StateSnapshot {
  controls: ControlValues
  visual: VisualState
}

export interface LocalState {
  current(): StateSnapshot
  update(control: string, value: string | number): StateSnapshot
  advance(elapsedMs: number): StateSnapshot
  reset(): StateSnapshot
}

export class StateError extends Error {
  constructor(message: string) {
    super(`mermaid-flow state: ${message}`)
    this.name = "StateError"
  }
}

interface MutableVisual {
  nodes: Record<string, NodeVisual>
  edges: Record<string, EdgeVisual>
}

const cloneVisual = (source: VisualState): MutableVisual => ({
  nodes: Object.fromEntries(Object.entries(source.nodes).map(([id, value]) => [id, { ...value }])),
  edges: Object.fromEntries(Object.entries(source.edges).map(([id, value]) => [id, { ...value }])),
})

interface QueueRuntime {
  queued: number
  processed: number
  serviceRate: number
}

const integerFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })

const arrivalRate = (queue: QueueSimulation, controls: ControlValues): number => {
  const value = controls[queue.control]
  if (typeof value !== "number")
    throw new StateError(`queue control ${queue.control} is not numeric`)
  return transformNumber(value, queue.arrival)
}

const metric = (
  format: string,
  value: number,
  arrival: number,
  service: number,
  capacity: number,
): string =>
  format
    .replaceAll("{value}", integerFormat.format(Math.floor(Math.max(0, value) + 1e-9)))
    .replaceAll("{arrival}", integerFormat.format(arrival))
    .replaceAll("{rate}", integerFormat.format(service))
    .replaceAll("{capacity}", integerFormat.format(capacity))

const normalizedControls = (
  config: NormalizedConfig,
  current: Readonly<ControlValues>,
): ControlValues => {
  const declared = new Map(config.controls.map((control) => [control.id, control]))
  for (const id of Object.keys(current)) {
    const control = declared.get(id)
    if (!control || control.type === "reset") throw new StateError(`unknown value control ${id}`)
  }
  const values: Record<string, string | number> = { ...config.initialControls }
  for (const control of config.controls) {
    if (control.type === "reset") continue
    const value = current[control.id] ?? control.default
    if (control.type === "scenario") {
      if (typeof value !== "string" || !control.options.includes(value))
        throw new StateError(`invalid scenario ${String(value)} for ${control.id}`)
    } else if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < control.min ||
      value > control.max
    ) {
      throw new StateError(`invalid range value ${String(value)} for ${control.id}`)
    }
    values[control.id] = value
  }
  return values
}

const targetValue = (visual: MutableVisual, target: Target): Record<string, unknown> => {
  const node = "node" in target
  const values = node ? visual.nodes : visual.edges
  const id = node ? target.node : target.edge
  const value = values[id]
  if (!value) throw new StateError(`unknown ${node ? "node" : "edge"} ${id}`)
  return value as unknown as Record<string, unknown>
}

const applyScenario = (
  visual: MutableVisual,
  config: NormalizedConfig,
  controls: ControlValues,
): void => {
  const selector = config.controls.find((control) => control.type === "scenario")
  if (!selector) return
  const selected = controls[selector.id]
  const scenario = config.scenarios.find((value) => value.id === selected)
  if (!scenario) throw new StateError(`unknown scenario ${String(selected)}`)
  for (const [id, patch] of Object.entries(scenario.patch.nodes ?? {})) {
    const current = visual.nodes[id]
    if (!current) throw new StateError(`unknown node ${id}`)
    visual.nodes[id] = { ...current, ...patch } as NodeVisual
  }
  for (const [id, patch] of Object.entries(scenario.patch.edges ?? {})) {
    const current = visual.edges[id]
    if (!current) throw new StateError(`unknown edge ${id}`)
    visual.edges[id] = { ...current, ...patch } as EdgeVisual
  }
}

export const recompute = (
  config: NormalizedConfig,
  current: Readonly<ControlValues> = {},
): StateSnapshot => {
  const controls = normalizedControls(config, current)
  const visual = cloneVisual(config.defaults)
  applyScenario(visual, config, controls)

  for (const binding of config.bindings) {
    const controlValue = controls[binding.control]
    if (typeof controlValue !== "number")
      throw new StateError(`binding control ${binding.control} is not numeric`)
    const value = transformNumber(controlValue, binding.transform)
    targetValue(visual, binding.target)[binding.target.property] = binding.format
      ? binding.format.replace("{value}", String(value))
      : value
  }

  for (const threshold of config.thresholds) {
    const value = controls[threshold.control]
    if (typeof value !== "number")
      throw new StateError(`threshold control ${threshold.control} is not numeric`)
    const band = threshold.bands.find(
      (candidate) => "otherwise" in candidate || ("below" in candidate && value < candidate.below),
    )
    if (!band) throw new StateError(`threshold ${threshold.control} has no matching band`)
    targetValue(visual, threshold.target)[threshold.target.property] =
      "otherwise" in band ? band.otherwise : band.value
  }

  return { controls, visual }
}

export const createLocalState = (config: NormalizedConfig): LocalState => {
  let controls = { ...config.initialControls }
  const queueConfig = config.queues ?? []
  const queues: QueueRuntime[] = queueConfig.map((queue) => ({
    queued: 0,
    processed: 0,
    serviceRate: Math.min(arrivalRate(queue, controls), queue.capacityPerSecond),
  }))
  const build = (): StateSnapshot => {
    const base = recompute(config, controls)
    if (!queueConfig.length) return base
    const visual = cloneVisual(base.visual)
    queueConfig.forEach((queue, index) => {
      const current = queues[index]!
      const arrival = arrivalRate(queue, base.controls)
      visual.nodes[queue.queueNode] = {
        ...visual.nodes[queue.queueNode]!,
        load: arrival / queue.capacityPerSecond,
        loadLabel: `${integerFormat.format(arrival)}/${integerFormat.format(queue.capacityPerSecond)}`,
        metric: metric(
          queue.queueFormat,
          current.queued,
          arrival,
          current.serviceRate,
          queue.capacityPerSecond,
        ),
      }
      visual.nodes[queue.consumerNode] = {
        ...visual.nodes[queue.consumerNode]!,
        load: current.serviceRate / queue.capacityPerSecond,
        loadLabel: `${integerFormat.format(current.serviceRate)}/${integerFormat.format(queue.capacityPerSecond)}`,
        metric: metric(
          queue.consumerFormat,
          current.processed,
          arrival,
          current.serviceRate,
          queue.capacityPerSecond,
        ),
      }
    })
    return { controls: base.controls, visual }
  }
  const refreshRates = () =>
    queueConfig.forEach((queue, index) => {
      const current = queues[index]!
      const arrival = arrivalRate(queue, controls)
      current.serviceRate =
        current.queued > 0 ? queue.capacityPerSecond : Math.min(arrival, queue.capacityPerSecond)
    })
  let snapshot = build()
  return {
    current: () => snapshot,
    update: (control, value) => {
      const nextControls = { ...controls, [control]: value }
      recompute(config, nextControls)
      controls = nextControls
      refreshRates()
      snapshot = build()
      return snapshot
    },
    advance: (elapsedMs) => {
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
        throw new StateError(`elapsed time ${String(elapsedMs)} is invalid`)
      const elapsedSeconds = elapsedMs / 1000
      if (!elapsedSeconds || !queueConfig.length) return snapshot
      queueConfig.forEach((queue, index) => {
        const current = queues[index]!
        const available = current.queued + arrivalRate(queue, controls) * elapsedSeconds
        const processed = Math.min(available, queue.capacityPerSecond * elapsedSeconds)
        current.queued = Math.max(0, available - processed)
        current.processed += processed
        current.serviceRate = processed / elapsedSeconds
      })
      snapshot = build()
      return snapshot
    },
    reset: () => {
      controls = { ...config.initialControls }
      queues.forEach((queue) => {
        queue.queued = 0
        queue.processed = 0
      })
      refreshRates()
      snapshot = build()
      return snapshot
    },
  }
}
