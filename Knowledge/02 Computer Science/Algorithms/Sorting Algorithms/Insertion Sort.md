---
topic:
  - Computer Science
subtopic:
  - Algorithms
  - Sorting Algorithms
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro
Insertion sort grows a sorted prefix by inserting each next element into its correct position. It is fast for small inputs and nearly-sorted data, and it is a common building block inside hybrid sorts.

## Deeper Explanation
- Mechanism: iterate left-to-right; for each key, shift larger elements right until the insertion spot is found.
- Complexity: average/worst O(n^2); best O(n) when already sorted.
- Properties: stable, in-place (aside from the key temp), good constant factors.
- Rule of thumb: use for n <= ~20-50 or as the base case inside merge/quick/introsort.

## Diagram

```mermaid
graph TD
  A[Start array A] --> B[Set j to 1]
  B --> C{j less than n}
  C -->|No| Z[Done]
  C -->|Yes| D[Set key to A at j and set i]
  D --> E{i nonnegative and A at i greater than key}
  E -->|Yes| F[Shift right and decrement i]
  F --> E
  E -->|No| G[Insert key]
  G --> H[Increment j]
  H --> C
```

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
- https://en.wikipedia.org/wiki/Insertion_sort - Algorithm and complexity
- https://cp-algorithms.com/sorting/insertion_sort.html - Competitive programming perspective
