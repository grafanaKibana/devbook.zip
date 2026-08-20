---
publish: true
created: 2026-08-20T20:41:15.604Z
modified: 2026-08-20T20:41:15.605Z
published: 2026-08-20T20:41:15.605Z
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

A mutable score array must answer “total through index `i`” while individual values keep changing. Rebuilding every prefix after an update repeats work. A Fenwick tree keeps the needed partial sums in one indexed array.

Each slot owns one precisely sized block. In a 1-indexed array, slot `i` aggregates the `i & -i` elements ending at `i`. `i & -i` isolates the index's lowest set bit. Slot `12` (`1100₂`) covers positions 9 through 12, while slot `8` (`1000₂`) covers positions 1 through 8. Odd indices store one source value because their low bit is 1. Other slots cover wider blocks. Prefixes are direct. Arbitrary ranges come from subtracting two prefixes, so the aggregate must be invertible.

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
      "description": "number of values indexed by the tree"
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

The prefix-subtraction mechanism sets the hard boundary: `RangeSum(l, r) = Prefix(r) − Prefix(l − 1)` only reconstructs `[l..r]` when the aggregate has an inverse. Sum, count, and XOR qualify (subtraction, subtraction, XOR-again). A product over a group works when every element is invertible. Minimum and maximum have no inverse — knowing `min(1..r)` and `min(1..l−1)` says nothing about `min(l..r)` — so range-min/max queries need a [[Computer Science/Data Structures/Trees/Segment Tree|Segment Tree]] instead. A "prefix max" Fenwick tree exists but is valid only when values never decrease, so it cannot survive point _updates_ that lower a value.

The plain layout also supports point update with range query, not the reverse. Range update with point query needs a Fenwick tree built over a difference array (add `delta` at `l`, subtract at `r + 1` only when `r < n`, then a point query becomes a prefix sum). Range update with range query needs two such BITs run together. Reaching for the plain single-BIT operations in those cases silently answers the wrong question rather than failing.

Two implementation errors recur. `Update` accepts a **delta**, not an assignment. Setting position `i` to `v` requires passing `v − current[i]` and tracking current values separately. One-based loops also require positive update indices. `0` stalls `i += i & -i`. The index type must provide compatible bitwise-and and unary-negation semantics.

# Diagram and C# Implementation

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
> An update at position `i` walks upward along these parent links (`i += i & -i`). A prefix query at `i` walks the complementary downward chain (`i -= i & -i`).

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
> `Update` applies a delta rather than assigning a value. Setting position `i` to `v` means `Update(i, v - current[i])` with `current` tracked by the caller.

# References

- [Fenwick tree](https://cp-algorithms.com/data_structures/fenwick.html)
- [A new data structure for cumulative frequency tables (1994)](https://doi.org/10.1002/spe.4380240306)
