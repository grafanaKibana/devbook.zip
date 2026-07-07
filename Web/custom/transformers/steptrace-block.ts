import { visit, SKIP } from "unist-util-visit"
import type { Root } from "mdast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// Rewrites each ```steptrace fenced code block (body = flat JSON config) that
// Syncer commits raw into the mount marker the Steptrace component hydrates:
//   <div class="steptrace-mount" data-config="{…}"></div>
//
// Done at the mdast stage: the `code` node is REPLACED (not mutated — mutating
// keeps mdast's <pre> wrapper) with a node carrying the mdast→hast escape hatch
// (data.hName/hProperties/hChildren), so it converts to a REAL bare <div> hast
// element — not a raw HTML node, which Quartz (no rehype-raw) would silently
// drop. Config rides in a data-config attribute rather than a <script> a
// sanitizer might strip. A block with invalid JSON is left as an ordinary code
// block rather than crashing the build.
//
// steptrace fences are NOT on Quartz Syncer's execute/freeze allowlist (only
// dataview*/datacore*), so Syncer passes them through untouched for this to run.

export const SteptraceBlock: QuartzTransformerPlugin = () => ({
  name: "SteptraceBlock",
  markdownPlugins() {
    return [
      () => (tree: Root) => {
        visit(tree, "code", (node, index, parent) => {
          if (!parent || typeof index !== "number" || node.lang !== "steptrace") return
          let cfg: unknown
          try {
            cfg = JSON.parse(node.value)
          } catch {
            return // leave a malformed block as a normal code block
          }
          // A custom (non-"html") node type so mdast→hast uses the escape-hatch
          // path and emits a bare <div> element — NOT a `raw` node (type:"html"),
          // which Quartz would drop for having no rehype-raw.
          parent.children[index] = {
            type: "steptraceBlock",
            data: {
              hName: "div",
              hProperties: { className: ["steptrace-mount"], "data-config": JSON.stringify(cfg) },
              hChildren: [],
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any
          return SKIP
        })
      },
    ]
  },
})
