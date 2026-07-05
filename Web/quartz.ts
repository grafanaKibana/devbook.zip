import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PageTypes } from "./quartz/plugins"
import { QuestionsIndex } from "./custom/components/questions-index"
import { QuestionCollector } from "./custom/transformers/question-collector"
import { SyncerFixups } from "./custom/transformers/syncer-fixups"

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

// Inject the Questions component into every content page's afterBody; it
// self-gates to its target slug, so it only renders where intended.
const layout = await loadQuartzLayout()
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
