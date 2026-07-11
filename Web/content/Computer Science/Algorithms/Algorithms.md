---
publish: true
created: 2026-07-11T18:22:14.209Z
modified: 2026-07-11T18:22:14.210Z
published: 2026-07-11T18:22:14.210Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Step-by-step problem-solving procedures chosen by trading off runtime, memory, and complexity, with Big O as the primary comparison tool.
level:
  - "4"
status: Creation
priority: High
---

# Intro

Algorithms are step-by-step procedures for solving problems with predictable behavior as input grows. In practice, algorithm choice is a tradeoff between runtime, memory usage, implementation complexity, and failure modes under real workloads.

Complexity analysis (Big O) is the primary tool for comparing algorithms without benchmarking. It captures growth rate: O(n log n) sorting scales to millions of items where O(n²) does not. But Big O ignores constant factors, cache behavior, and real-world input distributions — so production decisions combine theoretical analysis with profiling on representative data.

Concrete example: for repeated membership checks in a large list of ids, sorting once and using binary search gives fast lookups with low memory overhead. For one-off checks on unsorted data, a linear scan is usually simpler and can be faster overall because there is no preprocessing cost.

<nav style="--map-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Algorithms section map"><div class="folder-map-children"><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Graph Algorithms">Graph Algorithms</span></span><span class="folder-map-node-count">11 notes</span></div><p>Algorithms to traverse, rank, and optimize the relationships that graphs model — reachability, shortest paths, connectivity, and flow.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Graph Algorithms/Graph Algorithms.md" data-tooltip-position="top" aria-label="Graph Algorithms">Graph Algorithms</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Heap Sort">Heap Sort</span></span><span class="folder-map-node-count">12 notes</span></div><p>Heapifies the array then repeatedly extracts the max; the only common O(n log n), in-place comparison sort.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort.md" data-tooltip-position="top" aria-label="Heap Sort">Heap Sort</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Paradigms">Paradigms</span></span><span class="folder-map-node-count">5 notes</span></div><p>The broad strategies for constructing a solution — the lens you choose before writing code, each with its own proof obligations.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Paradigms/Paradigms.md" data-tooltip-position="top" aria-label="Paradigms">Paradigms</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Patterns">Patterns</span></span><span class="folder-map-node-count">10 notes</span></div><p>Reusable problem-solving idioms — recurring techniques that turn brute-force solutions efficient; recognising the pattern is the hard part, distinct from broader paradigms.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Patterns/Patterns.md" data-tooltip-position="top" aria-label="Patterns">Patterns</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Search Algorithms">Search Algorithms</span></span><span class="folder-map-node-count">12 notes</span></div><p>Techniques to find target values in arrays, graphs, or text, chosen by data ordering, shape, and worst-case versus average-speed needs.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Search Algorithms/Search Algorithms.md" data-tooltip-position="top" aria-label="Search Algorithms">Search Algorithms</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg></span><span class="folder-map-node-title" title="Sorting Algorithms">Sorting Algorithms</span></span><span class="folder-map-node-count">12 notes</span></div><p>Comparing sorting algorithms by stability, memory tradeoffs, and typical runtime behavior to guide production choices.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Sorting Algorithms.md" data-tooltip-position="top" aria-label="Sorting Algorithms">Sorting Algorithms</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Union-Find">Union-Find</span></span></div><p>Answers connectivity queries over a disjoint set via find and union, running in near-constant O(α(n)) amortized time with two optimizations.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Union-Find.md" data-tooltip-position="top" aria-label="Union-Find">Union-Find</a></span></article></div><style>
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

## Questions

> [!QUESTION]- What is an algorithm? How is its efficiency measured?
>
> - An algorithm is a finite, ordered set of steps that transforms input into the required output.
> - Time complexity describes how runtime grows as input size increases.
> - Space complexity describes extra memory needed as input grows.
> - Big O notation is used to compare growth classes independent of hardware details.
> - Why it matters: complexity awareness helps avoid implementations that fail under production scale.

> [!QUESTION]- Why is Big O not enough to choose the fastest algorithm in practice?
> Big O describes asymptotic growth and ignores constant factors, cache locality, branch prediction, and real input distributions. Quick Sort is O(n log n) average like Merge Sort but often faster on arrays due to cache-friendly in-place partitioning.
> Measure on representative data after narrowing candidates by complexity class.

> [!QUESTION]- What is the difference between worst-case, average-case, and amortized complexity?
> Worst-case guarantees behavior under adversarial or degenerate inputs (important for security and SLAs). Average-case describes typical behavior under random inputs. Amortized complexity describes cost spread over a sequence of operations (e.g., dynamic array resizing is O(1) amortized even though individual resizes are O(n)).
> Choose based on whether you control the input distribution and whether tail latency matters.

## References

- [Big O notation (Wikipedia)](https://en.wikipedia.org/wiki/Big_O_notation)
- [Algorithm design and analysis (MIT OpenCourseWare)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)
- [Nearly all binary searches and mergesorts are broken](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)
