import type { BitsAlgorithmDefinition } from "../types"

// ───────────────────────── kernighan-popcount ──────────────────────────
export const kernighanPopcount = {
  id: "kernighan-popcount",
  kind: "bits",
  meta: { label: "Kernighan population count" },
  run: (input, ops) => {
    let x = (Number(input.value) >>> 0) & ops.mask
    const total = ops.popcount(x)
    ops.init(
      x,
      { a: "x", b: "− 1", r: "&" },
      `x = ${x} has ${total} one${total === 1 ? "" : "s"}. Each pass, x & (x−1) deletes the lowest 1 — so the loop runs ${total} time${total === 1 ? "" : "s"}, once per set bit.`,
    )
    let pop = 0
    while (x !== 0) {
      const low = ops.lowestSetBit(x)
      const sub = (x - 1) & ops.mask
      ops.subtract(
        sub,
        low,
        `Lowest 1 is at bit ${low}. Subtracting 1 flips it to 0 and turns every zero below it into a 1.`,
      )
      const res = x & sub
      ops.and(
        res,
        low,
        `AND the two: the survivors above stay, bit ${low} and everything under it are wiped — exactly one 1 gone.`,
      )
      pop++
      x = res
      ops.commit(`x ← ${x}. ${pop} of ${total} ones cleared.`)
    }
    ops.done(
      `x = 0 — every 1 is gone. It took ${total} pass${total === 1 ? "" : "es"}, so x had ${total} set bit${total === 1 ? "" : "s"}.`,
    )
  },
} satisfies BitsAlgorithmDefinition
