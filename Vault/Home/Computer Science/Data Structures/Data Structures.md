---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "How to pick a data structure by matching operations to complexity, with the .NET type for each."
tags:
  - FolderNote
publish: true
level:
  - '4'
priority: High
status: Creation
---

# Intro

A data structure organizes data for efficient access, mutation, and iteration. In .NET, the standard library provides production-ready implementations of the most common structures — `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `SortedSet<T>`, and `PriorityQueue<TElement, TPriority>`. Choosing the right collection usually has a bigger impact on performance than micro-optimizing the code that uses it.

The key decision is matching operations to complexity guarantees: random access by index → array or `List<T>`; fast lookup by key → `Dictionary<TKey, TValue>`; membership tests → `HashSet<T>`; ordered traversal → `SortedSet<T>` or sorted array; FIFO processing → `Queue<T>`. Most production performance issues with collections come from using the wrong structure (for example, searching a `List<T>` linearly when a `HashSet<T>` gives expected O(1) lookups) rather than from the structure's implementation being slow.

## Choose by workload and access pattern

Start from the operation that dominates the workload, then account for ordering, memory layout, and concurrency. A structure with the right asymptotic lookup can still lose when it adds indirection to a small, scan-heavy collection.

| Workload | Default structure | What it buys | Cost or boundary |
| --- | --- | --- | --- |
| Dense positional access and iteration | Array or `List<T>` | O(1) indexing and contiguous storage | Middle insertions shift elements |
| Key-to-value lookup | `Dictionary<TKey, TValue>` | Expected O(1) lookup by a stable key | Hashing, resizing, and no sorted traversal |
| Membership and set algebra | `HashSet<T>` | Expected O(1) containment; linear-time set algebra over the participating inputs | Stores no associated value or order; collision patterns affect worst-case lookup cost |
| FIFO work | `Queue<T>` or `Channel<T>` | Preserves arrival order; channels add asynchronous coordination and backpressure | No arbitrary indexed access |
| Repeated minimum or maximum selection | `PriorityQueue<TElement, TPriority>` | O(1) peek and O(log n) enqueue/dequeue | Iteration is not globally sorted |
| Ordered range queries | Sorted array or balanced tree | Binary search or ordered traversal | Updates are expensive in arrays; trees add pointer overhead |
| Prefix lookup | Trie | Work scales with key length rather than entry count | High node and reference overhead |
| Relationships and paths | Graph adjacency list | Stores sparse edges without an `n × n` matrix | Traversal needs visited-state and cycle handling |
| Adaptive spatial range or nearest-neighbor queries | [[Home/Computer Science/Data Structures/Trees/Quadtree|Quadtree]], R-tree, or spatial database index | Prunes regions that cannot intersect the query | Choice depends on data distribution and persistence model |
| Spatial candidates on a one-dimensional index | [[Home/Computer Science/Data Structures/Geohash|Geohash]] | Turns fixed-grid cells into sortable prefixes | Adjacent points can cross a prefix boundary; exact filtering is still required |
| Cheap negative membership tests | Bloom filter | Avoids expensive downstream lookups with compact state | False positives are possible; deletions need a variant |

![[System Design 101/8a0c70e1d4676bdc7f8f4e72bb90ce831a1d0c9fc3dd09c4a58e7d71a4897b3c.png]]

The visual is an example inventory, not a selector. The table above is authoritative because the same structure can be right or wrong depending on the dominant operation and storage boundary.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Questions

> [!QUESTION]- What is a data structure? Which ones do you know? Which of them exist in .NET?
> A data structure is a way to organize related data into a collection-like object. Examples include arrays, lists, queues, stacks, linked lists, dictionaries/hash tables, hash sets, graphs, and trees. .NET provides built-in implementations for many of these (for example `Array`, `List<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`).

> [!QUESTION]- How do you choose between `List<T>`, `Dictionary<TKey, TValue>`, and `HashSet<T>`?
> Use `List<T>` when you need ordered, index-based access and the primary operations are iteration or positional lookup. Use `Dictionary<TKey, TValue>` when you need fast lookup, insertion, and deletion by a unique key. Use `HashSet<T>` when you only need membership testing and set operations (union, intersection, difference) without associated values.
> The wrong choice shows up as O(n) scans that should be O(1) lookups.

> [!QUESTION]- Why does collection choice matter more than micro-optimization?
> Switching from O(n) linear search to O(1) hash lookup reduces work by orders of magnitude at scale. No amount of loop unrolling or SIMD on the O(n) path matches that.
> Focus on algorithmic complexity first, then optimize constant factors within the chosen structure if profiling shows it matters.

> [!QUESTION]- When would you use `LinkedList<T>` over `List<T>` in .NET?
> Almost never in practice. `List<T>` (backed by a contiguous array) has better cache locality, lower memory overhead per element, and faster iteration. `LinkedList<T>` only wins when you need frequent insertions/deletions in the middle of a very large collection and already hold a reference to the node.
> In most .NET code, `List<T>` is the correct default.

## References

- [System.Collections.Generic namespace](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic) — primary .NET API contracts for generic lists, dictionaries, sets, queues, stacks, linked lists, and priority queues.
- [Collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/) — official .NET guidance on collection characteristics, generic versus non-generic APIs, and selecting a collection by operation.
- [ByteByteGo System Design 101 — 10 data structures used every day](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/10-key-data-structures-we-use-every-day.md) — editorial inventory behind the embedded visual; selection guidance above is derived from each structure's operation model.
- [Anatomy of the .NET dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/) — implementation-focused secondary walkthrough of buckets, entries, hashing, collisions, and resizing in `Dictionary<TKey, TValue>`.
