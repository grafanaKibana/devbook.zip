---
publish: true
created: 2026-07-12T14:27:20.426Z
modified: 2026-07-12T14:27:20.426Z
published: 2026-07-12T14:27:20.426Z
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

Two priority queues need to become one. An array-backed [[Heap]] cannot do this cheaply: merging two heaps of size `n` means dumping both into a buffer and rebuilding, which is `O(n)`. A leftist heap stores the same heap-ordered keys as an explicit binary tree and adds one field per node so that melding two heaps touches only a logarithmic slice of each.

That field is the **null-path length** (npl, also called rank or s-value): the distance from a node to the nearest missing child, with `npl(null) = 0` and a leaf at `1`. The **leftist property** holds `npl(left) ≥ npl(right)` at every node. Consequently the right spine — the path from the root that always steps to the right child — has length at most `log(n + 1)`, because a right spine of length `r` forces at least `2^r − 1` nodes below it. Merge walks only the right spines, so it stays logarithmic in the worst case, not merely on average.

The tradeoff is shape. The tree is heap-ordered but deliberately left-heavy and can be arbitrarily deep; there is no balance guarantee on height, no index arithmetic, and no cache-friendly contiguous layout. What is bounded is exactly the one path merge uses.

**Core shape:** heap-ordered binary tree + npl per node → leftist invariant bounds the right spine to `O(log n)` → merge two heaps by recursing down their right spines → insert and extract-min are both merges.

> [!NOTE] Visualization pending
> Planned StepTrace: a mergeable-heap card showing two heaps merged by recursing down their right spines, comparing roots, then swapping children where the leftist rank demands it — keeping the right spine short. No matching renderer exists in `engine.js` yet.

## Merge, and why the right spine stays short

Every mutation is a merge of two heaps `a` and `b`:

1. If either is empty, the other is the result.
2. Otherwise the root with the smaller key becomes the merged root (heap order). Say that is `a`.
3. Recursively merge `a.Right` with the whole of `b`. The recursion therefore descends the right spine of one heap at a time — never the left subtrees.
4. On the way back up, if the returned right child now has a larger npl than the left child, **swap the two children**. Then set `npl(a) = npl(a.Right) + 1`.

Step 4 is the load-bearing move. After the recursive merge, the right subtree may have grown taller than the left, which would violate `npl(left) ≥ npl(right)` and let the right spine lengthen. The swap restores the invariant by pushing the heavier subtree to the left, where no operation walks it. The npl recomputation propagates the new rank up so every ancestor's invariant is re-established as the recursion unwinds.

Both right spines are `O(log n)`, and the recursion consumes one right-spine node per level, so a merge does `O(log n)` comparisons and swaps. Nothing here is amortized: the bound holds for every individual merge.

**insert** merges the heap with a one-node heap. **extract-min** returns the root and merges the root's left and right subtrees back together. A single correct merge yields the entire API, and every operation inherits its `O(log n)` worst-case bound. **find-min** just reads the root.

## Complexity

Bounds are worst-case per operation and assume the leftist invariant is maintained after every merge step.

| Operation | Best time | Worst time | Structure space | Aux space per op | Cause |
| --- | --- | --- | --- | --- | --- |
| `Merge(a, b)` | `O(1)` | `O(log n)` | `Θ(n)` nodes + one npl field each | `O(log n)` recursion stack | Recurses only the two right spines, each bounded by the leftist invariant to `≤ log(n + 1)` |
| `Insert(x)` | `O(1)` | `O(log n)` | `O(1)` new node | `O(log n)` | Merge with a singleton; cost is one right-spine walk |
| `ExtractMin()` | `O(log n)` | `O(log n)` | `O(1)` | `O(log n)` | Merges the removed root's two subtrees — again one right-spine walk |
| `FindMin()` | `O(1)` | `O(1)` | `O(1)` | `O(1)` | Minimum is the root by heap order |

Structure space is `Θ(n)` for the nodes plus one integer npl per node; the pointer-based layout also carries two child references per node, unlike an array heap's implicit indexing. Auxiliary space is the recursion stack, proportional to the right-spine length; an iterative bottom-up merge that first collects both right spines can bring that to `O(1)` at the cost of more code.

## Where the invariant is load-bearing

The child swap in step 4 is not cosmetic. Omit it and a sequence of merges can leave the right subtree consistently deeper than the left; the right spine then grows toward `O(n)`, and because merge walks that spine, every operation degrades to linear. The `O(log n)` guarantee is a direct consequence of restoring `npl(left) ≥ npl(right)` after each step, nothing else enforces it.

The npl bookkeeping must be updated on every merge, not lazily. The swap decision at each level reads the children's current npl values, so a stale rank on a subtree can cause a wrong swap — or a skipped one — and silently corrupt the bound for all ancestors. The field is part of the invariant, not a cached hint.

These are worst-case bounds. That is the whole reason to pay for the npl field: a [[Skew Heaps|skew heap]] performs the same right-spine merge and unconditional swap without storing npl, and gets `O(log n)` only _amortized_ — an individual meld there can be linear, offset by cheaper later ones. A leftist heap trades that field for a per-operation guarantee.

## Reference drawer

> [!ABSTRACT]- Leftist structure and the right spine
>
> ```mermaid
> flowchart TD
>   R((2 · npl 2))
>   R --> L((5 · npl 2))
>   R --> RS((4 · npl 1))
>   L --> LL((9 · npl 1))
>   L --> LR((6 · npl 1))
>   RS --> RSL((8 · npl 1))
> ```
>
> Merge descends the right children only (`2 → 4 → …`). Heavier subtrees are pushed left, where `npl(left) ≥ npl(right)` holds at each node.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class LeftistHeap
> {
>     private sealed class Node
>     {
>         public int Key;
>         public int Npl;
>         public Node? Left, Right;
>         public Node(int key) { Key = key; Npl = 1; }
>     }
>
>     private Node? _root;
>
>     private static int Npl(Node? n) => n?.Npl ?? 0;
>
>     private static Node? Merge(Node? a, Node? b)
>     {
>         if (a is null) return b;
>         if (b is null) return a;
>         if (b.Key < a.Key) (a, b) = (b, a);   // smaller key becomes the root
>
>         a.Right = Merge(a.Right, b);          // recurse down the right spine only
>         if (Npl(a.Left) < Npl(a.Right))
>             (a.Left, a.Right) = (a.Right, a.Left); // restore npl(left) >= npl(right)
>         a.Npl = Npl(a.Right) + 1;
>         return a;
>     }
>
>     public void Insert(int key) => _root = Merge(_root, new Node(key));
>     public int FindMin() => _root!.Key;
>
>     public int ExtractMin()
>     {
>         var min = _root!.Key;
>         _root = Merge(_root.Left, _root.Right);
>         return min;
>     }
> }
> ```
>
> The swap and the `a.Npl` update are the two lines that keep the right spine short; dropping either forfeits the worst-case bound.

## Questions

> [!QUESTION]- What does the leftist invariant bound, and how does that make merge logarithmic?
> `npl(left) ≥ npl(right)` at every node forces the right spine to length `≤ log(n + 1)`, since a right spine of length `r` requires at least `2^r − 1` nodes. Merge recurses only down the two right spines, so it does `O(log n)` work in the worst case.

> [!QUESTION]- Why swap children after each recursive merge step?
> The recursive merge attaches the result as the right child, which may make the right subtree deeper than the left and violate the invariant. Swapping pushes the heavier subtree to the left — where no operation walks it — keeping the right spine short. Omitting the swap lets the right spine grow to `O(n)` and degrades every operation to linear.

> [!QUESTION]- How do insert and extract-min reduce to merge?
> Insert merges the heap with a single-node heap. Extract-min removes the root and merges its left and right subtrees. One correct merge implements the whole API and every operation inherits its `O(log n)` worst-case bound.

## References

- [Leftist tree (Wikipedia)](https://en.wikipedia.org/wiki/Leftist_tree) — s-value (npl) definition, the leftist invariant, and the right-spine length proof.
- [Okasaki, _Purely Functional Data Structures_ (thesis, ch. 3)](https://www.cs.cmu.edu/~rwh/students/okasaki.pdf) — leftist heaps as the canonical persistent mergeable heap, with ML implementations and the merge-based API.
- Mark Allen Weiss, _Data Structures and Algorithm Analysis in C++_, ch. 6 (Priority Queues) — the null-path-length invariant, the worst-case merge along right paths, and the npl-maintaining implementation this note follows.
