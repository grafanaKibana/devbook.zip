import { globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { buildSync } from "esbuild"

export const repoRoot = join(import.meta.dirname, "../../..")

export function loadModule(path) {
  const result = buildSync({
    entryPoints: [join(import.meta.dirname, path)],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
  })
  const module = { exports: {} }
  new Function("module", "exports", result.outputFiles[0].text)(module, module.exports)
  return module.exports
}

export function loadCatalogFixtures() {
  const fixtures = new Map([
    ["merge-sort", { algorithm: "merge-sort", array: [38, 27, 43, 3] }],
    ["lcs", { algorithm: "lcs", a: "ABCBDAB", b: "BDCABA" }],
    ["coin-change-bottom-up", { algorithm: "coin-change-bottom-up" }],
    ["grid-path-bottom-up", { algorithm: "grid-path-bottom-up" }],
  ])
  for (const path of globSync(join(repoRoot, "Vault/Home/**/*.md"))) {
    for (const match of readFileSync(path, "utf8").matchAll(/```steptrace\s*\n([\s\S]*?)\n```/g)) {
      const config = JSON.parse(match[1])
      fixtures.set(config.algorithm, config)
    }
  }
  return fixtures
}
