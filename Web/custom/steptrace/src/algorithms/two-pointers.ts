import type { PointerAlgorithmDefinition } from "../types"

// ───────────────────────────── two-pointers ────────────────────────────
export const twoPointers = {
  id: "two-pointers",
  kind: "pointers",
  meta: { label: "Two pointers" },
  run: (input, ops) => {
    const a = ops.value
    const target = input.target
    ops.init(
      `Two pointers on sorted data seek ${target}: left → raises the sum; right ← lowers it.`,
    )
    let l = 0
    let r = a.length - 1
    while (l < r) {
      const sum = a[l] + a[r]
      if (sum === target) {
        ops.step(
          { pointers: { L: l, R: r }, window: [l, r], mark: [l, r] },
          `arr[${l}] + arr[${r}] = ${a[l]} + ${a[r]} = ${target} ✓`,
        )
        ops.done(`Found a pair at indices ${l} and ${r}.`)
        return
      }
      const move = sum < target ? "move L →" : "← move R"
      ops.step(
        { pointers: { L: l, R: r }, window: [l, r] },
        `arr[${l}] + arr[${r}] = ${a[l]} + ${a[r]} = ${sum} ${sum < target ? "<" : ">"} ${target} → ${move}`,
      )
      if (sum < target) l++
      else r--
    }
    ops.done(`No pair sums to ${target}.`)
  },
} satisfies PointerAlgorithmDefinition
