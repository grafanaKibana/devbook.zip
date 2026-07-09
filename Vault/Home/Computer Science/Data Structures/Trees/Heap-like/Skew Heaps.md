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

A skew heap is a self-adjusting mergeable heap with no explicit rank or null path metadata. Fill this note with merge-by-swapping children and the amortized cost tradeoff versus leftist heaps.

## Questions

> [!QUESTION]- Why is a skew heap simpler than a leftist heap?
> It avoids storing null path lengths and relies on unconditional child swaps during meld to self-adjust over time.

## References

- [PriorityQueue<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) - practical .NET baseline to contrast against pointer-based mergeable heaps.
