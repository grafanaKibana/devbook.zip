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
status: Done
---

# Intro

A data structure organizes data for efficient access, mutation, and iteration. In .NET, the standard library provides production-ready implementations of the most common structures — `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `SortedSet<T>`, and `PriorityQueue<TElement, TPriority>`. Choosing the right collection usually has a bigger impact on performance than micro-optimizing the code that uses it.

The key decision is matching operations to complexity guarantees: random access by index → array or `List<T>`; fast lookup by key → `Dictionary<TKey, TValue>`; membership tests → `HashSet<T>`; ordered traversal → `SortedSet<T>` or sorted array; FIFO processing → `Queue<T>`. Most production performance issues with collections come from using the wrong structure (e.g., searching a `List<T>` linearly when a `HashSet<T>` gives O(1) lookups) rather than from the structure's implementation being slow.

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

- [System.Collections.Generic namespace](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic)
- [Collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [Anatomy of the .NET dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/)
