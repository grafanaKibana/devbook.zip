---
publish: true
created: 2026-07-29T20:22:59.984Z
modified: 2026-08-01T18:31:33.353Z
published: 2026-08-01T18:31:33.353Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A union-find structure that partitions elements into disjoint sets and answers whether two share a set.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

A network receives connections over time and repeatedly asks whether two nodes belong to the same connected component. Running a graph traversal for every query revisits edges whose connectivity was already established. A disjoint set keeps only the partition of nodes into components, so a merge and a connectivity check become nearly constant-time operations.

The structure is narrower than a graph representation. It remembers which elements belong together, but not the edges, paths, or order that produced each component. Sets can merge; they cannot be split efficiently afterward.

**Core shape:** elements → parent-index forest → one root per set → shared root means shared membership → `O(n)` storage.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"union-find","n":7}
```

## Interactive Forest

The view starts with seven singleton sets. Choose two elements and run `Union` to merge their roots, `Find A` to resolve and compress one parent path, or `Connected?` to resolve both roots and compare representatives. Because that check performs two finds, it may flatten both parent paths. The forest and its parent array update together: an arrow points from a child to its parent, and a root stores its own index.

Only roots are linked during a union. Linking an arbitrary interior node would detach or misclassify part of its existing set. A find follows parent indices until `parent[root] == root`; path compression can then shorten the route without changing the representative.

The interactive structure uses union by rank, so a lower-rank root attaches beneath a higher-rank root. On equal rank, this view keeps element A's root as parent and increments that root's rank.

## Representation and Invariants

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
      "description": "number of input elements or states"
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
              "role": "Best time",
              "formula": "Θ(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
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
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized time",
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
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized time",
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
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized time",
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
````

## Complexity

| Operation                    | Best time | Amortized time | Worst single operation | Peak space                          |
| ---------------------------- | --------- | -------------- | ---------------------- | ----------------------------------- |
| Construct `n` singleton sets | `Θ(n)`    | `Θ(n)`         | `Θ(n)`                 | `Θ(n)` structure                    |
| `Find(x)`                    | `O(1)`    | `O(α(n))`      | `O(log n)`             | `O(1)` best, `O(log n)` worst stack |
| `Union(a, b)`                | `O(1)`    | `O(α(n))`      | `O(log n)`             | `O(1)` best, `O(log n)` worst stack |
| `Connected(a, b)`            | `O(1)`    | `O(α(n))`      | `O(log n)`             | `O(1)` best, `O(log n)` worst stack |

These bounds assume path compression and union by rank. Rank alone keeps tree height at `O(log n)`; path compression makes a sequence of operations cost `O(α(n))` per operation amortized. Without either heuristic, a chain can grow to length `n`, turning `Find`, `Union`, and `Connected` into `O(n)` operations.

`α(n)` is the inverse Ackermann function and stays below 5 for practical input sizes. “Amortized” matters more than an informal average here: an individual operation can traverse several parents, while the rewrites make later operations cheaper.

The recursive implementation uses stack space proportional to the current tree height. An iterative path-halving implementation reduces auxiliary space to `O(1)` while keeping the same amortized time bound.

# When the Structure Stops Fitting

Deletion is the hard boundary. After several unions and path-compressing finds, the structure no longer records which original edge caused a component to form. Removing an edge therefore cannot identify whether the component should stay connected or split. Fully dynamic connectivity needs a graph representation plus a more complex dynamic structure; a known offline sequence can use rollback DSU without path compression.

Connectivity also carries no route information. `Connected(a, b)` can return `true`, but the parent forest is an implementation artifact rather than a path through the original graph. Shortest paths, neighbors, degrees, and edge metadata require an adjacency representation alongside the disjoint set.

The array representation assumes dense integer IDs from `0` through `n - 1`. Strings, GUIDs, and sparse numeric IDs need a `Dictionary<T, int>` mapping before they can enter the structure. That mapping adds memory and makes identity management part of the API boundary.

# Reference Drawer

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

| Representation          | Connectivity query         | Add connection / merge         | Removal                             | Information retained                     | Stronger case                                                        |
| ----------------------- | -------------------------- | ------------------------------ | ----------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Disjoint set            | `O(α(n))` amortized        | `O(α(n))` amortized            | Not supported                       | Component membership                     | Connections only accumulate and connectivity is queried repeatedly   |
| Static component labels | `O(1)` after preprocessing | Recompute labels in `O(V + E)` | Recompute labels                    | Component ID snapshot                    | The graph is immutable and receives many connectivity queries        |
| Rollback disjoint set   | `O(log n)`                 | `O(log n)`                     | `O(1)` rollback of the latest merge | Component membership plus change history | Offline connectivity where additions must be undone in reverse order |

The disjoint set occupies a specific point in this comparison: it gives up graph topology and deletion in exchange for extremely cheap incremental merges and membership checks. Static labels are cheaper to query when the graph never changes. Rollback retains change history at a higher per-operation cost and without path compression.

The related [[Computer Science/Data Structures/Graph Structures/Union-Find|Union-Find]] note covers the operation heuristics and their analysis. This page remains centered on stored state, invariants, and the boundary of the data structure itself.

# Questions

> [!QUESTION]- How is a disjoint set represented in memory?
> A parent array stores a forest: `parent[i]` is the next index toward the representative, and each root points to itself. Rank or size is stored in a parallel array for roots. No linked node objects are required.

> [!QUESTION]- Why does `Union` link roots rather than the original elements?
> A root represents an entire existing set. Linking one root under another merges both complete sets. Re-parenting an interior node can move only its subtree and leave other members behind, breaking the partition semantics.

> [!QUESTION]- Why is the useful bound amortized rather than worst-case constant time?
> One `Find` can still traverse several parent indices. Path compression pays extra writes during that operation so later finds become shorter. Across a sequence, the total work is `O(m α(n))` for `m` operations, even though a particular operation is not guaranteed to be constant time.

# References

- [Efficiency of a Good But Not Linear Set Union Algorithm](https://dl.acm.org/doi/10.1145/321879.321884) — Robert Tarjan's original amortized analysis of path compression with weighted union.
- [Union-Find](https://algs4.cs.princeton.edu/15uf/) — Princeton Algorithms implementations showing the progression from quick-find and quick-union to weighted, compressed forests.
- [Disjoint Set Union](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — implementation variants, complexity discussion, and graph applications.
- [Deleting from a data structure in `O(T(n) log n)`](https://cp-algorithms.com/data_structures/deleting_in_log_n.html) — rollback DSU implementation and the offline segment-tree technique for undoing merges.
