---
publish: true
created: 2026-07-18T14:02:44.043Z
modified: 2026-07-18T14:02:44.043Z
published: 2026-07-18T14:02:44.043Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A rigidly self-balancing BST with a ±1 balance factor, giving the fewest search levels per lookup.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

An ordered collection has to answer key lookups and stay open to inserts and deletes. A plain [[Binary Search Tree]] does both in `O(h)`, where `h` is the height, but height is at the mercy of insertion order: feed it keys that are already sorted and every node becomes a right child, so the tree degrades into a length-`n` chain and every search walks the whole thing.

An AVL tree is a binary search tree that refuses to let this happen. Each node additionally stores its subtree height (or the derived balance factor), and after every insert or delete the structure enforces the **AVL invariant**: for every node, `|height(left) − height(right)| ≤ 1`. Whenever a modification pushes some node's balance factor to ±2, a **rotation** restores the invariant. Because no node's two subtrees can differ by more than one level, the whole tree stays at height ≤ ~1.44·log₂ n — a million keys sit in at most ~29 levels rather than a million.

What the structure gives up for that guarantee is written into every write: it carries a height field on each node, and its strict balance target forces more rebalancing on inserts and deletes than looser schemes need.

**Core invariant:** every node keeps `|height(left) − height(right)| ≤ 1` → height stays ≤ ~1.44·log₂ n → search, insert, and delete are `O(log n)` guaranteed, not amortized.

> [!NOTE] Visualization pending
> Planned StepTrace: a balanced-BST card showing an insert descending to a leaf, a node's balance factor leaving `{−1, 0, +1}`, and a rotation (single or double) restoring `|balance| ≤ 1`. No matching renderer exists in `engine.js` yet.

# Representation and rebalancing

An AVL node holds a key, left and right child pointers, and one extra integer — its height, from which the balance factor is derived:

```text
balanceFactor(node) = height(node.Left) − height(node.Right)   ∈ {−1, 0, +1}   when balanced
```

Insert and delete run exactly as in a plain BST first — descend by key comparison, splice the node in or out at a leaf-adjacent position. The AVL work happens on the way back up: the path from the touched node to the root is retraced, each node's stored height recomputed, and the first node whose balance factor reaches ±2 is rebalanced by rotation.

A rotation is a local pointer reassignment that lifts the middle-valued of three keys up one level while preserving in-order sequence. Which rotation applies depends on the _shape_ of the imbalance, and there are exactly four:

| Shape | Detected as | Repair |
| --- | --- | --- |
| Left-Left | node +2, left child +1 or 0 | single right rotation |
| Right-Right | node −2, right child −1 or 0 | single left rotation |
| Left-Right | node +2, left child −1 | left-rotate the left child, then right-rotate the node |
| Right-Left | node −2, right child +1 | right-rotate the right child, then left-rotate the node |

The double cases (LR, RL) exist because a single rotation on a zig-zag shape only mirrors the imbalance to the other side; the inner node has to be rotated outward into a straight chain first. Whatever the shape, the node that ends up on top is always the median of the three keys involved.

Insert and delete diverge in how far the repair travels. After an insert, a single rebalancing operation (one single or one double rotation) restores the invariant for the _entire_ tree — the rebalanced subtree regains its pre-insert height, so nothing above it changed. After a delete, the rotated subtree can end up one level _shorter_ than before, which can itself unbalance a node further up, so rebalancing may cascade all the way to the root.

# Complexity

| Operation | Time | Extra space | Cause |
| --- | --- | --- | --- |
| Search | `O(log n)` guaranteed | `O(1)` iterative, `O(log n)` recursion stack | the invariant caps height at ≤ ~1.44·log₂ n, so no path is longer |
| Insert | `O(log n)` guaranteed | `O(1)` beyond the stored heights | `O(log n)` descent plus one rebalancing walk; **at most one rebalance** (one single or one double rotation) restores `\|balance\| ≤ 1` globally |
| Delete | `O(log n)` guaranteed | `O(1)` | descent plus a rebalancing walk; a shortened subtree can propagate, so **up to `O(log n)`** rotations up the path |
| Any rotation | `O(1)` | `O(1)` | a fixed set of pointer and height reassignments, independent of `n` |

Structure space is `O(n)`: one node per key, each carrying the constant-size key, two child pointers, and the height/balance field. The height cap is not an average — it is a worst case that follows from the invariant. The sparsest tree the invariant allows is a _Fibonacci tree_, whose minimum node count for height `h` obeys `N(h) = N(h−1) + N(h−2) + 1`; inverting that recurrence yields the `1.4405·log₂(n + 2) − 0.328` bound.

# Where strict balance costs

The strict `|balance| ≤ 1` target is exactly what makes AVL fast to read and comparatively expensive to write, and every boundary below traces back to it.

Write-heavy workloads pay for the tight bound. A [[Red-Black Tree]] tolerates a subtree that is up to twice as tall on one side, so many insert and delete streams that would trip an AVL rebalance leave a red-black tree untouched after a recolor. On deletes especially, an AVL tree can cascade `O(log n)` rotations up the path where a red-black tree needs at most three; a workload dominated by mutation does measurably more pointer work on AVL for the same key sequence.

The per-node bookkeeping is a second, quieter cost of the invariant. Every insert and delete must recompute stored heights along the touched path, and the field itself consumes memory on every node. The heights are also load-bearing: if a recompute is skipped after a rotation, the stored value goes stale, balance-factor checks read the wrong number, and later operations pick the wrong rotation case or skip a needed one — the tree silently violates its own invariant with no crash.

Rotation-case selection is the classic implementation bug, and it too is a consequence of demanding an exact `|balance| ≤ 1`. Applying a single rotation to a Left-Right or Right-Left (zig-zag) shape leaves the tree just as unbalanced, mirrored to the opposite side, because only the double rotation moves the inner node out first. Getting the four-case dispatch wrong produces a tree that still parses as a BST but no longer honors the height bound.

# Reference drawer

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
> `Rebalance` is applied to every node on the way back up the recursion. Deletion reuses the same `Recompute` + `Rebalance` pair; because it can shorten a subtree, the rebalancing must continue past the first fix rather than stopping like insertion does.

# Questions

> [!QUESTION]- What is the AVL invariant and when is it checked?
> For every node, `height(left) − height(right)` must stay in `{−1, 0, +1}`. It is checked on the way back up after an insert or delete: each node's stored height is recomputed along the touched path, and the first node whose balance factor reaches ±2 is rotated.

> [!QUESTION]- Why can an insert need at most one rebalance but a delete need `O(log n)`?
> An insert's single rebalance (one single or one double rotation) restores the rebalanced subtree to its pre-insert height, so nothing above it changed and the fix stops. A delete can leave the rotated subtree one level shorter, which can unbalance an ancestor, so rebalancing may cascade all the way to the root.

> [!QUESTION]- Why do the Left-Right and Right-Left cases require a double rotation?
> A single rotation on a zig-zag shape only mirrors the imbalance to the other side. The inner (median) node has to be rotated outward into a straight chain first, after which a single rotation lifts it to the top.

# References

- [Adelson-Velsky & Landis, "An algorithm for the organization of information" (1962)](https://zhjwpku.com/assets/pdf/AED2-10-avl-paper.pdf) — the original paper (translated); primary source for the invariant and the height proof.
- [AVL tree (Wikipedia)](https://en.wikipedia.org/wiki/AVL_tree) — the four rotation cases with diagrams, the Fibonacci-tree height derivation, and the rebalancing-after-delete analysis.
- [Sorted collection types](https://learn.microsoft.com/en-us/dotnet/standard/collections/sorted-collection-types) — Microsoft overview confirming .NET's sorted collections are red-black rather than AVL.
