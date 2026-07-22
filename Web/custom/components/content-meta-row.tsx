import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../quartz/components/types"
import styles from "./styles/content-meta-row.scss"

// One article-meta row: the community content-meta (date · reading time) on the
// left, the page's Edit/Report contribution links (page-contribute.tsx) on the
// right. Both instances are passed in from quartz.ts — content-meta is enabled
// but unpositioned in quartz.config.yaml (the SiteHeader pattern), so this owns
// where it renders. Suppressed on the home dashboard, which carries no
// content-meta by design; page-contribute self-suppresses on the rest.
interface ContentMetaRowOptions {
  meta: QuartzComponent
  contribute: QuartzComponent
}

export const ContentMetaRow = ((opts?: ContentMetaRowOptions) => {
  if (!opts) {
    throw new Error("ContentMetaRow requires meta + contribute components")
  }
  const { meta: Meta, contribute: Contribute } = opts

  const Row: QuartzComponent = (props: QuartzComponentProps) => {
    if (props.fileData.slug === "index") return null
    return (
      <div class="content-meta-row">
        <Meta {...props} />
        <Contribute {...props} />
      </div>
    )
  }

  Row.css = styles
  return Row
}) satisfies QuartzComponentConstructor<ContentMetaRowOptions>
