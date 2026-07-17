import fs from "node:fs/promises"
import path from "node:path"
import type { QuartzEmitterPlugin } from "../../quartz/plugins/types"
import type { FilePath } from "../../quartz/util/path"

// Host the DevBook-tokened giscus themes from the sanctioned custom/ surface
// rather than Quartz's upgrade-owned quartz/static tree. The comments plugin
// points giscus at https://<baseUrl>/static/giscus/<theme>.css (themeUrl +
// light/darkTheme in quartz.config.yaml), so these land at static/giscus/.
const source = path.resolve(process.cwd(), "custom", "giscus")
const themeNames = ["devbook-light.css", "devbook-dark.css"] as const
const sources = themeNames.map((name) => path.join(source, name))

async function copyThemes(output: string): Promise<FilePath[]> {
  const destination = path.join(output, "static", "giscus")
  await fs.mkdir(destination, { recursive: true })
  return Promise.all(
    themeNames.map(async (name, index) => {
      const outputPath = path.join(destination, name)
      await fs.copyFile(sources[index], outputPath)
      return outputPath as FilePath
    }),
  )
}

export const GiscusTheme: QuartzEmitterPlugin = () => ({
  name: "GiscusTheme",
  async emit({ argv }) {
    return copyThemes(argv.output)
  },
  partialEmit({ argv }, _content, _resources, changeEvents) {
    const themesChanged = changeEvents.some((event) => {
      const changed = path.resolve(event.path)
      return sources.some((s) => s === changed)
    })
    return themesChanged ? copyThemes(argv.output) : null
  },
  getQuartzComponents() {
    return []
  },
})
