---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "Structures that combine two primitives to get a guarantee neither gives alone."
tags: [FolderNote]
level:
  - "4"
status: Creation
publish: true
priority: High
---

A composite structure keeps the same logical entries in two coordinated representations. Each representation makes a different operation cheap. Every mutation must update both. [[LRU Cache]] is the standard example. A `Dictionary<TKey, Node>` finds key `k` in expected O(1), while a doubly linked `LinkedList<T>` exposes the eviction order in O(1). The shared invariant is simple: every map entry points at a live list node. [[LRU Cache]] shows what fails when the two views disagree.

`OrderedDictionary<TKey, TValue>` in .NET 9 is one built-in example: hash lookup paired with insertion order. `PriorityQueue<TElement, TPriority>` does not meet the membership test below because one array with a heap invariant provides its behavior, so it belongs with [[Heap|the heaps]]. LRU remains a common hand-built composite because the standard collections supply its parts but not the lockstep policy.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# What Belongs Here

Membership test: the structure's headline guarantee comes from coordinating two simpler structures, not from a single clever layout. Today the folder has one note. Candidates for future notes follow the same pattern:

| Structure | Composition | Combined guarantee |
|---|---|---|
| [[LRU Cache]] | HashMap + doubly linked list | O(1) lookup **and** O(1) recency eviction |
| LFU cache | HashMap + frequency-bucketed lists | O(1) lookup and O(1) least-*frequently*-used eviction |
| Indexed priority queue | Heap + position map | O(log n) pop **and** O(log n) decrease-key by handle (Dijkstra's missing piece) |
| Insertion-ordered map | HashMap + list (`OrderedDictionary`) | O(1) lookup and deterministic iteration order (removal is O(n) — the ordered array shifts) |

A plain `Dictionary` or a lone `Stack<T>` belongs with its own family. A structure belongs here when its main guarantee disappears if either constituent representation is removed.

# References

- [OrderedDictionary<TKey,TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.ordereddictionary-2)
