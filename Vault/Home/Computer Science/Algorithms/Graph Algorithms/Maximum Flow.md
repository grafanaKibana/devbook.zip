---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finds the greatest s-to-t throughput in a capacitated network by repeatedly augmenting paths in a residual graph."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A directed network carries a divisible resource — water, bandwidth, matched pairs — from a source `s` to a sink `t`. Every edge `u → v` has a **capacity** bounding what it can carry, and a valid flow obeys two constraints: no edge exceeds its capacity, and every vertex other than `s` and `t` sends out exactly what it takes in (conservation). The **maximum-flow** problem asks for the greatest total rate leaving `s` and arriving at `t`.

Pushing flow along any `s → t` path with spare capacity is the obvious move, but pure [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] wedges below the optimum: an early path can saturate an edge the best solution routes around, and conservation then leaves no legal path to correct it. The fix is the **residual graph**. For an edge carrying flow `f` out of capacity `c`, it holds a forward arc with residual `c − f` (room left) and a backward arc with residual `f` (flow that can be pushed back). An augmenting path that traverses a backward arc cancels and reroutes earlier flow, so no committed decision is permanent. The loop finds an augmenting `s → t` path in the residual graph, pushes its bottleneck residual capacity, and stops when no such path remains — at which point the flow value equals the capacity of the minimum `s`-`t` cut.

The transition worth animating is a backward arc in the residual graph retracting an earlier, suboptimal augmenting path.

```steptrace
{"algorithm":"maximum-flow"}
```

# Why the Residual Graph Makes Greedy Exact

Take the unit-capacity network `s→a, s→b, a→b, a→t, b→t`; its maximum flow is 2, since only `s→a` and `s→b` leave the source. A greedy first augmentation along `s → a → b → t` saturates all three of its edges and reports flow 1. Every remaining forward path is now blocked — `s→a` and `b→t` are full — so a forward-only algorithm stops one unit short.

The residual graph reopens the choice. Sending one unit `a → b` created a backward arc `b → a` with residual 1. The path `s → b → a → t` uses that backward arc: `b → a` retracts the earlier `a → b` unit and reroutes it, so `a → b` returns to zero while `s→a→t` and `s→b→t` each carry one unit. Flow reaches 2. The backward arc is the entire reason a locally-committed, wrong routing decision can be undone; forward-only residuals leave no legal move to reach that state, which is exactly why greedy-without-residuals returns a value below the maximum.

# Termination and the Min Cut

An `s`-`t` **cut** splits the vertices into `S` (containing `s`) and `T` (containing `t`); its capacity is the total capacity of the original edges crossing `S → T`. Any flow value is bounded by any cut capacity, because everything reaching `t` must cross the partition. The **max-flow min-cut theorem** sharpens that to equality: the maximum flow equals the minimum cut capacity.

The theorem also names the cut. When no augmenting path remains, let `S` be the vertices still reachable from `s` in the final residual graph; `t ∉ S`, or a path would exist. Every original edge from `S` to `T` is saturated — an unsaturated one would keep a forward residual arc and extend reachability — and no flow crosses back from `T` to `S`, so the cut capacity equals the flow value. Reachability in the residual graph is therefore a checkable optimality certificate: it both proves the flow is maximal and reads off the bottleneck edges. The cut side `S` comes from the *residual* reachable set, but the reported edges are the *original* forward edges out of `S`.

# Complexity

The three algorithms share the residual-graph invariant but schedule work differently: Ford–Fulkerson chooses one path, Edmonds–Karp chooses the shortest residual path, and Dinic builds a level graph and batches paths into a blocking flow.

| Algorithm | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Ford–Fulkerson (any augmenting path) | `O(E·F)` for integral capacities | `O(V + E)` | Each augmentation adds at least one unit, so there are at most `F` iterations, each an `O(E)` path search. |
| Edmonds–Karp (BFS shortest path) | `O(V·E²)` | `O(V + E)` | Shortest-path augmentation keeps the BFS distance `s→v` non-decreasing; each edge is the bottleneck `O(V)` times, capping augmentations at `O(V·E)`, each BFS `O(E)`. Independent of capacities. |
| Dinic (level graph + blocking flow) | `O(V²·E)` | `O(V + E)` | The level graph's depth strictly increases across `O(V)` phases; each blocking flow costs `O(V·E)`. |

`F` is the integral maximum-flow value. Rational capacities terminate after multiplication by a common denominator, but the pseudo-polynomial bound then uses the **scaled** value of `F`; irrational capacities can fail to terminate under adversarial path choices. Dinic tightens to `O(E·√V)` on unit networks such as bipartite-matching reductions. General unit-capacity networks have the unconditional `O(E·√E)` bound; without parallel same-direction arcs, the Even–Tarjan analysis also gives `O(E·V^(2/3))`. The `O(V + E)` auxiliary space holds the residual adjacency structure plus the traversal frontier. The matrix reference implementation below trades this for `O(V²)` in exchange for readability.

# Where the Guarantees Break

Two failure modes both trace back to the residual mechanism.

**Irrational capacities with adversarial path choice.** Plain Ford–Fulkerson, free to pick any augmenting path, can chase ever-smaller bottlenecks whose sum converges to a value strictly *below* the true maximum — and the loop never terminates. The `O(E·F)` bound assumes integral capacities so each augmentation adds a whole unit. Rational capacities terminate after scaling by a common denominator, with the bound measured against the scaled `F`; Edmonds–Karp removes dependence on capacity magnitudes entirely (`O(V·E²)`). The bad behaviour is not the graph — it is the path selection interacting with capacity values.

**Omitting the backward arcs.** A forward-only residual graph cannot undo. On the `s→a→b→t` network above, dropping the paired reverse arcs leaves the algorithm stalled at flow 1 instead of 2, because `s → b → a → t` never becomes available — the wrong state is a plausible, silently-suboptimal answer, not a crash. In code the usual cause is storing an edge without its reverse; the standard guard keeps edges in an array and accesses the reverse of edge `i` as `i XOR 1`, so `+f` on one arc always applies `−f` to its partner.

# Reference Drawer

> [!ABSTRACT]- Augmenting-path loop
>
> ```mermaid
> flowchart TD
>   A[Zero flow; residual = capacities] --> B{Augmenting path s→t in residual?}
>   B -->|No| C[Return flow; min cut = edges out of s-reachable set]
>   B -->|Yes| D[Bottleneck = min residual on the path]
>   D --> E[Add bottleneck to forward arcs, subtract on reverse arcs]
>   E --> B
> ```

> [!EXAMPLE]- Edmonds–Karp in C#
>
> ```csharp
> public static int MaxFlow(int[,] capacity, int source, int sink)
> {
>     int n = capacity.GetLength(0);
>     var residual = (int[,])capacity.Clone();
>     int maxFlow = 0;
>
>     while (true)
>     {
>         // BFS for a shortest augmenting path; parent[v] is v's predecessor.
>         var parent = new int[n];
>         Array.Fill(parent, -1);
>         parent[source] = source;
>         var queue = new Queue<int>();
>         queue.Enqueue(source);
>
>         while (queue.Count > 0 && parent[sink] == -1)
>         {
>             int u = queue.Dequeue();
>             for (int v = 0; v < n; v++)
>             {
>                 if (parent[v] == -1 && residual[u, v] > 0)
>                 {
>                     parent[v] = u;
>                     queue.Enqueue(v);
>                 }
>             }
>         }
>
>         if (parent[sink] == -1)
>         {
>             break; // No augmenting path: the flow is maximal.
>         }
>
>         int bottleneck = int.MaxValue;
>         for (int v = sink; v != source; v = parent[v])
>         {
>             bottleneck = Math.Min(bottleneck, residual[parent[v], v]);
>         }
>
>         for (int v = sink; v != source; v = parent[v])
>         {
>             int u = parent[v];
>             residual[u, v] -= bottleneck; // forward arc down
>             residual[v, u] += bottleneck; // reverse arc up
>         }
>
>         maxFlow += bottleneck;
>     }
>
>     return maxFlow;
> }
> ```
> The `residual[v, u] += bottleneck` line is the back-edge update; without it the forward-only version stops below the maximum. On return, the vertices still reachable from `source` in the last BFS form the min-cut side `S`. The adjacency-matrix form costs `O(V²)` space and scans `Θ(V²)` cells per BFS, so its Edmonds–Karp bound is `O(V³E)` rather than the adjacency-list `O(VE²)`. It still represents feasible net flow when antiparallel original edges share a pair of cells, but paired edge objects are required to reconstruct the individual flow carried by each original edge; an adjacency-list residual with `XOR 1` reverse edges restores `O(V + E)` space and `O(E)` BFS scans.

# Comparison

| Algorithm | Time | Path / technique | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Ford–Fulkerson | `O(E·F)` for integral capacities | Any augmenting path ([[Home/Computer Science/Algorithms/Graph Algorithms/DFS BFS\|DFS]] or arbitrary) | Tiny integral max-flow value; the conceptual skeleton | Large or non-integral capacities; may not terminate on irrationals |
| Edmonds–Karp | `O(V·E²)` | [[Home/Computer Science/Algorithms/Graph Algorithms/DFS BFS\|BFS]] shortest augmenting path | Simple, capacity-independent polynomial baseline | Dense graphs where `E ≈ V²` inflate the `E²` term |
| Dinic | `O(V²·E)`; `O(E·√V)` on unit networks | BFS level graph + blocking flow | Batches augmentations; standard for bipartite matching | More code than Edmonds–Karp for small inputs |

Edmonds–Karp is the simplest polynomial baseline. Dinic keeps the residual-path model but batches augmentations, earning its extra code on larger graphs and matching workloads. Ford–Fulkerson is the model to reason from rather than the default to ship: its value-dependent bound and non-termination on irrational capacities make path selection part of correctness. Algorithms such as push–relabel use different internal invariants, but once they return a maximum flow, the minimum cut is still recovered by the same `O(V + E)` residual reachability from `s`.

# Questions

> [!QUESTION]- Why do residual back-edges make greedy augmenting paths exact?
> A greedy first path can commit flow to an edge the optimum routes around, and conservation then blocks every forward correction. Each unit sent `u → v` creates a residual back-arc `v → u` of equal capacity, and a later augmenting path can traverse it to retract and reroute that flow. The loop therefore cannot stop until no `s → t` path remains — which, by max-flow min-cut, is the maximum. Without the back-arcs the algorithm can wedge strictly below it.

> [!QUESTION]- How is the minimum cut recovered once the flow is maximal?
> Let `S` be the vertices reachable from `s` in the final residual graph; `t` is not among them. Every original edge from `S` to `T` is saturated, so the sum of their capacities equals the flow value. The cut side comes from residual reachability, but the reported edges are the original forward edges out of `S`.

> [!QUESTION]- Why is Edmonds–Karp `O(V·E²)` while Ford–Fulkerson is `O(E·F)` only for integral capacities?
> Ford–Fulkerson bounds iterations by the integral flow value because each augmentation adds at least one unit — a bound that inflates with large capacities and does not apply to irrational ones. Edmonds–Karp augments along the fewest-edge path via BFS; the BFS distance to each vertex never decreases, so each edge is the bottleneck `O(V)` times, capping augmentations at `O(V·E)`. With `O(E)` per BFS that is `O(V·E²)`, independent of capacity magnitudes.

# References

- [Maximum flow problem (Wikipedia)](https://en.wikipedia.org/wiki/Maximum_flow_problem) — flow-network definition, the augmenting-path family, and the reductions (bipartite matching, project selection, segmentation).
- [Maximal Flow Through a Network](https://doi.org/10.4153/CJM-1956-045-5) — Ford and Fulkerson's primary paper introducing augmenting paths and the max-flow/min-cut relation.
- [Maximum flow: Ford–Fulkerson and Edmonds–Karp (cp-algorithms)](https://cp-algorithms.com/graph/edmonds_karp.html) — residual graphs and both augmenting-path algorithms, built on a capacity/flow adjacency matrix like the drawer's reference implementation.
- [Max-flow min-cut theorem (Wikipedia)](https://en.wikipedia.org/wiki/Max-flow_min-cut_theorem) — theorem statement, weak-duality bound, and cut recovery from the residual reachable set.
- [Network Flow and Testing Graph Connectivity](https://doi.org/10.1137/0204043) — Even and Tarjan's primary analysis of blocking-flow bounds for unit-capacity networks without parallel arcs.
- [Dinic's algorithm (cp-algorithms)](https://cp-algorithms.com/graph/dinic.html) — level graphs, blocking flows, general complexity, and the unit-network bipartite-matching case.
