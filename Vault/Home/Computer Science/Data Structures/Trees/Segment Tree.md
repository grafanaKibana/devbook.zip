---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A binary interval hierarchy for associative range queries and point updates."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A mutable array of one million latency samples must answer "maximum value in `a[l..r]`" while new samples overwrite old slots.

A segment tree keeps the array's index order but overlays a binary hierarchy of **intervals** on top of it. Each node owns a contiguous range `[l, r]` and stores one aggregate over that range. A parent's value is `merge(leftChild, rightChild)` for any associative `merge` — sum, min, max, gcd. Because a parent already summarizes its whole subtree, an arbitrary query range splits into a handful of already-computed nodes instead of touching every leaf. A scalar aggregate may discard provenance: a maximum node does not reveal which index produced it unless the stored value is enriched to `(maximum, index)`, and an average needs `(sum, count)` rather than one number.

**Core shape:** array indices → binary interval tree → each node holds `merge` over its `[l, r]`

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"segment-tree","array":[3,4,1,7,2,6,5,8]}
```

The interactive tree aligns each stored sum over the source interval it summarizes. Its controls and interval labels are one-based; the reference diagram and C# implementation below use zero-based indices. `Range sum` marks only the canonical nodes whose intervals exactly tile the request. `Set value` changes one leaf and marks the single ancestor path that must be recomputed.

Source updates persist until reset; the latest operation's marks remain until the next operation or reset.

#### Representation and Invariants

The tree has exactly `2n - 1` real nodes for `n` leaves. A common recursive implementation stores them heap-style in a flat array: the root is at index `1`, and node `i` has children `2i` and `2i + 1`. For a non-power-of-two `n`, that numbering leaves unused holes between real nodes, so allocating `4 * n` slots is a simple safe bound. A power-of-two `n` occupies indices `1` through `2n - 1` and therefore fits in an array of length `2n`.

Each node covers a fixed range decided at build time. The root covers `[0, n-1]`; a node covering `[lo, hi]` splits at `mid = (lo + hi) / 2` into `[lo, mid]` and `[mid+1, hi]`; leaves cover single elements and hold the source values directly. Two facts hold in every valid state:

1. A node's stored value equals `merge` over its entire range — for a leaf, the element itself.
2. `merge` must be **associative**, so parentheses may change while the left-to-right order stays fixed. Canonical nodes are therefore merged in array order; string concatenation and matrix multiplication remain valid even though they are not commutative. An identity element (`0` for sum, `+∞` for min) stands in for ranges that fall entirely outside a query.

Lazy propagation adds a pending tag only when the update can transform a node's aggregate in constant time and tags compose correctly. For a sum tree with range-add, applying `delta` to a node of length `len` changes its aggregate by `delta * len`; multiple add tags compose by addition. Other pairs need different laws: range-add does not automatically work with every aggregate.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Segment Tree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the indexed base array"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Build",
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
          "operation": "Range query",
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
          "operation": "Point update",
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
          "operation": "Compatible range update (lazy)",
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
          "operation": "Build",
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
          "operation": "Range query",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(log n) recursion stack",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Point update",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(log n) recursion stack",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Compatible range update (lazy)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(log n) recursion stack",
              "curveId": "log-n"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Structure Stops Fitting

The range is fixed at build. Every node's `[lo, hi]` is decided during construction, so appending an element past `n` means rebuilding. A dynamic (implicit) segment tree can allocate nodes on demand over a huge or sparse coordinate space, at the cost of pointer nodes and more memory per represented range.

Lazy propagation is where correctness slips. Pending operations must compose in the right order, and a tag must be pushed before its children are read. The rule depends on the update: adds accumulate, assignments overwrite, and a set interacts differently with an add. A missed push-down returns a plausible but stale aggregate. When range updates are unnecessary, this machinery buys nothing.

Memory is the standing cost. The `4n` reserved slots and, for lazy trees, a parallel tag array can exceed a Fenwick implementation for additive workloads. Fenwick trees can support range-add/point-query with one tree and range-add/range-sum with two. Segment trees earn their larger footprint by supporting broader associative aggregates and compatible lazy actions.

# Diagram and C# Implementation

> [!ABSTRACT]- Interval tree for `[3, 4, 1, 7, 2, 6]` (range sum)
>
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
>
> ```csharp
> public sealed class SegmentTree
> {
>     private readonly long[] _tree;
>     private readonly int _n;
>
>     public SegmentTree(long[] source)
>     {
>         ArgumentNullException.ThrowIfNull(source);
>         if (source.Length == 0)
>             throw new ArgumentException("Source must not be empty.", nameof(source));
>         _n = source.Length;
>         _tree = new long[4 * _n];
>         Build(source, node: 1, lo: 0, hi: _n - 1);
>     }
>
>     private void Build(long[] src, int node, int lo, int hi)
>     {
>         if (lo == hi) { _tree[node] = src[lo]; return; }
>         var mid = (lo + hi) / 2;
>         Build(src, 2 * node, lo, mid);
>         Build(src, 2 * node + 1, mid + 1, hi);
>         _tree[node] = _tree[2 * node] + _tree[2 * node + 1]; // merge
>     }
>
>     public void Update(int index, long value)
>     {
>         ArgumentOutOfRangeException.ThrowIfNegative(index);
>         if (index >= _n) throw new ArgumentOutOfRangeException(nameof(index));
>         Update(1, 0, _n - 1, index, value);
>     }
>
>     private void Update(int node, int lo, int hi, int index, long value)
>     {
>         if (lo == hi) { _tree[node] = value; return; }
>         var mid = (lo + hi) / 2;
>         if (index <= mid) Update(2 * node, lo, mid, index, value);
>         else              Update(2 * node + 1, mid + 1, hi, index, value);
>         _tree[node] = _tree[2 * node] + _tree[2 * node + 1]; // merge
>     }
>
>     public long Query(int l, int r)
>     {
>         if (l < 0 || l > r || r >= _n)
>             throw new ArgumentOutOfRangeException(nameof(l), "Require 0 <= l <= r < Length.");
>         return Query(1, 0, _n - 1, l, r);
>     }
>
>     private long Query(int node, int lo, int hi, int l, int r)
>     {
>         if (r < lo || hi < l) return 0;             // outside: identity
>         if (l <= lo && hi <= r) return _tree[node]; // fully covered
>         var mid = (lo + hi) / 2;
>         return Query(2 * node, lo, mid, l, r)
>              + Query(2 * node + 1, mid + 1, hi, l, r); // merge
>     }
> }
> ```
> Swapping the three `// merge` sites and the outside-identity for `Math.Min`/`long.MaxValue` turns this into a range-min tree with no structural change. Range updates require a parallel `_lazy[]` array plus a push-down step before each descent — the deferred-tag layer omitted here.

# References

- [Segment tree](https://cp-algorithms.com/data_structures/segment_tree.html)
- [AtCoder Library: Segment Tree](https://atcoder.github.io/ac-library/production/document_en/segtree.html)
