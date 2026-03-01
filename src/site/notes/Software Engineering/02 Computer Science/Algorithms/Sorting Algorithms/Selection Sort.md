---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/sorting-algorithms/selection-sort/"}
---


# Intro

Selection sort builds a sorted prefix by repeatedly selecting the minimum remaining element and swapping it into place. It does a predictable number of comparisons but is still quadratic time.

## Deeper Explanation

- Mechanism: for each position i, find the smallest element in a[i..n-1], then swap it with a[i].
- Complexity: always O(n^2) comparisons; O(n) swaps.
- Properties: in-place; typically not stable (a swap can reorder equal keys).
- When it can make sense: when writes are expensive but comparisons are cheap (still uncommon).

## Diagram

```mermaid
graph TD
  A[Start array A] --> B[Set i to 0]
  B --> C{i less than n minus 1}
  C -->|No| Z[Done]
  C -->|Yes| D[Set min to i and set j to i plus 1]
  D --> E{j less than n}
  E -->|No| F[Swap A at i and A at min]
  F --> G[Increment i]
  G --> C
  E -->|Yes| H{A at j less than A at min}
  H -->|Yes| I[Set min to j]
  H -->|No| J[No op]
  I --> K[Increment j]
  J --> K
  K --> E
```

## Questions

> [!QUESTION]- What is Selection Sort?
> Selection sort builds a sorted prefix by repeatedly selecting the minimum remaining element and swapping it into place. It does a predictable number of comparisons but is still quadratic time.


## Links

- https://en.wikipedia.org/wiki/Selection_sort - Details + stability discussion
- https://visualgo.net/en/sorting - Step-by-step visualization

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Bubble Sort\|Bubble Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Insertion Sort\|Insertion Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort\|Merge Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Quick Sort\|Quick Sort]]
<!-- whats-next:end -->
