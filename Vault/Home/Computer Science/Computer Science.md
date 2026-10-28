---
icon: flask-round
order: 20
color: "#ef4444"
topic: [Computer Science]
subtopic: []
summary: "Core CS reasoning for software engineering: data structures, algorithms, complexity analysis, and operating-system mechanisms."
tags: [FolderNote]
publish: true
level: ["4"]
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
> Constant factors can outweigh asymptotic complexity when inputs are small or bounded.
>
> Big O describes how cost grows with input size and deliberately ignores constant factors. An `O(n log n)` bound only says the cost stays below some constant times `n log n` once `n` is large enough. An algorithm with a better growth rate but more overhead can therefore be slower below some crossover size. Typical overhead includes setup work, extra bookkeeping and poorer memory access patterns. Above the crossover, the better growth rate eventually dominates.
>
> Hybrid sorting is a concrete case. The .NET 10 documentation describes `Array.Sort` as introsort, which sorts partitions of 16 or fewer elements with insertion sort. Insertion sort grows quadratically, but its low overhead suits such small partitions. The value 16 is that implementation's threshold, not a general rule.
>
> The crossover depends on the implementation, hardware and data. It is therefore established by measuring the actual workload rather than inferred from Big O alone.
>
> [NIST: Big-O notation](https://xlinux.nist.gov/dads/HTML/bigOnotation.html) · [Microsoft: Array.Sort (.NET 10)](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort?view=net-10.0) · [dotnet/runtime ArraySortHelper source](https://github.com/dotnet/runtime/blob/df3828915ac9573c8bd0deb5d9febdd582a398c5/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs#L123-L168)

<!-- qard-id: 0dd333e2-fd31-4b6f-ba90-c67e18806d70 -->
> [!qard]- How can the dominant operation reveal whether a performance problem needs a different data structure or algorithm?
> The dominant operation is the step that accounts for most of the work, and it shows where the cost lies. If a data structure that performs that operation cheaply removes most of the work, the representation was the problem. If the operations the task requires remain too expensive even with a suitable structure, the algorithm has to change.
>
> - **Repeated membership checks:** checking membership in a `List<T>` scans the list. Checking each item of a batch against a list of similar size inside a loop therefore costs O(n²). `HashSet<T>.Contains` takes expected O(1) time with a good hash function, so the same batch costs expected O(n) while the surrounding logic stays unchanged.
> - **Ordered iteration or range queries:** when repeated sorting or range scanning dominates, `SortedSet<T>` keeps elements ordered as they are added and removed, and `GetViewBetween` returns a view of a range. The set positions an element when it is inserted, so changing the fields that determine its order in place is unsupported. Instead, the element is removed, changed and then added again.
> - **Algorithm change:** sometimes the remaining cost comes from how many operations the approach performs rather than how expensive each one is. No data structure removes that cost, so the algorithm itself has to do less work.
> 
> [Microsoft: HashSet.Contains (.NET 10)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.hashset-1.contains?view=net-10.0) · [Microsoft: SortedSet class (.NET 10)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sortedset-1?view=net-10.0)

# References

- [Harvard CS50x](https://cs50.harvard.edu/x/)
