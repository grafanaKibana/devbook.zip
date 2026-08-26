import { el, ICON, makeArrayStrip, makeLegend, statusEl } from "../render"
import type { MountHandle, StepTraceView, VisualFamily, WatchRow } from "../types"
import { createStructureShell, onEnter } from "./interactive-structure"

export interface StackConfig {
  capacity: number
  values: string[]
}

function randomValue() {
  return String(Math.floor(Math.random() * 90) + 10)
}

export function mountStack(root: HTMLElement, config: StackConfig): MountHandle {
  const initial = config.values.slice()
  const values = initial.slice()
  const shell = createStructureShell(
    root,
    "stack",
    "stack",
    "Interactive last-in, first-out stack",
    "stack-sequence",
    "steptrace__stack",
  )
  const cells = Array.from({ length: config.capacity }, (_, index) => {
    const cell = el("div", "steptrace__contiguous-cell steptrace__stack-cell")
    cell.setAttribute("role", "listitem")
    const value = el("span", "steptrace__contiguous-value")
    const label = el("span", "steptrace__contiguous-index")
    const popGhost = el("span", "steptrace__stack-pop-ghost")
    popGhost.setAttribute("aria-hidden", "true")
    cell.append(value, label, popGhost)
    return { cell, value, label, popGhost, index }
  })
  const board = el("div", "steptrace__stack-board")
  board.setAttribute("role", "list")
  board.setAttribute("aria-label", `Vertical stack with capacity ${config.capacity}`)
  board.append(
    ...cells
      .slice()
      .reverse()
      .map(({ cell }) => cell),
  )
  shell.stage.append(board)

  const input = shell.input("Value to push", "Value")
  const push = shell.button("Push", true)
  const pop = shell.button("Pop")
  const peek = shell.button("Peek")
  const reset = shell.button("Reset")
  shell.controls.classList.add("steptrace__stack-controls")
  shell.controls.append(input, push, pop, peek, reset)

  let changedIndex: number | null = null
  let operation = ""
  let operationValue = ""

  function render(message: string) {
    cells.forEach(({ cell, value, label, popGhost, index }) => {
      const item = values[index]
      const isTop = index === values.length - 1
      value.textContent = item ?? "·"
      label.textContent = isTop ? `TOP · ${index}` : String(index)
      popGhost.textContent = index === changedIndex && operation === "pop" ? operationValue : ""
      cell.dataset.empty = item == null ? "1" : "0"
      cell.dataset.top = isTop ? "1" : "0"
      cell.dataset.changed = index === changedIndex ? "1" : "0"
      cell.dataset.operation = ""
      if (index === changedIndex && operation) {
        void cell.offsetWidth
        cell.dataset.operation = operation
      }
      cell.setAttribute(
        "aria-label",
        item == null
          ? `stack slot ${index}, empty`
          : `stack slot ${index}, value ${item}${isTop ? ", top" : ""}`,
      )
    })
    shell.setCounter(String(values.length), ` / ${config.capacity}`)
    push.disabled = values.length === config.capacity
    input.disabled = values.length === config.capacity
    shell.status.textContent = message
  }

  function onPush() {
    if (values.length === config.capacity) {
      shell.status.textContent = "Stack is full. Pop a value before pushing another."
      return
    }
    const value = input.value.trim() || randomValue()
    values.push(value)
    changedIndex = values.length - 1
    operation = "push"
    operationValue = value
    input.value = ""
    render(`Pushed ${value}. It is now the top value.`)
    input.focus?.()
  }

  function onPop() {
    if (!values.length) {
      changedIndex = null
      operation = ""
      render("Stack underflow: there is no top value to pop.")
      return
    }
    const index = values.length - 1
    const value = values.pop()
    changedIndex = index
    operation = "pop"
    operationValue = value ?? ""
    render(`Popped ${value}.`)
  }

  function onPeek() {
    if (!values.length) {
      changedIndex = null
      operation = ""
      render("Stack underflow: there is no top value to peek.")
      return
    }
    changedIndex = values.length - 1
    operation = "peek"
    operationValue = values.at(-1) ?? ""
    render(`Peeked ${values.at(-1)}. The stack did not change.`)
  }

  function onReset() {
    values.splice(0, values.length, ...initial)
    changedIndex = null
    operation = ""
    operationValue = ""
    input.value = ""
    render(`Stack reset to ${values.length} initial value${values.length === 1 ? "" : "s"}.`)
    input.focus?.()
  }

  shell.listen(push, "click", onPush)
  shell.listen(pop, "click", onPop)
  shell.listen(peek, "click", onPeek)
  shell.listen(reset, "click", onReset)
  onEnter(shell, input, onPush)
  render("Push a value to begin.")
  return shell.finish()
}

export interface StackSequenceConfig {
  profile: "next-greater"
  array: number[]
}

export type StackSequencePhase = "init" | "scan" | "pop" | "push" | "done"

export interface StackSequenceFrame {
  type: StackSequencePhase
  profile: StackSequenceConfig["profile"]
  array: number[]
  cursor: number | null
  stack: number[]
  popped: number | null
  answers: Array<number | null>
  pushes: number
  pops: number
  message: string
}

export interface StackSequenceOperations {
  init(message: string): void
  scan(index: number, message: string): void
  pop(answerIndex: number, message: string): void
  push(index: number, message: string): void
  done(message: string): void
}

export class StackSequenceRecorder implements StackSequenceOperations {
  readonly frames: StackSequenceFrame[] = []
  private cursor: number | null = null
  private stack: number[] = []
  private popped: number | null = null
  private answers: Array<number | null>
  private pushes = 0
  private pops = 0

  constructor(private readonly config: StackSequenceConfig) {
    this.answers = Array(config.array.length).fill(null)
  }

  init(message: string) {
    this.record("init", message)
  }

  scan(index: number, message: string) {
    this.cursor = index
    this.popped = null
    this.record("scan", message)
  }

  pop(answerIndex: number, message: string) {
    const popped = this.stack.pop()
    if (popped == null) throw new Error("steptrace: cannot pop an empty monotonic stack.")
    this.popped = popped
    this.answers[popped] = answerIndex
    this.pops++
    this.record("pop", message)
  }

  push(index: number, message: string) {
    this.stack.push(index)
    this.popped = null
    this.pushes++
    this.record("push", message)
  }

  done(message: string) {
    this.cursor = null
    this.popped = null
    this.record("done", message)
  }

  private record(type: StackSequencePhase, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        array: this.config.array,
        cursor: this.cursor,
        stack: this.stack.slice(),
        popped: this.popped,
        answers: this.answers.slice(),
        pushes: this.pushes,
        pops: this.pops,
        message,
      }),
    )
  }
}

function answerLabel(frame: StackSequenceFrame, index: number) {
  const answer = frame.answers[index]
  if (answer != null) return `→ ${frame.array[answer]}`
  return frame.type === "done" ? "→ none" : "waiting"
}

export function makeStackSequenceView(
  frames: readonly StackSequenceFrame[],
): StepTraceView<StackSequenceFrame> {
  const first = frames[0]
  const root = el("div", "steptrace__stack-sequence")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Next greater element monotonic stack")

  const scanSection = el("section", "steptrace__stack-sequence-section")
  const scanLabel = el("div", "steptrace__rail-label steptrace__stack-sequence-label")
  scanLabel.textContent = "Scan"
  const scan = makeArrayStrip(first.array)
  scan.wrap.classList.add("steptrace__stack-sequence-scan")
  scan.wrap.setAttribute("role", "list")
  scan.wrap.setAttribute("aria-label", "Input array")
  const scanCells = scan.cells.map((cell, index) => {
    cell.setAttribute("role", "listitem")
    const answer = el("span", "steptrace__stack-sequence-answer")
    const icon = el("span", "steptrace__stack-sequence-icon")
    icon.innerHTML = ICON.search
    icon.setAttribute("aria-hidden", "true")
    cell.append(answer, icon)
    return { cell, answer }
  })
  scanSection.append(scanLabel, scan.wrap)

  const stackSection = el("section", "steptrace__stack-sequence-section")
  const stackLabel = el("div", "steptrace__rail-label steptrace__stack-sequence-label")
  stackLabel.textContent = "MONOTONIC STACK"
  const stack = el("div", "steptrace__stack-sequence-stack")
  stack.setAttribute("role", "list")
  const stackCells = first.array.map(() => {
    const cell = el("div", "steptrace__stack-sequence-stack-cell")
    cell.setAttribute("role", "listitem")
    cell.setAttribute("aria-hidden", "true")
    stack.append(cell)
    return cell
  })
  stackSection.append(stackLabel, stack)
  root.append(scanSection, stackSection)

  const legend = makeLegend(
    [
      {
        label: "Scanning",
        swatchClass: "steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--scan",
      },
      {
        label: "Retained Candidate",
        swatchClass: "steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--retained",
      },
      {
        label: "Resolved Pop",
        swatchClass: "steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--popped",
      },
    ],
    "Stack sequence state legend",
    "steptrace__stack-sequence-legend",
  )

  const status = statusEl()

  function paint(frame: StackSequenceFrame) {
    const retained = new Set(frame.stack)
    scanCells.forEach(({ cell, answer }, index) => {
      cell.dataset.state =
        index === frame.popped
          ? "popped"
          : index === frame.cursor
            ? "scan"
            : retained.has(index)
              ? "retained"
              : frame.answers[index] != null
                ? "resolved"
                : ""
      cell.setAttribute("aria-current", index === frame.cursor ? "step" : "false")
      answer.textContent = answerLabel(frame, index)
      cell.setAttribute(
        "aria-label",
        `Index ${index}, value ${frame.array[index]}, ${answer.textContent}`,
      )
    })

    stackCells.forEach((cell, slot) => {
      const index = frame.stack[slot]
      const visible = index != null
      cell.textContent = visible ? `${frame.array[index]} · i${index}` : ""
      cell.dataset.visible = visible ? "1" : "0"
      cell.dataset.top = visible && slot === frame.stack.length - 1 ? "1" : "0"
      cell.setAttribute("aria-hidden", visible ? "false" : "true")
      if (visible)
        cell.setAttribute(
          "aria-label",
          `Stack position ${slot + 1}, index ${index}, value ${frame.array[index]}`,
        )
      else cell.removeAttribute("aria-label")
    })

    root.dataset.frame = frame.type
    status.textContent = frame.message
  }

  const watch = (frame: StackSequenceFrame): WatchRow[] => [
    {
      k: "scan",
      v: frame.cursor == null ? "complete" : `i${frame.cursor} · ${frame.array[frame.cursor]}`,
      sw: "var(--_blue)",
      hint: "Value currently compared with the stack top.",
    },
    {
      k: "stack",
      v: frame.stack.map((index) => frame.array[index]).join(" · ") || "empty",
      sw: "var(--_amber)",
      hint: "Unanswered values, decreasing from bottom to top.",
    },
    {
      k: "operation",
      v: frame.type === "pop" && frame.popped != null ? `pop i${frame.popped}` : frame.type,
      sw: frame.type === "pop" ? "var(--_violet)" : "var(--_green)",
    },
    {
      k: "charges",
      v: `${frame.pushes} push · ${frame.pops} pop`,
      sw: "var(--_neutral)",
      hint: "Every index is pushed once and popped at most once.",
    },
  ]

  return {
    nodes: [root, legend, status],
    stageLayout: "fill",
    stableStage: true,
    paint,
    watch,
    summary(frame) {
      const answers = frame.answers
        .map((answer) => (answer == null ? "none" : String(frame.array[answer])))
        .join(", ")
      return `Next greater values: [${answers}] · ${frame.pushes} pushes, ${frame.pops} pops.`
    },
  }
}

export const stackSequenceFamily = {
  id: "stack-sequence",
  createRecorder(config) {
    return new StackSequenceRecorder(config)
  },
  createView(frames) {
    return makeStackSequenceView(frames)
  },
} satisfies VisualFamily<StackSequenceConfig, StackSequenceRecorder, StackSequenceFrame>
