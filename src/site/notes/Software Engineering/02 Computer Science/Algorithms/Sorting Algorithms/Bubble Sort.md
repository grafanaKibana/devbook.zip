---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/sorting-algorithms/bubble-sort/","noteIcon":""}
---


# Intro

Bubble sort repeatedly swaps adjacent out-of-order elements, pushing large values toward the end each pass. It is easy to understand but rarely used in production due to poor performance.

## Deeper Explanation

- Mechanism: scan left-to-right, swap (a[i], a[i+1]) when out of order; after one full pass, the max element is in its final place.
- Early-exit optimization: if a pass makes zero swaps, the array is already sorted.
- Complexity: average/worst O(n^2); best O(n) with early-exit on already-sorted input.
- Properties: stable (with adjacent swaps), in-place, simple.

## Diagram

```mermaid
graph TD
  A[Start array A] --> B[Set swapped true]
  B --> C{swapped}
  C -->|No| Z[Done]
  C -->|Yes| D[Set swapped false]
  D --> E[Set i to 0]
  E --> F{i less than n minus 1}
  F -->|No| C
  F -->|Yes| G{A at i greater than A at i plus 1}
  G -->|Yes| H[Swap A at i and A at i plus 1 and set swapped true]
  G -->|No| I[No op]
  H --> J[Increment i]
  I --> J
  J --> F
```

## Questions

> [!QUESTION]- What is Bubble Sort?
> Bubble sort repeatedly swaps adjacent out-of-order elements, pushing large values toward the end each pass. It is easy to understand but rarely used in production due to poor performance.


## Links

- https://en.wikipedia.org/wiki/Bubble_sort - Overview and variants
- https://visualgo.net/en/sorting - Animation to build intuition

# Whats next

:LiArrowUpLeft: [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Insertion Sort.md" data-href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Insertion Sort.md" href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Insertion Sort.md" class="internal-link" target="_blank" rel="noopener nofollow">Insertion Sort</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort.md" data-href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort.md" href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort.md" class="internal-link" target="_blank" rel="noopener nofollow">Merge Sort</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md" data-href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md" href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Quick Sort.md" class="internal-link" target="_blank" rel="noopener nofollow">Quick Sort</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Selection Sort.md" data-href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Selection Sort.md" href="Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Selection Sort.md" class="internal-link" target="_blank" rel="noopener nofollow">Selection Sort</a></span></li></ul></div>
