// steptrace dev watcher — re-runs the stitch (sync.mjs) whenever a source file
// changes, collapsing the edit loop to just the host's own reload:
//   • Obsidian: the Hot Reload community plugin picks up the re-written main.js.
//   • Quartz:   `npx quartz build --serve` rebuilds when the static engine.js changes.
// The reload itself stays each host's job — Obsidian's plugin loader can't be
// bypassed, so "reload to see the change" is inherent and out of scope. This watcher
// only removes the manual `npm run steptrace:sync` step from the loop.
//
// Zero dependencies: Node's built-in fs.watch (recursive on Node >= 22, with a
// per-directory fallback). Run:  npm run steptrace:watch

import { watch, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { stitch } from "./sync.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, "src")

// Non-src inputs that also feed the artifacts.
const extraFiles = ["obsidian-plugin.js", "manifest.json"]

let timer = null
const pending = new Set()

function run() {
  timer = null
  const changed = [...pending].join(", ") || "startup"
  pending.clear()
  try {
    const { fragments } = stitch()
    console.log(
      `[${new Date().toLocaleTimeString()}] steptrace: synced ${fragments} fragments — ${changed}`,
    )
  } catch (e) {
    console.error(`steptrace watch: stitch failed — ${e && e.message ? e.message : e}`)
  }
}

// Debounce: a single save often emits several fs events (and editors write via a
// temp file + rename), so coalesce a burst into one stitch.
function schedule(name) {
  if (name) pending.add(name)
  if (timer) clearTimeout(timer)
  timer = setTimeout(run, 80)
}

function watchTree(dir) {
  try {
    watch(dir, { recursive: true }, (_e, file) => schedule(file || "src"))
  } catch {
    // Recursive watch unsupported here — watch src/ and each subdirectory directly.
    watch(dir, (_e, file) => schedule(file || "src"))
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory())
        watch(join(dir, entry.name), (_e, file) => schedule(file || entry.name))
    }
  }
}

watchTree(srcDir)
for (const f of extraFiles) watch(join(here, f), (_e) => schedule(f))

run() // initial stitch so the artifacts match src/ the moment the watcher starts
console.log(
  `steptrace: watching src/ + ${extraFiles.join(" + ")} — edit a file to re-sync (Ctrl+C to stop)`,
)
