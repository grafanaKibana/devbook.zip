import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
// @ts-expect-error Quartz bundles `.inline.ts` modules as script strings.
import hydrate from "../mermaid-flow/browser.inline"

export const MermaidFlow: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = hydrate
  return Component
}
