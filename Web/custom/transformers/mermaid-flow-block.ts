import type { Element as HastElement, Root as HastRoot } from "hast"
import type { Root as MdastRoot } from "mdast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { visit } from "unist-util-visit"

import { buildPairIndex, type AuthoringNode } from "../mermaid-flow/src/authoring/pair-index"

type HastData = {
  hName?: string
  hProperties?: Record<string, unknown>
  hChildren?: unknown[]
}

const mountNode = (pairId: string, config: unknown) => ({
  type: "mermaidFlowBlock",
  data: {
    hName: "div",
    hProperties: {
      className: ["mermaid-flow-mount"],
      "data-mermaid-flow-pair": pairId,
      "data-config": JSON.stringify(config),
    },
    hChildren: [],
  },
})

const diagnosticNode = (message: string) => ({
  type: "mermaidFlowDiagnostic",
  data: {
    hName: "p",
    hProperties: { className: ["mermaid-flow-diagnostic"] },
    hChildren: [{ type: "text", value: `Mermaid Flow: ${message}` }],
  },
})

export const MermaidFlowBlock: QuartzTransformerPlugin = () => ({
  name: "MermaidFlowBlock",
  markdownPlugins() {
    return [
      () => (tree: MdastRoot) => {
        const index = buildPairIndex(tree as unknown as AuthoringNode)
        for (const record of [...index.records].reverse()) {
          const children = record.parent.children!
          if (record.failure) {
            children.splice(record.index + 1, 0, diagnosticNode(record.failure))
            continue
          }

          const data = (record.mermaid!.data ?? {}) as HastData
          record.mermaid!.data = {
            ...data,
            hProperties: {
              ...(data.hProperties ?? {}),
              "data-mermaid-flow-pair": record.pairId!,
            },
          }
          children[record.index] = mountNode(record.pairId!, record.config)
        }
      },
    ]
  },
})

export const MermaidFlowPairMarkers: QuartzTransformerPlugin = () => ({
  name: "MermaidFlowPairMarkers",
  htmlPlugins() {
    return [
      () => (tree: HastRoot) => {
        visit(tree, "element", (node: HastElement, index, parent) => {
          if (
            !parent ||
            typeof index !== "number" ||
            node.tagName !== "div" ||
            !Array.isArray(node.properties.className) ||
            !node.properties.className.includes("mermaid-flow-mount")
          ) {
            return
          }
          const pairId = node.properties["data-mermaid-flow-pair"]
          const wrapper = parent.children
            .slice(0, index)
            .reverse()
            .find((child) => child.type === "element")
          if (typeof pairId !== "string" || wrapper?.type !== "element") return
          const code = wrapper.children.find(
            (child): child is HastElement => child.type === "element" && child.tagName === "code",
          )
          if (!code) return
          wrapper.properties["data-mermaid-flow-pair"] = pairId
          code.properties["data-mermaid-flow-pair"] = pairId
        })
      },
    ]
  },
})
