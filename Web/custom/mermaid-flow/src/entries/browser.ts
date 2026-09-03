import { mountMermaidFlow } from "../mount"
import { parseConfig } from "../config"
import { cloneNativeMermaidSvg } from "../popup"

const mermaidFlow = {
  mount(container: HTMLElement, svg: SVGSVGElement, source: string) {
    return mountMermaidFlow(container, svg, parseConfig(source))
  },
  cloneNativeMermaidSvg,
}

Object.assign(globalThis, { mermaidFlow })
