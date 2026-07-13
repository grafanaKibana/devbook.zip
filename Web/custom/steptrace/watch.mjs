// StepTrace development watcher. Chokidar owns filesystem orchestration because
// the graph includes imported TS/SCSS plus copy-only manifest metadata; esbuild
// remains the only compiler through buildStepTrace().

import chokidar from "chokidar"
import { dirname, join, relative } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { buildStepTrace } from "./build.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const inputs = [join(here, "src"), join(here, "manifest.json")]

export function startWatcher({
  paths = inputs,
  onBuild = () => buildStepTrace({ mirrorPublic: true }),
  debounceMs = 80,
  logger = console,
  watch = chokidar.watch,
  usePolling = process.env.STEPTRACE_WATCH_POLL === "1",
} = {}) {
  let timer = null
  let running = false
  let rerun = false
  const pending = new Set()

  const run = async (reason = "startup") => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (running) {
      rerun = true
      return
    }

    running = true
    do {
      rerun = false
      const changed = pending.size ? [...pending].join(", ") : reason
      pending.clear()
      try {
        const { artifacts, quartzPublicSynced } = await onBuild()
        const publicNote = quartzPublicSynced ? " + Web/public" : ""
        logger.log(
          `[${new Date().toLocaleTimeString()}] steptrace: built ${artifacts} artifacts${publicNote} — ${changed}`,
        )
      } catch (error) {
        logger.error(
          `steptrace watch: build failed — ${error instanceof Error ? error.message : error}`,
        )
      }
    } while (rerun)
    running = false
  }

  const schedule = (event, path) => {
    pending.add(`${event}:${relative(here, path) || "src"}`)
    if (timer) clearTimeout(timer)
    timer = setTimeout(run, debounceMs)
  }

  const watcher = watch(paths, {
    atomic: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
    ignoreInitial: true,
    persistent: true,
    usePolling,
  })
  watcher.on("all", schedule)
  watcher.on("error", (error) => {
    const pollingHint = error?.code === "EMFILE" ? " Set STEPTRACE_WATCH_POLL=1 and retry." : ""
    logger.error(
      `steptrace watch: watcher failed — ${error instanceof Error ? error.message : error}.${pollingHint}`,
    )
  })

  return {
    watcher,
    run,
    async close() {
      if (timer) clearTimeout(timer)
      await watcher.close()
    },
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const session = startWatcher()
  await session.run()
  console.log(
    "steptrace: watching TypeScript, SCSS, host entries, and manifest — edit a file to rebuild (Ctrl+C to stop)",
  )
}
