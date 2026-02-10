---
topic: ["Computer Science"]
subtopic: ["Algorithms", "Sorting Algorithms"]
level: ["1"]
priority: medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro
Merge sort is a divide-and-conquer algorithm: split the array, sort each half, then merge the two sorted halves. It has reliable O(n log n) time and is stable, at the cost of extra memory.

## Deeper Explanation
- Mechanism: recursively split until size 1, then merge by repeatedly taking the smaller front element from the two halves.
- Complexity: O(n log n) time in all cases; O(n) extra space for the merge buffer (array implementation).
- Properties: stable (with careful merge), not in-place in typical array form.
- Practical notes: great for linked lists and external sorting (sorting data that does not fit in memory).

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
- https://en.wikipedia.org/wiki/Merge_sort - Core idea + variants
- https://cp-algorithms.com/sorting/merge_sort.html - Implementation details
