import fs from "node:fs/promises"
import path from "node:path"
import type { QuartzEmitterPlugin } from "../../quartz/plugins/types"
import type { FilePath } from "../../quartz/util/path"

// Quartz bundles custom plugins into quartz/.quartz-cache before executing them,
// so import.meta.url points at the cache rather than this source directory.
// Quartz commands run from Web/, which is also the deployment working directory.
const generated = path.resolve(process.cwd(), "custom", "steptrace", "generated")
const assetNames = ["engine.js", "engine.css"] as const
const sources = assetNames.map((name) => path.join(generated, name))

async function copyAssets(output: string): Promise<FilePath[]> {
  const destination = path.join(output, "static", "steptrace")
  await fs.mkdir(destination, { recursive: true })
  return Promise.all(
    assetNames.map(async (name, index) => {
      const outputPath = path.join(destination, name)
      await fs.copyFile(sources[index], outputPath)
      return outputPath as FilePath
    }),
  )
}

// Keep the generated StepTrace artifact under custom/ rather than Quartz's
// upgrade-owned quartz/static tree. Full and incremental emits share one copy path.
export const StepTraceStatic: QuartzEmitterPlugin = () => ({
  name: "StepTraceStatic",
  async emit({ argv }) {
    return copyAssets(argv.output)
  },
  partialEmit({ argv }, _content, _resources, changeEvents) {
    const generatedChanged = changeEvents.some((event) => {
      const changed = path.resolve(event.path)
      return sources.some((source) => source === changed)
    })
    return generatedChanged ? copyAssets(argv.output) : null
  },
  getQuartzComponents() {
    return []
  },
})
