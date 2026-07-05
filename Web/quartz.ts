import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import TopicDashboard from "./quartz/components/TopicDashboard"
import ConditionalRender from "./quartz/components/ConditionalRender"

// Native homepage dashboard: render the topic card grid after the index body,
// only on the site root (slug "index"). Replaces the old DataviewJS dashboard.
const dashboard = ConditionalRender({
  component: TopicDashboard(),
  condition: (props) => props.fileData.slug === "index",
})

const config = await loadQuartzConfig(undefined, (layout) => {
  const content = { ...(layout.byPageType.content ?? {}) }
  content.afterBody = [dashboard, ...(content.afterBody ?? [])]
  layout.byPageType.content = content
  return layout
})
export default config

export const layout = await loadQuartzLayout()
