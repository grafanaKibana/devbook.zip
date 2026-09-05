import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { parse } from "yaml"

const root = path.resolve(import.meta.dirname, "../../../..")
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8")
const targetFiles = [
  "Web/custom/flowmaid/manifest.json",
  "Web/custom/flowmaid/build.mjs",
  "Web/custom/flowmaid/tsconfig.json",
  "Web/custom/flowmaid/src/engine.ts",
  "Web/custom/flowmaid/src/authoring/extract.ts",
  "Web/custom/flowmaid/src/authoring/yaml.ts",
  "Web/custom/flowmaid/src/authoring/index.ts",
  "Web/custom/flowmaid/src/domain/types.ts",
  "Web/custom/flowmaid/src/domain/compile.ts",
  "Web/custom/flowmaid/src/simulation/state.ts",
  "Web/custom/flowmaid/src/simulation/clock.ts",
  "Web/custom/flowmaid/src/mermaid/adapter.ts",
  "Web/custom/flowmaid/src/mermaid/decorations.ts",
  "Web/custom/flowmaid/src/runtime/mount.ts",
  "Web/custom/flowmaid/src/ui/controls.ts",
  "Web/custom/flowmaid/src/hosts/obsidian/main.cts",
  "Web/custom/flowmaid/src/hosts/quartz/transformer.ts",
  "Web/custom/flowmaid/src/hosts/quartz/loader.inline.ts",
  "Web/custom/flowmaid/src/hosts/quartz/runtime.ts",
  "Web/custom/flowmaid/src/hosts/quartz/component.tsx",
  "Web/custom/flowmaid/src/hosts/quartz/emitter.ts",
]

test("approved examples use one versionless same-fence block and only beta keys", () => {
  const allowed = new Set(["controls", "sources", "distribution", "queues", "dots"])
  for (const name of ["static", "round-robin", "kafka", "distribution"]) {
    const source = read(`Web/custom/flowmaid/test/fixtures/${name}.mmd`)
    const blocks = [...source.matchAll(/^\s*%% flowmaid\s*$([\s\S]*?)^\s*%% \/flowmaid\s*$/gmu)]
    assert.equal(blocks.length, 1, name)
    const payload = blocks[0]![1]!
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => line.replace(/^\s*%% ?/u, ""))
      .join("\n")
    const value = parse(payload) as Record<string, unknown>
    assert.ok(
      Object.keys(value).every((key) => allowed.has(key)),
      name,
    )
    assert.equal("version" in value, false, name)
    assert.doesNotMatch(source, /```mermaid-flow|%% mermaid-flow|\b(?:split|flows|scenarios)\s*:/u)
  }
})

test("target tree and exact beta identity replace the disposable product", () => {
  for (const file of targetFiles) assert.ok(existsSync(path.join(root, file)), `missing ${file}`)
  assert.deepEqual(JSON.parse(read("Web/custom/flowmaid/manifest.json")), {
    id: "flowmaid",
    name: "Flowmaid",
    version: "0.1.0-beta",
  })
  for (const oldPath of [
    "Web/custom/mermaid-flow",
    "Web/custom/components/mermaid-flow.tsx",
    "Web/custom/emitters/mermaid-flow-static.ts",
    "Web/custom/transformers/mermaid-flow-block.ts",
    "Vault/.obsidian/plugins/mermaid-flow",
  ])
    assert.equal(existsSync(path.join(root, oldPath)), false, `old live path ${oldPath}`)
})

test("target scripts and artifacts are renamed without a compatibility command", () => {
  const scripts = JSON.parse(read("Web/package.json")).scripts as Record<string, string>
  for (const name of ["test", "typecheck", "build", "check", "visual"])
    assert.equal(typeof scripts[`flowmaid:${name}`], "string", `flowmaid:${name}`)
  assert.equal(
    Object.keys(scripts).some((name) => name.startsWith("mermaid-flow:")),
    false,
  )
  for (const artifact of [
    "Web/custom/flowmaid/generated/quartz/flowmaid.js",
    "Web/custom/flowmaid/generated/quartz/flowmaid.css",
    "Vault/.obsidian/plugins/flowmaid/main.js",
    "Vault/.obsidian/plugins/flowmaid/styles.css",
    "Vault/.obsidian/plugins/flowmaid/manifest.json",
    "Vault/.obsidian/plugins/flowmaid/.hotreload",
  ])
    assert.ok(existsSync(path.join(root, artifact)), artifact)
})

test("source layout keeps host-neutral, Obsidian, Quartz runtime, and loader closures separate", () => {
  const imports = (file: string) =>
    [...read(file).matchAll(/(?:from\s*|import\s*\()?["']([^"']+)["']/gu)].map((match) => match[1]!)
  for (const file of targetFiles.filter(
    (file) => file.includes("/src/") && !file.includes("/hosts/"),
  ))
    assert.doesNotMatch(imports(file).join("\n"), /obsidian|quartz|src\/hosts/u, file)
  assert.doesNotMatch(
    imports("Web/custom/flowmaid/src/hosts/obsidian/main.cts").join("\n"),
    /quartz/u,
  )
  assert.doesNotMatch(
    imports("Web/custom/flowmaid/src/hosts/quartz/runtime.ts").join("\n"),
    /authoring|yaml|domain\/compile|obsidian/u,
  )
  assert.deepEqual(imports("Web/custom/flowmaid/src/hosts/quartz/loader.inline.ts"), [])
  assert.deepEqual(imports("Web/custom/flowmaid/src/hosts/quartz/component.tsx"), [
    "./loader.inline",
  ])
})

test("Kafka note matches the approved round-robin behavior and same-fence carrier", () => {
  const note = read("Vault/Home/Software Architecture/Distributed Systems/Message Queues/Kafka.md")
  assert.match(note, /PR\[Partitioner: round robin\]/u)
  assert.match(note, /```mermaid[\s\S]*%% flowmaid[\s\S]*%% \/flowmaid[\s\S]*```/u)
  assert.doesNotMatch(note, /```mermaid-flow/u)
})
