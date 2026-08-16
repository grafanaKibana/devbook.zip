---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A binary tree ordered left < node < right for lookup, traversal, and ordered queries."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

An ordered collection needs efficient lookup and insertion without giving up min, max, successor, or range queries over `[10, 90)`. A binary search tree gets those operations from one rule: comparison with each ancestor determines whether a key belongs to the left or right.

The **ordering invariant** applies at every node: all keys in the left subtree are smaller, and all keys in the right subtree are larger. A search can therefore discard one subtree after each comparison, while an in-order traversal emits sorted keys. The invariant controls direction, not depth. A plain BST places no bound on its height.

**Core shape:** keys → nodes with `left`/`right` ordered smaller/larger → each comparison discards one subtree

Inserting the prefilled `80` adds a deeper right branch to the balanced seven-key start. Further increasing keys stretch the same branch: order remains valid, but nothing repairs the height.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"binary-search-tree","values":[40,20,60,10,30,50,70],"value":80}
```

#### Representation and Invariants

Each node holds a `key`, a `Left` child, a `Right` child, and optionally a `Parent` back-pointer. There are no arrays or indices — the structure is a graph of node objects reachable from a single `root`. An empty tree is `root == null`; a leaf is a node whose `Left` and `Right` are both null.

The ordering invariant is global, not local. It is not enough that a node's immediate left child is smaller: *every* key anywhere in the left subtree must be smaller than the node, and every key in the right subtree larger. This is what each operation relies on:

- **Search** starts at the root and compares. Equal ends it; smaller descends left; larger descends right; a null child means the key is absent. Every comparison eliminates the entire opposite subtree, because the invariant guarantees the target cannot be there.
- **Insert** repeats the search walk. The null child where the walk falls off is exactly the one position where the new key preserves the invariant, so the new leaf is linked there.
- **In-order traversal** (left, node, right) visits keys in strictly increasing order. This is the invariant made observable: the smallest key is the leftmost node, the successor of any node is the next node in that traversal.

Insert and delete change parent/child links; search and traversal read them without mutation. The resulting shape — which key ends up at the root, how deep a subtree runs — is an artifact of insertion order, not of the key set. Two trees holding `{1,2,3}` can be a balanced triangle or a three-node chain depending on the order the keys arrived.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Binary Search Tree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of keys stored in the tree"
    },
    "keyRange": {
      "symbol": "k",
      "description": "number of keys returned by a range query"
    },
    "parameterH": {
      "symbol": "h",
      "description": "current tree height"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Search / Insert / Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Balanced (h = O(log n))",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Degenerate (h = O(n))",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Min / Max / Successor",
          "bounds": [
            {
              "kind": "curve",
              "role": "Balanced (h = O(log n))",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Degenerate (h = O(n))",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "In-order traversal",
          "bounds": [
            {
              "kind": "curve",
              "role": "Balanced (h = O(log n))",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Degenerate (h = O(n))",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range query (k results)",
          "bounds": [
            {
              "kind": "text",
              "role": "Balanced (h = O(log n))",
              "formula": "O(log n + k)"
            },
            {
              "kind": "curve",
              "role": "Degenerate (h = O(n))",
              "formula": "O(n)",
              "curveId": "linear"
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
          "operation": "Search / Insert / Delete",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(h) recursive stack / O(1) iterative"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Min / Max / Successor",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "In-order traversal",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(h) recursive stack / O(n) degenerate"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range query (k results)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary traversal",
              "formula": "O(h)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Materialized output",
              "formula": "O(k)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Shape Stops Cooperating

A plain BST does not self-balance. Inserting keys in sorted order — `1, 2, 3, 4, 5` — sends every insert down the right child, because each new key is larger than everything already present.

```text
1 → 2 → 3 → 4 → 5   (every node has only a right child)
```

Sorted or nearly sorted input appears naturally in auto-increment IDs and timestamps. Adversarial input can force the same chain deliberately. The invariant constrains order but gives the tree no mechanism to detect or repair excessive height.

Deletion is the operation with real cases, and each is a consequence of keeping the invariant intact:

1. **Leaf** — unlink it from its parent. Nothing below depends on it.
2. **One child** — splice that child into the removed node's place. The subtree's ordering relative to the rest is unchanged.
3. **Two children** — the node cannot simply vanish without orphaning a subtree. Replace its key with the **in-order successor** (the minimum of the right subtree: step right once, then left until a node has no left child), then delete that successor node. By construction the successor has no left child, so its removal reduces to case 1 or 2. The in-order predecessor works symmetrically.

No delete case repairs the overall shape. The base structure preserves order and leaves height to insertion history.

# Diagram and C# Implementation

> [!ABSTRACT]- Balanced vs. Degenerate shape
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
> `Find` is iterative so a degenerate chain of a million nodes cannot overflow the stack. The recursive `Insert`/`Delete` are safe only because production keys go into a balanced variant. .NET ships no plain BST — `SortedSet<T>` and `SortedDictionary<TKey, TValue>` are red-black trees.

# Comparison

| Structure | Ordering retained | Update behavior | Height protection | Stronger case |
| --- | --- | --- | --- | --- |
| Binary search tree | Yes. Supports min/max/successor/range | Links a new leaf without rebalancing | None. Insertion order determines shape | The simplest mutable ordered structure when input is already well shaped |
| Self-balancing BST | Yes. Supports the same ordered queries | Rotates or recolors after updates | Rebalancing keeps paths shallow | Production mutable ordered sets and maps |
| [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap\|Hash map]] | No | Updates buckets by hash | Tree height does not apply | Exact-match lookups where order is irrelevant |
| Sorted array + [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search\|binary search]] | Yes. Index order is key order | Inserts shift later elements | Tree height does not apply | Static data searched far more often than it changes |

A plain BST is useful when input already produces a reasonable shape and rebalancing would add needless machinery. A hash map gives up ordering for exact-match lookup. A sorted array keeps binary-search reads but pays to shift elements on insertion. Production mutable ordered sets and maps usually need a self-balancing tree.

# References

- [Binary Search Trees (Princeton Algorithms)](https://algs4.cs.princeton.edu/32bst/)
