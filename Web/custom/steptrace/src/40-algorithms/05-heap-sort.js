  // ─────────────────────────────── heap-sort ──────────────────────────────
  registerSort("heap-sort", { label: "Heap sort" }, (input, ops) => {
    const n = ops.value.length
    ops.init(
      `Heap sort — build a max-heap (each parent ≥ its children), then repeatedly swap the root to the end and sift the new root down.`,
    )
    function siftDown(lo, hi) {
      let root = lo
      while (2 * root + 1 < hi) {
        let child = 2 * root + 1
        if (child + 1 < hi) {
          ops.compare(
            child,
            child + 1,
            `Compare children ${ops.value[child]} and ${ops.value[child + 1]}.`,
          )
          if (ops.value[child + 1] > ops.value[child]) child++
        }
        ops.compare(
          root,
          child,
          `Compare parent ${ops.value[root]} with its larger child ${ops.value[child]}.`,
        )
        if (ops.value[root] >= ops.value[child]) break
        ops.swap(root, child, `Parent is smaller — sift it down.`)
        root = child
      }
    }
    ops.range(0, n - 1)
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n)
    for (let end = n - 1; end > 0; end--) {
      ops.swap(0, end, `Move the largest value (the root) to index ${end}.`)
      ops.markSorted([end], [end], `Index ${end} now holds its final value.`)
      ops.range(0, end - 1)
      siftDown(0, end)
    }
    ops.range(null)
    ops.lockAll([0])
    ops.markSorted([0], [0], `The remaining root is the smallest — done.`)
    ops.done(`Sorted in ${ops.comparisons} comparisons and ${ops.swaps} swaps.`)
  })

