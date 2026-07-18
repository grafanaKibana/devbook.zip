---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A binary interval hierarchy answering associative range queries and point updates in O(log n)."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A mutable array of one million latency samples must answer "maximum value in `a[l..r]`" while new samples keep overwriting old slots. A raw scan costs `O(n)` per query. A [[Prefix Sum]] array answers in `O(1)` but only for invertible aggregates, and every write invalidates `O(n)` prefixes — so it collapses the moment updates interleave with queries, and it never supported max in the first place.

A segment tree keeps the array's index order but overlays a binary hierarchy of **intervals** on top of it. Each node owns a contiguous range `[l, r]` and stores one aggregate over that range; a parent's value is `merge(leftChild, rightChild)` for any associative `merge` — sum, min, max, gcd. Because a parent already summarizes its whole subtree, an arbitrary query range splits into a handful of already-computed nodes instead of touching every leaf. What the structure gives up is the raw per-element view: a node knows its range's aggregate, not which element produced it, so anything depending on the merge being invertible (an average from a running count, a subtractive prefix trick) has to be reconstructed rather than read off.

**Core shape:** array indices → binary interval forest → each node holds `merge` over its `[l, r]` → any range = `O(log n)` covering nodes → `O(n)` storage (`2n`–`4n` slots).

> [!NOTE] Visualization pending
> Planned StepTrace: an interval-tree card showing a range query fracturing `[l, r]` into its `O(log n)` canonical covering nodes, then a point update walking a single leaf-to-root path and re-merging each ancestor. No matching renderer exists in `engine.js` yet.

# Representation and invariants

The tree is stored heap-style in a flat array, not as linked nodes. With the root at index `1`, node `i` has children `2i` and `2i + 1`, so navigation is arithmetic and the whole structure is one contiguous allocation. A recursive build over an arbitrary `n` can reach index `4n − 1` in the worst case (an unbalanced right spine of a non-power-of-two range), so `4 * n` slots is the standard safe bound; a power-of-two `n` fits in `2n`.

Each node covers a fixed range decided at build time. The root covers `[0, n-1]`; a node covering `[lo, hi]` splits at `mid = (lo + hi) / 2` into `[lo, mid]` and `[mid+1, hi]`; leaves cover single elements and hold the source values directly. Three facts hold in every valid state:

1. A node's stored value equals `merge` over its entire range — for a leaf, the element itself.
2. `merge` must be **associative**, so regrouping the covering nodes in any order yields the same answer. An identity element (`0` for sum, `+∞` for min) stands in for ranges that fall entirely outside a query.
3. A point update touches only the `O(log n)` nodes on one root-to-leaf path; every other node's invariant is untouched because its range didn't change.

Lazy propagation adds a second per-node field: a pending tag describing a deferred range operation ("add `x` to this whole range"). The tag is applied to the node's own aggregate immediately but **pushed down** to children only when a later query or update descends past that node. This keeps a range update from having to rewrite every leaf under it — the tag records the intent and settles the debt lazily, so range update and range query both stay `O(log n)`.

# Complexity

| Operation | Time | Space | Cause |
| --- | --- | --- | --- |
| Build | `O(n)` | `O(n)` structure (`2n`–`4n` slots) | Each node is computed once from its two children, bottom-up over `2n`–`4n` nodes. |
| Range query | `O(log n)` | `O(log n)` recursion stack | Any `[l, r]` decomposes into `O(log n)` canonical fully-covered nodes; at each level at most two ranges are partially covered and recursed. |
| Point update | `O(log n)` | `O(log n)` recursion stack | Only the ancestors on one leaf-to-root path change, and each is re-merged from its children. |
| Range update (lazy) | `O(log n)` | `O(log n)` recursion stack | A range splits into `O(log n)` covering nodes that receive a pending tag instead of a full subtree rewrite. |

Structure space is `O(n)` overall but with a constant near `4` — materially larger than a Fenwick tree's exact `n`. The `O(log n)` per-operation space is recursion-stack depth; an iterative bottom-up variant reduces it to `O(1)` for point-update/query trees, though lazy propagation is awkward to express iteratively.

# When the structure stops fitting

The range is fixed at build. Because every node's `[lo, hi]` is decided during construction, the structure is not a resizable array — appending an element past `n` means rebuilding. A dynamic (implicit) segment tree that allocates nodes on demand over a huge or sparse coordinate space exists, but it trades the flat array for pointer nodes and more memory per used range.

Lazy propagation is where correctness slips. The deferred-tag machinery has to compose two pending operations, push a tag before reading children, and clear it after — and the composition rule is operation-specific (adds accumulate; assignments overwrite; a "set" tag interacts differently with an "add" tag). A missed push-down returns a stale aggregate that reads plausibly, so the bug surfaces as a wrong sum rather than a crash. This is the intricate part of the structure and the reason a plainer alternative wins when range updates aren't actually needed.

Memory is the standing cost. The `≈4n` slots and, for lazy trees, a parallel tag array roughly double the footprint of a Fenwick tree that could answer the same sum query — the price paid for supporting non-invertible aggregates and range updates the Fenwick structure cannot represent.

# Reference drawer

> [!ABSTRACT]- Interval tree for `[3, 4, 1, 7, 2, 6]` (range sum)
> ```mermaid
> graph TD
>   A["[0,5] = 23"] --> B["[0,2] = 8"]
>   A --> C["[3,5] = 15"]
>   B --> D["[0,1] = 7"]
>   B --> E["[2,2] = 1"]
>   D --> H["[0,0] = 3"]
>   D --> I["[1,1] = 4"]
>   C --> F["[3,4] = 9"]
>   C --> G["[5,5] = 6"]
>   F --> J["[3,3] = 7"]
>   F --> K["[4,4] = 2"]
> ```
> `query(2, 4)` stitches `[2,2]=1` and `[3,4]=9` for `10`, reading two stored nodes instead of three leaves.

> [!EXAMPLE]- C# implementation (build + point update + range query)
> ```csharp
> public sealed class SegmentTree
> {
>     private readonly int[] _tree;
>     private readonly int _n;
>
>     public SegmentTree(int[] source)
>     {
>         _n = source.Length;
>         _tree = new int[4 * _n];
>         Build(source, node: 1, lo: 0, hi: _n - 1);
>     }
>
>     private void Build(int[] src, int node, int lo, int hi)
>     {
>         if (lo == hi) { _tree[node] = src[lo]; return; }
>         var mid = (lo + hi) / 2;
>         Build(src, 2 * node, lo, mid);
>         Build(src, 2 * node + 1, mid + 1, hi);
>         _tree[node] = _tree[2 * node] + _tree[2 * node + 1]; // merge
>     }
>
>     public void Update(int index, int value) => Update(1, 0, _n - 1, index, value);
>
>     private void Update(int node, int lo, int hi, int index, int value)
>     {
>         if (lo == hi) { _tree[node] = value; return; }
>         var mid = (lo + hi) / 2;
>         if (index <= mid) Update(2 * node, lo, mid, index, value);
>         else              Update(2 * node + 1, mid + 1, hi, index, value);
>         _tree[node] = _tree[2 * node] + _tree[2 * node + 1]; // merge
>     }
>
>     public int Query(int l, int r) => Query(1, 0, _n - 1, l, r);
>
>     private int Query(int node, int lo, int hi, int l, int r)
>     {
>         if (r < lo || hi < l) return 0;             // outside: identity
>         if (l <= lo && hi <= r) return _tree[node]; // fully covered
>         var mid = (lo + hi) / 2;
>         return Query(2 * node, lo, mid, l, r)
>              + Query(2 * node + 1, mid + 1, hi, l, r); // merge
>     }
> }
> ```
> Swapping the three `// merge` sites and the outside-identity for `Math.Min`/`int.MaxValue` turns this into a range-min tree with no structural change. Range updates require a parallel `_lazy[]` array plus a push-down step before each descent — the deferred-tag layer omitted here.

# Questions

> [!QUESTION]- How is a segment tree laid out in memory, and why `4n` slots?
> A flat array indexed heap-style: the root at `1`, node `i`'s children at `2i` and `2i + 1`. A recursive build over a non-power-of-two `n` can reach index `4n − 1` on an unbalanced spine, so `4 * n` is the safe allocation; a power-of-two `n` needs only `2n`.

> [!QUESTION]- Why does a range query cost `O(log n)` instead of touching every element in the range?
> Any `[l, r]` decomposes into at most `O(log n)` canonical nodes whose ranges lie fully inside it. Each such node's aggregate is already computed, so the query reads it and stops descending, never reaching the leaves beneath.

> [!QUESTION]- What does lazy propagation defer, and how does that failure show up?
> A range update stores a pending tag on each covering node instead of rewriting its whole subtree; the tag is pushed to children only when a later operation descends past that node. Forgetting a push-down returns a stale aggregate — a plausibly-wrong number, not a crash — which makes it the bug-prone part of the structure.

# References

- [Segment tree](https://cp-algorithms.com/data_structures/segment_tree.html) — recursive construction, range query, point and lazy range updates, and the `4n` sizing argument.
- [Efficient and easy segment trees (Codeforces, Al.Cash)](https://codeforces.com/blog/entry/18051) — the iterative bottom-up variant that stores exactly `2n` slots for point-update trees.
- [Sparse Table](https://cp-algorithms.com/data_structures/sparse-table.html) — the `O(1)`-query static structure for idempotent range aggregates, contrasted against the mutable segment tree.
