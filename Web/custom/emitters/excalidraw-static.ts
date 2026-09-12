import { build } from "esbuild"
import path from "node:path"
import type { QuartzEmitterPlugin } from "../../quartz/plugins/types"
import { write } from "../../quartz/plugins/emitters/helpers"
import type { FullSlug } from "../../quartz/util/path"

const source = path.resolve(process.cwd(), "custom", "excalidraw", "exporter.ts")
const dependencyFiles = [
  source,
  path.resolve(process.cwd(), "package.json"),
  path.resolve(process.cwd(), "package-lock.json"),
]

export async function buildExcalidrawExporter(): Promise<Buffer> {
  const result = await build({
    entryPoints: [source],
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    globalName: "DevBookExcalidraw",
    minify: true,
    conditions: ["browser", "production"],
    define: {
      "process.env.IS_PREACT": "true",
      "process.env.NODE_ENV": '"production"',
    },
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-runtime",
    },
  })
  const output = result.outputFiles[0]
  if (!output) throw new Error("Excalidraw exporter build produced no JavaScript")
  return Buffer.from(output.contents)
}

const emit = async (ctx: Parameters<NonNullable<ReturnType<QuartzEmitterPlugin>["emit"]>>[0]) => [
  await write({
    ctx,
    slug: "static/excalidraw/exporter" as FullSlug,
    ext: ".js",
    content: await buildExcalidrawExporter(),
  }),
]

export const ExcalidrawStatic: QuartzEmitterPlugin = () => ({
  name: "ExcalidrawStatic",
  emit,
  partialEmit(ctx, _content, _resources, changeEvents) {
    const changed = changeEvents.some((event) => dependencyFiles.includes(path.resolve(event.path)))
    return changed ? emit(ctx) : null
  },
  getQuartzComponents() {
    return []
  },
})
