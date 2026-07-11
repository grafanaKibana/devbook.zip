---
publish: true
created: 2026-07-11T21:48:04.061Z
modified: 2026-07-11T21:48:04.061Z
published: 2026-07-11T21:48:04.061Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A heap-ordered binary tree whose null-path-length invariant gives merge in O(log n) worst case.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

A leftist heap is a heap-ordered binary tree built around one primitive: **merge in O(log n) worst case**. Everything else is a merge — insert is merge-with-singleton, extractMin is merge-the-two-subtrees. The trick is an invariant that keeps the _right spine_ short, so merge only ever recurses down the right edge.

Each node stores its **null path length (npl)** — the distance to the nearest missing child (`npl(null) = 0`, a leaf has npl 1). The leftist invariant: `npl(left) ≥ npl(right)` at every node. The tree can be arbitrarily deep and lopsided to the left; what's bounded is the right spine — a right spine of length r forces ≥ 2^r − 1 nodes, so it is at most log(n+1).

## Merge

Recurse down the right spines only: the root with the smaller key wins, and its right child is merged with the other heap. On the way back up, restore the invariant — if the right child's npl exceeds the left's, swap the children — and recompute `npl = npl(right) + 1`.

```csharp
static Node? Merge(Node? a, Node? b)
{
    if (a is null) return b;
    if (b is null) return a;
    if (b.Key < a.Key) (a, b) = (b, a);      // smaller root wins

    a.Right = Merge(a.Right, b);              // recurse down right spine only
    if (Npl(a.Left) < Npl(a.Right))
        (a.Left, a.Right) = (a.Right, a.Left); // restore leftist invariant
    a.Npl = Npl(a.Right) + 1;
    return a;
}
```

Both right spines are O(log n), so merge — and therefore insert and extractMin — is **O(log n) worst case**, deterministic, no amortization needed.

## Where it sits

Choose a leftist heap when you need melding with _worst-case_ bounds and want something implementable in ~30 lines — it's far simpler than [[Binomial Queues]] or [[Fibonacci Heaps]]. It also merges cleanly as a persistent/immutable structure (popular in functional languages), since merge builds a new right spine without touching left subtrees. If you don't need melding at all, an array-backed binary heap wins on locality; if you don't need worst-case bounds, a [[Skew Heaps|skew heap]] is the same idea minus the npl bookkeeping.

## Questions

> [!QUESTION]- What invariant does a leftist heap maintain, and what does it buy?
> `npl(left) ≥ npl(right)` at every node, where npl is the distance to the nearest missing child. It forces the right spine to length ≤ log(n+1), and since merge recurses only down right spines, merge is O(log n) worst case.

> [!QUESTION]- Why is a leftist heap allowed to be wildly unbalanced?
> Because no operation walks the left side. Merge, insert, and extractMin all traverse right spines only; the left subtrees can form long chains without affecting any operation's cost. The invariant bounds the one path that matters, not the height.

> [!QUESTION]- How do insert and extractMin reduce to merge?
> Insert merges the heap with a single-node heap. ExtractMin removes the root and merges its left and right subtrees. One correct merge function gives you the whole API.

## References

- [Leftist tree (Wikipedia)](https://en.wikipedia.org/wiki/Leftist_tree) — invariant, right-spine bound proof, and s-value (npl) definitions.
- [Okasaki, _Purely Functional Data Structures_ (1996 thesis, ch. 3)](https://www.cs.cmu.edu/~rwh/students/okasaki.pdf) — leftist heaps as the canonical persistent mergeable heap, with ML implementations.
