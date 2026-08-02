---
publish: true
created: 2026-07-29T20:22:59.992Z
modified: 2026-08-02T11:52:57.486Z
published: 2026-08-02T11:52:57.486Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A binary indexed tree that computes prefix sums and point updates in one flat array.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A mutable array of scores must answer prefix-sum questions such as “what is the total through index `i`?” while individual scores keep changing. Rebuilding every prefix after each update repeats work that a Fenwick tree stores incrementally in one indexed array.

The compactness comes from a specific division of labour. In a 1-indexed array, slot `i` is responsible for the block of `i & -i` elements ending at `i`, where `i & -i` isolates the lowest set bit of the index. Slot `12` (`1100₂`) covers four elements, positions 9 through 12; slot `8` (`1000₂`) covers eight, positions 1 through 8. Odd-indexed slots have a low bit of 1 and therefore store one source value, while the remaining slots aggregate wider blocks. The structure answers prefix questions directly and reconstructs a range only by subtracting two prefixes — which is why the aggregate has to be invertible.

**Core shape:** 1-indexed array → slot `i` sums the `i & -i` elements ending at `i` → a prefix query clears low bits downward, a point update adds the low bit upward → arbitrary range reconstruction requires an invertible aggregate

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"fenwick-tree","array":[3,1,4,1,5,9,2,6]}
```

The interactive view aligns every stored Fenwick slot over the source range it summarizes. Wide blocks sit above their narrower children: `BIT[8]` spans `[1..8]`, while `BIT[5]` spans only `[5..5]`. The source row remains mutable beneath them.

Use `Add delta` to change one source value and highlight every aggregate block containing it. `Range sum` marks the stored blocks used by `Prefix(r)` and `Prefix(l - 1)` before subtracting them. Source updates persist until reset; the latest operation's highlights remain until the next operation or reset.

Both operations derive their next index from the lowest set bit:

- **`Prefix(i)`** accumulates slots while stripping the lowest set bit: `i -= i & -i`. `Prefix(13)` reads `13 → 12 → 8` (`1101₂ → 1100₂ → 1000₂`), three slots whose responsibility blocks tile `[1..13]` with no overlap — one slot per set bit of `13`.
- **`Update(i, delta)`** adds `delta` to every slot whose block covers `i`, climbing with `i += i & -i`: from `i = 5` that is `5 → 6 → 8 → 16 → …` until the index passes `n`.

The two walks are complementary traversals over the low-bit structure: a query clears one set bit per step, while an update adds the low bit and may carry across several bits.

#### Representation and Invariants

The tree is implicit; nothing but an `int[] tree` of length `n + 1` exists. The shown formulas are one-based: passing index `0` to `i += i & -i` never advances because `0 & -0 == 0`. Zero-based Fenwick trees are valid, but use different transitions: `i | (i + 1)` to move upward and `(i & (i + 1)) - 1` to move downward.

Three facts define a valid state:

1. Slot `i` holds the aggregate of positions `(i − (i & -i) + 1) .. i`. That block length is the lowest set bit, so slots for indices with many trailing zeros cover wide ranges and sit near the top of the implicit tree.
2. The responsibility blocks reachable from `Prefix(i)` partition `[1..i]` exactly. Because they tile without gaps or overlaps, summing the visited slots yields the true prefix.
3. `Update` and `Prefix` traverse complementary sets of indices: every slot whose block contains position `i` is exactly the set the update loop visits, so a point change is reflected in every prefix that should see it.

Only the slots on an update path change; the rest of the array is untouched. The structure records aggregates, not the original values, so recovering `a[i]` alone means `Prefix(i) − Prefix(i − 1)` rather than a direct read.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Fenwick Tree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Build from n values",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Update(i, delta)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prefix(i)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "RangeSum(l, r)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Build from n values",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n) structure",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Update(i, delta)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prefix(i)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "RangeSum(l, r)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
````

# When the Structure Stops Fitting

The prefix-subtraction mechanism sets the hard boundary: `RangeSum(l, r) = Prefix(r) − Prefix(l − 1)` only reconstructs `[l..r]` when the aggregate has an inverse. Sum, count, and XOR qualify (subtraction, subtraction, XOR-again); a product over a group works when every element is invertible. Minimum and maximum have no inverse — knowing `min(1..r)` and `min(1..l−1)` says nothing about `min(l..r)` — so range-min/max queries need a [[Computer Science/Data Structures/Trees/Segment Tree|Segment Tree]] instead. A "prefix max" Fenwick tree exists but is valid only when values never decrease, so it cannot survive point _updates_ that lower a value.

The plain layout also supports point update with range query, not the reverse. Range update with point query needs a Fenwick tree built over a difference array (add `delta` at `l`, subtract at `r + 1` only when `r < n`, then a point query becomes a prefix sum). Range update with range query needs two such BITs run together. Reaching for the plain single-BIT operations in those cases silently answers the wrong question rather than failing.

Two mechanical traps recur. The `Update` contract takes a **delta**, not an assignment: setting position `i` to `v` requires passing `v − current[i]` and tracking current values separately, which trips implementations ported from a segment tree's assign-style update. The one-based loops also require positive update indices; a stray `0` stalls `i += i & -i`. The index type only needs compatible bitwise-and and unary-negation semantics.

# Reference Drawer

> [!ABSTRACT]- Responsibility blocks for n = 8
>
> ```mermaid
> flowchart TD
>   S8["slot 8 · covers 1..8"]
>   S4["slot 4 · covers 1..4"]
>   S6["slot 6 · covers 5..6"]
>   S7["slot 7 · covers 7..7"]
>   S2["slot 2 · covers 1..2"]
>   S3["slot 3 · covers 3..3"]
>   S5["slot 5 · covers 5..5"]
>   S1["slot 1 · covers 1..1"]
>   S8 --> S4
>   S8 --> S6
>   S8 --> S7
>   S4 --> S2
>   S4 --> S3
>   S6 --> S5
>   S2 --> S1
> ```
>
> An update at position `i` walks upward along these parent links (`i += i & -i`); a prefix query at `i` walks the complementary downward chain (`i -= i & -i`).

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class FenwickTree
> {
>     private readonly long[] _tree; // 1-based; slot i aggregates the (i & -i) values ending at i
>     private readonly int _n;
>
>     public FenwickTree(int n)
>     {
>         if (n <= 0)
>             throw new ArgumentOutOfRangeException(nameof(n));
>
>         _n = n;
>         _tree = new long[n + 1];
>     }
>
>     public void Update(int i, long delta) // add delta at position i (1-based)
>     {
>         if (i < 1 || i > _n)
>             throw new ArgumentOutOfRangeException(nameof(i));
>
>         for (; i <= _n; i += i & -i)
>         {
>             _tree[i] += delta;
>         }
>     }
>
>     public long Prefix(int i) // aggregate of positions 1..i
>     {
>         if (i < 0 || i > _n)
>             throw new ArgumentOutOfRangeException(nameof(i));
>
>         long sum = 0;
>         for (; i > 0; i -= i & -i)
>         {
>             sum += _tree[i];
>         }
>
>         return sum;
>     }
>
>     public long RangeSum(int l, int r)
>     {
>         if (l < 1 || l > r || r > _n)
>             throw new ArgumentOutOfRangeException(nameof(l));
>
>         return Prefix(r) - Prefix(l - 1);
>     }
> }
> ```
>
> `Update` applies a delta rather than assigning a value; setting position `i` to `v` means `Update(i, v - current[i])` with `current` tracked by the caller.

# Questions

> [!QUESTION]- Why can a Fenwick tree answer range sums but not range minimums?
> A range is reconstructed only as `Prefix(r) − Prefix(l − 1)`, which needs the aggregate to have an inverse. Sum has subtraction; minimum does not — `min(1..r)` and `min(1..l−1)` reveal nothing about `min(l..r)`. Non-invertible aggregates therefore need a segment tree.

> [!QUESTION]- Why is the array 1-indexed, and what breaks at index 0?
> The shown formulas are one-based. `i & -i` isolates the lowest set bit, but `0` has none, so `i += i & -i` never moves off zero. A zero-based Fenwick tree works only with its matching transitions: `i | (i + 1)` upward and `(i & (i + 1)) - 1` downward.

> [!QUESTION]- How does a Fenwick tree handle a range update with a point query?
> Not with the plain layout. It is built over a difference array: `Update(l, +delta)` starts the range increment, and `Update(r + 1, -delta)` ends it only when `r < n`; when `r == n`, omit that second update. A point query at `i` becomes `Prefix(i)`. Range update with range query extends this to two BITs run in parallel.

# References

- [Fenwick tree](https://cp-algorithms.com/data_structures/fenwick.html) — source for the structure and its analysis.
- Peter M. Fenwick, [A new data structure for cumulative frequency tables (1994)](https://doi.org/10.1002/spe.4380240306) — the original paper, framed around arithmetic-coding frequency tables and the binary-indexed decomposition.
- [Binary Indexed Trees](https://www.topcoder.com/thrive/articles/Binary%20Indexed%20Trees) — TopCoder tutorial walking the low-bit responsibility ranges and the two traversal loops with worked indices.
