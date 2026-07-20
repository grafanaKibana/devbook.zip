---
publish: true
created: 2026-07-18T14:02:43.984Z
modified: 2026-07-18T14:02:43.990Z
published: 2026-07-18T14:02:43.990Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Techniques to find target values in arrays, graphs, or text, chosen by data ordering and shape.
priority: Medium
level:
  - "4"
status: Creation
---

Search algorithms find target values in collections, trees, graphs, or text while minimizing work. Choosing the right search approach depends on data ordering, data shape, and whether you need worst-case guarantees or best average speed.

Concrete example: in a sorted list of product ids, Binary Search gives fast lookups with logarithmic time. In graph traversal, BFS finds the shortest path by edge count in unweighted graphs. In text processing, KMP and Rabin Karp avoid naive full rescans.

<nav style="--card-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Search Algorithms section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="db-card-title" title="String Matching">String Matching</span></span><span class="folder-map-node-count">5 notes</span></div><p class="db-card-summary">Finding a pattern inside text, chosen by how many patterns you match and what you preprocess.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/String Matching/String Matching.md" data-tooltip-position="top" aria-label="String Matching">String Matching</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Binary Search">Binary Search</span></span></div><p class="db-card-summary">Finds a target in a sorted array by repeatedly halving the search range, in O(log n).</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Binary Search.md" data-tooltip-position="top" aria-label="Binary Search">Binary Search</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Exponential Search">Exponential Search</span></span></div><p class="db-card-summary">Finds a range containing the target by doubling probe indices, then binary-searches it, in O(log i) by target position.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Exponential Search.md" data-tooltip-position="top" aria-label="Exponential Search">Exponential Search</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Interpolation Search">Interpolation Search</span></span></div><p class="db-card-summary">Guesses the target's position by interpolation, reaching O(log log n) on uniform sorted data.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Interpolation Search.md" data-tooltip-position="top" aria-label="Interpolation Search">Interpolation Search</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Jump Search">Jump Search</span></span></div><p class="db-card-summary">Steps a sorted array in fixed blocks of size root n, then scans back one block.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Jump Search.md" data-tooltip-position="top" aria-label="Jump Search">Jump Search</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Linear Search">Linear Search</span></span></div><p class="db-card-summary">Scans elements one by one until a match; O(n) and works on any data.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Linear Search.md" data-tooltip-position="top" aria-label="Linear Search">Linear Search</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Ternary Search">Ternary Search</span></span></div><p class="db-card-summary">Finds the extremum of a unimodal function by splitting the range in thirds each step.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Ternary Search.md" data-tooltip-position="top" aria-label="Ternary Search">Ternary Search</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Diagram

```mermaid
flowchart TD
  A[Need to find target] --> B{Data is sorted array}
  B -->|Yes| C{Length known and random access cheap}
  C -->|Yes| C1[Binary Search]
  C -->|Unbounded or target near the front| C2[Exponential Search]
  C -->|Backward seeks are expensive| C3[Jump Search]
  B -->|No| D{Data is graph}
  D -->|Yes| E[DFS BFS]
  D -->|No| F{Data is text pattern}
  F -->|One pattern| G[KMP or Boyer Moore or Z Algorithm]
  F -->|Many patterns at once| G2[Aho Corasick]
  F -->|No| H{Optimising a unimodal function}
  H -->|Yes| I[Ternary Search]
  H -->|No| J[Use linear scan or indexing structure]
```

# Algorithm Selection

## Searching an array

| Data shape | Algorithm | Time | Precondition |
| --- | --- | --- | --- |
| Unsorted array, linked list, or one-pass stream | [[Linear Search]] | O(n) | None; needs no index or random access |
| Sorted array | [[Binary Search]] | O(log n) | Sorted, random access |
| Sorted, unbounded length or target near front | [[Exponential Search]] | O(log i) for target at index i | Sorted |
| Sorted, uniformly distributed keys | [[Interpolation Search]] | O(log log n) avg, O(n) worst | Sorted **and** near-uniform **numeric** distribution |
| Sorted, forward-only / costly backward seeks | [[Jump Search]] | O(√n) | Sorted |
| Unimodal function, not an array | [[Ternary Search]] | O(log n) probes | Strict unimodality |

Binary Search also serves range and insertion-point queries — lower-bound / upper-bound, first/last match — because it keeps the data in sorted order rather than building a separate index.

## Searching text

Text/pattern matching is its own sub-family — see [[String Matching]] for the full comparison.

| Data shape | Algorithm | Time | Precondition |
| --- | --- | --- | --- |
| Text + one pattern | [[KMP (Knuth-Morris-Pratt) Algorithm\|KMP]] | O(n + m) | — |
| Text + one pattern, large alphabet | [[Boyer-Moore]] | O(n/m) best, O(n) with Galil | Sublinear in practice; powers `grep` |
| Text + one pattern, prefix-structure problems | [[Z-Algorithm]] | O(n + m) | — |
| Text + many patterns at once | [[Aho-Corasick]] | O(n + matches) after build | Build cost is sum of pattern lengths |
| Text + rolling / multi-pattern hashing | [[Rabin Karp Search\|Rabin–Karp]] | O(n + m) avg | Good hash to avoid collisions |

## Searching a graph

| Data shape | Algorithm | Time | Precondition |
| --- | --- | --- | --- |
| Graph (unweighted) | [[DFS BFS\|BFS / DFS]] | O(V + E) | — |
| Graph (weighted) | See [[Graph Algorithms]] | — | [[Dijkstra]], [[A-Star Search\|A* Search]], [[Bellman-Ford]] |

# Questions

> [!QUESTION]- What is the first decision before picking a search algorithm?
>
> - Check whether data is sorted, because that immediately enables Binary Search.
> - Identify data shape: array, graph, or text stream, because each has specialized methods.
> - Decide whether worst-case guarantees or average speed matters more.
> - Checking these preconditions first avoids picking an algorithm whose assumptions your data violates — the most common source of wrong or slow searches.

> [!QUESTION]- Why is one search algorithm never best for all cases?
>
> - Different algorithms optimize for different constraints such as ordering, memory, and preprocessing.
> - Workload shape changes the winner: single lookup, repeated queries, or many patterns.
> - Correctness constraints can force specific methods, for example sorted input for Binary Search.
> - Every choice trades preprocessing and memory against query speed; the senior move is to weigh those for the actual workload instead of reaching for a default.

> [!QUESTION]- When does preprocessing (sorting or indexing) pay off versus a plain linear scan?
>
> - A one-off search over unsorted data is just O(n) — sorting first (O(n log n)) would cost more than it saves.
> - Once many queries hit the same data, a single sort or index build is amortized across all of them and each query drops to O(log n) or O(1).
> - Indexes (hash maps, B-trees) trade memory and write cost for fast reads.
> - Preprocessing front-loads cost and memory to make repeated queries cheap, so justify it by query volume, not by instinct.

# References

- [Search algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Search_algorithm) — Overview of search algorithm categories.
- [BinarySearch method (.NET API)](https://learn.microsoft.com/en-us/dotnet/api/system.array.binarysearch) — Official .NET binary search reference with usage examples.
- [Binary search (CP Algorithms)](https://cp-algorithms.com/num_methods/binary_search.html) — Implementation patterns and edge-case analysis.
- [Nearly all binary searches and mergesorts are broken (Google Research)](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/) — Practitioner post-mortem on a subtle overflow bug present in most binary search implementations for decades.
