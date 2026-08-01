import fs from "node:fs/promises"
import path from "node:path"
import { cloneElement, Fragment, h } from "preact"
import type { ComponentChild, VNode } from "preact"
import type { QuartzComponent } from "../quartz/components/types"
import type {
  PageTypePluginEntry,
  QuartzEmitterPlugin,
  QuartzTransformerPlugin,
} from "../quartz/plugins/types"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { unescapeHTML } from "../quartz/util/escape"
import type { FilePath } from "../quartz/util/path"
import { simplifySlug } from "../quartz/util/path"

const SITE_NAME = "DEVBOOK"
const DEFAULT_BASE_URL = "devbook.zip"

export const robotsTxt = (baseUrl = DEFAULT_BASE_URL) => `User-agent: *
Allow: /
Sitemap: https://${baseUrl}/sitemap.xml
`
export const ROBOTS_TXT = robotsTxt()

const firstText = (...values: unknown[]): string | undefined =>
  values.find((value): value is string => typeof value === "string" && value.trim() !== "")?.trim()

export function normalizeDescription(fileData: QuartzPluginData): string | undefined {
  const data = fileData as unknown as { frontmatter?: Record<string, unknown> }
  const frontmatter = (data.frontmatter ??= {})
  const authored = firstText(
    frontmatter.socialDescription,
    frontmatter.description,
    frontmatter.summary,
  )
  const generated = firstText(fileData.description)
  const description = authored ?? (generated ? unescapeHTML(generated) : undefined)

  if (description) {
    frontmatter.socialDescription = description
    frontmatter.description = description
    fileData.description = description
  }

  return description
}

export function canonicalUrl(slug: string, baseUrl = DEFAULT_BASE_URL): string {
  return `https://${baseUrl}/${encodeURI(simplifySlug(slug)).replace(/^\/$/, "")}`
}

export function isNoIndex(slug: string): boolean {
  return slug === "404" || slug === "tags" || slug.startsWith("tags/") || slug === "roadmap.canvas"
}

const serializeJsonLd = (value: unknown): string =>
  JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const codePoint = character.codePointAt(0)!.toString(16).padStart(4, "0")
    return `\\u${codePoint}`
  })

export function seoHead(
  fileData: QuartzPluginData,
  baseUrl = DEFAULT_BASE_URL,
  siteName = SITE_NAME,
) {
  const slug = String(fileData.slug ?? "")
  const canonical = slug === "404" ? undefined : canonicalUrl(slug, baseUrl)
  const website =
    slug === "index"
      ? serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName,
          url: canonical,
        })
      : undefined

  return h(
    Fragment,
    null,
    // Quartz's SPA reserves the rel-first serialization for alias redirects.
    canonical && h("link", { href: canonical, rel: "canonical" }),
    isNoIndex(slug) && h("meta", { name: "robots", content: "noindex,follow" }),
    website &&
      h("script", {
        type: "application/ld+json",
        dangerouslySetInnerHTML: { __html: website },
      }),
  )
}

const rewriteSocialUrls = (child: ComponentChild, canonical: string): ComponentChild => {
  if (Array.isArray(child)) return child.map((nested) => rewriteSocialUrls(nested, canonical))
  if (!child || typeof child !== "object" || !("type" in child)) return child

  const node = child as VNode<Record<string, unknown>>
  const property = node.props.property
  if (node.type === "meta" && (property === "og:url" || property === "twitter:url")) {
    return cloneElement(node, { content: canonical })
  }

  const children = node.props.children as ComponentChild | undefined
  return children === undefined
    ? node
    : cloneElement(node, { children: rewriteSocialUrls(children, canonical) })
}

export const withCanonicalSocialUrls = (Head: QuartzComponent): QuartzComponent => {
  const CanonicalSocialHead: QuartzComponent = (props) => {
    const slug = String(props.fileData.slug ?? "")
    if (slug === "404") return Head(props)

    const baseUrl = requiredConfigText(props.cfg.baseUrl, "baseUrl")
    return rewriteSocialUrls(Head(props), canonicalUrl(slug, baseUrl))
  }

  return Object.assign(CanonicalSocialHead, Head)
}

export function requireNamedPlugin<T extends { name: string }>(
  plugins: T[] | undefined,
  name: string,
): T {
  const plugin = plugins?.find((candidate) => candidate.name === name)
  if (!plugin) throw new Error(`SEO: expected Quartz plugin "${name}"`)
  return plugin
}

export function insertAfterNamedPlugin<T extends { name: string }>(
  plugins: T[],
  name: string,
  plugin: T,
) {
  const expected = requireNamedPlugin(plugins, name)
  plugins.splice(plugins.indexOf(expected) + 1, 0, plugin)
}

export function unlistGenerated(
  pageType: PageTypePluginEntry,
  predicate: (slug: string) => boolean,
) {
  const generate = pageType.generate
  if (!generate)
    throw new Error(`SEO: expected Quartz page type "${pageType.name}" to generate pages`)
  pageType.generate = (...args: never[]) =>
    generate(...args).map((page) =>
      predicate(page.slug) ? { ...page, data: { ...page.data, unlisted: true } } : page,
    )
}

const requiredConfigText = (value: unknown, name: string): string => {
  const text = firstText(value)
  if (!text) throw new Error(`Seo: configuration.${name} is required`)
  return text
}

export const Seo: QuartzTransformerPlugin = () => ({
  name: "Seo",
  htmlPlugins() {
    return [() => (_tree, file) => void normalizeDescription(file.data)]
  },
  externalResources(ctx) {
    const baseUrl = requiredConfigText(ctx.cfg.configuration.baseUrl, "baseUrl")
    const siteName = requiredConfigText(ctx.cfg.configuration.pageTitle, "pageTitle")
    return { additionalHead: [(fileData) => seoHead(fileData, baseUrl, siteName)] }
  },
})

async function writeRobots(output: string, content: string): Promise<FilePath[]> {
  const outputPath = path.join(output, "robots.txt")
  await fs.mkdir(output, { recursive: true })
  await fs.writeFile(outputPath, content)
  return [outputPath as FilePath]
}

export const Robots: QuartzEmitterPlugin = () => ({
  name: "Robots",
  emit: ({ argv, cfg }) =>
    writeRobots(argv.output, robotsTxt(requiredConfigText(cfg.configuration.baseUrl, "baseUrl"))),
  partialEmit: ({ argv, cfg }) =>
    writeRobots(argv.output, robotsTxt(requiredConfigText(cfg.configuration.baseUrl, "baseUrl"))),
  getQuartzComponents: () => [],
})
