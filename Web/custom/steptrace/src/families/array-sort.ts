import { ArraySortRecorder } from "../recorders"
import { makeSortView, resolveLegacySortFrame } from "../render"
import type { StepTraceView, VisualFamily } from "../types"

export interface ArraySortConfig {
  array: number[]
  profile: "shell" | "comb" | "cyclic" | "introsort"
}

export interface ArraySortFrame {
  type: string
  array: number[]
  sorted: number[]
  active: number[]
  candidate: number | null
  keyValue: number | null
  keyOrigin: number | null
  hole: number | null
  tokenId: number | null
  from?: number
  range?: number[]
  swaps: number
  profile: ArraySortConfig["profile"]
  movementUnit: "moves" | "swaps"
  showComparisons: boolean
  gap: number | null
  subsequence: number[] | null
  passSwapped: boolean | null
  cursor: number | null
  home: number | null
  strategy: string | null
  depthUsed: number | null
  depthLimit: number | null
  cutoff: number | null
  [key: string]: unknown
}

export function resolveArraySortFrame(frame: ArraySortFrame) {
  if (frame.profile === "comb") return resolveCombSortFrame(frame)
  if (frame.profile === "cyclic") return resolveCyclicSortFrame(frame)
  if (frame.profile === "introsort") return resolveIntrosortFrame(frame)

  const decorate = (visual) => ({
    ...visual,
    laneIndices: frame.subsequence,
    holeIndex: frame.hole,
    heldToken:
      frame.keyValue == null || frame.keyOrigin == null
        ? null
        : {
            id: frame.tokenId,
            index: frame.type === "place-held" ? frame.hole : frame.keyOrigin,
            label: `held ${frame.keyValue}`,
            placing: frame.type === "place-held",
          },
  })
  if (frame.type === "gap" || frame.type === "subsequence") {
    return decorate({
      activeIndices: [],
      activeRole: null,
      markerIndices: [null, null],
      movements: [],
    })
  }
  if (frame.type === "hold-key") {
    return decorate({
      activeIndices: [],
      activeRole: null,
      markerIndices: [null, null],
      movements: [],
    })
  }
  if (frame.type === "compare-held") {
    return decorate({
      activeIndices: frame.active,
      activeRole: "compare",
      markerIndices: [frame.active[0] ?? null, null],
      movements: [],
    })
  }
  if (frame.type === "shift-held") {
    const to = frame.active[0] ?? null
    const from = frame.from ?? null
    return decorate({
      activeIndices: to == null ? [] : [to],
      activeRole: "move",
      markerIndices: [null, from],
      movements: to == null || from == null ? [] : [[to, from]],
    })
  }
  if (frame.type === "place-held") {
    return decorate({
      activeIndices: [],
      activeRole: null,
      markerIndices: [null, null],
      movements: [],
    })
  }
  return decorate(resolveLegacySortFrame(frame))
}

function resolveIntrosortFrame(frame: ArraySortFrame) {
  const visual = resolveLegacySortFrame(frame)
  return {
    ...visual,
    laneIndices: null,
    holeIndex: frame.hole,
    heldToken:
      frame.keyValue == null || frame.keyOrigin == null
        ? null
        : {
            id: frame.tokenId,
            index: frame.type === "place-held" ? frame.hole : frame.keyOrigin,
            label: `held ${frame.keyValue}`,
            placing: frame.type === "place-held",
          },
  }
}

function resolveCombSortFrame(frame: ArraySortFrame) {
  const visual = resolveLegacySortFrame(frame)
  return {
    ...visual,
    laneIndices: frame.subsequence,
    holeIndex: null,
    heldToken: null,
  }
}

function resolveCyclicSortFrame(frame: ArraySortFrame) {
  if (frame.type === "home-check") {
    return {
      activeIndices: frame.active,
      activeRole: "compare",
      markerIndices: [frame.cursor, frame.home],
      movements: [],
      laneIndices: null,
      holeIndex: null,
      heldToken: null,
    }
  }
  if (frame.type === "mark-sorted") {
    return {
      activeIndices: [],
      activeRole: null,
      markerIndices: [frame.cursor, frame.home],
      movements: [],
      laneIndices: null,
      holeIndex: null,
      heldToken: null,
    }
  }
  return resolveLegacySortFrame(frame)
}

export const arraySortViewSemantics = {
  markerLabels: ["at", "from"],
  movementLabel: "moves",
  resolveFrame: resolveArraySortFrame,
  watchRows(frame: ArraySortFrame) {
    return [
      { k: "held", v: frame.keyValue ?? "—", sw: "var(--_blue)" },
      { k: "gap", v: frame.gap ?? "—", sw: "var(--_amber)" },
      {
        k: "lane",
        v: frame.subsequence ? frame.subsequence.join(" → ") : "—",
        sw: "var(--_violet)",
      },
    ]
  },
}

const combSortViewSemantics = {
  markerLabels: ["left", "right"],
  movementLabel: "swaps",
  resolveFrame: resolveArraySortFrame,
  watchRows(frame: ArraySortFrame) {
    return [
      { k: "gap", v: frame.gap ?? "—", sw: "var(--_amber)" },
      {
        k: "pass swapped",
        v: frame.passSwapped == null ? "—" : frame.passSwapped ? "yes" : "no",
        sw: frame.passSwapped ? "var(--_green)" : "var(--_neutral)",
        hint: "Whether this gap pass made any swap.",
      },
    ]
  },
}

const cyclicSortViewSemantics = {
  markerLabels: ["at", "home"],
  movementLabel: "swaps",
  resolveFrame: resolveArraySortFrame,
  watchRows(frame: ArraySortFrame) {
    const value = frame.cursor == null ? null : frame.array[frame.cursor]
    return [
      {
        k: "value",
        v: value ?? "—",
        sw: "var(--_blue)",
        hint: "Value at the current cursor.",
      },
      {
        k: "placed",
        v: `${frame.sorted.length}/${frame.array.length}`,
        sw: "var(--_green)",
        hint: "Values already fixed at their home index.",
      },
    ]
  },
}

const introsortViewSemantics = {
  markerLabels: ["scan", "pivot"],
  movementLabel: "moves",
  resolveFrame: resolveArraySortFrame,
  watchRows(frame: ArraySortFrame) {
    const depth =
      frame.depthUsed == null || frame.depthLimit == null
        ? "—"
        : `${frame.depthUsed}/${frame.depthLimit}`
    return [
      {
        k: "strategy",
        v: frame.strategy ?? (frame.type === "done" ? "complete" : "—"),
        sw:
          frame.strategy === "heap sort"
            ? "var(--_amber)"
            : frame.strategy === "insertion sort"
              ? "var(--_green)"
              : "var(--_blue)",
      },
      {
        k: "depth",
        v: depth,
        sw: "var(--_violet)",
        hint: "Quicksort levels used out of the depth limit.",
      },
      { k: "cutoff", v: frame.cutoff == null ? "—" : `≤ ${frame.cutoff}`, sw: "var(--_neutral)" },
    ]
  },
}

export function arraySortSemanticsFor(frames: readonly ArraySortFrame[]) {
  switch (frames[0]?.profile) {
    case "comb":
      return combSortViewSemantics
    case "cyclic":
      return cyclicSortViewSemantics
    case "introsort":
      return introsortViewSemantics
    default:
      return arraySortViewSemantics
  }
}

export const arraySortFamily = {
  id: "array-sort",
  createRecorder(config) {
    return new ArraySortRecorder(config.array, config.profile)
  },
  createView(frames) {
    return makeSortView(frames, arraySortSemanticsFor(frames)) as StepTraceView<ArraySortFrame>
  },
} satisfies VisualFamily<ArraySortConfig, ArraySortRecorder, ArraySortFrame>
