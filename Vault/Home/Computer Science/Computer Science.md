---
icon: flask-round
order: 20
color: "#ef4444"
topic:
  - Computer Science
subtopic: []
summary: "Core CS reasoning for software engineering: data structures, algorithms, complexity analysis, and operating-system mechanisms."
tags: [FolderNote]
publish: true
level:
  - "4"
status: Creation
priority: High
---

Computer science supplies the model behind software engineering decisions: how data is organized, how work scales ([[Home/Computer Science/Big O Notation|Big O]]), and how an operating system executes and isolates programs. Those fundamentals show up in ordinary .NET work whenever a collection is chosen, a slow path is diagnosed, or a design tradeoff needs a mechanical explanation.

The core branches answer different questions. The [[Home/Computer Science/Data Structures/Data Structures|data structures]] branch decides how data can be accessed and changed. [[Home/Computer Science/Algorithms/Algorithms|algorithms]] define the work needed to search, sort, or traverse it.

A code review might expose a nested loop checking membership in a `List<T>`, making each batch O(n²). Replacing the inner list with a `HashSet<T>` reduces the batch to O(n) expected work. The structure changed. The surrounding business logic did not.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- When does algorithmic complexity matter less than constant factors?
> When input sizes are small and bounded (e.g., iterating over 10 HTTP headers), constant factors and cache locality dominate. A theoretically better algorithm with higher overhead (setup cost, memory indirection) can be slower than a simpler one on small inputs.
> This is why .NET's `Array.Sort` uses insertion sort for small subarrays inside its introspective sort implementation.

> [!QUESTION]- What determines whether a performance problem needs a different data structure or a different algorithm?
> The dominant operation is the starting point. A `HashSet<T>` removes repeated membership scans, while a `SortedSet<T>` keeps the set ordered as items are added or removed. If a change affects an item's sort order, remove it and add it again. The algorithm becomes the next target when the representation is fixed by an external format or the chosen structure still leaves too much work in each operation.

# References

- [Harvard CS50x](https://cs50.harvard.edu/x/)
