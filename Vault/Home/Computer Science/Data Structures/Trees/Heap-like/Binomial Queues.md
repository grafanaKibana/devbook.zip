---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A forest of binomial trees mirroring the item count's binary form, giving O(log n) meld."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A binomial queue (binomial heap) represents a priority queue not as one tree but as a **forest of binomial trees** — at most one tree per rank, mirroring the binary representation of the item count. A queue with 13 items (binary `1101`) holds trees of ranks 3, 2, and 0, sized 8 + 4 + 1. This layout exists for one reason: **meld in O(log n)**. Merging two array-backed [[Heap|binary heaps]] costs O(n) (concatenate + re-heapify); merging two binomial queues works like adding two binary numbers.

A binomial tree of rank k is defined recursively: two rank-(k−1) trees, one linked as the leftmost child of the other's root. It has exactly 2^k nodes, and its root has k children of ranks k−1 … 0.

## Meld = binary addition

Walk both forests rank by rank. Two trees of the same rank **link** in O(1): the root with the larger key becomes a child of the other, producing one tree of rank+1 — a carry, propagated exactly like binary addition. At most O(log n) ranks exist, so meld is O(log n) worst case.

Everything else reduces to meld:

- **Insert** — meld with a single-node queue (adding 1; amortized O(1), since most inserts stop at the first empty rank).
- **ExtractMin** — the minimum is one of the ≤ log n roots. Remove that root; its children are themselves a valid binomial forest, so meld them back in. O(log n).
- **Peek** — scan the roots: O(log n), or O(1) if you cache a min-pointer.

```text
13 items: ranks {3,2,0}   +   6 items: ranks {2,1}
rank 0: 1 + 0 = 1                 → keep rank-0 tree
rank 1: 0 + 1 = 1                 → keep rank-1 tree
rank 2: 1 + 1 = 0 carry 1         → link the two rank-2 trees
rank 3: 1 + 0 + carry = 0 carry 1 → link again
rank 4: carry = 1                 → one rank-4 tree
19 items: ranks {4,1,0} ✓  (13 + 6 = 19 = 10011₂)
```

## Complexity

| Operation | Binomial queue | Binary [[Heap]] |
|---|---|---|
| Meld | **O(log n)** | O(n) |
| Insert | O(1) amortized, O(log n) worst | O(log n) |
| ExtractMin | O(log n) | O(log n) |
| DecreaseKey | O(log n) (bubble up within a tree) | O(log n) — absent from .NET's `PriorityQueue` |

The price is pointer-based nodes: each link is an allocation and a cache miss, so for a plain non-melding priority queue a binary heap is flatly faster. [[Fibonacci Heaps]] take this design and make meld and decreaseKey lazy for better amortized bounds; [[Leftist Heaps]] get O(log n) meld with a far simpler single-tree structure.

## Questions

> [!QUESTION]- Why does a binomial queue make merge efficient?
> The forest mirrors the binary representation of n — at most one tree per rank. Melding walks the ranks like binary addition: equal-rank trees link in O(1) (larger root becomes a child), producing a carry. With O(log n) ranks, the whole meld is O(log n), versus O(n) to merge two array-backed binary heaps.

> [!QUESTION]- How does extractMin work when the heap is a forest, not one tree?
> The minimum must be one of the roots (heap order holds within each tree), so scan the ≤ log n roots. Removing a rank-k root leaves its k children — ranks k−1 … 0, exactly a valid binomial forest — which are melded back into the queue. Total O(log n).

> [!QUESTION]- Why is insert amortized O(1) when the worst case is O(log n)?
> Insert is a binary increment. A long carry chain (linking at every rank) only happens after many cheap inserts left those ranks filled — the same potential argument as incrementing a binary counter, which is amortized O(1) per increment.

## References

- [Vuillemin, "A data structure for manipulating priority queues" (CACM 1978)](https://dl.acm.org/doi/10.1145/359460.359478) — the original binomial queue paper.
- [Binomial heap (Wikipedia)](https://en.wikipedia.org/wiki/Binomial_heap) — rank definitions, meld walkthrough, and the amortized insert analysis.
