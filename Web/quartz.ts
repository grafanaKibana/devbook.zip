import { ExplorerIcons } from "./custom/components/explorer-icons"
import { ExplorerOrder } from "./custom/components/explorer-order"
import { NavScopeDropdown } from "./custom/components/nav-scope-dropdown"
import { QuestionsIndex } from "./custom/components/questions-index"
import { SiteHeader } from "./custom/components/site-header"
import { SiteMarquee } from "./custom/components/site-marquee"
import { Steptrace } from "./custom/components/steptrace"
import { QuestionCollector } from "./custom/transformers/question-collector"
import { SyncerFixups } from "./custom/transformers/syncer-fixups"
import { SteptraceBlock } from "./custom/transformers/steptrace-block"
import { componentRegistry } from "./quartz/components/registry"
import type { QuartzComponent, QuartzComponentConstructor } from "./quartz/components/types"
import { PageTypes } from "./quartz/plugins"
import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"

// DevBook customizations live here (the sanctioned Quartz override entrypoint)
// and under ./custom — no engine files under quartz/ are modified.
//
// The homepage Topics dashboard is an in-note `datacorejsx` block that Quartz
// Syncer renders to static HTML at publish time, so there is no Topics
// component here anymore. What remains:
//   - SyncerFixups      → transformer: cleans Syncer's committed output for the
//                         web (strips raw dataview/datacore query fences + the
//                         frozen Questions `dc-questions-index` block, normalizes
//                         "Home/…" links). Must run before crawl-links.
//   - QuestionsIndex    → component: Questions.md aggregation (self-gates to slug)
//   - QuestionCollector → transformer: feeds QuestionsIndex

const config = await loadQuartzConfig()

// Clean Syncer's committed markdown/HTML for the flattened web build. The link
// fixup must run BEFORE crawl-links ("LinkProcessing") so the stripped path
// slugifies to the same page as the real file; splice it in just ahead of it.
const linkIdx = config.plugins.transformers.findIndex((t) => t.name === "LinkProcessing")
config.plugins.transformers.splice(
  linkIdx === -1 ? config.plugins.transformers.length : linkIdx,
  0,
  SyncerFixups(),
)

// Collect [!QUESTION] callouts across the vault. Appended after the built-in
// transformers so callouts (obsidian-flavored-markdown) and links (crawl-links)
// are already resolved.
config.plugins.transformers.push(QuestionCollector())

// Note: `status`, `icon` and `order` frontmatter used to be restored here from
// the Vault source note (Syncer once stripped them on publish). Quartz Syncer
// now publishes these properties into content/ directly, so the status-gated
// SiteMarquee and the Explorer's icon/order decorations read them straight from
// each note's frontmatter — no backfill transformers needed.

// Rewrite ```steptrace fences (committed raw by Syncer — not on its freeze
// allowlist) into the <div class="steptrace-mount" data-config> markers that the
// Steptrace component hydrates. Only touches lang=steptrace, so order-independent.
config.plugins.transformers.push(SteptraceBlock())

const layout = await loadQuartzLayout()
const siteMarquee = SiteMarquee()
layout.defaults.beforeBody = [siteMarquee, ...(layout.defaults.beforeBody ?? [])]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.beforeBody = [siteMarquee, ...(pageLayout.beforeBody ?? [])]
}

// Inject the Explorer file-tree icons (issue #51), topic ordering (issue #57) and
// the top-level scope selector (issue #64). None render visible markup themselves
// — they contribute css / afterDOMLoaded / an inert JSON map that decorate,
// reorder and scope the community Explorer's client-built tree — so they just need
// to render wherever the Explorer (the left sidebar) shows. They go in the `left`
// slot: canvas pages use a custom frame that renders ONLY `left` (not afterBody),
// so afterBody-only decorators would be silently dropped there (broken icons /
// unstyled dropdown on .canvas files). `defaults.left` is inherited by every page
// type that doesn't override `left` (content/folder/tag/canvas/bases); the 404
// page intentionally overrides `left` to empty and has no Explorer, so it's
// correctly excluded.
const explorerIcons = ExplorerIcons()
const explorerOrder = ExplorerOrder()
const navScopeDropdown = NavScopeDropdown()
const explorerDecorators = [explorerIcons, explorerOrder, navScopeDropdown]
layout.defaults.left = [...(layout.defaults.left ?? []), ...explorerDecorators]
// resolveLayout picks `byPageType[type].left ?? defaults.left` (override wins, no
// merge), so page types that define their own `left` must be augmented too. Skip
// ones that leave it undefined (they inherit defaults.left) or set it empty (404
// has no sidebar) — appending there would render a stray, Explorer-less sidebar.
for (const pageLayout of Object.values(layout.byPageType)) {
  if (Array.isArray(pageLayout.left) && pageLayout.left.length > 0) {
    pageLayout.left = [...pageLayout.left, ...explorerDecorators]
  }
}

// steptrace: ships the engine loader (afterDOMLoaded) + Quartz theme binding on
// every content page so `steptrace` cards hydrate live. Renders nothing itself.
const steptrace = Steptrace()
layout.defaults.afterBody = [...(layout.defaults.afterBody ?? []), steptrace]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.afterBody = [...(pageLayout.afterBody ?? []), steptrace]
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

// loadQuartzConfig already baked its own layout into a PageTypeDispatcher
// emitter; replace it with one built from our augmented layout so the injected
// component actually renders.
config.plugins.emitters = config.plugins.emitters.filter((e) => e.name !== "PageTypeDispatcher")
config.plugins.emitters.push(
  PageTypes.PageTypeDispatcher({ defaults: layout.defaults, byPageType: layout.byPageType }),
)

export default config
export { layout }
