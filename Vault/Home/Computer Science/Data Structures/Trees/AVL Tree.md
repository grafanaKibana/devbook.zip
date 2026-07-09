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

An AVL tree is a self-balancing binary search tree that keeps subtree heights within one level. Fill this note with rotation cases, the balance factor invariant, and the read-heavy tradeoff versus red-black trees.

## Questions

> [!QUESTION]- Why can AVL reads be faster than red-black reads?
> AVL trees keep a stricter height bound, so searches often traverse fewer levels, at the cost of more rotations during writes.

## References

- [Sorted collection types](https://learn.microsoft.com/en-us/dotnet/standard/collections/sorted-collection-types) - Microsoft overview of sorted collection choices in .NET.
