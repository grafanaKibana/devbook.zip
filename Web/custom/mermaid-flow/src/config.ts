import type {
  Binding,
  ConfigDiagnostic,
  ConfigResult,
  Control,
  EdgePatch,
  EdgeProperty,
  EdgeVisual,
  NodePatch,
  NodeProperty,
  NumericTransform,
  NormalizedConfig,
  QueueSimulation,
  RangeControl,
  Scenario,
  Target,
  Threshold,
  ThresholdBand,
  VisualPatch,
  VisualState,
  VisualStateName,
} from "./types"
import { transformNumber } from "./numeric"

const ID = /^[a-z][a-z0-9-]{0,63}$/
const EDGE_ID = /^(0|[1-9]\d*)$/
const STATES = new Set<VisualStateName>(["normal", "busy", "warning", "overloaded", "inactive"])
const TOP_KEYS = [
  "version",
  "for",
  "defaults",
  "controls",
  "bindings",
  "thresholds",
  "scenarios",
  "queues",
]
const PARTICLE_DEFAULTS = {
  radius: 3,
  particlesPerCycle: 1,
  direction: "forward" as const,
  delayMs: 0,
  visible: true,
  travelMs: 1000,
}
const MAX_PARTICLES_PER_EDGE = 500
const MAX_PARTICLES_PER_MOUNT = 1024

class InvalidConfig extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message)
  }
}

const fail = (path: string, message: string): never => {
  throw new InvalidConfig(path, message)
}

const object = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object")
  return value as Record<string, unknown>
}

const array = (value: unknown, path: string, max: number): unknown[] => {
  if (!Array.isArray(value)) fail(path, "must be an array")
  const result = value as unknown[]
  if (result.length > max) fail(path, `must contain at most ${max} entries`)
  return result
}

const closed = (value: Record<string, unknown>, allowed: readonly string[], path: string) => {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(`${path}.${key}`, "unknown field")
}

const required = (value: Record<string, unknown>, key: string, path: string): unknown => {
  if (!(key in value)) fail(`${path}.${key}`, "is required")
  return value[key]
}

const finite = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "must be a finite number")
  return value as number
}

const integer = (value: unknown, path: string, min: number, max: number): number => {
  const number = finite(value, path)
  if (!Number.isInteger(number) || number < min || number > max)
    fail(path, `must be an integer from ${min} to ${max}`)
  return number
}

const bounded = (value: unknown, path: string, min: number, max: number): number => {
  const number = finite(value, path)
  if (number < min || number > max) fail(path, `must be from ${min} to ${max}`)
  return number
}

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string") fail(path, "must be a string")
  const normalized = (value as string).trim()
  const length = [...normalized].length
  if (length < 1 || length > 80)
    fail(path, "must contain 1 to 80 Unicode code points after trimming")
  return normalized
}

const identifier = (value: unknown, path: string): string => {
  if (typeof value !== "string" || !ID.test(value))
    fail(path, "must be lowercase kebab case (1 to 64 characters)")
  return value as string
}

const state = (value: unknown, path: string): VisualStateName => {
  if (typeof value !== "string" || !STATES.has(value as VisualStateName))
    fail(path, "has an unknown state")
  return value as VisualStateName
}

const nodePatch = (value: unknown, path: string, base: boolean): NodePatch => {
  const source = object(value, path)
  closed(source, ["metric", "state"], path)
  const result: { metric?: string; state?: VisualStateName } = {}
  if ("metric" in source) result.metric = text(source.metric, `${path}.metric`)
  if ("state" in source) result.state = state(source.state, `${path}.state`)
  if (base && result.state === undefined) result.state = "normal"
  return result
}

const edgePatch = (value: unknown, path: string, base: boolean): EdgePatch => {
  const source = object(value, path)
  closed(
    source,
    ["radius", "particlesPerCycle", "direction", "delayMs", "visible", "travelMs", "state"],
    path,
  )
  const result: Record<string, unknown> = base ? { ...PARTICLE_DEFAULTS, state: "normal" } : {}
  if ("radius" in source) result.radius = bounded(source.radius, `${path}.radius`, 1, 6)
  if ("particlesPerCycle" in source)
    result.particlesPerCycle = integer(
      source.particlesPerCycle,
      `${path}.particlesPerCycle`,
      0,
      MAX_PARTICLES_PER_EDGE,
    )
  if ("direction" in source) {
    if (source.direction !== "forward" && source.direction !== "reverse")
      fail(`${path}.direction`, 'must be "forward" or "reverse"')
    result.direction = source.direction
  }
  if ("delayMs" in source) result.delayMs = integer(source.delayMs, `${path}.delayMs`, 0, 10_000)
  if ("visible" in source) {
    if (typeof source.visible !== "boolean") fail(`${path}.visible`, "must be a boolean")
    result.visible = source.visible
  }
  if ("travelMs" in source)
    result.travelMs = integer(source.travelMs, `${path}.travelMs`, 250, 10_000)
  if ("state" in source) result.state = state(source.state, `${path}.state`)
  return result as EdgePatch
}

const entryMap = <T>(
  value: unknown,
  path: string,
  edge: boolean,
  parse: (entry: unknown, path: string) => T,
): Record<string, T> => {
  const source = object(value, path)
  const keys = Object.keys(source)
  if (keys.length > 64) fail(path, "must contain at most 64 entries")
  return Object.fromEntries(
    keys.map((key) => {
      if (!key || (edge && !EDGE_ID.test(key)))
        fail(
          `${path}.${key}`,
          edge ? "must identify a logical edge ordinal" : "must identify a Mermaid node",
        )
      return [key, parse(source[key], `${path}.${key}`)]
    }),
  )
}

const visual = (value: unknown, path: string, base: boolean): VisualState | VisualPatch => {
  if (value === undefined) return base ? { nodes: {}, edges: {} } : { nodes: {}, edges: {} }
  const source = object(value, path)
  closed(source, ["nodes", "edges"], path)
  return {
    nodes:
      source.nodes === undefined
        ? {}
        : entryMap(source.nodes, `${path}.nodes`, false, (v, p) => nodePatch(v, p, base)),
    edges:
      source.edges === undefined
        ? {}
        : entryMap(source.edges, `${path}.edges`, true, (v, p) => edgePatch(v, p, base)),
  } as VisualState | VisualPatch
}

const target = (value: unknown, path: string): Target => {
  const source = object(value, path)
  closed(source, ["node", "edge", "property"], path)
  if ("node" in source === "edge" in source) fail(path, "must name exactly one node or edge")
  const property = required(source, "property", path)
  if (typeof property !== "string") fail(`${path}.property`, "must be a string")
  if ("node" in source) {
    if (typeof source.node !== "string" || !source.node)
      fail(`${path}.node`, "must identify a Mermaid node")
    if (property !== "metric" && property !== "state")
      fail(`${path}.property`, "is not a node property")
    return { node: source.node as string, property: property as NodeProperty }
  }
  if (typeof source.edge !== "string" || !EDGE_ID.test(source.edge))
    fail(`${path}.edge`, "must identify a logical edge ordinal")
  if (
    ![
      "radius",
      "particlesPerCycle",
      "direction",
      "delayMs",
      "visible",
      "travelMs",
      "state",
    ].includes(property as string)
  )
    fail(`${path}.property`, "is not an edge property")
  return { edge: source.edge as string, property: property as EdgeProperty }
}

const control = (value: unknown, path: string): Control => {
  const source = object(value, path)
  const type = required(source, "type", path)
  const id = identifier(required(source, "id", path), `${path}.id`)
  const label = text(required(source, "label", path), `${path}.label`)
  if (type === "scenario") {
    closed(source, ["id", "type", "label", "default", "options"], path)
    const options = array(required(source, "options", path), `${path}.options`, 64).map(
      (option, index) => identifier(option, `${path}.options[${index}]`),
    )
    const defaultValue = identifier(required(source, "default", path), `${path}.default`)
    return { id, type, label, default: defaultValue, options }
  }
  if (type === "range") {
    closed(source, ["id", "type", "label", "min", "max", "step", "default"], path)
    const min = finite(required(source, "min", path), `${path}.min`)
    const max = finite(required(source, "max", path), `${path}.max`)
    const step = finite(required(source, "step", path), `${path}.step`)
    const defaultValue = finite(required(source, "default", path), `${path}.default`)
    if (max <= min) fail(`${path}.max`, "must be greater than min")
    if (step <= 0) fail(`${path}.step`, "must be greater than zero")
    if (defaultValue < min || defaultValue > max)
      fail(`${path}.default`, "must be within min and max")
    return { id, type, label, min, max, step, default: defaultValue }
  }
  if (type === "reset") {
    closed(source, ["id", "type", "label"], path)
    return { id, type, label }
  }
  return fail(`${path}.type`, 'must be "scenario", "range", or "reset"')
}

const scenario = (value: unknown, path: string): Scenario => {
  const source = object(value, path)
  closed(source, ["id", "patch"], path)
  return {
    id: identifier(required(source, "id", path), `${path}.id`),
    patch: visual(required(source, "patch", path), `${path}.patch`, false) as VisualPatch,
  }
}

const binding = (value: unknown, path: string): Binding => {
  const source = object(value, path)
  closed(source, ["control", "target", "format", "transform"], path)
  const parsedTarget = target(required(source, "target", path), `${path}.target`)
  const result: Binding = {
    control: identifier(required(source, "control", path), `${path}.control`),
    target: parsedTarget,
  }
  const transformed =
    source.transform === undefined
      ? undefined
      : numericTransform(source.transform, `${path}.transform`)
  if ("format" in source) {
    const format = text(source.format, `${path}.format`)
    if (!format.includes("{value}")) fail(`${path}.format`, "must contain {value}")
    return { ...result, format, ...(transformed && { transform: transformed }) }
  }
  return { ...result, ...(transformed && { transform: transformed }) }
}

const numericTransform = (value: unknown, path: string): NumericTransform => {
  const source = object(value, path)
  closed(source, ["scale", "offset", "min", "max", "round"], path)
  if (!Object.keys(source).length) fail(path, "must not be empty")
  const result: NumericTransform = {
    ...(source.scale !== undefined && { scale: finite(source.scale, `${path}.scale`) }),
    ...(source.offset !== undefined && { offset: finite(source.offset, `${path}.offset`) }),
    ...(source.min !== undefined && { min: finite(source.min, `${path}.min`) }),
    ...(source.max !== undefined && { max: finite(source.max, `${path}.max`) }),
  }
  if (source.round !== undefined) {
    if (typeof source.round !== "boolean") fail(`${path}.round`, "must be a boolean")
    Object.assign(result, { round: source.round })
  }
  if (result.min !== undefined && result.max !== undefined && result.max < result.min)
    fail(`${path}.max`, "must be greater than or equal to min")
  return result
}

const queueSimulation = (value: unknown, path: string): QueueSimulation => {
  const source = object(value, path)
  closed(
    source,
    [
      "control",
      "arrival",
      "capacityPerSecond",
      "queueNode",
      "consumerNode",
      "queueFormat",
      "consumerFormat",
    ],
    path,
  )
  const capacityPerSecond = finite(
    required(source, "capacityPerSecond", path),
    `${path}.capacityPerSecond`,
  )
  if (capacityPerSecond <= 0 || capacityPerSecond > 500)
    fail(`${path}.capacityPerSecond`, "must be greater than zero and at most 500")
  const queueFormat = text(required(source, "queueFormat", path), `${path}.queueFormat`)
  const consumerFormat = text(required(source, "consumerFormat", path), `${path}.consumerFormat`)
  if (!queueFormat.includes("{value}")) fail(`${path}.queueFormat`, "must contain {value}")
  if (!consumerFormat.includes("{value}")) fail(`${path}.consumerFormat`, "must contain {value}")
  return {
    control: identifier(required(source, "control", path), `${path}.control`),
    arrival: numericTransform(required(source, "arrival", path), `${path}.arrival`),
    capacityPerSecond,
    queueNode: text(required(source, "queueNode", path), `${path}.queueNode`),
    consumerNode: text(required(source, "consumerNode", path), `${path}.consumerNode`),
    queueFormat,
    consumerFormat,
  }
}

const bandValue = (
  value: unknown,
  targetValue: Target,
  path: string,
): string | number | boolean => {
  const property = targetValue.property
  if (property === "state") return state(value, path)
  if (property === "direction") {
    if (value !== "forward" && value !== "reverse") fail(path, "has an unknown direction")
    return value as string
  }
  if (property === "visible") {
    if (typeof value !== "boolean") fail(path, "must be a boolean")
    return value as boolean
  }
  if (property === "metric") return text(value, path)
  if (property === "radius") return bounded(value, path, 1, 6)
  if (property === "particlesPerCycle") return integer(value, path, 0, MAX_PARTICLES_PER_EDGE)
  if (property === "delayMs") return integer(value, path, 0, 10_000)
  if (property === "travelMs") return integer(value, path, 250, 10_000)
  return finite(value, path)
}

const threshold = (value: unknown, path: string): Threshold => {
  const source = object(value, path)
  closed(source, ["control", "target", "bands"], path)
  const parsedTarget = target(required(source, "target", path), `${path}.target`)
  const sourceBands = array(required(source, "bands", path), `${path}.bands`, 16)
  if (!sourceBands.length) fail(`${path}.bands`, "must not be empty")
  let previous = -Infinity
  const bands: ThresholdBand[] = sourceBands.map((item, index) => {
    const bandPath = `${path}.bands[${index}]`
    const band = object(item, bandPath)
    closed(band, ["below", "otherwise", "value"], bandPath)
    const hasBelow = "below" in band
    const hasOtherwise = "otherwise" in band
    if (hasBelow === hasOtherwise) fail(bandPath, "must contain exactly one of below or otherwise")
    if (hasOtherwise) {
      if ("value" in band) fail(`${bandPath}.value`, "unknown field")
      if (index !== sourceBands.length - 1) fail(`${bandPath}.otherwise`, "must be the final band")
      return { otherwise: bandValue(band.otherwise, parsedTarget, `${bandPath}.otherwise`) }
    }
    if (!("value" in band)) fail(`${bandPath}.value`, "is required")
    const below = finite(band.below, `${bandPath}.below`)
    if (below <= previous) fail(`${bandPath}.below`, "must be strictly ascending")
    previous = below
    return { below, value: bandValue(band.value, parsedTarget, `${bandPath}.value`) }
  })
  if (!("otherwise" in bands[bands.length - 1]!)) fail(`${path}.bands`, "must end with otherwise")
  return {
    control: identifier(required(source, "control", path), `${path}.control`),
    target: parsedTarget,
    bands,
  }
}

const unique = (items: readonly { id: string }[], path: string) => {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    if (seen.has(item.id)) fail(`${path}[${index}].id`, `duplicates ${item.id}`)
    seen.add(item.id)
  })
}

const targetKey = (value: Target) =>
  "node" in value ? `node:${value.node}:${value.property}` : `edge:${value.edge}:${value.property}`

const bindingBounds = (
  item: Binding,
  range: RangeControl,
  path: string,
): { min: number; max: number } => {
  const values = [range.min, range.max].map((value) => transformNumber(value, item.transform))
  if (values.some((value) => !Number.isFinite(value)))
    fail(`${path}.transform`, "must produce finite values across the control range")
  return { min: Math.min(...values), max: Math.max(...values) }
}

const validateWriters = (
  defaults: VisualState,
  scenarios: readonly Scenario[],
  bindings: readonly Binding[],
  thresholds: readonly Threshold[],
  queues: readonly QueueSimulation[],
) => {
  const owners = new Map<string, string>()
  const requireTarget = (targetValue: Target, path: string) => {
    const exists =
      "node" in targetValue
        ? Object.hasOwn(defaults.nodes, targetValue.node)
        : Object.hasOwn(defaults.edges, targetValue.edge)
    if (!exists) fail(path, "must target an entry authored in defaults")
  }
  const add = (targetValue: Target, path: string) => {
    requireTarget(targetValue, path)
    const key = targetKey(targetValue)
    const owner = owners.get(key)
    if (owner) fail(path, `overlaps writer ${owner}`)
    owners.set(key, path)
  }
  const scenarioTargets = new Map<string, string>()
  for (const [scenarioIndex, scenarioValue] of scenarios.entries()) {
    for (const [node, patch] of Object.entries(scenarioValue.patch.nodes)) {
      const path = `$.scenarios[${scenarioIndex}].patch.nodes.${node}`
      requireTarget({ node, property: "state" }, path)
      for (const property of Object.keys(patch)) {
        const targetValue = { node, property: property as NodeProperty } as const
        scenarioTargets.set(targetKey(targetValue), `${path}.${property}`)
      }
    }
    for (const [edge, patch] of Object.entries(scenarioValue.patch.edges)) {
      const path = `$.scenarios[${scenarioIndex}].patch.edges.${edge}`
      requireTarget({ edge, property: "state" }, path)
      for (const property of Object.keys(patch)) {
        const targetValue = { edge, property: property as EdgeProperty } as const
        scenarioTargets.set(targetKey(targetValue), `${path}.${property}`)
      }
    }
  }
  for (const [key, path] of scenarioTargets) owners.set(key, path)
  bindings.forEach((item, index) => add(item.target, `$.bindings[${index}].target`))
  thresholds.forEach((item, index) => add(item.target, `$.thresholds[${index}].target`))
  queues.forEach((item, index) => {
    add({ node: item.queueNode, property: "metric" }, `$.queues[${index}].queueNode`)
    add({ node: item.consumerNode, property: "metric" }, `$.queues[${index}].consumerNode`)
  })
}

const checkReferences = (
  controls: readonly Control[],
  scenarios: readonly Scenario[],
  bindings: readonly Binding[],
  thresholds: readonly Threshold[],
  queues: readonly QueueSimulation[],
) => {
  unique(controls, "$.controls")
  unique(scenarios, "$.scenarios")
  const byId = new Map(controls.map((item) => [item.id, item]))
  const scenarioControls = controls.filter((item) => item.type === "scenario")
  if (scenarioControls.length > 1) fail("$.controls", "must contain at most one scenario control")
  const scenarioControl = scenarioControls[0]
  if (scenarios.length && !scenarioControl) fail("$.scenarios", "requires one scenario control")
  if (scenarioControl) {
    const ids = scenarios.map((item) => item.id)
    const optionSet = new Set<string>()
    scenarioControl.options.forEach((option, index) => {
      if (optionSet.has(option))
        fail(
          `$.controls[${controls.indexOf(scenarioControl)}].options[${index}]`,
          "duplicates a scenario option",
        )
      optionSet.add(option)
      if (!ids.includes(option))
        fail(
          `$.controls[${controls.indexOf(scenarioControl)}].options[${index}]`,
          "does not resolve a scenario",
        )
    })
    if (!optionSet.has(scenarioControl.default))
      fail(`$.controls[${controls.indexOf(scenarioControl)}].default`, "must be one of options")
    for (const [index, item] of scenarios.entries())
      if (!optionSet.has(item.id))
        fail(`$.scenarios[${index}].id`, "is unreachable from scenario options")
  }
  const checkRange = (id: string, path: string): RangeControl => {
    const found = byId.get(id)
    if (!found) fail(path, "references an unknown control")
    if ((found as Control).type !== "range") fail(path, "must reference a range control")
    return found as RangeControl
  }
  bindings.forEach((item, index) => {
    const range = checkRange(item.control, `$.bindings[${index}].control`)
    if (
      item.target.property === "state" ||
      item.target.property === "direction" ||
      item.target.property === "visible"
    )
      fail(`$.bindings[${index}].target.property`, "cannot be written directly by a numeric range")
    if (item.target.property === "metric" && !item.format)
      fail(`$.bindings[${index}].format`, "is required for a metric binding")
    if (item.target.property !== "metric" && item.format)
      fail(`$.bindings[${index}].format`, "is allowed only for a metric binding")
    const path = `$.bindings[${index}].target.property`
    const bounds = bindingBounds(item, range, `$.bindings[${index}]`)
    if (item.target.property === "radius") {
      bounded(bounds.min, path, 1, 6)
      bounded(bounds.max, path, 1, 6)
    }
    if (item.target.property === "particlesPerCycle") {
      if (item.transform) {
        if (item.transform.round !== true)
          fail(`$.bindings[${index}].transform.round`, "must be true for an integer target")
        integer(bounds.min, path, 0, MAX_PARTICLES_PER_EDGE)
        integer(bounds.max, path, 0, MAX_PARTICLES_PER_EDGE)
      } else {
        integer(range.min, path, 0, MAX_PARTICLES_PER_EDGE)
        integer(range.max, path, 0, MAX_PARTICLES_PER_EDGE)
        integer(range.step, path, 0, MAX_PARTICLES_PER_EDGE)
        integer(range.default, path, 0, MAX_PARTICLES_PER_EDGE)
      }
    }
    if (item.target.property === "delayMs") {
      if (item.transform) {
        if (item.transform.round !== true)
          fail(`$.bindings[${index}].transform.round`, "must be true for an integer target")
        integer(bounds.min, path, 0, 10_000)
        integer(bounds.max, path, 0, 10_000)
      } else {
        integer(range.min, path, 0, 10_000)
        integer(range.max, path, 0, 10_000)
        integer(range.step, path, 0, 10_000)
        integer(range.default, path, 0, 10_000)
      }
    }
    if (item.target.property === "travelMs") {
      if (item.transform) {
        if (item.transform.round !== true)
          fail(`$.bindings[${index}].transform.round`, "must be true for an integer target")
        integer(bounds.min, path, 250, 10_000)
        integer(bounds.max, path, 250, 10_000)
      } else {
        integer(range.min, path, 250, 10_000)
        integer(range.max, path, 250, 10_000)
        integer(range.step, path, 1, 10_000)
        integer(range.default, path, 250, 10_000)
      }
    }
  })
  thresholds.forEach((item, index) => checkRange(item.control, `$.thresholds[${index}].control`))
  queues.forEach((item, index) => {
    const range = checkRange(item.control, `$.queues[${index}].control`)
    const arrivals = [range.min, range.max].map((value) => transformNumber(value, item.arrival))
    if (arrivals.some((value) => !Number.isFinite(value) || value < 0))
      fail(`$.queues[${index}].arrival`, "must produce non-negative finite arrival rates")
  })
}

type MutableEdge = { -readonly [K in keyof EdgeVisual]: EdgeVisual[K] }

const resolvedEdges = (
  defaults: VisualState,
  scenarioValue?: Scenario,
): Record<string, MutableEdge> => {
  const result: Record<string, MutableEdge> = Object.fromEntries(
    Object.entries(defaults.edges).map(([id, edge]) => [id, { ...edge }]),
  )
  if (scenarioValue) {
    for (const [id, patch] of Object.entries(scenarioValue.patch.edges)) {
      const base: MutableEdge = result[id] ?? { ...PARTICLE_DEFAULTS, state: "normal" }
      result[id] = { ...base, ...patch }
    }
  }
  return result
}

const checkEdges = (edges: Record<string, MutableEdge>, basePath: string) => {
  let total = 0
  for (const id of Object.keys(edges).sort((a, b) => Number(a) - Number(b))) {
    const edge = edges[id]!
    total += edge.visible ? edge.particlesPerCycle : 0
    if (total > MAX_PARTICLES_PER_MOUNT)
      fail(
        `${basePath}.${id}.particlesPerCycle`,
        `raises a reachable mount above ${MAX_PARTICLES_PER_MOUNT} particle children`,
      )
  }
}

const checkParticleCeiling = (
  defaults: VisualState,
  controls: readonly Control[],
  scenarios: readonly Scenario[],
  bindings: readonly Binding[],
  thresholds: readonly Threshold[],
) => {
  const states: Array<{ edges: Record<string, MutableEdge>; path: string }> = [
    { edges: resolvedEdges(defaults), path: "$.defaults.edges" },
    ...scenarios.map((item, index) => ({
      edges: resolvedEdges(defaults, item),
      path: `$.scenarios[${index}].patch.edges`,
    })),
  ]
  const particleWriters = [
    ...bindings.map((item, index) => ({ item, path: `$.bindings[${index}].target` })),
    ...thresholds.map((item, index) => ({ item, path: `$.thresholds[${index}].target` })),
  ].filter(
    ({ item }) =>
      "edge" in item.target &&
      (item.target.property === "particlesPerCycle" || item.target.property === "visible"),
  )
  for (const candidate of states) {
    const edges = structuredClone(candidate.edges)
    checkEdges(edges, candidate.path)
    for (const { item, path } of particleWriters) {
      if (!("edge" in item.target)) continue
      const edge = (edges[item.target.edge] ??= { ...PARTICLE_DEFAULTS, state: "normal" })
      if (item.target.property === "particlesPerCycle") {
        const range = controls.find(
          (control): control is RangeControl =>
            control.id === item.control && control.type === "range",
        )
        const values =
          "bands" in item
            ? item.bands.map((band) => ("value" in band ? band.value : band.otherwise))
            : range
              ? [bindingBounds(item, range, path).max]
              : []
        edge.particlesPerCycle = Math.max(
          edge.particlesPerCycle,
          ...values.filter((value): value is number => typeof value === "number"),
        )
      } else if (
        item.target.property === "visible" &&
        "bands" in item &&
        item.bands.some((band) => ("value" in band ? band.value : band.otherwise) === true)
      ) {
        edge.visible = true
      }
      try {
        checkEdges(edges, candidate.path)
      } catch (caught) {
        if (caught instanceof InvalidConfig) fail(path, caught.message)
        throw caught
      }
    }
  }
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  }
  return value
}

const error = (path: string, message: string): ConfigDiagnostic => ({
  code: "runtime-schema-invalid",
  path,
  message: `${path}: ${message}`,
})

export const normalizeConfig = (source: string): ConfigResult => {
  try {
    let parsed: unknown
    try {
      parsed = JSON.parse(source)
    } catch {
      return { ok: false, error: error("$", "must be valid JSON") }
    }
    const root = object(parsed, "$")
    closed(root, TOP_KEYS, "$")
    if (required(root, "version", "$") !== 1) fail("$.version", "must be supported version 1")
    const pairId = identifier(required(root, "for", "$"), "$.for")
    const defaults = visual(root.defaults, "$.defaults", true) as VisualState
    const controls =
      root.controls === undefined
        ? []
        : array(root.controls, "$.controls", 16).map((item, index) =>
            control(item, `$.controls[${index}]`),
          )
    const scenarios =
      root.scenarios === undefined
        ? []
        : array(root.scenarios, "$.scenarios", 64).map((item, index) =>
            scenario(item, `$.scenarios[${index}]`),
          )
    const bindings =
      root.bindings === undefined
        ? []
        : array(root.bindings, "$.bindings", 64).map((item, index) =>
            binding(item, `$.bindings[${index}]`),
          )
    const thresholds =
      root.thresholds === undefined
        ? []
        : array(root.thresholds, "$.thresholds", 64).map((item, index) =>
            threshold(item, `$.thresholds[${index}]`),
          )
    const queues =
      root.queues === undefined
        ? []
        : array(root.queues, "$.queues", 16).map((item, index) =>
            queueSimulation(item, `$.queues[${index}]`),
          )
    validateWriters(defaults, scenarios, bindings, thresholds, queues)
    checkReferences(controls, scenarios, bindings, thresholds, queues)
    checkParticleCeiling(defaults, controls, scenarios, bindings, thresholds)
    const initialControls = Object.fromEntries(
      controls.filter((item) => item.type !== "reset").map((item) => [item.id, item.default]),
    )
    return {
      ok: true,
      config: deepFreeze({
        version: 1,
        for: pairId,
        defaults,
        controls,
        scenarios,
        bindings,
        thresholds,
        queues,
        initialControls,
      } satisfies NormalizedConfig),
    }
  } catch (caught) {
    if (caught instanceof InvalidConfig)
      return { ok: false, error: error(caught.path, caught.message) }
    throw caught
  }
}

export class ConfigError extends Error {
  readonly code = "runtime-schema-invalid"

  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message)
    this.name = "ConfigError"
  }
}

export const parseConfig = (source: string): NormalizedConfig => {
  const result = normalizeConfig(source)
  if (!result.ok) throw new ConfigError(result.error.path, result.error.message)
  return result.config
}
