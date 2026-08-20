---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "A directed graph with no directed cycle. In finite graphs, its reachability order enables dependency-first processing."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

A **directed acyclic graph (DAG)** is a directed graph with no directed cycle. Direction gives each edge a one-way meaning such as prerequisite → dependent. Acyclicity prevents a dependency chain from returning to its start. The underlying [[Home/Computer Science/Data Structures/Graph Structures/Graph|Graph]] representation may vary. The DAG property concerns the relationships it represents.

Define `u ≺ v` when `v` is reachable from `u` by a path of positive length. In a DAG this relation is transitive because paths compose, and irreflexive because `u ≺ u` would be a directed cycle. Positive-length reachability is therefore a **strict partial order** on the vertices. Equivalently, allowing paths of length zero makes reachability reflexive and produces a partial order.

Finiteness matters for the standard structural consequences. Every non-empty finite DAG has at least one source and at least one sink. A finite directed graph admits a [[Home/Computer Science/Algorithms/Graph Algorithms/Topological Sort|topological ordering]] exactly when it is acyclic: the order linearizes the dependency constraints without changing them.

> [!NOTE]
> A DAG need not be a tree. It may have several sources or sinks, and two vertices may be connected by several distinct directed paths. A rooted directed tree is the narrower case in which every non-root vertex has exactly one parent.

# Real-World Examples

- **Build pipeline:** `source → compile → test → package`. Each edge points from a prerequisite to a dependent step, and no later step feeds back into an earlier one. A topological ordering therefore gives a valid execution sequence.
- **Course prerequisites:** `Algebra → Calculus → Numerical Methods`. A valid prerequisite chain cannot eventually require the starting course again. The absence of that cycle makes it possible to order courses so every prerequisite comes first.
- **Spreadsheet formulas:** `price, quantity → subtotal → tax → total`. Each formula reads values computed earlier in the dependency graph. Without a circular reference, the spreadsheet can evaluate cells in dependency order.

DAGs model build and task dependencies directly. They also describe the state-dependency order in finite one-pass [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic Programming]]. For a general digraph, contracting each [[Home/Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly Connected Component]] produces a condensation graph that is always a DAG, separating cyclic regions from the order between them.

# References

- [NIST Dictionary of Algorithms and Data Structures: directed acyclic graph](https://xlinux.nist.gov/dads/HTML/directAcycGraph.html)
- [MIT 6.042J Mathematics for Computer Science, Session 18, sections 9.5–9.6](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_session18.pdf)
