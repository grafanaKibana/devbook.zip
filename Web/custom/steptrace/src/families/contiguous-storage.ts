import { el } from "../render"
import type { MountHandle } from "../types"

export interface QueueConfig {
  capacity: number
}

export function mountQueue(root: HTMLElement, config: QueueConfig): MountHandle {
  const slots: Array<string | null> = Array(config.capacity).fill(null)
  let head = 0
  let tail = 0
  let count = 0

  root.classList.add("steptrace", "steptrace--structure")
  root.dataset.visualFamily = "contiguous-storage"
  root.setAttribute("role", "group")
  root.setAttribute("aria-label", "Interactive circular-array queue")

  const media = matchMedia("(prefers-reduced-motion: reduce)")
  const applyMotion = () => root.classList.toggle("steptrace--reduced", media.matches)
  media.addEventListener("change", applyMotion)

  const headEl = el("div", "steptrace__head")
  const crumb = el("div", "steptrace__crumb")
  const crumbKind = el("span")
  crumbKind.textContent = "data structure"
  const separator = el("span", "steptrace__crumb-sep")
  separator.textContent = "›"
  const name = el("span", "steptrace__crumb-algo")
  name.textContent = "queue"
  crumb.append(el("span", "steptrace__crumb-dot"), crumbKind, separator, name)
  const counter = el("div", "steptrace__counter")
  headEl.append(crumb, counter)

  const body = el("div", "steptrace__body steptrace__structure-body")
  const stage = el("div", "steptrace__contiguous")
  stage.setAttribute("role", "region")
  stage.setAttribute("aria-label", `Circular backing array with ${config.capacity} slots`)
  const stageLabel = el("div", "steptrace__rail-label")
  stageLabel.textContent = "Backing array"
  const array = el("div", "steptrace__contiguous-array")
  array.setAttribute("role", "list")
  array.style.setProperty("--steptrace-capacity", String(config.capacity))
  const cells = slots.map((_, index) => {
    const cell = el("div", "steptrace__contiguous-cell")
    cell.setAttribute("role", "listitem")
    const markers = el("div", "steptrace__contiguous-markers")
    const headBadge = el("span", "steptrace__contiguous-marker")
    headBadge.textContent = "H"
    headBadge.setAttribute("aria-label", "Head")
    headBadge.setAttribute("title", "Head")
    const tailBadge = el("span", "steptrace__contiguous-marker")
    tailBadge.textContent = "T"
    tailBadge.setAttribute("aria-label", "Tail")
    tailBadge.setAttribute("title", "Tail")
    markers.append(headBadge, tailBadge)
    const value = el("span", "steptrace__contiguous-value")
    const indexLabel = el("span", "steptrace__contiguous-index")
    indexLabel.textContent = String(index)
    cell.append(markers, value, indexLabel)
    array.append(cell)
    return { cell, headBadge, tailBadge, value }
  })
  const order = el("div", "steptrace__queue-order")
  const orderLabel = el("span", "steptrace__queue-order-label")
  orderLabel.textContent = "FIFO"
  const orderValue = el("span", "steptrace__queue-order-value")
  order.append(orderLabel, orderValue)
  stage.append(stageLabel, array, order)
  body.append(stage)

  const controls = el("div", "steptrace__structure-controls")
  const inputLabel = el("label", "steptrace__queue-input-label")
  inputLabel.textContent = "Value"
  const input = el("input", "steptrace__queue-input") as HTMLInputElement
  input.type = "text"
  input.maxLength = 12
  input.placeholder = "job-1"
  input.setAttribute("aria-label", "Value to enqueue")
  inputLabel.append(input)
  const enqueue = el("button", "steptrace__queue-action steptrace__queue-action--primary")
  enqueue.textContent = "Enqueue"
  const dequeue = el("button", "steptrace__queue-action")
  dequeue.textContent = "Dequeue"
  const reset = el("button", "steptrace__queue-action steptrace__queue-reset")
  reset.textContent = "Reset"
  for (const button of [enqueue, dequeue, reset]) (button as HTMLButtonElement).type = "button"
  const status = el("div", "steptrace__queue-status")
  status.setAttribute("role", "status")
  status.setAttribute("aria-live", "polite")
  status.setAttribute("aria-atomic", "true")
  controls.append(inputLabel, enqueue, dequeue, reset, status)
  root.replaceChildren(headEl, body, controls)

  function render(message = "") {
    cells.forEach(({ cell, headBadge, tailBadge, value }, index) => {
      const slotValue = slots[index]
      value.textContent = slotValue ?? "·"
      cell.dataset.empty = slotValue == null ? "1" : "0"
      cell.dataset.head = index === head ? "1" : "0"
      cell.dataset.tail = index === tail ? "1" : "0"
      headBadge.hidden = index !== head
      tailBadge.hidden = index !== tail
      const markerNames = [index === head ? "head" : "", index === tail ? "tail" : ""].filter(
        Boolean,
      )
      cell.setAttribute(
        "aria-label",
        `slot ${index}, ${slotValue == null ? "empty" : `value ${slotValue}`}${
          markerNames.length ? `, ${markerNames.join(" and ")}` : ""
        }`,
      )
    })
    counter.innerHTML = `<b>${count}</b> / ${config.capacity}`
    const fifo = Array.from(
      { length: count },
      (_, offset) => slots[(head + offset) % config.capacity],
    )
    orderValue.textContent = fifo.length ? fifo.join(" → ") : "empty"
    enqueue.disabled = count === config.capacity
    dequeue.disabled = count === 0
    input.disabled = count === config.capacity
    status.textContent =
      message || (count === 0 ? "Queue is empty. Enqueue a value to begin." : "Queue ready.")
  }

  function onEnqueue() {
    const value = input.value.trim()
    if (!value) {
      status.textContent = "Enter a value before enqueueing."
      return
    }
    if (count === config.capacity) {
      status.textContent = "Queue is full. Dequeue an item before enqueueing another."
      return
    }
    const index = tail
    slots[index] = value
    tail = (tail + 1) % config.capacity
    count++
    input.value = ""
    render(`Enqueued ${value} at slot ${index}. Tail advanced to slot ${tail}.`)
    input.focus?.()
  }

  function onDequeue() {
    if (count === 0) {
      status.textContent = "Queue is empty. There is nothing to dequeue."
      return
    }
    const index = head
    const value = slots[index]
    slots[index] = null
    head = (head + 1) % config.capacity
    count--
    render(`Dequeued ${value} from slot ${index}. Head advanced to slot ${head}.`)
  }

  function onReset() {
    slots.fill(null)
    head = 0
    tail = 0
    count = 0
    input.value = ""
    render("Queue reset. Head and tail returned to slot 0.")
    input.focus?.()
  }

  function onInputKeydown(event: KeyboardEvent) {
    if (event.key !== "Enter") return
    event.preventDefault()
    onEnqueue()
  }

  enqueue.addEventListener("click", onEnqueue)
  dequeue.addEventListener("click", onDequeue)
  reset.addEventListener("click", onReset)
  input.addEventListener("keydown", onInputKeydown)
  applyMotion()
  render()

  return {
    destroy() {
      enqueue.removeEventListener("click", onEnqueue)
      dequeue.removeEventListener("click", onDequeue)
      reset.removeEventListener("click", onReset)
      input.removeEventListener("keydown", onInputKeydown)
      media.removeEventListener("change", applyMotion)
      root.replaceChildren()
      root.classList.remove("steptrace", "steptrace--structure", "steptrace--reduced")
      delete root.dataset.visualFamily
    },
  }
}
