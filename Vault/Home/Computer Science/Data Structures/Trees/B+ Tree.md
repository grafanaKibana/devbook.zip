---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "The B-tree variant databases ship, with data only in leaves chained for fast range scans."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A database index serves point lookups and ordered ranges such as every key from `15` through `40`. Separator keys route a lookup down the tree. A range scan has another requirement: once it reaches the first matching leaf, it needs a cheap path to the next one.

Revisiting ancestors at every subtree boundary wastes page reads. A B+ tree instead moves directly from one logical leaf page to the next.

The B+ tree is the [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] variant built around that scan. Every `(key, value)` pair lives in a leaf. Internal nodes keep only routing keys whose separators point to child ranges. A separator may duplicate a leaf key, but it is only a signpost. The leaves form a linked list (next, and usually previous), so a scan descends once and then follows the chain in key order.

Internal nodes carry no values, so each routing page packs more separators than a leaf packs records. This can make the tree as shallow as, or shallower than, a B-tree over the same data. The upper routing levels also tend to remain in the buffer pool. Many ordered RDBMS indexes use this leaf-oriented shape, while filesystem variants differ in where records live.

**Core shape:** all `(key, value)` pairs in the leaves → internal nodes are a routing key index → leaves linked in sorted order → one descent then a sequential leaf walk answers a range

Inserting the prefilled `25` splits a leaf. The first key in the new right leaf is copied into the parent and remains in the leaf. A **Range scan** for `[15, 40]` then descends to the first match and follows the green links across the remaining leaves.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"b-plus-tree","values":[5,9,12,17,33,40,21],"value":25,"range":[15,40]}
```

#### Representation

Two node kinds share one page-sized layout:

- An **internal node** holds `k` separator keys and `k + 1` child pointers. Separator `s_i` guarantees every key in child `i` is `< s_i` and every key in child `i + 1` is `>= s_i`. It stores no values and no leaf-record pointers.
- A **leaf node** holds the actual `(key, value)` entries (or, for a non-clustered index, the key plus a row pointer) in sorted order, plus a `next` pointer to its right sibling and typically a `prev` pointer to its left one.

Four invariants define a valid state:

1. All leaves sit at the same depth; every search path has identical length.
2. A separator in an internal node may duplicate a key held in some leaf. The internal copy exists only to route the descent; deleting the leaf record does not require removing the separator, so a routing key can outlive its value.
3. The leaf chain is a total order: following `next` from the leftmost leaf visits every key in ascending order exactly once.
4. Except for the root, an internal node with maximum fan-out `f` has at least `⌈f/2⌉` children, and a leaf with capacity `L` has at least `⌈L/2⌉` records. Split, borrow, and merge repairs preserve this minimum fill.

Splits treat the two node kinds differently. Splitting a leaf **copies up** the first key of the new right leaf as a separator, so that key remains with its value in the leaf. Splitting an internal node **moves up** its chosen separator into the parent, removing it from both resulting children because internal keys route rather than store records.

A point lookup compares against separators to pick a child at each level and always continues to a leaf, because that is the only place a value exists. A range scan `[A, B]` descends to the leaf where `A` would be inserted, starts at `lower_bound(A)`, then follows `next` pointers until a key exceeds `B`. `A` need not exist. The descent cost is the tree height; the leaf-page walk depends on how many result pages are touched.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "B+ Tree complexity",
  "variables": {
    "fanout": {
      "symbol": "f",
      "description": "tree fanout"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of records or keys stored in the tree"
    },
    "keyRange": {
      "symbol": "k",
      "description": "number of records returned by the range scan"
    },
    "lengthL": {
      "symbol": "l",
      "description": "number of records stored per leaf page"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Search (point lookup)",
          "bounds": [
            {
              "kind": "text",
              "role": "Page I/Os",
              "formula": "O(log_f n)"
            },
            {
              "kind": "curve",
              "role": "Output processing",
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
              "role": "Page I/Os",
              "formula": "O(log_f n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "text",
              "role": "Page I/Os",
              "formula": "O(log_f n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range scan [A, B]",
          "bounds": [
            {
              "kind": "text",
              "role": "Page I/Os",
              "formula": "O(log_f n + ⌈k/l⌉)"
            },
            {
              "kind": "curve",
              "role": "Output processing",
              "formula": "O(k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Ordered full scan",
          "bounds": [
            {
              "kind": "text",
              "role": "Page I/Os",
              "formula": "O(log_f n + n/l)"
            },
            {
              "kind": "curve",
              "role": "Output processing",
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
          "operation": "Search (point lookup)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range scan [A, B]",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Ordered full scan",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
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

# Boundaries

A point lookup **always** reaches a leaf. A plain [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] can sometimes stop at an internal value. The B+ tree gives up that early hit. Its worst-case path is not inherently deeper, because smaller internal entries raise fan-out and may offset the leaf-only placement. Cached ancestor pages reduce the physical-I/O difference further.

Leaf links add another invariant to ordinary split and merge logic. On split, the original leaf's `next` points to the new leaf, while the new leaf's `next` inherits the old target. A doubly linked layout updates reverse pointers too. A merge relinks past the removed page. Broken links may leave point lookups correct while range scans skip or repeat keys.

As with a [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]], node capacity is chosen around one storage page. Large keys or values lower fan-out and raise the tree. Real implementations use techniques such as prefix compression to keep separators small.

# Diagram and C# Implementation

> [!ABSTRACT]- Routing index over a linked leaf list
>
> ```mermaid
> graph TD
>   R["internal (routing): 17 | 40"]
>   R --> L1["leaf: 5, 9, 12"]
>   R --> L2["leaf: 17, 21, 33"]
>   R --> L3["leaf: 40, 45, 60"]
>   L1 -. next .-> L2
>   L2 -. next .-> L3
>   L3 -. next .-> NIL[null]
> ```
> Separators `17` and `40` route descents only. The values `17` and `40` also live in leaves. A scan for `[15, 45]` descends to the `17` leaf, then follows `next` links.

> [!EXAMPLE]- C# search and range scan
>
> ```csharp
> public abstract class Node
> {
>     public List<int> Keys = new();
> }
>
> public sealed class Internal : Node
> {
>     public List<Node> Children = new(); // Keys.Count + 1 children
> }
>
> public sealed class Leaf : Node
> {
>     public List<string> Values = new(); // parallel to Keys
>     public Leaf? Next;                   // sorted leaf chain
> }
>
> public sealed class BPlusTree
> {
>     private Node _root = new Leaf();
>
>     public string? Search(int key)
>     {
>         var leaf = DescendToLeaf(key);
>         var i = leaf.Keys.BinarySearch(key);
>         return i >= 0 ? leaf.Values[i] : null; // no early exit: always a leaf
>     }
>
>     public IEnumerable<(int Key, string Value)> Range(int lo, int hi)
>     {
>         var leaf = DescendToLeaf(lo);          // one descent
>         while (leaf is not null)               // then a sequential walk
>         {
>             for (var i = 0; i < leaf.Keys.Count; i++)
>             {
>                 if (leaf.Keys[i] < lo) continue;
>                 if (leaf.Keys[i] > hi) yield break;
>                 yield return (leaf.Keys[i], leaf.Values[i]);
>             }
>             leaf = leaf.Next;                  // follow the link, never re-ascend
>         }
>     }
>
>     private Leaf DescendToLeaf(int key)
>     {
>         var node = _root;
>         while (node is Internal internalNode)
>         {
>             var i = internalNode.Keys.BinarySearch(key);
>             var child = i >= 0 ? i + 1 : ~i;   // >= separator goes right
>             node = internalNode.Children[child];
>         }
>         return (Leaf)node;
>     }
> }
> ```
> Insert and delete (leaf overflow splits, underflow merges, and the `Next` relinking each performs) are omitted. `Range` shows the invariant that makes the structure worthwhile — after `DescendToLeaf` it never returns to an internal node.

# References

- [The Ubiquitous B-Tree (1979)](https://doi.org/10.1145/356770.356776)
- [MySQL InnoDB Index Types](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)
