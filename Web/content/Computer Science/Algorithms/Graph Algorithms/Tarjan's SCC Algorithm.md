---
publish: true
created: 2026-08-10T06:36:38.078Z
modified: 2026-08-10T06:36:38.078Z
published: 2026-08-10T06:36:38.078Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds strongly connected components in one DFS using discovery indices, low links, and an active-vertex stack.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

[[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly connected components]] collapse every mutually reachable region of a digraph into one node. Tarjan's algorithm finds that partition in one DFS. It records when each vertex was discovered, how far an active subtree can reach back, and which vertices still belong to a component under construction.

The decisive event is a pop. When a vertex cannot reach an earlier active vertex, it is the root of one SCC; popping the stack down to that vertex emits the whole component. The canonical SCC page carries the interactive Tarjan trace and growth chart, so this focused note does not duplicate either payload.

# Low-Link State

- `disc[v]` is the discovery index assigned when DFS first enters `v`.
- `low[v]` is the smallest discovery index reachable from `v` through DFS-tree edges plus at most one edge to a vertex still on the stack.
- `onStack[v]` distinguishes an active vertex from one already assigned to a completed component.

On entry, set `disc[v] = low[v] = time++` and push `v`. For each edge `v → w`, recurse when `w` is unvisited and then fold `low[w]` into `low[v]`. If `w` is already visited and still active, fold `disc[w]` into `low[v]`. After all outgoing edges, `low[v] == disc[v]` identifies an SCC root.

On `A→B, B→C, C→A, C→D, D→E, E→D`:

```text
visit A  disc=0 low=0   stack=[A]
 visit B disc=1 low=1   stack=[A,B]
  visit C disc=2 low=2  stack=[A,B,C]
   edge C→A: low[C]=0
   visit D disc=3 low=3 stack=[A,B,C,D]
    visit E disc=4 low=4 stack=[A,B,C,D,E]
     edge E→D: low[E]=3
   D done: low[D]=disc[D]=3 -> pop {E,D}
  back in C: low[C]=min(0, low[D]=3)=0
 back in B: low[B]=min(1, low[C]=0)=0
back in A: low[A]=min(0, low[B]=0)=0
A done: low[A]=disc[A]=0 -> pop {C,B,A}
```

The components leave in reverse topological order of the condensation: `{D, E}` before `{A, B, C}`.

# Reference Drawer

> [!EXAMPLE]- C# implementation
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
>         _disc = new int[adjacency.Length];
>         _low = new int[adjacency.Length];
>         _onStack = new bool[adjacency.Length];
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
>         if (_low[v] != _disc[v])
>         {
>             return;
>         }
>
>         var component = new List<int>();
>         int w;
>         do
>         {
>             w = _stack.Pop();
>             _onStack[w] = false;
>             component.Add(w);
>         }
>         while (w != v);
>
>         _components.Add(component);
>     }
> }
> ```

# The Guard That Keeps Components Separate

The non-tree update must ignore a vertex already removed from the stack. Such an edge points into a finished component that the current DFS subtree cannot climb back through. Letting its discovery index lower `low[v]` can suppress a valid root and merge separate SCCs.

Tarjan's canonical definition uses `disc[w]` for an edge to an active, already-visited vertex. A guarded `low[w]` variant still identifies the same SCC roots, but its stored values no longer have Tarjan's formal low-link meaning. Dropping the `onStack` guard is the corrupting change.

This is related to the discovery/low-value pattern in [[Computer Science/Algorithms/Graph Algorithms/Articulation Points and Bridges|articulation points and bridges]], but the directed edge classification, active stack, and update rules are different.

# Questions

> [!QUESTION]- What does `low[v] == disc[v]` prove?
> No vertex in `v`'s DFS subtree can reach an earlier active vertex. `v` is therefore the entry point of one SCC, and popping down to `v` emits exactly that component.

> [!QUESTION]- Why may only active vertices lower a low link?
> An active vertex still belongs to the component under construction. An already-popped vertex belongs to a finished component that cannot provide a return path, so using it would cross a component boundary.

# References

- [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010) — Tarjan's 1972 primary paper introducing the one-pass SCC procedure.
- [Finding strongly connected components](https://cp-algorithms.com/graph/strongly-connected-components.html) — implementation-oriented treatment of SCC decomposition and the condensation DAG.
- [Tarjan's strongly connected components algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm) — low-link and active-stack invariants with pseudocode.
