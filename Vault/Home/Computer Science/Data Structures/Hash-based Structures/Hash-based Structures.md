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

Hash-based structures use a hash function to map a key or value into a bucket. The shared mechanism is not "constant time" by magic; it is distribution. Good hash distribution keeps buckets short, so lookup and insertion are near O(1) on average. Bad distribution collapses the structure toward linear scans.

Use this group for structures where hashing is the main access path or membership test. `HashMap` associates keys with values, `Hash Set` stores only membership, and `Bloom Filter` trades exactness for compact probabilistic membership checks.

## Links

- [[HashMap]]
- [[Hash Set]]
- [[Bloom Filter]]

## References

- [Dictionary<TKey,TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2) - .NET hash table-backed key-value collection.
- [HashSet<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1) - .NET hash-based set collection.
