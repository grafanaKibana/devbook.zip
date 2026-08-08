import type { PointerAlgorithmDefinition } from "../types"

// ──────────────────────────── sliding-window ───────────────────────────
export const slidingWindow = {
  id: "sliding-window",
  kind: "pointers",
  meta: { label: "Sliding window" },
  run: (_input, ops) => {
    const a = ops.value
    ops.init("Sliding window finds the longest substring without repeating characters.")
    let lo = 0
    let best = 0
    let bestRange = null
    const lastSeen = new Map()
    for (let hi = 0; hi < a.length; hi++) {
      const character = a[hi]
      const duplicate = lastSeen.get(character)
      if (duplicate != null && duplicate >= lo) {
        ops.step(
          { pointers: { lo, hi }, window: [lo, hi], bestRange, duplicateIndex: hi },
          `Duplicate "${character}" enters at index ${hi}; move left past its previous index ${duplicate}.`,
        )
        lo = duplicate + 1
      }
      lastSeen.set(character, hi)
      if (hi - lo + 1 > best) {
        best = hi - lo + 1
        bestRange = [lo, hi]
      }
      ops.step(
        { pointers: { lo, hi }, window: [lo, hi], bestRange, enteringIndex: hi },
        `Accept "${character}" at index ${hi}: window "${a.slice(lo, hi + 1).join("")}" has length ${hi - lo + 1}.`,
      )
    }
    if (bestRange) {
      const marks = []
      for (let k = bestRange[0]; k <= bestRange[1]; k++) marks.push(k)
      ops.step(
        { pointers: {}, window: bestRange, bestRange, mark: marks },
        `Best substring: "${a.slice(bestRange[0], bestRange[1] + 1).join("")}" (length ${best}).`,
      )
      ops.done(`Answer: the longest unique substring has length ${best}.`)
    } else {
      ops.done("The empty string has no non-empty substring.")
    }
  },
} satisfies PointerAlgorithmDefinition
