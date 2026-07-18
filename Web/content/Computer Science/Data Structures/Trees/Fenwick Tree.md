---
publish: true
created: 2026-07-12T14:27:20.423Z
modified: 2026-07-18T11:30:05.513Z
published: 2026-07-18T11:30:05.513Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A binary indexed tree computing prefix sums and point updates in O(log n) with one array.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

An array of scores changes as players climb a leaderboard, and each change is followed by a query like "what is the running total up to rank _i_?" A plain [[Prefix Sum]] array answers that query in `O(1)`, but a single score change forces every later prefix to be rebuilt in `O(n)`. A [[Segment Tree]] restores both directions to `O(log n)`, at the cost of roughly `4n` slots and a recursive body. A Fenwick tree — the binary indexed tree, BIT — keeps the `O(log n)` update and prefix query while storing exactly one `int` per element and looping over a single flat array.

The compactness comes from a specific division of labour. In a 1-indexed array, slot `i` is responsible for the block of `i & -i` elements ending at `i`, where `i & -i` isolates the lowest set bit of the index. Slot `12` (`1100₂`) covers four elements, positions 9 through 12; slot `8` (`1000₂`) covers eight, positions 1 through 8. No slot stores an individual element in isolation, so the structure answers prefix questions directly and reconstructs a range only by subtracting two prefixes — which is why the aggregate has to be invertible.

**Core shape:** 1-indexed array → slot `i` sums the `i & -i` elements ending at `i` → a prefix query clears low bits downward, a point update adds the low bit upward → invertible aggregate only → `O(n)` storage.

# State across operations

No StepTrace renderer covers this structure yet.

> [!NOTE] Visualization pending
> Planned StepTrace: an array card where each index is responsible for a range whose length is its lowest set bit; a prefix query hops down by clearing low bits while an update hops up by adding them, highlighting the handful of slots each path touches. No matching renderer exists in `engine.js` yet.

Both operations move through the array by editing one bit of the index at a time, and the set bits of the index decide exactly which slots are visited:

- **`Prefix(i)`** accumulates slots while stripping the lowest set bit: `i -= i & -i`. `Prefix(13)` reads `13 → 12 → 8` (`1101₂ → 1100₂ → 1000₂`), three slots whose responsibility blocks tile `[1..13]` with no overlap — one slot per set bit of `13`.
- **`Update(i, delta)`** adds `delta` to every slot whose block covers `i`, climbing with `i += i & -i`: from `i = 5` that is `5 → 6 → 8 → 16 → …` until the index passes `n`.

The two walks are inverses of each other over the low-bit structure: a query descends by removing set bits, an update ascends by carrying one in.

# Representation and invariants

The tree is implicit; nothing but an `int[tree]` of length `n + 1` exists, and the 1-based indexing is load-bearing rather than cosmetic. Index `0` has no lowest set bit, so `0 & -0 == 0` and the update loop would never advance from it — a `0`-based layout stalls immediately.

Three facts define a valid state:

1. Slot `i` holds the aggregate of positions `(i − (i & -i) + 1) .. i`. That block length is the lowest set bit, so slots for indices with many trailing zeros cover wide ranges and sit near the top of the implicit tree.
2. The responsibility blocks reachable from `Prefix(i)` partition `[1..i]` exactly. Because they tile without gaps or overlaps, summing the visited slots yields the true prefix.
3. `Update` and `Prefix` traverse complementary sets of indices: every slot whose block contains position `i` is exactly the set the update loop visits, so a point change is reflected in every prefix that should see it.

Only the slots on an update path change; the rest of the array is untouched. The structure records aggregates, not the original values, so recovering `a[i]` alone means `Prefix(i) − Prefix(i − 1)` rather than a direct read.

# Complexity

| Operation | Time | Space | Cause |
| --- | --- | --- | --- |
| Build from `n` values | `O(n)` | `O(n)` structure | In-place construction propagates each slot to its parent `i + (i & -i)` once; the naive `n` updates cost `O(n log n)`. |
| `Update(i, delta)` | `O(log n)` | `O(1)` aux | The `i += i & -i` walk visits one slot per remaining higher bit; at most `⌊log₂ n⌋ + 1` slots lie on the path to `n`. |
| `Prefix(i)` | `O(log n)` | `O(1)` aux | The `i -= i & -i` walk clears one set bit per step, so it reads exactly `popcount(i)` slots, bounded by `⌊log₂ n⌋ + 1`. |
| `RangeSum(l, r)` | `O(log n)` | `O(1)` aux | Two prefix walks: `Prefix(r) − Prefix(l − 1)`. |

Every bound is worst-case and deterministic — there is no amortization or balancing assumption, because the number of slots touched is fixed by the bit pattern of the index. Constants are small: each step is one array read or write plus one `i & -i`, with no recursion, child-index arithmetic, or pointer chasing.

# When the structure stops fitting

The prefix-subtraction mechanism sets the hard boundary: `RangeSum(l, r) = Prefix(r) − Prefix(l − 1)` only reconstructs `[l..r]` when the aggregate has an inverse. Sum, count, and XOR qualify (subtraction, subtraction, XOR-again); a product over a group works when every element is invertible. Minimum and maximum have no inverse — knowing `min(1..r)` and `min(1..l−1)` says nothing about `min(l..r)` — so range-min/max queries need a [[Segment Tree]] instead. A "prefix max" Fenwick tree exists but is valid only when values never decrease, so it cannot survive point _updates_ that lower a value.

The plain layout also supports point update with range query, not the reverse. Range update with point query needs a Fenwick tree built over a difference array (add `delta` at `l`, subtract at `r + 1`, then a point query becomes a prefix sum). Range update with range query needs two such BITs run together. Reaching for the plain single-BIT operations in those cases silently answers the wrong question rather than failing.

Two mechanical traps recur. The `Update` contract takes a **delta**, not an assignment: setting position `i` to `v` requires passing `v − current[i]` and tracking current values separately, which trips implementations ported from a segment tree's assign-style update. And the 1-indexed low-bit identity is unforgiving — a stray `0` index stalls the walk, and `i & -i` relies on two's-complement negation, so it needs a fixed-width integer type. Arbitrary-precision integers (where `-i` is not a wrapped bit pattern) or a width mismatch between the index and the loop bound break the low-bit extraction.

# Reference drawer

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
>     private readonly int[] _tree; // 1-based; slot i aggregates the (i & -i) values ending at i
>     private readonly int _n;
>
>     public FenwickTree(int n)
>     {
>         _n = n;
>         _tree = new int[n + 1];
>     }
>
>     public void Update(int i, int delta) // add delta at position i (1-based)
>     {
>         for (; i <= _n; i += i & -i)
>         {
>             _tree[i] += delta;
>         }
>     }
>
>     public int Prefix(int i) // aggregate of positions 1..i
>     {
>         var sum = 0;
>         for (; i > 0; i -= i & -i)
>         {
>             sum += _tree[i];
>         }
>
>         return sum;
>     }
>
>     public int RangeSum(int l, int r) => Prefix(r) - Prefix(l - 1);
> }
> ```
>
> `Update` applies a delta rather than assigning a value; setting position `i` to `v` means `Update(i, v - current[i])` with `current` tracked by the caller. An `O(n)` in-place build replaces `n` calls to `Update` by adding each finished slot into its parent `i + (i & -i)`.

# Questions

> [!QUESTION]- What determines how many slots a Fenwick tree operation touches?
> The set bits of the index. `Prefix(i)` reads one slot per set bit of `i` (`popcount(i)`), clearing the lowest set bit each step; `Update(i, …)` visits one slot per higher bit while adding the lowest set bit. Both are bounded by `⌊log₂ n⌋ + 1`, and the bound is deterministic rather than amortized.

> [!QUESTION]- Why can a Fenwick tree answer range sums but not range minimums?
> A range is reconstructed only as `Prefix(r) − Prefix(l − 1)`, which needs the aggregate to have an inverse. Sum has subtraction; minimum does not — `min(1..r)` and `min(1..l−1)` reveal nothing about `min(l..r)`. Non-invertible aggregates therefore need a segment tree.

> [!QUESTION]- Why is the array 1-indexed, and what breaks at index 0?
> `i & -i` isolates the lowest set bit, but `0` has none, so `0 & -0 == 0`. The update loop advances by `i += i & -i`, which never moves off `0`, and the prefix loop uses `i > 0` as its terminator. A 0-based layout stalls the walk immediately.

> [!QUESTION]- How does a Fenwick tree handle a range update with a point query?
> Not with the plain layout. It is built over a difference array: `Update(l, +delta)` and `Update(r + 1, -delta)` record the range increment, and a point query at `i` becomes `Prefix(i)`. Range update with range query extends this to two BITs run in parallel.

# References

- [Fenwick tree](https://cp-algorithms.com/data_structures/fenwick.html) — prefix and range queries, the `O(n)` build, one-based indexing, and the range-update variants built on difference arrays.
- Peter M. Fenwick, [A new data structure for cumulative frequency tables (1994)](https://doi.org/10.1002/spe.4380240306) — the original paper, framed around arithmetic-coding frequency tables and the binary-indexed decomposition.
- [Binary Indexed Trees](https://www.topcoder.com/thrive/articles/Binary%20Indexed%20Trees) — TopCoder tutorial walking the low-bit responsibility ranges and the two traversal loops with worked indices.
