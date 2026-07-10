---
topic:
  - Computer Science
subtopic:
  - Data Structures
tags:
  - FolderNote
publish: true
level:
  - '4'
priority: High
status: Done
---

# Intro

A data structure organizes data for efficient access, mutation, and iteration. In .NET, the standard library provides production-ready implementations of the most common structures — `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `SortedSet<T>`, and `PriorityQueue<TElement, TPriority>`. Choosing the right collection usually has a bigger impact on performance than micro-optimizing the code that uses it.

The key decision is matching operations to complexity guarantees: random access by index → array or `List<T>`; fast lookup by key → `Dictionary<TKey, TValue>`; membership tests → `HashSet<T>`; ordered traversal → `SortedSet<T>` or sorted array; FIFO processing → `Queue<T>`. Most production performance issues with collections come from using the wrong structure (e.g., searching a `List<T>` linearly when a `HashSet<T>` gives O(1) lookups) rather than from the structure's implementation being slow.

## Example

```csharp
var byId = new Dictionary<int, string>
{
    [42] = "Ann"
};

var ordered = new List<string> { "Ann", "Bob" };

Console.WriteLine(byId[42]); // Fast lookup by key
Console.WriteLine(ordered[0]); // Fast lookup by index
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

## Links

- [[Trees]]
- [[Dynamic Array]]
- [[Stack]]
- [[Queue]]
- [[LinkedList]]
- [[Circular Buffer]]
- [[Span]]
- [[HashMap]]
- [[Hash Set]]
- [[Bloom Filter]]
- [[Graph]]
- [[Disjoint Set]]
- [[LRU Cache]]

## Suggested Groups

- **Linear structures** - arrays, dynamic arrays, linked lists, stacks, queues, deques, circular buffers, and spans belong together because they model ordered sequences.
- **Hash-based structures** - hash maps, hash sets, and Bloom filters share the same core mechanism: hash distribution and membership/lookup tradeoffs.
- **Graph structures** - graphs and disjoint sets belong near each other because both answer relationship/connectivity questions.
- **Composite structures** - LRU cache belongs here because it combines a hash map with a linked list to get O(1) lookup plus O(1) recency updates.
- **Index structures** - B-trees, B+ trees, and tries may eventually deserve their own group if the vault grows around database/file-system/search indexes.
- **Probabilistic structures** - [[Bloom Filter]] could split from hashing later if sketches, HyperLogLog, count-min sketch, or Cuckoo filters are added.
- **Priority structures** - heap-like structures are currently under [[Trees]] because the invariants are tree-shaped; split them only if priority queues become their own study track.

## References

- [System.Collections.Generic namespace](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic)
- [Collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [Anatomy of the .NET dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/)
