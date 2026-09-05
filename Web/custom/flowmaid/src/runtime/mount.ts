import type {
  ClockDependencies,
  ControlHost,
  FlowmaidProgram,
  SimulationSnapshot,
} from "../domain/types"
import { MermaidAdapter } from "../mermaid/adapter"
import { createDecorations, type DecorationHandle } from "../mermaid/decorations"
import { createSimulationClock, type SimulationClock } from "../simulation/clock"
import { createSimulation, type SimulationState } from "../simulation/state"
import { createControls, type ControlView } from "../ui/controls"

export interface MountDependencies {
  readonly clock?: ClockDependencies
  readonly controlHost?: ControlHost
}

export interface FlowmaidMount {
  current(): SimulationSnapshot
  update(control: string, value: number): SimulationSnapshot
  reset(): SimulationSnapshot
  pause(): void
  resume(): void
  replaceSvg(svg: SVGSVGElement): void
  destroy(): void
}

const browserClock = (container: HTMLElement): ClockDependencies => {
  const view = container.ownerDocument.defaultView
  if (!view) throw new Error("Flowmaid requires a browser window")
  return {
    now: () => view.performance.now(),
    setInterval: (callback, milliseconds) => view.setInterval(callback, milliseconds),
    clearInterval: (handle) => view.clearInterval(handle as number),
  }
}

const sameGraph = (left: MermaidAdapter, right: MermaidAdapter) =>
  JSON.stringify(left.graph) === JSON.stringify(right.graph)

export const mountFlowmaid = (
  container: HTMLElement,
  svg: SVGSVGElement,
  program: FlowmaidProgram,
  dependencies: MountDependencies = {},
): FlowmaidMount => {
  let adapter = new MermaidAdapter(svg)
  const state: SimulationState = createSimulation(program, adapter.graph)
  let decorations: DecorationHandle = createDecorations(adapter)
  let destroyed = false
  let reducedMotion = false
  let controls: ControlView
  let clock: SimulationClock
  const view = container.ownerDocument.defaultView
  const media = view?.matchMedia("(prefers-reduced-motion: reduce)")
  reducedMotion = media?.matches ?? false
  const inlineContainerType = container.style.containerType
  const ownsContainerType = view?.getComputedStyle(container).containerType === "normal"
  if (ownsContainerType) container.style.containerType = "inline-size"

  const render = (
    snapshot = state.current(),
    announcement?: string,
    motion: "emit" | "hold" | "clear" = "emit",
  ) => {
    decorations.update(snapshot, clock?.paused ?? false, reducedMotion, motion)
    controls?.update(snapshot.controls, clock?.paused ?? false, announcement)
  }
  const announceControl = (id: string, value: number) => {
    const control = program.controls.find((candidate) => candidate.id === id)
    return `${control?.label ?? id}: ${value}${control?.unit ? ` ${control.unit}` : ""}`
  }
  controls = createControls(
    container,
    program,
    {
      onControl(id, value) {
        render(state.update(id, value), announceControl(id, value), "hold")
        clock.reset()
      },
      onReset() {
        render(state.reset(), "Flowmaid reset", "clear")
        clock.reset()
      },
      onPause() {
        if (clock.paused) clock.resume()
        else clock.pause()
        render(
          undefined,
          clock.paused ? "Flowmaid paused" : "Flowmaid resumed",
          clock.paused ? "clear" : "hold",
        )
      },
    },
    dependencies.controlHost,
  )
  clock = createSimulationClock(dependencies.clock ?? browserClock(container), (elapsed) =>
    render(state.advance(elapsed)),
  )
  const motionChanged = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches
    render(undefined, undefined, event.matches ? "clear" : "hold")
  }
  media?.addEventListener("change", motionChanged)
  try {
    render(undefined, undefined, "hold")
  } catch (error) {
    clock.destroy()
    controls.destroy()
    decorations.destroy()
    adapter.destroy()
    media?.removeEventListener("change", motionChanged)
    if (ownsContainerType) container.style.containerType = inlineContainerType
    throw error
  }

  return {
    current: () => state.current(),
    update(id, value) {
      const snapshot = state.update(id, value)
      clock.reset()
      render(snapshot, announceControl(id, value), "hold")
      return snapshot
    },
    reset() {
      const snapshot = state.reset()
      clock.reset()
      render(snapshot, "Flowmaid reset", "clear")
      return snapshot
    },
    pause() {
      clock.pause()
      render(undefined, "Flowmaid paused", "clear")
    },
    resume() {
      clock.resume()
      render(undefined, "Flowmaid resumed", "hold")
    },
    replaceSvg(nextSvg) {
      if (destroyed || nextSvg === adapter.svg) return
      const next = new MermaidAdapter(nextSvg)
      if (!sameGraph(adapter, next)) {
        next.destroy()
        throw new Error("Flowmaid replacement SVG graph does not match the mounted diagram")
      }
      const focus = controls.captureFocus()
      decorations.destroy()
      adapter.destroy()
      adapter = next
      decorations = createDecorations(adapter)
      render(undefined, undefined, "hold")
      controls.restoreFocus(focus)
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      clock.destroy()
      media?.removeEventListener("change", motionChanged)
      controls.destroy()
      decorations.destroy()
      adapter.destroy()
      if (ownsContainerType) container.style.containerType = inlineContainerType
    },
  }
}
