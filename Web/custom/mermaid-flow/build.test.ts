import assert from "node:assert/strict"
import { relative, sep } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { expectedArtifacts } from "./build.mjs"

test("build owns exactly the six Quartz and Obsidian projections", async () => {
  const repoRoot = fileURLToPath(new URL("../../..", import.meta.url))
  const expected = await expectedArtifacts()
  const paths = expected.files
    .map(({ path }) => relative(repoRoot, path).split(sep).join("/"))
    .sort()

  assert.deepEqual(paths, [
    "Vault/.obsidian/plugins/mermaid-flow/.hotreload",
    "Vault/.obsidian/plugins/mermaid-flow/main.js",
    "Vault/.obsidian/plugins/mermaid-flow/manifest.json",
    "Vault/.obsidian/plugins/mermaid-flow/styles.css",
    "Web/custom/mermaid-flow/generated/engine.css",
    "Web/custom/mermaid-flow/generated/engine.js",
  ])
  assert.equal(expected.files.length, 6)
  assert.equal(
    paths.some((path) => path.endsWith(".tsbuildinfo")),
    false,
  )

  const engine = expected.files.find(({ path }) => path.endsWith("generated/engine.js"))!.content
  const obsidian = expected.files.find(({ path }) => path.endsWith("mermaid-flow/main.js"))!.content
  const manifest = JSON.parse(
    expected.files.find(({ path }) => path.endsWith("mermaid-flow/manifest.json"))!.content,
  ) as { isDesktopOnly?: boolean }
  assert.doesNotMatch(engine, /remark-parse|micromark|from-markdown|unified/u)
  assert.match(obsidian, /remark-parse|micromark/u)
  assert.equal(manifest.isDesktopOnly, false)
  assert.doesNotMatch(obsidian, /(?:require|from|import)\s*\(?["']node:/u)
})
