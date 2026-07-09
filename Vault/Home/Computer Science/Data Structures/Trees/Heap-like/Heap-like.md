---
topic:
  - Computer Science
subtopic:
  - Data Structures
tags:
  - FolderNote
level:
  - "4"
priority: Medium
status: Not-Started
publish: false
---

# Intro

Heap-like structures keep the "best" priority item cheap to find, but differ in how they handle merging, decrease-key, and pointer-heavy workloads. A binary or d-ary heap is the .NET default because it is array-backed and cache-friendly; binomial, Fibonacci, leftist, and skew heaps matter when meld or amortized decrease-key dominates.

## Links

- [[Heap]]
- [[Binomial Queues]]
- [[Fibonacci Heaps]]
- [[Leftist Heaps]]
- [[Skew Heaps]]

## References

- [PriorityQueue<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) - .NET's array-backed priority queue implementation surface.
