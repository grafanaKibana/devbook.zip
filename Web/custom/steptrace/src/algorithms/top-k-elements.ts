import {
  heapSelectionFamily,
  type HeapEntry,
  type HeapSelectionConfig,
  type HeapSelectionFrame,
  type HeapSelectionOperations,
  type HeapSelectionRecorder,
} from "../families/heap-selection"
import type { FamilyAlgorithmDefinition, StepTraceConfig } from "../types"

const DEFAULT_ARRAY = [12, 3, 17, 8, 25, 5, 19, 14]
const DEFAULT_K = 3

export function parseTopKElementsConfig(config: StepTraceConfig): HeapSelectionConfig {
  const array = config.array ?? DEFAULT_ARRAY
  const k = config.k ?? DEFAULT_K
  if (!Array.isArray(array) || array.length === 0 || !array.every(Number.isFinite))
    throw new Error('steptrace: top-k-elements requires a non-empty numeric "array".')
  // ponytail: the teaching tree fits three levels; expand its SVG geometry if examples need k > 7.
  if (!Number.isInteger(k) || k < 1 || k > array.length || k > 7)
    throw new Error(
      'steptrace: top-k-elements requires integer "k" from 1 to min(array length, 7).',
    )
  return { profile: "top-k-largest", array: array.slice(), k }
}

export const topKElements = {
  id: "top-k-elements",
  kind: "pointers",
  family: heapSelectionFamily,
  meta: { label: "Top-K elements" },
  parse: parseTopKElementsConfig,
  run(input, ops) {
    const heap: HeapEntry[] = []
    const swap = (left: number, right: number) => {
      ;[heap[left], heap[right]] = [heap[right], heap[left]]
    }

    ops.init(`Keep a min-heap of ${input.k}; its root is the weakest current winner.`)
    input.array.forEach((value, index) => {
      ops.read(index, `Read ${value} from the stream.`)
      if (heap.length < input.k) {
        heap.push({ value, source: index })
        ops.insert(index, `The heap has room, so insert ${value} at slot ${heap.length - 1}.`)
        let child = heap.length - 1
        while (child > 0) {
          const parent = Math.floor((child - 1) / 2)
          ops.compareParent(
            child,
            parent,
            `Compare inserted ${heap[child].value} with parent ${heap[parent].value}.`,
          )
          if (heap[parent].value <= heap[child].value) break
          const childValue = heap[child].value
          const parentValue = heap[parent].value
          swap(child, parent)
          ops.swapUp(
            child,
            parent,
            `${childValue} is smaller than ${parentValue}, so swap upward; the smaller value moves toward the root.`,
          )
          child = parent
        }
        return
      }

      ops.compareRoot(
        index,
        `Compare ${value} with root ${heap[0].value}, the weakest of the ${input.k} retained winners.`,
      )
      if (value <= heap[0].value) {
        ops.reject(
          index,
          `${value} ≤ ${heap[0].value}; reject ${value} because it cannot enter the top ${input.k}.`,
        )
        return
      }

      const evicted = heap[0].value
      heap[0] = { value, source: index }
      ops.replaceRoot(
        index,
        `${value} > ${evicted}; evict the weakest winner ${evicted} and place ${value} at the root.`,
      )
      let parent = 0
      while (true) {
        const left = parent * 2 + 1
        if (left >= heap.length) break
        const right = left + 1
        let weaker = left
        if (right < heap.length) {
          ops.compareChildren(
            left,
            right,
            `Compare children ${heap[left].value} and ${heap[right].value}; ${Math.min(heap[left].value, heap[right].value)} is weaker.`,
          )
          if (heap[right].value < heap[left].value) weaker = right
        }
        ops.compareDown(
          parent,
          weaker,
          `Compare ${heap[parent].value} with weaker child ${heap[weaker].value}.`,
        )
        if (heap[parent].value <= heap[weaker].value) break
        const parentValue = heap[parent].value
        const childValue = heap[weaker].value
        swap(parent, weaker)
        ops.swapDown(
          parent,
          weaker,
          `${parentValue} > ${childValue}, so swap them; ${childValue} becomes the weaker root candidate.`,
        )
        parent = weaker
      }
    })
    ops.done(
      `The heap contains the ${input.k} largest values. Its root is the weakest winner; the heap itself is not globally sorted.`,
    )
  },
} satisfies FamilyAlgorithmDefinition<
  "pointers",
  HeapSelectionConfig,
  HeapSelectionRecorder & HeapSelectionOperations,
  HeapSelectionFrame
>
