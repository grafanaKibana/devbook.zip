---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A union-find structure that partitions elements into disjoint sets and answers whether two share a set."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

A network receives connections over time and repeatedly asks whether two nodes share a connected component. Running a graph traversal for every query keeps rediscovering old connectivity. A disjoint set stores that partition directly, so later merges and membership checks work on a parent forest instead of revisiting graph edges.

This is deliberately less information than a graph. The structure remembers which elements belong together and forgets the edges and paths that produced each component. Sets merge cheaply. Splitting them afterward does not.

**Core shape:** elements → parent-index forest → one root per set → shared root means shared membership

~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"union-find","n":7}
```


The view starts with seven singleton sets. Choose two elements and run `Union` to merge their roots, `Find A` to resolve and compress one parent path, or `Connected?` to resolve both roots and compare representatives. Because that check performs two finds, it may flatten both parent paths. The forest and its parent array update together: an arrow points from a child to its parent, and a root stores its own index.

Only roots are linked during a union. Linking an arbitrary interior node would detach or misclassify part of its existing set. A find follows parent indices until `parent[root] == root`; path compression can then shorten the route without changing the representative.

The interactive structure uses union by rank, so a lower-rank root attaches beneath a higher-rank root. On equal rank, this view keeps element A's root as parent and increments that root's rank.

#### Representation and Invariants

Each element is mapped to an integer index. Two parallel arrays hold the state:

- `_parent[i]` stores the next index on the path to the representative. A root points to itself.
- `_rank[i]` approximates tree height and is meaningful only for roots. `_size[i]` is a common alternative when component counts are needed.

Four invariants define a valid state:

1. Every parent index is inside the array.
2. Following parent indices always reaches a self-parented root; cycles other than that self-reference are invalid.
3. Two elements are in the same set exactly when their root is the same.
4. The merge link changes the parent of one root. Any interior-parent rewrites come only from the path-compressing finds that locate both roots.

Path compression rewrites parent indices but preserves set membership. Union by rank changes which root represents the merged set but preserves every previous connectivity result. The representative is therefore an internal identity, not a stable domain value.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Disjoint Set complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements partitioned into disjoint sets"
    },
    "inverseAckermann": {
      "symbol": "α(·)",
      "description": "inverse Ackermann factor applied to its displayed argument"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Construct n singleton sets",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best/Amortized",
              "formula": "Θ(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "Θ(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Find(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized",
              "formula": "O(α(n))"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Union(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized",
              "formula": "O(α(n))"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Connected(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized",
              "formula": "O(α(n))"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Construct n singleton sets",
          "bounds": [
            {
              "kind": "curve",
              "role": "Peak space",
              "formula": "Θ(n) structure",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Find(x)",
          "bounds": [
            {
              "kind": "text",
              "role": "Peak space",
              "formula": "O(1) best, O(log n) worst stack"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Union(a, b)",
          "bounds": [
            {
              "kind": "text",
              "role": "Peak space",
              "formula": "O(1) best, O(log n) worst stack"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Connected(a, b)",
          "bounds": [
            {
              "kind": "text",
              "role": "Peak space",
              "formula": "O(1) best, O(log n) worst stack"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Structure Stops Fitting

Deletion exposes the missing information. After unions and path-compressing finds, nothing records which original edge caused a component to form. Removing an edge cannot reveal whether the component should remain whole or split. Fully dynamic connectivity needs the graph plus a stronger dynamic structure. A known offline sequence can instead use rollback DSU without path compression.

Connectivity carries no route information either. `Connected(a, b)` may return `true`, but the parent chain is an implementation artifact rather than a path in the original graph. Shortest paths, neighborhoods, degrees, and edge metadata still require an adjacency representation.

The array form also assumes dense integer IDs from `0` through `n - 1`. Strings, GUIDs, and sparse numbers need a `Dictionary<T, int>` mapping first. That mapping costs memory and makes identity management part of the API boundary.

# Diagram and C# Implementation

> [!ABSTRACT]- Parent forest
>
> ```mermaid
> graph TD
>   R3((3))
>   N0((0)) --> R3
>   N1((1)) --> R3
>   N2((2)) --> R3
>   R3 --> R3
>   R5((5))
>   N4((4)) --> R5
>   R5 --> R5
>   R6((6)) --> R6
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class DisjointSet
> {
>     private readonly int[] _parent;
>     private readonly int[] _rank;
>
>     public DisjointSet(int count)
>     {
>         _parent = Enumerable.Range(0, count).ToArray();
>         _rank = new int[count];
>     }
>
>     public int Find(int value)
>     {
>         if (_parent[value] != value)
>         {
>             _parent[value] = Find(_parent[value]);
>         }
>
>         return _parent[value];
>     }
>
>     public bool Union(int left, int right)
>     {
>         var leftRoot = Find(left);
>         var rightRoot = Find(right);
>         if (leftRoot == rightRoot)
>         {
>             return false;
>         }
>
>         if (_rank[leftRoot] < _rank[rightRoot])
>         {
>             (leftRoot, rightRoot) = (rightRoot, leftRoot);
>         }
>
>         _parent[rightRoot] = leftRoot;
>         if (_rank[leftRoot] == _rank[rightRoot])
>         {
>             _rank[leftRoot]++;
>         }
>
>         return true;
>     }
>
>     public bool Connected(int left, int right) =>
>         Find(left) == Find(right);
> }
> ```
>
> `Union` returns `false` when both values already have the same representative. That result is enough for cycle detection while processing graph edges.

# Comparison

| Representation | Information retained | Stronger case |
| ----------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Disjoint set | Component membership | Connections only accumulate and connectivity is queried repeatedly |
| Static component labels | Component ID snapshot | The graph is immutable and receives many connectivity queries |
| Rollback disjoint set | Component membership plus change history | Offline connectivity where additions must be undone in reverse order |

A disjoint set gives up graph topology and deletion for cheap incremental merges and membership checks. Static labels make queries simpler when the graph never changes. Rollback retains enough history to undo merges, with a higher operation cost and normally without path compression.

[[Home/Computer Science/Data Structures/Graph Structures/Union-Find|Union-Find]] isolates union by rank, path compression, and their analysis in more depth. This note keeps the stored-state invariants and the information the structure discards visible.

# References

- [Efficiency of a Good But Not Linear Set Union Algorithm](https://dl.acm.org/doi/10.1145/321879.321884)
