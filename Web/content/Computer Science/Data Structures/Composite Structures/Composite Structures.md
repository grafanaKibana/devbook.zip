---
publish: true
created: 2026-07-10T14:39:34.297Z
modified: 2026-07-10T14:39:34.297Z
published: 2026-07-10T14:39:34.297Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
status: Not-Started
priority: High
---

# Intro

A composite structure combines two primitives to get a guarantee neither gives alone. The recipe is always the same: each primitive answers one question in O(1) or O(log n), and the implementation's job is keeping both in lockstep — every mutation updates both, or the structure silently corrupts. [[LRU Cache]] is the canonical case: a `Dictionary<TKey, Node>` answers "where is key k?" in O(1), a doubly linked `LinkedList<T>` answers "what's the eviction order?" in O(1), and the invariant is that every key in the map points at a live list node — [[LRU Cache]] shows exactly what breaks when it doesn't.

.NET ships one composite ready-made: `OrderedDictionary<TKey, TValue>` (.NET 9), hash lookup + insertion order. (`PriorityQueue<TElement, TPriority>` looks like a candidate but fails the membership test below — its guarantee comes from a single clever layout, an array with a heap invariant, so it lives with [[Heap|the heaps]].) When the combination you need isn't built in — LRU being the classic gap — you compose it yourself, which is why these structures dominate interviews: the design _is_ the answer.

## What Belongs Here

Membership test: the structure's headline guarantee comes from coordinating two simpler structures, not from a single clever layout. Today the folder has one note; candidates for future notes follow the same pattern:

| Structure | Composition | Combined guarantee |
|---|---|---|
| [[LRU Cache]] | HashMap + doubly linked list | O(1) lookup **and** O(1) recency eviction |
| LFU cache | HashMap + frequency-bucketed lists | O(1) lookup and O(1) least-_frequently_-used eviction |
| Indexed priority queue | Heap + position map | O(log n) pop **and** O(log n) decrease-key by handle (Dijkstra's missing piece) |
| Insertion-ordered map | HashMap + list (`OrderedDictionary`) | O(1) lookup and deterministic iteration order (removal is O(n) — the ordered array shifts) |

A plain `Dictionary` or a lone `Stack<T>` doesn't belong here — those live with their families. The tell is the sentence "X alone can't do it, and Y alone can't either."

## References

- [OrderedDictionary\<TKey,TValue> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.ordereddictionary-2) — .NET 9's built-in hash-map-plus-order composite; documents the per-operation costs of the hash + ordered-array pairing (O(1) lookup, O(n) removal).
- [LRU Cache (LeetCode #146)](https://leetcode.com/problems/lru-cache/) — the exercise that makes the lockstep invariant concrete; the classic failure is desynchronized map/list state.
