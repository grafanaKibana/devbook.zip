import fs from "node:fs/promises"
import path from "node:path"
import type { QuartzEmitterPlugin } from "../../quartz/plugins/types"
import type { FilePath } from "../../quartz/util/path"

const generated = path.resolve(process.cwd(), "custom", "mermaid-flow", "generated")
const assetNames = ["engine.js", "engine.css"] as const
const sources = assetNames.map((name) => path.join(generated, name))

async function copyAssets(output: string): Promise<FilePath[]> {
  const destination = path.join(output, "static", "mermaid-flow")
  await fs.mkdir(destination, { recursive: true })
  return Promise.all(
    assetNames.map(async (name, index) => {
      const outputPath = path.join(destination, name)
      await fs.copyFile(sources[index], outputPath)
      return outputPath as FilePath
    }),
  )
}

export const MermaidFlowStatic: QuartzEmitterPlugin = () => ({
  name: "MermaidFlowStatic",
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
