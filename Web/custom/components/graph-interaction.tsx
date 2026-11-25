import type { QuartzComponent, QuartzComponentConstructor } from "@quartz-community/types"
// @ts-expect-error Quartz bundles inline modules as browser script strings.
import script from "./graph-interaction.inline.js"
import style from "./styles/graph-interaction.scss"

export const GraphInteraction: QuartzComponentConstructor = () => {
  const Component: QuartzComponent = () => null
  Component.beforeDOMLoaded = script
  Component.css = style
  return Component
}
