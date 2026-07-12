---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A leftist heap without the bookkeeping, self-adjusting for amortized O(log n) merge."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A priority queue built on an array [[Heap]] answers find-min and extract-min cheaply, but melding two such heaps into one means rebuilding: `O(n)` work to reheapify the concatenation. When two priority queues must combine repeatedly — merging event streams, uniting sub-schedules — the melding cost dominates. A skew heap keeps only a heap-ordered binary tree and makes merge the primitive: two heaps combine by walking down their right spines, and insert and extract-min are defined in terms of that merge.

The structure is the self-adjusting cousin of a [[Leftist Heaps|leftist heap]]. A leftist heap stores a null-path-length field per node and swaps children only when that field would be violated, buying a per-operation worst-case bound. A skew heap deletes the field entirely: after merging down a right spine it **swaps the two children at every touched node unconditionally** — no test, no bookkeeping. The blind swap moves a right path that just grew back to the left, where the next merge never looks. What can no longer be read off a node is its rank; balance exists only in the amortized aggregate, not as a checkable invariant.

**Core shape:** heap-ordered binary tree, no rank field → merge recurses down right spines → swap children at every merged node → amortized `O(log n)` per operation, `O(n)` structure space.

> [!NOTE] Visualization pending
> Planned StepTrace: a heap-merge card showing two heaps merged down their right spines, with the children swapped unconditionally after each link so the long right path folds to the left — no rank field, self-adjusting. No matching renderer exists in `engine.js` yet.

## Why the blind swap balances

Merge takes two heap roots and compares them. The smaller root becomes the result's root; its right subtree is merged recursively with the other whole heap; then the root's two children are swapped. Only the right spine is ever descended, so the recursion depth is the combined right-spine length of the two inputs.

Without the swap, that right spine only ever grows — repeated merges could stack the whole heap along one right path, and a single merge would cost `O(n)` forever. The unconditional swap breaks that: every node on the traversed spine has its freshly extended right child rotated to the left, out of the path future merges follow. A leftist heap achieves the same shortening deliberately, keeping the shorter subtree on the right by consulting the stored null-path length; the skew heap achieves it blindly, and pays for the difference in the analysis rather than in per-node memory.

The invariant that survives every operation is heap order alone: a parent key never exceeds a child key. There is no structural invariant on shape — a skew heap can momentarily be a long right chain. Insert merges a singleton node into the heap. Extract-min removes the root and merges its two children. Both inherit merge's cost profile exactly.

## Complexity

| Operation | Best time | Amortized time | Worst single op | Space | Cause |
| --- | --- | --- | --- | --- | --- |
| `Merge(a, b)` | `O(1)` | `O(log n)` | `O(n)` | `O(n)` structure, no per-node field | Descends the combined right spines; the swap keeps them short in aggregate, not on any one call |
| `Insert(x)` | `O(1)` | `O(log n)` | `O(n)` | `O(log n)` amortized stack | Merge of a singleton into the heap |
| `ExtractMin()` | `O(1)` | `O(log n)` | `O(n)` | `O(log n)` amortized stack | Removes the root, then merges its two children |
| `FindMin()` | `O(1)` | `O(1)` | `O(1)` | `O(1)` | The minimum is the root |

The `O(log n)` figures are amortized over a sequence of operations, established by a potential argument, not a worst-case guarantee. A node is counted "heavy" when its right subtree holds more nodes than its left; a potential function over heavy nodes shows an expensive merge must traverse many of them, and each unconditional swap turns a heavy node light, so the traversal discharges potential that earlier cheap operations stored. The tight per-operation amortized bound is `log_φ n ≈ 1.44 log₂ n`.

A single `Merge` can still cost `O(n)`: nothing prevents a momentarily long right spine from existing, and one call may descend all of it. The structure space is `O(n)` with only two child pointers and a key per node — the leftist heap's extra null-path-length field is exactly what the skew heap removes, its edge on memory and on merge code length.

## Where amortized is not enough

The bounds are amortized, so a single operation can spike to `O(n)`. On a latency-sensitive path where one extract-min must complete within a per-operation budget, that spike is a violation even though the sequence average is logarithmic — a [[Leftist Heaps|leftist heap]] holds `O(log n)` per operation as a worst-case guarantee, at the price of the stored rank field and the conditional swap, and fits that requirement where a skew heap does not.

Persistence exposes the same gap. Amortized accounting assumes each stored shape is consumed once; if an old version of a skew heap is retained and re-merged repeatedly, the same expensive right spine can be paid for again and again, and the amortized bound no longer holds. Leftist worst-case bounds are per operation and survive shared subtrees.

The unconditional swap is the whole mechanism, not a tunable detail. Making it conditional turns the structure back into a leftist heap (with the rank test) or, done wrong, into an unbalanced chain; dropping it removes the only force shortening the right spine and lets a sequence of merges degrade to `O(n)` each. There is no rank field to inspect, so the swap has to be blind and total for the potential argument to close.

## Reference drawer

> [!ABSTRACT]- Merge folding the right spine
> ```mermaid
> flowchart LR
>   subgraph before [Two heaps]
>     A2((2)) --> A5((5))
>     A2 --> A9((9))
>     B3((3)) --> B4((4))
>     B3 --> B8((8))
>   end
>   subgraph after [Merged, children swapped at each touched node]
>     M2((2)) --> M3((3))
>     M2 --> M5((5))
>     M3 --> M4((4))
>     M3 --> M8((8))
>     M8 --> M9((9))
>   end
>   before --> after
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public sealed class SkewHeap<T> where T : IComparable<T>
> {
>     private sealed class Node
>     {
>         public T Key = default!;
>         public Node? Left;
>         public Node? Right;
>     }
>
>     private Node? _root;
>
>     public T FindMin() =>
>         _root is null ? throw new InvalidOperationException("empty") : _root.Key;
>
>     public void Insert(T key) =>
>         _root = Merge(_root, new Node { Key = key });
>
>     public T ExtractMin()
>     {
>         if (_root is null) throw new InvalidOperationException("empty");
>         var min = _root.Key;
>         _root = Merge(_root.Left, _root.Right);
>         return min;
>     }
>
>     private static Node? Merge(Node? a, Node? b)
>     {
>         if (a is null) return b;
>         if (b is null) return a;
>
>         if (a.Key.CompareTo(b.Key) > 0)
>         {
>             (a, b) = (b, a);
>         }
>
>         // Descend the right spine, then swap children unconditionally.
>         a.Right = Merge(a.Right, b);
>         (a.Left, a.Right) = (a.Right, a.Left);
>         return a;
>     }
> }
> ```
> The two swap-carrying lines are the entire self-adjustment: there is no rank field to update and no condition guarding the swap. Removing the swap, or making it conditional on stored metadata, produces a different data structure.

## Comparison

| Structure | Merge | Extract-min | Per-node overhead | Guarantee | Stronger case |
| --- | --- | --- | --- | --- | --- |
| Skew heap | `O(log n)` amortized | `O(log n)` amortized | 2 pointers + key, no rank | Amortized only | Meldable heap with the least code and no rank bookkeeping |
| [[Leftist Heaps\|Leftist heap]] | `O(log n)` worst case | `O(log n)` worst case | 2 pointers + key + npl | Per-operation worst case | A worst-case per-op bound, or persistent/shared use |
| [[Binomial Queues]] | `O(log n)` worst case | `O(log n)` worst case | Forest of trees + degree | Per-operation worst case | Meld plus fast `O(1)` amortized insert |
| Array [[Heap]] | `O(n)` | `O(log n)` worst case | Contiguous array, no pointers | Per-operation worst case | No melding; cache-friendly, compact |
| [[Fibonacci Heaps]] | `O(1)` amortized | `O(log n)` amortized | Marks, degree, sibling/child pointers | Amortized only | Heavy decrease-key (Dijkstra, Prim) |

A skew heap is the simplest mergeable heap in this group: amortized `O(log n)` across merge, insert, and extract-min with two pointers per node, no rank field, and the shortest merge routine of the pointer-based options. A leftist heap is the closer fit when a worst-case — not amortized — per-operation bound is required, or when the heap is shared across versions, since its npl-driven balance survives both conditions. A binomial queue matches leftist's worst-case merge and adds `O(1)` amortized insert at the cost of a forest representation, an array heap wins on locality and memory when melding is never needed, and a Fibonacci heap only earns its bookkeeping when decrease-key is on the hot path.

## Questions

> [!QUESTION]- What does a skew heap remove relative to a leftist heap, and what replaces it?
> The per-node null-path-length field and the conditional child swap. Merge instead swaps the two children unconditionally at every node it descends on the right spine. Self-adjustment replaces the stored invariant, trading a per-operation worst-case bound for an amortized one.

> [!QUESTION]- How can `O(log n)` amortized hold when one merge can be `O(n)`?
> A potential function counts heavy nodes — those whose right subtree outweighs their left. An expensive merge traverses many heavy nodes, but each unconditional swap makes a heavy node light. The costly traversal discharges potential accumulated by earlier cheap operations and leaves the heap cheap to merge again, so the per-operation cost averages to `O(log n)` even though a single call is not bounded by it.

> [!QUESTION]- When is a leftist heap the better choice despite storing an extra field?
> When a per-operation worst-case bound is required rather than an amortized sequence bound — a latency-sensitive path where one operation must not spike to `O(n)` — or when the heap is used persistently. Re-merging a shared expensive shape from an old version defeats amortized accounting, while a leftist heap's `O(log n)` is per operation and survives sharing.

## References

- [Sleator & Tarjan, "Self-Adjusting Heaps" (SIAM J. Comput. 1986)](https://www.cs.cmu.edu/~sleator/papers/adjusting-heaps.pdf) — the original skew heap with the amortized potential analysis.
- [Skew heap (Wikipedia)](https://en.wikipedia.org/wiki/Skew_heap) — merge walkthrough and the `log_φ n` amortized bound.
