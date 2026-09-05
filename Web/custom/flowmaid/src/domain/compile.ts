import type {
  Control,
  Distribution,
  DistributionStrategy,
  DotDefaults,
  FlowmaidDiagnostic,
  FlowmaidProgram,
  QueueDefinition,
  Source,
} from "./types"

const TOP_LEVEL = ["controls", "sources", "distribution", "queues", "dots"] as const
const STRATEGIES = new Set<DistributionStrategy>([
  "roundRobin",
  "weightedRoundRobin",
  "random",
  "broadcast",
])
const MAX_CONTROLS = 16
const MAX_SOURCES = 16
const MAX_REFERENCED_NODES = 64
const MAX_DISTRIBUTIONS = 16
const MAX_QUEUES = 16
const DEFAULT_DOTS: DotDefaults = { radius: 3, durationMs: 1000 }

export class FlowmaidCompileError extends Error {
  constructor(readonly diagnostic: FlowmaidDiagnostic) {
    super(diagnostic.message)
    this.name = "FlowmaidCompileError"
  }
}

const fail = (path: string, message: string): never => {
  throw new FlowmaidCompileError({
    code: "schema-invalid",
    path,
    message: `${path}: ${message}`,
  })
}

const object = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "must be an object")
  return value as Record<string, unknown>
}

const closed = (value: Record<string, unknown>, allowed: readonly string[], path: string) => {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(`${path}.${key}`, "unknown field")
}

const finite = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "must be a finite number")
  return value as number
}

const positive = (value: unknown, path: string): number => {
  const result = finite(value, path)
  if (result <= 0) fail(path, "must be greater than zero")
  return result
}

const text = (value: unknown, path: string): string => {
  if (typeof value !== "string" || !value.trim()) fail(path, "must be a non-empty string")
  const result = value as string
  if ([...result].length > 80) fail(path, "must contain at most 80 Unicode code points")
  return result
}

const entries = (value: unknown, path: string, max: number): [string, unknown][] => {
  if (value === undefined) return []
  const source = object(value, path)
  const result = Object.entries(source)
  if (result.length > max) fail(path, `must contain at most ${max} entries`)
  return result
}

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  }
  return value
}

const controls = (value: unknown): Control[] =>
  entries(value, "$.controls", MAX_CONTROLS).map(([id, raw]) => {
    text(id, `$.controls.${id}`)
    const path = `$.controls.${id}`
    const source = object(raw, path)
    closed(source, ["label", "min", "max", "value", "step", "unit"], path)
    const label = text(source.label, `${path}.label`)
    const min = finite(source.min, `${path}.min`)
    const max = finite(source.max, `${path}.max`)
    const initial = finite(source.value, `${path}.value`)
    const step = positive(source.step, `${path}.step`)
    if (max <= min) fail(`${path}.max`, "must be greater than min")
    if (initial < min || initial > max) fail(`${path}.value`, "must be within min and max")
    const unit = source.unit === undefined ? undefined : text(source.unit, `${path}.unit`)
    return { id, label, min, max, value: initial, step, ...(unit && { unit }) }
  })

const sources = (value: unknown, controlIds: ReadonlySet<string>): Source[] => {
  if (!Array.isArray(value)) fail("$.sources", "must be an array")
  const values = value as unknown[]
  if (values.length > MAX_SOURCES) fail("$.sources", `must contain at most ${MAX_SOURCES} entries`)
  const owned = new Set<string>()
  return values.map((raw, index) => {
    const path = `$.sources[${index}]`
    const source = object(raw, path)
    closed(source, ["rate", "nodes"], path)
    const rate = source.rate
    if (typeof rate === "number") {
      if (!Number.isFinite(rate) || rate < 0)
        fail(`${path}.rate`, "must be a non-negative finite number")
    } else if (typeof rate !== "string" || !controlIds.has(rate)) {
      fail(`${path}.rate`, "must be a non-negative number or existing control ID")
    }
    if (!Array.isArray(source.nodes) || !source.nodes.length)
      fail(`${path}.nodes`, "must be a non-empty array")
    const nodes = (source.nodes as unknown[]).map((node, nodeIndex) =>
      text(node, `${path}.nodes[${nodeIndex}]`),
    )
    for (const [nodeIndex, node] of nodes.entries()) {
      if (owned.has(node)) fail(`${path}.nodes[${nodeIndex}]`, "duplicates source ownership")
      owned.add(node)
    }
    return { rate: rate as number | string, nodes }
  })
}

const distributions = (value: unknown): Distribution[] =>
  entries(value, "$.distribution", MAX_DISTRIBUTIONS).map(([node, raw]) => {
    text(node, `$.distribution.${node}`)
    const path = `$.distribution.${node}`
    const source = object(raw, path)
    closed(source, ["strategy", "weights"], path)
    if (
      typeof source.strategy !== "string" ||
      !STRATEGIES.has(source.strategy as DistributionStrategy)
    )
      fail(`${path}.strategy`, "must be roundRobin, weightedRoundRobin, random, or broadcast")
    const strategy = source.strategy as DistributionStrategy
    if (strategy !== "weightedRoundRobin" && source.weights !== undefined)
      fail(`${path}.weights`, "is allowed only for weightedRoundRobin")
    if (strategy !== "weightedRoundRobin") return { node, strategy }
    const weights = Object.fromEntries(
      entries(source.weights, `${path}.weights`, MAX_REFERENCED_NODES).map(([target, weight]) => [
        text(target, `${path}.weights.${target}`),
        positive(weight, `${path}.weights.${target}`),
      ]),
    )
    if (!Object.keys(weights).length) fail(`${path}.weights`, "must not be empty")
    return { node, strategy, weights }
  })

const queues = (value: unknown): QueueDefinition[] =>
  entries(value, "$.queues", MAX_QUEUES).map(([node, raw]) => {
    text(node, `$.queues.${node}`)
    const path = `$.queues.${node}`
    const source = object(raw, path)
    closed(source, ["capacity"], path)
    return { node, capacity: positive(source.capacity, `${path}.capacity`) }
  })

const dots = (value: unknown): DotDefaults => {
  if (value === undefined) return DEFAULT_DOTS
  const source = object(value, "$.dots")
  closed(source, ["radius", "durationMs"], "$.dots")
  const radius =
    source.radius === undefined ? DEFAULT_DOTS.radius : finite(source.radius, "$.dots.radius")
  const durationMs =
    source.durationMs === undefined
      ? DEFAULT_DOTS.durationMs
      : finite(source.durationMs, "$.dots.durationMs")
  if (radius < 1 || radius > 6) fail("$.dots.radius", "must be from 1 to 6")
  if (!Number.isInteger(durationMs) || durationMs < 250 || durationMs > 10_000)
    fail("$.dots.durationMs", "must be an integer from 250 to 10000")
  return { radius, durationMs }
}

export const compileFlowmaid = (value: unknown): FlowmaidProgram => {
  const root = object(value, "$")
  closed(root, TOP_LEVEL, "$")
  if (root.sources === undefined) fail("$.sources", "is required")
  const parsedControls = controls(root.controls)
  const parsedSources = sources(root.sources, new Set(parsedControls.map((control) => control.id)))
  const parsedDistributions = distributions(root.distribution)
  const parsedQueues = queues(root.queues)
  const referencedNodes = new Set([
    ...parsedSources.flatMap((source) => source.nodes),
    ...parsedDistributions.map((distribution) => distribution.node),
    ...parsedDistributions.flatMap((distribution) => Object.keys(distribution.weights ?? {})),
    ...parsedQueues.map((queue) => queue.node),
  ])
  if (referencedNodes.size > MAX_REFERENCED_NODES)
    fail("$", `must reference at most ${MAX_REFERENCED_NODES} Mermaid nodes`)
  return deepFreeze({
    controls: parsedControls,
    initialControls: Object.fromEntries(
      parsedControls.map((control) => [control.id, control.value]),
    ),
    sources: parsedSources,
    distributions: parsedDistributions,
    queues: parsedQueues,
    dots: dots(root.dots),
  })
}
