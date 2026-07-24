import { barHeightStyle, el, escapeHtml, makeBars, statusEl } from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily } from "../types"

export interface DistributionSortConfig {
  profile: "counting"
  array: number[]
  min: number
  max: number
}

export type DistributionPhase = "intro" | "tally" | "prefix" | "place" | "done"

export interface DistributionSortFrame {
  type: DistributionPhase
  profile: DistributionSortConfig["profile"]
  input: number[]
  min: number
  max: number
  counts: number[]
  positions: number[]
  output: Array<number | null>
  outputOrigins: Array<number | null>
  activeInput: number | null
  activeKey: number | null
  previousKey: number | null
  placedAt: number | null
  tallied: number
  prefixed: number
  placed: number
  message: string
}

export interface DistributionSortOperations {
  intro(message: string): void
  tally(inputIndex: number, message: string): void
  prefix(key: number, message: string): void
  place(inputIndex: number, message: string): void
  done(message: string): void
}

export class DistributionSortRecorder implements DistributionSortOperations {
  frames: DistributionSortFrame[] = []
  private readonly input: number[]
  private readonly min: number
  private readonly max: number
  private counts: number[]
  private positions: number[]
  private output: Array<number | null>
  private outputOrigins: Array<number | null>
  private activeInput: number | null = null
  private activeKey: number | null = null
  private previousKey: number | null = null
  private placedAt: number | null = null
  private tallied = 0
  private prefixed = 0
  private placed = 0

  constructor(config: DistributionSortConfig) {
    this.input = config.array.slice()
    this.min = config.min
    this.max = config.max
    this.counts = Array.from({ length: this.max - this.min + 1 }, () => 0)
    this.positions = this.counts.slice()
    this.output = Array.from({ length: this.input.length }, () => null)
    this.outputOrigins = Array.from({ length: this.input.length }, () => null)
  }

  intro(message: string) {
    this.push("intro", message)
  }

  tally(inputIndex: number, message: string) {
    const key = this.input[inputIndex]
    this.activeInput = inputIndex
    this.activeKey = key
    this.previousKey = null
    this.placedAt = null
    this.counts[key - this.min]++
    this.tallied++
    this.push("tally", message)
  }

  prefix(key: number, message: string) {
    const index = key - this.min
    this.activeInput = null
    this.activeKey = key
    this.previousKey = key === this.min ? null : key - 1
    this.placedAt = null
    if (this.prefixed === 0) this.positions = this.counts.slice()
    if (index > 0) this.positions[index] += this.positions[index - 1]
    this.prefixed++
    this.push("prefix", message)
  }

  place(inputIndex: number, message: string) {
    const key = this.input[inputIndex]
    const countIndex = key - this.min
    const target = --this.positions[countIndex]
    this.output[target] = key
    this.outputOrigins[target] = inputIndex
    this.activeInput = inputIndex
    this.activeKey = key
    this.previousKey = null
    this.placedAt = target
    this.placed++
    this.push("place", message)
  }

  done(message: string) {
    this.activeInput = null
    this.activeKey = null
    this.previousKey = null
    this.placedAt = null
    this.push("done", message)
  }

  private push(type: DistributionPhase, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: "counting" as const,
        input: this.input.slice(),
        min: this.min,
        max: this.max,
        counts: this.counts.slice(),
        positions: this.positions.slice(),
        output: this.output.slice(),
        outputOrigins: this.outputOrigins.slice(),
        activeInput: this.activeInput,
        activeKey: this.activeKey,
        previousKey: this.previousKey,
        placedAt: this.placedAt,
        tallied: this.tallied,
        prefixed: this.prefixed,
        placed: this.placed,
        message,
      }),
    )
  }
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: counting-sort ${message}`)
}

export function parseCountingSortConfig(config: StepTraceConfig): DistributionSortConfig {
  const { array } = config
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two integer keys.')
  if (!array.every((value) => Number.isInteger(value)))
    invalidConfig('requires every value to be an integer key.')

  const min = Math.min(...array)
  const max = Math.max(...array)
  if (max - min > 32)
    invalidConfig('limits the demonstrated key range to 33 values so every counter remains legible.')
  return { profile: "counting", array: array.slice(), min, max }
}

export function distributionTokenLabels(input: readonly number[]) {
  const totals = new Map<number, number>()
  input.forEach((value) => totals.set(value, (totals.get(value) || 0) + 1))
  const seen = new Map<number, number>()
  return input.map((value) => {
    const occurrence = (seen.get(value) || 0) + 1
    seen.set(value, occurrence)
    return totals.get(value) === 1 ? String(value) : `${value}${String.fromCharCode(96 + occurrence)}`
  })
}

export function distributionLabel(text: string, detail: string) {
  const heading = el("div", "steptrace__distribution-label")
  heading.textContent = text
  heading.title = detail
  return heading
}

export function makeDistributionArrayBand(
  title: string,
  detail: string,
  length: number,
  modifier = "",
) {
  const band = el("div", "steptrace__distribution-band")
  const stage = el(
    "div",
    `steptrace__stage steptrace__distribution-bars${modifier ? ` ${modifier}` : ""}`,
  )
  stage.setAttribute("role", "region")
  stage.setAttribute("aria-label", title)
  const bars = makeBars(stage, length)
  band.append(distributionLabel(title, detail), stage)
  return { band, stage, bars }
}

function phaseLabel(phase: DistributionPhase) {
  return phase === "intro" ? "set up" : phase === "done" ? "sorted" : phase
}

export function frequencyRangeFor(
  frame: DistributionSortFrame,
  index: number,
): { count: number; slots: string | null } {
  const count = frame.counts[index]
  const rangesVisible = frame.type === "prefix" ? index < frame.prefixed : frame.type === "place" || frame.type === "done"
  if (!rangesVisible) return { count, slots: null }
  if (count === 0) return { count, slots: "—" }
  const start = frame.counts.slice(0, index).reduce((sum, value) => sum + value, 0)
  const end = start + count - 1
  return { count, slots: start === end ? String(start) : `${start}–${end}` }
}

function distributionWatch(frame: DistributionSortFrame) {
  const active = frame.activeKey == null ? "—" : frame.activeKey
  return [
    { k: "phase", v: phaseLabel(frame.type), sw: "var(--_violet)" },
    { k: "key", v: active, sw: "var(--_blue)" },
    { k: "tallied", v: `${frame.tallied}/${frame.input.length}`, sw: "var(--_amber)" },
    { k: "placed", v: `${frame.placed}/${frame.input.length}`, sw: "var(--_green)" },
  ]
}

export function makeDistributionSortView(frames: readonly DistributionSortFrame[]) {
  const first = frames[0]
  const keys = Array.from({ length: first.max - first.min + 1 }, (_, index) => first.min + index)
  const labels = distributionTokenLabels(first.input)
  const stage = el("div", "steptrace__distribution")
  const input = makeDistributionArrayBand(
    "Unsorted Array",
    "Each bar keeps its original identity.",
    first.input.length,
  )
  const countBand = el("div", "steptrace__distribution-band")
  const frequency = el("div", "steptrace__distribution-frequency")
  frequency.setAttribute("role", "region")
  frequency.setAttribute("aria-label", "Frequency")
  const buckets = keys.map((key) => {
    const bucket = el("div", "steptrace__distribution-bucket")
    const keyRow = el("div", "steptrace__distribution-entry steptrace__distribution-entry--key")
    const keyLabel = el("span", "steptrace__distribution-entry-label")
    keyLabel.textContent = "Value:"
    const keyValue = el("strong", "steptrace__distribution-entry-value")
    keyValue.textContent = String(key)
    keyRow.append(keyLabel, keyValue)
    const details = el("div", "steptrace__distribution-details")
    const countRow = el("div", "steptrace__distribution-entry")
    const countLabel = el("span", "steptrace__distribution-entry-label")
    countLabel.textContent = "Count:"
    const count = el("strong", "steptrace__distribution-entry-value")
    countRow.append(countLabel, count)
    const slotsRow = el("div", "steptrace__distribution-entry steptrace__distribution-entry--slots")
    const slotsLabel = el("span", "steptrace__distribution-entry-label")
    slotsLabel.textContent = "Slots:"
    const slots = el("strong", "steptrace__distribution-entry-value")
    slotsRow.append(slotsLabel, slots)
    details.append(countRow, slotsRow)
    bucket.append(keyRow, details)
    frequency.append(bucket)
    return { bucket, count, slots, key }
  })
  countBand.append(
    distributionLabel("Frequency", "Raw counts become reserved output slots from left to right."),
    frequency,
  )
  const output = makeDistributionArrayBand(
    "Sorted Array",
    "The input is read right-to-left; each placement preserves duplicate order.",
    first.input.length,
    "steptrace__distribution-bars--output",
  )
  stage.append(input.band, countBand, output.band)
  const status = statusEl()
  const maxValue = Math.max(...first.input, 1)

  function paint(frame: DistributionSortFrame, index = 0, total = 1) {
    stage.dataset.phase = frame.type
    input.bars.forEach((bar, barIndex) => {
      const value = frame.input[barIndex]
      bar.fill.style.height = barHeightStyle(value, maxValue)
      bar.num.textContent = labels[barIndex]
      bar.bar.dataset.state =
        barIndex === frame.activeInput ? (frame.type === "tally" ? "increment" : "compare") : ""
      bar.bar.setAttribute("aria-label", `input index ${barIndex}, value ${value}, token ${labels[barIndex]}`)
    })
    buckets.forEach(({ bucket, count, slots, key }, bucketIndex) => {
      const range = frequencyRangeFor(frame, bucketIndex)
      count.textContent = String(range.count)
      slots.textContent = range.slots ?? ""
      bucket.dataset.hasSlots = range.slots == null ? "0" : "1"
      bucket.dataset.active =
        (frame.type === "tally" || frame.type === "prefix") && key === frame.activeKey ? "1" : "0"
      bucket.dataset.previous = frame.type === "prefix" && key === frame.previousKey ? "1" : "0"
      bucket.dataset.placement = frame.type === "place" && key === frame.activeKey ? "1" : "0"
      bucket.setAttribute(
        "aria-label",
        `value ${key}, count ${range.count}${range.slots == null ? "" : `, slots ${range.slots}`}`,
      )
    })
    output.bars.forEach((bar, slotIndex) => {
      const placed = frame.output[slotIndex]
      const origin = frame.outputOrigins[slotIndex]
      bar.fill.style.height = placed == null ? "0" : barHeightStyle(placed, maxValue)
      bar.num.textContent = placed == null ? "·" : labels[origin ?? 0]
      bar.bar.dataset.state = placed == null ? "" : "sorted"
      bar.bar.dataset.target = frame.type === "place" && slotIndex === frame.placedAt ? "1" : "0"
      bar.bar.dataset.empty = placed == null ? "1" : "0"
      bar.bar.setAttribute(
        "aria-label",
        placed == null
          ? `output index ${slotIndex}, empty`
          : `output index ${slotIndex}, value ${placed}, token ${labels[origin ?? 0]}`,
      )
    })
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· ${phaseLabel(frame.type)} · step ${index + 1}/${total}</span>`
  }

  return {
    nodes: [stage, status],
    stageLayout: "fill" as const,
    stableStage: true,
    paint,
    watch: distributionWatch,
  } satisfies StepTraceView<DistributionSortFrame>
}

export const distributionSortFamily = {
  id: "distribution-sort",
  createRecorder(config) {
    return new DistributionSortRecorder(config)
  },
  createView(frames) {
    return makeDistributionSortView(frames)
  },
} satisfies VisualFamily<DistributionSortConfig, DistributionSortRecorder, DistributionSortFrame>
