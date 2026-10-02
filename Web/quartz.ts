import { ExcalidrawExport } from "./custom/components/excalidraw-export"
import { ExcalidrawEnhance } from "./custom/components/excalidraw-enhance"
import { ExplorerDisclosure } from "./custom/components/explorer-disclosure"
import { ExplorerIcons } from "./custom/components/explorer-icons"
import { ContentMetaRow } from "./custom/components/content-meta-row"
import { Complexity } from "./custom/components/complexity"
import { ExplorerOrder } from "./custom/components/explorer-order"
import { FloatingButtons } from "./custom/components/floating-buttons"
import { NavScopeDropdown } from "./custom/components/nav-scope-dropdown"
import { PageContribute } from "./custom/components/page-contribute"
import { PageReveal } from "./custom/components/page-reveal"
import { QuestionsIndex } from "./custom/components/questions-index"
import { SiteFooter } from "./custom/components/site-footer"
import { SiteHeader } from "./custom/components/site-header"
import { SkipLink } from "./custom/components/skip-link"
import { Steptrace } from "./custom/components/steptrace"
import { ExcalidrawStatic } from "./custom/emitters/excalidraw-static"
import { StepTraceStatic } from "./custom/emitters/steptrace-static"
import { CalloutDisclosure } from "./custom/transformers/callout-disclosure"
import { ClickableImages } from "./custom/transformers/clickable-images"
import { ComplexityBlock } from "./custom/transformers/complexity-block"
import { QuestionCollector } from "./custom/transformers/question-collector"
import { SyncerFixups } from "./custom/transformers/syncer-fixups"
import { SteptraceBlock } from "./custom/transformers/steptrace-block"
import {
  insertAfterNamedPlugin,
  requireNamedPlugin,
  Robots,
  Seo,
  unlistGenerated,
  withCanonicalSocialUrls,
} from "./custom/seo"
import { componentRegistry } from "./quartz/components/registry"
import { i18n } from "./quartz/i18n"
import type { QuartzComponent, QuartzComponentConstructor } from "./quartz/components/types"
import { PageTypes } from "./quartz/plugins"
import type { ExplorerOptions } from "./.quartz/plugins"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

// DevBook customizations live here (the sanctioned Quartz override entrypoint)
// and under ./custom — no engine files under quartz/ are modified.
const explorerFilter: NonNullable<ExplorerOptions["filterFn"]> = (node) =>
  node.slugSegment !== "tags" && !(node.slugSegment === "assets" && node.slugSegments?.length === 1)
componentRegistry.setOptionOverrides("explorer", { filterFn: explorerFilter })

const config = await loadQuartzConfig()

insertAfterNamedPlugin(config.plugins.transformers, "Description", Seo())

unlistGenerated(
  requireNamedPlugin(config.plugins.pageTypes, "TagPage"),
  (slug) => slug === "tags" || slug.startsWith("tags/"),
)
unlistGenerated(
  requireNamedPlugin(config.plugins.pageTypes, "CanvasPage"),
  (slug) => slug === "roadmap.canvas",
)
unlistGenerated(requireNamedPlugin(config.plugins.pageTypes, "ExcalidrawPage"), () => true)

// The built-in 404 body reads its copy from the locale table, so the site's
// wording replaces those strings rather than the engine's page component.
Object.assign(i18n(config.configuration.locale).pages.error, {
  notFound:
    "Nothing is published at this address. The note may have moved, been renamed, or not be published yet — search for it from the header.",
  home: "Back to Home",
})

// Clean Syncer's committed markdown/HTML for the flattened web build.
const linkIdx = config.plugins.transformers.findIndex((t) => t.name === "LinkProcessing")
config.plugins.transformers.splice(
  linkIdx === -1 ? config.plugins.transformers.length : linkIdx,
  0,
  SyncerFixups(),
)

// Foldable callout titles only exist as hast after the Obsidian-flavored-markdown
// plugin's rehype-raw pass, and must be marked before QuestionCollector clones them.
const ofmIdx = config.plugins.transformers.findIndex((t) => t.name === "ObsidianFlavoredMarkdown")
config.plugins.transformers.splice(
  ofmIdx === -1 ? config.plugins.transformers.length : ofmIdx + 1,
  0,
  CalloutDisclosure(),
)

// Collect [!QUESTION] callouts across the vault. Appended after the built-in
// transformers so callouts (obsidian-flavored-markdown) and links (crawl-links)
// are already resolved.
config.plugins.transformers.push(QuestionCollector())

// Note: `status`, `icon` and `order` frontmatter used to be restored here from
// the Vault source note (Syncer once stripped them on publish). Quartz Syncer
// now publishes these properties into content/ directly, so ContentMetaRow's
// lifecycle chip and the Explorer's icon/order decorations read them straight
// from each note's frontmatter — no backfill transformers needed.

// Render ```complexity fences before syntax highlighting wraps them in its own
// figure markup. The transformer supplies the static first paint; the client-only
// Complexity component below adds filtering and legend interaction.
const syntaxHighlightingIdx = config.plugins.transformers.findIndex(
  (t) => t.name === "SyntaxHighlighting",
)
config.plugins.transformers.splice(
  syntaxHighlightingIdx === -1 ? config.plugins.transformers.length : syntaxHighlightingIdx,
  0,
  ComplexityBlock(),
)

// Rewrite ```steptrace fences (committed raw by Syncer — not on its freeze
// allowlist) into the <div class="steptrace-mount" data-config> markers that the
// Steptrace component hydrates. Only touches lang=steptrace, so order-independent.
config.plugins.transformers.push(SteptraceBlock())

// Make content images click-to-zoom.
config.plugins.transformers.push(ClickableImages())

// Emit the generated engine from the sanctioned custom/ surface. This avoids
// placing DevBook-owned code under Quartz's upgrade-owned quartz/static tree.
config.plugins.emitters.push(StepTraceStatic())
config.plugins.emitters.push(ExcalidrawStatic())
config.plugins.emitters.push(Robots())

const layout = await loadQuartzLayout()
layout.defaults.head = withCanonicalSocialUrls(layout.defaults.head!)
for (const pageLayout of Object.values(layout.byPageType)) {
  if (pageLayout.head) pageLayout.head = withCanonicalSocialUrls(pageLayout.head)
}

// Inject the Explorer file-tree icons, topic ordering, the top-level scope
// selector, and the toggles' expanded state.
const explorerIcons = ExplorerIcons()
const explorerOrder = ExplorerOrder()
const navScopeDropdown = NavScopeDropdown()
const explorerDisclosure = ExplorerDisclosure()
const explorerDecorators = [explorerIcons, explorerOrder, navScopeDropdown, explorerDisclosure]
layout.defaults.left = [...(layout.defaults.left ?? []), ...explorerDecorators]
for (const pageLayout of Object.values(layout.byPageType)) {
  if (Array.isArray(pageLayout.left) && pageLayout.left.length > 0) {
    pageLayout.left = [...pageLayout.left, ...explorerDecorators]
  }
}

// Client-only helpers render nothing themselves. Steptrace ships its engine
// loader/theme binding.
const steptrace = Steptrace()
const complexity = Complexity()
const excalidrawEnhance = ExcalidrawEnhance()
const excalidrawExport = ExcalidrawExport()
const pageReveal = PageReveal()
layout.defaults.afterBody = [
  ...(layout.defaults.afterBody ?? []),
  steptrace,
  complexity,
  excalidrawEnhance,
  excalidrawExport,
  pageReveal,
]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.afterBody = [
    ...(pageLayout.afterBody ?? []),
    steptrace,
    complexity,
    excalidrawEnhance,
    excalidrawExport,
    pageReveal,
  ]
}

// Floating scroll-to-top / scroll-to-bottom buttons.
const floatingButtons = FloatingButtons()
layout.defaults.afterBody = [...(layout.defaults.afterBody ?? []), floatingButtons]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.afterBody = [...(pageLayout.afterBody ?? []), floatingButtons]
}

const pageContribute = PageContribute()

// Preserve the configured community footer and add per-page sharing inside it.
const footer = layout.defaults.footer
if (!footer) throw new Error("SiteFooter requires an enabled footer component")
const siteFooter = SiteFooter({ footer })
layout.defaults.footer = siteFooter
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.footer = siteFooter
}

const content = { ...(layout.byPageType.content ?? {}) }
content.afterBody = [QuestionsIndex(), ...(content.afterBody ?? [])]
layout.byPageType.content = content

// Site header (title · search · theme/reader toggles). These four community
// components are no longer positioned in the left sidebar (their `layout` was
// removed from quartz.config.yaml); instead we render them here, in the page's
// semantic `header` slot, wrapped by our SiteHeader. They're still registered,
// so the resource collector ships their CSS/JS — we only need their instances.
const instantiateRegistered = (name: string): QuartzComponent => {
  const registered = componentRegistry.get(name)
  if (!registered) {
    throw new Error(`SiteHeader: expected component "${name}" to be registered`)
  }
  const component = registered.component
  // Match the loader's convention: a bare constructor (no displayName) must be
  // instantiated; the registry caches by constructor so scripts aren't duplicated.
  return typeof component === "function" && !("displayName" in component)
    ? componentRegistry.instantiate(component as QuartzComponentConstructor, undefined)
    : (component as QuartzComponent)
}

const siteHeader = SiteHeader({
  title: instantiateRegistered("page-title"),
  search: instantiateRegistered("search"),
  darkmode: instantiateRegistered("darkmode"),
  readerMode: instantiateRegistered("reader-mode"),
})
layout.defaults.header = [siteHeader, ...(layout.defaults.header ?? [])]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.header = [siteHeader, ...(pageLayout.header ?? [])]
}

// The skip link must be the first tab stop. The left sidebar precedes .center in
// the frame's DOM, so it heads that slot, or the header where a page type clears it.
const skipLink = SkipLink()
layout.defaults.left = [skipLink, ...(layout.defaults.left ?? [])]
for (const pageLayout of Object.values(layout.byPageType)) {
  if (!Array.isArray(pageLayout.left)) continue
  if (pageLayout.left.length > 0) {
    pageLayout.left = [skipLink, ...pageLayout.left]
  } else {
    pageLayout.header = [skipLink, ...(pageLayout.header ?? [])]
  }
}

// Edit/Report links ride the article's content-meta row — date/reading-time on
// the left.
const contentMetaRow = ContentMetaRow({
  meta: instantiateRegistered("content-meta"),
  contribute: pageContribute,
})
layout.defaults.beforeBody = [...(layout.defaults.beforeBody ?? []), contentMetaRow]
for (const [pageType, pageLayout] of Object.entries(layout.byPageType)) {
  // A missing page has no date, reading time, or source file to edit.
  if (pageType === "404") continue
  pageLayout.beforeBody = [...(pageLayout.beforeBody ?? []), contentMetaRow]
}

config.plugins.emitters = config.plugins.emitters.filter((e) => e.name !== "PageTypeDispatcher")
config.plugins.emitters.push(
  PageTypes.PageTypeDispatcher({ defaults: layout.defaults, byPageType: layout.byPageType }),
)

export default config
export { layout }
