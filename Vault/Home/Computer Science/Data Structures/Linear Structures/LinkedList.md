---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Done
publish: true
---

# Intro

A sequence needs frequent insertions and removals in its interior, and the code already holds a reference to the element next to each edit. A contiguous array pays `O(n)` to shift the tail on every such edit. A linked list drops contiguity: each element lives in its own separately allocated node, and the structure stores only the links between nodes. Splicing a node in or out then rewires a constant number of adjacent pointers (two on a removal, up to four on a doubly-linked insert) and touches no other element.

The cost of that freedom is addressing. Because nodes are scattered across the heap rather than laid out in one block, there is no arithmetic that maps an index to an address. Reaching the *k*-th element means starting at a head reference and following *k* `next` pointers. A `LinkedListNode<T>` holds a value plus `Next` (singly linked) or both `Next` and `Prev` (doubly linked); the list keeps `First`/`Last` handles and a count, and many implementations wrap the ends with a sentinel node so the head and tail cases need no branch.

**Core shape:** scattered nodes → each stores value + next/prev links → head/tail references → splice at a held node is `O(1)`, reach an index is `O(n)`.

> [!NOTE] Visualization pending
> Planned StepTrace: a linked-list card showing a node spliced out of a doubly linked chain — the removed node's neighbours re-point `next`/`prev` across the gap while every other node stays exactly where it was in memory. No matching renderer exists in `engine.js` yet.

## Representation and invariants

The list itself stores almost nothing: a `First` reference, usually a `Last` reference, and a count. All content lives in the nodes, and each node is an independent heap allocation reachable only through its neighbours' pointers.

- A singly linked node holds a value and one `Next` pointer. The last node's `Next` is null (or points at a sentinel).
- A doubly linked node adds a `Prev` pointer, so traversal runs in both directions and a removal needs only the node itself, not its predecessor.
- A sentinel/dummy node closes the ring or caps the ends. With it, inserting before `First` or after `Last` uses the same pointer rewiring as an interior insert, removing the special-case branches.

Three invariants define a valid state:

1. Following `Next` from `First` reaches `Last` (or the sentinel) in exactly `Count` steps; following `Prev` from `Last` retraces the same nodes in reverse.
2. For adjacent nodes, `a.Next == b` holds if and only if `b.Prev == a`. A splice that updates one direction but not the other corrupts the chain.
3. A node's membership is defined by the list that owns it. A node detached by `Remove` or belonging to another list is not a valid anchor for `AddBefore`/`AddAfter` on this list.

An insertion or removal at a held node mutates only a constant number of adjacent pointers (two on a removal, up to four on a doubly-linked insert) plus the count. No index is recomputed and no element is copied, which is the property that makes the edit `O(1)`. Nothing about ordering is derived from position — position exists only as the path of pointers, so there is no random access to recover.

## Complexity

| Operation | Best time | Typical time | Worst time | Structure space | Cause |
| --- | --- | --- | --- | --- | --- |
| Index / search by value | `O(1)` | `O(n)` | `O(n)` | — | No index-to-address arithmetic; must walk `next` from a head reference |
| Insert / remove at a held node | `O(1)` | `O(1)` | `O(1)` | `O(1)` (insert allocates one node; remove frees one) | Rewire a constant number of adjacent pointers; no elements shift |
| Insert / remove at a position or value | `O(1)` | `O(n)` | `O(n)` | `O(1)` new node | The `O(1)` splice is dominated by the `O(n)` walk that first locates the node |
| Prepend / append | `O(1)` | `O(1)` | `O(1)` | `O(1)` new node | `First`/`Last` handles make both ends directly reachable |
| Whole structure | — | — | — | `O(n)` | Per node: the value, one or two pointers, and object/allocation header overhead |

The `O(1)` splice is a guarantee only when the node reference is already in hand. As soon as the node must be found by index or value, the `O(n)` traversal dominates and the whole operation is `O(n)` — the same asymptotic class as shifting an array, but with worse constants. Space is `O(n)` in element count, but the constant is larger than a contiguous array: every element carries at least one extra pointer plus the per-object allocation header, and each node is a separate allocation the garbage collector must track.

## When the layout stops paying

Random access is the hard boundary. There is no `list[k]` in `O(1)`; indexing walks the chain, so any algorithm that repeatedly addresses elements by position turns each access into an `O(n)` traversal. A workload that looks index-light on paper can hide this cost inside a `foreach` that repeatedly searches before it edits.

Cache behaviour is the boundary that surprises people. Because consecutive nodes sit at unrelated heap addresses, iteration is a chain of pointer-chasing loads that the CPU prefetcher cannot anticipate. A contiguous [[Dynamic Array]] streams through one cache line after another; a linked list stalls on a likely cache miss at nearly every step. The practical result is that a linked list is frequently *slower* than a dynamic array even on the mid-sequence operations where its `O(1)` splice looks asymptotically superior — the array's `O(n)` shift moves contiguous memory the hardware is built to move fast, while the list's `O(1)` splice first pays an `O(n)` cache-missing walk to reach the node.

Per-node allocation is the third boundary. Every insert allocates a node object and every removal produces garbage, so an insert-heavy linked-list workload generates allocation and GC pressure that an amortized-growth array avoids by reusing one backing buffer. Detached or foreign nodes are also invalid anchors: passing a `LinkedListNode<T>` that belongs to another list (or was already removed) to `AddAfter`/`Remove` throws, because node identity is scoped to its owning list.

## Reference drawer

> [!ABSTRACT]- Doubly linked chain with head and tail
> ```mermaid
> graph LR
>   H[First] --> A
>   A[node a] <--> B[node b]
>   B <--> C[node c]
>   C --> T[Last]
>   T -.-> C
> ```

> [!EXAMPLE]- C# usage of the built-in doubly linked list
> ```csharp
> var list = new LinkedList<string>();
> LinkedListNode<string> a = list.AddLast("A");   // hold the node reference
> list.AddLast("C");
>
> list.AddAfter(a, "B");   // O(1): splice between A and C, no shifting
> list.Remove("C");        // O(n): walk to find "C", then O(1) unlink
>
> // Reaching the k-th element is a manual O(n) walk — there is no indexer.
> LinkedListNode<string>? node = list.First;
> for (int i = 0; i < 2 && node is not null; i++)
> {
>     node = node.Next;
> }
> ```
> `AddAfter(a, "B")` is `O(1)` because `a` is held. `Remove("C")` is `O(n)` because it searches first — the unlink itself is `O(1)`. A node from another list passed to `AddAfter`/`Remove` throws: node identity is scoped to its owning list.

## Comparison

| Structure | Index access | Mid-sequence insert/remove | Ends insert/remove | Memory locality | Stronger case |
| --- | --- | --- | --- | --- | --- |
| Doubly linked list | `O(n)` walk | `O(1)` at a held node, else `O(n)` to find | `O(1)` | Poor — scattered nodes, per-node pointer overhead | Node references are held and interior splices are frequent |
| [[Arrays]] | `O(1)` | `O(n)` shift | `O(1)` append if capacity, else N/A resize | Excellent — one contiguous block | Fixed size with heavy indexed reads |
| [[Dynamic Array]] | `O(1)` | `O(n)` shift | `O(1)` amortized append | Excellent — one contiguous block | Default sequence; indexing and iteration dominate |
| [[Deque]] | `O(1)` | `O(n)` | `O(1)` both ends | Good — usually contiguous / ring buffer | Push and pop at both ends without interior edits |

A linked list wins only in a narrow regime: the code already holds a node reference and performs frequent interior splices, so the `O(1)` rewire is realized without an `O(n)` find. That regime shows up in a doubly linked list as the backbone of an [[LRU Cache]] — a held node is moved to the front in `O(1)` on every access — and in intrusive lists or adjacency lists where edges are removed by known node. Outside it, a [[Dynamic Array]]'s cache locality and `O(1)` indexing make it the better default even where the linked list's asymptotics look stronger, because the array pays its `O(n)` shift in contiguous memory the hardware moves fast while the list pays an unpredictable cache-missing walk. If the edits are confined to the two ends, a [[Deque]] provides `O(1)` there without giving up contiguity at all.

## Questions

> [!QUESTION]- Why is index access `O(n)` on a linked list but `O(1)` on an array?
> An array stores elements in one contiguous block, so an index is turned into an address by arithmetic (`base + i × size`) in constant time. A linked list stores only pointers between separately allocated nodes; nothing maps an index to an address, so reaching the *k*-th element means following `next` from a head reference `k` times.

> [!QUESTION]- The splice is `O(1)`, so why is a linked list often slower than a dynamic array in practice?
> The `O(1)` splice only applies when the node reference is already held; otherwise an `O(n)` walk to find the node dominates. Even when it applies, nodes live at scattered heap addresses, so traversal is a chain of cache-missing pointer loads. A contiguous array's `O(n)` shift moves memory the CPU prefetcher handles efficiently, so its larger asymptotic cost often beats the list's smaller one at realistic sizes.

> [!QUESTION]- What does a doubly linked list buy an LRU cache that an array cannot?
> On a cache hit the accessed entry must move to the most-recently-used end. With a held `LinkedListNode<T>`, that is an `O(1)` unlink-and-relink of a few pointers, with no other entry moving. An array would shift every element between the old and new position, making each access `O(n)`.

> [!QUESTION]- Why does the `Prev` ↔ `Next` invariant matter during a removal?
> Adjacency is stored twice: `a.Next == b` must agree with `b.Prev == a`. A removal must re-point both directions across the gap. Updating only one leaves a half-linked chain where forward and backward traversal disagree about membership, corrupting the list.

## References

- [`LinkedList<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) — .NET's doubly linked list: node-based `AddBefore`/`AddAfter`/`Remove` contracts, `First`/`Last` handles, and the rule that a node belongs to exactly one list.
- [`LinkedListNode<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlistnode-1) — the node type exposing `Value`, `Next`, `Prev`, and `List`, which defines the held-reference `O(1)` edit surface.
- [Selecting a collection class](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — Microsoft's guidance on when a linked list is appropriate versus array-backed collections.
- [What is Data Locality and How does it help performance?](https://gameprogrammingpatterns.com/data-locality.html) — Nystrom's account of why pointer-chasing across scattered nodes stalls the CPU cache and why contiguous layouts win in practice.
