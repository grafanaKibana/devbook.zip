import type {
  DirectedGraph,
  Distribution,
  EdgeSnapshot,
  FlowmaidDiagnostic,
  FlowmaidProgram,
  GraphEdge,
  NodeSnapshot,
  SimulationSnapshot,
} from "../domain/types"

export interface SimulationState {
  current(): SimulationSnapshot
  update(control: string, value: number): SimulationSnapshot
  advance(elapsedSeconds: number): SimulationSnapshot
  reset(): SimulationSnapshot
}

export class FlowmaidGraphError extends Error {
  constructor(readonly diagnostic: FlowmaidDiagnostic) {
    super(diagnostic.message)
    this.name = "FlowmaidGraphError"
  }
}

const fail = (path: string, message: string): never => {
  throw new FlowmaidGraphError({ code: "graph-invalid", path, message: `${path}: ${message}` })
}

const format = (value: number): string =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value))

const stable = (value: number): number => Math.round(value * 1e12) / 1e12

interface RouteRuntime {
  cursor: number
  random: number
  weighted: Record<string, number>
  remainder: number
  window: number
}

interface ValidatedGraph {
  readonly graph: DirectedGraph
  readonly order: readonly string[]
  readonly outgoing: ReadonlyMap<string, readonly GraphEdge[]>
}

const validateGraph = (program: FlowmaidProgram, graph: DirectedGraph): ValidatedGraph => {
  if (graph.edges.length > 64) fail("$.graph.edges", "must contain at most 64 edges")
  const nodes = new Set(graph.nodes)
  if (nodes.size !== graph.nodes.length) fail("$.graph.nodes", "contains duplicate node IDs")
  const outgoing = new Map<string, GraphEdge[]>()
  const incoming = new Map<string, number>(graph.nodes.map((node) => [node, 0]))
  const edgeIds = new Set<string>()
  const pairs = new Set<string>()
  for (const [index, edge] of graph.edges.entries()) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to))
      fail(`$.graph.edges[${index}]`, "references an unknown node")
    if (edgeIds.has(edge.id)) fail(`$.graph.edges[${index}].id`, "duplicates an edge ID")
    edgeIds.add(edge.id)
    const pair = `${edge.from}\u0000${edge.to}`
    if (pairs.has(pair)) fail(`$.graph.edges[${index}]`, "duplicates an endpoint pair")
    pairs.add(pair)
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge])
    incoming.set(edge.to, incoming.get(edge.to)! + 1)
  }

  const queue = graph.nodes.filter((node) => incoming.get(node) === 0)
  const order: string[] = []
  for (let index = 0; index < queue.length; index += 1) {
    const node = queue[index]!
    order.push(node)
    for (const edge of outgoing.get(node) ?? []) {
      const next = incoming.get(edge.to)! - 1
      incoming.set(edge.to, next)
      if (next === 0) queue.push(edge.to)
    }
  }
  if (order.length !== graph.nodes.length) fail("$.graph", "must be acyclic")

  const sources = new Set(program.sources.flatMap((source) => source.nodes))
  const reachable = new Set<string>()
  const pending = [...sources]
  while (pending.length) {
    const node = pending.shift()!
    if (reachable.has(node)) continue
    if (!nodes.has(node)) fail("$.sources", `references missing Mermaid node ${node}`)
    reachable.add(node)
    ;(outgoing.get(node) ?? []).forEach((edge) => pending.push(edge.to))
  }

  for (const [index, distribution] of program.distributions.entries()) {
    if (!nodes.has(distribution.node))
      fail(`$.distribution.${distribution.node}`, "references a missing Mermaid node")
    if (!reachable.has(distribution.node))
      fail(`$.distribution.${distribution.node}`, "is disconnected from every source")
    const targets = (outgoing.get(distribution.node) ?? []).map((edge) => edge.to)
    if (targets.length < 2)
      fail(`$.distribution.${distribution.node}`, "requires at least two outgoing edges")
    if (distribution.strategy === "weightedRoundRobin") {
      const authored = Object.keys(distribution.weights ?? {})
      if (
        authored.length !== targets.length ||
        authored.some((target) => !targets.includes(target))
      )
        fail(
          `$.distribution.${distribution.node}.weights`,
          "must name every outgoing target exactly once",
        )
    }
    if (program.distributions.findIndex((item) => item.node === distribution.node) !== index)
      fail(`$.distribution.${distribution.node}`, "duplicates distribution ownership")
  }

  for (const [index, definition] of program.queues.entries()) {
    if (!nodes.has(definition.node))
      fail(`$.queues.${definition.node}`, "references a missing Mermaid node")
    if (!reachable.has(definition.node))
      fail(`$.queues.${definition.node}`, "is disconnected from every source")
    if ((outgoing.get(definition.node) ?? []).length !== 1)
      fail(`$.queues.${definition.node}`, "must have exactly one outgoing edge")
    if (program.queues.findIndex((item) => item.node === definition.node) !== index)
      fail(`$.queues.${definition.node}`, "duplicates queue ownership")
  }
  return { graph, order, outgoing }
}

const routeRecords = (
  amount: number,
  rate: number,
  window: number,
  edges: readonly GraphEdge[],
  distribution: Distribution | undefined,
  runtime: RouteRuntime,
  preview: boolean,
): {
  amounts: Map<string, number>
  records: Map<string, number>
  rates: Map<string, number>
} => {
  const amounts = new Map(edges.map((edge) => [edge.id, 0]))
  const records = new Map(edges.map((edge) => [edge.id, 0]))
  const rates = new Map(edges.map((edge) => [edge.id, 0]))
  if (!edges.length || amount <= 0) return { amounts, records, rates }

  const available = amount + runtime.remainder
  const whole = Math.floor(available + 1e-9)
  const totalWindow = stable(runtime.window + window)
  const emittedWindow = whole > 0 ? stable((totalWindow * whole) / available) : 0
  runtime.remainder = Math.max(0, available - whole)
  runtime.window = stable(totalWindow - emittedWindow)
  if (preview && whole <= 1) return { amounts, records, rates }
  if (!distribution || distribution.strategy === "broadcast") {
    edges.forEach((edge) => {
      amounts.set(edge.id, amount)
      records.set(edge.id, whole)
    })
  } else {
    const select = (target: RouteRuntime): GraphEdge => {
      if (distribution.strategy === "roundRobin") {
        const edge = edges[target.cursor % edges.length]!
        target.cursor += 1
        return edge
      }
      if (distribution.strategy === "random") {
        let value = target.random >>> 0
        value ^= value << 13
        value ^= value >>> 17
        value ^= value << 5
        target.random = value >>> 0
        return edges[target.random % edges.length]!
      }
      const weights = distribution.weights!
      const total = edges.reduce((sum, edge) => sum + weights[edge.to]!, 0)
      let selected = edges[0]!
      for (const edge of edges) {
        target.weighted[edge.id] = (target.weighted[edge.id] ?? 0) + weights[edge.to]!
        if (target.weighted[edge.id]! > target.weighted[selected.id]!) selected = edge
      }
      target.weighted[selected.id] -= total
      return selected
    }

    for (let index = 0; index < whole; index += 1) {
      const edge = select(runtime)
      records.set(edge.id, records.get(edge.id)! + 1)
    }
    if (whole > 0)
      edges.forEach((edge) =>
        amounts.set(edge.id, stable((amount * records.get(edge.id)!) / whole)),
      )
    else {
      const target = select({ ...runtime, weighted: { ...runtime.weighted } })
      amounts.set(target.id, amount)
    }
  }
  edges.forEach((edge) => rates.set(edge.id, stable((rate * amounts.get(edge.id)!) / amount)))
  return { amounts, records, rates }
}

const cloneRoutes = (source: ReadonlyMap<string, RouteRuntime>): Map<string, RouteRuntime> =>
  new Map(
    [...source].map(([id, value]) => [
      id,
      {
        cursor: value.cursor,
        random: value.random,
        remainder: value.remainder,
        window: value.window,
        weighted: { ...value.weighted },
      },
    ]),
  )

export const createSimulation = (
  program: FlowmaidProgram,
  sourceGraph: DirectedGraph,
): SimulationState => {
  const { graph, order, outgoing } = validateGraph(program, sourceGraph)
  const definitions = new Map(program.queues.map((queue) => [queue.node, queue]))
  const distributions = new Map(
    program.distributions.map((distribution) => [distribution.node, distribution]),
  )
  const initialRoutes = () =>
    new Map(
      [...outgoing.keys()].map((node) => [
        node,
        { cursor: 0, random: 0x6d2b79f5, weighted: {}, remainder: 0, window: 0 },
      ]),
    )
  let controls = { ...program.initialControls }
  let queues = new Map(program.queues.map((queue) => [queue.node, { backlog: 0, processed: 0 }]))
  let routes = initialRoutes()
  const edgeRecords = new Map(graph.edges.map((edge) => [edge.id, 0]))
  const sourceNodes = new Set(program.sources.flatMap((source) => source.nodes))
  const queueConsumers = new Map<string, string[]>()
  for (const queue of program.queues) {
    const target = outgoing.get(queue.node)![0]!.to
    queueConsumers.set(target, [...(queueConsumers.get(target) ?? []), queue.node])
  }
  let snapshot: SimulationSnapshot

  const evaluate = (elapsedSeconds: number, commit: boolean): SimulationSnapshot => {
    const scale = elapsedSeconds > 0 ? elapsedSeconds : 1
    const activeQueues = commit
      ? queues
      : new Map([...queues].map(([id, value]) => [id, { ...value }]))
    const activeRoutes = commit ? routes : cloneRoutes(routes)
    const nodeAmounts = new Map(graph.nodes.map((node) => [node, 0]))
    const nodeRates = new Map(graph.nodes.map((node) => [node, 0]))
    const nodeWindows = new Map(graph.nodes.map((node) => [node, 0]))
    const edgeRates = new Map(graph.edges.map((edge) => [edge.id, 0]))
    const edgeRecordDeltas = new Map(graph.edges.map((edge) => [edge.id, 0]))

    for (const source of program.sources) {
      const rate = typeof source.rate === "number" ? source.rate : controls[source.rate]!
      const share = stable((rate * scale) / source.nodes.length)
      const shareRate = stable(rate / source.nodes.length)
      source.nodes.forEach((node) => {
        nodeAmounts.set(node, stable(nodeAmounts.get(node)! + share))
        nodeRates.set(node, stable(nodeRates.get(node)! + shareRate))
        nodeWindows.set(node, Math.max(nodeWindows.get(node)!, scale))
      })
    }

    for (const node of order) {
      let amount = nodeAmounts.get(node)!
      let rate = nodeRates.get(node)!
      let window = nodeWindows.get(node)!
      const definition = definitions.get(node)
      if (definition) {
        const runtime = activeQueues.get(node)!
        const available = stable(runtime.backlog + amount)
        const processed = stable(Math.min(available, definition.capacity * scale))
        if (commit) {
          runtime.backlog = stable(Math.max(0, available - processed))
          runtime.processed = stable(runtime.processed + processed)
        }
        amount = processed
        rate = stable(processed / scale)
        window = scale
      }
      const edges = outgoing.get(node) ?? []
      if (!edges.length) continue
      const runtime = activeRoutes.get(node)!
      const dispatched = routeRecords(
        amount,
        rate,
        window,
        edges,
        distributions.get(node),
        runtime,
        !commit && elapsedSeconds === 0,
      )
      for (const edge of edges) {
        const routedRecords = dispatched.records.get(edge.id)!
        const routedAmount = dispatched.amounts.get(edge.id)!
        edgeRates.set(edge.id, dispatched.rates.get(edge.id)!)
        edgeRecordDeltas.set(edge.id, routedRecords)
        nodeAmounts.set(edge.to, stable(nodeAmounts.get(edge.to)! + routedAmount))
        nodeRates.set(edge.to, stable(nodeRates.get(edge.to)! + dispatched.rates.get(edge.id)!))
        if (routedAmount > 0) nodeWindows.set(edge.to, Math.max(nodeWindows.get(edge.to)!, window))
      }
    }

    if (commit) {
      for (const edge of graph.edges)
        edgeRecords.set(edge.id, edgeRecords.get(edge.id)! + edgeRecordDeltas.get(edge.id)!)
    }

    const nodes: Record<string, NodeSnapshot> = {}
    for (const node of graph.nodes) {
      const rate = nodeRates.get(node)!
      const definition = definitions.get(node)
      const queue = queues.get(node)
      const consumerQueues = queueConsumers.get(node) ?? []
      const consumerCapacity = consumerQueues.reduce(
        (total, queueNode) => total + definitions.get(queueNode)!.capacity,
        0,
      )
      const capacity = definition?.capacity ?? (consumerCapacity || undefined)
      const processed = queue
        ? queue.processed
        : consumerQueues.reduce(
            (total, queueNode) => total + edgeRecords.get(outgoing.get(queueNode)![0]!.id)!,
            0,
          )
      const load = capacity ? stable(rate / capacity) : undefined
      let metric = ""
      if (definition) metric = `${format(queue!.backlog)} queued`
      else if (queueConsumers.has(node)) metric = `${format(processed)} consumed`
      else if (sourceNodes.has(node)) metric = `${format(rate)} r/s`
      nodes[node] = {
        rate,
        queued: queue?.backlog ?? 0,
        processed,
        ...(capacity && {
          capacity,
          load,
          loadLabel: `${format(rate)}/${format(capacity)}`,
        }),
        metric,
        state: "normal",
      }
    }
    const edges = Object.fromEntries(
      graph.edges.map((edge): [string, EdgeSnapshot] => {
        const rate = edgeRates.get(edge.id)!
        let dots = Math.max(0, Math.ceil((rate * program.dots.durationMs) / 1000 - 1e-9))
        if (commit) {
          const records = edgeRecordDeltas.get(edge.id)!
          dots = records <= 0 ? 0 : Math.min(records, dots)
        }
        return [
          edge.id,
          {
            rate,
            records: edgeRecords.get(edge.id)!,
            dots,
            radius: program.dots.radius,
            durationMs: program.dots.durationMs,
            state: "normal",
          },
        ]
      }),
    )
    return { controls: { ...controls }, nodes, edges }
  }

  const refresh = () => (snapshot = evaluate(0, false))
  const initialControls = controls
  controls = Object.fromEntries(program.controls.map((control) => [control.id, control.max]))
  const maximum = evaluate(0, false)
  controls = initialControls
  const maximumEdges = Object.values(maximum.edges)
  if (maximumEdges.some((edge) => edge.dots > 500))
    fail("$.dots", "raises an edge above 500 simultaneous dots")
  if (maximumEdges.reduce((total, edge) => total + edge.dots, 0) > 1024)
    fail("$.dots", "raises a mount above 1024 simultaneous dots")
  refresh()
  return {
    current: () => snapshot,
    update(id, value) {
      const declaration = program.controls.find((control) => control.id === id)
      if (!declaration) fail(`$.controls.${id}`, "is unknown")
      const control = declaration!
      if (!Number.isFinite(value) || value < control.min || value > control.max)
        fail(`$.controls.${id}`, "is outside the declared range")
      controls = { ...controls, [id]: value }
      return refresh()
    },
    advance(elapsedSeconds) {
      if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0)
        fail("$.elapsedSeconds", "must be a non-negative finite number")
      if (elapsedSeconds === 0) return snapshot
      snapshot = evaluate(elapsedSeconds, true)
      return snapshot
    },
    reset() {
      controls = { ...program.initialControls }
      queues = new Map(program.queues.map((queue) => [queue.node, { backlog: 0, processed: 0 }]))
      routes = initialRoutes()
      edgeRecords.forEach((_, edge) => edgeRecords.set(edge, 0))
      return refresh()
    },
  }
}
