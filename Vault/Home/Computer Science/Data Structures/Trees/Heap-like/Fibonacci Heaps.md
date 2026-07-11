---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A lazy binomial queue that defers work to extractMin, buying O(1) amortized decreaseKey and meld."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A Fibonacci heap is what you get by taking [[Binomial Queues]] and postponing all the work: meld, insert, and decreaseKey do the bare minimum now and leave cleanup to the next extractMin. That laziness buys **O(1) amortized decreaseKey and meld** — the bounds that made it famous: it drops Dijkstra from O(m log n) to O(m + n log n) and Prim likewise. Fredman and Tarjan designed it in 1984 specifically for that analysis, and it remains mostly a theoretical device: in benchmarks an array-backed binary or quaternary heap (what .NET's `PriorityQueue<TElement, TPriority>` is) usually wins on constants and cache behavior.

## How It Works

The heap is a circular doubly-linked **root list** of heap-ordered trees, with a pointer to the minimum root. Every operation except extractMin is deliberately lazy:

- **Insert / Meld** — splice into the root list, update the min pointer. O(1), no linking, no comparisons beyond one.
- **ExtractMin** — pays the deferred bill. Remove the min root, splice its children into the root list, then **consolidate**: repeatedly link roots of equal degree (as in a binomial queue) until all root degrees are distinct. O(log n) amortized — the potential built up by all those lazy inserts funds the linking.
- **DecreaseKey** — decrease the key in place; if heap order with the parent breaks, **cut** the node and splice it into the root list. O(1) amortized.

**Cascading cuts** keep this honest. Each node has a *marked* flag: losing a first child marks it; losing a second cuts it too, recursively up the tree. This bounds how thin a tree can get — a node of degree k retains at least F(k+2) descendants (Fibonacci numbers, hence the name), so degrees stay O(log n) and consolidation stays cheap. Without cascading cuts, repeated decreaseKeys could strip trees down until extractMin degenerates.

## Complexity (amortized)

| Operation | Fibonacci | [[Binomial Queues]] | Binary [[Heap]] |
|---|---|---|---|
| Insert | **O(1)** | O(1) am. | O(log n) |
| Meld | **O(1)** | O(log n) | O(n) |
| ExtractMin | O(log n) | O(log n) | O(log n) |
| DecreaseKey | **O(1)** | O(log n) | O(log n) |

Worst cases are bad — a single extractMin can be O(n) if it consolidates a long root list — so the bounds are useless where per-operation latency matters (real-time systems).

## Why it loses in practice

Each node carries four pointers (parent, child, left, right) plus degree and mark — heavy allocation and pointer-chasing versus a heap's flat array with sequential index arithmetic. Dijkstra on real (sparse) graphs runs faster with a binary/quaternary heap plus lazy deletion; .NET leans into this by shipping `PriorityQueue` with **no decreaseKey and no meld at all** (see the lazy-deletion pattern in [[Heap]]). Reach for Fibonacci heaps when writing proofs, not services. If you genuinely need O(1) worst-case (not amortized) bounds, the strict Fibonacci heap (Brodal et al., 2012) exists — with even worse constants.

## Questions

> [!QUESTION]- Why are Fibonacci heaps famous in graph algorithms?
> Amortized O(1) decreaseKey. Dijkstra performs up to m decreaseKeys and n extractMins; with a binary heap that's O(m log n), with a Fibonacci heap O(m + n log n) — an asymptotic win on dense graphs. In practice the pointer-heavy nodes and cache misses usually make array-backed heaps faster anyway.

> [!QUESTION]- What problem do cascading cuts solve?
> They stop trees from getting too thin. DecreaseKey cuts nodes out of trees; unchecked, a node of high degree could lose almost all descendants, breaking the size-vs-degree relationship that keeps consolidation O(log n). The mark-then-cut rule guarantees a degree-k node keeps ≥ F(k+2) descendants, capping degrees at O(log n).

> [!QUESTION]- Where does the O(1) cost of insert "go"?
> Into the potential function (number of roots + 2 × marked nodes). Insert adds a root, raising potential; extractMin's consolidation pass links those roots and spends the saved potential. Amortized accounting shifts the cost of linking from many cheap inserts to the occasional extractMin.

## References

- [Fredman & Tarjan, "Fibonacci heaps and their uses in improved network optimization algorithms" (JACM 1987)](https://dl.acm.org/doi/10.1145/28869.28874) — the original paper, including the Dijkstra/Prim improvements.
- [Fibonacci heap (Wikipedia)](https://en.wikipedia.org/wiki/Fibonacci_heap) — the potential-function analysis and the degree bound proof.
- [Larkin, Sen & Tarjan, "A back-to-basics empirical study of priority queues" (ALENEX 2014)](https://arxiv.org/abs/1403.0252) — benchmarks showing implicit d-ary heaps beating Fibonacci heaps on real workloads.
