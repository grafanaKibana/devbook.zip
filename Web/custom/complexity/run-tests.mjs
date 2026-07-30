import { spawn } from "node:child_process"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { build } from "esbuild"

const directory = await mkdtemp(join(tmpdir(), "devbook-complexity-"))
const output = join(directory, "complexity.test.mjs")

try {
  await build({
    entryPoints: [new URL("complexity.test.ts", import.meta.url).pathname],
    outfile: output,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
  })
  const status = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", output], { stdio: "inherit" })
    child.once("error", reject)
    child.once("exit", (code) => resolve(code ?? 1))
  })
  process.exitCode = status
} finally {
  await rm(directory, { recursive: true, force: true })
}
