---
publish: true
created: 2026-07-12T06:27:34.381Z
modified: 2026-07-18T11:30:03.706Z
published: 2026-07-18T11:30:03.706Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Maximal mutually-reachable vertex sets of a digraph, found in O(V+E) by Kosaraju's or Tarjan's.
level:
  - "4"
priority: Medium
status: Creation
---

A package manager resolves a directed dependency graph. When two packages depend on each other, directly or through a longer cycle, no install order separates them — they form one unit that has to be reasoned about together. Discovering every such unit by running a fresh reachability search from each vertex costs `O(V · (V + E))`.

A **strongly connected component** (SCC) is a maximal set of vertices in which every vertex reaches every other: for any `u, v` in the set there is a path `u → v` **and** a path `v → u`. Mutual reachability partitions a digraph into disjoint SCCs, and a single [[DFS BFS|depth-first traversal]] recovers all of them in `O(V + E)` — the cost of one search rather than `V` of them. Collapsing each SCC to a single node yields the **condensation**, which is always a DAG: a cycle between two components would make their vertices mutually reachable, merging them into one. That property makes SCC decomposition the standard preprocessing for cyclic digraphs — 2-SAT, deadlock and dependency analysis, and any dataflow that wants a [[Topological Sort|topological order]] but has cycles in the way.

Edge direction is the whole point. On an undirected graph mutual reachability is just reachability, so "strongly connected components" collapse to ordinary connected components, answered by [[Union-Find|union-find]] or flood fill.

**Core condition:** directed graph → maximal mutually reachable vertex sets → one linear DFS carrying a discovery/low-link pair → `O(V + E)` decomposition whose condensation is a DAG.

The event that decides a component is the pop, the moment a root vertex's low-link stays equal to its own discovery index.

> [!NOTE] Visualization pending
> Planned StepTrace: a graph card showing a DFS that assigns each vertex a discovery index and a low-link, and pops the active stack to emit one SCC whenever a root vertex's low-link equals its discovery index. No matching renderer exists in `engine.js` yet.

# Tarjan's single pass

Tarjan computes every SCC in one DFS by recording, for each vertex, when it was discovered and how far back the search can climb from its subtree.

- `disc[v]` — the discovery index, assigned once when the DFS first enters `v`.
- `low[v]` — the smallest `disc` reachable from `v`'s subtree using tree edges plus **at most one** edge to a vertex still on the stack.
- an explicit stack of vertices discovered but not yet assigned to a finished component, with an `onStack[v]` flag.

On entry, `disc[v] = low[v] = time++`, and `v` is pushed. For each edge `v → w`: if `w` is unvisited, recurse and then `low[v] = min(low[v], low[w])`; if `w` is already visited **and** still on the stack, `low[v] = min(low[v], disc[w])`. After all edges of `v` are processed, `low[v] == disc[v]` means nothing in `v`'s subtree found a route back to a vertex discovered before `v`. `v` is then the **root** — the entry point — of its component, and the stack is popped down to and including `v` to emit that SCC.

The stack is what separates a finished component from an active one: a vertex leaves the stack exactly when its component is emitted, so the `onStack` guard restricts the second update to edges that stay inside the component under construction. The `disc`/`low` machinery is the same used to locate [[Articulation Points and Bridges|articulation points]]; only the acceptance rule differs.

A trace on `A→B, B→C, C→A, C→D, D→E, E→D` finds `{A, B, C}` and `{D, E}`.

```text
DFS from A. Format: disc/low, stack shown after each event.

visit A  disc=0 low=0   stack=[A]
 visit B disc=1 low=1   stack=[A,B]
  visit C disc=2 low=2  stack=[A,B,C]
   edge C→A: A on stack -> low[C]=min(2, disc[A]=0)=0
   visit D disc=3 low=3 stack=[A,B,C,D]
    visit E disc=4 low=4 stack=[A,B,C,D,E]
     edge E→D: D on stack -> low[E]=min(4, disc[D]=3)=3
    E done: low[E]=3 != disc[E]=4  -> not a root
   back in D: low[D]=min(3, low[E]=3)=3
   D done: low[D]=3 == disc[D]=3   -> ROOT, pop to D  => SCC {E, D}
  back in C: low[C]=0
  C done: low[C]=0 != disc[C]=2    -> not a root
 back in B: low[B]=min(1, low[C]=0)=0
 B done: low[B]=0 != disc[B]=1     -> not a root
back in A: low[A]=min(0, low[B]=0)=0
A done: low[A]=0 == disc[A]=0      -> ROOT, pop to A  => SCC {C, B, A}
```

The components leave the stack in reverse topological order of the condensation — `{D, E}` before `{A, B, C}` — a byproduct Tarjan shares with a DFS-based [[Topological Sort]].

# Kosaraju's two passes

Kosaraju reaches the same partition with two plain DFS runs and no low-link bookkeeping.

1. DFS over `G`; when a vertex finishes (all descendants explored), push it. The stack ends in **decreasing finish order**.
2. Build the **transpose** `Gᵀ` — every edge reversed.
3. Pop vertices; for each still-unvisited one, DFS in `Gᵀ`. Each DFS tree is exactly one SCC.

Finish order is a reverse topological order of the condensation: the last vertex to finish lies in a _source_ SCC, one with no incoming condensation edges. Reversing every edge turns that source into a _sink_ — a component reachable from the start vertex but with no edge leading out to a not-yet-emitted component. The second DFS therefore fills exactly one SCC and stalls, then the next stack vertex opens the next sink. Drop either the finish order or the transpose and the one-tree-per-component guarantee collapses.

# Complexity

| Algorithm | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Tarjan's | `Θ(V + E)` | `O(V)` | One DFS touches each vertex and edge once; `disc`, `low`, `onStack`, and the explicit stack are each `O(V)`. |
| Kosaraju's | `Θ(V + E)` | `O(V + E)` | Two DFS passes stay linear, but materializing the transpose `Gᵀ` stores a reversed copy of every edge. |

Neither bound has a best/average/worst split: every vertex and edge is processed a fixed number of times regardless of input shape, so `Θ(V + E)` is tight in all cases. The recursive form of either algorithm adds call-stack space bounded by the longest DFS path, up to `O(V)`.

# Reference drawer

> [!ABSTRACT]- Structural view
>
> ```mermaid
> flowchart LR
>   subgraph one ["SCC A-B-C"]
>     A --> B
>     B --> C
>     C --> A
>   end
>   subgraph two ["SCC D-E"]
>     D --> E
>     E --> D
>   end
>   C --> D
> ```
>
> Collapsing each subgraph to a single node gives the condensation `A-B-C → D-E`, a two-node DAG.

> [!EXAMPLE]- Tarjan in C#
>
> ```csharp
> public sealed class Tarjan
> {
>     private readonly List<int>[] _adjacency;
>     private readonly int[] _disc;
>     private readonly int[] _low;
>     private readonly bool[] _onStack;
>     private readonly Stack<int> _stack = new();
>     private readonly List<List<int>> _components = new();
>     private int _time;
>
>     public Tarjan(List<int>[] adjacency)
>     {
>         _adjacency = adjacency;
>         var n = adjacency.Length;
>         _disc = new int[n];
>         _low = new int[n];
>         _onStack = new bool[n];
>         Array.Fill(_disc, -1);
>     }
>
>     public List<List<int>> Components()
>     {
>         for (var v = 0; v < _adjacency.Length; v++)
>         {
>             if (_disc[v] == -1)
>             {
>                 StrongConnect(v);
>             }
>         }
>
>         return _components;
>     }
>
>     private void StrongConnect(int v)
>     {
>         _disc[v] = _low[v] = _time++;
>         _stack.Push(v);
>         _onStack[v] = true;
>
>         foreach (var w in _adjacency[v])
>         {
>             if (_disc[w] == -1)
>             {
>                 StrongConnect(w);
>                 _low[v] = Math.Min(_low[v], _low[w]);
>             }
>             else if (_onStack[w])
>             {
>                 _low[v] = Math.Min(_low[v], _disc[w]);
>             }
>         }
>
>         if (_low[v] == _disc[v])
>         {
>             var component = new List<int>();
>             int w;
>             do
>             {
>                 w = _stack.Pop();
>                 _onStack[w] = false;
>                 component.Add(w);
>             }
>             while (w != v);
>
>             _components.Add(component);
>         }
>     }
> }
> ```
>
> The `onStack[w]` guard paired with `disc[w]` — never `low[w]` — for the non-tree edge is what keeps separate components apart; `Components()` returns them in reverse topological order of the condensation.

# When the decomposition goes wrong

The fatal Tarjan mistake is dropping the `onStack[w]` guard on the second update, `low[v] = min(low[v], disc[w])`. A cross edge can point at a vertex `w` that already belongs to a _finished, popped_ component — a subtree the search can never climb back through. Folding its `disc[w]` into `low[v]` anyway drags `low[v]` below `disc[v]`, so `v` fails the `low == disc` root test and two independent components fuse into one, producing too few SCCs. The `onStack` check is exactly what excludes those already-emitted vertices. Substituting `low[w]` for `disc[w]` _inside_ the guarded on-stack branch is a different matter: it still yields the correct partition, because that update fires only when `w` is on the stack, which means `w`'s root is an active ancestor of `v` and the two already share a component — so no low-link ever crosses a component boundary. It merely departs from the strict low-link definition ("at most one edge to an on-stack vertex") and is a common, correct variant.

Direction is a hard precondition. SCCs are defined by two-way reachability, which only carries information when edges have direction. On an undirected graph every edge is symmetric, mutual reachability degenerates into ordinary reachability, and every SCC is just a connected component. The `disc`/`low`/stack machinery still runs but reveals nothing new; [[Union-Find|union-find]] or flood fill answers the undirected question directly.

Kosaraju's isolation guarantee comes entirely from running the second DFS on `Gᵀ`. Reusing `G` returns, for each start vertex, everything it can reach — fusing every downstream component into the first tree. The transpose must be materialized, or an explicit reversed adjacency view supplied; this is the `O(V + E)` memory that Tarjan's single pass avoids.

# Comparison

| Algorithm | Time | Auxiliary space | Passes | Distinguishing mechanism | Stronger case |
| --- | --- | --- | --- | --- | --- |
| Tarjan's | `Θ(V + E)` | `O(V)` | one DFS | `disc`/`low` arrays + explicit stack, root test `low == disc` | Lowest constant factor, no reversed copy, SCCs emitted in reverse topological order |
| Kosaraju's | `Θ(V + E)` | `O(V + E)` | two DFS | finish-order stack + transpose graph, no low-link | Easiest to implement and prove correct — two plain traversals |
| Gabow's | `Θ(V + E)` | `O(V)` | one DFS | two stacks, no `low` array; a boundary stack replaces the low-link comparison | Single pass without the fragile low-link update, sidestepping the cross-edge bug |

All three are linear, so the choice turns on constant factor and which failure mode is easier to avoid. Tarjan's single pass with no reversed graph is the efficient default, and it hands back a reverse-topological ordering of the condensation for free. Kosaraju pays an extra pass and an `O(V + E)` transpose but is the easiest to reconstruct correctly, since each half is an ordinary DFS. Gabow matches Tarjan's cost and single pass while replacing the low-link array with a second stack, which removes the exact cross-edge update that most often gets Tarjan wrong. Because every condensation is a DAG, any of them can feed a [[Topological Sort]] directly — the DFS-based variants already emit components in reverse topological order.

# Questions

> [!QUESTION]- In Tarjan's algorithm, what does `low[v] == disc[v]` mean, and why does it identify an SCC root?
> `disc[v]` is `v`'s discovery index; `low[v]` is the smallest discovery index reachable from `v`'s subtree through tree edges and at most one edge to an on-stack vertex. Equality means nothing in the subtree found a route back to a vertex discovered before `v`, so `v` is the entry point of its component. Popping the stack down to `v` emits exactly that SCC.

> [!QUESTION]- Why may only vertices still on the stack lower `low[v]`?
> The stack holds vertices whose component is not yet finished. An edge to an on-stack vertex stays inside the component under construction, so it legitimately extends the reach recorded by `low`. An edge to an already-popped vertex points into a finished component the search can never climb back through; taking its discovery index would drag `low[v]` below `disc[v]`, break the root test, and merge two separate SCCs.

> [!QUESTION]- Why does Kosaraju's second DFS run on the transpose in decreasing finish order?
> First-pass finish times form a reverse topological order of the condensation, so the last vertex to finish lies in a source SCC. Reversing every edge turns that source into a sink — reachable from the start vertex but with no edge leading out to a not-yet-emitted component. Each second-pass DFS therefore fills one SCC and stops. Removing either the finish order or the transpose destroys that isolation.

> [!QUESTION]- Why is the condensation of a digraph always a DAG, and what does that buy?
> Each SCC is a maximal mutually reachable set. A cycle between two distinct components would make every vertex in both mutually reachable, so they would already be one component — a contradiction. With no cycles left, the condensation admits a topological order, which lets DAG-only techniques (topological sort, DAG dynamic programming, 2-SAT implication solving) run on graphs that originally contained cycles.

# References

- [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010) — Robert Tarjan's 1972 paper introducing the discovery/low-link DFS and the single-pass SCC procedure.
- [Finding strongly connected components](https://cp-algorithms.com/graph/strongly-connected-components.html) — Kosaraju's two-pass algorithm with the transpose, the condensation, and a correctness argument.
- [Tarjan's strongly connected components algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm) — the low-link invariant, the `onStack` guard, and the reverse-topological output order.
- [Path-Based Depth-First Search for Strong and Biconnected Components](https://doi.org/10.1016/S0020-0190%2800%2900051-X) — Harold Gabow's two-stack variant that computes SCCs in one pass without a low-link array.
