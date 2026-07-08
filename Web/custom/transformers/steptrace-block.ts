import { visit, SKIP } from "unist-util-visit"
import type { Root } from "mdast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"

// steptrace — Quartz mdast transformer. Rewrites each ```steptrace fenced code
// block (body = JSON config) into the mount marker the Steptrace component
// hydrates: <div class="steptrace-mount" data-config="{…}">.
//
// At the mdast stage the `code` node is REPLACED (not mutated — mutating keeps
// mdast's <pre> wrapper) with a custom node carrying the mdast→hast escape hatch
// (data.hName/hProperties/hChildren), so it becomes a REAL bare <div> — not a
// {type:"html"} raw node, which Quartz (no rehype-raw) would drop. Config rides in
// data-config, not a <script> a sanitizer might strip. Invalid JSON is left as an
// ordinary code block. (steptrace fences aren't on Syncer's freeze allowlist — only
// dataview*/datacore* — so they pass through raw for this to run.)

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
          // Custom node type → mdast→hast escape hatch → bare <div> (see header).
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
