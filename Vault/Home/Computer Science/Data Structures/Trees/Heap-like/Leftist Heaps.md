---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Not-Started
publish: false
---

# Intro

A leftist heap is a mergeable heap that biases short paths to the right, making meld the primitive operation. Fill this note with null path length, merge recursion, and when it beats an array heap.

## Questions

> [!QUESTION]- What invariant does a leftist heap maintain?
> The left child has a null path length at least as large as the right child, keeping the right spine short for efficient merging.

## References

- [PriorityQueue<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) - practical .NET baseline to contrast against pointer-based mergeable heaps.
