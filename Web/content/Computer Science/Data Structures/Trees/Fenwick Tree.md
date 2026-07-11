---
publish: true
created: 2026-07-11T18:24:03.204Z
modified: 2026-07-11T18:24:03.206Z
published: 2026-07-11T18:24:03.206Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A compact binary indexed tree computing prefix sums and point updates in O(log n) using one array and bit arithmetic.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

A Fenwick tree (binary indexed tree, BIT) computes **prefix sums over a mutable array** — `sum(a[0..i])` and point updates, both O(log n) — using a single `int[]` and two lines of bit arithmetic. It is the stripped-down alternative to a [[Segment Tree]]: same complexities for the sum case, but n array slots instead of 4n, ~15 lines instead of ~40, and tighter constants because each operation is a short loop over one flat array. The price is generality — it fundamentally answers _prefix_ queries, so range sums come from subtraction (`Prefix(r) − Prefix(l−1)`), which requires the operation to be **invertible**. Sums and XOR qualify; min/max don't — those need the segment tree.

Typical use: counting inversions while scanning an array, or a leaderboard answering "how many players score below x?" while scores keep changing — every update and query O(log n).

## Mechanics

The tree is implicit in the indices (1-based). Slot `i` stores the sum of the last `i & -i` elements ending at position `i` — `i & -i` isolates the least significant set bit. So slot 12 (`1100₂`) covers 4 elements (9..12); slot 8 (`1000₂`) covers elements 1..8.

Both operations walk the array by manipulating that bit:

- **Prefix(i)** — sum slots while stripping the lowest bit: `i -= i & -i`. Prefix of 13 (`1101₂`) reads slots 13 → 12 → 8, done: three slots whose ranges tile `[1..13]` exactly, one per set bit.
- **Update(i, delta)** — add `delta` to every slot whose range covers `i`, climbing with `i += i & -i`: for i = 5 that's slots 5 → 6 → 8 → 16 → …

Each loop iteration changes one bit, so both are O(log n) with a very small constant — no recursion, no child-index math, one array.

## C# Implementation

```csharp
public class FenwickTree
{
    private readonly int[] _tree; // 1-based; slot i covers (i & -i) elements ending at i
    private readonly int _n;

    public FenwickTree(int n)
    {
        _n = n;
        _tree = new int[n + 1];
    }

    public void Update(int i, int delta)          // add delta at position i (1-based)
    {
        for (; i <= _n; i += i & -i)
            _tree[i] += delta;
    }

    public int Prefix(int i)                      // sum of positions 1..i
    {
        int sum = 0;
        for (; i > 0; i -= i & -i)
            sum += _tree[i];
        return sum;
    }

    public int RangeSum(int l, int r) => Prefix(r) - Prefix(l - 1);
}
```

Note the contract: `Update` takes a **delta**, not a new value. To set position i to v, pass `v - current[i]` and track current values separately — a classic off-by-mindset bug when coming from the segment tree's assign-style update.

## Complexity

| Operation | Fenwick | Segment tree |
|---|---|---|
| Point update | O(log n) | O(log n) |
| Prefix / range sum | O(log n) | O(log n) |
| Range min/max/gcd | not supported (prefix max works only if values never decrease) | O(log n) |
| Lazy range updates | no (workarounds exist for sums only) | yes |
| Space | n + 1 ints | ~4n ints |

**Decision rule**: invertible aggregate (sum, count, XOR) with point updates → Fenwick; anything else → [[Segment Tree]].

## Questions

> [!QUESTION]- What does `i & -i` select in a Fenwick tree?
> It selects the least significant set bit, which gives the size of the range represented by that array slot.

> [!QUESTION]- Why can a Fenwick tree do range sums but not range minimums?
> Its native query is the prefix — `RangeSum(l, r)` is computed as `Prefix(r) − Prefix(l−1)`, which needs an inverse operation. Sum has subtraction; min has no inverse (knowing min(1..r) and min(1..l−1) tells you nothing about min(l..r)), so min/max need a segment tree.

> [!QUESTION]- Prefix(13) reads exactly three slots. Which ones, and why three?
> Slots 13, 12, and 8 — obtained by repeatedly clearing the lowest set bit of 13 (`1101₂` → `1100₂` → `1000₂`). Each slot covers the `i & -i` elements ending at i, and the three ranges tile \[1..13]; the slot count equals the number of set bits in the index.

> [!QUESTION]- When do you pick a Fenwick tree over a segment tree?
> When the aggregate is invertible (sum, count, XOR) and updates are point updates: same O(log n), a quarter of the memory, a third of the code, better constants. Non-invertible aggregates or lazy range updates flip the choice to the segment tree.

## References

- [Fenwick tree](https://cp-algorithms.com/data_structures/fenwick.html) — compact explanation of prefix queries and updates.
- Fenwick, [A new data structure for cumulative frequency tables (1994)](https://doi.org/10.1002/spe.4380240306) — the original paper; short and readable, framed around arithmetic-coding frequency tables.
