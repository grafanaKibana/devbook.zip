---
publish: true
created: 2026-07-11T21:40:23.946Z
modified: 2026-07-11T21:40:23.946Z
published: 2026-07-11T21:40:23.946Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: The broad strategies for constructing a solution, the lens you choose before writing code.
priority: High
level:
  - "4"
status: Creation
---

# Intro

Algorithm-design paradigms are the broad _strategies_ for constructing a solution — the lens you choose before writing any code. Most named algorithms are instances of one: merge sort is divide-and-conquer, Dijkstra is greedy, Fibonacci-with-memoisation is dynamic programming. Knowing the paradigm tells you the shape of the answer and the proof obligations (e.g. greedy needs an exchange argument; DP needs optimal substructure).

<nav style="--card-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Paradigms section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Backtracking">Backtracking</span></span></div><p class="db-card-summary">A refined brute force that builds candidate solutions incrementally and prunes a partial candidate the moment it can't possibly succeed.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Paradigms/Backtracking.md" data-tooltip-position="top" aria-label="Backtracking">Backtracking</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Branch and Bound">Branch and Bound</span></span></div><p class="db-card-summary">A search paradigm for optimisation that prunes any branch whose optimistic bound provably cannot beat the best solution found so far.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Paradigms/Branch and Bound.md" data-tooltip-position="top" aria-label="Branch and Bound">Branch and Bound</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Divide and Conquer">Divide and Conquer</span></span></div><p class="db-card-summary">Solves a problem by breaking it into smaller independent instances of itself, solving those recursively, and combining their answers.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Paradigms/Divide and Conquer.md" data-tooltip-position="top" aria-label="Divide and Conquer">Divide and Conquer</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Dynamic Programming">Dynamic Programming</span></span></div><p class="db-card-summary">Solves a problem by breaking it into overlapping subproblems, solving each once, and reusing the stored result instead of recomputing.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Paradigms/Dynamic Programming.md" data-tooltip-position="top" aria-label="Dynamic Programming">Dynamic Programming</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Greedy Algorithms">Greedy Algorithms</span></span></div><p class="db-card-summary">Builds a solution by repeatedly making the locally best choice and never reconsidering — fast, but correct only when provably applicable.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms.md" data-tooltip-position="top" aria-label="Greedy Algorithms">Greedy Algorithms</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. \*/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
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
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
.folder-map-empty {
margin: 1rem 0 0;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

## Algorithm Selection

| Paradigm | Strategy | Must hold to apply | Classic examples |
|---|---|---|---|
| [[Divide and Conquer]] | Split into disjoint subproblems, recurse, combine | Subproblems are independent; combine step is cheap | [[Merge Sort]], [[Binary Search]], Karatsuba, FFT |
| [[Dynamic Programming]] | Reuse answers to overlapping subproblems | Optimal substructure **and** overlapping subproblems | Knapsack, edit distance, longest common subsequence |
| [[Greedy Algorithms\|Greedy]] | Take the locally optimal choice, never revisit | Greedy-choice property (provable by an exchange argument) | [[Dijkstra]], Huffman coding, interval scheduling |
| [[Backtracking]] | DFS over choices, prune dead branches | Partial solutions can be rejected early | N-Queens, Sudoku, permutations/subsets |
| [[Branch and Bound]] | DFS or best-first over choices, prune by optimistic bound | An admissible bound on the best achievable in a subtree | 0/1 knapsack, TSP, integer linear programming |

> [!TIP]
> A common progression: if backtracking explores the _same_ subproblem repeatedly, adding memoisation turns it into dynamic programming; if a greedy choice can be proven always-correct, it replaces DP with something far cheaper.

The paradigms pair up along two axes. **Divide-and-conquer vs dynamic programming** differ only in whether the subproblems overlap — that single fact decides whether memoisation buys you anything. **Backtracking vs branch-and-bound** differ only in what justifies a prune: infeasibility for the former, a provably-worse bound for the latter (the same admissibility condition that [[A-Start Search|A* Search]] demands of its heuristic).

They all contrast with [[Computer Science/Algorithms/Patterns/Patterns|patterns]] (two pointers, sliding window), which are concrete coding idioms rather than design philosophies.

## References

- [Algorithm design paradigms (Wikipedia)](https://en.wikipedia.org/wiki/Algorithmic_paradigm) — taxonomy of greedy, divide-and-conquer, DP, backtracking, and more.
- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf) — free book with chapters on each paradigm.
