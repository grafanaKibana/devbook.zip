import type {
  ControlValues,
  MermaidFlowHost,
  NormalizedConfig,
  RangeSliderHandle,
  VisualState,
} from "./types"
import type { MermaidSvgAdapter, MotionHandle } from "./mermaid-svg-adapter"

const MOUNT_ATTRIBUTE = "data-mermaid-flow-mount"
const STATE_ATTRIBUTE = "data-mermaid-flow-state"

export interface RenderOptions {
  readonly onControl: (id: string, value?: string | number, announce?: boolean) => void
  readonly onPause: () => void
}

export interface RenderHandle {
  update(
    visual: VisualState,
    controls: ControlValues,
    paused: boolean,
    reduced: boolean,
    announce?: string,
  ): void
  captureFocus(): FocusTarget | null
  restoreFocus(target: FocusTarget | null): void
  destroy(): void
}

type Snapshot = { element: Element; mount: string | null; state: string | null }
type FocusTarget = { type: "control"; id: string } | { type: "pause" }

export const createRenderer = (
  container: HTMLElement,
  config: NormalizedConfig,
  adapter: MermaidSvgAdapter,
  options: RenderOptions,
  host: MermaidFlowHost = {},
): RenderHandle => {
  const document = container.ownerDocument
  const token = `flow-${Math.random().toString(36).slice(2)}`
  const root = document.createElement("div")
  root.className = "mermaid-flow-runtime"
  const controlsRoot = document.createElement("div")
  controlsRoot.className = "mermaid-flow-controls"
  const actionsRoot = document.createElement("div")
  actionsRoot.className = "mermaid-flow-control-actions"
  const live = document.createElement("div")
  live.className = "mermaid-flow-live"
  live.setAttribute("aria-live", "polite")
  live.setAttribute("aria-atomic", "true")
  root.append(controlsRoot, live)
  container.append(root)

  const selects = new Map<string, HTMLSelectElement>()
  const ranges = new Map<string, RangeSliderHandle>()
  const focusElements = new Map<string, HTMLElement>()
  for (const control of config.controls) {
    const label = document.createElement("label")
    label.className = "mermaid-flow-control-field"
    if (control.type === "scenario") {
      label.textContent = control.label
      const select = document.createElement("select")
      select.dataset.mermaidFlowControl = control.id
      for (const value of control.options) {
        const option = document.createElement("option")
        option.value = value
        option.textContent = value
        select.append(option)
      }
      select.addEventListener("change", () => options.onControl(control.id, select.value, true))
      label.append(select)
      selects.set(control.id, select)
      focusElements.set(control.id, select)
    } else if (control.type === "range") {
      label.classList.add("mermaid-flow-control-range")
      const createFallback = (): RangeSliderHandle => {
        const value = document.createElement("span")
        value.className = "mermaid-flow-range-value"
        const input = document.createElement("input")
        input.type = "range"
        input.className = "mermaid-flow-range-fallback"
        input.min = String(control.min)
        input.max = String(control.max)
        input.step = String(control.step)
        const format = (current: number) => `${new Intl.NumberFormat("en-US").format(current)} r/s`
        const update = () => {
          value.textContent = format(input.valueAsNumber)
          input.setAttribute("aria-valuetext", value.textContent)
        }
        input.setAttribute("aria-label", control.label)
        input.addEventListener("input", () => {
          update()
          options.onControl(control.id, input.valueAsNumber, false)
        })
        input.addEventListener("change", () =>
          options.onControl(control.id, input.valueAsNumber, true),
        )
        label.append(value, input)
        return {
          element: input,
          setValue: (value) => {
            input.value = String(value)
            update()
          },
          destroy: () => label.replaceChildren(),
        }
      }
      const range = host.createRangeSlider
        ? host.createRangeSlider(label, {
            min: control.min,
            max: control.max,
            step: control.step,
            value: control.default,
            label: control.label,
            format: (value) => `${new Intl.NumberFormat("en-US").format(value)} r/s`,
            onChange: (value) => options.onControl(control.id, value, false),
          })
        : createFallback()
      range.element.dataset.mermaidFlowControl = control.id
      ranges.set(control.id, range)
      focusElements.set(control.id, range.element)
    } else {
      const button = document.createElement("button")
      button.type = "button"
      button.dataset.mermaidFlowControl = control.id
      button.textContent = control.label
      button.addEventListener("click", () => options.onControl(control.id, undefined, true))
      focusElements.set(control.id, button)
      actionsRoot.append(button)
      continue
    }
    controlsRoot.append(label)
  }

  const pause = document.createElement("button")
  pause.type = "button"
  pause.dataset.mermaidFlowCommand = "pause"
  pause.addEventListener("click", options.onPause)
  controlsRoot.append(actionsRoot)
  const motions = new Map<string, MotionHandle>()
  const motionSignatures = new Map<string, string>()
  const snapshots = new Map<string, Snapshot>()

  const target = (kind: "node" | "edge", id: string): Element => {
    const key = `${kind}:${id}`
    const current = snapshots.get(key)
    if (current) return current.element
    const element =
      kind === "node"
        ? adapter.resolveNodePaintTarget(id)
        : adapter.resolveEdgePaintTarget(Number(id))
    snapshots.set(key, {
      element,
      mount: element.getAttribute(MOUNT_ATTRIBUTE),
      state: element.getAttribute(STATE_ATTRIBUTE),
    })
    return element
  }

  const paint = (kind: "node" | "edge", id: string, state: string) => {
    const element = target(kind, id)
    if (state === "normal") {
      const snapshot = snapshots.get(`${kind}:${id}`)!
      if (snapshot.mount === null) element.removeAttribute(MOUNT_ATTRIBUTE)
      else element.setAttribute(MOUNT_ATTRIBUTE, snapshot.mount)
      if (snapshot.state === null) element.removeAttribute(STATE_ATTRIBUTE)
      else element.setAttribute(STATE_ATTRIBUTE, snapshot.state)
    } else {
      element.setAttribute(MOUNT_ATTRIBUTE, token)
      element.setAttribute(STATE_ATTRIBUTE, state)
    }
  }

  const update = (
    visual: VisualState,
    controls: ControlValues,
    paused: boolean,
    reduced: boolean,
    announce?: string,
  ) => {
    for (const [id, node] of Object.entries(visual.nodes)) {
      paint("node", id, node.state)
      if (node.metric !== undefined) adapter.setNodeMetric(id, node.metric)
      adapter.setNodeLoad(id, node.load, node.loadLabel)
    }

    let continuous = (config.queues?.length ?? 0) > 0
    for (const [id, edge] of Object.entries(visual.edges)) {
      paint("edge", id, edge.state)
      let motion = motions.get(id)
      if (!motion) {
        motion = adapter.createMotion(Number(id), {
          direction: edge.direction,
          durationMs: edge.travelMs,
          particlesPerCycle: 0,
        })
        motions.set(id, motion)
      }
      continuous ||= edge.visible && edge.particlesPerCycle > 0
      motion.root.setAttribute("color", "var(--interactive-accent,var(--secondary,currentColor))")
      const options = {
        direction: edge.direction,
        durationMs: edge.travelMs,
        delayMs: edge.delayMs,
        particlesPerCycle: paused || reduced ? 0 : edge.particlesPerCycle,
        radius: edge.radius,
        visible: edge.visible,
      }
      const signature = Object.values(options).join("|")
      if (motionSignatures.get(id) !== signature) {
        motion.setParticles(options)
        motionSignatures.set(id, signature)
      }
    }

    for (const [id, element] of selects) element.value = String(controls[id])
    for (const [id, range] of ranges) range.setValue(Number(controls[id]))
    if (!reduced && continuous) {
      pause.textContent = paused ? "Resume animation" : "Pause animation"
      if (!pause.isConnected) actionsRoot.append(pause)
    } else pause.remove()
    if (announce) live.textContent = announce
  }

  return {
    update,
    captureFocus() {
      const active = document.activeElement
      if (active === pause) return { type: "pause" }
      for (const [id, element] of focusElements) {
        if (active === element) return { type: "control", id }
      }
      return null
    },
    restoreFocus(target) {
      if (target?.type === "pause") pause.focus()
      else if (target) focusElements.get(target.id)?.focus()
    },
    destroy() {
      ranges.forEach((range) => range.destroy())
      motions.forEach((motion) => motion.destroy())
      for (const snapshot of snapshots.values()) {
        for (const [name, value] of [
          [MOUNT_ATTRIBUTE, snapshot.mount],
          [STATE_ATTRIBUTE, snapshot.state],
        ] as const) {
          if (value === null) snapshot.element.removeAttribute(name)
          else snapshot.element.setAttribute(name, value)
        }
      }
      root.remove()
    },
  }
}
