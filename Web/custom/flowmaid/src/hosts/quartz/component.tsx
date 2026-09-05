// @ts-expect-error Quartz bundles `.inline.ts` modules as script strings.
import load from "./loader.inline"

export const Flowmaid = () => {
  const Component = () => null
  Component.afterDOMLoaded = load
  return Component
}
