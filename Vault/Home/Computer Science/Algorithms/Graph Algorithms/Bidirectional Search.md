---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Runs forward and backward searches that meet in the middle, cutting O(b^d) to two O(b^(d/2)) halves."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

Finding the shortest path between two specific vertices `s` and `t` in a large graph with a single BFS from `s` expands every vertex within distance `d` of the source. That frontier grows as `b^d`, where `b` is the branching factor and `d` is the shortest-path length — for `b = 10, d = 6` that is on the order of a million vertices, almost all of them nowhere near `t`.

Bidirectional search launches a second BFS backward from `t` over reversed edges and runs both at once. Each side only has to reach depth `d/2` before the two frontiers collide somewhere in the middle, so together they expand about `2·b^(d/2)` vertices — roughly two thousand for the same `b = 10, d = 6`. Two small frontiers growing toward each other sweep far less of the graph than one frontier covering the whole distance.

The saving is conditional. The target has to be a concrete vertex the backward search can start from, and the graph has to expose predecessors — a reverse adjacency list, or an invertible move operator for an implicit state space. Without both, the second frontier has nothing to grow from.

**Core condition:** one known target + enumerable predecessors → forward and backward BFS meet near depth `d/2` → `O(b^(d/2))` time and space instead of `O(b^d)`.

> [!NOTE] Visualization pending
> Planned StepTrace: a two-frontier graph card showing forward and backward BFS expanding outward from source and target until they first intersect at a meeting vertex, then the path spliced through it. No matching renderer exists in `engine.js` yet.

# Meeting in the middle

Two frontiers advance in parallel. `F` holds the vertices reached from `s` along forward edges; `B` holds the vertices reached from `t` along reversed edges. Each side records the distance at which it first reached every vertex.

Take an unweighted graph where `s` and `t` are six edges apart. The forward BFS reaches depths 0, 1, 2, 3 from `s`; the backward BFS reaches depths 0, 1, 2, 3 from `t`. The two sides collide at a vertex three edges from each end, and neither BFS ever expands a fourth level. With branching factor `b`, the forward side holds about `b^3` vertices and the backward side about `b^3`, against the `b^6` a single BFS would expand to reach depth six. Splitting one path of length `d` into two halves is what caps each search at depth `d/2`.

For an unweighted graph the stopping rule is exact. Expansion proceeds one full BFS level at a time, alternating sides, and the search halts the first time a level completes with a vertex present in both visited sets. Because each side labels every vertex with its true BFS distance, a shared vertex `x` lies on a path of length `distF[x] + distB[x]`; scanning that first overlapping level for the smallest such sum yields a shortest path. The path is rebuilt by following forward parents from `x` back to `s`, reversing, then appending the backward parents from `x` to `t`.

Expanding whichever frontier currently holds fewer vertices keeps the two searches near the same depth. A lopsided pair — one side pushed far past the other — loses the halving, because the deeper frontier is already climbing back toward `b^d`.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(b)` | `O(b)` | `s` and `t` sit a few edges apart; the frontiers intersect after a handful of expansions. |
| Average | `O(b^(d/2))` | `O(b^(d/2))` | The frontiers meet near depth `d/2`; each side expands and stores about `b^(d/2)` vertices. |
| Worst | `O(b^(d/2))` † | `O(b^(d/2))` | The meeting sits at full depth or the shortest path just reaches length `d`; both frontiers grow to maximum size before touching. |

† A connected worst case stays at `O(b^(d/2))`, but disconnected endpoints are worse: both searches exhaust their entire reachable sets, `O(V + E)`, before reporting that no path exists.

Here `b` is the branching factor and `d` the shortest-path length. The bounds assume a roughly uniform graph where every vertex has about `b` successors and `b` predecessors and both sides advance in balance. Space matches time because both frontiers plus their distance maps must be held in memory to test for intersection — there is no `O(1)`-space variant, unlike unidirectional search. The unidirectional BFS baseline on the same input is `O(b^d)` time and space; bidirectional search halves the exponent, not the constant.

# Where the clean case ends

Weighted edges break first-touch. Once the frontiers advance by cumulative cost rather than by level, the first vertex to appear in both visited sets is no longer guaranteed shortest — a cheaper meeting can still be one relaxation away at a different vertex whose two halves are not both settled. A correct termination tracks the best summed cost `μ = min(gF[u] + gB[u])` over all met vertices and keeps expanding until the sum of the two frontiers' smallest keys — their current search radii — reaches `μ`. Only then can no unexpanded path undercut the best meeting. Returning on first contact is the classic bidirectional-search correctness bug; unweighted BFS avoids it because level-order expansion settles distances in nondecreasing order, so the first overlap is already optimal.

The target must be a concrete vertex. The backward search needs somewhere to start, so a goal defined only by a predicate — "any solved state", "any node with property `P`" — leaves nothing to grow a backward frontier from, and the meet-in-the-middle mechanism does not apply. A unidirectional search that expands forward until the predicate holds is the only option there.

Predecessors must be enumerable. The backward BFS walks edges in reverse, so a directed graph needs a reverse adjacency list and an implicit state space needs an invertible move operator. Without incoming edges the backward frontier cannot advance past depth zero, and the `b^(d/2)` bound depends on that frontier reaching depth `d/2`. Undirected graphs supply this for free.

# Reference drawer

> [!ABSTRACT]- Control flow (unweighted case)
> ```mermaid
> flowchart TD
>   A[Forward frontier at source, backward frontier at target] --> B{Either frontier empty}
>   B -->|Yes| Z[No path exists]
>   B -->|No| C[Expand the smaller frontier by one level]
>   C --> D{A vertex now in both visited sets}
>   D -->|No| B
>   D -->|Yes| Y[Splice forward half with reversed backward half]
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> // Unweighted bidirectional BFS. forward[v] lists successors of v,
> // backward[v] lists its predecessors. Returns a shortest path s..t, or null.
> public static IReadOnlyList<int>? ShortestPath(
>     IReadOnlyList<IReadOnlyList<int>> forward,
>     IReadOnlyList<IReadOnlyList<int>> backward,
>     int source,
>     int target)
> {
>     if (source == target)
>     {
>         return new[] { source };
>     }
>
>     var parentF = new Dictionary<int, int> { [source] = source };
>     var parentB = new Dictionary<int, int> { [target] = target };
>     var distF = new Dictionary<int, int> { [source] = 0 };
>     var distB = new Dictionary<int, int> { [target] = 0 };
>     var frontierF = new Queue<int>(new[] { source });
>     var frontierB = new Queue<int>(new[] { target });
>
>     while (frontierF.Count > 0 && frontierB.Count > 0)
>     {
>         // Advance whichever side has fewer nodes so the frontiers stay balanced.
>         var meet = frontierF.Count <= frontierB.Count
>             ? ExpandLevel(frontierF, forward, parentF, distF, distB)
>             : ExpandLevel(frontierB, backward, parentB, distB, distF);
>
>         if (meet is int x)
>         {
>             return Splice(x, parentF, parentB, source, target);
>         }
>     }
>
>     return null; // s and t are in different components
> }
>
> // Expands one BFS level. Returns the minimum-sum meeting vertex found in that
> // level, or null if the two sides did not overlap yet. Scanning the whole level
> // for the smallest distOwn + distOther sum is what keeps the answer shortest.
> private static int? ExpandLevel(
>     Queue<int> frontier,
>     IReadOnlyList<IReadOnlyList<int>> edges,
>     Dictionary<int, int> parent,
>     Dictionary<int, int> distOwn,
>     Dictionary<int, int> distOther)
> {
>     int? best = null;
>     var bestCost = int.MaxValue;
>
>     for (var count = frontier.Count; count > 0; count--)
>     {
>         var node = frontier.Dequeue();
>         foreach (var next in edges[node])
>         {
>             if (distOwn.ContainsKey(next))
>             {
>                 continue;
>             }
>
>             parent[next] = node;
>             distOwn[next] = distOwn[node] + 1;
>
>             if (distOther.TryGetValue(next, out var otherDist))
>             {
>                 var cost = distOwn[next] + otherDist;
>                 if (cost < bestCost)
>                 {
>                     bestCost = cost;
>                     best = next;
>                 }
>             }
>             else
>             {
>                 frontier.Enqueue(next);
>             }
>         }
>     }
>
>     return best;
> }
>
> private static List<int> Splice(
>     int meet,
>     Dictionary<int, int> parentF,
>     Dictionary<int, int> parentB,
>     int source,
>     int target)
> {
>     var path = new List<int>();
>     for (var node = meet; node != source; node = parentF[node])
>     {
>         path.Add(node);
>     }
>     path.Add(source);
>     path.Reverse();
>
>     // meet already holds the target when s->t is a single edge; the forward
>     // walk above emitted it, so only append the backward half when it differs.
>     if (meet != target)
>     {
>         for (var node = parentB[meet]; node != target; node = parentB[node])
>         {
>             path.Add(node);
>         }
>         path.Add(target);
>     }
>
>     return path;
> }
> ```
> The level scan, not the first cross-edge, is load-bearing: two meetings can appear in the same expanded level with different back-halves, so the minimum sum over the level is what stays optimal. On a weighted graph this level rule is replaced by the `gF + gB` termination test from the section above. The `meet != target` guard covers the single-edge `s → t` query, where the forward side discovers the target directly and the backward half is empty.

# Questions

> [!QUESTION]- Why does bidirectional search cut `O(b^d)` to `O(b^(d/2))`?
> A single BFS reaching depth `d` expands a frontier that grows as `b^d`. Splitting the path into two halves lets a forward search and a backward search each stop at depth `d/2`, so each explores about `b^(d/2)` vertices and the total is `2·b^(d/2)`. The reduction lands on the exponent, which is why it compounds with depth: every extra level of separation that would multiply a one-sided search by another factor of `b` only adds half a level to each frontier. The same halving applies to space, since both sides must be held in memory to detect the meeting.

> [!QUESTION]- Why is stopping at the first frontier collision correct on an unweighted graph but wrong on a weighted one?
> Unweighted BFS expands level by level, settling distances in nondecreasing order, so the first vertex shared by both visited sets already lies on a shortest path. With weights the frontiers advance by cumulative cost, and the first shared vertex can sit on an expensive path while a cheaper meeting is one relaxation away elsewhere. The weighted version must track the best `gF[u] + gB[u]` and keep expanding until the two frontiers' combined radius reaches that best, proving no unexpanded path can beat it.

> [!QUESTION]- What must the graph and the goal provide before bidirectional search applies?
> The target must be a concrete vertex, because the backward search needs a starting point — a goal given only as a predicate has nothing to expand backward from. The graph must expose predecessors, either as a reverse adjacency list or as an invertible move operator, since the backward frontier walks edges in reverse. Without both, the second frontier cannot reach depth `d/2` and the halving disappears.

# References

- [Bidirectional search (Wikipedia)](https://en.wikipedia.org/wiki/Bidirectional_search) — the `b^(d/2)` argument, the balanced-frontier heuristic, and front-to-front versus front-to-back heuristic variants.
- [Bidirectional Search That Is Guaranteed to Meet in the Middle (Holte et al., AAAI 2016)](https://ojs.aaai.org/index.php/AAAI/article/view/10346) — the MM algorithm and a rigorous treatment of the meeting condition that makes the answer optimal.
- [Contraction hierarchies (Wikipedia)](https://en.wikipedia.org/wiki/Contraction_hierarchies) — how production road routers pair bidirectional Dijkstra with preprocessing for millisecond continental queries.
