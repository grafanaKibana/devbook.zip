---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "How to pick a data structure by matching operations to complexity, with the .NET type for each."
tags: [FolderNote]
publish: true
level:
  - "4"
priority: High
status: Creation
---

A data structure decides which operations are cheap and which are expensive. .NET already supplies the common choices through types such as `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`, `Queue<T>`, and `PriorityQueue<TElement, TPriority>`. Collection choice usually changes performance more than tuning the loop around a poor choice.

The workload picks the structure. Positional access points to an array or `List<T>`. Key lookup points to `Dictionary<TKey, TValue>`, membership to `HashSet<T>`, and FIFO work to `Queue<T>`. Ordered traversal may need a `SortedSet<T>` or a sorted array, depending on how often the data changes. A repeated linear scan over a `List<T>` is usually a representation problem, not a slow implementation of `List<T>`.

# Choose by Workload and Access Pattern

Start from the operation that dominates the workload, then account for ordering, memory layout, and concurrency. A structure with the right asymptotic lookup can still lose when it adds indirection to a small, scan-heavy collection.

| Workload | Default structure | What it buys | Cost or boundary |
| --- | --- | --- | --- |
| Dense positional access and iteration | Array or `List<T>` | O(1) indexing and contiguous storage | Middle insertions shift elements |
| Key-to-value lookup | `Dictionary<TKey, TValue>` | Expected O(1) lookup by a stable key | Hashing, resizing, and no sorted traversal |
| Membership and set algebra | `HashSet<T>` | Expected O(1) containment. Linear-time set algebra over the participating inputs | Stores no associated value or order. Collision patterns affect worst-case lookup cost |
| FIFO work | `Queue<T>` or `Channel<T>` | Preserves arrival order. A bounded channel in `Wait` mode adds asynchronous coordination and backpressure | Unbounded channels do not apply backpressure. Bounded drop modes discard or replace items instead of waiting |
| Repeated minimum or maximum selection | `PriorityQueue<TElement, TPriority>` | O(1) peek and O(log n) enqueue/dequeue | Iteration is not globally sorted |
| Ordered range queries | Sorted array or balanced tree | Binary search or ordered traversal | Updates are expensive in arrays. Trees add pointer overhead |
| Prefix lookup | Trie | Work scales with key length rather than entry count | High node and reference overhead |
| Relationships and paths | Graph adjacency list | Stores sparse edges without an `n × n` matrix | Traversal needs visited-state and cycle handling |
| Adaptive spatial range or nearest-neighbor queries | [[Home/Computer Science/Data Structures/Trees/Quadtree|Quadtree]], R-tree, or spatial database index | Prunes regions that cannot intersect the query | Choice depends on data distribution and persistence model |
| Spatial candidates on a one-dimensional index | [[Home/Computer Science/Data Structures/Geohash|Geohash]] | Turns fixed-grid cells into sortable prefixes | Adjacent points can cross a prefix boundary. Exact filtering is still required |
| Cheap negative membership tests | Bloom filter | Avoids expensive downstream lookups with compact state | False positives are possible. Deletions need a variant |

![[Computer Science/Computer Science-Data Structures-18120000.png]]

The visual is an example inventory, not a selector. The table above is authoritative because the same structure can be right or wrong depending on the dominant operation and storage boundary.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [Collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
