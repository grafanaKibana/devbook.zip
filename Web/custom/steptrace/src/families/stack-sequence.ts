import { el, ICON, makeLegend, statusEl } from "../render"
import type { StepTraceView, VisualFamily, WatchRow } from "../types"

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
  root.style.setProperty("--_stack-sequence-size", String(first.array.length))

  const scanSection = el("section", "steptrace__stack-sequence-section")
  const scanLabel = el("div", "steptrace__rail-label steptrace__stack-sequence-label")
  scanLabel.textContent = "Scan"
  const scan = el("div", "steptrace__stack-sequence-scan")
  scan.setAttribute("role", "list")
  const scanCells = first.array.map((value, index) => {
    const cell = el("div", "steptrace__stack-sequence-cell")
    cell.setAttribute("role", "listitem")
    const position = el("span", "steptrace__stack-sequence-index")
    position.textContent = `i${index}`
    const number = el("strong", "steptrace__stack-sequence-value")
    number.textContent = String(value)
    const answer = el("span", "steptrace__stack-sequence-answer")
    const icon = el("span", "steptrace__stack-sequence-icon")
    icon.innerHTML = ICON.search
    icon.setAttribute("aria-hidden", "true")
    cell.append(position, number, answer, icon)
    scan.append(cell)
    return { cell, answer }
  })
  scanSection.append(scanLabel, scan)

  const stackSection = el("section", "steptrace__stack-sequence-section")
  const stackLabel = el("div", "steptrace__rail-label steptrace__stack-sequence-label")
  stackLabel.textContent = "Monotonic stack · bottom → top"
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
        label: "scanning",
        swatchClass: "steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--scan",
      },
      {
        label: "retained candidate",
        swatchClass: "steptrace__stack-sequence-swatch steptrace__stack-sequence-swatch--retained",
      },
      {
        label: "resolved pop",
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
