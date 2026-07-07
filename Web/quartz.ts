import { ExplorerIcons } from "./custom/components/explorer-icons"
import { QuestionsIndex } from "./custom/components/questions-index"
import { SiteMarquee } from "./custom/components/site-marquee"
import { Steptrace } from "./custom/components/steptrace"
import { IconBackfill } from "./custom/transformers/icon-backfill"
import { QuestionCollector } from "./custom/transformers/question-collector"
import { StatusBackfill } from "./custom/transformers/status-backfill"
import { SyncerFixups } from "./custom/transformers/syncer-fixups"
import { SteptraceBlock } from "./custom/transformers/steptrace-block"
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

// loadQuartzConfig already baked its own layout into a PageTypeDispatcher
// emitter; replace it with one built from our augmented layout so the injected
// component actually renders.
config.plugins.emitters = config.plugins.emitters.filter((e) => e.name !== "PageTypeDispatcher")
config.plugins.emitters.push(
  PageTypes.PageTypeDispatcher({ defaults: layout.defaults, byPageType: layout.byPageType }),
)

export default config
export { layout }
