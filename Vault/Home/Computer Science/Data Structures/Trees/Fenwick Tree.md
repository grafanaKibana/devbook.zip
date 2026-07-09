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

A Fenwick tree, or binary indexed tree, stores partial sums in an array using bit arithmetic. Fill this note with `i += i & -i`, `i -= i & -i`, and the point-update/range-prefix query contract.

## Questions

> [!QUESTION]- What does `i & -i` select in a Fenwick tree?
> It selects the least significant set bit, which gives the size of the range represented by that array slot.

## References

- [Fenwick tree](https://cp-algorithms.com/data_structures/fenwick.html) - compact explanation of prefix queries and updates.
