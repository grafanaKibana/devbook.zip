import { makeDPView, makeGraphView, makeSearchView, makeSortView } from "../render"
import type { FamilyAdapterVisualFamily, StepTraceView } from "../types"

export const legacyArraySortFamily = {
  id: "array-sort",
  createView(frames) {
    return makeSortView(frames) as StepTraceView<unknown>
  },
} satisfies FamilyAdapterVisualFamily<"sort">

export const legacyGraphStateFamily = {
  id: "graph-state",
  createView(frames, built) {
    return makeGraphView(frames, built!.graph, built!.frontierLabel)
  },
} satisfies FamilyAdapterVisualFamily<"graph">

export const legacyIndexedArraySearchFamily = {
  id: "indexed-array-search",
  createView(frames) {
    return makeSearchView(frames) as StepTraceView<unknown>
  },
} satisfies FamilyAdapterVisualFamily<"search">

export const lcsMatrixGridFamily = {
  id: "matrix-grid",
  createView(frames) {
    return makeDPView(frames)
  },
} satisfies FamilyAdapterVisualFamily<"dp">
