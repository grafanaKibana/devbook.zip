import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import { dirname, join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { buildSync } from "esbuild"

import { startWatcher } from "./watch.mjs"

const here = dirname(fileURLToPath(import.meta.url))

function loadModule(...segments) {
  const result = buildSync({
    entryPoints: [join(here, ...segments)],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  })
  const module = { exports: {} }
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports)
  return module.exports
}

test("the engine exposes the shared public contract", () => {
  const { steptrace: api } = loadModule("src", "engine.ts")
  assert.match(api.VERSION, /^\d+\.\d+\.\d+$/)
  for (const name of [
    "kindOf",
    "listAlgorithms",
    "buildFrames",
    "adjacency",
    "mount",
    "registerSort",
    "registerGraph",
  ]) {
    assert.equal(typeof api[name], "function", name)
  }
})

test("algorithm descriptors form valid unique catalogs", () => {
  const { builtInAlgorithms, interactiveStructures } = loadModule("src", "algorithms", "index.ts")
  const catalogs = [builtInAlgorithms, interactiveStructures]
  const ids = catalogs.flatMap((catalog) => catalog.map(({ id }) => id))

  assert.equal(new Set(ids).size, ids.length)
  for (const definition of catalogs.flat()) {
    assert.match(definition.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert.equal(typeof definition.meta?.label, "string")
    assert.ok(definition.meta.label.length > 0)
  }
  for (const definition of builtInAlgorithms) {
    assert.equal(typeof definition.run, "function")
    if ("family" in definition) {
      assert.equal(typeof definition.parse, "function")
      assert.equal(typeof definition.family.createRecorder, "function")
      assert.equal(typeof definition.family.createView, "function")
    }
  }
  for (const definition of interactiveStructures) {
    assert.equal(typeof definition.parse, "function")
    assert.equal(typeof definition.mount, "function")
  }
})

test("the registry routes every public algorithm kind", () => {
  const { createRegistry } = loadModule("src", "registry.ts")
  const registry = createRegistry([])
  const registrations = [
    ["registerSort", "sort"],
    ["registerGraph", "graph"],
    ["registerSearch", "search"],
    ["registerString", "string"],
    ["registerPointer", "pointers"],
    ["registerDP", "dp"],
    ["registerUnionFind", "unionfind"],
    ["registerBits", "bits"],
    ["registerBacktrack", "backtrack"],
    ["registerRecTree", "rectree"],
  ]

  for (const [method, kind] of registrations) {
    const id = `unit-${kind}`
    registry[method](id, { label: kind }, () => {})
    assert.equal(registry.kindOf(id), kind)
  }
  assert.equal(registry.kindOf("missing"), null)
})

test("family algorithms build frame sequences through the shared registry", () => {
  const { createRegistry } = loadModule("src", "registry.ts")
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
  const { Player } = loadModule("src", "player.ts")
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

test("mount reports invalid input locally and destroys cleanly", () => {
  const { createMount } = loadModule("src", "mount.ts")
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

test("the watcher performs and closes one generic build", async () => {
  const watcher = new EventEmitter()
  let builds = 0
  let closed = false
  watcher.close = async () => {
    closed = true
  }
  const session = startWatcher({
    watch: () => watcher,
    onBuild: async () => {
      builds++
      return { artifacts: 1, quartzPublicSynced: false }
    },
    logger: { log() {}, error() {} },
  })

  await session.run()
  await session.close()
  assert.equal(builds, 1)
  assert.equal(closed, true)
})
