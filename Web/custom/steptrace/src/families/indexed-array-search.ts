import { IndexedSearchRecorder } from "../recorders"
import { makeSearchView } from "../render"
import type { StepTraceView, VisualFamily } from "../types"
import type { StepTraceConfig } from "../types"

export interface IndexedArraySearchConfig {
  array: number[]
  target: number | null
  profile: "exponential" | "jump" | "ternary"
  goal?: string
  blockSize?: number
}

export function parseIndexedArraySearchConfig(
  config: StepTraceConfig,
  algorithm: string,
  profile: "exponential" | "jump",
) {
  const { array, target } = config

  if (!Array.isArray(array) || array.length === 0)
    throw new Error(`steptrace: ${algorithm} requires a non-empty sorted "array".`)
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    throw new Error(`steptrace: ${algorithm} requires every "array" value to be a finite number.`)
  if (array.some((value, index) => index > 0 && value < array[index - 1]))
    throw new Error(`steptrace: ${algorithm} requires "array" values in non-decreasing order.`)
  if (typeof target !== "number" || !Number.isFinite(target))
    throw new Error(`steptrace: ${algorithm} requires a finite numeric "target".`)

  return { array: array.slice(), target, profile }
}

export interface IndexedSearchFrame {
  type: string
  array: number[]
  lo: number
  hi: number
  mid: number | null
  found: number | null
  target: number | null
  comparisons: number
  message: string
  profile: IndexedArraySearchConfig["profile"]
  phase: "gallop" | "binary" | "jump" | "scan" | "ternary"
  bound: number | null
  previousBound: number
  bracket: number[] | null
  mid2: number | null
  goal: string | null
  blockSize: number | null
  [key: string]: unknown
}

export function resolveIndexedSearchState(frame: IndexedSearchFrame, index: number) {
  if (frame.found === index) return "found"
  if (frame.mid === index || frame.mid2 === index) return "probe"
  if (frame.phase === "gallop" || frame.phase === "jump") {
    if (index <= frame.previousBound) return "eliminated"
    if (frame.bound != null && index > frame.bound) return "unseen"
    return "range"
  }
  if (index < frame.lo || index > frame.hi) return "eliminated"
  return "range"
}

function phaseLabel(frame: IndexedSearchFrame) {
  switch (frame.phase) {
    case "gallop":
      return "gallop"
    case "jump":
      return "jump"
    case "scan":
      return frame.profile === "ternary" ? "final scan" : "linear scan"
    case "ternary":
      return "ternary"
    default:
      return "binary search"
  }
}

function phaseColor(frame: IndexedSearchFrame) {
  if (frame.phase === "gallop") return "var(--_violet)"
  if (frame.phase === "binary") return "var(--_green)"
  if (frame.phase === "scan" || frame.phase === "jump") return "var(--_blue)"
  return "var(--_amber)"
}

export const indexedSearchViewSemantics = {
  stateForIndex: resolveIndexedSearchState,
  watchRows(frame: IndexedSearchFrame, frames: readonly IndexedSearchFrame[]) {
    const first = frames[0]
    const profile = frame.profile
    const probe =
      frame.mid == null
        ? "—"
        : `[${frame.mid}] = ${frame.array[frame.mid]}`
    const range =
      frame.phase === "gallop" || frame.phase === "jump"
        ? frame.bound == null
          ? "discovering"
          : `[${Math.max(0, frame.previousBound + 1)}, ${frame.bound}]`
        : `[${frame.lo}, ${frame.hi}]`
    const rows = [
      profile === "ternary"
        ? { k: "goal", v: frame.goal ?? "—", sw: "var(--_accent)" }
        : { k: "target", v: String(first.target), sw: "var(--_accent)" },
      { k: "phase", v: phaseLabel(frame), sw: phaseColor(frame) },
      { k: "range", v: range, sw: "var(--_neutral)" },
      { k: profile === "ternary" ? "probe 1" : "probe", v: probe, sw: "var(--_blue)" },
    ]

    if (profile === "ternary") {
      rows.push({
        k: "probe 2",
        v: frame.mid2 == null ? "—" : `[${frame.mid2}] = ${frame.array[frame.mid2]}`,
        sw: "var(--_violet)",
      })
    } else if (profile === "jump") {
      rows.push({ k: "block", v: String(frame.blockSize ?? "—"), sw: "var(--_blue)" })
    }

    return rows
  },
}

export const indexedArraySearchFamily = {
  id: "indexed-array-search",
  createRecorder(config) {
    return new IndexedSearchRecorder(config)
  },
  createView(frames) {
    return makeSearchView(frames, indexedSearchViewSemantics) as StepTraceView<IndexedSearchFrame>
  },
} satisfies VisualFamily<IndexedArraySearchConfig, IndexedSearchRecorder, IndexedSearchFrame>
