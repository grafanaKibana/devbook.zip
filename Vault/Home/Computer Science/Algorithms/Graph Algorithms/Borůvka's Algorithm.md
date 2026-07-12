---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A [[Minimum Spanning Tree]] can be built from many independent fragments instead of one growing frontier. Borůvka's algorithm starts with every vertex as its own component. In each round, every component selects its cheapest outgoing edge. The distinct selections become candidates; a [[Disjoint Set]] accepts each candidate only if its endpoints still belong to different components, then the joined components contract before the next round.

The cut property certifies each candidate relative to the component that selected it. A component defines a cut between its vertices and the rest of the graph, so its cheapest outgoing edge belongs to some MST. Several components can select the same edge, and equal-weight selections can collectively form a cycle; deduplication plus the union-find check keeps only a compatible forest for the round.

> [!NOTE] Visualization pending
> Planned StepTrace: begin with singleton components, highlight each component's cheapest outgoing edge, merge all distinct safe edges, then repeat on the contracted component graph.

## Components shrink by rounds

For vertices `A, B, C, D` with edges `AB=1`, `AC=4`, `BC=2`, `BD=5`, `CD=3`, the first round selects `AB` for `A`, `AB` for `B`, `BC` for `C`, and `CD` for `D`. After duplicate removal, all three edges are safe and the graph becomes one component in a single round.

In the general case, every component that is not isolated chooses an edge to another component. Once distinct choices are unioned, the number of components falls by at least half: each surviving component contains at least two previous components. There are therefore at most `⌈log₂ V⌉` rounds.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(E)` | `O(V)` | one scan connects all components |
| Average | `O(E log V)` | `O(V)` | each round scans edges and component count halves |
| Worst | `O(E log V)` | `O(V)` | up to logarithmically many contraction rounds |

The table assumes a flat edge list, one cheapest-edge slot per component, and a [[Disjoint Set]] for contraction. Union-find contributes `O(E α(V))` across scans; repeated edge inspection determines the main bound. Parallel implementations can distribute the edge scan and component-minimum reduction, changing elapsed time without changing total work.

## Boundary cases

Parallel edges are harmless: only the lightest outgoing candidate for a component survives the round. Equal weights can lead to different valid MSTs, so a deterministic implementation needs a stable tie-break such as normalized endpoint order.

An isolated component has no outgoing edge. If more than one component remains after a round and none can select an outgoing edge, the input is disconnected and the result is a minimum spanning forest.

Selected edges cannot be appended blindly. Two components can nominate the same edge, and later selections in the same round can become internal after earlier unions. Each candidate still passes through a union-find check before it enters the result.

## References

- [Otakar Borůvka on minimum spanning tree problem](https://doi.org/10.1016/S0012-365X(00)00224-7) — English translations of Borůvka's 1926 papers with historical and algorithmic commentary.
- [Minimum Spanning Trees](https://algs4.cs.princeton.edu/43mst/) — cut-property treatment and comparison with the standard MST algorithms.
