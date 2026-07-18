import type { StringAlgorithmDefinition } from "../types"

// ───────────────────────────────── kmp ─────────────────────────────────
export const kmp = {
  id: "kmp",
  kind: "string",
  meta: { label: "KMP" },
  run: (input, ops) => {
    const text = String(input.text || "")
    const pattern = String(input.pattern || "")
    const n = text.length
    const m = pattern.length
    ops.init(
      `KMP search for "${pattern}" — on a mismatch, the failure function slides the pattern forward without re-checking characters already known to match.`,
    )
    if (!m || m > n) {
      ops.done("Nothing to search.")
      return
    }
    // failure function (longest proper prefix that is also a suffix)
    const lps = new Array(m).fill(0)
    let len = 0
    for (let idx = 1; idx < m;) {
      if (pattern[idx] === pattern[len]) {
        len++
        lps[idx] = len
        idx++
      } else if (len > 0) {
        len = lps[len - 1]
      } else {
        lps[idx] = 0
        idx++
      }
    }
    let i = 0
    let j = 0
    while (i < n) {
      const isMatch = text[i] === pattern[j]
      ops.compare(
        i,
        j,
        i - j,
        isMatch,
        `Compare text[${i}]='${text[i]}' with pattern[${j}]='${pattern[j]}' → ${isMatch ? "match" : "mismatch"}.`,
      )
      if (isMatch) {
        i++
        j++
        if (j === m) {
          ops.matchAt(i - j, `Whole pattern matched — occurrence at index ${i - j}.`)
          j = lps[j - 1]
        }
      } else if (j > 0) {
        j = lps[j - 1]
        ops.slide(
          i - j,
          `Mismatch — reuse the matched prefix: realign so ${j} char${j === 1 ? "" : "s"} already line up (no re-check).`,
        )
      } else {
        i++
        ops.slide(i, `Mismatch at the pattern start — slide forward by one.`)
      }
    }
    ops.done(
      ops.found.length
        ? `Found ${ops.found.length} occurrence(s): index ${ops.found.join(", ")}.`
        : `Pattern not found.`,
    )
  },
} satisfies StringAlgorithmDefinition
