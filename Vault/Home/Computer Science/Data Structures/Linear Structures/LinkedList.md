---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A doubly linked list that splices around held node references at the cost of locality."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

A sequence needs frequent insertions and removals in its interior, and the code already holds a reference to the element next to each edit. A linked list drops contiguity: each element lives in its own separately allocated node, and the structure stores only the links between nodes. In a doubly linked list, splicing around a held node rewires a constant number of adjacent pointers and touches no other element.

The cost of that freedom is addressing. Because nodes are scattered across the heap rather than laid out in one block, there is no arithmetic that maps an index to an address. Reaching the *k*-th element means starting at a head reference and following *k* `next` pointers. A node holds a value plus `Next` (singly linked) or both forward and backward links (doubly linked); .NET's doubly linked `LinkedListNode<T>` exposes those as `Next` and `Previous`. The list keeps `First`/`Last` handles and a count, and many implementations wrap the ends with a sentinel node so the head and tail cases need no branch.

**Core shape:** scattered nodes → each stores value + next/prev links → head/tail references

Append a value below and watch the old tail's `next` field change from `null` to the new node's address while the new cell appears at the end. The doubly linked variant also writes the old tail's address into the new node's `prev` field. No existing value shifts.

~~~~~tabsdown
tab: Visualization

~~~~tabsdown
tab: Singly linked

```steptrace
{"algorithm":"linked-list","variant":"singly","array":[12,27,39,54]}
```

Each cell stores a value over one next-pointer field.

tab: Doubly linked

```steptrace
{"algorithm":"linked-list","variant":"doubly","array":[12,27,39,54]}
```

Each cell stores a value over separate prev- and next-pointer fields.

tab: Reverse in place

```steptrace
{"algorithm":"linked-list","variant":"reverse","array":[12,27,39,54]}
```

`Reverse` rewires the `next` chain while every node keeps its address and value. `Reset` restores the original pointer order.

~~~~

The list itself stores almost nothing: a `First` reference, usually a `Last` reference, and a count. All content lives in independently allocated nodes connected through neighbour pointers; `First`, `Last`, or caller-held node references may also reach them directly.

- A singly linked node holds a value and one `Next` pointer. The last node's `Next` is null (or points at a sentinel).
- A doubly linked node adds a `Prev` pointer, so traversal runs in both directions and a removal needs only the node itself, not its predecessor.
- A sentinel/dummy node closes the ring or caps the ends. With it, inserting before `First` or after `Last` uses the same pointer rewiring as an interior insert, removing the special-case branches.

Three invariants define a valid state:

1. In a non-empty list, following `Next` from `First` reaches `Last` in exactly `Count - 1` hops; following `Prev` from `Last` retraces the same nodes in reverse.
2. For adjacent nodes, `a.Next == b` holds if and only if `b.Prev == a`. A splice that updates one direction but not the other corrupts the chain.
3. A node's membership is defined by the list that owns it. A node detached by `Remove` or belonging to another list is not a valid anchor for `AddBefore`/`AddAfter` on this list.

Inserting around a held node in a doubly linked list mutates only a constant number of adjacent pointers plus the count. No index is recomputed and no element is copied. Nothing about ordering is derived from position — position exists only as the path of pointers, so there is no random access to recover.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "LinkedList complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of nodes currently stored in the list"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Index / search by value",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Doubly-linked insert/remove around a held node; singly-linked insert after it or with its predecessor",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert before a singly-held node without its predecessor; insert/remove at a position or value",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prepend / append",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Reverse in place",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Typical",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(n)",
              "curveId": "linear"
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
          "operation": "Doubly-linked insert/remove around a held node; singly-linked insert after it or with its predecessor",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(1) auxiliary (inserting a value allocates one node; a removed node becomes GC-eligible only when unreachable)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert before a singly-held node without its predecessor; insert/remove at a position or value",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(1) auxiliary (a value insert allocates one node)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prepend / append",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(1) new node",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Reverse in place",
          "bounds": [
            {
              "kind": "curve",
              "role": "Iterative auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Recursive call stack",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Whole structure",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Reverse in place

Pointer-only reversal changes links, not nodes. Three references carry the operation: `previous` is the already-reversed prefix, `current` is the node being processed, and `next` saves the unprocessed suffix before `current.Next` is overwritten. After each iteration, every node in `previous` points toward the old head, while every node reachable from `current` remains available through the saved suffix.

When the scan ends, `previous` is the new head. The former head was processed first and received `Next = null`, so the reversed chain terminates correctly. Empty and single-node lists already satisfy the reversed shape and return unchanged. Node address/value identity is stable throughout; only traversal order and `next` fields change.

> [!EXAMPLE]- C# iterative reversal
>
> ```csharp
> public sealed class Node<T>(T value)
> {
>     public T Value { get; } = value;
>     public Node<T>? Next { get; set; }
> }
>
> public static Node<T>? Reverse<T>(Node<T>? head)
> {
>     Node<T>? previous = null;
>     var current = head;
>
>     while (current is not null)
>     {
>         var next = current.Next; // save the suffix before breaking its incoming link
>         current.Next = previous;
>         previous = current;
>         current = next;
>     }
>
>     return previous;
> }
> ```
>
> The iterative form retains only the three traversal references. A recursive reversal retains one call frame per node and can overflow the stack on a long list.

# When the Layout Stops Paying

Random access is the hard boundary. A workload that looks index-light on paper can hide this cost inside a `foreach` that repeatedly searches before it edits.

Cache behaviour is the boundary that surprises people. Because consecutive nodes may sit at unrelated heap addresses, traversal performs dependent pointer-chasing loads that hardware prefetchers handle less reliably than a sequential array. A contiguous [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|dynamic array]] usually streams through cache lines more predictably, while linked-list traversal may incur more cache misses.

Per-node allocation is the third boundary. Inserting a value allocates a node object, although reinserting a detached `LinkedListNode<T>` can reuse that allocation. After removal, the node is eligible for collection only when no references still reach it. Detached or foreign nodes are also invalid anchors: passing a `LinkedListNode<T>` that belongs to another list (or was already removed) to `AddAfter`/`Remove` throws, because node identity is scoped to its owning list.

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
> list.AddAfter(a, "B");   // splice between A and C, no shifting
> list.Remove("C");        // walk to find C, then unlink it
>
> // Reaching the k-th element requires a manual walk; there is no indexer.
> LinkedListNode<string>? node = list.First;
> for (int i = 0; i < 2 && node is not null; i++)
> {
>     node = node.Next;
> }
> ```
> A node from another list passed to `AddAfter`/`Remove` throws: node identity is scoped to its owning list.

# Questions

> [!QUESTION]- Why does the `Prev` ↔ `Next` invariant matter during a removal?
> Adjacency is stored twice: `a.Next == b` must agree with `b.Prev == a`. A removal must re-point both directions across the gap. Updating only one leaves a half-linked chain where forward and backward traversal disagree about membership, corrupting the list.

> [!QUESTION]- Which state must be saved before reversing `current.Next`, and why?
> The original `current.Next` must be saved as `next`. Overwriting the field first would sever the only path to the unprocessed suffix and lose the rest of the list.

> [!QUESTION]- What changes during in-place reversal, and what remains identical?
> The `Next` links, head, tail, and traversal order change. Every node object and its stored value remain identical; the former head becomes the tail and points to null.

# References

- [`LinkedList<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) — .NET's doubly linked list: node-based `AddBefore`/`AddAfter`/`Remove` contracts, `First`/`Last` handles, and the rule that a node belongs to exactly one list.
- [`LinkedListNode<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlistnode-1) — source for the structure and its analysis.
- [Selecting a collection class](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — Microsoft's guidance on when a linked list is appropriate versus array-backed collections.
- [What is Data Locality and How does it help performance?](https://gameprogrammingpatterns.com/data-locality.html) — Nystrom's account of why pointer-chasing across scattered nodes stalls the CPU cache and why contiguous layouts win in practice.
