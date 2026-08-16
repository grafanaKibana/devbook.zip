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

An order book may hold 100K price levels while an exchange feed inserts and removes thousands of entries per second. Ordered iteration and min/max still need bounded search paths. An [[Home/Computer Science/Data Structures/Trees/AVL Tree|AVL tree]] keeps stricter ±1 height balance and often produces shorter paths, but may rebalance more often, especially during deletion. A red-black tree trades some read depth for cheaper updates.

The structure is a [[Home/Computer Science/Data Structures/Trees/Binary Search Tree|binary search tree]] with one logical color bit per node. Color rules bound height without storing measured subtree heights. That looser bound allows an insertion to repair its shape with at most two rotations. Key order is meaningful. Coloring is internal bookkeeping and is not uniquely determined by the key set.

Inserting the prefilled `0` creates a red-red violation. The highlighted recolor and rotation participants restore equal black-height.

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

The looser balance permits taller lookup paths. A read-dominated workload with rare mutation may gain nothing from the rotations it avoids, making the stricter AVL bound the better fit.

Deletion is the difficult operation. Insertion repairs a local red-red violation. Removing a black node changes black-height along one path, so fixup branches on the sibling and its children across mirrored cases. A subtle error can preserve BST order and correct lookup results while silently losing invariant 4 and the height guarantee.

Every mutation must restore all four invariants before returning. Repairing invariant 3 while leaving unequal black counts produces a valid-looking BST with no balance guarantee. The defect may appear only later as an unexpectedly deep path.

# Diagram and C# Implementation

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
> Delete follows the mirror shape but branches on a `nil`-or-black "double-black" node and its sibling's colors across four cases. Production code (`std::map`, `TreeMap`, `SortedSet<T>`) implements it in full rather than the sketch above.

# References

- [Guibas & Sedgewick, "A dichromatic framework for balanced trees" (1978)](https://sedgewick.io/wp-content/themes/sedgewick/papers/1978Dichromatic.pdf)
- [`SortedSet<T>` source (dotnet/runtime)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/src/System/Collections/Generic/SortedSet.cs)
