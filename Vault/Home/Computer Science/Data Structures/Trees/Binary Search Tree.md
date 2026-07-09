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

A binary search tree stores ordered keys so every left subtree is smaller than the node and every right subtree is larger. Fill this note with the invariant, search/insert/delete mechanics, and the sorted-input degeneration case.

## Questions

> [!QUESTION]- What breaks when a binary search tree receives already-sorted input?
> Without balancing, it degenerates into a linked list and lookup drops from O(log n) expected height to O(n).

## References

- [SortedSet<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedset-1) - .NET's production self-balancing ordered set; useful contrast with a naive BST.
