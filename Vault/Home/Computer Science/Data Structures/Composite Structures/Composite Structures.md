---
topic:
  - Computer Science
subtopic:
  - Data Structures
tags:
  - FolderNote
level:
  - "4"
status: Not-Started
publish: false
priority: High
---

# Intro

Composite structures combine simpler structures to get a behavior neither one gives alone. They are useful study targets because the implementation is usually the point: the asymptotic guarantee comes from making two structures maintain the same invariant.

`LRU Cache` is the current example. It combines a hash map for O(1) key lookup with a linked list for O(1) recency updates.

## Links

- [[LRU Cache]]

## References

- [OrderedDictionary<TKey,TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.ordereddictionary-2) - .NET ordered key-value collection; useful contrast with a custom LRU cache.
