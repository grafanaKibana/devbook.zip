import assert from "node:assert/strict"
import test from "node:test"
import { loadModule, loadCatalogFixtures } from "./steptrace.catalog.mjs"

test("every registered algorithm builds a nonempty trace from its authored fixture", () => {
  const { steptrace } = loadModule("src/engine.ts")
  const { builtInAlgorithms, interactiveStructures } = loadModule("src/algorithms/index.ts")
  const fixtures = loadCatalogFixtures()
  const ids = [...builtInAlgorithms, ...interactiveStructures].map(({ id }) => id)
  assert.equal(new Set(ids).size, ids.length)
  for (const definition of builtInAlgorithms) {
    const built = steptrace.buildFrames(fixtures.get(definition.id))
    assert.ok(built.frames.length > 0, definition.id)
    assert.equal(built.kind, definition.kind, definition.id)
  }
  assert.throws(() => steptrace.buildFrames({ algorithm: "missing" }), /unknown algorithm/)
})

function runtimeOwnership(built) {
  return built.family?.id
    ? `family:${built.family.id}`
    : built.legacyRenderer
      ? `legacy:${built.legacyRenderer}`
      : undefined
}

test("sort, search and shortest path produce known terminal results", () => {
  const { steptrace } = loadModule("src/engine.ts")
  const terminal = (config) => steptrace.buildFrames(config).frames.at(-1)
  assert.deepEqual(
    terminal({ algorithm: "bubble-sort", array: [3, -1, 3, 0] }).array,
    [-1, 0, 3, 3],
  )
  for (const [target, found] of [
    [3, 1],
    [4, null],
  ]) {
    assert.equal(terminal({ algorithm: "binary-search", array: [1, 3, 5], target }).found, found)
  }
  const graph = terminal({
    algorithm: "dijkstra",
    start: "a",
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
      { from: "a", to: "b", weight: 2 },
      { from: "b", to: "c", weight: 3 },
      { from: "a", to: "c", weight: 9 },
    ],
  })
  assert.deepEqual(graph.detail.distances, { a: 0, b: 2, c: 5 })
  assert.deepEqual(graph.selectedEdges, ["a|b", "b|c"])
})

test("the registry routes every public algorithm kind", () => {
  const { createRegistry } = loadModule("src/registry.ts")
  const registry = createRegistry([])
  const registrations = [
    ["registerSort", "sort", "family:array-sort"],
    ["registerGraph", "graph", "family:graph-state"],
    ["registerSearch", "search", "family:indexed-array-search"],
    ["registerString", "string", "family:string-match"],
    ["registerPointer", "pointers", "family:indexed-pointer-window"],
    ["registerDP", "dp", "family:matrix-grid"],
    ["registerUnionFind", "unionfind", undefined],
    ["registerBits", "bits", "legacy:bit-grid"],
    ["registerBacktrack", "backtrack", "legacy:backtrack-board"],
    ["registerRecTree", "rectree", undefined],
  ]

  for (const [method, kind, ownership] of registrations) {
    const id = `unit-${kind}`
    registry[method](id, { label: kind }, () => {})
    assert.equal(registry.kindOf(id), kind)
    const built = registry.buildFrames({
      algorithm: id,
      array: [3, 1, 2],
      target: 2,
      text: "ABABA",
      pattern: "ABA",
      n: 4,
      width: 4,
      nodes: [0, 1],
      edges: [[0, 1, 1]],
      start: "0",
    })
    assert.equal(runtimeOwnership(built), ownership, `${method} runtime ownership`)
  }
  assert.equal(registry.kindOf("missing"), null)
})

test("family algorithms build frame sequences through the shared registry", () => {
  const { createRegistry } = loadModule("src/registry.ts")
  const family = {
    id: "unit-family",
    kind: "sort",
    meta: { label: "Unit family" },
    family: {
      id: "array-sort",
      createRecorder: () => ({ frames: [] }),
      createView: () => ({ nodes: [], paint() {} }),
    },
    parse: ({ value }) => ({ value }),
    run: (input, recorder) => recorder.frames.push({ ...input }),
  }
  const registry = createRegistry([family])

  const result = registry.buildFrames({ algorithm: family.id, value: 3 })
  assert.equal(result.kind, family.kind)
  assert.equal(result.family, family.family)
  assert.deepEqual(result.frames, [{ value: 3 }])
  assert.throws(() => registry.buildFrames({ algorithm: "missing" }), /unknown algorithm/)
})

test("the player keeps navigation inside the frame sequence", () => {
  const { Player } = loadModule("src/player.ts")
  const painted = []
  const player = new Player(["first", "second", "third"], (frame) => painted.push(frame), 1)

  player.stepF()
  player.seek(99)
  player.stepB()
  player.seek(-1)
  player.reset()
  player.destroy()

  assert.deepEqual(painted, ["second", "third", "second", "first", "first"])
  assert.equal(player.i, 0)
  assert.equal(player.playing, false)
  assert.equal(player.timer, null)
})

test("frames that name a milestone advance the phase until the next one", () => {
  const { buildMilestones, milestoneAt } = loadModule("src/render.ts")
  const frames = [
    { type: "init" },
    { type: "expand", milestone: "Settle A" },
    { type: "relax" },
    { type: "expand", milestone: "Settle B" },
    { type: "relax" },
    { type: "done" },
  ]

  const marks = buildMilestones("unit-graph", "graph", frames)

  assert.deepEqual(
    frames.map((_, index) => milestoneAt(marks, index).label),
    ["Initialize", "Settle A", "Settle A", "Settle B", "Settle B", "Result"],
  )
})

test("mount reports invalid input locally and destroys cleanly", () => {
  const { createMount } = loadModule("src/mount.ts")
  const root = {
    textContent: "",
    attributes: new Map(),
    classList: { add() {} },
    closest: () => null,
    setAttribute(name, value) {
      this.attributes.set(name, String(value))
    },
    replaceChildren() {
      this.textContent = ""
    },
  }
  const mount = createMount({
    kindOf: () => null,
    listAlgorithms: () => [],
    buildFrames: () => {
      throw new Error("not reached")
    },
  })

  const handle = mount(root, { algorithm: "missing" })
  assert.match(root.textContent, /unknown algorithm/)
  handle.destroy()
  handle.destroy()
  assert.equal(root.textContent, "")
})
