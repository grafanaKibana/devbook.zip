import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { parseConfig } from "./src/config"
import { productionBeginTimes } from "./src/mermaid-svg-adapter"
import { createLocalState, recompute } from "./src/state"
import type { NormalizedConfig } from "./src/types"

const config = (): NormalizedConfig => ({
  version: 1,
  for: "flow",
  defaults: {
    nodes: {
      producer: { metric: "900 req/min", state: "normal" },
      topic: { metric: "20 queued", state: "normal" },
    },
    edges: {
      "0": {
        radius: 3,
        particlesPerCycle: 4,
        direction: "forward",
        delayMs: 0,
        visible: true,
        travelMs: 800,
        state: "normal",
      },
    },
  },
  controls: [
    {
      id: "scenario",
      type: "scenario",
      label: "Traffic state",
      default: "normal",
      options: ["normal", "overload", "recovery"],
    },
    {
      id: "traffic",
      type: "range",
      label: "Producer traffic",
      min: 0,
      max: 2400,
      step: 100,
      default: 900,
    },
    { id: "reset", type: "reset", label: "Reset" },
  ],
  scenarios: [
    { id: "normal", patch: { nodes: {}, edges: {} } },
    {
      id: "overload",
      patch: {
        nodes: { topic: { metric: "12,500 queued", state: "overloaded" } },
        edges: { "0": { particlesPerCycle: 7, travelMs: 500, state: "overloaded" } },
      },
    },
    {
      id: "recovery",
      patch: {
        nodes: { topic: { metric: "200 queued", state: "busy" } },
        edges: { "0": { particlesPerCycle: 3, travelMs: 900, state: "normal" } },
      },
    },
  ],
  bindings: [
    {
      control: "traffic",
      target: { node: "producer", property: "metric" },
      format: "{value} req/min",
    },
  ],
  thresholds: [
    {
      control: "traffic",
      target: { node: "producer", property: "state" },
      bands: [
        { below: 1200, value: "normal" },
        { below: 1800, value: "busy" },
        { otherwise: "overloaded" },
      ],
    },
  ],
  queues: [],
  initialControls: { scenario: "normal", traffic: 900 },
})

test("recomputes scenario, binding, and ordered threshold state from defaults", () => {
  const source = config()
  const result = recompute(source, { scenario: "overload", traffic: 1200 })
  assert.equal(result.visual.nodes.topic.metric, "12,500 queued")
  assert.equal(result.visual.edges["0"].particlesPerCycle, 7)
  assert.deepEqual(result.visual.nodes.producer, { metric: "1200 req/min", state: "busy" })
  assert.equal(source.defaults.nodes.producer.metric, "900 req/min")
})

test("threshold equality enters the next band", () => {
  const source = config()
  assert.equal(recompute(source, { traffic: 1199 }).visual.nodes.producer.state, "normal")
  assert.equal(recompute(source, { traffic: 1200 }).visual.nodes.producer.state, "busy")
  assert.equal(recompute(source, { traffic: 1799 }).visual.nodes.producer.state, "busy")
  assert.equal(recompute(source, { traffic: 1800 }).visual.nodes.producer.state, "overloaded")
})

test("derives queue growth and animated-dot density from request rate", () => {
  const base = config()
  const source: NormalizedConfig = {
    ...base,
    controls: base.controls.filter((control) => control.type !== "scenario"),
    scenarios: [],
    bindings: [
      {
        control: "traffic",
        target: { node: "topic", property: "metric" },
        format: "{value} backlog/min",
        transform: { offset: -1200, min: 0, round: true },
      },
      {
        control: "traffic",
        target: { edge: "0", property: "particlesPerCycle" },
        transform: { scale: 1 / 300, max: 8, round: true },
      },
      {
        control: "traffic",
        target: { edge: "0", property: "travelMs" },
        transform: { scale: -0.375, offset: 1400, min: 500, max: 1400, round: true },
      },
    ],
    thresholds: [],
    initialControls: { traffic: 900 },
  }

  const belowCapacity = recompute(source, { traffic: 900 }).visual
  assert.equal(belowCapacity.nodes.topic.metric, "0 backlog/min")
  assert.equal(belowCapacity.edges["0"].particlesPerCycle, 3)
  assert.equal(belowCapacity.edges["0"].travelMs, 1063)

  const overloaded = recompute(source, { traffic: 2400 }).visual
  assert.equal(overloaded.nodes.topic.metric, "1200 backlog/min")
  assert.equal(overloaded.edges["0"].particlesPerCycle, 8)
  assert.equal(overloaded.edges["0"].travelMs, 500)
})

test("accumulates, drains, resets, and conserves a bounded per-second queue", () => {
  const base = config()
  const source: NormalizedConfig = {
    ...base,
    defaults: {
      ...base.defaults,
      nodes: {
        ...base.defaults.nodes,
        consumer: { metric: "0 consumed", state: "normal" },
      },
    },
    scenarios: [],
    controls: base.controls.filter((control) => control.type !== "scenario"),
    bindings: [],
    thresholds: [],
    queues: [
      {
        control: "traffic",
        arrival: { scale: 1 },
        capacityPerSecond: 40,
        queueNode: "topic",
        consumerNode: "consumer",
        queueFormat: "{value} queued",
        consumerFormat: "{value} consumed · {rate}/{capacity} r/s",
      },
    ],
    initialControls: { traffic: 30 },
  }
  const mounted = createLocalState(source)
  assert.equal(mounted.current().visual.nodes.topic.metric, "0 queued")

  assert.equal(mounted.advance(1000).visual.nodes.consumer.metric, "30 consumed · 30/40 r/s")
  mounted.update("traffic", 50)
  const overloaded = mounted.advance(1000).visual
  assert.deepEqual(overloaded.nodes.topic, {
    metric: "10 queued",
    load: 1.25,
    loadLabel: "50/40",
    state: "normal",
  })
  assert.deepEqual(overloaded.nodes.consumer, {
    metric: "70 consumed · 40/40 r/s",
    load: 1,
    loadLabel: "40/40",
    state: "normal",
  })

  mounted.update("traffic", 20)
  const drained = mounted.advance(1000).visual
  assert.equal(drained.nodes.topic.metric, "0 queued")
  assert.equal(drained.nodes.consumer.metric, "100 consumed · 30/40 r/s")
  assert.throws(() => mounted.advance(-1), /elapsed time -1 is invalid/)
  assert.equal(mounted.reset().visual.nodes.consumer.metric, "0 consumed · 30/40 r/s")
})

test("A to B equals a fresh mount directly in B and repeated transitions do not leak", () => {
  const source = config()
  const mounted = createLocalState(source)
  mounted.update("scenario", "overload")
  const afterRecovery = mounted.update("scenario", "recovery")
  const freshRecovery = recompute(source, { scenario: "recovery", traffic: 900 })
  assert.deepEqual(afterRecovery, freshRecovery)

  mounted.update("scenario", "overload")
  assert.deepEqual(mounted.update("scenario", "recovery"), freshRecovery)
  assert.deepEqual(mounted.update("scenario", "recovery"), freshRecovery)
})

test("reset restores the exact initial controls and visual state", () => {
  const mounted = createLocalState(config())
  const initial = structuredClone(mounted.current())
  mounted.update("scenario", "overload")
  mounted.update("traffic", 2200)
  assert.deepEqual(mounted.reset(), initial)
})

test("mount instances are isolated", () => {
  const source = config()
  const first = createLocalState(source)
  const second = createLocalState(source)
  first.update("scenario", "overload")
  first.update("traffic", 2200)
  assert.deepEqual(second.current(), recompute(source))
})

test("unknown controls and scenarios fail locally", () => {
  const source = config()
  assert.throws(() => recompute(source, { unknown: 1 }), /unknown value control unknown/)
  assert.throws(() => recompute(source, { scenario: "missing" }), /invalid scenario missing/)

  const mounted = createLocalState(source)
  const before = mounted.current()
  assert.throws(() => mounted.update("unknown", 1), /unknown value control unknown/)
  assert.deepEqual(mounted.current(), before)
})

test("Kafka sources bounded r/s traffic at producers without changing arrow styles", () => {
  const note = readFileSync(
    new URL(
      "../../../Vault/Home/Software Architecture/Distributed Systems/Message Queues/Kafka.md",
      import.meta.url,
    ),
    "utf8",
  )
  const source = note.match(/```mermaid-flow\n([\s\S]*?)\n```/u)?.[1]
  assert.ok(source)
  const kafka = parseConfig(source)
  assert.deepEqual(
    kafka.controls.map(({ id }) => id),
    ["traffic", "reset"],
  )

  assert.equal(kafka.queues.length, 3)
  const normal = recompute(kafka, { traffic: 30 }).visual
  assert.equal(normal.nodes.P1.metric, "15 r/s")
  assert.equal(normal.nodes.P2.metric, "15 r/s")
  for (const edge of ["0", "1"]) assert.equal(normal.edges[edge].particlesPerCycle, 15)
  for (const edge of ["2", "3", "4", "5", "6", "7"])
    assert.equal(normal.edges[edge].particlesPerCycle, 10)

  const mounted = createLocalState(kafka)
  mounted.update("traffic", 90)
  const overloaded = mounted.advance(1000).visual
  for (const partition of ["T1", "T2", "T3"]) {
    assert.equal(overloaded.nodes[partition].metric, "10 queued")
    assert.equal(overloaded.nodes[partition].load, 1.5)
    assert.equal(overloaded.nodes[partition].loadLabel, "30/20")
    assert.equal(overloaded.nodes[partition].state, "normal")
  }
  for (const consumer of ["C1", "C2", "C3"])
    assert.deepEqual(overloaded.nodes[consumer], {
      metric: "20 consumed",
      load: 1,
      loadLabel: "20/20",
      state: "normal",
    })
  for (const edge of ["0", "1"])
    assert.deepEqual(
      [
        overloaded.edges[edge].particlesPerCycle,
        overloaded.edges[edge].travelMs,
        overloaded.edges[edge].state,
      ],
      [45, 1000, "normal"],
    )
  for (const edge of ["2", "3", "4"])
    assert.deepEqual(
      [
        overloaded.edges[edge].particlesPerCycle,
        overloaded.edges[edge].travelMs,
        overloaded.edges[edge].state,
      ],
      [30, 1000, "normal"],
    )
  for (const edge of ["5", "6", "7"])
    assert.deepEqual(
      [
        overloaded.edges[edge].particlesPerCycle,
        overloaded.edges[edge].travelMs,
        overloaded.edges[edge].state,
      ],
      [20, 1000, "normal"],
    )

  assert.equal(mounted.advance(1000).visual.nodes.T1.metric, "20 queued")
  mounted.update("traffic", 30)
  assert.equal(mounted.advance(2000).visual.nodes.T1.metric, "0 queued")
  const reset = mounted.reset().visual
  assert.equal(reset.nodes.P1.metric, "15 r/s")
  assert.equal(reset.nodes.T1.metric, "0 queued")
  assert.equal(reset.nodes.T1.loadLabel, "10/20")
  assert.equal(reset.nodes.C1.metric, "0 consumed")
})

test("one r/s schedules exactly one new dot per second", () => {
  assert.deepEqual(productionBeginTimes(0, 1000, 1), [0])
})
