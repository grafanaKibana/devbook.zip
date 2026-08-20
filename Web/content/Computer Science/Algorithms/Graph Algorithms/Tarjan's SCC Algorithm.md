---
publish: true
created: 2026-08-20T20:41:15.519Z
modified: 2026-08-20T20:41:15.519Z
published: 2026-08-20T20:41:15.519Z
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

[[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly connected components]] partition a digraph into maximal mutually reachable regions. Tarjan's algorithm finds that partition in one DFS by recording each vertex's discovery time, the earliest reachable vertex still on the active stack, and whether it still belongs to a component under construction.

The component boundary appears when a vertex cannot reach any earlier active vertex. That vertex is an SCC root, and popping the stack down to it emits the complete component. [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly Connected Components]] compares Tarjan with the two-pass and path-based alternatives. This note follows Tarjan's active-stack invariant and implementation.

# Low-Link State

- `disc[v]` is the discovery index assigned when DFS first enters `v`.
- `low[v]` is the smallest discovery index reachable from `v` through DFS-tree edges plus at most one edge to a vertex still on the stack.
- `onStack[v]` distinguishes an active vertex from one already assigned to a completed component.

On entry, set `disc[v] = low[v] = time++`, then push `v`. For an edge `v → w`, recurse if `w` is unvisited and fold `low[w]` into `low[v]` on return. If `w` is already visited and still active, fold `disc[w]` into `low[v]`. Once every outgoing edge has been processed, `low[v] == disc[v]` identifies an SCC root.

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

# C# Implementation

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

The non-tree update must ignore vertices already removed from the stack. An edge to one of them enters a finished component. It cannot provide a return path for the active DFS subtree. Letting that vertex lower `low[v]` can hide a valid root and merge separate SCCs.

For an edge to an active, already-visited vertex, Tarjan's definition uses `disc[w]`. A guarded `low[w]` variant still finds the same SCC roots, but the stored values no longer match Tarjan's formal low-link definition. Removing the `onStack` guard breaks the component boundary.

This is related to the discovery/low-value pattern in [[Computer Science/Algorithms/Graph Algorithms/Articulation Points and Bridges|articulation points and bridges]], but the directed edge classification, active stack, and update rules are different.

# References

- [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010)
