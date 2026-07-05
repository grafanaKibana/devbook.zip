---
icon: flask-round
color: "#ef4444"
topic:
  - Computer Science
subtopic: []
tags:
  - FolderNote
publish: true
level:
  - '4'
status: Done
priority: High
---

# Intro

Computer science gives you the reasoning tools behind effective software engineering: algorithmic thinking, data structure selection, complexity analysis, and understanding how computation scales. For a senior .NET developer, CS fundamentals matter most when designing systems that must handle production scale — choosing the right collection, avoiding quadratic blowups in batch processing, and reasoning about tradeoffs before writing code.

Two areas are covered here: **data structures** (how to organize data for efficient access, mutation, and iteration in .NET) and **algorithms** (how to solve search, sorting, graph, and set problems with predictable performance). The practical payoff is making correct design decisions upfront instead of discovering performance problems in production.

A concrete example: a code review reveals a nested loop checking membership in a `List<T>` — O(n²) per batch. Replacing the inner list with a `HashSet<T>` turns it into O(n) with constant-factor lookups. That is not optimization trivia — it is the difference between a batch job finishing in seconds versus timing out.

## Questions

> [!QUESTION]- When does algorithmic complexity matter less than constant factors?
> When input sizes are small and bounded (e.g., iterating over 10 HTTP headers), constant factors and cache locality dominate. A theoretically better algorithm with higher overhead (setup cost, memory indirection) can be slower than a simpler one on small inputs.
> This is why .NET's `Array.Sort` uses insertion sort for small subarrays inside its introspective sort implementation.

> [!QUESTION]- How do you decide between optimizing data structure choice versus algorithm choice?
> Start with the data structure. The right structure often eliminates the need for a clever algorithm — a `HashSet<T>` gives O(1) lookup without binary search, a `SortedSet<T>` gives ordered iteration without explicit sorting. Optimize the algorithm when the structure is fixed by external constraints (e.g., searching within a sorted array from an external source).

## Links

- [Big O cheat sheet](https://www.bigocheatsheet.com/) — Visual comparison of data structure and algorithm complexities.
- [Introduction to Algorithms (MIT OpenCourseWare)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — University-level CS fundamentals with lectures and problem sets.
- [Steve Yegge — Get That Job at Google](https://steve-yegge.blogspot.com/2008/03/get-that-job-at-google.html) — Practitioner perspective on why CS fundamentals matter in industry interviews and system design.
