---
publish: true
created: 2026-07-11T18:23:14.399Z
modified: 2026-07-11T18:23:14.450Z
published: 2026-07-11T18:23:14.450Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Structures for modelling relationships with cycles and multiple paths, composed from primitives per the connectivity question you must answer cheaply.
level:
  - "4"
priority: Medium
status: Not-Started
---

# Intro

Graph structures model relationships between entities — service dependencies, social edges, road networks — where trees are too restrictive: cycles exist, multiple paths connect the same pair, and there's no root. .NET has no `Graph<T>` type; you compose one from primitives, and the composition depends on which relationship question must be cheap. A `Dictionary<TNode, List<TNode>>` adjacency list makes neighbor traversal cheap; a `bool[,]` matrix makes edge-existence O(1); two `int[]` arrays (a disjoint set) make "are these connected?" near-O(1) without storing edges at all.

That last option is the reason this folder has two notes rather than one. [[Graph]] is the explicit representation — you keep vertices and edges and run traversals (BFS, DFS, Dijkstra) over them. [[Disjoint Set]] keeps no edges: it collapses the graph into "which component is this vertex in?", trading every other question away for near-constant connectivity queries and merges.

<nav style="--map-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Graph Structures section map"><div class="folder-map-children"><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Disjoint Set">Disjoint Set</span></span></div><p>A union-find structure tracking elements partitioned into disjoint sets, answering whether two elements share a set while merging sets over time.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Graph Structures/Disjoint Set.md" data-tooltip-position="top" aria-label="Disjoint Set">Disjoint Set</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Graph">Graph</span></span></div><p>Graphs model relationships between entities using vertices and edges; unlike trees they allow cycles, multiple paths, and no single root.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Data Structures/Graph Structures/Graph.md" data-tooltip-position="top" aria-label="Graph">Graph</a></span></article></div><style>
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

## Which Note You Need

| You need to answer | Reach for | Why |
|---|---|---|
| Paths, distances, orderings, cycles | [[Graph]] + BFS/DFS/Dijkstra | Needs actual edges to walk; O(V + E) per traversal |
| "Same component?" as edges arrive over time | [[Disjoint Set]] | O(α(n)) ≈ O(1) per union/find; no re-traversal after each new edge |
| Both | Both — Kruskal's MST is the canonical pairing | Sort edges (graph data), accept an edge only if its endpoints aren't already connected (disjoint set) |

The decision hinges on whether connectivity is **static or dynamic**. One-off "is B reachable from A?" on a fixed graph — a single BFS is simpler and answers directionality too. Edges arriving incrementally with connectivity queries interleaved — re-running BFS per query is O(V + E) each time, while a disjoint set amortizes to near-constant. The cost of the disjoint set: it only handles _undirected_ connectivity and can never un-merge (no edge deletion).

## Questions

> [!QUESTION]- When does a disjoint set beat BFS for connectivity, and what do you give up?
> When edges arrive over time and connectivity queries interleave with insertions: each union/find is O(α(n)) ≈ O(1), versus O(V + E) to re-traverse per query. You give up everything except component identity — no paths, no distances, no directed reachability, and merges are irreversible (no edge deletion).

## References

- [Graph theory (Wikipedia)](https://en.wikipedia.org/wiki/Graph_theory) — vocabulary for vertices, edges, directed vs undirected, and connectivity; the shared language both child notes assume.
- [Disjoint-set data structure (Wikipedia)](https://en.wikipedia.org/wiki/Disjoint-set_data_structure) — the operations, the forest representation, and the O(α(n)) analysis.
- [PriorityQueue\<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — the one .NET primitive built specifically for weighted-graph algorithms (Dijkstra, Prim).
