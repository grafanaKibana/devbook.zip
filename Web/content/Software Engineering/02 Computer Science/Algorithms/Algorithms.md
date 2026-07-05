---
topic:
  - Computer Science
subtopic:
  - Algorithms
tags:
  - FolderNote
dg-publish: true
level:
  - '4'
status: Done
priority: High
---

# Intro

Algorithms are step-by-step procedures for solving problems with predictable behavior as input grows. In practice, algorithm choice is a tradeoff between runtime, memory usage, implementation complexity, and failure modes under real workloads.

Complexity analysis (Big O) is the primary tool for comparing algorithms without benchmarking. It captures growth rate: O(n log n) sorting scales to millions of items where O(n²) does not. But Big O ignores constant factors, cache behavior, and real-world input distributions — so production decisions combine theoretical analysis with profiling on representative data.

Concrete example: for repeated membership checks in a large list of ids, sorting once and using binary search gives fast lookups with low memory overhead. For one-off checks on unsorted data, a linear scan is usually simpler and can be faster overall because there is no preprocessing cost.

## Questions

> [!QUESTION]- What is an algorithm? How is its efficiency measured?
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

## Links

- [Big O notation (Wikipedia)](https://en.wikipedia.org/wiki/Big_O_notation)
- [Algorithm design and analysis (MIT OpenCourseWare)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)
- [Nearly all binary searches and mergesorts are broken](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/02 Computer Science|02 Computer Science]]
>
> **Topics**
> - [[Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/Graph Algorithms|Graph Algorithms]]
> - [[Software Engineering/02 Computer Science/Algorithms/Paradigms/Paradigms|Paradigms]]
> - [[Software Engineering/02 Computer Science/Algorithms/Patterns/Patterns|Patterns]]
> - [[Software Engineering/02 Computer Science/Algorithms/Search Algorithms/Search Algorithms|Search Algorithms]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Sorting Algorithms|Sorting Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Union-Find|Union-Find]]
<!-- whats-next:end -->
