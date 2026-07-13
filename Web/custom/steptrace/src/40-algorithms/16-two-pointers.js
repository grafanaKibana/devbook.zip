  // ───────────────────────────── two-pointers ────────────────────────────
  registerPointer("two-pointers", { label: "Two pointers" }, (input, ops) => {
    const a = ops.value
    const target = input.target
    ops.init(
      `Two pointers on a sorted array — find a pair summing to ${target}. Move the left pointer right to raise the sum, the right pointer left to lower it.`,
    )
    let l = 0
    let r = a.length - 1
    while (l < r) {
      const sum = a[l] + a[r]
      ops.step(
        { pointers: { L: l, R: r }, window: [l, r] },
        `a[${l}] + a[${r}] = ${a[l]} + ${a[r]} = ${sum}.`,
      )
      if (sum === target) {
        ops.step(
          { pointers: { L: l, R: r }, window: [l, r], mark: [l, r] },
          `${a[l]} + ${a[r]} = ${target} — found the pair.`,
        )
        ops.done(`Found a pair at indices ${l} and ${r}.`)
        return
      }
      if (sum < target) l++
      else r--
    }
    ops.done(`No pair sums to ${target}.`)
  })

