---
publish: true
created: 2026-07-28T10:20:00.773Z
modified: 2026-07-28T10:41:53.313Z
published: 2026-07-28T10:41:53.313Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A lazy binomial queue that defers work to extractMin, buying O(1) amortized decreaseKey and meld.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

[[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] and Prim's [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|minimum spanning tree]] algorithm spend most of their time on one operation: lowering the tentative key of a vertex already in the frontier. Each relaxed edge triggers a decrease-key, so a dense graph performs up to `E` of them against only `V` extract-mins. A binary [[Computer Science/Data Structures/Trees/Heap-like/Heap|heap]] charges `O(log n)` for every decrease-key, which dominates the total and pins Dijkstra at `O(E log V)`.

A Fibonacci heap removes that cost by refusing to reorganize eagerly. It keeps a forest of heap-ordered trees strung together in a circular doubly-linked **root list** with a pointer to the minimum root, and it does the least work each operation allows: insert splices a new single-node tree into the root list, merge concatenates two root lists, and decrease-key cuts the affected node loose to the root list rather than sifting it. All the deferred restructuring is paid off once, later, by extract-min. That laziness buys **O(1) amortized decrease-key and merge**, yielding the standard Fibonacci-heap bound `O(E + V log V)` for Dijkstra and Prim under their usual adjacency-list and priority-queue analyses.

The bound is amortized, not worst-case. The forest can hold many trees and many equal degrees between extract-mins, and a single extract-min can then be expensive. What keeps the amortized accounting solvent is a per-node **mark bit** and a cascading-cut rule that prevents trees from degenerating.

**Core shape:** heap-ordered trees in a circular root list → min pointer → lazy insert/merge/cut now → consolidate by degree at extract-min → `O(n)` storage plus a degree and a mark per node.

> [!NOTE] Visualization pending
> Planned StepTrace: a lazy-forest heap card showing insert dropping a root into the root list, decrease-key cutting a node out (cascading up through an already-marked parent), and extract-min consolidating trees of equal degree until the degrees are distinct. No matching renderer exists in `engine.js` yet.

# Representation and Invariants

Each node holds a key, its **degree** (number of children), a **mark** bit, and four pointers: to its parent, to one child, and to its left and right siblings. Siblings — including the roots — form circular doubly-linked lists, so splicing a node in or out is a constant number of pointer writes with no boundary case for the list ends. The heap itself stores only the pointer to the minimum root and the total node count.

Three invariants hold between operations:

1. **Heap order.** Every node's key is `<=` each child's key. This is what makes the minimum a root, so `find-min` reads the min pointer in `O(1)`.
2. **Distinct root degrees only after consolidation.** Between extract-mins the root list may contain many roots of the same degree; consolidation restores distinctness, and that is the only place it is enforced.
3. **The mark records one prior loss.** A root is always unmarked. A non-root becomes marked when it loses its _first_ child to a cut; losing a _second_ child triggers a cut of the node itself.

The mark bit is what bounds tree shape. Insert and merge never touch existing trees, so nothing bounds tree shape on its own — repeated decrease-keys could otherwise strip a high-degree node down to almost nothing and leave consolidation linking wide, shallow trees forever. The cascading cut caps the damage: a node is allowed to lose at most one child before it is itself cut up to the root list. That guarantees a node of degree `k` retains at least `F(k + 2)` descendants (consecutive Fibonacci numbers, hence the name), which forces the maximum degree — and therefore the cost of consolidation — to stay `O(log n)`.

Which fields each operation may change:

- **Insert / Merge** — append to the root list, compare against the min pointer. No parent, child, degree, or mark field of an existing node changes.
- **Decrease-key** — rewrites one node's key; if that breaks heap order with its parent, cuts the node to the root list (clearing its mark, since roots are unmarked), then cascades: while the parent was already marked, cut it too, upward. Degrees of cut parents drop by one.
- **Extract-min** — removes the min root, promotes its children to roots, then consolidates by repeatedly linking two roots of equal degree (the larger key becomes a child of the smaller) until every root degree is distinct, and finally rescans the root list to reset the min pointer.

# Complexity

Bounds assume the mark-and-cascading-cut discipline; without it decrease-key stays `O(1)` but consolidation is no longer bounded by `O(log n)`.

| Operation | Amortized time | Worst single op | Structure / aux space | What pays for it |
| --- | --- | --- | --- | --- |
| `Insert(x)` | `O(1)` | `O(1)` | `O(1)` new node | Adds one root and one unit of potential |
| `Merge(a, b)` | `O(1)` | `O(1)` | `O(1)` | Concatenates two circular root lists |
| `FindMin()` | `O(1)` | `O(1)` | `O(1)` | Reads the maintained min pointer |
| `DecreaseKey(x)` | `O(1)` amortized | `O(n)` | `O(1)` | A cut plus a cascade; each cut releases a marked node's stored potential |
| `ExtractMin()` | `O(log n)` amortized | `O(n)` | `O(max degree) = O(log n)` | Consolidation links all the roots the lazy ops left behind |

Every useful bound here is **amortized**, funded by a potential function of `roots + 2 x marked nodes`. Insert and each cut raise potential so a later operation can spend it: consolidation links away the accumulated roots, and a cascade is prepaid by the marks set on earlier decrease-keys. The marks and cascading cuts exist solely to keep `O(1)` decrease-key honest — remove them and the amortized argument collapses.

The two `O(n)` worst singles are the direct cost of laziness. A single extract-min can face a root list of `n` roots (every prior insert deferred its linking) and consolidate them all at once; a single decrease-key can cascade a cut all the way up a chain of `n` marked ancestors. Neither is amortized-cheap in isolation — only across a sequence.

Structurally the heap is `O(n)` nodes, but the per-node overhead is high: four pointers plus an integer degree and a mark bit, versus a binary heap's single flat array with no per-element pointers at all.

# Where Laziness and Amortization Stop Paying

The advertised `O(1)` decrease-key is amortized and only wins when decrease-key vastly outnumbers extract-min. That is exactly the dense-graph shape of [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] and Prim's [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|minimum spanning tree]] algorithm, where `E` relaxations dwarf `V` removals and the standard analysis reaches `O(E + V log V)`. On sparse graphs, or any workload where extract-min is a constant fraction of operations, the deferred consolidation is paid often enough that the asymptotic edge evaporates.

The constant factors and memory layout usually erase the win regardless of asymptotics. Each operation chases pointers through a forest of separately allocated nodes scattered across memory, so consolidation and cascading cuts thrash the cache, while a binary [[Computer Science/Data Structures/Trees/Heap-like/Heap|heap]] does index arithmetic over one contiguous array. Empirically an array-backed binary or quaternary heap — or a pairing heap — beats a Fibonacci heap on real Dijkstra inputs despite the worse `O(log n)` decrease-key.

The mark-and-cascading-cut machinery is intricate and error-prone: forgetting to clear a mark on promotion to root, or to stop the cascade at an unmarked parent, silently breaks the degree bound and quietly degrades consolidation without any crash. And because a single extract-min or a single cascading decrease-key can be `O(n)`, the structure is unsuitable anywhere per-operation latency matters, such as real-time scheduling — the guarantees hold only in aggregate.

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

> [!QUESTION]- Why are the mark bit and cascading cut necessary for the O(1) decrease-key bound?
> Cutting nodes out on decrease-key can thin a high-degree node until its subtree is almost empty, which would let consolidation link wide, shallow trees and blow past `O(log n)`. Allowing each node to lose only one child before it too is cut guarantees a degree-`k` node keeps at least `F(k + 2)` descendants, capping the maximum degree at `O(log n)`. The marks are the stored potential that funds the cascade, keeping decrease-key `O(1)` amortized.

> [!QUESTION]- Why is find-min O(1) but extract-min O(log n)?
> Heap order forces the global minimum to be a root, and the heap keeps a direct pointer to it, so find-min is a single read. Extract-min must remove that root, promote its children, and then consolidate the whole root list — linking equal-degree roots until degrees are distinct — which costs `O(log n)` amortized because the maximum degree is `O(log n)`.

# References

- [Fredman & Tarjan, "Fibonacci heaps and their uses in improved network optimization algorithms" (JACM 1987)](https://dl.acm.org/doi/10.1145/28869.28874) — the original structure, potential-function analysis, and the resulting Dijkstra/Prim bounds.
- [Fibonacci heap (Wikipedia)](https://en.wikipedia.org/wiki/Fibonacci_heap) — the amortized proof, the `F(k + 2)` degree bound, and the cascading-cut argument in full.
- [Larkin, Sen & Tarjan, "A back-to-basics empirical study of priority queues" (ALENEX 2014)](https://arxiv.org/abs/1403.0252) — benchmarks where implicit d-ary and pairing heaps beat Fibonacci heaps on real workloads.
- [Fredman, Sedgewick, Sleator & Tarjan, "The pairing heap: a new form of self-adjusting heap" (Algorithmica 1986)](https://link.springer.com/article/10.1007/BF01840439) — the simpler self-adjusting alternative with near-Fibonacci practical performance.
