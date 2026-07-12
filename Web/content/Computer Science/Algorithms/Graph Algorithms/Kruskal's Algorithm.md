---
publish: true
created: 2026-07-12T14:27:20.404Z
modified: 2026-07-12T14:27:20.404Z
published: 2026-07-12T14:27:20.404Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

A connected, undirected, weighted graph can contain many spanning trees. [[Minimum Spanning Tree]] asks for the one with minimum total edge weight. Kruskal's algorithm treats the graph as an edge list: sort every edge from lightest to heaviest, then accept an edge only when it joins two components that are still separate.

The cycle test is the whole mechanism. A [[Disjoint Set]] stores the current forest components. If `find(u) == find(v)`, edge `(u, v)` would close a cycle and is rejected; otherwise `union(u, v)` merges the components and the edge enters the result. The cut property makes that greedy choice safe: the lightest edge crossing a cut belongs to some MST.

> [!NOTE] Visualization pending
> Planned StepTrace: scan a sorted edge list, show union-find component labels, accept edges that merge components, and reject the first edge whose endpoints already share a root.

## One sorted scan

For edges `AB=1`, `BC=2`, `AC=3`, `CD=4`, the initial components are `{A}`, `{B}`, `{C}`, `{D}`.

| Edge | Component test | Decision | Components after |
| --- | --- | --- | --- |
| `AB=1` | `A` and `B` differ | accept | `{A,B}`, `{C}`, `{D}` |
| `BC=2` | `B` and `C` differ | accept | `{A,B,C}`, `{D}` |
| `AC=3` | `A` and `C` match | reject cycle | unchanged |
| `CD=4` | `C` and `D` differ | accept | `{A,B,C,D}` |

The accepted edges have total weight `7` and stop at `V - 1 = 3` edges. At every acceptance, the endpoints lie on opposite sides of a current component cut, and no lighter unprocessed edge crosses that cut.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(E log E)` | `O(V)` plus sort workspace | comparison sorting still orders the full edge list |
| Average | `O(E log E)` | `O(V)` plus sort workspace | sorting dominates near-constant union-find operations |
| Worst | `O(E log E)` | `O(V)` plus sort workspace | all edges may be scanned before connectivity is known |

With path compression and union by rank or size, the disjoint-set work is `O(E α(V))`; sorting remains dominant. The `O(V)` term is the union-find forest and assumes an in-place edge sort. A sort that allocates a temporary edge buffer raises auxiliary space to `O(V + E)`. The result itself stores `V - 1` edges and is excluded from auxiliary space.

## Boundary cases

A disconnected graph never reaches `V - 1` accepted edges. The scan returns a minimum spanning forest rather than an MST, so the edge count must be checked.

Equal weights can produce several valid MSTs. Sort stability or an explicit endpoint tie-break changes which equal-weight edge enters, but not the minimum total weight. Negative weights require no special handling: ascending order and the cut property remain valid.

## References

- [On the Shortest Spanning Subtree of a Graph and the Traveling Salesman Problem](https://www.ams.org/journals/proc/1956-007-01/S0002-9939-1956-0078686-7/) — Kruskal's original 1956 paper.
- [Minimum spanning tree — Kruskal with disjoint set union](https://cp-algorithms.com/graph/mst_kruskal_with_dsu.html) — implementation details and union-find complexity.
