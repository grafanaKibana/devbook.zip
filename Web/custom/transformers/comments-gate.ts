import type { Root } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Keep the giscus comment thread off pages that are dashboards, not notes. The
// comments plugin (quartz.config.yaml) renders in afterBody and self-suppresses
// when a page's frontmatter carries `comments: false`; this sets that flag at
// build time for the home dashboard (slug "index") and the Questions index
// (slug "questions"), so the gate lives in the sanctioned custom/ surface and
// survives Quartz Syncer republishing content/. Canvas pages need no entry here
// — their MinimalFrame renders no afterBody, so comments are already absent.
//
// Runs late (pushed after the built-in transformers in quartz.ts) so file.data.slug
// is populated; only sets data, never touches the tree.
const GATED_SLUGS = new Set(["index", "questions"])

export const CommentsGate: QuartzTransformerPlugin = () => ({
  name: "CommentsGate",
  htmlPlugins() {
    return [
      () => (_tree: Root, file: { data: Record<string, unknown> }) => {
        const slug = file.data.slug as string | undefined
        if (!slug || !GATED_SLUGS.has(slug)) return
        const frontmatter = (file.data.frontmatter ?? {}) as Record<string, unknown>
        frontmatter.comments = false
        file.data.frontmatter = frontmatter
      },
    ]
  },
})
