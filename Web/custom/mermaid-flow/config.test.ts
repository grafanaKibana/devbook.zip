import assert from "node:assert/strict"
import test from "node:test"
import { ConfigError, normalizeConfig, parseConfig } from "./src/config"

const valid = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ version: 1, for: "test-flow", ...extra })

const errorPath = (source: string) => {
  const result = normalizeConfig(source)
  assert.equal(result.ok, false)
  return result.ok ? "" : result.error.path
}

test("normalizes minimal JSON into immutable particle defaults", () => {
  const result = normalizeConfig(valid({ defaults: { nodes: { A: {} }, edges: { "0": {} } } }))
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.config.defaults, {
    nodes: { A: { state: "normal" } },
    edges: {
      "0": {
        radius: 3,
        particlesPerCycle: 1,
        direction: "forward",
        delayMs: 0,
        visible: true,
        travelMs: 1000,
        state: "normal",
      },
    },
  })
  assert.ok(Object.isFrozen(result.config))
  assert.ok(Object.isFrozen(result.config.defaults.edges["0"]))
})

test("returns one local runtime-schema-invalid error with the exact path", () => {
  assert.equal(errorPath("{"), "$")
  assert.equal(errorPath(JSON.stringify({ version: 2, for: "test-flow" })), "$.version")
  assert.equal(errorPath(valid({ surprise: true })), "$.surprise")
  assert.equal(
    errorPath(valid({ defaults: { edges: { "0": { surprise: true } } } })),
    "$.defaults.edges.0.surprise",
  )
  const result = normalizeConfig(valid({ surprise: true }))
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.code, "runtime-schema-invalid")
    assert.match(result.error.message, /^\$\.surprise:/)
  }
  assert.throws(() => parseConfig(valid({ surprise: true })), ConfigError)
})

test("enforces pairing grammar and 80 Unicode code-point strings", () => {
  for (const id of ["", "Upper", "1flow", "-flow", "under_score", `a${"b".repeat(64)}`])
    assert.equal(errorPath(JSON.stringify({ version: 1, for: id })), "$.for")
  const eightyAstral = "😀".repeat(80)
  assert.equal(
    normalizeConfig(valid({ defaults: { nodes: { A: { metric: ` ${eightyAstral} ` } } } })).ok,
    true,
  )
  assert.equal(
    errorPath(valid({ defaults: { nodes: { A: { metric: "😀".repeat(81) } } } })),
    "$.defaults.nodes.A.metric",
  )
})

test("accepts inclusive particle limits, applies defaults, and never clamps", () => {
  const result = normalizeConfig(
    valid({
      defaults: {
        edges: {
          "0": { radius: 1, particlesPerCycle: 0, delayMs: 0, travelMs: 250, visible: false },
          "1": {
            radius: 6,
            particlesPerCycle: 500,
            direction: "reverse",
            delayMs: 10_000,
            travelMs: 10_000,
          },
        },
      },
    }),
  )
  assert.equal(result.ok, true)
  for (const [field, value] of [
    ["radius", "3px"],
    ["particlesPerCycle", 1.5],
    ["delayMs", -1],
    ["travelMs", 10_001],
    ["visible", "true"],
    ["direction", "sideways"],
  ] as const)
    assert.equal(
      errorPath(valid({ defaults: { edges: { "0": { [field]: value } } } })),
      `$.defaults.edges.0.${field}`,
    )
})

test("keeps the authored control union closed and scenario references bijective", () => {
  const scenarios = [{ id: "normal", patch: {} }]
  const controls = [
    {
      id: "scenario",
      type: "scenario",
      label: " Traffic state ",
      default: "normal",
      options: ["normal"],
    },
  ]
  const result = normalizeConfig(valid({ controls, scenarios }))
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.config.controls[0]?.label, "Traffic state")
    assert.deepEqual(
      result.config.scenarios.map(({ id }) => id),
      ["normal"],
    )
  }
  assert.equal(errorPath(valid({ scenarios: { normal: { patch: {} } } })), "$.scenarios")
  assert.equal(
    errorPath(valid({ controls: [{ id: "play", type: "play", label: "Play" }] })),
    "$.controls[0].type",
  )
  assert.equal(
    errorPath(valid({ controls: [controls[0], { ...controls[0], id: "scenario-2" }], scenarios })),
    "$.controls",
  )
  assert.equal(
    errorPath(valid({ controls: [{ ...controls[0], options: ["normal", "normal"] }], scenarios })),
    "$.controls[0].options[1]",
  )
  assert.equal(
    errorPath(valid({ controls: [{ ...controls[0], options: ["missing"] }], scenarios })),
    "$.controls[0].options[0]",
  )
  assert.equal(
    errorPath(valid({ controls: [{ ...controls[0], default: "missing" }], scenarios })),
    "$.controls[0].default",
  )
  assert.equal(
    errorPath(valid({ controls, scenarios: [...scenarios, { id: "missing", patch: {} }] })),
    "$.scenarios[1].id",
  )
  assert.equal(
    errorPath(valid({ controls, scenarios: [...scenarios, scenarios[0]] })),
    "$.scenarios[1].id",
  )
})

test("rejects overlapping scenario, binding, and threshold writers", () => {
  const controls = [
    { id: "scenario", type: "scenario", label: "State", default: "normal", options: ["normal"] },
    { id: "traffic", type: "range", label: "Traffic", min: 0, max: 10, step: 1, default: 0 },
  ]
  const source = valid({
    defaults: { nodes: { A: {} } },
    controls,
    scenarios: [{ id: "normal", patch: { nodes: { A: { state: "normal" } } } }],
    thresholds: [
      {
        control: "traffic",
        target: { node: "A", property: "state" },
        bands: [{ below: 5, value: "normal" }, { otherwise: "busy" }],
      },
    ],
  })
  assert.equal(errorPath(source), "$.thresholds[0].target")

  assert.equal(
    normalizeConfig(
      valid({
        defaults: { nodes: { A: {} } },
        controls: [{ ...controls[0], options: ["normal", "busy"] }],
        scenarios: [
          { id: "normal", patch: { nodes: { A: { state: "normal" } } } },
          { id: "busy", patch: { nodes: { A: { state: "busy" } } } },
        ],
      }),
    ).ok,
    true,
  )
})

test("enforces collection and resolved particle ceilings without truncation", () => {
  const controls = Array.from({ length: 17 }, (_, index) => ({
    id: `range-${index}`,
    type: "range",
    label: `Range ${index}`,
    min: 0,
    max: 1,
    step: 1,
    default: 0,
  }))
  assert.equal(errorPath(valid({ controls })), "$.controls")

  const edges = {
    "0": { particlesPerCycle: 500 },
    "1": { particlesPerCycle: 500 },
    "2": { particlesPerCycle: 25 },
  }
  assert.equal(errorPath(valid({ defaults: { edges } })), "$.defaults.edges.2.particlesPerCycle")

  const accepted = {
    "0": { particlesPerCycle: 500 },
    "1": { particlesPerCycle: 500 },
    "2": { particlesPerCycle: 0 },
  }
  assert.equal(normalizeConfig(valid({ defaults: { edges: accepted } })).ok, true)

  assert.equal(
    errorPath(
      valid({
        defaults: { edges: accepted },
        controls: [
          { id: "density", type: "range", label: "Density", min: 0, max: 25, step: 1, default: 0 },
        ],
        bindings: [{ control: "density", target: { edge: "2", property: "particlesPerCycle" } }],
      }),
    ),
    "$.bindings[0].target",
  )
})

test("validates ordered threshold bands and exact numeric paths", () => {
  const base = {
    defaults: { nodes: { A: {} } },
    controls: [
      { id: "traffic", type: "range", label: "Traffic", min: 0, max: 2000, step: 1, default: 0 },
    ],
    thresholds: [
      {
        control: "traffic",
        target: { node: "A", property: "state" },
        bands: [
          { below: 1200, value: "normal" },
          { below: 1800, value: "busy" },
          { otherwise: "overloaded" },
        ],
      },
    ],
  }
  assert.equal(normalizeConfig(valid(base)).ok, true)
  const invalid = structuredClone(base)
  invalid.thresholds[0]!.bands[1] = { below: 1000, value: "busy" }
  assert.equal(errorPath(valid(invalid)), "$.thresholds[0].bands[1].below")
  const extra = structuredClone(base)
  extra.thresholds[0]!.bands[2] = { otherwise: "overloaded", value: "busy" } as never
  assert.equal(errorPath(valid(extra)), "$.thresholds[0].bands[2].value")
})

test("normalizes bounded numeric transforms and validates their reachable outputs", () => {
  const base = {
    defaults: { nodes: { queue: {} }, edges: { "0": {} } },
    controls: [
      {
        id: "traffic",
        type: "range",
        label: "Traffic",
        min: 0,
        max: 2400,
        step: 100,
        default: 900,
      },
    ],
    bindings: [
      {
        control: "traffic",
        target: { node: "queue", property: "metric" },
        format: "{value} queued/min",
        transform: { offset: -1200, min: 0, round: true },
      },
      {
        control: "traffic",
        target: { edge: "0", property: "particlesPerCycle" },
        transform: { scale: 1 / 300, max: 8, round: true },
      },
    ],
  }
  const result = normalizeConfig(valid(base))
  assert.equal(result.ok, true)
  if (result.ok)
    assert.deepEqual(result.config.bindings[0]?.transform, { offset: -1200, min: 0, round: true })

  for (const [transform, path] of [
    [{}, "$.bindings[0].transform"],
    [{ unknown: 1 }, "$.bindings[0].transform.unknown"],
    [{ min: 2, max: 1 }, "$.bindings[0].transform.max"],
    [{ round: "yes" }, "$.bindings[0].transform.round"],
  ] as const) {
    const invalid = structuredClone(base)
    invalid.bindings[0]!.transform = transform as never
    assert.equal(errorPath(valid(invalid)), path)
  }

  const fractional = structuredClone(base)
  fractional.bindings[1]!.transform = { scale: 1 / 300 }
  assert.equal(errorPath(valid(fractional)), "$.bindings[1].transform.round")

  const tooMany = structuredClone(base)
  tooMany.bindings[1]!.transform = { scale: 1, round: true }
  assert.equal(errorPath(valid(tooMany)), "$.bindings[1].target.property")
})

test("validates bounded queue simulations and reserves their metric targets", () => {
  const base = {
    defaults: { nodes: { T1: {}, C1: {} } },
    controls: [
      {
        id: "traffic",
        type: "range",
        label: "Traffic",
        min: 0,
        max: 7200,
        step: 300,
        default: 2700,
      },
    ],
    queues: [
      {
        control: "traffic",
        arrival: { scale: 1 / 3 },
        capacityPerSecond: 40,
        queueNode: "T1",
        consumerNode: "C1",
        queueFormat: "{value} queued",
        consumerFormat: "{value} consumed at {rate}/{capacity}",
      },
    ],
  }
  const result = normalizeConfig(valid(base))
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.config.queues[0]?.capacityPerSecond, 40)

  const negative = structuredClone(base)
  negative.queues[0]!.arrival = { scale: -1 }
  assert.equal(errorPath(valid(negative)), "$.queues[0].arrival")

  const missingFormat = structuredClone(base)
  missingFormat.queues[0]!.queueFormat = "queued"
  assert.equal(errorPath(valid(missingFormat)), "$.queues[0].queueFormat")

  const missingNode = structuredClone(base)
  missingNode.queues[0]!.consumerNode = "missing"
  assert.equal(errorPath(valid(missingNode)), "$.queues[0].consumerNode")

  const overlap = structuredClone(base) as Record<string, unknown>
  overlap.bindings = [
    {
      control: "traffic",
      target: { node: "T1", property: "metric" },
      format: "{value}",
    },
  ]
  assert.equal(errorPath(valid(overlap)), "$.queues[0].queueNode")
})

test("rejects every writer target absent from authored defaults", () => {
  const range = {
    id: "load",
    type: "range",
    label: "Load",
    min: 0,
    max: 8,
    step: 1,
    default: 1,
  }
  const scenarioControl = {
    id: "scenario",
    type: "scenario",
    label: "Scenario",
    default: "normal",
    options: ["normal", "missing"],
  }
  for (const [patch, path] of [
    [{ nodes: { missing: { state: "busy" } } }, "$.scenarios[1].patch.nodes.missing"],
    [{ edges: { "1": { state: "busy" } } }, "$.scenarios[1].patch.edges.1"],
  ] as const)
    assert.equal(
      errorPath(
        valid({
          defaults: { nodes: { A: {} }, edges: { "0": {} } },
          controls: [scenarioControl],
          scenarios: [
            { id: "normal", patch: {} },
            { id: "missing", patch },
          ],
        }),
      ),
      path,
    )

  for (const [collection, target, path] of [
    ["bindings", { node: "missing", property: "metric" }, "$.bindings[0].target"],
    ["bindings", { edge: "1", property: "radius" }, "$.bindings[0].target"],
    ["thresholds", { node: "missing", property: "state" }, "$.thresholds[0].target"],
    ["thresholds", { edge: "1", property: "state" }, "$.thresholds[0].target"],
  ] as const) {
    const writer =
      collection === "bindings"
        ? { control: "load", target, ...(target.property === "metric" && { format: "{value}" }) }
        : { control: "load", target, bands: [{ below: 4, value: "normal" }, { otherwise: "busy" }] }
    assert.equal(
      errorPath(
        valid({
          defaults: { nodes: { A: {} }, edges: { "0": {} } },
          controls: [range],
          [collection]: [writer],
        }),
      ),
      path,
    )
  }
})

test("rejects fractional defaults bound to integer edge properties", () => {
  for (const [property, min, max, step] of [
    ["particlesPerCycle", 0, 500, 1],
    ["delayMs", 0, 10_000, 1],
    ["travelMs", 250, 10_000, 250],
  ] as const)
    assert.equal(
      errorPath(
        valid({
          defaults: { edges: { "0": {} } },
          controls: [
            { id: "value", type: "range", label: "Value", min, max, step, default: min + 0.5 },
          ],
          bindings: [{ control: "value", target: { edge: "0", property } }],
        }),
      ),
      "$.bindings[0].target.property",
    )
})
