  // ─────────────────────────────── selection-sort ─────────────────────────
  registerSort("selection-sort", { label: "Selection sort" }, (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Selection sort — repeatedly find the smallest value in the unsorted region and swap it into the next sorted slot.`,
    )
    for (let i = 0; i < n - 1; i++) {
      let min = i
      ops.candidate(min, `Assume index ${i} (${ops.value[i]}) is the smallest of the rest.`)
      for (let j = i + 1; j < n; j++) {
        ops.compare(j, min, `Compare ${ops.value[j]} with the current smallest ${ops.value[min]}.`)
        if (ops.value[j] < ops.value[min]) {
          min = j
          ops.candidate(min, `New smallest: ${ops.value[min]} at index ${min}.`)
        }
      }
      if (min !== i) ops.swap(i, min, `Swap the smallest (${ops.value[min]}) into index ${i}.`)
      ops.candidate(null, `Index ${i} settled — scan the remaining region next.`)
      ops.markSorted([i], [i], `Index ${i} now holds its final value.`)
    }
    ops.lockAll([n - 1])
    ops.markSorted([n - 1], [n - 1], `The last element is already in place.`)
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  })

