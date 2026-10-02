import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "../../quartz/components/types"
import { lucideInner } from "../lib/lucide-icons"
import styles from "./styles/content-meta-row.scss"

// One article-meta row: the community content-meta (date · reading time) on the
// left, the page's Edit/Report links (page-contribute.tsx) on the
// right. Both instances are passed in from quartz.ts — content-meta is enabled
// but unpositioned in quartz.config.yaml (the SiteHeader pattern), so this owns
// where it renders. Suppressed on the home dashboard, which carries no
// content-meta by design; page-contribute self-suppresses on the rest.
//
// Notes still at Not-Started or Creation lead the row with a static
// "In progress" chip; the modified date beside it already says when.
interface ContentMetaRowOptions {
  meta: QuartzComponent
  contribute: QuartzComponent
}

const UNFINISHED_STATUSES = new Set(["not-started", "creation"])

const statusValues = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(statusValues)
  return typeof value === "string" ? [value.trim().toLowerCase()] : []
}

const isUnfinished = (status: unknown): boolean =>
  statusValues(status).some((value) => UNFINISHED_STATUSES.has(value))

const circleDashed = lucideInner("circle-dashed") ?? ""

export const ContentMetaRow = ((opts?: ContentMetaRowOptions) => {
  if (!opts) {
    throw new Error("ContentMetaRow requires meta + contribute components")
  }
  const { meta: Meta, contribute: Contribute } = opts

  const Row: QuartzComponent = (props: QuartzComponentProps) => {
    if (props.fileData.slug === "index") return null
    const meta = <Meta {...props} />
    return (
      <div class="content-meta-row">
        {isUnfinished(props.fileData.frontmatter?.status) ? (
          <div class="content-meta-lead">
            <span class="content-status">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: circleDashed }}
              />
              In progress
            </span>
            {meta}
          </div>
        ) : (
          meta
        )}
        <Contribute {...props} />
      </div>
    )
  }

  Row.css = styles
  return Row
}) satisfies QuartzComponentConstructor<ContentMetaRowOptions>
