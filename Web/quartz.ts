import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import { PageTypes } from "./quartz/plugins"
import { TopicDashboard } from "./custom/components/topic-dashboard"
import { QuestionsIndex } from "./custom/components/questions-index"
import { QuestionCollector } from "./custom/transformers/question-collector"

// DevBook customizations live here (the sanctioned Quartz override entrypoint)
// and in ./lib — no engine files under quartz/ are modified. These replace the
// old Obsidian DataviewJS blocks with build-time components:
//   - TopicDashboard   → homepage topic cards (self-gates to slug "index")
//   - QuestionsIndex   → Questions.md aggregation (self-gates to that slug)
//   - QuestionCollector→ transformer that feeds QuestionsIndex

const config = await loadQuartzConfig()

// Collect [!QUESTION] callouts across the vault. Appended after the built-in
// transformers so callouts (obsidian-flavored-markdown) and links (crawl-links)
// are already resolved.
config.plugins.transformers.push(QuestionCollector())

// Inject the two page components into every content page's afterBody; each
// component self-gates to its target slug, so they only render where intended.
const layout = await loadQuartzLayout()
const content = { ...(layout.byPageType.content ?? {}) }
content.afterBody = [TopicDashboard(), QuestionsIndex(), ...(content.afterBody ?? [])]
layout.byPageType.content = content

// loadQuartzConfig already baked its own layout into a PageTypeDispatcher
// emitter; replace it with one built from our augmented layout so the injected
// components actually render.
config.plugins.emitters = config.plugins.emitters.filter((e) => e.name !== "PageTypeDispatcher")
config.plugins.emitters.push(
  PageTypes.PageTypeDispatcher({ defaults: layout.defaults, byPageType: layout.byPageType }),
)

export default config
export { layout }
