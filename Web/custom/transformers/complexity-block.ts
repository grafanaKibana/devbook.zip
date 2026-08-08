import type { Element, Root } from "hast"
import type { QuartzTransformerPlugin } from "@quartz-community/types"
import { SKIP, visit } from "unist-util-visit"

import { renderComplexityHast } from "../complexity/hast"
import { buildComplexityViewModel } from "../complexity/model"

function errorNode(message: string): Element {
  return {
    type: "element",
    tagName: "pre",
    properties: { className: ["complexity-error"] },
    children: [{ type: "text", value: message }],
  }
}

export const ComplexityBlock: QuartzTransformerPlugin = () => ({
  name: "ComplexityBlock",
  htmlPlugins() {
    return [
      () => (tree: Root) => {
        let occurrence = 0
        visit(tree, "element", (node: Element, index, parent) => {
          if (
            !parent ||
            typeof index !== "number" ||
            node.tagName !== "pre" ||
            node.children.length !== 1
          ) {
            return
          }
          const code = node.children[0]
          if (
            code.type !== "element" ||
            code.tagName !== "code" ||
            !Array.isArray(code.properties.className) ||
            !code.properties.className.includes("language-complexity")
          ) {
            return
          }
          const source = code.children
            .filter((child) => child.type === "text")
            .map((child) => child.value)
            .join("")
          try {
            parent.children[index] = renderComplexityHast(
              buildComplexityViewModel(JSON.parse(source), `page-occurrence-${++occurrence}`),
            )
          } catch (error) {
            parent.children[index] = errorNode(
              `complexity: ${error instanceof Error ? error.message : String(error)}\n\n${source}`,
            )
          }
          return SKIP
        })
      },
    ]
  },
})
