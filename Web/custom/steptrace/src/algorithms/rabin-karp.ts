import type { StringAlgorithmDefinition } from "../types"

// ────────────────────────────── rabin-karp ─────────────────────────────
export const rabinKarp = {
  id: "rabin-karp",
  kind: "string",
  meta: { label: "Rabin-Karp" },
  run: (input, ops) => {
    const text = String(input.text || "")
    const pattern = String(input.pattern || "")
    const n = text.length
    const m = pattern.length
    const B = 256
    const MOD = 101 // small modulus so the displayed hashes stay readable
    const hash = (s) => {
      let h = 0
      for (let k = 0; k < s.length; k++) h = (h * B + s.charCodeAt(k)) % MOD
      return h
    }
    if (!m || m > n) {
      ops.init(`Rabin-Karp for "${pattern}".`)
      ops.done("Nothing to search.")
      return
    }
    const ph = hash(pattern)
    ops.init(
      `Rabin-Karp search for "${pattern}" — slide a window, compare its rolling hash to the pattern hash (${ph}), and only verify character-by-character when the hashes collide.`,
    )
    let highPow = 1
    for (let k = 0; k < m - 1; k++) highPow = (highPow * B) % MOD
    let wh = hash(text.slice(0, m))
    for (let s = 0; s <= n - m; s++) {
      ops.hashStep(
        s,
        wh,
        ph,
        `Window [${s}, ${s + m - 1}]: hash ${wh} ${wh === ph ? "=" : "≠"} pattern hash ${ph}${wh === ph ? " — verify" : " — skip"}.`,
      )
      if (wh === ph) {
        let ok = true
        for (let j = 0; j < m; j++) {
          const isMatch = text[s + j] === pattern[j]
          ops.compare(
            s + j,
            j,
            s,
            isMatch,
            `Hash hit — verify text[${s + j}]='${text[s + j]}' vs pattern[${j}]='${pattern[j]}'.`,
          )
          if (!isMatch) {
            ok = false
            break
          }
        }
        if (ok) ops.matchAt(s, `Verified — occurrence at index ${s}.`)
      }
      if (s < n - m) {
        const removed = (text.charCodeAt(s) * highPow) % MOD
        wh = (wh - removed + MOD) % MOD
        wh = (wh * B + text.charCodeAt(s + m)) % MOD
      }
    }
    ops.done(
      ops.found.length
        ? `Found ${ops.found.length} occurrence(s): index ${ops.found.join(", ")}.`
        : `Pattern not found.`,
    )
  },
} satisfies StringAlgorithmDefinition
