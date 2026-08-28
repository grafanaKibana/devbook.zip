import { el } from "../render"
import type { MountHandle, VisualFamilyId } from "../types"

export interface CellPaint {
  value: string | null
  label?: string
  ariaLabel?: string
  active?: boolean
  changed?: boolean
  head?: boolean
  tail?: boolean
  view?: boolean
}

export interface StructureShell {
  stage: HTMLElement
  controls: HTMLElement
  status: HTMLElement
  setCounter(value: string, suffix?: string): void
  input(ariaLabel: string, placeholder: string, maxLength?: number): HTMLInputElement
  select(
    ariaLabel: string,
    placeholder: string,
    options: readonly string[],
    selected?: string,
  ): HTMLSelectElement
  button(label: string, primary?: boolean): HTMLButtonElement
  listen(node: HTMLElement, type: string, listener: EventListener): void
  reducedMotion(): boolean
  finish(): MountHandle
}

type FocusableControl = HTMLElement & { disabled?: boolean }

function controlLabel(control: HTMLElement) {
  return control.getAttribute("aria-label") || control.textContent || ""
}

function usefulControl(control: FocusableControl) {
  return (
    !control.disabled &&
    !control.hidden &&
    !control.closest('[hidden], [aria-hidden="true"]') &&
    control.getClientRects().length > 0
  )
}

function restoreOperationFocus(
  controls: HTMLElement,
  trigger: HTMLButtonElement,
  label = controlLabel(trigger),
) {
  let cancelled = false
  let observer: MutationObserver | null = null
  const cleanup = () => {
    cancelled = true
    observer?.disconnect()
    observer = null
  }
  const restore = () => {
    if (cancelled) {
      cleanup()
      return true
    }
    const active = document.activeElement
    if (active && active !== document.body && active !== trigger) {
      cleanup()
      return true
    }
    const candidates = Array.from(
      controls.querySelectorAll<FocusableControl>("button, input, select, textarea, [tabindex]"),
    ).filter(usefulControl)
    const target =
      candidates.find((candidate) => candidate === trigger) ||
      candidates.find(
        (candidate) => candidate.tagName === trigger.tagName && controlLabel(candidate) === label,
      ) ||
      candidates[0]
    if (!target) return false
    target.focus()
    cleanup()
    return true
  }

  queueMicrotask(() => {
    if (restore()) return
    observer = new MutationObserver(restore)
    observer.observe(controls, {
      attributes: true,
      attributeFilter: ["aria-hidden", "disabled", "hidden"],
      childList: true,
      subtree: true,
    })
  })

  return cleanup
}

export function withOperationFocus(
  controls: HTMLElement,
  trigger: HTMLButtonElement,
  event: Event,
  listener: EventListener,
) {
  const preserveFocus =
    event instanceof MouseEvent && event.detail === 0 && document.activeElement === trigger
  const label = controlLabel(trigger)
  listener.call(trigger, event)
  if (
    !preserveFocus ||
    (document.activeElement === trigger && !trigger.disabled && trigger.isConnected)
  )
    return null
  return restoreOperationFocus(controls, trigger, label)
}

export function createStructureShell(
  root: HTMLElement,
  id: string,
  label: string,
  ariaLabel: string,
  family: VisualFamilyId = "contiguous-storage",
  stageClass = "steptrace__contiguous",
): StructureShell {
  root.classList.add("steptrace", "steptrace--structure")
  root.dataset.visualFamily = family
  root.dataset.structure = id
  root.setAttribute("role", "group")
  root.setAttribute("aria-label", ariaLabel)

  const media = matchMedia("(prefers-reduced-motion: reduce)")
  const applyMotion = () => root.classList.toggle("steptrace--reduced", media.matches)
  media.addEventListener("change", applyMotion)

  const head = el("div", "steptrace__head")
  const crumb = el("div", "steptrace__crumb")
  const kind = el("span")
  kind.textContent = "data structure"
  const separator = el("span", "steptrace__crumb-sep")
  separator.textContent = "›"
  const name = el("span", "steptrace__crumb-algo")
  name.textContent = label
  crumb.append(el("span", "steptrace__crumb-dot"), kind, separator, name)
  const counter = el("div", "steptrace__counter")
  head.append(crumb, counter)

  const body = el("div", "steptrace__body steptrace__structure-body")
  const stage = el("div", stageClass)
  body.append(stage)

  const controls = el("div", "steptrace__foot steptrace__structure-controls")
  const status = el("div", "steptrace__structure-status")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")
  status.setAttribute("aria-atomic", "true")

  const cleanups: Array<() => void> = []
  let cancelFocusRestore: (() => void) | null = null
  root.replaceChildren(head, body, controls)
  applyMotion()

  return {
    stage,
    controls,
    status,
    setCounter(value, suffix = "") {
      counter.innerHTML = `<b>${value}</b>${suffix}`
    },
    input(inputLabel, placeholder, maxLength = 12) {
      const input = el("input", "steptrace__structure-input") as HTMLInputElement
      input.type = "text"
      input.maxLength = maxLength
      input.placeholder = placeholder
      input.name = inputLabel
      input.setAttribute("aria-label", inputLabel)
      return input
    },
    select(selectLabel, placeholder, options, selected) {
      const select = el(
        "select",
        "steptrace__select steptrace__structure-select",
      ) as HTMLSelectElement
      select.name = selectLabel
      select.setAttribute("aria-label", selectLabel)
      const prompt = el("option") as HTMLOptionElement
      prompt.value = ""
      prompt.textContent = placeholder
      prompt.disabled = true
      select.append(prompt)
      for (const value of options) {
        const option = el("option") as HTMLOptionElement
        option.value = value
        option.textContent = value
        select.append(option)
      }
      select.value = selected ?? ""
      return select
    },
    button(buttonLabel, primary = false) {
      const button = el(
        "button",
        `steptrace__structure-action${primary ? " steptrace__structure-action--primary" : ""}`,
      ) as HTMLButtonElement
      button.type = "button"
      button.textContent = buttonLabel
      return button
    },
    listen(node, type, listener) {
      const wrapped: EventListener =
        type === "click" && node.tagName === "BUTTON"
          ? (event) => {
              const trigger = node as HTMLButtonElement
              const pending = withOperationFocus(controls, trigger, event, listener)
              if (pending) {
                cancelFocusRestore?.()
                cancelFocusRestore = pending
              }
            }
          : listener
      node.addEventListener(type, wrapped)
      cleanups.push(() => node.removeEventListener(type, wrapped))
    },
    reducedMotion() {
      return media.matches
    },
    finish() {
      controls.append(status)
      return {
        destroy() {
          cancelFocusRestore?.()
          for (const cleanup of cleanups) cleanup()
          media.removeEventListener("change", applyMotion)
          root.replaceChildren()
          root.classList.remove("steptrace", "steptrace--structure", "steptrace--reduced")
          delete root.dataset.visualFamily
          delete root.dataset.structure
        },
      }
    },
  }
}

export function createIndexedBoard(stage: HTMLElement, capacity: number, ariaLabel: string) {
  const board = el("div", "steptrace__contiguous-array")
  board.setAttribute("role", "list")
  board.setAttribute("aria-label", ariaLabel)
  stage.append(board)
  let cells: Array<{
    cell: HTMLElement
    index: HTMLElement
    value: HTMLElement
  }> = []

  function resize(nextCapacity: number) {
    board.style.setProperty("--steptrace-capacity", String(nextCapacity))
    board.replaceChildren()
    cells = Array.from({ length: nextCapacity }, (_, index) => {
      const cell = el("div", "steptrace__contiguous-cell")
      cell.setAttribute("role", "listitem")
      const value = el("span", "steptrace__contiguous-value")
      const indexLabel = el("span", "steptrace__contiguous-index")
      indexLabel.textContent = String(index)
      cell.append(value, indexLabel)
      board.append(cell)
      return { cell, index: indexLabel, value }
    })
  }

  function paint(states: readonly CellPaint[]) {
    if (states.length !== cells.length) resize(states.length)
    states.forEach((state, index) => {
      const target = cells[index]
      target.value.textContent = state.value ?? "·"
      target.index.textContent = state.label ?? String(index)
      target.cell.dataset.empty = state.value == null ? "1" : "0"
      target.cell.dataset.active = state.active ? "1" : "0"
      target.cell.dataset.changed = state.changed ? "1" : "0"
      target.cell.dataset.head = state.head ? "1" : "0"
      target.cell.dataset.tail = state.tail ? "1" : "0"
      target.cell.dataset.view = state.view ? "1" : "0"
      target.cell.setAttribute(
        "aria-label",
        state.ariaLabel ||
          `slot ${index}, ${state.value == null ? "empty" : `value ${state.value}`}`,
      )
    })
  }

  resize(capacity)
  return { paint, resize }
}

export function onEnter(shell: StructureShell, input: HTMLInputElement, action: () => void) {
  shell.listen(input, "keydown", ((event: KeyboardEvent) => {
    if (event.key !== "Enter") return
    event.preventDefault()
    action()
  }) as EventListener)
}
