---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A self-balancing BST using node colors for good-enough balance with cheap repairs, the default ordered map."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

An order book holds 100K price levels and an exchange feed inserts and removes thousands of entries per second, all while ordered iteration and min/max must stay fast. An [[Home/Computer Science/Data Structures/Trees/AVL Tree|AVL tree]] uses stricter ±1 height balance and often produces shorter search paths, but may require more rebalancing, especially during deletion. A red-black tree accepts looser balance so color changes and a few local rotations keep the height bounded after updates.

The state it persists is a [[Home/Computer Science/Data Structures/Trees/Binary Search Tree|binary search tree]] plus one logical color bit per node — red or black — governed by color rules rather than measured heights. The rules are looser than AVL's, so the tree can grow to twice its minimum height, but that slack lets an insert repair a violation with at most two rotations. The order and the key set are retained; the coloring itself is an internal artifact with no domain meaning, and it cannot be reconstructed from the keys alone once the mutation history is gone.

Press **Insert** with the prefilled `0`: the new red leaf creates a red-red violation, and the highlighted recolor/rotation participants restore equal black-height.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"red-black-tree","values":[10,5,15,1],"value":0}
```

#### Representation and Invariants

Each node stores its key, left/right/parent pointers, and a single color bit. `nil` leaves are treated as black sentinels, which lets every real node have two children and removes the null-check special cases from the fixup logic — this also folds in the classic fifth property (every `nil` leaf is black) as a property of the sentinel rather than a separate rule. Four invariants then define a valid state:

1. Every node is red or black.
2. The root is black.
3. A red node has two black children — no two reds appear consecutively on any path.
4. Every root-to-`nil` path crosses the same number of black nodes — the tree's *black-height*.

Define `bh(x)` as the number of black nodes on any path from, but excluding, `x` down to and including a descendant `nil` sentinel. Let `size(x)` count internal nodes in the subtree rooted at `x`. For `x = nil`, `bh(x) = 0` and `size(x) = 0 = 2^0 - 1`. For an internal node, each child has black-height at least `bh(x) - 1`, so induction gives `size(x) ≥ 1 + 2(2^(bh(x)-1) - 1) = 2^bh(x) - 1`. A root-to-`nil` path of height `h` contains `bh(root)` black nodes below the black root and, because invariant 3 forbids consecutive reds, at most `bh(root)` red nodes.

An insert colors the new node red and attaches it as a normal BST leaf. Red can only break invariant 3 — a red child under a red parent — never invariant 4, because a red node adds no blacks to any path. The repair depends on the **uncle** (the parent's sibling):

- **Uncle red** — recolor parent and uncle black and the grandparent red, then re-examine the grandparent. Each step is three field writes and no pointer surgery; the violation moves up two levels and may bubble to the root, where a final recolor of the root to black ends it.
- **Uncle black** — one or two rotations around the grandparent (the zig-zig and zig-zag shapes that also drive AVL rebalancing) plus a recolor, after which the fixup **terminates**.

The unbounded part of insert repair — recoloring up the tree — touches only color fields. Rotation, the pointer surgery that actually reshapes the tree, is capped at two for insertion. Delete is harder: removing a black node drops one black from a path and may propagate a "double-black" state toward the root. A red sibling triggers a preparatory rotation that converts the configuration into a black-sibling case. With a black sibling and two black children, recolor the sibling red: a black parent inherits the deficit, while a red parent becomes black and terminates the fixup; reaching the root also absorbs the deficit. A black sibling with a red child uses one or two terminal rotations plus recoloring and ends the fixup. Exact case layout and rotation counts depend on whether the implementation repairs bottom-up or transforms 2-3-4 nodes while descending.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Red-Black Tree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of keys currently stored in the tree"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Worst-case",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Worst-case",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Worst-case",
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
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "text",
              "role": "Aux space",
              "formula": "O(1) iter / O(log n) rec"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "text",
              "role": "Aux space",
              "formula": "O(1) iter / O(log n) rec"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Where the Looser Balance Shows

The slack that makes repairs cheap has a cost on reads. On a read-dominated, mutation-rare workload that difference is the whole trade — the color invariants deliberately allow a taller tree in exchange for fewer rotations that will never happen.

Delete is where the invariants turn hostile to the implementer. An insert only ever faces a red-red violation, which is local; a delete that removes a black node breaks the black-height invariant globally along one path, and restoring it requires reasoning about the sibling's color and the colors of the sibling's children across several mirrored cases. This double-black fixup is a well-known source of bugs, and getting it subtly wrong leaves a tree that still satisfies BST order — so lookups return correct answers — while silently violating invariant 4 and losing the height guarantee.

Every mutation must re-establish all four invariants before it returns. A partial fixup that repairs invariant 3 but leaves two paths with different black counts produces a structurally valid BST whose balance guarantee no longer holds, and the defect surfaces only later as an unexpectedly deep path.

# Reference Drawer

> [!ABSTRACT]- A valid coloring and its paths
>
> ```mermaid
> graph TD
>   A(("13 B")) --> B(("8 R"))
>   A --> C(("17 R"))
>   B --> D(("1 B"))
>   B --> E(("11 B"))
>   C --> F(("15 B"))
>   C --> G(("25 B"))
> ```
> Every root-to-leaf path crosses exactly two black nodes (black-height 2), the root is black, and no red node has a red child.

> [!EXAMPLE]- Insert fixup (C# sketch)
>
> ```csharp
> // After a normal BST insert of `node` colored Red, restore the invariants.
> private void FixInsert(Node node)
> {
>     while (node.Parent is { Color: Red })
>     {
>         var grandparent = node.Parent.Parent;
>         var uncle = node.Parent == grandparent.Left ? grandparent.Right : grandparent.Left;
>
>         if (uncle is { Color: Red })
>         {
>             // Case 1: recolor only, then re-examine the grandparent.
>             node.Parent.Color = Black;
>             uncle.Color = Black;
>             grandparent.Color = Red;
>             node = grandparent;
>         }
>         else
>         {
>             // Cases 2/3: rotate into a line, then rotate the grandparent and recolor. Terminates.
>             if (node == node.Parent.Right && node.Parent == grandparent.Left)
>             {
>                 node = node.Parent;
>                 RotateLeft(node);
>             }
>             else if (node == node.Parent.Left && node.Parent == grandparent.Right)
>             {
>                 node = node.Parent;
>                 RotateRight(node);
>             }
>
>             node.Parent.Color = Black;
>             grandparent.Color = Red;
>             if (node == node.Parent.Left) RotateRight(grandparent);
>             else RotateLeft(grandparent);
>         }
>     }
>
>     _root.Color = Black; // Invariant 2, and the exit for the recolor-to-root case.
> }
> ```
> Delete follows the mirror shape but branches on a `nil`-or-black "double-black" node and its sibling's colors across four cases; production code (`std::map`, `TreeMap`, `SortedSet<T>`) implements it in full rather than the sketch above.

# Questions

> [!QUESTION]- Why are new nodes inserted red rather than black?
> A red node adds no black to any path, so it can only break the "no two reds" invariant, which is a local violation fixable near the insertion point. A black insert would add a black to one path only, breaking the equal-black-height invariant along an entire root-to-leaf path — a global violation that is far more expensive to repair.

> [!QUESTION]- How can the rotation count per insert be bounded when the recoloring is not?
> Recoloring only rewrites color bits and can propagate up to the root, but it never reshapes the tree. Once the fixup reaches a black uncle, one or two rotations resolve the violation and the loop terminates. So the structural work (rotations) is capped at two per insert while the unbounded work (recoloring) stays cheap.

> [!QUESTION]- What makes red-black delete more error-prone than insert?
> Insert only ever repairs a local red-red violation. Delete can remove a black node and break the black-height invariant along a whole path, producing "double-black" cases that branch on the sibling's color and its children's colors. A subtle mistake leaves BST order intact — so lookups still return correct results — while silently losing the height guarantee.

# References

- [Guibas & Sedgewick, "A dichromatic framework for balanced trees" (1978)](https://sedgewick.io/wp-content/themes/sedgewick/papers/1978Dichromatic.pdf) — the paper introducing the red-black formulation and its invariants; primary source.
- [Red-Black BSTs (Princeton Algorithms)](https://algs4.cs.princeton.edu/33balanced/) — Sedgewick's left-leaning variant with a clear walkthrough of insert fixup and the 2-3 tree correspondence.
- [`SortedSet<T>` source (dotnet/runtime)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/src/System/Collections/Generic/SortedSet.cs) — the red-black tree backing .NET's ordered set and, via key-value pairs, `SortedDictionary`.
- [`SortedDictionary<TKey,TValue>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sorteddictionary-2) — source for the structure and its analysis.
