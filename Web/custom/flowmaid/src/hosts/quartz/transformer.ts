import type { Element as HastElement, Root as HastRoot } from "hast"
import type { Root as MdastRoot } from "mdast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { visit } from "unist-util-visit"

import { extractFlowmaid } from "../../authoring/extract"
import { parseFlowmaidYaml } from "../../authoring/yaml"
import { compileFlowmaid } from "../../domain/compile"

type MdastChild = MdastRoot["children"][number] & { data?: Record<string, unknown> }

const diagnostic = (message: string): MdastChild =>
  ({
    type: "paragraph",
    children: [],
    data: {
      hName: "p",
      hProperties: { className: ["flowmaid-diagnostic"] },
      hChildren: [{ type: "text", value: `Flowmaid: ${message}` }],
    },
  }) as unknown as MdastChild

export const FlowmaidBlock: QuartzTransformerPlugin = () => ({
  name: "FlowmaidBlock",
  markdownPlugins() {
    return [
      () => (tree: MdastRoot) => {
        const walk = (parent: { children?: MdastChild[] }): void => {
          const children = parent.children
          if (!children) return
          for (let index = children.length - 1; index >= 0; index -= 1) {
            const node = children[index]!
            if (node.type !== "code" || node.lang !== "mermaid" || typeof node.value !== "string") {
              walk(node as { children?: MdastChild[] })
              continue
            }
            const extracted = extractFlowmaid(node.value)
            if (extracted.kind === "none") continue
            if (extracted.kind === "invalid") {
              children.splice(index + 1, 0, diagnostic(extracted.diagnostic.message))
              continue
            }
            try {
              const program = compileFlowmaid(parseFlowmaidYaml(extracted.value.yaml))
              const id = node.position
                ? `${node.position.start.line}:${node.position.start.column}:${node.position.end.line}:${node.position.end.column}`
                : `flowmaid:${index}`
              node.data = {
                ...(node.data ?? {}),
                hProperties: {
                  ...((node.data?.hProperties as Record<string, unknown> | undefined) ?? {}),
                  "data-flowmaid-id": id,
                },
              }
              children.splice(index + 1, 0, {
                type: "html",
                value: "",
                data: {
                  hName: "div",
                  hProperties: {
                    className: ["flowmaid-mount"],
                    "data-flowmaid-id": id,
                    "data-flowmaid-program": JSON.stringify(program),
                  },
                  hChildren: [],
                },
              } as MdastChild)
            } catch (error) {
              children.splice(
                index + 1,
                0,
                diagnostic(error instanceof Error ? error.message : String(error)),
              )
            }
          }
        }
        walk(tree as { children?: MdastChild[] })
      },
    ]
  },
  htmlPlugins() {
    return [
      () => (tree: HastRoot) => {
        visit(tree, "element", (node: HastElement, index, parent) => {
          if (
            !parent ||
            typeof index !== "number" ||
            node.tagName !== "div" ||
            !Array.isArray(node.properties.className) ||
            !node.properties.className.includes("flowmaid-mount")
          )
            return
          const id = node.properties["data-flowmaid-id"]
          const wrapper = parent.children
            .slice(0, index)
            .reverse()
            .find((child) => child.type === "element")
          if (typeof id !== "string" || wrapper?.type !== "element") return
          wrapper.properties["data-flowmaid-id"] = id
          const code = wrapper.children.find(
            (child): child is HastElement => child.type === "element" && child.tagName === "code",
          )
          if (code) code.properties["data-flowmaid-id"] = id
        })
      },
    ]
  },
})
