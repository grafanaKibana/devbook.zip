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

Linked lists trade direct addressing for cheap local rewiring. When code already holds the node beside an edit, a doubly linked list inserts or removes by changing a fixed number of pointers. No neighboring value moves.

Each value lives in a separately allocated node rather than a contiguous block. That layout removes the arithmetic that turns an array index into an address: reaching the *k*-th element requires following *k* links from the head. A singly linked node stores `Next`. A doubly linked node also stores `Previous`. .NET's `LinkedList<T>` keeps `First`, `Last`, and `Count`, while sentinel-based implementations may wrap the ends to remove head and tail branches.

**Core shape:** scattered nodes → value plus links in each node → head and tail references

Appending below rewires the old tail's `next` field from `null` to the new node. The doubly linked form also points the new node's `prev` field back to the old tail. The existing values stay where they are.

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
              "role": "Average",
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
              "role": "All executions",
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
              "role": "Average",
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
              "role": "All executions",
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
              "role": "All executions",
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
              "role": "Auxiliary space",
              "formula": "O(1); inserting a value allocates one persistent node, while a removed node remains alive until unreachable",
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
              "role": "Auxiliary space",
              "formula": "O(1); inserting a value allocates one persistent node",
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
              "role": "Persistent change",
              "formula": "O(1), one new node",
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

Pointer reversal changes links while keeping every node and value intact. `previous` holds the reversed prefix, `current` marks the node under repair, and `next` saves the untouched suffix before `current.Next` is overwritten. After each iteration, the prefix points toward the old head and the suffix is still reachable.

At the end, `previous` is the new head. The former head was processed first and now has `Next = null`, which terminates the chain. Empty and single-node lists need no special mutation.

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

Random access is the hard boundary. A workload that appears index-light can still hide repeated scans before each edit.

Traversal also fights the cache. Consecutive nodes may occupy unrelated heap addresses, so each link can trigger a dependent load that hardware prefetchers handle poorly. A contiguous [[Home/Computer Science/Data Structures/Linear Structures/Dynamic Array|dynamic array]] usually streams through cache lines with fewer misses.

Every inserted value normally brings a node allocation. A detached `LinkedListNode<T>` can be reinserted without allocating another node, but it remains alive while any reference reaches it. For `AddAfter(existingNode, newNode)`, `existingNode` must belong to the target list and `newNode` must be detached. `Remove(node)` likewise requires `node` to belong to that list.

# Diagram and C# Implementation

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

# References

- [`LinkedList<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1)
- [What is Data Locality and How does it help performance?](https://gameprogrammingpatterns.com/data-locality.html)
