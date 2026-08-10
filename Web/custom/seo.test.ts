import assert from "node:assert/strict"
import { globSync, readFileSync } from "node:fs"
import { basename, dirname, extname } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { render } from "preact-render-to-string"

import HeadConstructor from "../quartz/components/Head"
import { fetchCanonical } from "../quartz/components/scripts/util"
import type { PageTypePluginEntry } from "../quartz/plugins/types"
import type { QuartzPluginData } from "../quartz/plugins/vfile"
import { simplifySlug } from "../quartz/util/path"
import {
  canonicalUrl,
  insertAfterNamedPlugin,
  isNoIndex,
  normalizeDescription,
  requireNamedPlugin,
  ROBOTS_TXT,
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
        pageTitle: "DEVBOOK",
        pageTitleSuffix: "",
        locale: "en-US",
        baseUrl: "devbook.zip",
        theme: { cdnCaching: false },
      },
      fileData: data,
      externalResources: { css: [], js: [], additionalHead: [] },
      ctx: { cfg: { plugins: { emitters: [] } } },
    } as never),
  )
}

test("canonical URLs stay aligned with Quartz simplifySlug", () => {
  const cases = {
    index: "https://devbook.zip/",
    "security/index": "https://devbook.zip/security/",
    "security/hashing": "https://devbook.zip/security/hashing",
  }

  for (const [slug, expected] of Object.entries(cases)) {
    assert.equal(canonicalUrl(slug), expected)
    assert.equal(canonicalUrl(slug), new URL(simplifySlug(slug), "https://devbook.zip/").href)
  }

  const source = readFileSync(new URL("./seo.tsx", import.meta.url), "utf8")
  assert.match(source, /import \{ simplifySlug \} from "\.\.\/quartz\/util\/path"/)
  assert.match(source, /simplifySlug\(slug\)/)
})

test("description normalization uses the first trimmed non-empty value everywhere", () => {
  const cases: Array<[Record<string, unknown>, string | undefined, string]> = [
    [
      { socialDescription: " Social ", description: "Description", summary: "Summary" },
      "Generated",
      "Social",
    ],
    [
      { socialDescription: " ", description: " Description ", summary: "Summary" },
      undefined,
      "Description",
    ],
    [{ socialDescription: "", description: "\n", summary: " Summary " }, "Generated", "Summary"],
    [{}, " Generated ", "Generated"],
  ]

  for (const [frontmatter, generated, expected] of cases) {
    const data = fileData("security/hashing", frontmatter, generated)
    assert.equal(normalizeDescription(data), expected)
    assert.equal(data.frontmatter?.socialDescription, expected)
    assert.equal(data.frontmatter?.description, expected)
    assert.equal(data.description, expected)
  }
})

test("native entity fallback becomes semantic text without double-escaping Head output", () => {
  const generated = fileData("security/hashing", {}, "Queues &amp; stacks")
  assert.equal(normalizeDescription(generated), "Queues & stacks")
  assert.match(
    renderedHead(generated),
    /<meta name="description" content="Queues &amp; stacks"\/?>/,
  )
  assert.doesNotMatch(renderedHead(generated), /&amp;amp;/)

  const authored = fileData("security/hashing", { description: "Queues & stacks" }, "Ignored")
  assert.equal(normalizeDescription(authored), "Queues & stacks")
  assert.match(renderedHead(authored), /<meta name="description" content="Queues &amp; stacks"\/?>/)
})

test("head policy canonicalizes public routes and noindexes only utility and error routes", () => {
  for (const slug of ["index", "security/index", "security/hashing", "questions"]) {
    const html = render(seoHead(fileData(slug)))
    assert.match(html, new RegExp(`href="${canonicalUrl(slug)}" rel="canonical"`))
    assert.doesNotMatch(html, /name="robots"/)
  }

  for (const slug of ["tags", "tags/foldernote", "roadmap.canvas"]) {
    const html = render(seoHead(fileData(slug)))
    assert.match(html, new RegExp(`href="${canonicalUrl(slug)}" rel="canonical"`))
    assert.match(html, /name="robots" content="noindex,follow"/)
  }

  const notFound = render(seoHead(fileData("404")))
  assert.match(notFound, /name="robots" content="noindex,follow"/)
  assert.doesNotMatch(notFound, /rel="canonical"/)
})

test("self-canonical metadata does not trigger Quartz alias redirect fetching", async () => {
  const html = render(seoHead(fileData("security/hashing")))
  const requests: string[] = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    requests.push(String(input))
    return new Response(html, { headers: { "content-type": "text/html" } })
  }

  try {
    await fetchCanonical(new URL("https://devbook.zip/security/hashing"))
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.deepEqual(requests, ["https://devbook.zip/security/hashing"])
})

test("folder canonical and social URLs use the same simplified route", () => {
  const html = renderedHead(fileData("security/index"))
  assert.match(
    render(seoHead(fileData("security/index"))),
    /<link href="https:\/\/devbook\.zip\/security\/" rel="canonical"\/?>/,
  )
  assert.match(html, /<meta property="og:url" content="https:\/\/devbook\.zip\/security\/"\/?>/)
  assert.match(
    html,
    /<meta property="twitter:url" content="https:\/\/devbook\.zip\/security\/"\/?>/,
  )
  assert.doesNotMatch(html, /https:\/\/devbook\.zip\/security\/index/)
})

test("homepage emits one safely serialized WebSite schema", () => {
  const html = render(seoHead(fileData("index"), "devbook.zip/</script><script>"))
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]

  assert.equal(scripts.length, 1)
  assert.deepEqual(JSON.parse(scripts[0]![1]!), {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DEVBOOK",
    url: "https://devbook.zip/</script><script>/",
  })
  assert.doesNotMatch(html, /<\/script><script>/)
  assert.doesNotMatch(html, /Article|Breadcrumb|FAQ|rating|SearchAction|ProfilePage/)
})

test("schema and robots helpers honor supplied site identity and base URL", () => {
  const html = render(seoHead(fileData("index"), "notes.example", "Engineering Notes"))
  const script = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1]

  assert.ok(script)
  assert.deepEqual(JSON.parse(script), {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Engineering Notes",
    url: "https://notes.example/",
  })
  assert.equal(
    robotsTxt("notes.example"),
    "User-agent: *\nAllow: /\nSitemap: https://notes.example/sitemap.xml\n",
  )
})

test("robots text permits crawling and advertises the canonical sitemap", () => {
  assert.equal(ROBOTS_TXT, "User-agent: *\nAllow: /\nSitemap: https://devbook.zip/sitemap.xml\n")
  assert.equal(robotsTxt(), ROBOTS_TXT)
  assert.doesNotMatch(ROBOTS_TXT, /Disallow:/)
})

test("lifecycle helpers fail closed and insert after the named plugin", () => {
  for (const name of ["Description", "TagPage", "CanvasPage"]) {
    assert.throws(
      () => requireNamedPlugin([], name),
      new RegExp(`expected Quartz plugin "${name}"`),
    )
  }

  const plugins = [{ name: "Before" }, { name: "Description" }, { name: "After" }]
  insertAfterNamedPlugin(plugins, "Description", { name: "Seo" })
  assert.deepEqual(
    plugins.map(({ name }) => name),
    ["Before", "Description", "Seo", "After"],
  )
})

test("generated utility pages remain emitted but become unlisted", () => {
  const pages = [
    { slug: "tags", title: "Tags", data: {} },
    { slug: "tags/foldernote", title: "FolderNote", data: {} },
    { slug: "roadmap.canvas", title: "Roadmap", data: {} },
    { slug: "other.canvas", title: "Other", data: {} },
  ]
  const pageType = { name: "Generated", generate: () => pages } as unknown as PageTypePluginEntry

  unlistGenerated(pageType, isNoIndex)
  const generated = pageType.generate!()

  assert.equal(generated.length, pages.length)
  assert.equal(generated[0]?.data.unlisted, true)
  assert.equal(generated[1]?.data.unlisted, true)
  assert.equal(generated[2]?.data.unlisted, true)
  assert.equal(generated[3], pages[3])
})

test("sitewide navigation and nested hub links stay canonical", () => {
  const config = readFileSync(new URL("../quartz.config.yaml", import.meta.url), "utf8")
  assert.match(config, /About: \/about\b/)
  assert.doesNotMatch(config, /About: \/About\b/)
  const styles = readFileSync(new URL("../quartz/styles/custom.scss", import.meta.url), "utf8")
  assert.equal(styles.match(/href\$="about"/g)?.length, 2)
  assert.doesNotMatch(styles, /href\$="About"/)

  const stripNonLinkMarkdown = (content: string) => {
    content = content.replace(/<!--.*?-->/gs, "").replace(/%%.*?%%/gs, "")
    let openCodeFence: [string, number] | undefined
    const tabsdownFences: Array<[string, number]> = []
    content = content
      .split("\n")
      .map((line) => {
        const fenceLine = line
          .replace(/\t/g, "    ")
          .replace(/^(?: {0,3}>[ \t]?)+/, "")
          .replace(/^ *(?:[-+*]|\d+[.)])[ \t]+/, "")
          .trimStart()
        const match = fenceLine.match(/^(`{3,}|~{3,})(.*)$/)
        if (!match) return openCodeFence ? "" : line
        const fence = match[1]!
        const suffix = match[2]!
        if (openCodeFence) {
          const [marker, length] = openCodeFence
          if (fence[0] === marker && fence.length >= length && !suffix.trim()) {
            openCodeFence = undefined
          }
          return ""
        }
        const tabsdownFence = tabsdownFences.at(-1)
        if (
          tabsdownFence &&
          fence[0] === tabsdownFence[0] &&
          fence.length >= tabsdownFence[1] &&
          !suffix.trim()
        ) {
          tabsdownFences.pop()
          return ""
        }
        if (suffix.trim().split(/\s+/, 1)[0] === "tabsdown") {
          tabsdownFences.push([fence[0]!, fence.length])
        } else {
          openCodeFence = [fence[0]!, fence.length]
        }
        return ""
      })
      .join("\n")
    return content.replace(/(?<!`)(`+)([^\n]*?)\1(?!`)/g, "")
  }
  const wikilinkTarget = (raw: string) => raw.split(/\\?\|/, 1)[0]!.split("#", 1)[0]!.trim()
  assert.equal(wikilinkTarget("Graph Algorithms\\|Graph"), "Graph Algorithms")
  assert.doesNotMatch(
    stripNonLinkMarkdown(
      "```text\n[[Graph Algorithms]]\n```\n<!-- [[Graph Algorithms]] -->\n%% [[Graph Algorithms]] %%\n`[[Graph Algorithms]]`",
    ),
    /\[\[/,
  )
  assert.doesNotMatch(
    stripNonLinkMarkdown("````text\n[[Graph Algorithms]]\n```\n[[Graph Algorithms]]\n````"),
    /\[\[/,
  )
  assert.match(
    stripNonLinkMarkdown("~~~~~tabsdown\ntab: Links\n[[Graph Algorithms]]\n~~~~~"),
    /\[\[Graph Algorithms\]\]/,
  )
  assert.doesNotMatch(
    stripNonLinkMarkdown(
      "> ```text\n> [[Graph Algorithms]]\n> ```\n- ```text\n  [[Graph Algorithms]]\n  ```\n``[[Graph Algorithms]]``",
    ),
    /\[\[/,
  )

  const vaultRoot = new URL("../../Vault/Home/", import.meta.url)
  const files = globSync("**/*.md", { cwd: fileURLToPath(vaultRoot) })
  const content = stripNonLinkMarkdown(
    files.map((file) => readFileSync(new URL(file, vaultRoot), "utf8")).join("\n"),
  )
  const nestedHubNames = new Set(
    files
      .filter(
        (file) =>
          file.split("/").length > 2 && basename(file, extname(file)) === basename(dirname(file)),
      )
      .map((file) => basename(file, extname(file)).toLocaleLowerCase()),
  )
  const shortNestedHubLinks = [...content.matchAll(/\[\[([^\]\n]+)\]\]/g)]
    .map((match) => wikilinkTarget(match[1]!))
    .filter((target) => !target.includes("/") && nestedHubNames.has(target.toLocaleLowerCase()))
  assert.deepEqual(shortNestedHubLinks, [])
  assert.doesNotMatch(content, /(?:Home\/)?AI & ML\/LLM\/Agent\/(?:Harness|Loop) Engineering/)
})
