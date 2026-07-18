---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A self-balancing search tree with page-sized many-key nodes, keeping disk-resident indexes shallow."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A relational index holds millions of ordered keys on disk or SSD, a medium where a single random access fetches an entire block — a page, typically 4–16 KB. A one-key-per-node tree such as a [[Binary Search Tree]] spends one random page read per level, so a lookup over `n` keys costs about `log₂ n` reads: roughly 27 for 130 million keys, and each of those reads is a full random page fetch the storage device charges in full.

A B-tree removes most of those reads by packing many sorted keys into a single page-sized node. Each node has a fan-out `m` in the hundreds instead of two, so height collapses to `log_m n` and the same 130 million keys resolve in three or four page reads. The comparisons performed inside a node are counted against the I/O they replace and are effectively free. What the structure keeps is only the sorted order of the keys and the child that brackets each gap; it records no insertion history and no placement beyond which node a key landed in.

**Core shape:** page-sized node → up to `m−1` sorted keys and `m` child pointers → every non-root node at least `⌈m/2⌉−1` full → all leaves at equal depth → height ≈ `log_m n`, `O(n)` storage.

A rendered trace would show an insert overflowing a full node and the resulting split propagating upward.

> [!NOTE] Visualization pending
> Planned StepTrace: a shallow multi-way-tree card whose wide nodes each hold several sorted keys, animating an insert that overflows a full node, splits it, and pushes the median key up into the parent — the single move that grows the tree. No matching renderer exists in `engine.js` yet.

# Representation and invariants

An order-`m` B-tree stores each node as one page. A node is two parallel arrays: up to `m−1` sorted keys and up to `m` child pointers (leaves carry keys only). Four invariants define a valid state:

1. Keys inside a node are sorted; a node with `k` keys has exactly `k+1` children, and child `i` covers the key range between key `i−1` and key `i`.
2. Every node except the root holds between `⌈m/2⌉−1` and `m−1` keys. The root may hold as few as one key.
3. All leaves sit at the same depth — the tree is balanced by construction, without rotations.
4. `m` is chosen so a full node fills one page (or one cache line for an in-memory variant). This is the sizing decision the whole design turns on.

Search is a binary search within the current node, then a descent into the child whose range brackets the key, repeated until a leaf. Because `m` is large, the base of the logarithm is large, and the tree stays five to ten levels shallower than a binary tree over the same keys. PostgreSQL builds each node from one 8 KB page; SQLite stores an entire database file as B-trees, one page per node.

# Growing and shrinking by split and merge

Height changes only at the root, which is what keeps every leaf at equal depth without rotations.

An insert always lands in a leaf, in sorted position. If that leaf reaches `m` keys it **splits**: its median key moves up into the parent and the node becomes two half-full nodes. An overflowing parent splits the same way, so splits cascade upward along the search path; when the root itself splits, a new root is created and the tree gains one level.

A delete can leave a node below the `⌈m/2⌉−1` minimum. The repair mirrors the split. If an adjacent sibling has a spare key, the node **borrows** — the parent's separator rotates down and the sibling's key rotates up. If both siblings are minimal, the node **merges** with a sibling and the separating parent key into one node; merges cascade upward, and when the root empties the tree loses a level. Deleting from an internal node is first reduced to the leaf case by swapping the key with its in-order predecessor.

# Complexity

| Operation | Node accesses (I/O) | In-node work | Structure space | Aux space per op | Cause |
| --- | --- | --- | --- | --- | --- |
| Search | `O(log_m n)` page reads | `O(log₂ m)` binary search per node | `O(n)` | `O(1)` | height ≈ `log_m n`; each node visited is one page read |
| Insert | `O(log_m n)` reads, plus splits along the path | `O(m)` to shift keys and split a node | `O(n)` | `O(log_m n)` path | a full node splits and the median rises; the cascade is bounded by height |
| Delete | `O(log_m n)` reads, plus borrow or merge | `O(m)` to shift or fuse keys | `O(n)` | `O(log_m n)` path | an underflowing node borrows from or merges with a sibling up the path |

The decisive number in every row is the node-access column, because a node access is a page read and page reads dominate the cost of external memory. Search does the same `O(log₂ n)` key comparisons as a [[Binary Search Tree]] — a binary search inside each node makes the wide fan-out free on reads. The extra `O(m · log_m n)` cost falls on writes: an insert or delete shifts keys within a node and splits, borrows, or fuses nodes, and that data movement, not any comparison, is the `O(m)` per-node factor. The B-tree wins on I/O, never on CPU: it accepts more in-node work, all of it on data already in the page, in exchange for far fewer random reads. Structure space is `O(n)` with pages guaranteed at least half full by invariant 2, so an index occupies between `n` and `2n` slots.

# When block orientation stops paying off

Each boundary traces back to the page-sized node.

In pure memory there is no page to amortize. The `O(m)` linear or binary scan inside a wide node is pure overhead over a binary node's single comparison, so a [[Red-Black Tree]] or [[AVL Tree]] is simpler to implement and just as fast for RAM-resident data — the B-tree's advantage is I/O, and in RAM there is no I/O to save. The exception is a node sized to a cache line rather than a disk page: an order-eight B-tree can beat pointer-chasing binary trees on cache locality, which is why some in-memory engines still use one.

Writes rewrite whole pages. An insert that fills a page splits it, producing two page writes where a binary tree would flip a few pointers, and random-order insertion keeps triggering splits — sustained write amplification. Bulk-loading already-sorted keys sidesteps this by packing pages to near-100% before they are written, which is why databases build an index faster from sorted input than by inserting rows one at a time. Where writes dominate, the [[LSM-Tree]] is the write-optimized counterpart that attacks exactly this cost, trading read and space amplification for far higher write throughput.

The branching factor must be sized to the page. Choosing `m` too small shrinks fan-out toward a binary tree, so height climbs back toward `log₂ n` and the extra page reads return — the design's entire benefit is spent. `m` is effectively fixed by `page_size / (key_size + pointer_size)`, not chosen freely.

# Reference drawer

> [!ABSTRACT]- Structure and a split
> ```mermaid
> graph TD
>   subgraph after["after inserting into a full leaf"]
>     P2["parent: 17, 40"] --> A2["5, 9, 12"]
>     P2 --> B2["21, 33"]
>     P2 --> C2["45, 60"]
>   end
>   subgraph before["before: leaf 5,9,12,17,21,33 is full"]
>     P1["parent: 40"] --> A1["5, 9, 12, 17, 21, 33"]
>     P1 --> C1["45, 60"]
>   end
> ```
> The median `17` rises into the parent; the full node becomes two half-full nodes. An overflowing parent repeats the same move, and a splitting root adds the only new level.

> [!EXAMPLE]- Search and insert (C#, order-`m`)
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
>     private readonly int _m;                 // order: max children per node
>     private BTreeNode _root = new();
>
>     public BTree(int m) => _m = m;
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
>     // Insert descends to a leaf and splits any full node on the way down,
>     // so a split never has to propagate back up past a node already made safe.
>     // Split moves Keys[m/2] into the parent and divides the remaining keys
>     // and children between the two halves. Full body omitted; see references.
> }
> ```
> `BinarySearch` returns the bitwise complement of the insertion index on a miss, so `~i` is exactly the child pointer to follow. A production node is a serialized page, not a `List<int>`; the array layout is the same.

# Questions

> [!QUESTION]- How does a B-tree stay balanced with all leaves at one depth, and without rotations?
> Height changes only at the root. An overflowing node splits and pushes its median key into the parent; if the split cascades to the root, a new root adds a single level. Because growth happens only at the top and every split keeps both halves at least half full, all leaves remain at equal depth by construction.

> [!QUESTION]- What fixes a node that drops below its minimum fill on delete?
> If an adjacent sibling has a spare key, the node borrows: the parent's separator rotates down and the sibling's key rotates up. If both siblings are minimal, the node merges with a sibling and the separating parent key into one node, which can cascade upward and shrink the tree by a level.

# References

- [Bayer & McCreight, Organization and Maintenance of Large Ordered Indexes (1972)](https://doi.org/10.1007/BF00288683) — the original paper introducing the structure and its page-oriented split/merge maintenance.
- [SQLite database file format — B-tree pages](https://www.sqlite.org/fileformat2.html#b_tree_pages) — precise on-disk layout of B-tree and B+-tree pages; the clearest concrete "node = page" walkthrough.
- [PostgreSQL nbtree README](https://github.com/postgres/postgres/blob/master/src/backend/access/nbtree/README) — production notes on the Lehman–Yao variant Postgres ships: sibling links, page splits, and concurrency on real page-sized nodes.
- [PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html) — index-type overview showing the default B-tree access method in context.
