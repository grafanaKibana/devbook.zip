---
publish: true
created: 2026-08-10T06:36:38.102Z
modified: 2026-08-10T06:36:38.102Z
published: 2026-08-10T06:36:38.102Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A self-balancing search tree with page-sized many-key nodes, keeping disk-resident indexes shallow.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A relational index holds millions of ordered keys on disk or SSD, a medium where a single random access fetches an entire block — a page, typically 4–16 KB.

A B-tree removes most of those reads by packing many sorted keys into a single page-sized node. Each node has a fan-out `m` in the hundreds instead of two, so height collapses to `log_m n` and the same 130 million keys resolve in three or four page reads. What the structure keeps is only the sorted order of the keys and the child that brackets each gap; it records no insertion history and no placement beyond which node a key landed in.

**Core shape:** page-sized node → up to `m−1` sorted keys and `m` child pointers → every non-root node at least `⌈m/2⌉−1` full → all leaves at equal depth

Press **Insert** with the prefilled `6`: the leaf temporarily reaches four keys, then the median `10` moves into a new root while the remaining keys stay in two leaves.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"b-tree","values":[10,20,5],"value":6}
```

An order-`m` B-tree stores each node as one page. A node is two parallel arrays: up to `m−1` sorted keys and up to `m` child pointers (leaves carry keys only). Four invariants define a valid state:

1. Keys inside a node are sorted; an internal node with `k` keys has exactly `k+1` children, and child `i` covers the key range between key `i−1` and key `i`. A leaf has no children.
2. Every node except the root holds between `⌈m/2⌉−1` and `m−1` keys. A nonempty root holds at least one key; the root may hold zero only when the tree is empty.
3. All leaves sit at the same depth — the tree is balanced by construction, without rotations.
4. `m` is chosen so a full node fills one page (or one cache line for an in-memory variant). This is the sizing decision the whole design turns on.

Some implementations parameterize the same capacity by **minimum degree** `t` instead of order. For that convention, a node holds at most `2t−1` keys and `2t` children, so its maximum order is `m = 2t`. The visualization uses order `m = 4`: at most three settled keys per node. Calling that value `t = 4` would describe a different, larger tree with up to seven keys per node.

Search is a binary search within the current node, then a descent into the child whose range brackets the key, repeated until a leaf. Because `m` is large, the base of the logarithm is large: the 130-million-key example above takes roughly 27 binary-tree levels but only three or four B-tree levels. PostgreSQL builds each node from one 8 KB page; SQLite represents tables and indexes with B-tree interior and leaf pages.

#### Growing and Shrinking by Split and Merge

Height changes only at the root, which is what keeps every leaf at equal depth without rotations.

An insert always lands in a leaf, in sorted position. If that leaf reaches `m` keys it **splits**: its median key moves up into the parent and the node becomes two nodes that each meet the `⌈m/2⌉−1` minimum. An overflowing parent splits the same way, so splits cascade upward along the search path; when the root itself splits, a new root is created and the tree gains one level.

The trace uses that **bottom-up** algorithm: descend first, permit a temporary `m`-key overflow, then split while returning toward the root. The compact C# sketch below describes the equally valid **top-down** variant, which splits a full `m−1`-key child before descending into it. Both preserve the same settled order-`m` invariants; they differ only in when the split occurs.

A delete can leave a node below the `⌈m/2⌉−1` minimum. The repair mirrors the split. If an adjacent sibling has a spare key, the node **borrows** — the parent's separator rotates down and the sibling's key rotates up. If both siblings are minimal, the node **merges** with a sibling and the separating parent key into one node; merges cascade upward, and when the root empties the tree loses a level. Deleting from an internal node is first reduced to the leaf case by swapping the key with its in-order predecessor.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "B-tree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of keys stored in the tree"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "tree order and maximum number of children per node"
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
              "kind": "text",
              "role": "Node accesses (I/O)",
              "formula": "O(log_m n) page reads"
            },
            {
              "kind": "text",
              "role": "In-node work",
              "formula": "O(log₂ m) binary search per node"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "text",
              "role": "Node accesses (I/O)",
              "formula": "O(log_m n) reads, plus splits along the path"
            },
            {
              "kind": "curve",
              "role": "In-node work",
              "formula": "O(m) to shift keys and split a node",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "text",
              "role": "Node accesses (I/O)",
              "formula": "O(log_m n) reads, plus borrow or merge"
            },
            {
              "kind": "curve",
              "role": "In-node work",
              "formula": "O(m) to shift or fuse keys",
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
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Aux space per op",
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
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "text",
              "role": "Aux space per op",
              "formula": "O(log_m n) path"
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
            },
            {
              "kind": "text",
              "role": "Aux space per op",
              "formula": "O(log_m n) path"
            }
          ]
        }
      ]
    }
  }
}
```
````

# When Block Orientation Stops Paying off

Each boundary traces back to the page-sized node.

In pure memory there is no storage-page read to amortize. That does not make a B-tree automatically slower: a flat node can keep several comparisons in one cache line while a pointer-heavy [[Computer Science/Data Structures/Trees/Red-Black Tree|Red-Black Tree]] or [[Computer Science/Data Structures/Trees/AVL Tree|AVL Tree]] incurs cache misses. Use a cache-sized B-tree when locality matters; use the binary trees when their simpler node updates fit the workload better.

Writes rewrite whole pages. An insert that fills a page splits it, producing two page writes where a binary tree would flip a few pointers, and random-order insertion keeps triggering splits — sustained write amplification. Bulk-loading already-sorted keys sidesteps this by packing pages to near-100% before they are written, which is why databases build an index faster from sorted input than by inserting rows one at a time. Where writes dominate, the [[Data Persistence/NoSQL/LSM-Tree|LSM-Tree]] is the write-optimized counterpart that attacks exactly this cost, trading read and space amplification for far higher write throughput.

The branching factor must be sized to the page. `m` is effectively fixed by `page_size / (key_size + pointer_size)`, not chosen freely.

# Reference Drawer

> [!ABSTRACT]- Structure and a split
>
> ```mermaid
> graph TD
>   subgraph after["after inserting 6 and splitting"]
>     P2["root: 10"] --> A2["5, 6"]
>     P2 --> B2["20"]
>   end
>   subgraph before["before: full order-4 leaf"]
>     P1["5, 10, 20"]
>   end
>   P1 -. "insert 6" .-> P2
> ```
>
> The order-4 leaf temporarily reaches four keys; `10` rises into a new root, leaving `5, 6` and `20` in two leaves. An overflowing parent repeats the same move, and a splitting root adds the only new level.

> [!EXAMPLE]- Search and insert (C#, order-`m`)
>
> ```csharp
> public sealed class BTreeNode
> {
>     public List<int> Keys = new();          // sorted, up to m-1
>     public List<BTreeNode> Children = new(); // up to m; empty on a leaf
>     public bool IsLeaf => Children.Count == 0;
> }
>
> public sealed class BTree
> {
>     private readonly int _t;                 // minimum degree; maximum order m = 2t
>     private BTreeNode _root = new();
>
>     public BTree(int minimumDegree) => _t = minimumDegree;
>
>     public bool Search(int key)
>     {
>         var node = _root;
>         while (node is not null)
>         {
>             var i = node.Keys.BinarySearch(key);
>             if (i >= 0) return true;          // found in this node
>             if (node.IsLeaf) return false;
>             node = node.Children[~i];         // ~i = first key greater than target
>         }
>         return false;
>     }
>
>     // Insert descends to a leaf and splits any full 2t-1-key node on the way down,
>     // so a split never has to propagate back up past a node already made safe.
>     // Split moves Keys[t-1] into the parent and divides the remaining keys
>     // and children between the two halves. Full body omitted; see references.
> }
> ```
>
> `BinarySearch` returns the bitwise complement of the insertion index on a miss, so `~i` is exactly the child pointer to follow. A production node is a serialized page, not a `List<int>`; the array layout is the same.

# Questions

> [!QUESTION]- How does a B-tree stay balanced with all leaves at one depth, and without rotations?
> Height changes only at the root. An overflowing node splits and pushes its median key into the parent; if the split cascades to the root, a new root adds a single level. Because growth happens only at the top and every split leaves both nodes with at least `⌈m/2⌉−1` keys, all leaves remain at equal depth by construction.

> [!QUESTION]- What fixes a node that drops below its minimum fill on delete?
> If an adjacent sibling has a spare key, the node borrows: the parent's separator rotates down and the sibling's key rotates up. If both siblings are minimal, the node merges with a sibling and the separating parent key into one node, which can cascade upward and shrink the tree by a level.

# References

- [Bayer & McCreight, Organization and Maintenance of Large Ordered Indexes (1972)](https://doi.org/10.1007/BF00288683) — the original paper introducing the structure and its page-oriented split/merge maintenance.
- [SQLite database file format — B-tree pages](https://www.sqlite.org/fileformat2.html#b_tree_pages) — precise on-disk layouts for table and index B-tree interior and leaf pages; the clearest concrete "node = page" walkthrough.
- [PostgreSQL nbtree README](https://github.com/postgres/postgres/blob/master/src/backend/access/nbtree/README) — production notes on the Lehman–Yao variant Postgres ships: sibling links, page splits, and concurrency on real page-sized nodes.
- [PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html) — index-type overview showing the default B-tree access method in context.
