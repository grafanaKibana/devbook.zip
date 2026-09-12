import { el, makeArrayStrip, makeLegend, statusEl } from "../render"
import type { StepTraceView, VisualFamily, WatchRow } from "../types"

export interface PrefixSumConfig {
  profile: "range-sum"
  array: number[]
  range: [number, number]
}

export type PrefixSumPhase =
  "init" | "add" | "write" | "query" | "right" | "left" | "subtract" | "done"

export interface PrefixSumFrame {
  type: PrefixSumPhase
  profile: PrefixSumConfig["profile"]
  array: number[]
  prefix: Array<number | null>
  range: [number, number]
  cursor: number | null
  running: number
  leftPrefix: number | null
  rightPrefix: number | null
  result: number | null
  message: string
}

export interface PrefixSumOperations {
  init(message: string): void
  add(index: number, message: string): void
  write(index: number, message: string): void
  query(message: string): void
  takeRight(message: string): void
  takeLeft(message: string): void
  subtract(message: string): void
  done(message: string): void
}

export class PrefixSumRecorder implements PrefixSumOperations {
  readonly frames: PrefixSumFrame[] = []
  private readonly prefix: Array<number | null>
  private cursor: number | null = null
  private running = 0
  private leftPrefix: number | null = null
  private rightPrefix: number | null = null
  private result: number | null = null

  constructor(private readonly config: PrefixSumConfig) {
    this.prefix = [0, ...Array(config.array.length).fill(null)]
  }

  init(message: string) {
    this.record("init", message)
  }

  add(index: number, message: string) {
    this.cursor = index
    this.running += this.config.array[index]
    this.record("add", message)
  }

  write(index: number, message: string) {
    this.prefix[index + 1] = this.running
    this.record("write", message)
  }

  query(message: string) {
    this.cursor = null
    this.record("query", message)
  }

  takeRight(message: string) {
    this.rightPrefix = this.prefix[this.config.range[1] + 1]
    this.record("right", message)
  }

  takeLeft(message: string) {
    this.leftPrefix = this.prefix[this.config.range[0]]
    this.record("left", message)
  }

  subtract(message: string) {
    this.result = this.rightPrefix! - this.leftPrefix!
    this.record("subtract", message)
  }

  done(message: string) {
    this.record("done", message)
  }

  private record(type: PrefixSumPhase, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.config.profile,
        array: this.config.array,
        prefix: this.prefix.slice(),
        range: this.config.range,
        cursor: this.cursor,
        running: this.running,
        leftPrefix: this.leftPrefix,
        rightPrefix: this.rightPrefix,
        result: this.result,
        message,
      }),
    )
  }
}

function arrayStrip(values: readonly unknown[], label: string) {
  const { wrap, cells } = makeArrayStrip(values)
  wrap.classList.add("steptrace__prefix-sum-strip")
  wrap.setAttribute("role", "list")
  wrap.setAttribute("aria-label", label)
  cells.forEach((cell) => {
    cell.setAttribute("role", "listitem")
  })
  return { wrap, cells }
}

export function makePrefixSumView(
  frames: readonly PrefixSumFrame[],
): StepTraceView<PrefixSumFrame> {
  const first = frames[0]
  const root = el("div", "steptrace__prefix-sum")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", "Prefix sum construction and range query")

  const sourceSection = el("section", "steptrace__prefix-sum-section")
  const sourceLabel = el("div", "steptrace__rail-label")
  sourceLabel.textContent = "Daily sales"
  const source = arrayStrip(first.array, "Daily sales array")
  sourceSection.append(sourceLabel, source.wrap)

  const prefixSection = el("section", "steptrace__prefix-sum-section")
  const prefixLabel = el("div", "steptrace__rail-label")
  prefixLabel.textContent = "Prefix totals"
  const prefix = arrayStrip(first.prefix, "Prefix sum array")
  prefixSection.append(prefixLabel, prefix.wrap)
  root.append(sourceSection, prefixSection)

  const legend = makeLegend(
    [
      {
        label: "Running Total",
        swatchClass: "steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--build",
      },
      {
        label: "Cancelled Prefix",
        swatchClass: "steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--cancel",
      },
      {
        label: "Requested Range",
        swatchClass: "steptrace__prefix-sum-swatch steptrace__prefix-sum-swatch--range",
      },
    ],
    "Prefix sum state legend",
    "steptrace__prefix-sum-legend",
  )
  const status = statusEl()

  function paint(frame: PrefixSumFrame) {
    const [left, right] = frame.range
    source.cells.forEach((cell, index) => {
      cell.textContent = String(frame.array[index])
      cell.dataset.state =
        frame.cursor === index
          ? "build"
          : ["query", "right", "left", "subtract", "done"].includes(frame.type)
            ? index < left
              ? "cancel"
              : index <= right
                ? "range"
                : ""
            : ""
      cell.setAttribute("aria-label", `source index ${index}, value ${frame.array[index]}`)
    })

    prefix.cells.forEach((cell, index) => {
      const value = frame.prefix[index]
      cell.textContent = value == null ? "·" : String(value)
      cell.dataset.empty = value == null ? "1" : "0"
      cell.dataset.state =
        index === right + 1 && ["right", "left", "subtract", "done"].includes(frame.type)
          ? "range"
          : index === left && ["left", "subtract", "done"].includes(frame.type)
            ? "cancel"
            : frame.cursor != null && index === frame.cursor + 1
              ? "build"
              : ""
      cell.setAttribute(
        "aria-label",
        `prefix index ${index}, ${value == null ? "not written" : `value ${value}`}`,
      )
    })

    status.textContent = frame.message
  }

  const watch = (frame: PrefixSumFrame): WatchRow[] => [
    { k: "phase", v: frame.type, sw: "var(--_violet)" },
    {
      k: "source",
      v: frame.cursor == null ? "—" : `a[${frame.cursor}] = ${frame.array[frame.cursor]}`,
      sw: "var(--_blue)",
    },
    { k: "running", v: frame.running, sw: "var(--_amber)" },
    {
      k: "query",
      v: frame.result == null ? `[${frame.range[0]}, ${frame.range[1]}]` : frame.result,
      sw: "var(--_green)",
    },
  ]

  return {
    nodes: [root, legend, status],
    stageLayout: "fill",
    stableStage: true,
    paint,
    watch,
    summary(frame) {
      return frame.result == null
        ? `Built ${frame.prefix.filter((value) => value != null).length}/${frame.prefix.length} prefix totals.`
        : `Range [${frame.range[0]}, ${frame.range[1]}] sums to ${frame.result}.`
    },
  }
}

export const prefixSumFamily = {
  id: "prefix-sum",
  createRecorder(config) {
    return new PrefixSumRecorder(config)
  },
  createView(frames) {
    return makePrefixSumView(frames)
  },
} satisfies VisualFamily<PrefixSumConfig, PrefixSumRecorder, PrefixSumFrame>
