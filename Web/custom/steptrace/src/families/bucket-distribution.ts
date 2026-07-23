import { barHeightStyle, el, escapeHtml, statusEl } from "../render"
import type { StepTraceConfig, StepTraceView, VisualFamily, WatchRow } from "../types"
import {
  distributionLabel,
  distributionTokenLabels,
  makeDistributionArrayBand,
} from "./distribution-sort"

export interface DistributionToken {
  value: number
  origin: number
}

interface BucketDistributionBaseConfig {
  array: number[]
  bucketCount: number
  bucketLabels: string[]
}

export interface RadixDistributionConfig extends BucketDistributionBaseConfig {
  profile: "radix"
  radix: number
  places: number[]
}

export interface RangeBucketDistributionConfig extends BucketDistributionBaseConfig {
  profile: "bucket"
}

export type BucketDistributionConfig =
  | RadixDistributionConfig
  | RangeBucketDistributionConfig

export type BucketDistributionPhase =
  | "intro"
  | "pass"
  | "scatter"
  | "local-sort"
  | "compare"
  | "swap"
  | "gather"
  | "pass-complete"
  | "done"

export interface BucketDistributionFrame {
  type: BucketDistributionPhase
  profile: BucketDistributionConfig["profile"]
  source: DistributionToken[]
  buckets: DistributionToken[][]
  output: Array<DistributionToken | null>
  bucketLabels: string[]
  activeSource: number | null
  activeBucket: number | null
  activeBucketItems: [number, number] | null
  activeOutput: number | null
  passIndex: number
  passCount: number
  passLabel: string
  scattered: number
  comparisons: number
  movements: number
  gathered: number
  message: string
}

export interface BucketDistributionOperations {
  intro(message: string): void
  beginPass(passIndex: number, passCount: number, passLabel: string, message: string): void
  scatter(sourceIndex: number, bucketIndex: number, message: string): void
  beginLocalSort(bucketIndex: number, message: string): void
  compareBucket(bucketIndex: number, left: number, right: number, message: string): void
  swapBucket(bucketIndex: number, left: number, right: number, message: string): void
  beginGather(message: string): void
  gather(bucketIndex: number, itemIndex: number, message: string): void
  finishPass(message: string): void
  done(message: string): void
}

export function parseRangeBucketDistributionConfig(
  config: StepTraceConfig,
): RangeBucketDistributionConfig {
  const array = parseArray(config.array, "bucket-sort")
  const bucketCount = parseBucketCount(config.bucketCount ?? 5, "bucket-sort")
  return {
    profile: "bucket",
    array,
    bucketCount,
    bucketLabels: makeRangeLabels(array, bucketCount),
  }
}

export function parseRadixDistributionConfig(config: StepTraceConfig): RadixDistributionConfig {
  const array = parseArray(config.array, "radix-sort")
  const radix = parseRadix(config.radix ?? 10)
  const bucketCount = parseBucketCount(config.bucketCount ?? radix, "radix-sort")
  const mode = config.mode
  if (mode != null && mode !== "LSD")
    throw new Error('steptrace: radix-sort supports only mode "LSD" for now.')
  const max = Math.max(...array)
  if (max < 0) throw new Error("steptrace: radix-sort currently supports only non-negative keys.")
  const places = Math.max(1, Math.floor(Math.log(Math.max(max, 1)) / Math.log(radix)) + 1)
  const placesIndexes = Array.from({ length: places }, (_, index) => index)
  return {
    profile: "radix",
    array,
    bucketCount: radix,
    radix,
    places: placesIndexes,
    bucketLabels: makeRadixLabels(radix),
  }
}

function parseArray(values: unknown, algorithm: string) {
  if (!Array.isArray(values) || values.length < 2)
    throw new Error(`steptrace: ${algorithm} requires an "array" with at least two keys.`)
  if (!values.every((value) => Number.isInteger(value)))
    throw new Error(`steptrace: ${algorithm} requires every value to be an integer key.`)
  return values.slice() as number[]
}

function parseBucketCount(value: unknown, algorithm: string) {
  const count = Number(value)
  if (!Number.isInteger(count) || count < 2 || count > 24)
    throw new Error(`steptrace: ${algorithm} requires bucketCount between 2 and 24.`)
  return count
}

function parseRadix(value: unknown) {
  const radix = Number(value)
  if (!Number.isInteger(radix) || radix < 2 || radix > 36)
    throw new Error('steptrace: radix-sort requires an integer radix between 2 and 36.')
  return radix
}

function makeRangeLabels(values: number[], bucketCount: number) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return Array.from({ length: bucketCount }, () => `[${min.toFixed(2)}, ${min.toFixed(2)}]`)
  const width = (max - min) / bucketCount
  return Array.from({ length: bucketCount }, (_, index) => {
    const left = min + index * width
    const right = left + width
    return `${index === bucketCount - 1 ? "[" : "["}${left.toFixed(2)}, ${right.toFixed(2)}${
      index === bucketCount - 1 ? "]" : ")"
    }`
  })
}

function makeRadixLabels(radix: number) {
  return Array.from({ length: radix }, (_, index) => String(index))
}

export class BucketDistributionRecorder implements BucketDistributionOperations {
  frames: BucketDistributionFrame[] = []
  private readonly profile: BucketDistributionConfig["profile"]
  private readonly bucketLabels: string[]
  private source: DistributionToken[]
  private buckets: DistributionToken[][]
  private output: Array<DistributionToken | null>
  private activeSource: number | null = null
  private activeBucket: number | null = null
  private activeBucketItems: [number, number] | null = null
  private activeOutput: number | null = null
  private passIndex = 0
  private passCount = 1
  private passLabel = ""
  private scattered = 0
  private comparisons = 0
  private movements = 0
  private gathered = 0

  constructor(config: BucketDistributionConfig) {
    this.profile = config.profile
    this.bucketLabels = config.bucketLabels.slice()
    this.source = config.array.map((value, origin) => ({ value, origin }))
    this.buckets = Array.from({ length: config.bucketCount }, () => [])
    this.output = Array.from({ length: config.array.length }, () => null)
  }

  intro(message: string) {
    this.push("intro", message)
  }

  beginPass(passIndex: number, passCount: number, passLabel: string, message: string) {
    this.passIndex = passIndex
    this.passCount = passCount
    this.passLabel = passLabel
    this.buckets = this.buckets.map(() => [])
    this.output = this.output.map(() => null)
    this.scattered = 0
    this.gathered = 0
    this.clearActive()
    this.push("pass", message)
  }

  scatter(sourceIndex: number, bucketIndex: number, message: string) {
    this.assertSourceIndex(sourceIndex)
    this.assertBucketIndex(bucketIndex)
    this.buckets[bucketIndex].push(this.source[sourceIndex])
    this.activeSource = sourceIndex
    this.activeBucket = bucketIndex
    this.activeBucketItems = [this.buckets[bucketIndex].length - 1, this.buckets[bucketIndex].length - 1]
    this.activeOutput = null
    this.scattered++
    this.push("scatter", message)
  }

  beginLocalSort(bucketIndex: number, message: string) {
    this.assertBucketIndex(bucketIndex)
    this.activeSource = null
    this.activeBucket = bucketIndex
    this.activeBucketItems = null
    this.activeOutput = null
    this.push("local-sort", message)
  }

  compareBucket(bucketIndex: number, left: number, right: number, message: string) {
    this.assertBucketItems(bucketIndex, left, right)
    this.activeSource = null
    this.activeBucket = bucketIndex
    this.activeBucketItems = [left, right]
    this.activeOutput = null
    this.comparisons++
    this.push("compare", message)
  }

  swapBucket(bucketIndex: number, left: number, right: number, message: string) {
    this.assertBucketItems(bucketIndex, left, right)
    const bucket = this.buckets[bucketIndex]
    ;[bucket[left], bucket[right]] = [bucket[right], bucket[left]]
    this.activeSource = null
    this.activeBucket = bucketIndex
    this.activeBucketItems = [left, right]
    this.activeOutput = null
    this.movements++
    this.push("swap", message)
  }

  beginGather(message: string) {
    this.activeSource = null
    this.activeBucket = null
    this.activeBucketItems = null
    this.activeOutput = null
    this.push("gather", message)
  }

  gather(bucketIndex: number, itemIndex: number, message: string) {
    this.assertBucketItems(bucketIndex, itemIndex)
    const target = this.gathered
    this.output[target] = this.buckets[bucketIndex][itemIndex]
    this.activeSource = null
    this.activeBucket = bucketIndex
    this.activeBucketItems = [itemIndex, itemIndex]
    this.activeOutput = target
    this.gathered++
    this.push("gather", message)
  }

  finishPass(message: string) {
    if (this.output.some((token) => token == null))
      throw new Error("steptrace: distribution pass cannot finish before every key is gathered.")
    this.source = this.output.map((token) => token as DistributionToken)
    this.clearActive()
    this.push("pass-complete", message)
  }

  done(message: string) {
    this.clearActive()
    this.push("done", message)
  }

  private clearActive() {
    this.activeSource = null
    this.activeBucket = null
    this.activeBucketItems = null
    this.activeOutput = null
  }

  private assertSourceIndex(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= this.source.length)
      throw new Error(`steptrace: distribution source index ${index} is out of range.`)
  }

  private assertBucketIndex(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= this.buckets.length)
      throw new Error(`steptrace: distribution bucket index ${index} is out of range.`)
  }

  private assertBucketItems(bucketIndex: number, ...indices: number[]) {
    this.assertBucketIndex(bucketIndex)
    const bucket = this.buckets[bucketIndex]
    if (indices.some((index) => !Number.isInteger(index) || index < 0 || index >= bucket.length))
      throw new Error(`steptrace: distribution bucket item is out of range.`)
  }

  private push(type: BucketDistributionPhase, message: string) {
    this.frames.push(
      Object.freeze({
        type,
        profile: this.profile,
        source: this.source.map((token) => ({ ...token })),
        buckets: this.buckets.map((bucket) => bucket.map((token) => ({ ...token }))),
        output: this.output.map((token) => (token == null ? null : { ...token })),
        bucketLabels: this.bucketLabels.slice(),
        activeSource: this.activeSource,
        activeBucket: this.activeBucket,
        activeBucketItems:
          this.activeBucketItems == null
            ? null
            : ([this.activeBucketItems[0], this.activeBucketItems[1]] as [number, number]),
        activeOutput: this.activeOutput,
        passIndex: this.passIndex,
        passCount: this.passCount,
        passLabel: this.passLabel,
        scattered: this.scattered,
        comparisons: this.comparisons,
        movements: this.movements,
        gathered: this.gathered,
        message,
      }),
    )
  }
}

function phaseLabel(frame: BucketDistributionFrame) {
  switch (frame.type) {
    case "intro":
      return "set up"
    case "pass":
      return "new pass"
    case "scatter":
      return "scatter"
    case "local-sort":
    case "compare":
    case "swap":
      return "sort bucket"
    case "gather":
      return "gather"
    case "pass-complete":
      return "pass complete"
    case "done":
      return "sorted"
  }
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: distribution-sort ${message}`)
}

function ensureIntegerArray(array: unknown, label: string) {
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig(`requires a non-empty "${label}" array.`)
  if (!array.every((value) => Number.isInteger(value)))
    invalidConfig(`requires every "${label}" entry to be an integer.`)
}

function radixBucketLabels(radix: number) {
  return Array.from({ length: radix }, (_, index) => String(index))
}

function rangeBucketLabels(bucketCount: number, min: number, max: number) {
  const width = (max - min) / bucketCount
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = min + index * width
    const end = index === bucketCount - 1 ? max : min + (index + 1) * width
    return `[${start.toFixed(1)}, ${end.toFixed(1)}${index === bucketCount - 1 ? "]" : ")"}`
  })
}

export function parseRadixDistributionConfig(config: StepTraceConfig): RadixDistributionConfig {
  ensureIntegerArray(config.array, "array")
  const radix = Number(config.radix ?? 10)
  if (!Number.isInteger(radix) || radix < 2 || radix > 16)
    invalidConfig('requires a "radix" integer from 2 to 16.')
  const max = Math.max(...config.array)
  const places: number[] = []
  for (let place = 1; place <= max; place *= radix) places.push(place)
  return {
    profile: "radix",
    array: config.array.slice(),
    bucketCount: radix,
    bucketLabels: radixBucketLabels(radix),
    radix,
    places,
  }
}

export function parseRangeBucketDistributionConfig(
  config: StepTraceConfig,
): RangeBucketDistributionConfig {
  if (!Array.isArray(config.array) || config.array.length < 2)
    invalidConfig('requires a non-empty "array" with at least two keys.')
  if (!config.array.every((value) => Number.isFinite(value as number)))
    invalidConfig('requires every "array" entry to be a finite number.')
  const bucketCount = Number(config.bucketCount ?? 5)
  if (!Number.isInteger(bucketCount) || bucketCount < 2 || bucketCount > 16)
    invalidConfig('requires a "bucketCount" integer from 2 to 16.')
  const min = Math.min(...config.array)
  const max = Math.max(...config.array)
  if (!(min >= 0 && max < 1))
    invalidConfig('demonstrates bucket sort on values in the half-open range [0, 1).')
  return {
    profile: "bucket",
    array: config.array.slice(),
    bucketCount,
    bucketLabels: rangeBucketLabels(bucketCount, 0, 1),
  }
}

function distributionWatch(frame: BucketDistributionFrame): WatchRow[] {
  const activeToken =
    frame.activeSource == null ? null : frame.source[frame.activeSource]
  const bucket =
    frame.activeBucket == null ? "—" : frame.bucketLabels[frame.activeBucket]
  const progress =
    frame.type === "gather" || frame.type === "pass-complete" || frame.type === "done"
      ? `${frame.gathered}/${frame.source.length}`
      : `${frame.scattered}/${frame.source.length}`
  return [
    {
      k: "phase",
      v: phaseLabel(frame),
      sw: "var(--_violet)",
      hint: "Current distribution step: scatter, local bucket sort, or ordered gather.",
    },
    {
      k: "pass",
      v: frame.passLabel || `${frame.passIndex + 1}/${frame.passCount}`,
      sw: "var(--_blue)",
      hint:
        frame.profile === "radix"
          ? "Digit position currently used to distribute every key."
          : "The single range-partition pass used by Bucket Sort.",
    },
    {
      k: "key",
      v: activeToken?.value ?? "—",
      sw: "var(--_amber)",
      hint: "Input key currently being scattered or moved.",
    },
    {
      k: "bucket",
      v: bucket,
      sw: "var(--_green)",
      hint:
        frame.profile === "radix"
          ? "Digit bucket selected by the active key."
          : "Numeric range containing the active key.",
    },
    {
      k: "progress",
      v: progress,
      hint: "Keys completed in the current scatter or gather phase.",
    },
  ]
}

function tokenLabel(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function makeLegendItem(color: string, text: string) {
  const item = el("span", "steptrace__distribution-legend-item")
  const swatch = el("span", "steptrace__distribution-legend-swatch")
  swatch.style.setProperty("--_legend-color", color)
  const label = el("span")
  label.textContent = text
  item.append(swatch, label)
  return item
}

export function makeBucketDistributionView(frames: readonly BucketDistributionFrame[]) {
  const first = frames[0]
  const original = first.source.slice().sort((a, b) => a.origin - b.origin)
  const labels = distributionTokenLabels(original.map((token) => token.value))
  const maxValue = Math.max(...original.map((token) => token.value), 1)
  const stage = el("div", "steptrace__distribution steptrace__distribution--buckets")
  const sourceTitle = first.profile === "radix" ? "Current Array" : "Unsorted Array"
  const source = makeDistributionArrayBand(
    sourceTitle,
    first.profile === "radix"
      ? "Each digit pass starts from the order gathered by the previous pass."
      : "Values keep their identity while range decides their bucket.",
    first.source.length,
  )
  const bucketBand = el("div", "steptrace__distribution-band")
  const board = el("div", "steptrace__distribution-bucket-board")
  board.setAttribute("role", "region")
  board.setAttribute(
    "aria-label",
    first.profile === "radix" ? "Digit Buckets" : "Range Buckets",
  )
  const lanes = first.bucketLabels.map((bucketLabel, bucketIndex) => {
    const lane = el("div", "steptrace__distribution-lane")
    const header = el("div", "steptrace__distribution-lane-header")
    header.textContent = bucketLabel
    const body = el("div", "steptrace__distribution-lane-body")
    lane.append(header, body)
    board.append(lane)
    return { lane, body, bucketIndex }
  })
  bucketBand.append(
    distributionLabel(
      first.profile === "radix" ? "Digit Buckets" : "Range Buckets",
      first.profile === "radix"
        ? "Keys append in source order, preserving lower-digit work."
        : "Each range is sorted locally before the buckets are concatenated.",
    ),
    board,
  )
  const output = makeDistributionArrayBand(
    first.profile === "radix" ? "Gathered Pass" : "Sorted Array",
    "Buckets are read left to right; order inside each bucket is retained.",
    first.source.length,
    "steptrace__distribution-bars--output",
  )
  const legend = el("div", "steptrace__distribution-legend")
  legend.setAttribute("aria-label", "Distribution state legend")
  legend.append(
    makeLegendItem("var(--_blue)", "active bucket"),
    makeLegendItem("var(--_amber)", "local comparison"),
    makeLegendItem("var(--_green)", "gathered output"),
  )
  stage.append(source.band, bucketBand, legend, output.band)
  const status = statusEl()

  function paint(frame: BucketDistributionFrame, index = 0, total = 1) {
    stage.dataset.phase = frame.type
    source.bars.forEach((bar, barIndex) => {
      const token = frame.source[barIndex]
      bar.fill.style.height = barHeightStyle(token.value, maxValue)
      bar.num.textContent = labels[token.origin] ?? tokenLabel(token.value)
      bar.bar.dataset.state =
        barIndex === frame.activeSource && frame.type === "scatter" ? "scatter" : ""
      bar.bar.setAttribute(
        "aria-label",
        `${sourceTitle.toLowerCase()} index ${barIndex}, value ${token.value}`,
      )
    })
    lanes.forEach(({ lane, body, bucketIndex }) => {
      const bucket = frame.buckets[bucketIndex]
      body.textContent = ""
      bucket.forEach((token, itemIndex) => {
        const chip = el("span", "steptrace__distribution-token")
        chip.textContent = labels[token.origin] ?? tokenLabel(token.value)
        const activeItems = frame.activeBucketItems
        const active =
          frame.activeBucket === bucketIndex &&
          activeItems != null &&
          itemIndex >= Math.min(...activeItems) &&
          itemIndex <= Math.max(...activeItems)
        chip.dataset.active = active ? "1" : "0"
        chip.dataset.compare =
          active && (frame.type === "compare" || frame.type === "swap") ? "1" : "0"
        chip.dataset.gather = active && frame.type === "gather" ? "1" : "0"
        chip.setAttribute(
          "aria-label",
          `bucket ${frame.bucketLabels[bucketIndex]}, item ${itemIndex}, value ${token.value}`,
        )
        body.append(chip)
      })
      lane.dataset.active = frame.activeBucket === bucketIndex ? "1" : "0"
      lane.dataset.empty = bucket.length === 0 ? "1" : "0"
    })
    output.bars.forEach((bar, outputIndex) => {
      const token = frame.output[outputIndex]
      bar.fill.style.height = token == null ? "0" : barHeightStyle(token.value, maxValue)
      bar.num.textContent = token == null ? "·" : labels[token.origin] ?? tokenLabel(token.value)
      bar.bar.dataset.state = token == null ? "" : "sorted"
      bar.bar.dataset.target =
        frame.type === "gather" && outputIndex === frame.activeOutput ? "1" : "0"
      bar.bar.dataset.empty = token == null ? "1" : "0"
      bar.bar.setAttribute(
        "aria-label",
        token == null
          ? `output index ${outputIndex}, empty`
          : `output index ${outputIndex}, value ${token.value}`,
      )
    })
    status.innerHTML =
      escapeHtml(frame.message) +
      ` <span class="steptrace__counts">· ${phaseLabel(frame)} · step ${index + 1}/${total}</span>`
  }

  return {
    nodes: [stage, status],
    stageLayout: "fill" as const,
    stableStage: true,
    paint,
    watch: distributionWatch,
  } satisfies StepTraceView<BucketDistributionFrame>
}

function createBucketDistributionFamily<TConfig extends BucketDistributionConfig>() {
  return {
    id: "distribution-sort",
    createRecorder(config) {
      return new BucketDistributionRecorder(config)
    },
    createView(frames) {
      return makeBucketDistributionView(frames)
    },
  } satisfies VisualFamily<TConfig, BucketDistributionRecorder, BucketDistributionFrame>
}

export const radixDistributionFamily =
  createBucketDistributionFamily<RadixDistributionConfig>()
export const rangeBucketDistributionFamily =
  createBucketDistributionFamily<RangeBucketDistributionConfig>()
