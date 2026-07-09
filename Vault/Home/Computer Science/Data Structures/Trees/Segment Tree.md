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

A segment tree stores aggregate values over intervals so range queries and point updates both stay O(log n). Fill this note with the array layout, merge function, and range-sum/range-min examples.

## Questions

> [!QUESTION]- When is a segment tree a better fit than prefix sums?
> When the underlying values change and you need both updates and range queries after those updates.

## References

- [Segment tree](https://cp-algorithms.com/data_structures/segment_tree.html) - detailed construction and query/update mechanics.
