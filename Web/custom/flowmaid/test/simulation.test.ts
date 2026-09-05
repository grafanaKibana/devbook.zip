import assert from "node:assert/strict"
import test from "node:test"

import { compileFlowmaid } from "../src/domain/compile"
import type { DirectedGraph } from "../src/domain/types"
import { createSimulation } from "../src/simulation/state"
import { createSimulationClock } from "../src/simulation/clock"
import { fixture, kafkaGraph } from "./helpers"

const branchGraph: DirectedGraph = {
  nodes: ["A", "B", "C"],
  edges: [
    { id: "AB", from: "A", to: "B" },
    { id: "AC", from: "A", to: "C" },
  ],
}
const branch = (
  strategy: "roundRobin" | "weightedRoundRobin" | "random" | "broadcast",
  weights?: Record<string, number>,
) =>
  createSimulation(
    compileFlowmaid({
      sources: [{ rate: 10, nodes: ["A"] }],
      distribution: { A: { strategy, ...(weights && { weights }) } },
    }),
    branchGraph,
  )

test("routing strategies are deterministic and drive the same edge rates and dots", () => {
  assert.deepEqual(
    [branch("roundRobin").current().edges.AB.rate, branch("roundRobin").current().edges.AC.rate],
    [5, 5],
  )
  assert.deepEqual(
    [
      branch("weightedRoundRobin", { B: 3, C: 2 }).current().edges.AB.rate,
      branch("weightedRoundRobin", { B: 3, C: 2 }).current().edges.AC.rate,
    ],
    [6, 4],
  )
  assert.deepEqual(
    [branch("broadcast").current().edges.AB.rate, branch("broadcast").current().edges.AC.rate],
    [10, 10],
  )
  const left = branch("random")
  const right = branch("random")
  assert.deepEqual(left.current(), right.current())
  assert.deepEqual(left.advance(1), right.advance(1))
  assert.deepEqual(left.reset(), right.reset())
  assert.equal(left.current().edges.AB.dots, Math.ceil(left.current().edges.AB.rate))
})

test("graph ambiguity is rejected before simulation starts", () => {
  const program = compileFlowmaid({ sources: [{ rate: 1, nodes: ["A"] }] })
  for (const graph of [
    {
      nodes: ["A", "B"],
      edges: [
        { id: "x", from: "A", to: "B" },
        { id: "y", from: "A", to: "B" },
      ],
    },
    {
      nodes: ["A", "B"],
      edges: [
        { id: "x", from: "A", to: "B" },
        { id: "y", from: "B", to: "A" },
      ],
    },
    { nodes: ["B"], edges: [] },
  ] satisfies DirectedGraph[])
    assert.throws(() => createSimulation(program, graph))
})

test("Kafka queue math is exact across its 0–30 r/s range", () => {
  for (const input of [0, 6, 12, 18, 24, 30]) {
    const state = createSimulation(fixture("kafka"), kafkaGraph)
    const initial = state.update("input", input)
    for (const id of ["PR-T1", "PR-T2", "PR-T3"]) assert.equal(initial.edges[id]!.rate, input / 3)
    const after = state.advance(1)
    for (const [queue, consumer] of [
      ["T1", "C1"],
      ["T2", "C2"],
      ["T3", "C3"],
    ] as const) {
      assert.equal(after.nodes[queue]!.queued, Math.max(0, input / 3 - 4))
      assert.equal(after.nodes[consumer]!.rate, Math.min(input / 3, 4))
      assert.equal(after.nodes[consumer]!.processed, Math.min(input / 3, 4))
      assert.equal(after.nodes[queue]!.loadLabel, `${input / 3}/4`)
    }
  }
  const overloaded = createSimulation(fixture("kafka"), kafkaGraph)
  overloaded.update("input", 30)
  const after = overloaded.advance(1)
  assert.equal(
    ["T1", "T2", "T3"].reduce((sum, id) => sum + after.nodes[id]!.queued, 0),
    18,
  )
  assert.deepEqual(
    ["C1", "C2", "C3"].map((id) => after.nodes[id]!.processed),
    [4, 4, 4],
  )
  const fractionalTick = createSimulation(fixture("kafka"), kafkaGraph)
  fractionalTick.update("input", 20)
  const rounded = fractionalTick.advance(0.31)
  assert.deepEqual(
    ["T1", "T2", "T3"].map((id) => [rounded.nodes[id]!.metric, rounded.nodes[id]!.loadLabel]),
    [
      ["1 queued", "7/4"],
      ["1 queued", "7/4"],
      ["1 queued", "7/4"],
    ],
  )
})

test("fractional ticks conserve whole-record round-robin order", () => {
  const state = createSimulation(fixture("kafka"), kafkaGraph)
  state.update("input", 12)
  let snapshot = state.current()
  for (let tick = 0; tick < 4; tick += 1) snapshot = state.advance(0.25)
  assert.deepEqual(
    [
      snapshot.edges["PR-T1"].records,
      snapshot.edges["PR-T2"].records,
      snapshot.edges["PR-T3"].records,
    ],
    [4, 4, 4],
  )
})

test("one r/s routing and queue output are tick-size invariant", () => {
  const program = compileFlowmaid({
    sources: [{ rate: 1, nodes: ["A"] }],
    distribution: { A: { strategy: "roundRobin" } },
    queues: { B: { capacity: 1 } },
  })
  const graph: DirectedGraph = {
    nodes: ["A", "B", "C", "D"],
    edges: [
      { id: "AB", from: "A", to: "B" },
      { id: "AC", from: "A", to: "C" },
      { id: "BD", from: "B", to: "D" },
    ],
  }
  const whole = createSimulation(program, graph).advance(1)
  const slicedState = createSimulation(program, graph)
  let sliced = slicedState.current()
  for (let tick = 0; tick < 10; tick += 1) sliced = slicedState.advance(0.1)
  assert.deepEqual(sliced.edges.AB, whole.edges.AB)
  assert.deepEqual(sliced.edges.AC, whole.edges.AC)
  assert.deepEqual(sliced.nodes.B, whole.nodes.B)
  assert.deepEqual(sliced.edges.BD, whole.edges.BD)
  assert.equal(
    Object.values(whole.edges).reduce((sum, edge) => sum + edge.dots, 0),
    2,
  )
  assert.equal(whole.edges.AB.dots, 1)
})

test("one r/s routes one complete event to one edge, counter, and dot", () => {
  const state = createSimulation(
    compileFlowmaid({
      sources: [{ rate: 1, nodes: ["A"] }],
      distribution: { A: { strategy: "roundRobin" } },
    }),
    branchGraph,
  )
  for (const elapsed of [0, 0.25, 0.5, 0.75]) {
    const snapshot = elapsed === 0 ? state.current() : state.advance(0.25)
    assert.deepEqual(
      [snapshot.edges.AB.rate, snapshot.edges.AB.records, snapshot.edges.AB.dots],
      [elapsed === 0 ? 0 : 1, 0, 0],
    )
    assert.deepEqual(
      [snapshot.edges.AC.rate, snapshot.edges.AC.records, snapshot.edges.AC.dots],
      [0, 0, 0],
    )
  }
  const first = state.advance(0.25)
  assert.deepEqual([first.edges.AB.rate, first.edges.AB.records, first.edges.AB.dots], [1, 1, 1])
  assert.deepEqual([first.edges.AC.rate, first.edges.AC.records, first.edges.AC.dots], [0, 0, 0])

  for (let tick = 0; tick < 3; tick += 1) state.advance(0.25)
  const second = state.advance(0.25)
  assert.deepEqual([second.edges.AB.rate, second.edges.AB.records, second.edges.AB.dots], [0, 1, 0])
  assert.deepEqual([second.edges.AC.rate, second.edges.AC.records, second.edges.AC.dots], [1, 1, 1])
})

test("unequal merged sources preserve aggregate rate and particle cadence", () => {
  const program = compileFlowmaid({
    sources: [
      { rate: 100, nodes: ["Fast"] },
      { rate: 1, nodes: ["Slow"] },
    ],
  })
  const graph: DirectedGraph = {
    nodes: ["Fast", "Slow", "Merge", "Sink"],
    edges: [
      { id: "fast-merge", from: "Fast", to: "Merge" },
      { id: "slow-merge", from: "Slow", to: "Merge" },
      { id: "merged-sink", from: "Merge", to: "Sink" },
    ],
  }

  const actual = [4, 10].map((steps) => {
    const state = createSimulation(program, graph)
    let particles = 0
    let snapshot = state.current()
    for (let tick = 0; tick < steps; tick += 1) {
      snapshot = state.advance(1 / steps)
      particles += snapshot.edges["merged-sink"].dots
    }
    return {
      steps,
      rate: snapshot.edges["merged-sink"].rate,
      records: snapshot.edges["merged-sink"].records,
      particles,
    }
  })
  assert.deepEqual(actual, [
    { steps: 4, rate: 101, records: 101, particles: 101 },
    { steps: 10, rate: 101, records: 101, particles: 101 },
  ])
})

test("idle time does not bank queue capacity for a later burst", () => {
  const state = createSimulation(
    compileFlowmaid({
      controls: { input: { label: "Input", min: 0, max: 100, value: 0, step: 1 } },
      sources: [{ rate: "input", nodes: ["A"] }],
      queues: { B: { capacity: 20 } },
    }),
    {
      nodes: ["A", "B", "C"],
      edges: [
        { id: "AB", from: "A", to: "B" },
        { id: "BC", from: "B", to: "C" },
      ],
    },
  )
  state.advance(1)
  state.update("input", 100)
  const burst = state.advance(0.25)
  assert.equal(burst.nodes.B.processed, 5)
  assert.equal(burst.nodes.B.queued, 20)
  assert.equal(burst.edges.BC.records, 5)
})

test("low-rate queue service uses capacity times the current tick", () => {
  const program = compileFlowmaid({
    sources: [{ rate: 1, nodes: ["A"] }],
    queues: { Q: { capacity: 0.1 } },
  })
  const graph: DirectedGraph = {
    nodes: ["A", "Q", "B"],
    edges: [
      { id: "AQ", from: "A", to: "Q" },
      { id: "QB", from: "Q", to: "B" },
    ],
  }
  const slicedState = createSimulation(program, graph)
  const processed: number[] = []
  const backlog: number[] = []
  const processedDeltas: number[] = []
  let previousProcessed = 0
  let sliced = slicedState.current()
  for (let tick = 0; tick < 4; tick += 1) {
    sliced = slicedState.advance(0.25)
    processed.push(sliced.nodes.Q.processed)
    backlog.push(sliced.nodes.Q.queued)
    processedDeltas.push(Math.round((sliced.nodes.Q.processed - previousProcessed) * 1e12) / 1e12)
    previousProcessed = sliced.nodes.Q.processed
  }
  assert.deepEqual(
    { processed, backlog, processedDeltas },
    {
      processed: [0.025, 0.05, 0.075, 0.1],
      backlog: [0.225, 0.45, 0.675, 0.9],
      processedDeltas: [0.025, 0.025, 0.025, 0.025],
    },
  )
  assert.ok(processedDeltas.every((delta) => delta <= 0.1 * 0.25))

  const whole = createSimulation(program, graph).advance(1)
  assert.deepEqual(sliced.nodes.Q, whole.nodes.Q)
  assert.deepEqual(sliced.edges.QB, whole.edges.QB)
})

test("continuous queue output rate does not fabricate records or dots", () => {
  const state = createSimulation(
    compileFlowmaid({
      sources: [{ rate: 1, nodes: ["A"] }],
      queues: { Q: { capacity: 0.1 } },
    }),
    {
      nodes: ["A", "Q", "B"],
      edges: [
        { id: "AQ", from: "A", to: "Q" },
        { id: "QB", from: "Q", to: "B" },
      ],
    },
  )

  const ticks = Array.from({ length: 4 }, () => {
    const snapshot = state.advance(0.25)
    return {
      queueProcessed: snapshot.nodes.Q.processed,
      edgeRate: snapshot.edges.QB.rate,
      edgeRecords: snapshot.edges.QB.records,
      edgeDots: snapshot.edges.QB.dots,
      consumerRate: snapshot.nodes.B.rate,
      consumerLoad: snapshot.nodes.B.load,
      consumerProcessed: snapshot.nodes.B.processed,
    }
  })
  assert.deepEqual(
    ticks,
    [0.025, 0.05, 0.075, 0.1].map((queueProcessed) => ({
      queueProcessed,
      edgeRate: 0.1,
      edgeRecords: 0,
      edgeDots: 0,
      consumerRate: 0.1,
      consumerLoad: 1,
      consumerProcessed: 0,
    })),
  )
})

test("configured round-robin forwards continuous rate with its predicted amount", () => {
  const snapshot = createSimulation(
    compileFlowmaid({
      sources: [{ rate: 1, nodes: ["A"] }],
      distribution: { A: { strategy: "roundRobin" } },
      queues: { Q: { capacity: 0.1 } },
    }),
    {
      nodes: ["A", "Q", "Other", "B"],
      edges: [
        { id: "AQ", from: "A", to: "Q" },
        { id: "AO", from: "A", to: "Other" },
        { id: "QB", from: "Q", to: "B" },
      ],
    },
  ).advance(0.25)

  assert.deepEqual(
    {
      predictedEdge: [snapshot.edges.AQ.rate, snapshot.edges.AQ.records, snapshot.edges.AQ.dots],
      otherEdge: [snapshot.edges.AO.rate, snapshot.edges.AO.records, snapshot.edges.AO.dots],
      queue: [snapshot.nodes.Q.rate, snapshot.nodes.Q.queued, snapshot.nodes.Q.load],
      output: [snapshot.edges.QB.rate, snapshot.edges.QB.records, snapshot.edges.QB.dots],
      consumer: [snapshot.nodes.B.rate, snapshot.nodes.B.load, snapshot.nodes.B.processed],
    },
    {
      predictedEdge: [1, 0, 0],
      otherEdge: [0, 0, 0],
      queue: [1, 0.225, 10],
      output: [0.1, 0, 0],
      consumer: [0.1, 1, 0],
    },
  )
})

test("a control update preserves queue state and unrelated route remainder", () => {
  const state = createSimulation(
    compileFlowmaid({
      controls: { input: { label: "Input", min: 1, max: 2, value: 1, step: 1 } },
      sources: [{ rate: "input", nodes: ["A"] }],
      queues: { Q: { capacity: 0.1 } },
    }),
    {
      nodes: ["A", "Q", "B"],
      edges: [
        { id: "AQ", from: "A", to: "Q" },
        { id: "QB", from: "Q", to: "B" },
      ],
    },
  )
  let before = state.current()
  for (let tick = 0; tick < 4; tick += 1) before = state.advance(0.25)
  const updated = state.update("input", 2)
  let future = updated
  for (let tick = 0; tick < 36; tick += 1) future = state.advance(0.25)

  assert.deepEqual(
    {
      before: [before.nodes.Q.processed, before.nodes.Q.queued, before.edges.QB.records],
      updated: [updated.nodes.Q.processed, updated.nodes.Q.queued, updated.edges.QB.records],
      futureRecords: future.edges.QB.records,
    },
    {
      before: [0.1, 0.9, 0],
      updated: [0.1, 0.9, 0],
      futureRecords: 1,
    },
  )
})

test("a control update preserves constant-source remainder through a merge", () => {
  const state = createSimulation(
    compileFlowmaid({
      controls: { input: { label: "Input", min: 0, max: 10, value: 0, step: 1 } },
      sources: [
        { rate: "input", nodes: ["A"] },
        { rate: 1, nodes: ["B"] },
      ],
    }),
    {
      nodes: ["A", "B", "M", "C"],
      edges: [
        { id: "AM", from: "A", to: "M" },
        { id: "BM", from: "B", to: "M" },
        { id: "MC", from: "M", to: "C" },
      ],
    },
  )
  for (let tick = 0; tick < 3; tick += 1) state.advance(0.25)
  state.update("input", 10)
  const snapshot = state.advance(0.25)

  assert.deepEqual(
    [
      snapshot.edges.AM.records,
      snapshot.edges.BM.records,
      snapshot.edges.MC.records,
      snapshot.edges.MC.dots,
    ],
    [2, 1, 3, 3],
  )
})

test("a rate jump cannot spend a low-rate accumulation window as queue service time", () => {
  const state = createSimulation(
    compileFlowmaid({
      controls: { input: { label: "Input", min: 1, max: 100, value: 1, step: 1 } },
      sources: [{ rate: "input", nodes: ["A"] }],
      queues: { Q: { capacity: 20 } },
    }),
    {
      nodes: ["A", "Q", "B"],
      edges: [
        { id: "AQ", from: "A", to: "Q" },
        { id: "QB", from: "Q", to: "B" },
      ],
    },
  )

  let before = state.current()
  for (let tick = 0; tick < 3; tick += 1) before = state.advance(0.25)
  state.update("input", 100)
  const snapshot = state.advance(0.25)

  assert.equal(before.nodes.Q.processed, 0.75)
  assert.equal(snapshot.nodes.Q.processed, 5.75)
  assert.equal(snapshot.nodes.Q.processed - before.nodes.Q.processed, 5)
  assert.equal(snapshot.nodes.Q.queued, 20)
  assert.equal(snapshot.edges.QB.records, 5)
})

test("consumer counters advance only with committed downstream records", () => {
  const snapshot = createSimulation(
    compileFlowmaid({
      sources: [{ rate: 1, nodes: ["A"] }],
      queues: { Q: { capacity: 0.1 } },
    }),
    {
      nodes: ["A", "Q", "B"],
      edges: [
        { id: "AQ", from: "A", to: "Q" },
        { id: "QB", from: "Q", to: "B" },
      ],
    },
  ).advance(1)

  assert.deepEqual(
    {
      processed: snapshot.nodes.B.processed,
      records: snapshot.edges.QB.records,
      rate: snapshot.edges.QB.rate,
      dots: snapshot.edges.QB.dots,
      metric: snapshot.nodes.B.metric,
    },
    { processed: 0, records: 0, rate: 0.1, dots: 0, metric: "0 consumed" },
  )
})

test("queue evolution, reset, isolation, and clock clamp are deterministic", () => {
  const a = createSimulation(fixture("kafka"), kafkaGraph)
  const b = createSimulation(fixture("kafka"), kafkaGraph)
  a.update("input", 20)
  b.update("input", 20)
  assert.deepEqual(a.advance(0.1), b.advance(0.1))
  assert.deepEqual(a.advance(1), b.advance(1))
  a.update("input", 0)
  assert.equal(a.advance(1).nodes.T1!.queued, 0)
  assert.equal(b.current().controls.input, 20)
  assert.equal(a.reset().nodes.T1!.processed, 0)

  let now = 0
  let tick!: () => void
  const elapsed: number[] = []
  let cleared = 0
  const clock = createSimulationClock(
    {
      now: () => now,
      setInterval: (callback) => ((tick = callback), 1),
      clearInterval: () => {
        cleared += 1
      },
    },
    (value) => elapsed.push(value),
  )
  now = 5000
  tick()
  assert.deepEqual(elapsed, [1])
  clock.pause()
  now = 9000
  tick()
  clock.resume()
  now = 9250
  tick()
  assert.deepEqual(elapsed, [1, 0.25])
  clock.destroy()
  clock.destroy()
  assert.equal(cleared, 1)
})
