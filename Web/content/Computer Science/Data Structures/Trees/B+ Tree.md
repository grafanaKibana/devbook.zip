---
publish: true
created: 2026-07-11T12:15:24.038Z
modified: 2026-07-11T12:15:24.038Z
published: 2026-07-11T12:15:24.038Z
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

A disk-resident index holds millions of ordered records and must answer two shapes of query cheaply: "find key `K`" and "read every key between `A` and `B` in order." A plain [[B-tree]] answers the point lookup in a handful of page reads, but the range query forces an in-order traversal that repeatedly climbs back into internal nodes to find the next key — random I/O proportional to the levels crossed, not to the rows returned.

The B+ tree is the [[B-tree]] variant that reshapes the node layout for exactly that second query. Every `(key, value)` pair moves down to the leaves; internal nodes keep only keys, acting as a routing index whose separators point to the child subtree that owns a range. A separator can equal a key still living in a leaf — it is a signpost, not the record. Then the leaves are chained into a linked list (next, usually also previous), so once a descent lands on the first matching leaf, the scan walks the chain sequentially in key order without touching an internal node again.

Because internal nodes carry no values, each routing page packs far more separators than a leaf packs records. Fan-out rises, the tree gets even shallower than a B-tree over the same data, and the routing levels tend to stay cached in the buffer pool. This is the structure that RDBMS indexes and filesystem B-trees actually ship.

**Core shape:** all `(key, value)` pairs in the leaves → internal nodes are a routing key index → leaves linked in sorted order → one descent then a sequential leaf walk answers a range → `O(n)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a tree card showing internal nodes holding only routing keys, all values living in the leaves, and the leaves chained left-to-right so a range scan walks the leaf list after a single descent. No matching renderer exists in `engine.js` yet.

## Representation

Two node kinds share one page-sized layout:

- An **internal node** holds `k` separator keys and `k + 1` child pointers. Separator `s_i` guarantees every key in child `i` is `< s_i` and every key in child `i + 1` is `>= s_i`. It stores no values and no leaf-record pointers.
- A **leaf node** holds the actual `(key, value)` entries (or, for a non-clustered index, the key plus a row pointer) in sorted order, plus a `next` pointer to its right sibling and typically a `prev` pointer to its left one.

Three invariants define a valid state:

1. All leaves sit at the same depth; every search path has identical length.
2. A separator in an internal node may duplicate a key held in some leaf. The internal copy exists only to route the descent; deleting the leaf record does not require removing the separator, so a routing key can outlive its value.
3. The leaf chain is a total order: following `next` from the leftmost leaf visits every key in ascending order exactly once.

A point lookup compares against separators to pick a child at each level and always continues to a leaf, because that is the only place a value exists. A range scan `[A, B]` descends once to the leaf holding `A`, reads forward within the leaf, then follows `next` pointers until a key exceeds `B`. The descent cost is the tree height; the walk cost is proportional only to the number of matching entries.

## Complexity

Bounds are counted in page I/Os with `m` the node fan-out (keys per page), which is large for disk pages, so the tree is shallow. `k` is the number of entries a range scan returns.

| Operation | Time (page I/Os) | Structure space | Cause |
| --- | --- | --- | --- |
| Search (point lookup) | `O(log_m n)` | `O(n)` | One descent to a leaf; internal levels usually cache-resident. |
| Insert | `O(log_m n)` | `O(n)` | Descend to a leaf, insert in order, split and push a separator up on overflow. |
| Delete | `O(log_m n)` | `O(n)` | Descend to a leaf, remove, borrow or merge with a sibling on underflow. |
| Range scan `[A, B]` | `O(log_m n + k)` | `O(n)` | One descent finds `A`, then `k` entries are read by following leaf `next` links — no re-ascent per key. |
| Ordered full scan | `O(log_m n + n)` | `O(n)` | Descend to the leftmost leaf, then walk the entire chain sequentially. |

The `+ k` term is the whole point: the range scan pays the tree height once and then reads matches as a sequential walk of the linked leaves, so cost tracks result size rather than tree structure. A B-tree lacking leaf links pays roughly `O(k log_m n)` for the same range because it re-descends to locate each successor. High fan-out keeps `log_m n` at two to four levels for realistic table sizes, and the top levels stay in memory, so an isolated lookup often costs a single leaf read.

## Boundaries

A point lookup **always** reaches a leaf. A plain [[B-tree]] can find its value at an internal node and stop one or more levels early; the B+ tree cannot, because internal nodes hold no values. The trade is a slightly deeper worst-case path for a single key in exchange for uniform lookup latency — every key costs one full descent — and the cheap range scans the design exists to provide. Because the routing level is smaller and usually cached, the extra descent rarely translates into extra physical I/O.

Leaf-link maintenance rides on top of the ordinary split and merge logic. When a leaf splits, the new leaf must be stitched into the chain: the original leaf's `next` is repointed at the new leaf, and the new leaf's `next` inherits the old target (and the reverse pointers updated when the list is doubly linked). A merge does the mirror — the survivor absorbs the neighbor's entries and relinks past the removed node. Getting this relinking wrong corrupts ordered iteration without breaking point lookups, so the defect can hide until a range scan skips or repeats a run of keys.

The same page-sizing constraint as a [[B-tree]] applies: node capacity is chosen so a node fills one storage page. Oversized keys or values lower fan-out, raise the tree, and erode the shallow-tree advantage. Variable-length keys and prefix compression in real implementations exist to keep separators small and fan-out high.

## Reference drawer

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
>
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
>
> Insert and delete (leaf overflow splits, underflow merges, and the `Next` relinking each performs) are omitted; `Range` shows the invariant that makes the structure worthwhile — after `DescendToLeaf` it never returns to an internal node.

## Comparison

Alternatives for the same ordered on-disk index workload:

| Structure | Point lookup | Range / ordered scan | Write cost | Ordering retained | Stronger case |
| --- | --- | --- | --- | --- | --- |
| B+ tree | `O(log_m n)`, always to a leaf | `O(log_m n + k)` sequential leaf walk | In-place, split/merge on overflow | Full sorted order via leaf chain | Range queries and ordered scans over disk-resident data |
| [[B-tree]] | `O(log_m n)`, may stop early at an internal node | `O(k log_m n)`, re-descends per successor | In-place, split/merge on overflow | Sorted, but no leaf links | Point-lookup-dominant workloads, often in memory |
| LSM-tree | `O(log n)` across levels, bloom-filtered | Merge sorted runs; scan spans levels | Buffered sequential appends, background compaction | Sorted within runs, merged on read | Write-heavy ingestion where sequential writes beat in-place updates |
| Hash index | `O(1)` average, `O(n)` worst | Not supported — no order | In-place bucket write | None | Exact-match lookups where range and ordering are irrelevant |

The B+ tree is the default for range queries and disk-backed indexes — RDBMS primary and secondary indexes, filesystem directory and extent trees — because its linked leaves turn a range or ordered scan into a sequential walk that a plain [[B-tree]] cannot match. A plain [[B-tree]] is competitive, and its early-exit lookups are marginally cheaper, when only point lookups matter and the tree lives in memory. An LSM-tree wins when the workload is write-heavy and turning random in-place updates into sequential appends is worth the extra read-side merge. A hash index is faster still for a lone exact match but forfeits every ordered operation. The [[Binary Search Tree]] family answers the same ordered queries in memory but with a fan-out of two, so it is far too tall for page-oriented storage.

## Questions

> [!QUESTION]- What two structural changes turn a B-tree into a B+ tree, and which query do they serve?
> All `(key, value)` pairs move to the leaves, leaving internal nodes as a pure routing key index, and the leaves are chained into a sorted linked list. Both changes serve the range scan: after one descent, matching keys are read by walking the leaf chain in order instead of re-ascending into internal nodes.

> [!QUESTION]- Why does a B+ point lookup always reach a leaf while a B-tree lookup can stop early?
> A B-tree stores values in internal nodes too, so a key found on the way down returns immediately. A B+ tree's internal nodes hold only separators, so a value exists only in a leaf and every lookup pays a full descent. The trade buys uniform latency and cheap ordered scans.

> [!QUESTION]- Why is a B+ range scan `O(log_m n + k)` rather than `O(k log_m n)`?
> The `log_m n` descent locates the first matching leaf once. From there the leaf `next` links yield the remaining `k` entries in order as a sequential walk, adding one term per result. Without leaf links, each successor would require its own descent, multiplying the height into the cost.

> [!QUESTION]- Why does removing internal values raise fan-out, and why does that help on disk?
> A separator is just a key and a child pointer, far smaller than a full record, so a routing page packs many more entries. Higher fan-out means fewer levels, and the small routing levels tend to stay in the buffer pool, so a lookup often costs a single physical read of the leaf.

## References

- Comer, [The Ubiquitous B-Tree (1979)](https://doi.org/10.1145/356770.356776) — the survey that canonically defines the B+ variant, its leaf-only data placement, and the leaf-chain design.
- [MySQL InnoDB Index Types](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html) — clustered primary-key and secondary index behavior, with rows stored in the clustered leaf level.
- [SQL Server clustered and nonclustered index architecture](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-index-design-guide) — page-level B-tree layout, doubly linked leaf pages, and the clustered-vs-nonclustered leaf contents.
- [PostgreSQL B-Tree indexes](https://www.postgresql.org/docs/current/btree.html) — the Lehman–Yao access method with right-sibling links on every level that lets it scan ranges like a B+ tree.
- [Use the Index, Luke — Anatomy of an SQL Index](https://use-the-index-luke.com/sql/anatomy) — a database-agnostic walkthrough of leaf chains and why range scans read sequentially.
