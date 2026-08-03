---
publish: true
created: 2026-08-03T07:22:13.842Z
modified: 2026-08-03T07:22:13.842Z
published: 2026-08-03T07:22:13.842Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A lazy heap that defers consolidation to extract-min and cuts decreased nodes into the root list.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

[[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] and Prim's [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|minimum spanning tree]] algorithm spend most of their time on one operation: lowering the tentative key of a vertex already in the frontier. Only a successful relaxation that lowers a tentative distance triggers decrease-key, so a dense graph can perform up to `E` of them against only `V` extract-mins.

A Fibonacci heap removes that cost by refusing to reorganize eagerly. It keeps a forest of heap-ordered trees strung together in a circular doubly-linked **root list** with a pointer to the minimum root, and it does the least work each operation allows: insert splices a new single-node tree into the root list, merge concatenates two root lists, and decrease-key cuts the affected node loose to the root list rather than sifting it. All the deferred restructuring is paid off once, later, by extract-min.

The forest can hold many trees and many equal degrees between extract-mins, and a single extract-min can then be expensive.

**Core shape:** heap-ordered trees in a circular root list → min pointer → lazy insert/merge/cut now → consolidate by degree at extract-min

The initial forest is replayed through public **Insert** operations. Add roots lazily, use **Extract min** to consolidate equal degrees, then decrease an existing key to see the cut rule move it to the root list; **Reset** repeats those public inserts rather than loading a hidden prebuilt forest.

````tabsdown
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
      "description": "number of input elements or states"
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
              "role": "Amortized time",
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
              "role": "Amortized time",
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
              "role": "Amortized time",
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
              "role": "Amortized time",
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
              "role": "Amortized time",
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
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure / aux space",
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
              "role": "Structure / aux space",
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
              "role": "Structure / aux space",
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
              "role": "Structure / aux space",
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
              "kind": "text",
              "role": "Structure / aux space",
              "formula": "O(max degree) = O(log n)"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Where Laziness and Amortization Stop Paying

On sparse graphs, or any workload where extract-min is a constant fraction of operations, the deferred consolidation is paid often enough that the asymptotic edge evaporates.

The physical layout usually erases the theoretical win. Each operation chases pointers through a forest of separately allocated nodes scattered across the managed heap, so consolidation and cascading cuts thrash the cache, while a binary [[Computer Science/Data Structures/Trees/Heap-like/Heap|heap]] does index arithmetic over one contiguous array.

The mark-and-cascading-cut machinery is intricate and error-prone: forgetting to clear a mark on promotion to root, or to stop the cascade at an unmarked parent, silently breaks the degree bound and quietly degrades consolidation without any crash.

# Reference Drawer

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
>
> `*` marks a node that has already lost one child. Decreasing `30` to `2` cuts it to the root list; because its parent `21` was already marked, the cut cascades and `21` is cut up as well.

# Questions

> [!QUESTION]- What does the laziness actually defer, and to where?
> Insert, merge, and decrease-key avoid any tree reorganization: insert and merge only splice into the root list, and decrease-key cuts the node loose instead of sifting it. The deferred work — linking trees so degrees become distinct — is done once by the next extract-min during consolidation, so many cheap operations prepay one expensive cleanup.

# References

- [Fredman & Tarjan, "Fibonacci heaps and their uses in improved network optimization algorithms" (JACM 1987)](https://dl.acm.org/doi/10.1145/28869.28874) — the original structure, potential-function analysis, and the resulting Dijkstra/Prim bounds.
- [Fibonacci heap (Wikipedia)](https://en.wikipedia.org/wiki/Fibonacci_heap) — root-list laziness, consolidation, marks, and cascading cuts.
- [Larkin, Sen & Tarjan, "A back-to-basics empirical study of priority queues" (ALENEX 2014)](https://arxiv.org/abs/1403.0252) — benchmarks where implicit d-ary and pairing heaps beat Fibonacci heaps on real workloads.
- [Fredman, Sedgewick, Sleator & Tarjan, "The pairing heap: a new form of self-adjusting heap" (Algorithmica 1986)](https://link.springer.com/article/10.1007/BF01840439) — the simpler self-adjusting alternative with near-Fibonacci practical performance.
