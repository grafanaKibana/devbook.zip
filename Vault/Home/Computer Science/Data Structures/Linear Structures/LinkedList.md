---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A doubly linked list giving O(1) inserts and removes around node references you already hold, at the cost of locality."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

# Intro

A sequence needs frequent insertions and removals in its interior, and the code already holds a reference to the element next to each edit. A contiguous array pays `O(n)` to shift the tail on every such edit. A linked list drops contiguity: each element lives in its own separately allocated node, and the structure stores only the links between nodes. In a doubly linked list, splicing around a held node rewires a constant number of adjacent pointers and touches no other element. A singly linked insertion is `O(1)` only after the held node or when its predecessor is already available.

The cost of that freedom is addressing. Because nodes are scattered across the heap rather than laid out in one block, there is no arithmetic that maps an index to an address. Reaching the *k*-th element means starting at a head reference and following *k* `next` pointers. A node holds a value plus `Next` (singly linked) or both forward and backward links (doubly linked); .NET's doubly linked `LinkedListNode<T>` exposes those as `Next` and `Previous`. The list keeps `First`/`Last` handles and a count, and many implementations wrap the ends with a sentinel node so the head and tail cases need no branch.

**Core shape:** scattered nodes → each stores value + next/prev links → head/tail references → doubly-linked splice around a held node is `O(1)`; singly-linked insertion is `O(1)` after it or with its predecessor → reach an index is `O(n)`.

Append a value below and watch the old tail's `next` field change from `null` to the new node's address while the new cell appears at the end. The doubly linked variant also writes the old tail's address into the new node's `prev` field. No existing value shifts.

```steptrace
{"tabs":[{"name":"Singly linked","description":"Each cell stores a value over one next-pointer field.","algorithm":"linked-list","variant":"singly","array":[12,27,39,54]},{"name":"Doubly linked","description":"Each cell stores a value over separate prev- and next-pointer fields.","algorithm":"linked-list","variant":"doubly","array":[12,27,39,54]}]}
```

# Representation and Invariants

The list itself stores almost nothing: a `First` reference, usually a `Last` reference, and a count. All content lives in independently allocated nodes connected through neighbour pointers; `First`, `Last`, or caller-held node references may also reach them directly.

- A singly linked node holds a value and one `Next` pointer. The last node's `Next` is null (or points at a sentinel).
- A doubly linked node adds a `Prev` pointer, so traversal runs in both directions and a removal needs only the node itself, not its predecessor.
- A sentinel/dummy node closes the ring or caps the ends. With it, inserting before `First` or after `Last` uses the same pointer rewiring as an interior insert, removing the special-case branches.

Three invariants define a valid state:

1. In a non-empty list, following `Next` from `First` reaches `Last` in exactly `Count - 1` hops; following `Prev` from `Last` retraces the same nodes in reverse.
2. For adjacent nodes, `a.Next == b` holds if and only if `b.Prev == a`. A splice that updates one direction but not the other corrupts the chain.
3. A node's membership is defined by the list that owns it. A node detached by `Remove` or belonging to another list is not a valid anchor for `AddBefore`/`AddAfter` on this list.

Inserting around a held node in a doubly linked list mutates only a constant number of adjacent pointers plus the count. In a singly linked list, inserting after the held node is `O(1)`; inserting before it is `O(1)` only when the predecessor is already available, otherwise finding that predecessor takes `O(n)`. Removing a held node is also `O(1)` in a doubly linked list; a singly linked list still needs the predecessor reference or a traversal to find it. No index is recomputed and no element is copied. Nothing about ordering is derived from position — position exists only as the path of pointers, so there is no random access to recover.

# Complexity

| Operation | Best time | Typical time | Worst time | Structure space | Cause |
| --- | --- | --- | --- | --- | --- |
| Index / search by value | `O(1)` | `O(n)` | `O(n)` | — | No index-to-address arithmetic; must walk `next` from a head reference |
| Doubly-linked insert/remove around a held node; singly-linked insert after it or with its predecessor | `O(1)` | `O(1)` | `O(1)` | `O(1)` auxiliary (inserting a value allocates one node; a removed node becomes GC-eligible only when unreachable) | Rewire a constant number of adjacent pointers; singly-linked removal also needs the predecessor |
| Insert before a singly-held node without its predecessor; insert/remove at a position or value | `O(1)` | `O(n)` | `O(n)` | `O(1)` auxiliary (a value insert allocates one node) | The `O(1)` splice is dominated by the `O(n)` walk that first finds the predecessor or target node |
| Prepend / append | `O(1)` | `O(1)` | `O(1)` | `O(1)` new node | `First`/`Last` handles make both ends directly reachable |
| Whole structure | — | — | — | `O(n)` | Per node: the value, one or two pointers, and object/allocation header overhead |

The `O(1)` splice is a guarantee around a held doubly-linked node. In a singly linked list, it covers insertion after that node, or insertion/removal when its predecessor is also available. Otherwise, finding the predecessor or target by index/value costs `O(n)` and dominates the splice — the same asymptotic class as shifting an array, but often with worse constants. Space is `O(n)` in element count, but the constant is larger than a contiguous array: every element carries at least one extra pointer plus the per-object allocation header, and each node is a separate allocation the garbage collector must track.

# When the Layout Stops Paying

Random access is the hard boundary. There is no `list[k]` in `O(1)`; indexing walks the chain, so any algorithm that repeatedly addresses elements by position turns each access into an `O(n)` traversal. A workload that looks index-light on paper can hide this cost inside a `foreach` that repeatedly searches before it edits.

Cache behaviour is the boundary that surprises people. Because consecutive nodes may sit at unrelated heap addresses, traversal performs dependent pointer-chasing loads that hardware prefetchers handle less reliably than sequential memory. A contiguous [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|dynamic array]] usually streams through cache lines more predictably, while linked-list traversal may incur more cache misses. The splice itself remains `O(1)` once every required node or predecessor reference is held; an index, value, or predecessor lookup may add an `O(n)` walk. In practice, an array's contiguous `O(n)` shift can still beat a list operation that first requires that traversal.

Per-node allocation is the third boundary. Inserting a value allocates a node object, although reinserting a detached `LinkedListNode<T>` can reuse that allocation. After removal, the node is eligible for collection only when no references still reach it. A value-insert-heavy linked-list workload therefore creates allocation and GC pressure that an amortized-growth array avoids by reusing one backing buffer. Detached or foreign nodes are also invalid anchors: passing a `LinkedListNode<T>` that belongs to another list (or was already removed) to `AddAfter`/`Remove` throws, because node identity is scoped to its owning list.

# Reference Drawer

> [!ABSTRACT]- Doubly linked chain with head and tail
>
> ```mermaid
> graph LR
>   H[First] --> A
>   A[node a] <--> B[node b]
>   B <--> C[node c]
>   L[Last] --> C
>   C --> N[null]
> ```

> [!EXAMPLE]- C# usage of the built-in doubly linked list
>
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

# Questions

> [!QUESTION]- Why does the `Prev` ↔ `Next` invariant matter during a removal?
> Adjacency is stored twice: `a.Next == b` must agree with `b.Prev == a`. A removal must re-point both directions across the gap. Updating only one leaves a half-linked chain where forward and backward traversal disagree about membership, corrupting the list.

# References

- [`LinkedList<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) — .NET's doubly linked list: node-based `AddBefore`/`AddAfter`/`Remove` contracts, `First`/`Last` handles, and the rule that a node belongs to exactly one list.
- [`LinkedListNode<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlistnode-1) — the node type exposing `Value`, `Next`, `Previous`, and `List`, which defines the held-reference `O(1)` edit surface.
- [Selecting a collection class](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — Microsoft's guidance on when a linked list is appropriate versus array-backed collections.
- [What is Data Locality and How does it help performance?](https://gameprogrammingpatterns.com/data-locality.html) — Nystrom's account of why pointer-chasing across scattered nodes stalls the CPU cache and why contiguous layouts win in practice.
