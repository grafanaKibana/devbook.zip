---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A lazy heap that defers consolidation to extract-min and cuts decreased nodes into the root list."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

[[Home/Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] and Prim's [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|minimum spanning tree]] algorithm spend most of their time on one operation: lowering the tentative key of a vertex already in the frontier. Only a successful relaxation that lowers a tentative distance triggers decrease-key, so a dense graph can perform up to `E` of them against only `V` extract-mins.

A Fibonacci heap avoids that cost by postponing reorganization. It keeps heap-ordered trees in a circular doubly-linked **root list** with a pointer to the minimum root. Insert splices in one node. Merge joins two root lists, while decrease-key cuts the affected node into the root list instead of sifting it. Extract-min eventually pays for the deferred restructuring.

The forest can hold many trees and many equal degrees between extract-mins, and a single extract-min can then be expensive.

**Core shape:** heap-ordered trees in a circular root list → min pointer → lazy insert/merge/cut now → consolidate by degree at extract-min

The initial forest is replayed through public **Insert** operations. Add roots lazily, use **Extract min** to consolidate equal degrees, then decrease an existing key to see the cut rule move it to the root list. **Reset** repeats those public inserts rather than loading a hidden prebuilt forest.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"fibonacci-heap","array":[3,7,18,24,26,39,41,52,63]}
```

#### Representation and Invariants

Each node holds a key, its **degree** (number of children), a **mark** bit, and four pointers: to its parent, to one child, and to its left and right siblings. Siblings — including the roots — form circular doubly-linked lists, so splicing a node in or out is a constant number of pointer writes with no boundary case for the list ends. The heap itself stores only the pointer to the minimum root and the total node count.

Three invariants hold between operations:

1. **Heap order.** Every node's key is `<=` each child's key.
2. **Distinct root degrees only after consolidation.** Between extract-mins the root list may contain many roots of the same degree; consolidation restores distinctness, and that is the only place it is enforced.
3. **The mark records one prior loss.** A root is always unmarked. A non-root becomes marked when it loses its *first* child to a cut; losing a *second* child triggers a cut of the node itself.

The mark bit is what bounds tree shape. Insert and merge never touch existing trees, so nothing bounds tree shape on its own — repeated decrease-keys could otherwise strip a high-degree node down to almost nothing and leave consolidation linking wide, shallow trees forever. The cascading cut caps the damage: a node is allowed to lose at most one child before it is itself cut up to the root list.

Which fields each operation may change:

- **Insert / Merge** — append to the root list, compare against the min pointer. No parent, child, degree, or mark field of an existing node changes.
- **Decrease-key** — rewrites one node's key; if that breaks heap order with its parent, cuts the node to the root list (clearing its mark, since roots are unmarked), then cascades: while the parent was already marked, cut it too, upward. Degrees of cut parents drop by one.
- **Extract-min** — removes the min root, promotes its children to roots, then consolidates by repeatedly linking two roots of equal degree (the larger key becomes a child of the smaller) until every root degree is distinct, and finally rescans the root list to reset the min pointer.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Fibonacci Heaps complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of nodes currently stored in the heap"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Amortized",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Merge(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Amortized",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "FindMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Amortized",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "DecreaseKey(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Amortized",
              "formula": "O(1) amortized",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "ExtractMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Amortized",
              "formula": "O(log n) amortized",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
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
          "operation": "Whole heap",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure space",
              "formula": "Θ(n) nodes",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Incremental structure space",
              "formula": "O(1) new node",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Merge(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "FindMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "DecreaseKey(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "ExtractMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(max degree) = O(log n) degree table",
              "curveId": "log-n"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Where Laziness and Amortization Stop Paying

On sparse graphs, or any workload where extract-min is a constant fraction of operations, the deferred consolidation is paid often enough that the asymptotic edge evaporates.

The physical layout usually erases the theoretical win. Each operation chases pointers through a forest of separately allocated nodes scattered across the managed heap, so consolidation and cascading cuts thrash the cache, while a binary [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|heap]] does index arithmetic over one contiguous array.

The mark-and-cascading-cut machinery is easy to get wrong. Failing to clear a mark when a node becomes a root, or continuing a cascade past an unmarked parent, breaks the degree bound without a crash. Consolidation simply gets slower.

# Root List and Cascading-Cut Diagram

> [!ABSTRACT]- Root list and a cascading cut
>
> ```mermaid
> flowchart LR
>   subgraph RootList["circular root list"]
>     M["min = 3"]:::min
>     R7["7"]
>     R18["18"]
>   end
>   M --> C4["4"]
>   M --> C12["12*"]
>   C4 --> G9["9"]
>   R18 --> D21["21*"]
>   D21 --> L30["30 (decreaseKey -> 2)"]:::cut
>   classDef min fill:#2b6,stroke:#161,color:#fff
>   classDef cut fill:#c33,stroke:#611,color:#fff
> ```
> `*` marks a node that has already lost one child. Decreasing `30` to `2` cuts it to the root list. Because its parent `21` was already marked, the cut cascades and `21` is cut up as well.

# References

- [Fredman & Tarjan, "Fibonacci heaps and their uses in improved network optimization algorithms" (JACM 1987)](https://dl.acm.org/doi/10.1145/28869.28874)
