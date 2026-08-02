---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A self-adjusting mergeable heap that swaps children after every recursive merge without storing rank metadata."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

When two priority queues must combine repeatedly — merging event streams, uniting sub-schedules — the melding cost dominates. A skew heap keeps only a heap-ordered binary tree and makes merge the primitive: two heaps combine by walking down their right spines, and insert and extract-min are defined in terms of that merge.

The structure is the self-adjusting cousin of a [[Home/Computer Science/Data Structures/Trees/Heap-like/Leftist Heaps|leftist heap]]. A leftist heap stores a null-path-length field per node and swaps children only when that field would be violated, buying a per-operation worst-case bound. A skew heap deletes the field entirely: after merging down a right spine it **swaps the two children at every touched node unconditionally** — no test, no bookkeeping. The blind swap moves a right path that just grew back to the left, where the next merge never looks.

**Core shape:** heap-ordered binary tree, no rank field → merge recurses down right spines → swap children at every merged node

Use **Merge** on the same canonical heaps `[2, 7, 10]` and `[3, 5, 8]`. Unlike the leftist version, every touched node swaps its children unconditionally; **Reset** restores both source heaps.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"skew-heap"}
```

#### Why the Blind Swap Balances

Merge takes two heap roots and compares them. The smaller root becomes the result's root; its right subtree is merged recursively with the other whole heap; then the root's two children are swapped. Only the right spine is ever descended, so the recursion depth is the combined right-spine length of the two inputs.

The unconditional swap breaks that: every node on the traversed spine has its freshly extended right child rotated to the left, out of the path future merges follow. A leftist heap achieves the same shortening deliberately, keeping the shorter subtree on the right by consulting the stored null-path length; the skew heap achieves it blindly, and pays for the difference in the analysis rather than in per-node memory.

The invariant that survives every operation is heap order alone: a parent key never exceeds a child key. There is no structural invariant on shape — a skew heap can momentarily be a long right chain. Insert merges a singleton node into the heap. Extract-min removes the root and merges its two children. Both inherit merge's cost profile exactly.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Skew Heaps complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Merge(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "ExtractMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "FindMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(1)",
              "curveId": "constant"
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
          "operation": "Merge(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n) structure, no per-node field",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n) worst-case recursion stack",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "ExtractMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n) worst-case recursion stack",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "FindMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

Persistence exposes the same gap. Leftist worst-case bounds are per operation and survive shared subtrees.

The unconditional swap is the whole mechanism, not a tunable detail. There is no rank field to inspect, so the swap has to be blind and total for the potential argument to close.

# Reference Drawer

> [!ABSTRACT]- Merge folding the right spine
>
> ```mermaid
> flowchart LR
>   subgraph before [Two heaps]
>     A2((2)) --> A5((5))
>     A2 --> A9((9))
>     B3((3)) --> B4((4))
>     B3 --> B8((8))
>   end
>   subgraph after [Merged, children swapped at each touched node]
>     M2((2)) --> M3((3))
>     M2 --> M5((5))
>     M3 --> M4((4))
>     M3 --> M8((8))
>     M8 --> M9((9))
>   end
>   before --> after
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class SkewHeap<T> where T : IComparable<T>
> {
>     private sealed class Node
>     {
>         public T Key = default!;
>         public Node? Left;
>         public Node? Right;
>     }
>
>     private Node? _root;
>
>     public T FindMin() =>
>         _root is null ? throw new InvalidOperationException("empty") : _root.Key;
>
>     public void Insert(T key) =>
>         _root = Merge(_root, new Node { Key = key });
>
>     public T ExtractMin()
>     {
>         if (_root is null) throw new InvalidOperationException("empty");
>         var min = _root.Key;
>         _root = Merge(_root.Left, _root.Right);
>         return min;
>     }
>
>     private static Node? Merge(Node? a, Node? b)
>     {
>         if (a is null) return b;
>         if (b is null) return a;
>
>         if (a.Key.CompareTo(b.Key) > 0)
>         {
>             (a, b) = (b, a);
>         }
>
>         // Descend the right spine, then swap children unconditionally.
>         a.Right = Merge(a.Right, b);
>         (a.Left, a.Right) = (a.Right, a.Left);
>         return a;
>     }
> }
> ```
> The two swap-carrying lines are the entire self-adjustment: there is no rank field to update and no condition guarding the swap. Removing the swap, or making it conditional on stored metadata, produces a different data structure.

# References

- [Sleator & Tarjan, "Self-Adjusting Heaps" (SIAM J. Comput. 1986)](https://www.cs.cmu.edu/~sleator/papers/adjusting-heaps.pdf) — the original skew-heap paper and sequence analysis.
- [Skew heap (Wikipedia)](https://en.wikipedia.org/wiki/Skew_heap) — recursive merge, unconditional child swap, and comparison with leftist heaps.
