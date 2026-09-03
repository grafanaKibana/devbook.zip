import { readConfigPairId } from "./src/authoring/pair-index"

export { readConfigPairId } from "./src/authoring/pair-index"

export interface PairLifecycle {
  destroy(): void
}

export type PairObserver = Pick<MutationObserver, "observe" | "disconnect">

export const resolveQuartzPairRoot = (mount: HTMLElement): HTMLElement | null => {
  const pairId = mount.dataset.mermaidFlowPair
  const candidate = mount.previousElementSibling
  if (!pairId || !(candidate instanceof HTMLElement)) return null
  if (candidate.dataset.mermaidFlowPair === pairId) return candidate
  const markers = Array.from(
    candidate.querySelectorAll<HTMLElement>("[data-mermaid-flow-pair]"),
  ).filter((element) => element.dataset.mermaidFlowPair === pairId)
  return markers.length === 1 ? candidate : null
}

export const resolveConfiguredQuartzPair = (mount: HTMLElement): HTMLElement | null =>
  readConfigPairId(mount.dataset.config ?? "") === mount.dataset.mermaidFlowPair
    ? resolveQuartzPairRoot(mount)
    : null

export const observePairSvg = (
  pairRoot: HTMLElement,
  mount: (svg: SVGSVGElement) => void,
  unmount: (svg: SVGSVGElement) => void,
  createObserver: (callback: MutationCallback) => PairObserver = (callback) =>
    new MutationObserver(callback),
): PairLifecycle => {
  let current: SVGSVGElement | null = null
  let destroyed = false

  const refresh = () => {
    if (destroyed) return
    const marker = pairRoot.querySelector<HTMLElement>("[data-mermaid-flow-pair]")
    const next = marker
      ? marker.querySelector<SVGSVGElement>(":scope > svg")
      : pairRoot.querySelector<SVGSVGElement>("svg")
    if (next === current) return
    if (current) unmount(current)
    current = next
    if (current) mount(current)
  }

  const observer = createObserver(refresh)
  observer.observe(pairRoot, { childList: true, subtree: true })
  refresh()

  return {
    destroy() {
      if (destroyed) return
      destroyed = true
      observer.disconnect()
      if (current) unmount(current)
      current = null
    },
  }
}
