import type { StringAlgorithmDefinition } from "../types"

export const zAlgorithm = {
  id: "z-algorithm",
  kind: "string",
  profile: "z-array",
  meta: { label: "Z-Algorithm" },
  run: (input, ops) => {
    const text = String(input.text || "")
    const n = text.length
    const z = new Array(n).fill(0)
    if (n) z[0] = n
    ops.init(
      n
        ? `Set Z[0] = ${n}. Each remaining entry measures how far the suffix at i matches the prefix.`
        : "The empty string has no Z-array entries.",
    )
    if (!n) {
      ops.done("Z = [].")
      return
    }

    let l = 0
    let r = 0
    for (let i = 1; i < n; i++) {
      const inside = i <= r
      const k = inside ? i - l : null
      const remainder = inside ? r - i + 1 : 0
      const sourceCase = !inside ? "outside" : z[k] < remainder ? "copy" : "reuse-extend"
      ops.focusZ(
        i,
        l,
        r,
        k,
        sourceCase,
        inside
          ? `i = ${i} lies inside [${l}, ${r}]; mirror k = ${k}.`
          : `i = ${i} lies outside [${l}, ${r}]; compare from the prefix start.`,
      )

      if (inside) {
        z[i] = Math.min(remainder, z[k])
        ops.copyZ(
          i,
          k,
          z[i],
          sourceCase,
          sourceCase === "copy"
            ? `Copy Z[${k}] = ${z[k]} to Z[${i}]; it ends before r, so no character comparison is needed.`
            : `Reuse the verified box remainder ${remainder} from Z[${k}], then test beyond r.`,
        )
        if (sourceCase === "copy") {
          ops.commitZ(
            i,
            z[i],
            l,
            r,
            sourceCase,
            `Commit Z[${i}] = ${z[i]}; the active box stays [${l}, ${r}].`,
          )
          continue
        }
      }

      while (i + z[i] < n) {
        const prefixIndex = z[i]
        const candidateIndex = i + z[i]
        const isMatch = text[prefixIndex] === text[candidateIndex]
        ops.compareZ(
          i,
          prefixIndex,
          candidateIndex,
          isMatch,
          sourceCase,
          `Compare S[${prefixIndex}]='${text[prefixIndex]}' with S[${candidateIndex}]='${text[candidateIndex]}' → ${isMatch ? "match" : "mismatch"}.`,
        )
        if (!isMatch) break
        z[i]++
      }

      if (i + z[i] - 1 > r) {
        l = i
        r = i + z[i] - 1
      }
      ops.commitZ(
        i,
        z[i],
        l,
        r,
        sourceCase,
        `Commit Z[${i}] = ${z[i]}; the active box is [${l}, ${r}].`,
      )
    }
    ops.done(`Z = [${z.join(", ")}].`)
  },
} satisfies StringAlgorithmDefinition
