---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Techniques to find target values in arrays, graphs, or text, chosen by data ordering, shape, and worst-case versus average-speed needs."
tags:
  - FolderNote
publish: true
priority: Medium
level:
  - '4'
status: Creation
---

# Intro

Search algorithms find target values in collections, trees, graphs, or text while minimizing work. Choosing the right search approach depends on data ordering, data shape, and whether you need worst-case guarantees or best average speed.

Concrete example: in a sorted list of product ids, Binary Search gives fast lookups with logarithmic time. In graph traversal, BFS finds the shortest path by edge count in unweighted graphs. In text processing, KMP and Rabin Karp avoid naive full rescans.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Diagram

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

## Algorithm Selection

### Searching an array

| Data shape | Algorithm | Time | Precondition |
| --- | --- | --- | --- |
| Unsorted array | [[Linear Search]] | O(n) | None |
| Sorted array | [[Binary Search]] | O(log n) | Sorted, random access |
| Sorted, unbounded length or target near front | [[Exponential Search]] | O(log i) for target at index i | Sorted |
| Sorted, uniformly distributed keys | [[Interpolation Search]] | O(log log n) avg, O(n) worst | Sorted **and** near-uniform distribution |
| Sorted, forward-only / costly backward seeks | [[Jump Search]] | O(√n) | Sorted |
| Unimodal function, not an array | [[Ternary Search]] | O(log n) probes | Strict unimodality |

### Searching text

| Data shape | Algorithm | Time | Precondition |
| --- | --- | --- | --- |
| Text + one pattern | [[KMP (Knuth-Morris-Pratt) Algorithm\|KMP]] | O(n + m) | — |
| Text + one pattern, large alphabet | [[Boyer-Moore]] | O(n/m) best, O(n) with Galil | Sublinear in practice; powers `grep` |
| Text + one pattern, prefix-structure problems | [[Z-Algorithm]] | O(n + m) | — |
| Text + many patterns at once | [[Aho-Corasick]] | O(n + matches) after build | Build cost is sum of pattern lengths |
| Text + rolling / multi-pattern hashing | [[Rabin Karp Search\|Rabin–Karp]] | O(n + m) avg | Good hash to avoid collisions |

### Searching a graph

| Data shape | Algorithm | Time | Precondition |
| --- | --- | --- | --- |
| Graph (unweighted) | [[DFS BFS\|BFS / DFS]] | O(V + E) | — |
| Graph (weighted) | See [[Graph Algorithms]] | — | [[Dijkstra]], [[A-Start Search\|A* Search]], [[Bellman-Ford]] |

## Questions

> [!QUESTION]- What is the first decision before picking a search algorithm?
> - Check whether data is sorted, because that immediately enables Binary Search.
> - Identify data shape: array, graph, or text stream, because each has specialized methods.
> - Decide whether worst-case guarantees or average speed matters more.
> - Checking these preconditions first avoids picking an algorithm whose assumptions your data violates — the most common source of wrong or slow searches.

> [!QUESTION]- Why is one search algorithm never best for all cases?
> - Different algorithms optimize for different constraints such as ordering, memory, and preprocessing.
> - Workload shape changes the winner: single lookup, repeated queries, or many patterns.
> - Correctness constraints can force specific methods, for example sorted input for Binary Search.
> - Every choice trades preprocessing and memory against query speed; the senior move is to weigh those for the actual workload instead of reaching for a default.

> [!QUESTION]- When does preprocessing (sorting or indexing) pay off versus a plain linear scan?
> - A one-off search over unsorted data is just O(n) — sorting first (O(n log n)) would cost more than it saves.
> - Once many queries hit the same data, a single sort or index build is amortized across all of them and each query drops to O(log n) or O(1).
> - Indexes (hash maps, B-trees) trade memory and write cost for fast reads.
> - Preprocessing front-loads cost and memory to make repeated queries cheap, so justify it by query volume, not by instinct.

## References

- [Search algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Search_algorithm) — Overview of search algorithm categories.
- [BinarySearch method (.NET API)](https://learn.microsoft.com/en-us/dotnet/api/system.array.binarysearch) — Official .NET binary search reference with usage examples.
- [Binary search (CP Algorithms)](https://cp-algorithms.com/num_methods/binary_search.html) — Implementation patterns and edge-case analysis.
- [Nearly all binary searches and mergesorts are broken (Google Research)](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/) — Practitioner post-mortem on a subtle overflow bug present in most binary search implementations for decades.
