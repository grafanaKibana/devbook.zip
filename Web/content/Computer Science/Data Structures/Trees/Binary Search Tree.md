---
publish: true
created: 2026-07-11T11:53:53.186Z
modified: 2026-07-11T11:53:53.186Z
published: 2026-07-11T11:53:53.186Z
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

An ordered collection of keys needs three things at once: fast lookup, fast insertion, and ordered access — min, max, "the next key after 40", every key in `[10, 90)`. A sorted array answers ordered queries in `O(log n)` but pays `O(n)` to shift elements on every insert. A [[HashMap]] inserts and looks up in `O(1)` but stores keys in hash order, so it cannot answer any of the ordered queries without first sorting. A binary search tree stores keys in a shape that keeps both: each key sits at a node with two children, and the position of every key is fixed by comparison against its ancestors.

The binding rule is the **ordering invariant**: for any node, every key in its left subtree is smaller than the node's key, and every key in its right subtree is larger. That invariant is what lets a search discard one whole subtree at each comparison, and it is what makes an in-order traversal emit the keys already sorted. What the tree does not carry is any bound on its own height — the invariant fixes left-versus-right, not depth.

**Core shape:** keys → nodes with `left`/`right` ordered smaller/larger → each comparison discards one subtree → `O(height)` per operation → `O(n)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a tree card showing the decisive transition to animate — a search descending left or right by comparison, an insert falling through to the leaf where the search runs off, and a sorted-insert sequence stretching the tree into a right-leaning chain. No matching renderer exists in `engine.js` yet.

## Representation and invariants

Each node holds a `key`, a `Left` child, a `Right` child, and optionally a `Parent` back-pointer. There are no arrays or indices — the structure is a graph of node objects reachable from a single `root`. An empty tree is `root == null`; a leaf is a node whose `Left` and `Right` are both null.

The ordering invariant is global, not local. It is not enough that a node's immediate left child is smaller: _every_ key anywhere in the left subtree must be smaller than the node, and every key in the right subtree larger. This is what each operation relies on:

- **Search** starts at the root and compares. Equal ends it; smaller descends left; larger descends right; a null child means the key is absent. Every comparison eliminates the entire opposite subtree, because the invariant guarantees the target cannot be there.
- **Insert** repeats the search walk. The null child where the walk falls off is exactly the one position where the new key preserves the invariant, so the new leaf is linked there.
- **In-order traversal** (left, node, right) visits keys in strictly increasing order. This is the invariant made observable: the smallest key is the leftmost node, the successor of any node is the next node in that traversal.

Insert and delete change parent/child links; search and traversal read them without mutation. The resulting shape — which key ends up at the root, how deep a subtree runs — is an artifact of insertion order, not of the key set. Two trees holding `{1,2,3}` can be a balanced triangle or a three-node chain depending on the order the keys arrived.

## Complexity

Every operation cost is a function of the height `h`. A balanced tree has `h = O(log n)`; a degenerate one has `h = O(n)`.

| Operation | Balanced (`h = O(log n)`) | Degenerate (`h = O(n)`) | Space | Cause |
| --- | --- | --- | --- | --- |
| Search / Insert / Delete | `O(log n)` | `O(n)` | `O(h)` recursive stack / `O(1)` iterative | Each step descends exactly one level; cost equals the height of the path taken. |
| Min / Max / Successor | `O(log n)` | `O(n)` | `O(1)` | Follows a single root-to-leaf (or one-turn) path of length `h`. |
| In-order traversal | `O(n)` | `O(n)` | `O(h)` recursive stack / `O(n)` degenerate | Visits every node once; shape does not change the count. |
| Range query (`k` results) | `O(log n + k)` | `O(n)` | `O(h)` | Descent to the range boundary costs `h`, plus one emit per matching key. |

Structure storage is `O(n)` overall — one node per key, plus the child pointers. The per-operation Space column above is auxiliary space on top of that: a recursive walk consumes `O(h)` call-stack frames, while an iterative walk keeps it at `O(1)`. None of these bounds assume balancing, which is precisely the gap the boundaries below expose.

## When the shape stops cooperating

A plain BST does not self-balance. Inserting keys in sorted order — `1, 2, 3, 4, 5` — sends every insert down the right child, because each new key is larger than everything already present. The result satisfies the ordering invariant perfectly and is still an `O(n)` chain indistinguishable in cost from a [[LinkedList]]:

```text
1 → 2 → 3 → 4 → 5   (every node has only a right child)
```

Sorted or nearly-sorted input is common, not contrived: auto-increment IDs, timestamps, exported-and-reimported tables. Adversarial input can force the same chain deliberately. Because the invariant constrains order but never height, the tree has no mechanism to notice or prevent this. That single failure mode is the entire reason [[AVL Tree]] and [[Red-Black Tree]] exist: they add rotations that re-balance after each write so height stays `O(log n)` regardless of insertion order.

Deletion is the operation with real cases, and each is a consequence of keeping the invariant intact:

1. **Leaf** — unlink it from its parent. Nothing below depends on it.
2. **One child** — splice that child into the removed node's place; the subtree's ordering relative to the rest is unchanged.
3. **Two children** — the node cannot simply vanish without orphaning a subtree. Replace its key with the **in-order successor** (the minimum of the right subtree: step right once, then left until a node has no left child), then delete that successor node. By construction the successor has no left child, so its removal reduces to case 1 or 2. The in-order predecessor works symmetrically.

Order queries by _rank_ — "the 7th smallest key" — are not `O(log n)` on a plain BST. Reaching them requires counting nodes along the way, which is `O(n)` unless each node is augmented with a subtree-size field. The base structure stores order but not position.

## Reference drawer

> [!ABSTRACT]- Balanced vs. degenerate shape
>
> ```mermaid
> flowchart TD
>   subgraph Balanced
>     B4((4)) --> B2((2))
>     B4 --> B6((6))
>     B2 --> B1((1))
>     B2 --> B3((3))
>     B6 --> B5((5))
>   end
>   subgraph Degenerate
>     D1((1)) --> D2((2))
>     D2 --> D3((3))
>     D3 --> D4((4))
>     D4 --> D5((5))
>   end
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class Node
> {
>     public int Key;
>     public Node? Left, Right;
> }
>
> public static Node? Find(Node? node, int key)
> {
>     while (node is not null && node.Key != key)
>     {
>         node = key < node.Key ? node.Left : node.Right;
>     }
>
>     return node;
> }
>
> public static Node Insert(Node? node, int key)
> {
>     if (node is null)
>     {
>         return new Node { Key = key };
>     }
>
>     if (key < node.Key)
>     {
>         node.Left = Insert(node.Left, key);
>     }
>     else if (key > node.Key)
>     {
>         node.Right = Insert(node.Right, key);
>     }
>
>     return node;
> }
>
> public static Node? Delete(Node? node, int key)
> {
>     if (node is null)
>     {
>         return null;
>     }
>
>     if (key < node.Key)
>     {
>         node.Left = Delete(node.Left, key);
>     }
>     else if (key > node.Key)
>     {
>         node.Right = Delete(node.Right, key);
>     }
>     else if (node.Left is null)
>     {
>         return node.Right;
>     }
>     else if (node.Right is null)
>     {
>         return node.Left;
>     }
>     else
>     {
>         var successor = node.Right;
>         while (successor.Left is not null)
>         {
>             successor = successor.Left;
>         }
>
>         node.Key = successor.Key;
>         node.Right = Delete(node.Right, successor.Key);
>     }
>
>     return node;
> }
> ```
>
> `Find` is iterative so a degenerate chain of a million nodes cannot overflow the stack; the recursive `Insert`/`Delete` are safe only because production keys go into a balanced variant. .NET ships no plain BST — `SortedSet<T>` and `SortedDictionary<TKey, TValue>` are red-black trees.

## Comparison

| Structure | Search | Insert | Ordered queries | Worst-case guarantee | Stronger case |
| --- | --- | --- | --- | --- | --- |
| Binary search tree | `O(h)` | `O(h)` | min/max/successor/range | None — degrades to `O(n)` | Random or already-balanced input; the simplest ordered structure |
| [[AVL Tree]] | `O(log n)` | `O(log n)` | same | `O(log n)` (strict balance) | Lookup-heavy workloads where read speed matters most |
| [[Red-Black Tree]] | `O(log n)` | `O(log n)` | same | `O(log n)` (looser balance) | Mixed read/write; fewer rotations per write — the library default |
| [[HashMap]] | `O(1)` avg | `O(1)` avg | none | `O(n)` worst | Exact-match lookups where order is irrelevant |
| Sorted array + [[Binary Search]] | `O(log n)` | `O(n)` | via index | `O(log n)` search only | Static data searched far more often than it changes |

A plain BST is the simplest structure that keeps keys ordered while supporting cheap insertion, and it behaves well on random or already-balanced input. It pays for that simplicity with no worst-case guarantee: a self-balancing tree is the only one of these that holds `O(log n)` on adversarial or sorted input, trading a small constant per write for rotations. A hash map is faster still for point lookups but discards ordering entirely, so it cannot answer range or successor queries; a sorted array matches the search cost but cannot absorb insertions cheaply.

## Questions

> [!QUESTION]- Why does an in-order traversal of a BST produce sorted keys?
> The ordering invariant places every smaller key in the left subtree and every larger key in the right. Visiting left, then the node, then right therefore reaches the smallest key first and the largest last, in strictly increasing order — the invariant made observable.

> [!QUESTION]- What happens when a plain BST receives keys in sorted order, and why?
> Each new key is larger than everything present, so every insert descends right. The tree becomes a right-leaning chain of height `n` — functionally a linked list — and search, insert, and delete all degrade to `O(n)`. The invariant is preserved; only the height blows up, which is why balanced variants add rotations.

> [!QUESTION]- How is a node with two children deleted?
> Its key is replaced by the in-order successor — the minimum of the right subtree, found by stepping right once then left to the end. That successor has no left child, so removing it reduces to the leaf or one-child case. This keeps the ordering invariant intact without orphaning either subtree.

> [!QUESTION]- When does a hash map beat a BST despite the BST's ordered access?
> When the workload is purely exact-match lookup and insertion with no need for range queries, successors, min/max, or sorted iteration. The hash map delivers `O(1)` average operations; the ordering a BST maintains is pure overhead if nothing queries it.

## References

- [Binary Search Trees (Princeton Algorithms)](https://algs4.cs.princeton.edu/32bst/) — Sedgewick's canonical treatment: the ordering invariant, Hibbard deletion, and expected-height analysis under random insertion.
- [`SortedSet<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedset-1) — .NET's production ordered set, a self-balancing red-black tree, contrasting with the unbalanced base structure.
- [Binary search tree (Wikipedia)](https://en.wikipedia.org/wiki/Binary_search_tree) — formal invariant statement, operation pseudocode, and the expected-`O(log n)`-height result for random insertion order.
