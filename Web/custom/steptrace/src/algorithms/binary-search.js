  // ────────────────────────────── binary-search ──────────────────────────
  registerSearch("binary-search", { label: "Binary search" }, (input, ops) => {
    const a = ops.value
    const target = input.target
    ops.init(
      `Binary search for ${target} in a sorted array — check the middle of the range, then discard the half that can't contain it.`,
    )
    let lo = 0
    let hi = a.length - 1
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      ops.probe(
        lo,
        hi,
        mid,
        `Range [${lo}, ${hi}]: probe the middle — index ${mid} holds ${a[mid]}.`,
      )
      if (a[mid] === target) {
        ops.hit(mid, `${a[mid]} equals ${target} — found it at index ${mid}.`)
        ops.done(
          `Found ${target} after ${ops.comparisons} probe${ops.comparisons === 1 ? "" : "s"}.`,
        )
        return
      }
      if (a[mid] < target) {
        lo = mid + 1
        ops.narrow(lo, hi, `${a[mid]} < ${target}: discard the left half; search [${lo}, ${hi}].`)
      } else {
        hi = mid - 1
        ops.narrow(lo, hi, `${a[mid]} > ${target}: discard the right half; search [${lo}, ${hi}].`)
      }
    }
    ops.done(`${target} is not in the array — the range is empty after ${ops.comparisons} probes.`)
  })

