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

A red-black tree is a self-balancing binary search tree that uses node colors and rotation rules to keep height logarithmic. Fill this note with the color invariants and why `SortedSet<T>`/`SortedDictionary<TKey, TValue>` use this shape.

## Questions

> [!QUESTION]- What does the red-black invariant buy you?
> It prevents the tree from becoming tall enough to turn ordered lookup into a linear scan, while using fewer rotations than stricter balancing schemes.

## References

- [SortedSet<T> source](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/src/System/Collections/Generic/SortedSet.cs) - .NET runtime implementation of a red-black tree-backed set.
