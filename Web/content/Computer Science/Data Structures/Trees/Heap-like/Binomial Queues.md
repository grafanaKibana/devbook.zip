---
publish: true
created: 2026-08-03T07:22:13.841Z
modified: 2026-08-03T07:22:13.842Z
published: 2026-08-03T07:22:13.842Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A forest of binomial trees that mirrors the item count's binary form and melds by linking equal orders.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A priority queue must sometimes absorb another whole priority queue — merge two work sets, join two event streams — and keep answering "smallest first". The contiguous layout that makes a binary heap fast to index is exactly what makes it slow to union.

A binomial queue (binomial heap) trades that single array for a **forest of heap-ordered binomial trees, at most one tree of each order**. A binomial tree `Bₖ` holds exactly `2ᵏ` nodes and is built by **linking** two `Bₖ₋₁` trees — the root with the larger key becomes a child of the other. Because each order appears at most once, the set of orders present is the **binary representation of `n`**: a queue of 13 items (`1101₂`) holds trees of orders 3, 2, and 0, sized 8 + 4 + 1.

What the forest gives up is compactness and locality. Nodes are separate allocations wired by child and sibling pointers, so every traversal chases references instead of striding an array, and the minimum is no longer at a fixed slot.

**Core shape:** items → forest of heap-ordered binomial trees, one per order → orders present = binary digits of `n` → meld = binary addition of orders

Use **Meld** to combine the canonical 3-value forest with a singleton. The forest slots expose the two equal-order links and the carry into `B₂`; **Reset** restores both source forests.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"binomial-queue"}
```

Insert, extract-min, and union all reduce to one primitive: **meld**. Walk both forests from the lowest order upward. That new tree is a **carry** into the next order, propagated exactly as when adding two binary numbers.

```text
13 items: orders {3,2,0}   +   6 items: orders {2,1}
order 0: 1 + 0 = 1                 → keep the order-0 tree
order 1: 0 + 1 = 1                 → keep the order-1 tree
order 2: 1 + 1 = 0 carry 1         → link the two order-2 trees
order 3: 1 + 0 + carry = 0 carry 1 → link again
order 4: carry = 1                 → one order-4 tree
19 items: orders {4,1,0} ✓   (13 + 6 = 19 = 10011₂)
```

The decisive transition is the carry at order 2: two separate 4-node trees stop being roots and become a single 8-node tree, which then collides with the order-3 tree and carries again. Heap order survives every link because linking only ever puts a larger root under a smaller one, so the smaller stays on top.

The other operations are corollaries:

- **Insert** melds the queue with a single-node `B₀` — a binary increment.

#### Representation and Invariants

Each item is a heap node holding a key, a `degree` (the order of the tree it roots or the subtree it heads), a `child` pointer to its leftmost child, and a `sibling` pointer. Roots form a singly linked list kept in **strictly increasing order**; a node's children are likewise linked by `sibling` in decreasing order, which is the shape reversing produces during extract-min.

Four invariants define a valid state:

1. **Heap order** — every node's key is `≤` each of its children's keys, so a tree's minimum is its root.
2. **Binomial shape** — a root of degree `k` has exactly `k` children, of degrees `k−1 … 0`, and its subtree holds `2ᵏ` nodes.
3. **At most one tree per order** — the multiset of root degrees has no repeats; it equals the binary digits of `n`.
4. **Sorted root list** — root degrees strictly increase along the sibling chain, which lets meld merge two lists in one linear pass before combining carries.

Linking is the only operation that changes parentage, and it only ever attaches one root beneath another root. No interior node is ever re-parented in isolation, so heap order and binomial shape are preserved by construction rather than repaired afterward.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Binomial Queues complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Meld",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Find-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Extract-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Decrease-key",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(log n)",
              "curveId": "log-n"
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
          "operation": "Storage (n items)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n) nodes + child/sibling/parent pointers",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Meld",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Find-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Extract-min",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Decrease-key",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) aux",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
````

# When the Structure Stops Fitting

A binary heap keeps `n` keys in one array with implicit `2i+1 / 2i+2` child indices: no per-node pointers, no allocation per insert, and sequential memory that the cache prefetches. A binomial queue pays a pointer chase per level and an allocation per node.

Find-min degrades the moment the min-pointer is dropped. Without it, the minimum is not at a known slot the way it is in a binary heap's `a[0]`; it is one of up to `log n` roots and must be found by a scan.

# Reference Drawer

> [!ABSTRACT]- Forest shape for `n = 13` (`1101₂`)
>
> ```mermaid
> graph TD
>   subgraph B3 ["order 3 · 8 nodes"]
>     R3((root)) --> A3((·))
>     R3 --> B3b((·))
>     R3 --> C3((·))
>   end
>   subgraph B2 ["order 2 · 4 nodes"]
>     R2((root)) --> A2((·))
>     R2 --> B2b((·))
>   end
>   subgraph B0 ["order 0 · 1 node"]
>     R0((root))
>   end
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class BinomialHeap
> {
>     private sealed class Node(int key)
>     {
>         public int Key = key;
>         public int Degree;
>         public Node? Child, Sibling, Parent;
>     }
>
>     private Node? _head; // roots in strictly increasing degree order
>
>     // Attach the larger-keyed root as leftmost child of the smaller-keyed one.
>     private static void Link(Node child, Node root)
>     {
>         child.Parent = root;
>         child.Sibling = root.Child;
>         root.Child = child;
>         root.Degree++;
>     }
>
>     // Merge two sorted root lists by ascending degree.
>     private static Node? MergeRoots(Node? a, Node? b)
>     {
>         var dummy = new Node(0);
>         var tail = dummy;
>         while (a != null && b != null)
>         {
>             if (a.Degree <= b.Degree) { tail.Sibling = a; a = a.Sibling; }
>             else { tail.Sibling = b; b = b.Sibling; }
>             tail = tail.Sibling;
>         }
>         tail.Sibling = a ?? b;
>         return dummy.Sibling;
>     }
>
>     // Meld = merge root lists, then resolve equal-degree carries in one pass.
>     private static Node? Meld(Node? a, Node? b)
>     {
>         var head = MergeRoots(a, b);
>         if (head == null) return null;
>
>         Node? prev = null;
>         var curr = head;
>         var next = curr.Sibling;
>         while (next != null)
>         {
>             var deferred = curr.Degree != next.Degree
>                 || (next.Sibling != null && next.Sibling.Degree == curr.Degree);
>             if (deferred)
>             {
>                 prev = curr;
>                 curr = next;                 // different degrees, or three-in-a-row: defer
>             }
>             else if (curr.Key <= next.Key)
>             {
>                 curr.Sibling = next.Sibling;
>                 Link(next, curr);            // next carries under curr
>             }
>             else
>             {
>                 if (prev == null) head = next; else prev.Sibling = next;
>                 Link(curr, next);            // curr carries under next
>                 curr = next;
>             }
>             next = curr.Sibling;
>         }
>         return head;
>     }
>
>     public void Insert(int key) => _head = Meld(_head, new Node(key));
>
>     public int Min()
>     {
>         if (_head == null) throw new InvalidOperationException("empty heap");
>         var min = _head.Key;
>         for (var r = _head.Sibling; r != null; r = r.Sibling)
>             if (r.Key < min) min = r.Key;
>         return min; // direct when a min-pointer is cached across meld/extract
>     }
>
>     public int ExtractMin()
>     {
>         if (_head == null) throw new InvalidOperationException("empty heap");
>
>         Node? minPrev = null, min = _head, prev = _head;
>         for (var curr = _head.Sibling; curr != null; prev = curr, curr = curr.Sibling)
>             if (curr.Key < min.Key) { min = curr; minPrev = prev; }
>
>         if (minPrev == null) _head = min.Sibling; else minPrev.Sibling = min.Sibling;
>
>         Node? reversed = null;               // children come out in decreasing degree
>         for (var c = min.Child; c != null;)
>         {
>             var nextChild = c.Sibling;
>             c.Parent = null;
>             c.Sibling = reversed;
>             reversed = c;
>             c = nextChild;
>         }
>
>         _head = Meld(_head, reversed);
>         return min.Key;
>     }
> }
> ```
>
> `Meld` defers a link when three consecutive roots share a degree, letting the trailing pair carry on the next iteration — this is the case a naive equal-degree link would corrupt.

# Questions

> [!QUESTION]- Why does meld defer when three consecutive roots have the same degree?
> Linking the first pair would create a higher-degree carry before the third same-degree root, breaking the root list's degree order and risking a skipped collision. Deferring lets the trailing pair link first, after which the carry is processed in order like binary addition.

# References

- [Vuillemin, "A data structure for manipulating priority queues" (CACM 1978)](https://dl.acm.org/doi/10.1145/359460.359478) — the original binomial queue paper defining tree orders, linking, and the binary-addition meld.
- [Binomial heap (Wikipedia)](https://en.wikipedia.org/wiki/Binomial_heap) — forest representation, linking rules, and meld mechanics.
