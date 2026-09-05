import fs from "node:fs/promises"
import path from "node:path"
import type { QuartzEmitterPlugin } from "../../../../../quartz/plugins/types"
import type { FilePath } from "../../../../../quartz/util/path"

const generated = path.resolve(process.cwd(), "custom", "flowmaid", "generated", "quartz")
const assetNames = ["flowmaid.js", "flowmaid.css"] as const
const sources = assetNames.map((name) => path.join(generated, name))

const copyAssets = async (output: string): Promise<FilePath[]> => {
  const destination = path.join(output, "static", "flowmaid")
  await fs.mkdir(destination, { recursive: true })
  return Promise.all(
    assetNames.map(async (name, index) => {
      const outputPath = path.join(destination, name)
      await fs.copyFile(sources[index]!, outputPath)
      return outputPath as FilePath
    }),
  )
}

export const FlowmaidStatic: QuartzEmitterPlugin = () => ({
  name: "FlowmaidStatic",
  async emit({ argv }) {
    return copyAssets(argv.output)
  },
  partialEmit({ argv }, _content, _resources, changeEvents) {
    const changed = changeEvents.some((event) => sources.includes(path.resolve(event.path)))
    return changed ? copyAssets(argv.output) : null
  },
  getQuartzComponents() {
    return []
  },
})
