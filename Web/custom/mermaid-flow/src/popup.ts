const OWNED_ATTRIBUTE = "data-mermaid-flow-owned"
const MOUNT_ATTRIBUTE = "data-mermaid-flow-mount"
const STATE_ATTRIBUTE = "data-mermaid-flow-state"

/** Returns a native-only clone for Quartz's expanded Mermaid view. */
export const cloneNativeMermaidSvg = (svg: SVGSVGElement): SVGSVGElement => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.querySelectorAll(`[${OWNED_ATTRIBUTE}]`).forEach((element) => element.remove())
  clone.querySelectorAll(`[${MOUNT_ATTRIBUTE}],[${STATE_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(MOUNT_ATTRIBUTE)
    element.removeAttribute(STATE_ATTRIBUTE)
  })
  clone.removeAttribute(MOUNT_ATTRIBUTE)
  clone.removeAttribute(STATE_ATTRIBUTE)
  return clone
}
