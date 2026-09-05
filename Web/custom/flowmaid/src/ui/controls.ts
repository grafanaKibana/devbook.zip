import type { ControlHost, FlowmaidProgram, RangeSliderHandle } from "../domain/types"

export interface ControlCallbacks {
  readonly onControl: (id: string, value: number) => void
  readonly onReset: () => void
  readonly onPause: () => void
}

export type FocusTarget =
  { readonly kind: "control"; readonly id: string } | { readonly kind: "reset" | "pause" }

export interface ControlView {
  update(values: Readonly<Record<string, number>>, paused: boolean, announcement?: string): void
  captureFocus(): FocusTarget | null
  restoreFocus(target: FocusTarget | null): void
  destroy(): void
}

export const createControls = (
  container: HTMLElement,
  program: FlowmaidProgram,
  callbacks: ControlCallbacks,
  host: ControlHost = {},
): ControlView => {
  const document = container.ownerDocument
  const root = document.createElement("div")
  const fields = document.createElement("div")
  const actions = document.createElement("div")
  const live = document.createElement("div")
  const sliders = new Map<string, RangeSliderHandle>()
  const valueViews = new Map<
    string,
    { element: HTMLSpanElement; format: (value: number) => string }
  >()
  const cleanups: Array<() => void> = []
  root.className = "flowmaid-controls"
  root.dataset.flowmaidOwned = "controls"
  fields.className = "flowmaid-control-fields"
  actions.className = "flowmaid-control-actions"
  live.className = "flowmaid-live"
  live.setAttribute("aria-live", "polite")
  live.setAttribute("aria-atomic", "true")

  for (const control of program.controls) {
    const field = document.createElement("label")
    const value = document.createElement("span")
    field.className = "flowmaid-control-field flowmaid-control-range"
    value.className = "flowmaid-control-value"
    const format = (value: number) =>
      `${new Intl.NumberFormat("en-US").format(value)}${control.unit ? ` ${control.unit}` : ""}`
    value.textContent = format(control.value)
    field.append(value)
    valueViews.set(control.id, { element: value, format })
    const fallback = (): RangeSliderHandle => {
      const input = document.createElement("input")
      input.type = "range"
      input.min = String(control.min)
      input.max = String(control.max)
      input.step = String(control.step)
      input.value = String(control.value)
      input.setAttribute("aria-label", control.label)
      const updateValue = () => {
        value.textContent = format(input.valueAsNumber)
        input.setAttribute("aria-valuetext", value.textContent)
      }
      const onInput = () => {
        updateValue()
        callbacks.onControl(control.id, input.valueAsNumber)
      }
      input.addEventListener("input", onInput)
      cleanups.push(() => input.removeEventListener("input", onInput))
      input.className = "flowmaid-range-fallback"
      field.append(input)
      updateValue()
      return {
        element: input,
        setValue(next) {
          input.value = String(next)
          updateValue()
        },
        destroy() {},
      }
    }
    const slider = host.createRangeSlider
      ? host.createRangeSlider(field, {
          label: control.label,
          min: control.min,
          max: control.max,
          step: control.step,
          value: control.value,
          format,
          onInput: (next) => {
            value.textContent = format(next)
            callbacks.onControl(control.id, next)
          },
        })
      : fallback()
    slider.element.dataset.flowmaidControl = control.id
    sliders.set(control.id, slider)
    fields.append(field)
  }

  const button = (name: string, command: "reset" | "pause", activate: () => void) => {
    const element = document.createElement("button")
    element.type = "button"
    element.textContent = name
    element.dataset.flowmaidCommand = command
    element.addEventListener("click", activate)
    cleanups.push(() => element.removeEventListener("click", activate))
    actions.append(element)
    return element
  }
  const reset =
    program.controls.length || program.queues.length
      ? button("Reset", "reset", callbacks.onReset)
      : null
  const pause = button("Pause animation", "pause", callbacks.onPause)
  root.append(fields, actions, live)
  container.append(root)

  return {
    update(values, paused, announcement) {
      sliders.forEach((slider, id) => {
        const next = values[id]!
        slider.setValue(next)
        const value = valueViews.get(id)
        if (value) value.element.textContent = value.format(next)
      })
      pause.textContent = paused ? "Resume animation" : "Pause animation"
      pause.setAttribute("aria-pressed", String(paused))
      if (announcement) live.textContent = announcement
    },
    captureFocus() {
      if (document.activeElement === pause) return { kind: "pause" }
      if (reset && document.activeElement === reset) return { kind: "reset" }
      for (const [id, slider] of sliders)
        if (document.activeElement === slider.element) return { kind: "control", id }
      return null
    },
    restoreFocus(target) {
      if (target?.kind === "pause") pause.focus()
      else if (target?.kind === "reset") reset?.focus()
      else if (target?.kind === "control") sliders.get(target.id)?.element.focus()
    },
    destroy() {
      cleanups.forEach((cleanup) => cleanup())
      sliders.forEach((slider) => slider.destroy())
      root.remove()
    },
  }
}
