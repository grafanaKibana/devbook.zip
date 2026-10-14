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
qard-deck: "Computer Science"
qard-topic: "Computer Science"
flashcard_uid: "827a68f2"
---

Computer science supplies the model behind software engineering decisions: how data is organized, how work scales ([[Home/Computer Science/Big O Notation|Big O]]), and how an operating system executes and isolates programs. Those fundamentals show up in ordinary .NET work whenever a collection is chosen, a slow path is diagnosed, or a design tradeoff needs a mechanical explanation.

The core branches answer different questions. The [[Home/Computer Science/Data Structures/Data Structures|data structures]] branch decides how data can be accessed and changed. [[Home/Computer Science/Algorithms/Algorithms|algorithms]] define the work needed to search, sort, or traverse it.

A code review might expose a nested loop checking membership in a `List<T>`, making each batch O(n²). Replacing the inner list with a `HashSet<T>` reduces the batch to O(n) expected work. The structure changed. The surrounding business logic did not.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: af5ebbc3-c37b-4578-8c38-555874d827a4 -->
> [!qard]- When can constant factors outweigh asymptotic complexity?
> For small, bounded inputs, setup cost, memory access, and constant factors can outweigh an asymptotic advantage, so benchmark the workload that matters. As input grows, the growth rate can dominate. As one implementation-specific example, .NET 10 Array.Sort uses introsort and uses insertion sort for partitions of 16 or fewer; that threshold is an implementation detail, not a general algorithm rule. [Microsoft: Array.Sort (.NET 10)](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort?view=net-10.0) · [dotnet/runtime ArraySortHelper source](https://github.com/dotnet/runtime/blob/df3828915ac9573c8bd0deb5d9febdd582a398c5/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs#L123-L168)

<!-- qard-id: 0dd333e2-fd31-4b6f-ba90-c67e18806d70 -->
> [!qard]- How can the dominant operation reveal whether a performance problem needs a different data structure or algorithm?
> Start with the operation doing most of the work. If repeated membership scans dominate, a hash set may remove those scans; if ordered iteration or range queries matter, a sorted set maintains order as items change. Before changing comparer-relevant state, remove the item; change it, then reinsert it. Then reconsider the algorithm if the required representation still leaves too much work per operation. [Microsoft: HashSet<T>.Contains (.NET 10)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1.contains?view=net-10.0) · [Microsoft: SortedSet<T> (.NET 10)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedset-1?view=net-10.0)

# References

- [Harvard CS50x](https://cs50.harvard.edu/x/)
