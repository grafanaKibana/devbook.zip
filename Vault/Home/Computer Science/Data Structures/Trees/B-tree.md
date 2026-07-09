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

A B-tree is a high fan-out search tree tuned for storage pages rather than CPU pointers. Fill this note with page-sized nodes, split/merge mechanics, and why databases prefer shallow trees over binary search trees on disk.

## Questions

> [!QUESTION]- Why do databases use B-trees instead of plain binary search trees?
> A B-tree reads many keys per page, reducing random disk or SSD page reads because the tree is much shallower.

## References

- [PostgreSQL indexes](https://www.postgresql.org/docs/current/indexes.html) - index overview, including the default B-tree index type.
