---
publish: true
created: 2026-08-20T20:41:15.602Z
modified: 2026-08-20T20:41:15.602Z
published: 2026-08-20T20:41:15.602Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A rigidly self-balancing BST with tighter worst-case height than red-black trees for lookup-heavy workloads.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

An ordered set still needs predictable lookups while keys are inserted and removed.

An AVL tree is a binary search tree with a hard height bound. Each node stores its subtree height (or the derived balance factor), and after every insert or delete the structure enforces the **AVL invariant**: for every node, `|height(left) − height(right)| ≤ 1`. A **rotation** repairs any node whose balance factor reaches ±2.

That guarantee adds work to every mutation. Each node carries a height field, and the strict balance target triggers more rebalancing than looser schemes need.

The visualization starts with a balanced tree. Inserting the prefilled `5` makes node `20` left-heavy, then an LL rotation restores the bound.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"avl-tree","values":[30,20,40,10],"value":5}
```

#### Representation and Rebalancing

An AVL node holds a key, left and right child pointers, and one extra integer — its height, from which the balance factor is derived:

```text
balanceFactor(node) = height(node.Left) − height(node.Right)   ∈ {−1, 0, +1}   when balanced
```

Insert and delete run exactly as in a plain BST first — descend by key comparison, splice the node in or out at a leaf-adjacent position. The AVL work happens on the way back up: the path from the touched node to the root is retraced, each node's stored height recomputed, and the first node whose balance factor reaches ±2 is rebalanced by rotation.

A rotation is a local pointer reassignment that lifts the middle-valued of three keys up one level while preserving in-order sequence. Which rotation applies depends on the *shape* of the imbalance, and there are exactly four:

| Shape | Detected as | Repair |
| --- | --- | --- |
| Left-Left | node +2, left child +1 or 0 | single right rotation |
| Right-Right | node −2, right child −1 or 0 | single left rotation |
| Left-Right | node +2, left child −1 | left-rotate the left child, then right-rotate the node |
| Right-Left | node −2, right child +1 | right-rotate the right child, then left-rotate the node |

The double cases (LR, RL) exist because a single rotation on a zig-zag shape only mirrors the imbalance to the other side; the inner node has to be rotated outward into a straight chain first. Whatever the shape, the node that ends up on top is always the median of the three keys involved.

Insert and delete diverge in how far the repair travels. After an insert, a single rebalancing operation (one single or one double rotation) restores the invariant for the *entire* tree — the rebalanced subtree regains its pre-insert height, so nothing above it changed. After a delete, the rotated subtree can end up one level *shorter* than before, which can itself unbalance a node further up, so rebalancing may cascade all the way to the root.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "AVL Tree complexity",
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
              "role": "Time",
              "formula": "O(log n) guaranteed",
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
              "role": "Time",
              "formula": "O(log n) guaranteed",
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
              "role": "Time",
              "formula": "O(log n) guaranteed",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Any rotation",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
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
          "operation": "Search",
          "bounds": [
            {
              "kind": "text",
              "role": "Extra space",
              "formula": "O(1) iterative, O(log n) recursion stack"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "text",
              "role": "Extra space",
              "formula": "O(log n) recursion stack; O(1) iterative with parent pointers"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "text",
              "role": "Extra space",
              "formula": "O(log n) recursion stack; O(1) iterative with parent pointers"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Any rotation",
          "bounds": [
            {
              "kind": "curve",
              "role": "Extra space",
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
````

# Where Strict Balance Costs

The strict `|balance| ≤ 1` target keeps lookup paths short and makes writes comparatively expensive.

Write-heavy workloads pay for the tight bound. A [[Computer Science/Data Structures/Trees/Red-Black Tree|Red-Black Tree]] allows its longest root-to-leaf path to be up to twice its shortest, so many insert and delete streams that trigger AVL rotations need only recoloring there.

Stored heights add both memory and mutation work. Every insert and delete recomputes them along the touched path. A missed recomputation after rotation leaves stale state. Later balance checks may choose the wrong case or skip a needed repair. The tree can then violate its invariant without crashing.

Rotation-case selection is the common implementation failure under `|balance| ≤ 1`. Applying one rotation to a Left-Right or Right-Left shape merely moves the imbalance to the other side. The inner node must move outward first. Incorrect dispatch can preserve BST order while losing the AVL height bound.

# Diagram and C# Implementation

> [!ABSTRACT]- Left-Left case and its single right rotation
>
> ```mermaid
> graph LR
>     subgraph before ["factor(3) = +2"]
>         A((3)) --> B((2))
>         B --> C((1))
>     end
>     subgraph after ["right-rotate around 3"]
>         D((2)) --> E((1))
>         D --> F((3))
>     end
>     before --> after
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class AvlTree
> {
>     private sealed class Node
>     {
>         public int Key;
>         public Node? Left;
>         public Node? Right;
>         public int Height = 1;
>
>         public Node(int key) => Key = key;
>     }
>
>     private Node? _root;
>
>     private static int Height(Node? node) => node?.Height ?? 0;
>
>     private static int Balance(Node? node) =>
>         node is null ? 0 : Height(node.Left) - Height(node.Right);
>
>     private static void Recompute(Node node) =>
>         node.Height = 1 + Math.Max(Height(node.Left), Height(node.Right));
>
>     private static Node RotateRight(Node y)
>     {
>         var x = y.Left!;
>         y.Left = x.Right;
>         x.Right = y;
>         Recompute(y);   // lower node first: its height feeds the new root's
>         Recompute(x);
>         return x;
>     }
>
>     private static Node RotateLeft(Node x)
>     {
>         var y = x.Right!;
>         x.Right = y.Left;
>         y.Left = x;
>         Recompute(x);
>         Recompute(y);
>         return y;
>     }
>
>     public void Insert(int key) => _root = Insert(_root, key);
>
>     private static Node Insert(Node? node, int key)
>     {
>         if (node is null) return new Node(key);
>         if (key < node.Key) node.Left = Insert(node.Left, key);
>         else if (key > node.Key) node.Right = Insert(node.Right, key);
>         else return node;               // duplicates ignored
>
>         Recompute(node);
>         return Rebalance(node);
>     }
>
>     private static Node Rebalance(Node node)
>     {
>         var balance = Balance(node);
>
>         if (balance > 1)                // left heavy
>         {
>             if (Balance(node.Left) < 0) // Left-Right
>                 node.Left = RotateLeft(node.Left!);
>             return RotateRight(node);   // Left-Left (and completed Left-Right)
>         }
>
>         if (balance < -1)               // right heavy
>         {
>             if (Balance(node.Right) > 0) // Right-Left
>                 node.Right = RotateRight(node.Right!);
>             return RotateLeft(node);    // Right-Right (and completed Right-Left)
>         }
>
>         return node;                    // already within |balance| <= 1
>     }
> }
> ```
>
> `Rebalance` is applied to every node on the way back up the recursion. Deletion reuses the same `Recompute` + `Rebalance` pair. Because it can shorten a subtree, the rebalancing must continue past the first fix rather than stopping like insertion does.

# References

- [Adelson-Velsky & Landis, "An algorithm for the organization of information" (1962)](https://zhjwpku.com/assets/pdf/AED2-10-avl-paper.pdf)
