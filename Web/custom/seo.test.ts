import assert from "node:assert/strict"
import test from "node:test"
import { render } from "preact-render-to-string"

import HeadConstructor from "../quartz/components/Head"
import type { PageTypePluginEntry } from "../quartz/plugins/types"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { simplifySlug } from "../quartz/util/path"
import {
  canonicalUrl,
  insertAfterNamedPlugin,
  isNoIndex,
  normalizeDescription,
  requireNamedPlugin,
  robotsTxt,
  seoHead,
  unlistGenerated,
  withCanonicalSocialUrls,
} from "./seo"

const fileData = (
  slug: string,
  frontmatter: Record<string, unknown> = {},
  description?: string,
): QuartzPluginData => ({ slug, frontmatter: { title: "Fixture", ...frontmatter }, description })

const renderedHead = (data: QuartzPluginData): string => {
  const Head = withCanonicalSocialUrls(HeadConstructor())
  return render(
    Head({
      cfg: {
        pageTitle: "Site",
        pageTitleSuffix: "",
        locale: "en-US",
        baseUrl: "example.com",
        theme: { cdnCaching: false },
      },
      fileData: data,
      externalResources: { css: [], js: [], additionalHead: [] },
      ctx: { cfg: { plugins: { emitters: [] } } },
    } as never),
  )
}

test("canonical and social URLs use the simplified route", () => {
  for (const slug of ["index", "section/index", "section/page"]) {
    assert.equal(canonicalUrl(slug), new URL(simplifySlug(slug), "https://devbook.zip/").href)
  }

  const html = renderedHead(fileData("section/index"))
  assert.match(html, /property="og:url" content="https:\/\/example\.com\/section\/"/)
  assert.match(html, /property="twitter:url" content="https:\/\/example\.com\/section\/"/)
})

test("description normalization selects and synchronizes the first non-empty value", () => {
  const data = fileData(
    "section/page",
    { socialDescription: " ", description: " Description ", summary: "Summary" },
    "Generated",
  )

  assert.equal(normalizeDescription(data), "Description")
  assert.equal(data.frontmatter?.socialDescription, "Description")
  assert.equal(data.frontmatter?.description, "Description")
  assert.equal(data.description, "Description")
})

test("index policy canonicalizes public routes and unlists noindex output", () => {
  const publicHead = render(seoHead(fileData("section/page")))
  assert.match(publicHead, /rel="canonical"/)
  assert.doesNotMatch(publicHead, /name="robots"/)

  const hiddenHead = render(seoHead(fileData("tags/example")))
  assert.match(hiddenHead, /name="robots" content="noindex,follow"/)

  const pages = [
    { slug: "tags/example", data: {} },
    { slug: "section/page", data: {} },
  ]
  const plugin = { name: "Generated", generate: () => pages } as unknown as PageTypePluginEntry
  unlistGenerated(plugin, isNoIndex)
  const generated = plugin.generate!()
  assert.equal(generated[0]?.data.unlisted, true)
  assert.equal(generated[1], pages[1])

  const drawingPages = [{ slug: "assets/excalidraw/diagram.excalidraw", data: {} }]
  const drawingPlugin = {
    name: "ExcalidrawPage",
    generate: () => drawingPages,
  } as unknown as PageTypePluginEntry
  unlistGenerated(drawingPlugin, () => true)
  const drawing = drawingPlugin.generate!()[0]!
  assert.equal(drawing.data.unlisted, true)
  const drawingData = fileData(drawing.slug)
  drawingData.unlisted = drawing.data.unlisted
  assert.match(render(seoHead(drawingData)), /name="robots" content="noindex,follow"/)
})

test("homepage schema is valid JSON and safely serializes site identity", () => {
  const html = render(seoHead(fileData("index"), "example.com/</script><script>", "Site"))
  const payload = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]

  assert.ok(payload)
  assert.deepEqual(JSON.parse(payload), {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Site",
    url: "https://example.com/</script><script>/",
  })
  assert.doesNotMatch(html, /<\/script><script>/)
})

test("robots text permits crawling and advertises the configured sitemap", () => {
  assert.equal(
    robotsTxt("example.com"),
    "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n",
  )
})

test("plugin ordering fails closed and inserts after the required plugin", () => {
  assert.throws(() => requireNamedPlugin([], "Description"), /expected Quartz plugin "Description"/)

  const plugins = [{ name: "Before" }, { name: "Description" }, { name: "After" }]
  insertAfterNamedPlugin(plugins, "Description", { name: "Seo" })
  assert.deepEqual(
    plugins.map(({ name }) => name),
    ["Before", "Description", "Seo", "After"],
  )
})
