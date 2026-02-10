---
topic:
  - Computer Science
subtopic:
  - Algorithms
  - Sorting Algorithms
level: ["1"]
priority: medium
status: Not-Started
---
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`
## Intro
Insertion sort grows a sorted prefix by inserting each next element into its correct position. It is fast for small inputs and nearly-sorted data, and it is a common building block inside hybrid sorts.

## Deeper Explanation
- Mechanism: iterate left-to-right; for each key, shift larger elements right until the insertion spot is found.
- Complexity: average/worst O(n^2); best O(n) when already sorted.
- Properties: stable, in-place (aside from the key temp), good constant factors.
- Rule of thumb: use for n <= ~20-50 or as the base case inside merge/quick/introsort.

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
- https://en.wikipedia.org/wiki/Insertion_sort - Algorithm and complexity
- https://cp-algorithms.com/sorting/insertion_sort.html - Competitive programming perspective
