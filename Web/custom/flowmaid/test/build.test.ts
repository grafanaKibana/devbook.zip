import assert from "node:assert/strict"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { pathToFileURL } from "node:url"

import { expectedArtifacts, verifyArtifacts } from "../build.mjs"
import { read, repo } from "./helpers"

const expected = [
  "Web/custom/flowmaid/generated/quartz/flowmaid.js",
  "Web/custom/flowmaid/generated/quartz/flowmaid.css",
  "Vault/.obsidian/plugins/flowmaid/main.js",
  "Vault/.obsidian/plugins/flowmaid/styles.css",
  "Vault/.obsidian/plugins/flowmaid/manifest.json",
  "Vault/.obsidian/plugins/flowmaid/.hotreload",
]

test("three build closures produce exactly six current artifacts", async () => {
  const built = await expectedArtifacts()
  assert.deepEqual(
    built.files.map(({ path: file }) => path.relative(repo, file).split(path.sep).join("/")),
    expected,
  )
  assert.equal(built.files.length, 6)
  await assert.doesNotReject(verifyArtifacts())
  assert.match(
    built.files.find(({ path: file }) => file.endsWith("flowmaid.js"))!.content,
    /data-flowmaid-owned/u,
  )
  assert.doesNotMatch(
    built.files.find(({ path: file }) => file.endsWith("main.js"))!.content,
    /@quartz-community|static\/flowmaid/u,
  )
})

test("artifact and repository identity is exact with no live compatibility surface", () => {
  for (const file of expected) assert.equal(existsSync(path.join(repo, file)), true, file)
  assert.deepEqual(readdirSync(path.join(repo, "Web/custom/flowmaid/generated/quartz")).sort(), [
    "flowmaid.css",
    "flowmaid.js",
  ])
  assert.deepEqual(readdirSync(path.join(repo, "Vault/.obsidian/plugins/flowmaid")).sort(), [
    ".hotreload",
    "main.js",
    "manifest.json",
    "styles.css",
  ])
  const manifest = JSON.parse(read("Web/custom/flowmaid/manifest.json"))
  assert.deepEqual(manifest, { id: "flowmaid", name: "Flowmaid", version: "0.1.0-beta" })
  assert.equal(
    JSON.parse(read("Vault/.obsidian/community-plugins.json")).filter(
      (id: string) => id === "flowmaid",
    ).length,
    1,
  )
  assert.match(read("Web/.prettierignore"), /custom\/flowmaid\/generated/u)
  assert.match(read("DESIGN.md"), /Flowmaid/u)
})

test("beta artifacts contain no network, release, telemetry, or browser-global API", async () => {
  const sources = (await expectedArtifacts()).files.map(({ content }) => content).join("\n")
  assert.doesNotMatch(sources, /fetch\s*\(|XMLHttpRequest|WebSocket|telemetry|analytics/u)
  assert.doesNotMatch(sources, /window\.(?:Flowmaid|flowmaid)|globalThis\.(?:Flowmaid|flowmaid)/u)
})

test("isolated freshness rejects extra artifacts and forbidden build closure mutations", async (t) => {
  const root = path.join(tmpdir(), `flowmaid-build-test-${process.pid}-${Date.now()}`)
  try {
    cpSync(path.join(repo, "Web/custom/flowmaid"), path.join(root, "Web/custom/flowmaid"), {
      recursive: true,
    })
    mkdirSync(path.join(root, "Web"), { recursive: true })
    cpSync(path.join(repo, "Web/tsconfig.json"), path.join(root, "Web/tsconfig.json"))
    symlinkSync(path.join(repo, "Web/node_modules"), path.join(root, "Web/node_modules"))
    mkdirSync(path.join(root, "Vault/.obsidian/plugins/flowmaid"), { recursive: true })
    const module = await import(
      `${pathToFileURL(path.join(root, "Web/custom/flowmaid/build.mjs")).href}?test=${Date.now()}`
    )
    await module.buildFlowmaid()
    await t.test("extra generated artifact", async () => {
      const extra = path.join(root, "Web/custom/flowmaid/generated/quartz/extra.js")
      writeFileSync(extra, "extra")
      await assert.rejects(module.verifyArtifacts(), /extra\.js/u)
      rmSync(extra)
    })

    const mutations = [
      [
        "Obsidian to Quartz",
        "hosts/obsidian/main.cts",
        'import "../quartz/runtime"',
        /Obsidian.*quartz/u,
      ],
      [
        "loader to engine",
        "hosts/quartz/loader.inline.ts",
        'import "../../engine"',
        /inline loader.*closure/u,
      ],
      [
        "runtime to YAML",
        "hosts/quartz/runtime.ts",
        'import "../../authoring/yaml"',
        /Quartz runtime.*yaml/u,
      ],
      [
        "component to runtime",
        "hosts/quartz/component.tsx",
        'import "./runtime"',
        /Quartz component.*runtime/u,
      ],
    ] as const
    for (const [name, relative, injected, error] of mutations) {
      await t.test(name, async () => {
        const file = path.join(root, "Web/custom/flowmaid/src", relative)
        const original = readFileSync(file, "utf8")
        writeFileSync(file, `${injected}\n${original}`)
        await assert.rejects(module.expectedArtifacts(), error)
        writeFileSync(file, original)
      })
    }

    await t.test("bundled input outside approved Flowmaid roots", async () => {
      writeFileSync(path.join(root, "Web/custom/flowmaid-outside.ts"), 'console.info("outside")\n')
      const component = path.join(root, "Web/custom/flowmaid/src/hosts/quartz/component.tsx")
      writeFileSync(
        component,
        `import "../../../../flowmaid-outside"\n${readFileSync(component, "utf8")}`,
      )
      await assert.rejects(module.expectedArtifacts(), /outside|closure/u)
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
