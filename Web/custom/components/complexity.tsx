import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
// @ts-expect-error Quartz bundles `.inline.ts` modules as script strings.
import hydrate from "../complexity/complexity.inline"

export const Complexity: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.afterDOMLoaded = hydrate
  return Component
}
