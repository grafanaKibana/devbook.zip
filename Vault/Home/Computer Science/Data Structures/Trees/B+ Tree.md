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

A disk-resident index holds millions of ordered records and must answer two shapes of query cheaply: "find key `K`" and "read every key between `A` and `B` in order." A plain [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] answers both with one `O(log_m n)` descent and `O(k)` output processing by retaining an in-order cursor or explicit ancestor stack. The catch is locality. Crossing a subtree boundary revisits ancestor pages before descending again, while a B+ tree keeps the scan moving directly from one logical leaf page to the next.

The B+ tree is the [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] variant that reshapes the node layout for exactly that second query. Every `(key, value)` pair moves down to the leaves; internal nodes keep only keys, acting as a routing index whose separators point to the child subtree that owns a range. A separator can equal a key still living in a leaf — it is a signpost, not the record. Then the leaves are chained into a linked list (next, usually also previous), so once a descent lands on the first matching leaf, the scan walks the chain in key order without touching an internal node again.

Because internal nodes carry no values, each routing page packs far more separators than a leaf packs records. Fan-out rises, the tree gets even shallower than a B-tree over the same data, and the routing levels tend to stay cached in the buffer pool. Many ordered RDBMS indexes use this leaf-oriented shape; filesystems use related B-tree variants whose record placement varies.

**Core shape:** all `(key, value)` pairs in the leaves → internal nodes are a routing key index → leaves linked in sorted order → one descent then a sequential leaf walk answers a range → `O(n)` storage.

Press **Insert** with the prefilled `25` to split a leaf: the first key in the right leaf is copied into the parent and remains in the leaf. Then press **Range scan** for `[15, 40]`; the highlighted path reaches the first matching leaf and the green links carry the scan across the remaining leaves.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"b-plus-tree","values":[5,9,12,17,33,40,21],"value":25,"range":[15,40]}
```

# Representation

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
      "description": "number of input elements or states"
    },
    "keyRange": {
      "symbol": "k",
      "description": "key range, digit count, or requested result count"
    },
    "lengthL": {
      "symbol": "L",
      "description": "key, string, path, or sequence length"
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
              "formula": "O(log_f n + ⌈k/L⌉)"
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
              "formula": "O(log_f n + n/L)"
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

# Complexity

Let `f` be internal-node fan-out, `L` be the number of records a leaf can hold, and `k` be the number of records returned. Page I/O and record processing are separate costs:

| Operation | Page I/Os | Output processing | Structure space | Cause |
| --- | --- | --- | --- | --- |
| Search (point lookup) | `O(log_f n)` | `O(1)` | `O(n)` | One descent to a leaf; ancestor pages are often cache-resident. |
| Insert | `O(log_f n)` | — | `O(n)` | Descend to a leaf, insert in order, then copy up or move up a separator on overflow. |
| Delete | `O(log_f n)` | — | `O(n)` | Descend to a leaf, remove, borrow, or merge on underflow. |
| Range scan `[A, B]` | `O(log_f n + ⌈k/L⌉)` | `O(k)` | `O(n)` | Descend to where `A` would be inserted, start at `lower_bound(A)`, then follow leaf links across the result pages. |
| Ordered full scan | `O(log_f n + n/L)` | `O(n)` | `O(n)` | Descend to the leftmost leaf, then visit every leaf page and process every record. |

The `O(k)` output term is not unique to B+ trees: a plain B-tree also processes `k` results with an ancestor stack or cursor. The B+ advantage is the page path after the lower bound. Leaf links avoid logical re-ascent through routing pages and give the buffer manager a clear read-ahead or prefetch sequence. They do not guarantee physically adjacent pages; allocation and later splits can scatter neighboring leaves. Ancestor pages are often cached, so the benefit is fewer navigation steps and more predictable page access, not a promise of contiguous I/O.

# Boundaries

A point lookup **always** reaches a leaf. A plain [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] can sometimes find its value in an internal node and stop early; the B+ tree gives up that possible early hit because internal nodes hold no values. Its worst-case path is not inherently deeper: a B-tree lookup may also reach a leaf, while the B+ tree's smaller internal entries raise fan-out enough to make it equally shallow or shallower. Cached ancestor pages further reduce the physical-I/O difference.

Leaf-link maintenance rides on top of the ordinary split and merge logic. When a leaf splits, the new leaf must be stitched into the chain: the original leaf's `next` is repointed at the new leaf, and the new leaf's `next` inherits the old target (and the reverse pointers updated when the list is doubly linked). A merge does the mirror — the survivor absorbs the neighbor's entries and relinks past the removed node. Getting this relinking wrong corrupts ordered iteration without breaking point lookups, so the defect can hide until a range scan skips or repeats a run of keys.

The same page-sizing constraint as a [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] applies: node capacity is chosen so a node fills one storage page. Oversized keys or values lower fan-out, raise the tree, and erode the shallow-tree advantage. Variable-length keys and prefix compression in real implementations exist to keep separators small and fan-out high.

# Reference Drawer

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
> Separators `17` and `40` route descents only; the values `17` and `40` also live in leaves. A scan for `[15, 45]` descends to the `17` leaf, then follows `next` links.

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
> Insert and delete (leaf overflow splits, underflow merges, and the `Next` relinking each performs) are omitted; `Range` shows the invariant that makes the structure worthwhile — after `DescendToLeaf` it never returns to an internal node.

# Questions

> [!QUESTION]- What two structural changes turn a B-tree into a B+ tree, and which query do they serve?
> All `(key, value)` pairs move to the leaves, leaving internal nodes as a pure routing key index, and the leaves are chained into a sorted linked list. Both changes serve the range scan: after one descent, matching keys are read by walking the leaf chain in order instead of re-ascending into internal nodes.

> [!QUESTION]- Why does a B+ range scan cost `O(log_f n + ⌈k/L⌉)` page I/Os plus `O(k)` record processing?
> The `log_f n` descent reaches the leaf where the lower bound would be inserted. Starting at `lower_bound(A)`, the scan follows leaf links across about `⌈k/L⌉` result pages and processes each of the `k` returned records once. A plain B-tree can match the output bound with a cursor or ancestor stack, but B+ leaf links avoid logical re-ascent at subtree boundaries.

> [!QUESTION]- Why does removing internal values raise fan-out, and why does that help on disk?
> A separator is just a key and a child pointer, far smaller than a full record, so a routing page packs many more entries. Higher fan-out means fewer levels, and the small routing levels tend to stay in the buffer pool, so a lookup often costs a single physical read of the leaf.

# References

- Comer, [The Ubiquitous B-Tree (1979)](https://doi.org/10.1145/356770.356776) — the survey that canonically defines the B+ variant, its leaf-only data placement, and the leaf-chain design.
- [MySQL InnoDB Index Types](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html) — clustered primary-key and secondary index behavior, with rows stored in the clustered leaf level.
- [SQL Server clustered and nonclustered index architecture](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide) — page-level B-tree layout, doubly linked leaf pages, and the clustered-vs-nonclustered leaf contents.
- [PostgreSQL B-Tree indexes](https://www.postgresql.org/docs/current/btree.html) — the Lehman–Yao access method with right-sibling links on every level that lets it scan ranges like a B+ tree.
- [Use the Index, Luke — Anatomy of an SQL Index](https://use-the-index-luke.com/sql/anatomy) — a database-agnostic walkthrough of leaf chains and why range scans read sequentially.
