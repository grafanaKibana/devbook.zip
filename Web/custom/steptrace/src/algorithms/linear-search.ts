import type { SearchAlgorithmDefinition } from "../types"

// ─────────────────────────────── linear-search ─────────────────────────────
export const linearSearch = {
  id: "linear-search",
  kind: "search",
  meta: { label: "Linear search" },
  run: (input, ops) => {
    const a = ops.value
    const target = input.target
    const n = a.length
    ops.mode = "scan" // whole array stays in play; nothing is ever eliminated
    ops.init(
      `Linear search for ${target} — scan left to right, comparing every element until a match is found (or the array ends).`,
    )
    for (let i = 0; i < n; i++) {
      // lo/hi span the whole array on every step: linear search discards nothing.
      ops.probe(0, n - 1, i, `Check index ${i}: is ${a[i]} the target ${target}?`)
      if (a[i] === target) {
        ops.hit(i, `${a[i]} equals ${target} — found it at index ${i}.`)
        ops.done(
          `Found ${target} at index ${i} after ${ops.comparisons} comparison${ops.comparisons === 1 ? "" : "s"}.`,
        )
        return
      }
    }
    ops.done(
      `${target} is not in the array — scanned all ${n} elements (${ops.comparisons} comparisons).`,
    )
  },
} satisfies SearchAlgorithmDefinition
