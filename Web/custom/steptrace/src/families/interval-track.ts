import { el, makeLegend, statusEl } from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily, WatchRow } from "../types"

export interface IntervalToken {
  id: number
  start: number
  end: number
}

export interface IntervalTrackConfig {
  profile: "merge-intervals" | "activity-selection"
  intervals: IntervalToken[]
}

export type IntervalRelation = "overlap" | "contained" | "gap" | "compatible" | "conflict" | null

export interface IntervalTrackFrame {
  type:
    | "input"
    | "sort"
    | "seed"
    | "inspect"
    | "extend"
    | "emit"
    | "restart"
    | "accept"
    | "reject"
    | "done"
  profile: IntervalTrackConfig["profile"]
  intervals: IntervalToken[]
  order: number[]
  cursor: number | null
  active: number | null
  current: [number, number] | null
  output: Array<[number, number]>
  selected: number[]
  rejected: number[]
  relation: IntervalRelation
  message: string
}

export interface IntervalTrackOperations {
  begin(message: string): void
  sorted(order: number[], message: string): void
  seed(cursor: number, active: number, current: [number, number], message: string): void
  inspect(
    cursor: number,
    active: number,
    relation: Exclude<IntervalRelation, null>,
    message: string,
  ): void
  extend(current: [number, number], message: string): void
  emit(interval: [number, number], message: string): void
  restart(cursor: number, active: number, current: [number, number], message: string): void
  accept(cursor: number, active: number, interval: [number, number], message: string): void
  reject(cursor: number, active: number, message: string): void
  done(interval: [number, number], message: string): void
  finish(message: string): void
}

export function parseIntervalTokens(
  config: StepTraceConfig,
  defaults: Array<[number, number]>,
  algorithm: string,
) {
  const intervals = config.intervals ?? defaults
  if (!Array.isArray(intervals) || intervals.length === 0)
    throw new Error(`steptrace: ${algorithm} requires a non-empty "intervals" array.`)
  if (
    !intervals.every(
      (interval) =>
        Array.isArray(interval) &&
        interval.length === 2 &&
        interval.every(Number.isInteger) &&
        interval[0] <= interval[1],
    )
  )
    throw new Error(
      `steptrace: ${algorithm} requires integer [start, end] pairs with start <= end.`,
    )
  return intervals.map(([start, end], id): IntervalToken => ({ id, start, end }))
}

function copyInterval(interval: [number, number] | null): [number, number] | null {
  return interval ? [interval[0], interval[1]] : null
}

export class IntervalTrackRecorder implements IntervalTrackOperations {
  readonly frames: IntervalTrackFrame[] = []
  private order: number[]
  private cursor: number | null = null
  private active: number | null = null
  private current: [number, number] | null = null
  private output: Array<[number, number]> = []
  private selected: number[] = []
  private rejected: number[] = []
  private relation: IntervalRelation = null

  constructor(private readonly config: IntervalTrackConfig) {
    this.order = config.intervals.map((interval) => interval.id)
  }

  private push(type: IntervalTrackFrame["type"], message: string) {
    this.frames.push({
      type,
      profile: this.config.profile,
      intervals: this.config.intervals,
      order: this.order.slice(),
      cursor: this.cursor,
      active: this.active,
      current: copyInterval(this.current),
      output: this.output.map((interval) => [interval[0], interval[1]]),
      selected: this.selected.slice(),
      rejected: this.rejected.slice(),
      relation: this.relation,
      message,
    })
  }

  begin(message: string) {
    this.push("input", message)
  }

  sorted(order: number[], message: string) {
    this.order = order.slice()
    this.push("sort", message)
  }

  seed(cursor: number, active: number, current: [number, number], message: string) {
    this.cursor = cursor
    this.active = active
    this.current = copyInterval(current)
    this.relation = null
    this.push("seed", message)
  }

  inspect(
    cursor: number,
    active: number,
    relation: Exclude<IntervalRelation, null>,
    message: string,
  ) {
    this.cursor = cursor
    this.active = active
    this.relation = relation
    this.push("inspect", message)
  }

  extend(current: [number, number], message: string) {
    this.current = copyInterval(current)
    this.push("extend", message)
  }

  emit(interval: [number, number], message: string) {
    this.output.push(copyInterval(interval)!)
    this.push("emit", message)
  }

  restart(cursor: number, active: number, current: [number, number], message: string) {
    this.cursor = cursor
    this.active = active
    this.current = copyInterval(current)
    this.relation = null
    this.push("restart", message)
  }

  accept(cursor: number, active: number, interval: [number, number], message: string) {
    this.cursor = cursor
    this.active = active
    this.current = copyInterval(interval)
    this.output.push(copyInterval(interval)!)
    this.selected.push(active)
    this.relation = "compatible"
    this.push("accept", message)
  }

  reject(cursor: number, active: number, message: string) {
    this.cursor = cursor
    this.active = active
    this.rejected.push(active)
    this.relation = "conflict"
    this.push("reject", message)
  }

  done(interval: [number, number], message: string) {
    this.output.push(copyInterval(interval)!)
    this.current = null
    this.active = null
    this.cursor = null
    this.relation = null
    this.push("done", message)
  }

  finish(message: string) {
    this.active = null
    this.cursor = null
    this.relation = null
    this.push("done", message)
  }
}

function formatInterval(interval: [number, number] | null) {
  return interval ? `[${interval[0]}, ${interval[1]}]` : "—"
}

function formatRelation(relation: IntervalRelation) {
  if (relation === "contained") return "contained · keep end"
  if (relation === "overlap") return "overlap · extend"
  if (relation === "gap") return "gap · emit"
  if (relation === "compatible") return "compatible · accept"
  if (relation === "conflict") return "overlap · reject"
  return "—"
}

function intervalBand(className: string, start: number, end: number, minimum: number) {
  const band = el("div", className)
  band.style.setProperty("--_interval-start", String(start - minimum))
  band.style.setProperty("--_interval-span", String(end - start + 1))
  band.textContent = `${start}–${end}`
  band.title = `[${start}, ${end}]`
  band.setAttribute("aria-label", `Interval ${start} to ${end}`)
  return band
}

export function makeIntervalTrackView(
  frames: readonly IntervalTrackFrame[],
): StepTraceView<IntervalTrackFrame> {
  const first = frames[0]
  const minimum = Math.min(...first.intervals.map((interval) => interval.start))
  const maximum = Math.max(...first.intervals.map((interval) => interval.end))
  const columns = maximum - minimum + 1
  const scheduling = first.profile === "activity-selection"

  const root = el("div", "steptrace__interval-track")
  root.setAttribute("role", "region")
  root.setAttribute("aria-label", scheduling ? "Activity selection sweep" : "Merge intervals sweep")
  root.style.setProperty("--_interval-rows", String(first.intervals.length))
  root.style.setProperty("--_interval-columns", String(columns))

  const inputSection = el("section", "steptrace__interval-section")
  const inputLabel = el("div", "steptrace__rail-label steptrace__interval-label")
  const axis = el("div", "steptrace__interval-axis")
  for (let value = minimum; value <= maximum; value++) {
    if (value !== minimum && value !== maximum && (value - minimum) % 4 !== 0) continue
    const tick = el("span", "steptrace__interval-tick")
    tick.style.gridColumn = String(value - minimum + 1)
    tick.textContent = String(value)
    axis.append(tick)
  }
  const board = el("div", "steptrace__interval-board")
  const rows = new Map(
    first.intervals.map((interval) => {
      const row = el("div", "steptrace__interval-row")
      const band = intervalBand(
        "steptrace__interval-band steptrace__interval-band--source",
        interval.start,
        interval.end,
        minimum,
      )
      row.append(band)
      board.append(row)
      return [interval.id, { row, band }] as const
    }),
  )
  inputSection.append(inputLabel, axis, board)

  const currentSection = el("section", "steptrace__interval-section")
  const currentLabel = el("div", "steptrace__rail-label steptrace__interval-label")
  currentLabel.textContent = scheduling ? "Last accepted" : "Current block"
  const currentLane = el("div", "steptrace__interval-lane")
  const currentBand = el("div", "steptrace__interval-band steptrace__interval-band--current")
  currentBand.dataset.visible = "0"
  currentBand.setAttribute("aria-hidden", "true")
  currentLane.append(currentBand)
  currentSection.append(currentLabel, currentLane)

  const outputSection = el("section", "steptrace__interval-section")
  const outputLabel = el("div", "steptrace__rail-label steptrace__interval-label")
  outputLabel.textContent = scheduling ? "Accepted schedule" : "Merged output"
  const outputLane = el("div", "steptrace__interval-lane")
  const outputBands = first.intervals.map(() => {
    const band = el("div", "steptrace__interval-band steptrace__interval-band--output")
    band.dataset.visible = "0"
    band.setAttribute("aria-hidden", "true")
    outputLane.append(band)
    return band
  })
  outputSection.append(outputLabel, outputLane)

  const legendItems = scheduling
    ? ([
        ["next meeting", "candidate"],
        ["last accepted", "current"],
        ["accepted", "output"],
        ["rejected overlap", "rejected"],
      ] as const)
    : ([
        ["next interval", "candidate"],
        ["current merged block", "current"],
        ["emitted output", "output"],
      ] as const)
  const legend = makeLegend(
    legendItems.map(([label, state]) => ({
      label,
      swatchClass: `steptrace__interval-swatch steptrace__interval-swatch--${state}`,
    })),
    "Interval state legend",
    "steptrace__interval-legend",
  )

  root.append(inputSection, currentSection, outputSection)
  const status = statusEl()

  function positionBand(band: HTMLElement, interval: [number, number]) {
    band.style.setProperty("--_interval-start", String(interval[0] - minimum))
    band.style.setProperty("--_interval-span", String(interval[1] - interval[0] + 1))
    band.textContent = `${interval[0]}–${interval[1]}`
    band.title = formatInterval(interval)
    band.setAttribute("aria-label", `Interval ${interval[0]} to ${interval[1]}`)
  }

  function paint(frame: IntervalTrackFrame) {
    inputLabel.textContent =
      frame.type === "input"
        ? scheduling
          ? "Unsorted meetings"
          : "Input intervals"
        : scheduling
          ? "Finish-time order"
          : "Sorted intervals"
    const rowById = new Map(frame.order.map((id, index) => [id, index]))
    for (const interval of frame.intervals) {
      const view = rows.get(interval.id)!
      const rowIndex = rowById.get(interval.id)!
      view.row.style.setProperty("--_interval-row", String(rowIndex))
      const passed = frame.cursor != null && rowIndex < frame.cursor
      view.band.dataset.state = frame.selected.includes(interval.id)
        ? "accepted"
        : frame.rejected.includes(interval.id)
          ? "rejected"
          : interval.id === frame.active
            ? frame.relation === "gap" || frame.relation === "conflict"
              ? frame.relation
              : "candidate"
            : passed || frame.type === "done"
              ? "processed"
              : ""
    }

    currentBand.dataset.visible = frame.current ? "1" : "0"
    currentBand.setAttribute("aria-hidden", frame.current ? "false" : "true")
    if (frame.current) positionBand(currentBand, frame.current)

    outputBands.forEach((band, index) => {
      const interval = frame.output[index]
      band.dataset.visible = interval ? "1" : "0"
      band.setAttribute("aria-hidden", interval ? "false" : "true")
      if (interval) positionBand(band, interval)
    })

    root.dataset.frame = frame.type
    root.dataset.relation = frame.relation || ""
    status.textContent = frame.message
  }

  const watch = (frame: IntervalTrackFrame): WatchRow[] => {
    const active =
      frame.active == null ? null : frame.intervals.find((interval) => interval.id === frame.active)
    return scheduling
      ? [
          {
            k: "phase",
            v:
              frame.type === "input"
                ? "unsorted"
                : frame.type === "done"
                  ? "complete"
                  : frame.type === "sort"
                    ? "sort"
                    : "select",
            sw: "var(--_violet)",
          },
          {
            k: "next meeting",
            v: active ? `[${active.start}, ${active.end}]` : "—",
            sw: "var(--_amber)",
          },
          { k: "last accepted", v: formatInterval(frame.current), sw: "var(--_blue)" },
          {
            k: "decision",
            v: frame.type === "done" ? "complete" : formatRelation(frame.relation),
            hint: "Whether the current meeting is accepted or rejected.",
            sw:
              frame.relation === "conflict"
                ? "var(--_violet)"
                : frame.relation === "compatible"
                  ? "var(--_green)"
                  : "var(--_neutral)",
          },
        ]
      : [
          {
            k: "phase",
            v:
              frame.type === "input"
                ? "unsorted"
                : frame.type === "done"
                  ? "complete"
                  : frame.type === "sort"
                    ? "sort"
                    : "sweep",
            sw: "var(--_violet)",
          },
          {
            k: "next interval",
            v: active ? `[${active.start}, ${active.end}]` : "—",
            sw: "var(--_amber)",
          },
          { k: "current block", v: formatInterval(frame.current), sw: "var(--_blue)" },
          {
            k: "decision",
            v: frame.type === "done" ? "complete" : formatRelation(frame.relation),
            hint: "How the next interval changes the current merged block.",
            sw:
              frame.relation === "gap"
                ? "var(--_violet)"
                : frame.relation
                  ? "var(--_green)"
                  : "var(--_neutral)",
          },
        ]
  }

  return {
    nodes: [root, legend, status],
    stageAlignment: "center",
    stableStage: true,
    paint,
    watch,
    summary(frame) {
      const output = frame.output.map((interval) => formatInterval(interval)).join(", ")
      return scheduling
        ? `Accepted ${output} · ${frame.output.length} of ${frame.intervals.length} meetings.`
        : `Merged ${output} · ${frame.intervals.length} intervals → ${frame.output.length} blocks.`
    },
  }
}

export const intervalTrackFamily = {
  id: "interval-track",
  createRecorder(config) {
    return new IntervalTrackRecorder(config)
  },
  createView(frames) {
    return makeIntervalTrackView(frames)
  },
} satisfies VisualFamily<IntervalTrackConfig, IntervalTrackRecorder, IntervalTrackFrame>
