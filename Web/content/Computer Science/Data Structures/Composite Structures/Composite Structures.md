---
publish: true
created: 2026-07-11T18:22:51.593Z
modified: 2026-07-11T18:22:51.850Z
published: 2026-07-11T18:22:51.850Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Structures that combine two primitives to get a guarantee neither gives alone, kept in lockstep on every mutation.
level:
  - "4"
status: Not-Started
priority: High
---

# Intro

A composite structure combines two primitives to get a guarantee neither gives alone. The recipe is always the same: each primitive answers one question in O(1) or O(log n), and the implementation's job is keeping both in lockstep — every mutation updates both, or the structure silently corrupts. [[LRU Cache]] is the canonical case: a `Dictionary<TKey, Node>` answers "where is key k?" in O(1), a doubly linked `LinkedList<T>` answers "what's the eviction order?" in O(1), and the invariant is that every key in the map points at a live list node — [[LRU Cache]] shows exactly what breaks when it doesn't.

.NET ships one composite ready-made: `OrderedDictionary<TKey, TValue>` (.NET 9), hash lookup + insertion order. (`PriorityQueue<TElement, TPriority>` looks like a candidate but fails the membership test below — its guarantee comes from a single clever layout, an array with a heap invariant, so it lives with [[Heap|the heaps]].) When the combination you need isn't built in — LRU being the classic gap — you compose it yourself, which is why these structures dominate interviews: the design _is_ the answer.

<nav style="--map-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Composite Structures section map"><div class="folder-map-children"><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="LRU Cache">LRU Cache</span></span></div><p>A bounded cache that evicts the least-recently-used item in O(1) by pairing a hash map with a doubly linked list.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Composite Structures/LRU Cache.md" data-tooltip-position="top" aria-label="LRU Cache">LRU Cache</a></span></article></div><style>
.folder-structure-map {
  --map-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  /* Flex (not grid) so each card sizes to its own title — a long title widens
     its card and pushes to another row instead of being truncated, and rows
     grow to fill the width with no empty tracks when there are few cards. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  position: relative;
  /* No overflow:hidden here: on a flex item that collapses min-width:auto to 0,
     letting the card shrink below its title + note-count and clip them. Without
     it, the card's min size is its content, so long titles widen the card (and
     wrap to another row) instead of being cut off. The accent gradient gets its
     own border-radius below to stay inside the rounded corners. */
  flex: 1 1 12rem;
  min-height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.folder-map-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--map-accent), 0.09) 0%,
    rgba(var(--map-accent), 0.04) 38%,
    rgba(var(--map-accent), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.folder-map-node:hover,
.folder-map-node:focus-within {
  border-color: rgba(var(--map-accent), 0.55);
  background-color: color-mix(in srgb, rgb(var(--map-accent)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.folder-map-node:hover::before,
.folder-map-node:focus-within::before {
  opacity: 1;
}
.folder-map-node-body {
  position: relative;
  z-index: 0;
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.75rem;
}
.folder-map-node-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.folder-map-node-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.folder-map-entry-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--map-accent));
}
.folder-map-entry-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.folder-map-node-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.folder-map-node p {
  display: none;
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
.folder-map-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.folder-map-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.folder-map-hit a:focus-visible {
  outline: 2px solid rgb(var(--map-accent));
  outline-offset: -0.3rem;
}
.folder-map-empty {
  margin: 1rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
  .folder-map-node {
    min-height: 6rem;
  }
  .folder-map-node-body {
    min-height: 6rem;
    justify-content: flex-start;
    padding: 0.85rem 0.9rem;
  }
  .folder-map-node p { display: block; }
}
@container folder-map (min-width: 64rem) {
  .folder-map-node,
  .folder-map-node-body { min-height: 6.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .folder-map-node { transition: none; }
  .folder-map-node::before { transition: none; }
  .folder-map-node:hover,
  .folder-map-node:focus-within { transform: none; }
}
</style></nav>

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
