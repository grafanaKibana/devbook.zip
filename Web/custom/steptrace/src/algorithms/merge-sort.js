  // ─────────────────────────────── merge-sort ─────────────────────────────
  registerSort("merge-sort", { label: "Merge sort" }, (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Merge sort — start with runs of length 1, then repeatedly merge adjacent runs into larger sorted runs (watch the sorted runs double).`,
    )
    for (let width = 1; width < n; width *= 2) {
      for (let lo = 0; lo < n; lo += 2 * width) {
        const mid = Math.min(lo + width, n)
        const hi = Math.min(lo + 2 * width, n)
        if (mid >= hi) continue
        ops.range(lo, hi - 1)
        const left = ops.value.slice(lo, mid)
        const right = ops.value.slice(mid, hi)
        ops.candidate(
          null,
          `Merge the left run [${lo}, ${mid - 1}] and the right run [${mid}, ${hi - 1}] into one sorted run [${lo}, ${hi - 1}].`,
        )
        let i = 0
        let j = 0
        let k = lo
        // `from` = the run-head slot the value is lifted out of, so the view can
        // slide the bar from where it lived into the merged position.
        while (i < left.length && j < right.length) {
          if (left[i] <= right[j]) {
            ops.overwrite(
              k,
              left[i],
              `${left[i]} ≤ ${right[j]}: place ${left[i]} from the left half at index ${k}.`,
              lo + i,
            )
            i++
          } else {
            ops.overwrite(
              k,
              right[j],
              `${right[j]} < ${left[i]}: place ${right[j]} from the right half at index ${k}.`,
              mid + j,
            )
            j++
          }
          k++
        }
        while (i < left.length) {
          ops.overwrite(
            k,
            left[i],
            `Copy the remaining ${left[i]} from the left half at index ${k}.`,
            lo + i,
          )
          i++
          k++
        }
        while (j < right.length) {
          ops.overwrite(
            k,
            right[j],
            `Copy the remaining ${right[j]} from the right half at index ${k}.`,
            mid + j,
          )
          j++
          k++
        }
      }
      ops.range(null)
    }
    ops.lockAll(Array.from({ length: n }, (_, k) => k))
    ops.done(`Sorted in ${ops.swaps} writes.`)
  })

