---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A binary search tree (BST) is a binary tree with one ordering invariant: for every node, everything in the left subtree is smaller and everything in the right subtree is larger. That single rule turns a search into a series of "go left or go right" decisions — each comparison discards an entire subtree, so lookup, insert, and delete cost O(height). In a reasonably balanced tree of 1M keys that's ~20 comparisons; a [[HashMap|hash map]] beats that for point lookups, but the BST keeps its keys **in order**, which buys you O(log n) range queries, floor/ceiling ("largest key ≤ x"), min/max, and sorted iteration via in-order traversal (see [[Trees]]) — none of which a hash map can do.

The catch is the word *height*. Nothing in the BST invariant bounds it. The naive BST is the **baseline you study, not the structure you ship**: production code uses a self-balancing variant — [[AVL Tree]] or [[Red-Black Tree]] — or in .NET simply `SortedSet<T>` / `SortedDictionary<TKey, TValue>`, both red-black trees internally.

## How It Works

**Search** starts at the root and compares: equal → found; smaller → go left; larger → go right; null child → not present. **Insert** is the same walk — the null child where the search fell off is where the new leaf goes.

**Delete** is the only operation with cases, and it's the one interviews probe:

1. **Leaf** — unlink it.
2. **One child** — splice the child into the node's place.
3. **Two children** — you can't just remove the node without orphaning a subtree. Replace its key with the **in-order successor** (the minimum of the right subtree — walk right once, then left to the end), then delete that successor node, which by construction has at most one child, reducing to case 1 or 2. The in-order predecessor (max of left subtree) works symmetrically.

```csharp
public sealed class Node
{
    public int Key;
    public Node? Left, Right;
}

static Node? Find(Node? node, int key)
{
    while (node is not null && node.Key != key)
        node = key < node.Key ? node.Left : node.Right;
    return node;
}
```

The iterative loop matters: recursion is fine on a balanced tree (~20 frames for 1M keys) but overflows the 1 MB default stack on a degenerate one.

## Degeneration on Sorted Input

Insert 1, 2, 3, 4, 5 into an empty BST and every insert goes right — the "tree" is a linked list and every operation is O(n):

```mermaid
graph TD
    A((1)) --> B((2))
    B --> C((3))
    C --> D((4))
    D --> E((5))
```

This is not a contrived case; sorted or nearly-sorted input is the *common* case — database exports, timestamps, auto-increment IDs. That is exactly why .NET ships no plain BST: `SortedSet<T>` rebalances with red-black rotations so insertion order can't hurt you. Randomizing insertion order gives expected O(log n) height, but "expected" is not a guarantee you can put in an SLA — self-balancing variants give a worst-case one.

## Complexity

| Operation | Balanced | Degenerate (worst case) |
|---|---|---|
| Search / insert / delete | O(log n) | O(n) |
| Min / max / floor / ceiling | O(log n) | O(n) |
| Sorted iteration (in-order) | O(n) | O(n) |
| Range query | O(log n + k) | O(n) |

Everything is O(height); the balanced/degenerate split is the entire story. Compare [[B-tree]] when the tree lives on disk (fan-out beats depth) and [[Heap]] when you only ever need the min/max, not full ordering.

## Questions

> [!QUESTION]- What breaks when a binary search tree receives already-sorted input?
> Without balancing, it degenerates into a linked list and lookup drops from O(log n) expected height to O(n).

> [!QUESTION]- When does a BST beat a hash map, given the hash map's O(1) lookup?
> Whenever you need order: range queries, floor/ceiling, min/max, or sorted iteration — all O(log n) (or O(n) for full iteration) on a balanced BST, and impossible on a hash map without sorting first.

> [!QUESTION]- How do you delete a node with two children?
> Replace its key with the in-order successor (minimum of the right subtree), then delete that successor — which has at most one child, so the delete reduces to the trivial leaf/one-child case.

## References

- [SortedSet<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedset-1) — .NET's production self-balancing ordered set; useful contrast with a naive BST.
- [Binary Search Trees (Princeton Algorithms)](https://algs4.cs.princeton.edu/32bst/) — Sedgewick's canonical treatment: implementation, delete cases (Hibbard deletion), and height analysis under random insertion.
- [Binary search tree (Wikipedia)](https://en.wikipedia.org/wiki/Binary_search_tree) — formal invariant, operation pseudocode, and the expected-height results for random insertion order.
