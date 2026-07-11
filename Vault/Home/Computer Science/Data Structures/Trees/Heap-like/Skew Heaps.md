---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A leftist heap with the bookkeeping removed: merge swaps children unconditionally, self-adjusting for amortized O(log n) bounds."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A skew heap is a [[Leftist Heaps|leftist heap]] with the bookkeeping deleted. No null path length stored, no invariant checked — merge walks down the right spines exactly as in a leftist heap, but **swaps the children at every node unconditionally** on the way back. That blind swap is the whole balancing strategy: a right path that just got longer is immediately rotated to the left, where merge never looks. Sleator and Tarjan introduced it (1986) as a self-adjusting heap — the same design philosophy as the splay tree: no per-node metadata, restructure on every access, prove the bounds amortized.

The delta from leftist merge is one line — replace "swap if npl violated, then recompute npl" with:

```csharp
a.Right = Merge(a.Right, b);
(a.Left, a.Right) = (a.Right, a.Left);   // always swap — no npl, no condition
return a;
```

Insert and extractMin reduce to merge exactly as in the leftist heap.

## The cost of dropping the invariant

A single merge can be **O(n)** — nothing stops a bad right spine from existing momentarily. The amortized bound is **O(log n)** per operation (tight bound: log-phi n ≈ 1.44 log₂ n, via a potential function counting "heavy" nodes — those whose right subtree outweighs their left). The unconditional swap guarantees any expensive merge leaves the heap in a shape that makes following merges cheap.

| | Skew | [[Leftist Heaps|Leftist]] |
|---|---|---|
| Merge / Insert / ExtractMin | O(log n) **amortized** | O(log n) **worst case** |
| Per-node storage | 2 pointers + key | 2 pointers + key + npl |
| Merge code | ~10 lines | ~15 lines |

Pick skew over leftist when you're fine with amortized bounds and want the smallest possible mergeable heap — it's slightly faster in practice too (no npl reads/writes). Pick leftist when a single operation must not spike, or when using the heap **persistently**: sharing subtrees across versions breaks the amortized analysis (the same expensive shape can be re-merged from an old version repeatedly), while leftist worst-case bounds survive persistence. Neither has a cheap decreaseKey — that's [[Fibonacci Heaps]] territory — and neither beats an array-backed binary [[Heap]] when you never meld.

## Questions

> [!QUESTION]- Why is a skew heap simpler than a leftist heap?
> It stores no null path lengths and checks no invariant. Merge recurses down the right spines and swaps children unconditionally at every node on the way back — self-adjustment replaces the stored-metadata invariant, at the cost of worst-case → amortized bounds.

> [!QUESTION]- How can O(log n) amortized hold when one merge can be O(n)?
> Potential-function argument: define a node as heavy when its right subtree has more nodes than its left. An expensive merge traverses many heavy nodes, but the unconditional swaps turn them light — the traversal pays down potential built up by earlier cheap operations, and leaves the heap cheap to merge again.

> [!QUESTION]- When would you take a leftist heap over a skew heap despite the extra bookkeeping?
> When per-operation worst-case bounds matter (latency-sensitive paths), or when the heap is used persistently/immutably — re-merging a shared expensive shape from an old version repeatedly defeats amortized accounting, while leftist O(log n) is per-operation and survives sharing.

## References

- [Sleator & Tarjan, "Self-Adjusting Heaps" (SIAM J. Comput. 1986)](https://www.cs.cmu.edu/~sleator/papers/adjusting-heaps.pdf) — the original paper with the amortized analysis.
- [Skew heap (Wikipedia)](https://en.wikipedia.org/wiki/Skew_heap) — merge walkthrough and the log-phi amortized bound.
