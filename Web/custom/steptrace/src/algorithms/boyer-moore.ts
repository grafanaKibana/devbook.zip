import type { StringAlgorithmDefinition } from "../types"

function buildGoodSuffixData(pattern: string) {
  const m = pattern.length
  if (!m) return { table: [], fullMatchShift: 0 }
  const shift = new Array(m + 1).fill(0)
  const border = new Array(m + 1).fill(0)
  let i = m
  let j = m + 1
  border[i] = j
  while (i > 0) {
    while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
      if (shift[j] === 0) shift[j] = j - i
      j = border[j]
    }
    i--
    j--
    border[i] = j
  }
  j = border[0]
  for (i = 0; i <= m; i++) {
    if (shift[i] === 0) shift[i] = j
    if (i === j) j = border[j]
  }
  return {
    table: Array.from({ length: m }, (_, mismatch) => shift[mismatch + 1]),
    fullMatchShift: shift[0],
  }
}

export const buildGoodSuffixTable = (pattern: string): number[] =>
  buildGoodSuffixData(pattern).table

export const boyerMoore = {
  id: "boyer-moore",
  kind: "string",
  profile: "boyer-moore",
  meta: { label: "Boyer-Moore" },
  run: (input, ops) => {
    const text = String(input.text || "")
    const pattern = String(input.pattern || "")
    const n = text.length
    const m = pattern.length
    const { table: goodSuffix, fullMatchShift } = buildGoodSuffixData(pattern)
    const lastOccurrence: Record<string, number> = {}
    for (let i = 0; i < pattern.length; i++) lastOccurrence[pattern[i]] = i
    ops.configureBoyerMoore(goodSuffix, lastOccurrence)
    ops.init(
      m
        ? `Precompute the last occurrence of each pattern character and good-suffix shifts [${goodSuffix.join(", ")}].`
        : "An empty pattern is not searched.",
    )
    if (!m || m > n) {
      ops.done("Nothing to search.")
      return
    }

    let alignment = 0
    while (alignment <= n - m) {
      ops.alignBoyerMoore(
        alignment,
        `Align the pattern at ${alignment}; compare from j = ${m - 1} right-to-left.`,
      )
      let j = m - 1
      let matchedFrom = m
      while (j >= 0) {
        const isMatch = pattern[j] === text[alignment + j]
        const nextMatchedFrom = isMatch ? j : matchedFrom
        ops.compareBoyerMoore(
          alignment + j,
          j,
          alignment,
          isMatch,
          nextMatchedFrom,
          `Compare pattern[${j}]='${pattern[j]}' with text[${alignment + j}]='${text[alignment + j]}' → ${isMatch ? "match" : "mismatch"}.`,
        )
        if (!isMatch) break
        matchedFrom = j
        j--
      }

      if (j < 0) {
        ops.matchBoyerMoore(
          alignment,
          fullMatchShift,
          `Whole pattern matched at ${alignment}; the full-match good-suffix shift is ${fullMatchShift}.`,
        )
        const nextAlignment = alignment + fullMatchShift
        if (nextAlignment <= n - m) {
          alignment = nextAlignment
          ops.shiftBoyerMoore(alignment, `Shift by ${fullMatchShift} after the full match.`)
        } else {
          ops.shiftBoyerMoore(
            alignment,
            `A full-match shift of ${fullMatchShift} would leave the searchable range; keep the match visible.`,
          )
          alignment = nextAlignment
        }
        continue
      }

      const bad = Math.max(1, j - (lastOccurrence[text[alignment + j]] ?? -1))
      const good = goodSuffix[j]
      const selected = Math.max(bad, good)
      const winner = bad === good ? "tie" : bad > good ? "bad-character" : "good-suffix"
      ops.decideBoyerMoore(
        j,
        bad,
        good,
        selected,
        winner,
        `Bad-character proposes ${bad}; good-suffix proposes ${good}; take max = ${selected} (${winner}).`,
      )
      alignment += selected
      ops.shiftBoyerMoore(alignment, `Shift the pattern to alignment ${alignment}.`)
    }
    ops.done(
      ops.found.length
        ? `Found ${ops.found.length} occurrence(s): index ${ops.found.join(", ")}.`
        : "Pattern not found.",
    )
  },
} satisfies StringAlgorithmDefinition
