---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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

> [!QUESTION]- What is abc?
> Answer

## Links
- https://en.wikipedia.org/wiki/Selection_sort - Details + stability discussion
- https://visualgo.net/en/sorting - Step-by-step visualization
