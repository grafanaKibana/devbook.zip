import { barHeightStyle, el, makeBars, statusEl } from "../render"
import type { StepTraceView, VisualFamily } from "../types"

export interface RunSpan {
  start: number
  length: number
}

export interface RunStackConfig {
  array: number[]
  minrun: number
  profile: "tim-sort"
}

export type RunStackPhase =
  | "init"
  | "detect"
  | "reverse"
  | "extend"
  | "insert"
  | "push"
  | "check"
  | "merge"
  | "force-merge"
  | "done"

export interface RunStackFrame {
  type: RunStackPhase
  profile: RunStackConfig["profile"]
  array: number[]
  stack: RunSpan[]
  current: RunSpan | null
  direction: "ascending" | "descending" | null
  processed: number
  minrun: number
  insertion: { source: number; target: number; sortedEnd: number } | null
  mergeIndex: number | null
  invariant: { x: number | null; y: number | null; z: number | null; holds: boolean | null } | null
  merges: number
  message: string
}

export interface RunStackOperations {
  init(message: string): void
  detect(run: RunSpan, direction: "ascending" | "descending", message: string): void
  reverse(run: RunSpan, message: string): void
  extend(run: RunSpan, message: string): void
  insert(run: RunSpan, source: number, target: number, sortedEnd: number, message: string): void
  push(run: RunSpan, message: string): void
  check(message: string): void
  merge(index: number, forced: boolean, message: string): void
  done(message: string): void
}

export class RunStackRecorder implements RunStackOperations {
  frames: RunStackFrame[] = []
  private array: number[]
  private stack: RunSpan[] = []
  private current: RunSpan | null = null
  private direction: RunStackFrame["direction"] = null
  private processed = 0
  private insertion: RunStackFrame["insertion"] = null
  private mergeIndex: number | null = null
  private invariant: RunStackFrame["invariant"] = null
  private merges = 0

  constructor(private readonly config: RunStackConfig) {
    this.array = config.array.slice()
  }

  get value() {
    return this.array.slice()
  }

  init(message: string) {
    this.pushFrame("init", message)
  }

  detect(run: RunSpan, direction: "ascending" | "descending", message: string) {
    this.current = { ...run }
    this.direction = direction
    this.insertion = null
    this.mergeIndex = null
    this.invariant = null
    this.pushFrame("detect", message)
  }

  reverse(run: RunSpan, message: string) {
    this.array.splice(run.start, run.length, ...this.array.slice(run.start, run.start + run.length).reverse())
    this.current = { ...run }
    this.pushFrame("reverse", message)
  }

  extend(run: RunSpan, message: string) {
    this.current = { ...run }
    this.insertion = null
    this.pushFrame("extend", message)
  }

  insert(run: RunSpan, source: number, target: number, sortedEnd: number, message: string) {
    const value = this.array[source]
    for (let index = source; index > target; index--) this.array[index] = this.array[index - 1]
    this.array[target] = value
    this.current = { ...run }
    this.insertion = { source, target, sortedEnd }
    this.pushFrame("insert", message)
  }

  push(run: RunSpan, message: string) {
    this.stack.push({ ...run })
    this.current = { ...run }
    this.direction = null
    this.insertion = null
    this.processed = run.start + run.length
    this.mergeIndex = null
    this.invariant = null
    this.pushFrame("push", message)
  }

  check(message: string) {
    const x = this.stack.at(-1)?.length ?? null
    const y = this.stack.at(-2)?.length ?? null
    const z = this.stack.at(-3)?.length ?? null
    this.current = null
    this.insertion = null
    this.mergeIndex = null
    this.invariant = {
      x,
      y,
      z,
      holds: x == null || y == null ? null : (y > x && (z == null || z > y + x)),
    }
    this.pushFrame("check", message)
  }

  merge(index: number, forced: boolean, message: string) {
    const left = this.stack[index]
    const right = this.stack[index + 1]
    if (!left || !right || left.start + left.length !== right.start)
      throw new Error("steptrace: tim-sort can only merge adjacent run spans.")
    const leftValues = this.array.slice(left.start, left.start + left.length)
    const rightValues = this.array.slice(right.start, right.start + right.length)
    const merged: number[] = []
    let i = 0
    let j = 0
    while (i < leftValues.length && j < rightValues.length) {
      if (leftValues[i] <= rightValues[j]) merged.push(leftValues[i++])
      else merged.push(rightValues[j++])
    }
    merged.push(...leftValues.slice(i), ...rightValues.slice(j))
    this.array.splice(left.start, merged.length, ...merged)
    this.stack.splice(index, 2, { start: left.start, length: left.length + right.length })
    this.current = this.stack[index]
    this.insertion = null
    this.mergeIndex = index
    this.invariant = null
    this.merges++
    this.pushFrame(forced ? "force-merge" : "merge", message)
  }

  done(message: string) {
    this.current = null
    this.direction = null
    this.insertion = null
    this.mergeIndex = null
    this.invariant = null
    this.pushFrame("done", message)
  }

  private pushFrame(type: RunStackPhase, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        array: this.array.slice(),
        stack: this.stack.map((run) => Object.freeze({ ...run })),
        current: this.current ? Object.freeze({ ...this.current }) : null,
        direction: this.direction,
        processed: this.processed,
        minrun: this.config.minrun,
        insertion: this.insertion ? Object.freeze({ ...this.insertion }) : null,
        mergeIndex: this.mergeIndex,
        invariant: this.invariant ? Object.freeze({ ...this.invariant }) : null,
        merges: this.merges,
        message,
      }),
    )
  }
}

function runLabel(run: RunSpan) {
  return `[${run.start}…${run.start + run.length - 1}] · ${run.length}`
}

function stackRunFor(frame: RunStackFrame, index: number) {
  return frame.stack[index] || null
}

function runAt(frame: RunStackFrame, index: number) {
  return frame.stack.findIndex((run) => run.start <= index && index < run.start + run.length)
}

export function runStackWatch(frame: RunStackFrame) {
  const top = frame.stack.at(-1)
  return [
    {
      k: "phase",
      v: frame.type.replace("-", " "),
      sw: "var(--_violet)",
      hint: "What Tim sort is doing in this frame.",
    },
    {
      k: "run",
      v: frame.current ? runLabel(frame.current) : "—",
      sw: "var(--_blue)",
      hint: "Array span currently detected, extended, or merged.",
    },
    {
      k: "stack",
      v: frame.stack.map((run) => run.length).join(" · ") || "empty",
      sw: "var(--_amber)",
      hint: "Saved contiguous run lengths, from stack bottom to top.",
    },
    {
      k: "top",
      v: top ? runLabel(top) : "—",
      sw: "var(--_green)",
      hint: "Newest run at the top of the stack.",
    },
  ]
}

export function makeRunStackView(frames: readonly RunStackFrame[]): StepTraceView<RunStackFrame> {
  const length = frames[0].array.length
  const root = el("div", "steptrace__run-stack")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Tim sort run stack")
  const arrayLabel = el("div", "steptrace__rail-label steptrace__run-stack-label")
  arrayLabel.textContent = "Array runs"
  const arraySection = el("div", "steptrace__run-array-section")
  const arrayBars = el("div", "steptrace__stage steptrace__run-bars")
  const bars = makeBars(arrayBars, length)
  const stackLabel = el("div", "steptrace__rail-label steptrace__run-stack-label")
  stackLabel.textContent = "Run stack · top"
  const stackSection = el("div", "steptrace__run-stack-section")
  const stack = el("div", "steptrace__run-stack-cards")
  const stackCards = Array.from({ length }, () => {
    const card = el("div", "steptrace__run-stack-card")
    const title = el("div", "steptrace__run-stack-title")
    const values = el("div", "steptrace__run-stack-values")
    card.append(title, values)
    card.hidden = true
    stack.append(card)
    return { card, title, values }
  })
  const invariant = el("div", "steptrace__run-invariant")
  arraySection.append(arrayLabel, arrayBars)
  stackSection.append(stackLabel, stack, invariant)
  root.append(arraySection, stackSection)
  const status = statusEl()
  const maxValue = Math.max(...frames[0].array, 1)
  let previousStack: readonly RunSpan[] = []

  function paint(frame: RunStackFrame) {
    for (let index = 0; index < length; index++) {
      const bar = bars[index]
      const runIndex = runAt(frame, index)
      bar.fill.style.height = barHeightStyle(frame.array[index], maxValue)
      bar.num.textContent = String(frame.array[index])
      if (runIndex >= 0) bar.bar.dataset.run = String(runIndex % 4)
      else delete bar.bar.dataset.run
      bar.bar.dataset.processed = index < frame.processed ? "1" : "0"
      const isSorted = frame.type === "done"
      const isCurrent =
        !isSorted &&
        frame.current != null &&
        index >= frame.current.start &&
        index < frame.current.start + frame.current.length
      const isInsert = !isSorted && frame.insertion?.target === index
      bar.bar.dataset.current =
        isCurrent ? "1" : "0"
      bar.bar.dataset.insert = isInsert ? "1" : "0"
      bar.bar.dataset.motion = frame.type === "insert" && isInsert ? "insert" : ""
      bar.bar.dataset.state = isSorted ? "sorted" : isInsert ? "candidate" : isCurrent ? "compare" : ""
      bar.bar.setAttribute(
        "aria-label",
        `Index ${index}, value ${frame.array[index]}${runIndex >= 0 ? `, run ${runIndex + 1}` : ""}`,
      )
    }
    for (let cardIndex = 0; cardIndex < stackCards.length; cardIndex++) {
      const card = stackCards[cardIndex]
      const run = stackRunFor(frame, frame.stack.length - cardIndex - 1)
      if (!run) {
        card.card.hidden = true
        continue
      }
      const stackIndex = frame.stack.length - cardIndex - 1
      card.card.hidden = false
      card.title.textContent = `R${stackIndex + 1} ${runLabel(run)}`
      card.values.textContent = `[${frame.array.slice(run.start, run.start + run.length).join(", ")}]`
      card.card.dataset.active = frame.current?.start === run.start ? "1" : "0"
      card.card.dataset.merged =
        frame.mergeIndex != null && (stackIndex === frame.mergeIndex || stackIndex === frame.mergeIndex + 1)
          ? "1"
          : "0"
      card.card.dataset.run = String(stackIndex % 4)
      const previous = previousStack[stackIndex]
      card.card.dataset.motion =
        frame.type === "push" && stackIndex === frame.stack.length - 1
          ? "push"
          : frame.type === "check"
            ? "check"
            : frame.type === "merge" || frame.type === "force-merge"
              ? "merge"
              : previous?.start !== run.start || previous?.length !== run.length
                ? "reflow"
                : ""
    }
    const check = frame.invariant
    invariant.textContent = check
      ? `X=${check.x ?? "—"}, Y=${check.y ?? "—"}, Z=${check.z ?? "—"}${check.holds == null ? "" : check.holds ? " · holds" : " · merge"}`
      : frame.type === "force-merge"
        ? "Final collapse: merge adjacent runs until one remains."
        : `minrun ${frame.minrun} · ${frame.merges} merge${frame.merges === 1 ? "" : "s"}`
    invariant.dataset.state = check?.holds === false ? "merge" : check?.holds ? "holds" : ""
    status.textContent = frame.message
    previousStack = frame.stack
  }

  return {
    nodes: [root, status],
    stageLayout: "fill",
    stableStage: true,
    paint,
    watch: runStackWatch,
  }
}

export const runStackFamily = {
  id: "run-stack",
  createRecorder(config) {
    return new RunStackRecorder(config)
  },
  createView(frames) {
    return makeRunStackView(frames)
  },
} satisfies VisualFamily<RunStackConfig, RunStackRecorder, RunStackFrame>
