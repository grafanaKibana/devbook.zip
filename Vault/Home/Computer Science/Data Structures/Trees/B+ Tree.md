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

A B+ tree keeps records or record pointers in the leaves and uses internal nodes as routing pages. Fill this note with leaf chaining, range scan behavior, and the difference from a B-tree.

## Questions

> [!QUESTION]- Why is a B+ tree good for range scans?
> Once the first leaf is found, adjacent leaves can be scanned in key order without walking back up the tree.

## References

- [MySQL InnoDB indexes](https://dev.mysql.com/doc/refman/en/innodb-index-types.html) - practical B-tree/B+ tree-style clustered and secondary index behavior.
