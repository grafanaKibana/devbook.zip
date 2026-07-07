import { ExplorerIcons } from "./custom/components/explorer-icons"
import { QuestionsIndex } from "./custom/components/questions-index"
import { SiteHeader } from "./custom/components/site-header"
import { SiteMarquee } from "./custom/components/site-marquee"
import { IconBackfill } from "./custom/transformers/icon-backfill"
import { QuestionCollector } from "./custom/transformers/question-collector"
import { StatusBackfill } from "./custom/transformers/status-backfill"
import { SyncerFixups } from "./custom/transformers/syncer-fixups"
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
//                         web (strips raw ```dataviewjs, normalizes "Home/…"
//                         links). Must run before crawl-links.
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

// Restore the `status` frontmatter that Syncer drops on publish, so status-gated
// components (SiteMarquee) can read it. Reads from the Vault source note.
config.plugins.transformers.push(StatusBackfill())

// Restore the `icon` frontmatter that Syncer drops on publish, so the Explorer
// file-tree icons (ExplorerIcons) can render a note's assigned Lucide icon.
// Reads from the Vault source note.
config.plugins.transformers.push(IconBackfill())

const layout = await loadQuartzLayout()
const siteMarquee = SiteMarquee()
layout.defaults.beforeBody = [siteMarquee, ...(layout.defaults.beforeBody ?? [])]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.beforeBody = [siteMarquee, ...(pageLayout.beforeBody ?? [])]
}

// Inject the Explorer file-tree icons (issue #51). It renders nothing itself —
// it only contributes css + afterDOMLoaded that decorate the community
// Explorer's client-built tree — so it just needs to be present in the layout
// on every page (the left sidebar shows everywhere). afterBody is set before the
// content block below so `content` picks it up too.
const explorerIcons = ExplorerIcons()
layout.defaults.afterBody = [...(layout.defaults.afterBody ?? []), explorerIcons]
for (const pageLayout of Object.values(layout.byPageType)) {
  pageLayout.afterBody = [...(pageLayout.afterBody ?? []), explorerIcons]
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
