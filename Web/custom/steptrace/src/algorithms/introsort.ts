import { arraySortFamily, type ArraySortConfig, type ArraySortFrame } from "../families/array-sort"
import { ArraySortRecorder } from "../recorders"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

export interface IntrosortConfig extends ArraySortConfig {
  depthLimit: number
  smallPartitionThreshold: number
}

function invalidConfig(message: string): never {
  throw new Error(`steptrace: introsort ${message}`)
}

export function parseIntrosortConfig(config: StepTraceConfig): IntrosortConfig {
  const { array } = config
  if (!Array.isArray(array) || array.length < 2)
    invalidConfig('requires an "array" with at least two numbers.')
  if (!array.every((value) => typeof value === "number" && Number.isFinite(value)))
    invalidConfig('requires every "array" value to be a finite number.')

  const depthLimit = config.depthLimit ?? 2 * Math.floor(Math.log2(array.length))
  const smallPartitionThreshold = config.smallPartitionThreshold ?? 16
  if (!Number.isInteger(depthLimit) || depthLimit < 0)
    invalidConfig('requires "depthLimit" to be a non-negative integer.')
  if (!Number.isInteger(smallPartitionThreshold) || smallPartitionThreshold < 1)
    invalidConfig('requires "smallPartitionThreshold" to be a positive integer.')

  return {
    array: array.slice(),
    profile: "introsort",
    depthLimit,
    smallPartitionThreshold,
  }
}

export const introsort = {
  id: "introsort",
  kind: "sort",
  family: arraySortFamily,
  meta: { label: "Introsort" },
  parse: parseIntrosortConfig,
  run(input, ops) {
    const n = ops.value.length
    ops.configureIntrosort(input.depthLimit, input.smallPartitionThreshold)
    ops.init(
      `Quicksort with depth limit ${input.depthLimit}, heap fallback, and insertion cutoff ${input.smallPartitionThreshold}.`,
    )

    function partition(lo: number, hi: number, depthUsed: number) {
      const pivot = ops.value[hi]
      ops.range(lo, hi)
      ops.pivot(hi)
      ops.introsortStrategy(
        "quicksort",
        depthUsed,
        "strategy",
        `Quicksort [${lo}, ${hi}] at depth ${depthUsed}: use ${pivot} at index ${hi} as the pivot.`,
      )
      let boundary = lo
      for (let scan = lo; scan < hi; scan++) {
        ops.compare(scan, hi, `Compare ${ops.value[scan]} with pivot ${pivot}.`)
        if (ops.value[scan] >= pivot) continue
        if (boundary !== scan)
          ops.swap(
            boundary,
            scan,
            `${ops.value[scan]} < ${pivot}: move it into the left partition.`,
          )
        boundary++
      }
      if (boundary !== hi) ops.swap(boundary, hi, `Place pivot ${pivot} at index ${boundary}.`)
      ops.pivot(boundary)
      ops.markSorted([boundary], [boundary], `Pivot ${pivot} is final at index ${boundary}.`)
      ops.pivot(null)
      return boundary
    }

    function siftDown(lo: number, heapSize: number, root: number) {
      let parent = root
      while (2 * parent + 1 < heapSize) {
        let child = 2 * parent + 1
        if (child + 1 < heapSize) {
          ops.compare(lo + child, lo + child + 1, "Choose the larger heap child.")
          if (ops.value[lo + child + 1] > ops.value[lo + child]) child++
        }
        ops.compare(lo + parent, lo + child, "Compare the heap parent with its larger child.")
        if (ops.value[lo + parent] >= ops.value[lo + child]) return
        ops.swap(lo + parent, lo + child, "Sift the smaller parent down inside the fallback range.")
        parent = child
      }
    }

    function heapSortRange(lo: number, hi: number) {
      const length = hi - lo + 1
      for (let root = Math.floor(length / 2) - 1; root >= 0; root--) siftDown(lo, length, root)
      for (let end = length - 1; end > 0; end--) {
        ops.swap(lo, lo + end, `Move the fallback heap maximum to index ${lo + end}.`)
        ops.markSorted([lo + end], [lo + end], `Index ${lo + end} is final.`)
        siftDown(lo, end, 0)
      }
      ops.markSorted([lo], [lo], `The fallback range [${lo}, ${hi}] is sorted.`)
    }

    function introsortRange(lo: number, hi: number, remaining: number, depthUsed: number) {
      if (lo > hi) return
      const size = hi - lo + 1
      ops.range(lo, hi)
      if (size <= input.smallPartitionThreshold) {
        ops.introsortStrategy(
          "deferred",
          depthUsed,
          "defer",
          `Defer [${lo}, ${hi}] (${size} values) to the final insertion pass; cutoff is ${input.smallPartitionThreshold}.`,
        )
        return
      }
      if (remaining === 0) {
        ops.introsortStrategy(
          "heap sort",
          depthUsed,
          "fallback",
          `Depth limit ${input.depthLimit} reached on [${lo}, ${hi}]; heap-sort this range.`,
        )
        heapSortRange(lo, hi)
        return
      }

      const pivot = partition(lo, hi, depthUsed)
      introsortRange(lo, pivot - 1, remaining - 1, depthUsed + 1)
      introsortRange(pivot + 1, hi, remaining - 1, depthUsed + 1)
    }

    introsortRange(0, n - 1, input.depthLimit, 0)

    ops.range(0, n - 1)
    ops.pivot(null)
    ops.introsortStrategy(
      "insertion sort",
      0,
      "cleanup",
      `Insertion cleanup: finish ranges of at most ${input.smallPartitionThreshold} values.`,
    )
    for (let index = 1; index < n; index++) {
      const key = ops.value[index]
      ops.holdKeyAt(key, index, `Lift ${key} from index ${index} for insertion cleanup.`)
      let cursor = index - 1
      ops.compareHeldAt(cursor, `Compare held ${key} with ${ops.value[cursor]} at index ${cursor}.`)
      while (cursor >= 0 && ops.value[cursor] > key) {
        ops.shiftHeld(
          cursor + 1,
          cursor,
          `${ops.value[cursor]} > ${key}: shift it right to index ${cursor + 1}.`,
        )
        cursor--
        if (cursor >= 0)
          ops.compareHeldAt(
            cursor,
            `Compare held ${key} with ${ops.value[cursor]} at index ${cursor}.`,
          )
      }
      ops.placeHeld(cursor + 1, key, `Place ${key} at index ${cursor + 1}.`)
      ops.releaseHeldKey()
    }

    ops.lockAll(Array.from({ length: n }, (_, index) => index))
    ops.done(`Sorted with ${ops.comparisons} comparisons and ${ops.swaps} moves.`)
  },
} satisfies FamilyAlgorithmDefinition<"sort", IntrosortConfig, ArraySortRecorder, ArraySortFrame>
