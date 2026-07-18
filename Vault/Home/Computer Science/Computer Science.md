---
icon: flask-round
order: 20
color: "#ef4444"
topic:
  - Computer Science
subtopic: []
summary: "Core CS reasoning for software engineering: data structures, algorithms, complexity analysis, and operating-system mechanisms."
tags:
  - FolderNote
publish: true
level:
  - '4'
status: Creation
priority: High
---

# Intro

Computer science gives you the reasoning tools behind effective software engineering: algorithmic thinking, data structure selection, complexity analysis ([[Home/Computer Science/Big O Notation|Big O]]), and the operating-system mechanisms that execute and isolate programs. For a senior .NET developer, these fundamentals matter when choosing collections and algorithms, diagnosing whether work is CPU-bound or waiting on memory and I/O, and reasoning about tradeoffs before writing code.

Three canonical branches are covered here: [[Home/Computer Science/Data Structures/Data Structures|data structures]] organize data for efficient access, mutation, and iteration; [[Home/Computer Science/Algorithms/Algorithms|algorithms]] solve search, sorting, graph, and set problems with predictable cost; [[Home/Computer Science/Operating Systems/Operating Systems|operating systems]] explain privilege, memory, I/O, process, and thread boundaries. The practical payoff is making design decisions from the mechanism instead of discovering performance or isolation failures in production.

A concrete example: a code review reveals a nested loop checking membership in a `List<T>` — O(n²) per batch. Replacing the inner list with a `HashSet<T>` turns it into O(n) with constant-factor lookups. That is not optimization trivia — it is the difference between a batch job finishing in seconds versus timing out.

## Foundational paper routes

The useful question is not whether a paper is famous; it is which design mechanism it makes legible. These five routes cover ideas that recur across the vault:

| Paper | Mechanism to carry forward | Route |
| --- | --- | --- |
| Dijkstra, *Go To Statement Considered Harmful* (1968) | Control-flow structure makes correctness arguments tractable | [[Home/Computer Science/Algorithms/Algorithms\|Algorithms and correctness]] |
| Lamport, *Time, Clocks, and the Ordering of Events in a Distributed System* (1978) | A happens-before relation orders events without a global clock | [[Home/Software Architecture/Distributed Systems/Distributed Systems\|Distributed systems]] |
| Ghemawat, Gobioff, and Leung, *The Google File System* (2003) | Replication, leases, and large immutable chunks turn commodity-machine failure into an operating condition | [[Home/Data Persistence/Data Persistence\|Data persistence]] |
| DeCandia et al., *Dynamo* (2007) | Quorums, consistent hashing, and reconciliation trade strict coordination for availability | [[Home/Software Architecture/Distributed Systems/CAP theorem\|CAP and distributed storage]] |
| Vaswani et al., *Attention Is All You Need* (2017) | Self-attention replaces recurrence with parallel token-to-token interaction | [[Home/AI & ML/Machine Learning/Machine Learning\|machine learning]] |

![[System Design 101/b5b681658b3d7403f2670e7737f2ac279026a0736f33d48cf8e283661e663acc.png]]

The diagram is a reading map, not an authority or a required sequence. Start with the mechanism closest to the system you are building, then read the original paper to see the assumptions and failure model the summary leaves out.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Questions

> [!QUESTION]- When does algorithmic complexity matter less than constant factors?
> When input sizes are small and bounded (e.g., iterating over 10 HTTP headers), constant factors and cache locality dominate. A theoretically better algorithm with higher overhead (setup cost, memory indirection) can be slower than a simpler one on small inputs.
> This is why .NET's `Array.Sort` uses insertion sort for small subarrays inside its introspective sort implementation.

> [!QUESTION]- How do you decide between optimizing data structure choice versus algorithm choice?
> Start with the data structure. The right structure often eliminates the need for a clever algorithm — a `HashSet<T>` gives O(1) lookup without binary search, a `SortedSet<T>` gives ordered iteration without explicit sorting. Optimize the algorithm when the structure is fixed by external constraints (e.g., searching within a sorted array from an external source).

## References

- [Edsger Dijkstra — Go To Statement Considered Harmful](https://www.cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD215.html) — the original note connecting program structure to the ability to reason about execution.
- [Leslie Lamport — Time, Clocks, and the Ordering of Events in a Distributed System](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) — the primary source for happens-before ordering and logical clocks.
- [Sanjay Ghemawat, Howard Gobioff, and Shun-Tak Leung — The Google File System](https://research.google/pubs/the-google-file-system/) — the original GFS design and its workload assumptions.
- [Giuseppe DeCandia et al. — Dynamo](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) — the original availability-oriented key-value-store design.
- [Ashish Vaswani et al. — Attention Is All You Need](https://arxiv.org/abs/1706.03762) — the original Transformer architecture paper.
- [ByteByteGo System Design 101 — 25 papers every software engineer should read](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/25-papers-that-completely-transformed-the-computer-world.md) — editorial reading inventory used to seed the routes above; the original papers remain authoritative.
- [Big O cheat sheet](https://www.bigocheatsheet.com/) — Visual comparison of data structure and algorithm complexities.
- [Introduction to Algorithms (MIT OpenCourseWare)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — University-level CS fundamentals with lectures and problem sets.
- [Steve Yegge — Get That Job at Google](https://steve-yegge.blogspot.com/2008/03/get-that-job-at-google.html) — Practitioner perspective on why CS fundamentals matter in industry interviews and system design.
