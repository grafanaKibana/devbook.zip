import { MermaidSvgAdapter } from "./mermaid-svg-adapter"
import { createRenderer, type RenderHandle } from "./render"
import { createLocalState, type StateSnapshot } from "./state"
import type { MermaidFlowHost, NormalizedConfig } from "./types"

export interface MountHandle {
  current(): StateSnapshot
  update(control: string, value: string | number): StateSnapshot
  reset(): StateSnapshot
  replaceSvg(svg: SVGSVGElement): void
  destroy(): void
}

export const mountMermaidFlow = (
  container: HTMLElement,
  svg: SVGSVGElement,
  config: NormalizedConfig,
  host: MermaidFlowHost = {},
): MountHandle => {
  const state = createLocalState(config)
  const view = container.ownerDocument.defaultView
  const media = view?.matchMedia("(prefers-reduced-motion: reduce)")
  let reduced = media?.matches ?? false
  let paused = false
  let destroyed = false
  const clock = () => view?.performance.now() ?? Date.now()
  let lastTick = clock()
  let simulationTimer: number | undefined
  let adapter: MermaidSvgAdapter
  let renderer: RenderHandle
  const inlineContainerType = container.style.containerType
  const ownsContainerType = view?.getComputedStyle(container).containerType === "normal"
  if (ownsContainerType) container.style.containerType = "inline-size"

  const announce = (id: string, snapshot: StateSnapshot) => {
    const declaration = config.controls.find((control) => control.id === id)
    if (!declaration) return "Mermaid Flow updated"
    return declaration.type === "reset"
      ? `${declaration.label}: controls restored`
      : `${declaration.label}: ${String(snapshot.controls[id])}`
  }

  const render = (snapshot = state.current(), message?: string) =>
    renderer.update(snapshot.visual, snapshot.controls, paused, reduced, message)

  const control = (id: string, value?: string | number, shouldAnnounce = false) => {
    const declaration = config.controls.find((candidate) => candidate.id === id)
    if (!declaration) return
    const snapshot = declaration.type === "reset" ? state.reset() : state.update(id, value!)
    lastTick = clock()
    render(snapshot, shouldAnnounce ? announce(id, snapshot) : undefined)
  }

  const create = (nextSvg: SVGSVGElement) => {
    const nextAdapter = new MermaidSvgAdapter(nextSvg)
    const nextRenderer = createRenderer(
      container,
      config,
      nextAdapter,
      {
        onControl: control,
        onPause: () => {
          paused = !paused
          lastTick = clock()
          render()
        },
      },
      host,
    )
    adapter = nextAdapter
    renderer = nextRenderer
    try {
      render()
    } catch (error) {
      nextRenderer.destroy()
      nextAdapter.destroy()
      throw error
    }
  }

  try {
    create(svg)
  } catch (error) {
    if (ownsContainerType) container.style.containerType = inlineContainerType
    throw error
  }
  const motionChanged = (event: MediaQueryListEvent) => {
    reduced = event.matches
    render()
  }
  media?.addEventListener("change", motionChanged)
  if (config.queues?.length && view) {
    simulationTimer = view.setInterval(() => {
      const now = clock()
      const elapsed = Math.min(Math.max(now - lastTick, 0), 1000)
      lastTick = now
      if (!paused) render(state.advance(elapsed))
    }, 250)
  }

  return {
    current: () => state.current(),
    update(id, value) {
      const snapshot = state.update(id, value)
      lastTick = clock()
      render(snapshot, announce(id, snapshot))
      return snapshot
    },
    reset() {
      const snapshot = state.reset()
      lastTick = clock()
      const reset = config.controls.find((control) => control.type === "reset")
      render(snapshot, reset ? announce(reset.id, snapshot) : "Mermaid Flow reset")
      return snapshot
    },
    replaceSvg(nextSvg) {
      if (destroyed || nextSvg === adapter.svg) return
      const focus = renderer.captureFocus()
      renderer.destroy()
      adapter.destroy()
      create(nextSvg)
      renderer.restoreFocus(focus)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      if (simulationTimer !== undefined) view?.clearInterval(simulationTimer)
      media?.removeEventListener("change", motionChanged)
      renderer.destroy()
      adapter.destroy()
      if (ownsContainerType) container.style.containerType = inlineContainerType
    },
  }
}
