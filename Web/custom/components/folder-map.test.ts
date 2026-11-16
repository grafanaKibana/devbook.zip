import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { transformSync } from "esbuild"
import { h, type VNode } from "preact"
import render from "preact-render-to-string"

const components = join(import.meta.dirname, "../../../Vault/Assets/components")

const load = async (
  name: string,
  dc: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const source = readFileSync(join(components, name), "utf8")
  const compiled = transformSync(
    `async function load(dc, h) {\n${source}\n}\nmodule.exports = load`,
    {
      loader: "jsx",
      format: "cjs",
      jsxFactory: "h",
      target: "es2022",
    },
  ).code
  const module = { exports: undefined as unknown }
  new Function("module", "exports", compiled)(module, module.exports)
  return (
    module.exports as (dc: Record<string, unknown>, h: unknown) => Promise<Record<string, unknown>>
  )(dc, h)
}

const page = (path: string, folder = false, published = true) => ({
  $path: path,
  $name: path.split("/").at(-1)!.replace(/\.md$/, ""),
  $link: path.replace(/\.md$/, ""),
  $tags: folder ? ["FolderNote"] : [],
  value: (key: string) =>
    ({ publish: published, color: "#4c8000", summary: "LEGACY_SUMMARY_MUST_NOT_RENDER" })[
      key as "publish" | "color" | "summary"
    ],
})

const hub = page("Home/Programming/Programming.md", true)
const folder = page("Home/Programming/Types/Types.md", true)
const note = page("Home/Programming/Methods.md")
const nested = page("Home/Programming/Types/Value Types.md")
const unpublished = page("Home/Programming/Types/Draft.md", false, false)

const renderMap = async (pages = [hub, folder, note, nested, unpublished]) => {
  const dc: Record<string, unknown> = {
    Link: ({ link }: { link: string }) => h("a", { href: `/${link}` }, link),
    useCurrentFile: () => hub,
    useQuery: () => pages,
  }
  dc.require = (name: string) => load(name.split("/").at(-1)!, dc)
  const { FolderStructureMap } = await load("devbook-folder-map.jsx", dc)
  return render(h(FolderStructureMap as () => VNode, {}))
}

test("folder maps omit legacy summaries and preserve published navigation and counts", async () => {
  const html = await renderMap()
  assert.doesNotMatch(html, /LEGACY_SUMMARY_MUST_NOT_RENDER|db-card-summary/)
  assert.match(html, /aria-label="Programming section map"/)
  assert.deepEqual(
    [...html.matchAll(/<a href="([^"]+)"/g)].map(([, href]) => href),
    ["/Home/Programming/Types/Types", "/Home/Programming/Methods"],
  )
  assert.match(html, /class="folder-map-node-count">1 note<\/span>/)
  assert.doesNotMatch(html, /Draft|Value Types/)
})

test("empty folder maps retain their noninteractive placeholder", async () => {
  const html = await renderMap([hub])
  assert.match(html, /No notes in this section yet\./)
  assert.doesNotMatch(html, /<a /)
})
