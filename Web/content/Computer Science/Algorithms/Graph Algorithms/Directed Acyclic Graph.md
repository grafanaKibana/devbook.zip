---
publish: true
created: 2026-08-10T06:36:38.076Z
modified: 2026-08-10T06:36:38.076Z
published: 2026-08-10T06:36:38.076Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: A directed graph with no directed cycle; in finite graphs, its reachability order enables dependency-first processing.
level:
  - "4"
priority: High
status: Ready to Repeat
---

A **directed acyclic graph (DAG)** is a directed graph with no directed cycle. Both constraints are load-bearing: direction gives each edge a one-way meaning such as prerequisite → dependent, while acyclicity prevents a chain of dependencies from returning to its start. The underlying [[Computer Science/Data Structures/Graph Structures/Graph|Graph]] representation may vary; the DAG property concerns the relationships it represents.

Define `u ≺ v` when `v` is reachable from `u` by a path of positive length. In a DAG this relation is transitive because paths compose, and irreflexive because `u ≺ u` would be a directed cycle. Positive-length reachability is therefore a **strict partial order** on the vertices. Equivalently, allowing paths of length zero makes reachability reflexive and produces a partial order.

Finiteness matters for the standard structural consequences. Every non-empty finite DAG has at least one source and at least one sink. A finite directed graph admits a [[Computer Science/Algorithms/Graph Algorithms/Topological Sort|topological ordering]] exactly when it is acyclic: the order linearizes the dependency constraints without changing them.

# Real-World Examples

- **Build pipeline:** `source → compile → test → package`. Each edge points from a prerequisite to a dependent step, and no later step feeds back into an earlier one. A topological ordering therefore gives a valid execution sequence.
- **Course prerequisites:** `Algebra → Calculus → Numerical Methods`. A valid prerequisite chain cannot eventually require the starting course again. The absence of that cycle makes it possible to order courses so every prerequisite comes first.
- **Spreadsheet formulas:** `price, quantity → subtotal → tax → total`. Each formula reads values computed earlier in the dependency graph. Without a circular reference, the spreadsheet can evaluate cells in dependency order.

DAGs model build and task dependencies directly. They also describe the state-dependency order in finite one-pass [[Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic Programming]]. For a general digraph, contracting each [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly Connected Component]] produces a condensation graph that is always a DAG, separating cyclic regions from the order between them.

# Questions

> [!QUESTION]- Why must reachability use positive-length paths to be a strict partial order?
> A strict partial order is irreflexive. Positive-length reachability excludes the zero-edge path from a vertex to itself, while any other path back to itself would be a forbidden directed cycle. Allowing zero-length paths makes reachability reflexive and produces a non-strict partial order instead.

> [!QUESTION]- What fails after adding `C → A` to the dependency chain `A → B → C`?
> The new edge closes the directed cycle `A → B → C → A`, so reachability is no longer irreflexive. The graph is not a DAG and cannot have a topological ordering.

> [!QUESTION]- Why is the source-and-sink guarantee limited to non-empty finite DAGs?
> A finite topological ordering has a first vertex with no incoming edge and a last vertex with no outgoing edge. An infinite DAG need not have either: the integer chain with an edge `n → n + 1` for every integer has no cycle, but every vertex has both a predecessor and a successor.

> [!QUESTION]- Why is the condensation of strongly connected components acyclic?
> A directed cycle between distinct condensed components would make their vertices mutually reachable. They would therefore form one strongly connected component already, contradicting the assumption that they were distinct.

# References

- [NIST Dictionary of Algorithms and Data Structures: directed acyclic graph](https://xlinux.nist.gov/dads/HTML/directAcycGraph.html) — defines a DAG as a directed graph with no path that starts and ends at the same vertex.
- [MIT 6.042J Mathematics for Computer Science, Session 18, sections 9.5–9.6](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_session18.pdf) — proves that every finite DAG has a topological sort and characterizes positive-length reachability as a strict partial order.
- [A. B. Kahn, “Topological sorting of large networks” (1962)](https://dl.acm.org/doi/10.1145/368996.369025) — presents the original construction for obtaining a topological order; algorithm details remain in the dedicated topological-sort note.
