---
publish: true
created: 2026-07-11T18:23:41.614Z
modified: 2026-07-11T18:23:41.615Z
published: 2026-07-11T18:23:41.615Z
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Comparing sorting algorithms by stability, memory tradeoffs, and typical runtime behavior to guide production choices.
priority: Medium
level:
  - "4"
status: Creation
---

# Intro

Sorting is a foundational operation that impacts performance all over the stack: databases, UIs, pipelines, and in-memory processing. The important part is not memorizing algorithms, but understanding stability, memory tradeoffs, and typical runtime behavior. Example: mergesort is stable and predictable, while quicksort is often fast in practice but has worst-case pitfalls.

<nav style="--card-accent: 239, 68, 68;" class="folder-structure-map" aria-label="Sorting Algorithms section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Bubble Sort">Bubble Sort</span></span></div><p class="db-card-summary">Repeatedly swaps adjacent out-of-order elements; a slow teaching baseline for why better sorts exist.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Bubble Sort.md" data-tooltip-position="top" aria-label="Bubble Sort">Bubble Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Bucket Sort">Bucket Sort</span></span></div><p class="db-card-summary">Scatters elements into range buckets, sorts each, then concatenates; near-linear when keys are uniformly distributed.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Bucket Sort.md" data-tooltip-position="top" aria-label="Bucket Sort">Bucket Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Comb Sort">Comb Sort</span></span></div><p class="db-card-summary">Bubble sort with a shrinking gap that kills turtles, curing bubble sort's quadratic flaw in practice.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Comb Sort.md" data-tooltip-position="top" aria-label="Comb Sort">Comb Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Counting Sort">Counting Sort</span></span></div><p class="db-card-summary">Tallies integer keys in a small range and places each in O(n + k) without comparisons.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Counting Sort.md" data-tooltip-position="top" aria-label="Counting Sort">Counting Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Insertion Sort">Insertion Sort</span></span></div><p class="db-card-summary">Grows a sorted prefix by inserting each element into place; fast on small or nearly-sorted inputs.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort.md" data-tooltip-position="top" aria-label="Insertion Sort">Insertion Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Introsort">Introsort</span></span></div><p class="db-card-summary">Hybrid that runs quicksort but falls back to heap sort on deep recursion, removing the O(n²) tail.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Introsort.md" data-tooltip-position="top" aria-label="Introsort">Introsort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Merge Sort">Merge Sort</span></span></div><p class="db-card-summary">Divide-and-conquer sort that is stable and O(n log n) in all cases at the cost of O(n) space.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Merge Sort.md" data-tooltip-position="top" aria-label="Merge Sort">Merge Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Quick Sort">Quick Sort</span></span></div><p class="db-card-summary">Partitions around a pivot and recurses; often the fastest comparison sort but with an O(n²) worst case.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md" data-tooltip-position="top" aria-label="Quick Sort">Quick Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Radix Sort">Radix Sort</span></span></div><p class="db-card-summary">Sorts fixed-width integer keys one digit at a time with a stable pass, beating the comparison bound.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Radix Sort.md" data-tooltip-position="top" aria-label="Radix Sort">Radix Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Selection Sort">Selection Sort</span></span></div><p class="db-card-summary">Repeatedly selects the minimum of the unsorted suffix; always O(n²) comparisons but only O(n) swaps.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Selection Sort.md" data-tooltip-position="top" aria-label="Selection Sort">Selection Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Shell Sort">Shell Sort</span></span></div><p class="db-card-summary">Runs insertion sort over decreasing gaps so elements jump far, beating O(n²) with no recursion or scratch memory.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Shell Sort.md" data-tooltip-position="top" aria-label="Shell Sort">Shell Sort</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Tim Sort">Tim Sort</span></span></div><p class="db-card-summary">Natural merge sort that exploits existing runs; stable, adaptive, and the default in Python and Java.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Computer Science/Algorithms/Sorting Algorithms/Tim Sort.md" data-tooltip-position="top" aria-label="Tim Sort">Tim Sort</a></span></article></div><style>
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
accent uses border-radius:inherit to stay inside the rounded corners. _/
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
/_ Empty-section placeholder: a muted gray dashed card (not raw text), reusing
the .db-card chrome but with the accent gradient and hover lift neutralized. \*/
.folder-map-node-empty {
border-style: dashed;
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
cursor: default;
}
.folder-map-node-empty::before { display: none; }
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
box-shadow: none;
transform: none;
}
.folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.9rem;
font-style: italic;
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

## Diagram

```mermaid
flowchart TD
  A[Need sorting] --> B{Keys are small integers or fixed width}
  B -->|Yes| B1{Key range is comparable to n}
  B1 -->|Yes| B2[Counting Sort]
  B1 -->|No but keys are fixed width| B3[Radix Sort]
  B1 -->|Keys spread uniformly over a range| B4[Bucket Sort]
  B -->|No, comparison sort needed| C{Need stable output}
  C -->|Yes| D{Need O n log n worst case}
  D -->|Yes| E[Merge Sort or Tim Sort]
  D -->|No| F[Insertion Sort only for small or nearly sorted input]
  C -->|No| G{Need in place and fast average case}
  G -->|Yes with worst case guarantee| H[Introsort]
  G -->|Yes| I[Quick Sort]
  G -->|No| J[Selection Sort or Bubble Sort for learning]
```

## Algorithm Selection

### Comparison sorts — bounded below by `O(n log n)`

| Algorithm | Average | Worst | Space | Stable | Reach for it when |
| --- | --- | --- | --- | --- | --- |
| [[Bubble Sort]] | O(n²) | O(n²) | O(1) | Yes | Teaching only |
| [[Comb Sort]] | ~O(n² / 2^p) | O(n²) | O(1) | No | Teaching why bubble sort is slow |
| [[Selection Sort]] | O(n²) | O(n²) | O(1) | No | Writes are far costlier than reads |
| [[Insertion Sort]] | O(n²) | O(n²) | O(1) | Yes | Tiny or nearly-sorted input; base case of hybrids |
| [[Shell Sort]] | ~O(n^1.3) | O(n^1.5) with Hibbard | O(1) | No | No recursion, no scratch memory (embedded) |
| [[Heap Sort]] | O(n log n) | O(n log n) | O(1) | No | Hard worst-case bound with no extra memory |
| [[Merge Sort]] | O(n log n) | O(n log n) | O(n) | Yes | Stability required; linked lists; external sort |
| [[Quick Sort]] | O(n log n) | O(n²) | O(log n) | No | Cache-friendly in-memory default |
| [[Tim Sort]] | O(n log n) | O(n log n) | O(n) | Yes | Real-world partly-ordered data (Python, Java) |
| [[Introsort]] | O(n log n) | O(n log n) | O(log n) | No | Quicksort's speed without its O(n²) tail (C++, .NET) |

### Non-comparison sorts — beat the bound by reading key structure

| Algorithm | Time | Space | Stable | Precondition |
| --- | --- | --- | --- | --- |
| [[Counting Sort]] | O(n + k) | O(n + k) | Yes | Integer keys in a small range `[0, k)` |
| [[Radix Sort]] | O(d · (n + b)) | O(n + b) | Yes | Fixed-width keys; needs a stable inner sort |
| [[Bucket Sort]] | O(n + k) avg, O(n²) worst | O(n + k) | If inner sort is | Keys roughly uniform over a known range |

## Questions

> [!QUESTION]- How do you choose between Merge Sort and Quick Sort in production?
>
> - Merge sort gives reliable `O(n log n)` worst-case behavior and stable ordering.
> - Quick sort is often faster in practice on in-memory arrays due to cache behavior.
> - Quick sort has worst-case `O(n^2)` if pivot strategy is poor, so randomized or introspective variants are safer.
> - Why it matters: this choice affects latency tail risk, memory usage, and correctness when stable ordering is required.

> [!QUESTION]- When is Insertion Sort still a good choice?
>
> - It is strong on very small arrays because constant overhead is tiny.
> - It performs well on nearly sorted data where shifts are minimal.
> - It is commonly used as a base case inside hybrid production sort implementations.
> - Why it matters: knowing this avoids overengineering and explains hybrid sort internals in interviews.

> [!QUESTION]- What does .NET's built-in Array.Sort use, and why?
> .NET uses an introspective sort (IntroSort): it starts with Quick Sort for fast average performance, switches to Heap Sort when recursion depth exceeds a threshold (to guarantee O(n log n) worst case), and uses Insertion Sort for small partitions (to exploit its low overhead on nearly-sorted data).
> This hybrid approach demonstrates why production sort implementations combine multiple algorithms rather than using a single one.

## References

- [Sorting algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Sorting_algorithm)
- [Array Sort method .NET](https://learn.microsoft.com/dotnet/api/system.array.sort)
- [Nearly all binary searches and mergesorts are broken](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)
- [Sorting (Sedgewick and Wayne, Algorithms 4th ed.)](https://algs4.cs.princeton.edu/20sorting/) — implementations and empirical performance analysis for the whole family.
