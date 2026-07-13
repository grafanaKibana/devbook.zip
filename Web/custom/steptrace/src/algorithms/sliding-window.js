  // ──────────────────────────── sliding-window ───────────────────────────
  registerPointer("sliding-window", { label: "Sliding window" }, (input, ops) => {
    const a = ops.value
    const target = input.target
    ops.init(
      `Sliding window — find the shortest contiguous subarray with sum ≥ ${target}. Expand the window right to grow the sum; shrink from the left while it stays ≥ ${target}.`,
    )
    let lo = 0
    let sum = 0
    let best = Infinity
    let bestRange = null
    for (let hi = 0; hi < a.length; hi++) {
      sum += a[hi]
      ops.step(
        { pointers: { lo, hi }, window: [lo, hi] },
        `Expand right to index ${hi}: window sum = ${sum}.`,
      )
      while (sum >= target) {
        if (hi - lo + 1 < best) {
          best = hi - lo + 1
          bestRange = [lo, hi]
        }
        ops.step(
          { pointers: { lo, hi }, window: [lo, hi] },
          `Sum ${sum} ≥ ${target} (length ${hi - lo + 1}) — record it, then shrink from the left.`,
        )
        sum -= a[lo]
        lo++
      }
    }
    if (bestRange) {
      const marks = []
      for (let k = bestRange[0]; k <= bestRange[1]; k++) marks.push(k)
      ops.step(
        { pointers: {}, window: bestRange, mark: marks },
        `Shortest window: indices ${bestRange[0]}..${bestRange[1]} (length ${best}).`,
      )
      ops.done(`Answer: the shortest qualifying length is ${best}.`)
    } else {
      ops.done(`No subarray reaches ${target}.`)
    }
  })

