---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A heap-ordered binary tree whose null-path-length invariant keeps merge on the short right spine."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Two priority queues need to become one. A leftist heap stores the same heap-ordered keys as an explicit binary tree and adds one field per node so melding follows only the short right spines.

That field is the **null-path length** (npl, also called rank or s-value): the distance from a node to the nearest missing child, with `npl(null) = 0` and a leaf at `1`. The **leftist property** holds `npl(left) ≥ npl(right)` at every node, forcing the shorter route toward a missing child onto the right. Merge therefore recurses only down the right spines and restores the property while unwinding.

The tradeoff is shape. The tree is heap-ordered but deliberately left-heavy and can be arbitrarily deep; there is no balance guarantee on height, no index arithmetic, and no cache-friendly contiguous layout. What is bounded is exactly the one path merge uses.

**Core shape:** heap-ordered binary tree + npl per node → merge two heaps by recursing down their right spines → insert and extract-min are both merges.

Use **Merge** on the same canonical heaps `[2, 7, 10]` and `[3, 5, 8]`. The active path follows the right spines; amber nodes are exactly those where the null-path-length comparison requires a child swap.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"leftist-heap"}
```

#### Merge, and why the Right Spine Stays short

Every mutation is a merge of two heaps `a` and `b`:

1. If either is empty, the other is the result.
2. Otherwise the root with the smaller key becomes the merged root (heap order). Say that is `a`.
3. Recursively merge `a.Right` with the whole of `b`. The recursion therefore descends the right spine of one heap at a time — never the left subtrees.
4. On the way back up, if the returned right child now has a larger npl than the left child, **swap the two children**. Then set `npl(a) = npl(a.Right) + 1`.

Step 4 is the load-bearing move. After the recursive merge, the right child may have a greater npl than the left, which violates `npl(left) ≥ npl(right)` and lets the right spine lengthen. The swap restores the invariant by moving the higher-ranked subtree to the left, where no operation walks it. The npl recomputation propagates the new rank up so every ancestor's invariant is re-established as the recursion unwinds.

**insert** merges the heap with a one-node heap. **extract-min** returns the root and merges the root's left and right subtrees back together. **find-min** just reads the root.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Leftist Heaps complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "total stored nodes, combining both input heaps for merge"
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
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "ExtractMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "FindMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst",
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
              "role": "Persistent structure space",
              "formula": "Θ(n) nodes plus one npl field each",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(log n) recursion stack",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure space",
              "formula": "Θ(n) nodes plus one npl field each",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "ExtractMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure space",
              "formula": "Θ(n) nodes plus one npl field each",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "FindMin()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure space",
              "formula": "Θ(n) nodes plus one npl field each",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
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

# Where the Invariant is Load-bearing

The child swap in step 4 is not cosmetic.

The npl bookkeeping must be updated on every merge, not lazily. The swap decision at each level reads the children's current npl values, so a stale rank on a subtree can cause a wrong swap — or a skipped one — and silently corrupt the bound for all ancestors. The field is part of the invariant, not a cached hint.

These are worst-case bounds. A leftist heap trades that field for a per-operation guarantee.

# Reference Drawer

> [!ABSTRACT]- Leftist structure and the right spine
>
> ```mermaid
> flowchart TD
>   R((2 · npl 2))
>   R --> L((5 · npl 2))
>   R --> RS((4 · npl 1))
>   L --> LL((9 · npl 1))
>   L --> LR((6 · npl 1))
>   RS --> RSL((8 · npl 1))
> ```
> Merge descends the right children only (`2 → 4 → …`). Higher-ranked subtrees are pushed left, where `npl(left) ≥ npl(right)` holds at each node.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class LeftistHeap
> {
>     private sealed class Node
>     {
>         public int Key;
>         public int Npl;
>         public Node? Left, Right;
>         public Node(int key) { Key = key; Npl = 1; }
>     }
>
>     private Node? _root;
>
>     private static int Npl(Node? n) => n?.Npl ?? 0;
>
>     private static Node? Merge(Node? a, Node? b)
>     {
>         if (a is null) return b;
>         if (b is null) return a;
>         if (b.Key < a.Key) (a, b) = (b, a);   // smaller key becomes the root
>
>         a.Right = Merge(a.Right, b);          // recurse down the right spine only
>         if (Npl(a.Left) < Npl(a.Right))
>             (a.Left, a.Right) = (a.Right, a.Left); // restore npl(left) >= npl(right)
>         a.Npl = Npl(a.Right) + 1;
>         return a;
>     }
>
>     public void Insert(int key) => _root = Merge(_root, new Node(key));
>     public int FindMin() => _root?.Key
>         ?? throw new InvalidOperationException("Heap is empty.");
>
>     public int ExtractMin()
>     {
>         if (_root is null)
>             throw new InvalidOperationException("Heap is empty.");
>
>         var min = _root.Key;
>         _root = Merge(_root.Left, _root.Right);
>         return min;
>     }
> }
> ```
> The swap and the `a.Npl` update are the two lines that keep the shorter subtree on the right; dropping either breaks the leftist invariant.

# Questions

> [!QUESTION]- Why does the leftist invariant keep merge on a logarithmically short right spine?
> Every step down the right spine reduces null-path length by one, while a node of null-path length `r` contains at least `2ʳ - 1` nodes. The root's right-spine length is therefore at most logarithmic in the heap size, and merge visits only that spine.

# References

- [Leftist tree (Wikipedia)](https://en.wikipedia.org/wiki/Leftist_tree) — s-value (npl) definition, the leftist invariant, and the right-spine length proof.
- [Crane, *Linear Lists and Priority Queues as Balanced Binary Trees* (Stanford dissertation, 1972)](https://rtheunissen.github.io/bst/docs/references/1972_clark_allan_crane.pdf) — the original leftist-tree structure, rank invariant, and merge analysis.
- Mark Allen Weiss, *Data Structures and Algorithm Analysis in C++*, ch. 6 (Priority Queues) — the null-path-length invariant, the worst-case merge along right paths, and the npl-maintaining implementation this note follows.
