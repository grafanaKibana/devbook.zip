import { readFileSync, statSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { repoRoot, sha256, stableJson } from "./steptrace.catalog.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const harnessPath = join(here, "steptrace.visual.test.mjs")
const executablePaths = [
  fileURLToPath(import.meta.url),
  harnessPath,
  join(here, "steptrace.catalog.mjs"),
  join(
    repoRoot,
    ".omx",
    "evidence",
    "steptrace-design-system-refactor",
    "quality-gate",
    "g008-promotion-protocol",
    "runners",
    "host-receipt.mjs",
  ),
]

const repoPath = (path) => relative(repoRoot, path).split(sep).join("/")

if (process.argv.some((argument) => argument.startsWith("--launch-manifest=")))
  throw new Error("--launch-manifest is launcher-owned")

const manifestCore = {
  schemaVersion: 1,
  protocol: "steptrace-visual-launch-v1",
  files: executablePaths
    .map((path) => ({
      path: repoPath(path),
      bytes: statSync(path).size,
      sha256: sha256(readFileSync(path)),
    }))
    .sort((left, right) => left.path.localeCompare(right.path)),
}
const manifest = { ...manifestCore, hash: sha256(stableJson(manifestCore)) }
process.argv.push(`--launch-manifest=${Buffer.from(stableJson(manifest)).toString("base64url")}`)

await import("./steptrace.visual.test.mjs")
