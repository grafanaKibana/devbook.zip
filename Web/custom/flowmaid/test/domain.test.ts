import assert from "node:assert/strict"
import test from "node:test"

import { compileFlowmaid } from "../src/domain/compile"
import { createSimulation } from "../src/simulation/state"
import type { DirectedGraph } from "../src/domain/types"
import { fixture } from "./helpers"

test("approved fixtures compile to a versionless, deeply frozen closed model", () => {
  const staticFlow = fixture("static")
  assert.deepEqual(staticFlow, {
    controls: [],
    initialControls: {},
    sources: [{ rate: 3, nodes: ["producer"] }],
    distributions: [],
    queues: [],
    dots: { radius: 2, durationMs: 800 },
  })
  const kafka = fixture("kafka")
  assert.deepEqual(kafka.controls[0], {
    id: "input",
    label: "Input rate",
    min: 0,
    max: 30,
    value: 10,
    step: 1,
    unit: "r/s",
  })
  assert.deepEqual(kafka.initialControls, { input: 10 })
  assert.deepEqual(kafka.dots, { radius: 3, durationMs: 500 })
  assert.equal(Object.isFrozen(kafka), true)
  assert.equal(Object.isFrozen(kafka.controls), true)
  assert.equal("version" in kafka, false)
})

test("unknown and superseded public keys fail at every schema level", () => {
  for (const key of [
    "version",
    "v1",
    "v2",
    "for",
    "legacy",
    "compatibility",
    "split",
    "flows",
    "pairs",
    "thresholds",
    "bindings",
    "transforms",
    "scenarios",
  ])
    assert.throws(() => compileFlowmaid({ sources: [], [key]: true }), new RegExp(`\\$\\.${key}`))
  assert.throws(
    () => compileFlowmaid({ sources: [{ rate: 1, nodes: ["A"], extra: true }] }),
    /extra/u,
  )
  assert.throws(
    () =>
      compileFlowmaid({
        controls: { x: { label: "X", min: 0, max: 1, value: 0, step: 1, reset: true } },
        sources: [],
      }),
    /reset/u,
  )
  assert.throws(
    () => compileFlowmaid({ sources: [{ rate: "missing", nodes: ["A"] }] }),
    /existing control/u,
  )
  assert.throws(() => compileFlowmaid({ sources: [{ rate: -1, nodes: ["A"] }] }), /non-negative/u)
})

test("declared limits accept the boundary and reject one over", () => {
  const controls = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [
      `c${i}`,
      { label: `C${i}`, min: 0, max: 1, value: 0, step: 1 },
    ]),
  )
  assert.equal(compileFlowmaid({ controls, sources: [] }).controls.length, 16)
  assert.throws(
    () =>
      compileFlowmaid({
        controls: { ...controls, c16: { label: "C16", min: 0, max: 1, value: 0, step: 1 } },
        sources: [],
      }),
    /at most 16/u,
  )
  assert.doesNotThrow(() =>
    compileFlowmaid({ sources: [{ rate: 1, nodes: ["A"] }], dots: { radius: 1, durationMs: 250 } }),
  )
  assert.doesNotThrow(() =>
    compileFlowmaid({
      sources: [{ rate: 1, nodes: ["A"] }],
      dots: { radius: 6, durationMs: 10000 },
    }),
  )
  for (const dots of [
    { radius: 0, durationMs: 1000 },
    { radius: 7, durationMs: 1000 },
    { radius: 3, durationMs: 249 },
    { radius: 3, durationMs: 10001 },
  ])
    assert.throws(() => compileFlowmaid({ sources: [], dots }))

  const sources = Array.from({ length: 16 }, (_, i) => ({ rate: 1, nodes: [`s${i}`] }))
  assert.equal(compileFlowmaid({ sources }).sources.length, 16)
  assert.throws(
    () => compileFlowmaid({ sources: [...sources, { rate: 1, nodes: ["s16"] }] }),
    /at most 16/u,
  )

  const referenced = Array.from({ length: 64 }, (_, i) => `n${i}`)
  assert.doesNotThrow(() => compileFlowmaid({ sources: [{ rate: 1, nodes: referenced }] }))
  assert.throws(
    () => compileFlowmaid({ sources: [{ rate: 1, nodes: [...referenced, "n64"] }] }),
    /at most 64/u,
  )

  const distribution = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`d${i}`, { strategy: "roundRobin" }]),
  )
  assert.equal(compileFlowmaid({ sources: [], distribution }).distributions.length, 16)
  assert.throws(
    () =>
      compileFlowmaid({
        sources: [],
        distribution: { ...distribution, d16: { strategy: "roundRobin" } },
      }),
    /at most 16/u,
  )

  const weights = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`n${i}`, 1]))
  assert.equal(
    compileFlowmaid({
      sources: [],
      distribution: { n0: { strategy: "weightedRoundRobin", weights } },
    }).distributions[0]!.weights && Object.keys(weights).length,
    64,
  )
  assert.throws(
    () =>
      compileFlowmaid({
        sources: [],
        distribution: {
          n0: { strategy: "weightedRoundRobin", weights: { ...weights, n64: 1 } },
        },
      }),
    /at most 64/u,
  )

  const queues = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [`q${i}`, { capacity: 1 }]),
  )
  assert.equal(compileFlowmaid({ sources: [], queues }).queues.length, 16)
  assert.throws(
    () => compileFlowmaid({ sources: [], queues: { ...queues, q16: { capacity: 1 } } }),
    /at most 16/u,
  )

  const graph = (edges: number): DirectedGraph => ({
    nodes: ["A", ...Array.from({ length: edges }, (_, i) => `B${i}`)],
    edges: Array.from({ length: edges }, (_, i) => ({ id: `e${i}`, from: "A", to: `B${i}` })),
  })
  const program = compileFlowmaid({ sources: [{ rate: 1, nodes: ["A"] }] })
  assert.doesNotThrow(() => createSimulation(program, graph(64)))
  assert.throws(() => createSimulation(program, graph(65)), /at most 64/u)

  const capped = (
    rate: number,
    weights: Record<string, number>,
  ): [ReturnType<typeof compileFlowmaid>, DirectedGraph] => [
    compileFlowmaid({
      sources: [{ rate, nodes: ["A"] }],
      ...(Object.keys(weights).length > 1 && {
        distribution: { A: { strategy: "weightedRoundRobin", weights } },
      }),
    }),
    {
      nodes: ["A", ...Object.keys(weights)],
      edges: Object.keys(weights).map((node, i) => ({ id: `e${i}`, from: "A", to: node })),
    },
  ]
  assert.doesNotThrow(() => createSimulation(...capped(500, { B: 1 })))
  assert.throws(() => createSimulation(...capped(501, { B: 1 })), /above 500/u)
  assert.doesNotThrow(() => createSimulation(...capped(1024, { B: 342, C: 341, D: 341 })))
  assert.throws(() => createSimulation(...capped(1025, { B: 343, C: 341, D: 341 })), /above 1024/u)

  assert.doesNotThrow(() =>
    compileFlowmaid({ sources: [], queues: { A: { capacity: Number.MAX_VALUE } } }),
  )
  assert.throws(
    () => compileFlowmaid({ sources: [], queues: { A: { capacity: Infinity } } }),
    /finite/u,
  )
})
