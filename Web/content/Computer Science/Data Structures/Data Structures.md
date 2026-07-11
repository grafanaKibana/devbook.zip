---
publish: true
created: 2026-07-11T17:05:06.473Z
modified: 2026-07-11T17:23:15.716Z
published: 2026-07-11T17:23:15.716Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: High
status: Done
---

# Intro

A data structure organizes data for efficient access, mutation, and iteration. In .NET, the standard library provides production-ready implementations of the most common structures — `List<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `SortedSet<T>`, and `PriorityQueue<TElement, TPriority>`. Choosing the right collection usually has a bigger impact on performance than micro-optimizing the code that uses it.

The key decision is matching operations to complexity guarantees: random access by index → array or `List<T>`; fast lookup by key → `Dictionary<TKey, TValue>`; membership tests → `HashSet<T>`; ordered traversal → `SortedSet<T>` or sorted array; FIFO processing → `Queue<T>`. Most production performance issues with collections come from using the wrong structure (e.g., searching a `List<T>` linearly when a `HashSet<T>` gives O(1) lookups) rather than from the structure's implementation being slow.

<nav style="--map-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Data Structures section map"><div class="folder-map-children"><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Composite Structures">Composite Structures</span></span><span class="folder-map-node-count">1 note</span></div><p>Structures that combine two primitives to get a guarantee neither gives alone, kept in lockstep on every mutation.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Composite Structures/Composite Structures.md" data-tooltip-position="top" aria-label="Composite Structures">Composite Structures</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Graph Structures">Graph Structures</span></span><span class="folder-map-node-count">2 notes</span></div><p>Structures for modelling relationships with cycles and multiple paths, composed from primitives per the connectivity question you must answer cheaply.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Graph Structures/Graph Structures.md" data-tooltip-position="top" aria-label="Graph Structures">Graph Structures</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Hash-based Structures">Hash-based Structures</span></span><span class="folder-map-node-count">3 notes</span></div><p>Structures that buy near-O(1) key access by spending a hash function, trading away element ordering.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Hash-based Structures/Hash-based Structures.md" data-tooltip-position="top" aria-label="Hash-based Structures">Hash-based Structures</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Linear Structures">Linear Structures</span></span><span class="folder-map-node-count">8 notes</span></div><p>Structures that store elements in a sequence, defined by access order and position rather than one memory layout.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Linear Structures/Linear Structures.md" data-tooltip-position="top" aria-label="Linear Structures">Linear Structures</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Trees">Trees</span></span><span class="folder-map-node-count">13 notes</span></div><p>Structures that represent hierarchical data through parent-child relationships, keeping balanced height for O(log n) search.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Trees/Trees.md" data-tooltip-position="top" aria-label="Trees">Trees</a></span></article></div><style>
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

## Example

```csharp
var byId = new Dictionary<int, string>
{
    [42] = "Ann"
};

var ordered = new List<string> { "Ann", "Bob" };

Console.WriteLine(byId[42]); // Fast lookup by key
Console.WriteLine(ordered[0]); // Fast lookup by index
```

## Suggested Groups

- **Linear structures** - arrays, dynamic arrays, linked lists, stacks, queues, deques, circular buffers, and spans belong together because they model ordered sequences.
- **Hash-based structures** - hash maps, hash sets, and Bloom filters share the same core mechanism: hash distribution and membership/lookup tradeoffs.
- **Graph structures** - graphs and disjoint sets belong near each other because both answer relationship/connectivity questions.
- **Composite structures** - LRU cache belongs here because it combines a hash map with a linked list to get O(1) lookup plus O(1) recency updates.
- **Index structures** - B-trees, B+ trees, and tries may eventually deserve their own group if the vault grows around database/file-system/search indexes.
- **Probabilistic structures** - [[Bloom Filter]] could split from hashing later if sketches, HyperLogLog, count-min sketch, or Cuckoo filters are added.
- **Priority structures** - heap-like structures are currently under [[Trees]] because the invariants are tree-shaped; split them only if priority queues become their own study track.

## Questions

> [!QUESTION]- What is a data structure? Which ones do you know? Which of them exist in .NET?
> A data structure is a way to organize related data into a collection-like object. Examples include arrays, lists, queues, stacks, linked lists, dictionaries/hash tables, hash sets, graphs, and trees. .NET provides built-in implementations for many of these (for example `Array`, `List<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`).

> [!QUESTION]- How do you choose between `List<T>`, `Dictionary<TKey, TValue>`, and `HashSet<T>`?
> Use `List<T>` when you need ordered, index-based access and the primary operations are iteration or positional lookup. Use `Dictionary<TKey, TValue>` when you need fast lookup, insertion, and deletion by a unique key. Use `HashSet<T>` when you only need membership testing and set operations (union, intersection, difference) without associated values.
> The wrong choice shows up as O(n) scans that should be O(1) lookups.

> [!QUESTION]- Why does collection choice matter more than micro-optimization?
> Switching from O(n) linear search to O(1) hash lookup reduces work by orders of magnitude at scale. No amount of loop unrolling or SIMD on the O(n) path matches that.
> Focus on algorithmic complexity first, then optimize constant factors within the chosen structure if profiling shows it matters.

> [!QUESTION]- When would you use `LinkedList<T>` over `List<T>` in .NET?
> Almost never in practice. `List<T>` (backed by a contiguous array) has better cache locality, lower memory overhead per element, and faster iteration. `LinkedList<T>` only wins when you need frequent insertions/deletions in the middle of a very large collection and already hold a reference to the node.
> In most .NET code, `List<T>` is the correct default.

## References

- [System.Collections.Generic namespace](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic)
- [Collections and data structures](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [Anatomy of the .NET dictionary](https://dunnhq.com/posts/2024/anatomy-of-the-dotnet-dictionary/)
