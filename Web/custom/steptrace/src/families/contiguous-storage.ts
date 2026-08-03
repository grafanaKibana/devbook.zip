import type { MountHandle } from "../types"
import { createIndexedBoard, createStructureShell, onEnter } from "./interactive-structure"

export interface QueueConfig {
  capacity: number
}

export interface ArrayConfig {
  capacity: number
  values: string[]
}

export interface CircularBufferConfig {
  capacity: number
}

export interface DequeConfig {
  capacity: number
}

export interface DynamicArrayConfig {
  capacity: number
  values: string[]
}

export interface SpanConfig {
  values: string[]
  start: number
  length: number
}

export function ringOrder(head: number, count: number, capacity: number) {
  return Array.from({ length: count }, (_, offset) => (head + offset) % capacity)
}

function randomValue() {
  return String(Math.floor(Math.random() * 90) + 10)
}

function numericIndex(input: HTMLInputElement, limit: number) {
  if (!input.value.trim()) return null
  const index = Number(input.value)
  return Number.isInteger(index) && index >= 0 && index < limit ? index : null
}

export function mountQueue(root: HTMLElement, config: QueueConfig): MountHandle {
  const slots: Array<string | null> = Array(config.capacity).fill(null)
  let head = 0
  let tail = 0
  let count = 0
  const shell = createStructureShell(root, "queue", "queue", "Interactive circular-array queue")
  const board = createIndexedBoard(
    shell.stage,
    config.capacity,
    `Circular backing array with ${config.capacity} slots`,
  )
  const input = shell.input("Value to enqueue", "Value")
  input.classList.add("steptrace__queue-input")
  const enqueue = shell.button("Enqueue", true)
  enqueue.classList.add("steptrace__queue-action", "steptrace__queue-action--primary")
  const dequeue = shell.button("Dequeue")
  dequeue.classList.add("steptrace__queue-action")
  const reset = shell.button("Reset")
  reset.classList.add("steptrace__queue-action", "steptrace__queue-reset")
  shell.status.classList.add("steptrace__queue-status")
  shell.controls.append(input, enqueue, dequeue, reset)

  function render(message = "") {
    board.paint(
      slots.map((value, index) => {
        const isHead = index === head
        const isTail = index === tail
        const markers = [isHead ? "head" : "", isTail ? "tail" : ""].filter(Boolean)
        return {
          value,
          head: isHead,
          tail: isTail,
          label:
            isHead && isTail ? "HEAD / TAIL" : isHead ? "HEAD" : isTail ? "TAIL" : String(index),
          ariaLabel: `slot ${index}, ${value == null ? "empty" : `value ${value}`}${
            markers.length ? `, ${markers.join(" and ")}` : ""
          }`,
        }
      }),
    )
    shell.setCounter(String(count), ` / ${config.capacity}`)
    enqueue.disabled = count === config.capacity
    dequeue.disabled = count === 0
    input.disabled = count === config.capacity
    shell.status.textContent =
      message || (count === 0 ? "Queue is empty. Enqueue a value to begin." : "Queue ready.")
  }

  function onEnqueue() {
    if (count === config.capacity) {
      shell.status.textContent = "Queue is full. Dequeue an item before enqueueing another."
      return
    }
    const value = input.value.trim() || randomValue()
    const index = tail
    slots[index] = value
    tail = (tail + 1) % config.capacity
    count++
    input.value = ""
    render(`Enqueued ${value} at slot ${index}. Tail advanced to slot ${tail}.`)
    input.focus?.()
  }

  function onDequeue() {
    if (!count) return
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

  shell.listen(enqueue, "click", onEnqueue)
  shell.listen(dequeue, "click", onDequeue)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onEnqueue)
  render()
  return shell.finish()
}

export function mountArray(root: HTMLElement, config: ArrayConfig): MountHandle {
  const initial = [...config.values, ...Array(config.capacity).fill(null)].slice(0, config.capacity)
  const slots: Array<string | null> = initial.slice()
  let changed: number[] = []
  const shell = createStructureShell(root, "arrays", "arrays", "Interactive fixed-size array")
  const board = createIndexedBoard(shell.stage, config.capacity, "Fixed contiguous array")
  const indexInput = shell.input("Array index", "Index", 2)
  const valueInput = shell.input("Value to write", "Value")
  const read = shell.button("Read")
  const write = shell.button("Write", true)
  const reset = shell.button("Reset")
  shell.controls.append(indexInput, valueInput, read, write, reset)

  function render(message = "") {
    board.paint(
      slots.map((value, index) => ({
        value,
        changed: changed.includes(index),
        ariaLabel: `index ${index}, address 0x${(0x1000 + index * 4).toString(16)}, ${
          value == null ? "empty" : `value ${value}`
        }`,
      })),
    )
    shell.setCounter(String(config.capacity), " fixed slots")
    shell.status.textContent = message || "Read or replace one value by its fixed index."
  }

  function onRead() {
    const index = numericIndex(indexInput, config.capacity)
    if (index == null) {
      shell.status.textContent = `Enter an index from 0 to ${config.capacity - 1}.`
      return
    }
    changed = [index]
    render(
      `Read array[${index}] at address 0x${(0x1000 + index * 4).toString(16)}: ${
        slots[index] ?? "empty"
      }.`,
    )
  }

  function onWrite() {
    const index = numericIndex(indexInput, config.capacity)
    if (index == null) {
      shell.status.textContent = `Enter an index from 0 to ${config.capacity - 1}.`
      return
    }
    const value = valueInput.value.trim() || randomValue()
    const previous = slots[index]
    slots[index] = value
    changed = [index]
    valueInput.value = ""
    render(
      previous == null
        ? `Wrote ${value} to empty array[${index}].`
        : `Replaced array[${index}] value ${previous} with ${value}.`,
    )
  }

  function onReset() {
    slots.splice(0, slots.length, ...initial)
    changed = []
    render("Array reset to its initial fixed-capacity values.")
  }

  shell.listen(read, "click", onRead)
  shell.listen(write, "click", onWrite)
  shell.listen(reset, "click", onReset)
  onEnter(shell, valueInput, onWrite)
  render()
  return shell.finish()
}

export function mountCircularBuffer(root: HTMLElement, config: CircularBufferConfig): MountHandle {
  const slots: Array<string | null> = Array(config.capacity).fill(null)
  let head = 0
  let count = 0
  const shell = createStructureShell(
    root,
    "circular-buffer",
    "circular buffer",
    "Interactive overwrite-oldest circular buffer",
  )
  const board = createIndexedBoard(shell.stage, config.capacity, "Circular buffer slots")
  const input = shell.input("Value to write", "Value")
  const write = shell.button("Write", true)
  const read = shell.button("Read oldest")
  const reset = shell.button("Reset")
  shell.controls.append(input, write, read, reset)

  function render(message = "") {
    const order = ringOrder(head, count, config.capacity)
    const writeIndex = (head + count) % config.capacity
    board.paint(
      slots.map((value, index) => {
        const isHead = count > 0 && index === head
        const isWrite = index === writeIndex
        return {
          value,
          active: order.includes(index),
          head: isHead,
          tail: isWrite,
          label:
            isHead && isWrite
              ? "OLDEST / WRITE"
              : isHead
                ? "OLDEST"
                : isWrite
                  ? "WRITE"
                  : String(index),
          ariaLabel: `slot ${index}, ${value == null ? "empty" : `value ${value}`}${
            isHead ? ", oldest" : ""
          }${isWrite ? ", next write" : ""}`,
        }
      }),
    )
    shell.setCounter(String(count), ` / ${config.capacity}`)
    read.disabled = count === 0
    shell.status.textContent =
      message || (count ? "The oldest value is read first." : "Write a value to begin.")
  }

  function onWrite() {
    const value = input.value.trim() || randomValue()
    const full = count === config.capacity
    const index = full ? head : (head + count) % config.capacity
    const overwritten = slots[index]
    slots[index] = value
    if (full) head = (head + 1) % config.capacity
    else count++
    input.value = ""
    render(
      full
        ? `Wrote ${value} at slot ${index}; overwrote oldest value ${overwritten} and advanced oldest.`
        : `Wrote ${value} at slot ${index}.`,
    )
  }

  function onRead() {
    if (!count) return
    const index = head
    const value = slots[index]
    slots[index] = null
    head = (head + 1) % config.capacity
    count--
    render(`Read oldest value ${value} from slot ${index}.`)
  }

  function onReset() {
    slots.fill(null)
    head = 0
    count = 0
    input.value = ""
    render("Circular buffer reset.")
  }

  shell.listen(write, "click", onWrite)
  shell.listen(read, "click", onRead)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onWrite)
  render()
  return shell.finish()
}

export function mountDeque(root: HTMLElement, config: DequeConfig): MountHandle {
  const maxCapacity = config.capacity * 2
  let capacity = config.capacity
  let slots: Array<string | null> = Array(capacity).fill(null)
  let head = 0
  let count = 0
  const shell = createStructureShell(
    root,
    "deque",
    "deque",
    "Interactive double-ended circular deque",
  )
  const board = createIndexedBoard(shell.stage, capacity, "Deque circular backing array")
  const input = shell.input("Value to push", "Value")
  const pushFront = shell.button("Push front", true)
  const pushBack = shell.button("Push back", true)
  const popFront = shell.button("Pop front")
  const popBack = shell.button("Pop back")
  const reset = shell.button("Reset")
  shell.controls.append(input, pushFront, pushBack, popFront, popBack, reset)

  function grow() {
    if (capacity === maxCapacity) return false
    const nextCapacity = capacity * 2
    const next: Array<string | null> = Array(nextCapacity).fill(null)
    ringOrder(head, count, capacity).forEach((index, offset) => {
      next[offset] = slots[index]
    })
    slots = next
    head = 0
    capacity = nextCapacity
    board.resize(capacity)
    return true
  }

  function render(message = "") {
    const order = ringOrder(head, count, capacity)
    const back = count ? order.at(-1) : -1
    board.paint(
      slots.map((value, index) => {
        const isFront = count > 0 && index === head
        const isBack = count > 0 && index === back
        return {
          value,
          active: order.includes(index),
          head: isFront,
          tail: isBack,
          label:
            isFront && isBack
              ? "FRONT / BACK"
              : isFront
                ? "FRONT"
                : isBack
                  ? "BACK"
                  : String(index),
          ariaLabel: `slot ${index}, ${value == null ? "empty" : `value ${value}`}${
            isFront ? ", front" : ""
          }${isBack ? ", back" : ""}`,
        }
      }),
    )
    shell.setCounter(String(count), ` / ${capacity}`)
    popFront.disabled = count === 0
    popBack.disabled = count === 0
    pushFront.disabled = count === maxCapacity
    pushBack.disabled = count === maxCapacity
    input.disabled = count === maxCapacity
    shell.status.textContent = message || (count ? "Push or pop at either end." : "Deque is empty.")
  }

  function value() {
    const next = input.value.trim() || randomValue()
    input.value = ""
    return next
  }

  function onPushFront() {
    const grew = count === capacity && grow()
    if (count === capacity) return
    head = (head - 1 + capacity) % capacity
    slots[head] = value()
    count++
    render(
      `Pushed ${slots[head]} at the front${grew ? ` after growing and relinearizing to ${capacity} slots` : ""}.`,
    )
  }

  function onPushBack() {
    const grew = count === capacity
    if (grew && !grow()) return
    const index = (head + count) % capacity
    slots[index] = value()
    count++
    render(
      `Pushed ${slots[index]} at the back${grew ? ` after growing and relinearizing to ${capacity} slots` : ""}.`,
    )
  }

  function onPopFront() {
    if (!count) return
    const index = head
    const removed = slots[index]
    slots[index] = null
    head = (head + 1) % capacity
    count--
    render(`Popped ${removed} from the front.`)
  }

  function onPopBack() {
    if (!count) return
    const index = (head + count - 1) % capacity
    const removed = slots[index]
    slots[index] = null
    count--
    render(`Popped ${removed} from the back.`)
  }

  function onReset() {
    capacity = config.capacity
    slots = Array(capacity).fill(null)
    head = 0
    count = 0
    board.resize(capacity)
    input.value = ""
    render("Deque reset.")
  }

  shell.listen(pushFront, "click", onPushFront)
  shell.listen(pushBack, "click", onPushBack)
  shell.listen(popFront, "click", onPopFront)
  shell.listen(popBack, "click", onPopBack)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onPushBack)
  render()
  return shell.finish()
}

export function mountDynamicArray(root: HTMLElement, config: DynamicArrayConfig): MountHandle {
  const maxCapacity = config.capacity * 2
  const initial = config.values.slice()
  let capacity = Math.max(config.capacity, initial.length)
  const values = initial.slice()
  const shell = createStructureShell(
    root,
    "dynamic-array",
    "dynamic array",
    "Interactive geometrically growing dynamic array",
  )
  const board = createIndexedBoard(shell.stage, capacity, "Dynamic array backing storage")
  const input = shell.input("Value to append", "Value")
  const append = shell.button("Append", true)
  const remove = shell.button("Remove last")
  const reset = shell.button("Reset")
  shell.controls.append(input, append, remove, reset)

  function render(message = "") {
    board.paint(
      Array.from({ length: capacity }, (_, index) => ({
        value: values[index] ?? null,
        active: index < values.length,
        ariaLabel: `index ${index}, ${index < values.length ? `value ${values[index]}` : "unused capacity"}`,
      })),
    )
    shell.setCounter(String(values.length), ` / ${capacity} capacity`)
    remove.disabled = values.length === 0
    append.disabled = values.length === maxCapacity
    input.disabled = values.length === maxCapacity
    shell.status.textContent =
      message || "Append in constant time until capacity is exhausted, then grow and copy."
  }

  function onAppend() {
    if (values.length === maxCapacity) return
    const value = input.value.trim() || randomValue()
    const grew = values.length === capacity
    if (grew) {
      capacity *= 2
      board.resize(capacity)
    }
    values.push(value)
    input.value = ""
    render(
      grew
        ? `Capacity exhausted: allocated ${capacity} slots, copied ${values.length - 1} values, then appended ${value}.`
        : `Appended ${value} at index ${values.length - 1}.`,
    )
  }

  function onRemove() {
    if (!values.length) return
    const removed = values.pop()
    render(`Removed last value ${removed}; capacity remains ${capacity}.`)
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    capacity = Math.max(config.capacity, initial.length)
    board.resize(capacity)
    input.value = ""
    render("Dynamic array reset.")
  }

  shell.listen(append, "click", onAppend)
  shell.listen(remove, "click", onRemove)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onAppend)
  render()
  return shell.finish()
}

export function mountSpan(root: HTMLElement, config: SpanConfig): MountHandle {
  const initial = config.values.slice()
  const values = initial.slice()
  let start = config.start
  let length = config.length
  const shell = createStructureShell(
    root,
    "span",
    "span",
    "Interactive span view over shared backing storage",
  )
  const board = createIndexedBoard(shell.stage, values.length, "Backing array with span overlay")
  const startInput = shell.input("Span start index", "Start", 2)
  const lengthInput = shell.input("Span length", "Length", 2)
  const offsetInput = shell.input("Span write offset", "Offset", 2)
  const valueInput = shell.input("Value to write through span", "Value")
  const slice = shell.button("Slice", true)
  const write = shell.button("Write", true)
  const reset = shell.button("Reset")
  shell.controls.append(startInput, lengthInput, slice, offsetInput, valueInput, write, reset)

  function render(message = "") {
    board.paint(
      values.map((value, index) => {
        const inView = index >= start && index < start + length
        return {
          value,
          view: inView,
          label: inView ? `SPAN ${index - start}` : String(index),
          ariaLabel: `backing index ${index}, value ${value}${inView ? `, span offset ${index - start}` : ""}`,
        }
      }),
    )
    shell.setCounter(`[${start}..${start + length})`, " view")
    shell.status.textContent =
      message || "The highlighted span aliases the same backing cells; writes are visible in both."
  }

  function onSlice() {
    const nextStart = numericIndex(startInput, values.length)
    const nextLength = Number(lengthInput.value)
    if (
      nextStart == null ||
      !Number.isInteger(nextLength) ||
      nextLength < 1 ||
      nextStart + nextLength > values.length
    ) {
      shell.status.textContent = `Choose a start and length inside the ${values.length}-cell backing array.`
      return
    }
    start = nextStart
    length = nextLength
    render(`Created span view backing[${start}..${start + length}); no values were copied.`)
  }

  function onWrite() {
    const offset = numericIndex(offsetInput, length)
    if (offset == null) {
      shell.status.textContent = `Enter a span offset from 0 to ${length - 1}.`
      return
    }
    const value = valueInput.value.trim() || randomValue()
    const backingIndex = start + offset
    values[backingIndex] = value
    valueInput.value = ""
    render(`span[${offset}] wrote ${value} through to backing[${backingIndex}].`)
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    start = config.start
    length = config.length
    for (const input of [startInput, lengthInput, offsetInput, valueInput]) input.value = ""
    render("Backing array and span view reset.")
  }

  shell.listen(slice, "click", onSlice)
  shell.listen(write, "click", onWrite)
  shell.listen(reset, "click", onReset)
  onEnter(shell, valueInput, onWrite)
  render()
  return shell.finish()
}
