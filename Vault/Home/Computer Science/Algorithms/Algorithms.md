---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Step-by-step problem-solving procedures compared by runtime, memory, and complexity using Big O."
tags:
  - FolderNote
publish: true
level:
  - '4'
status: Creation
priority: High
---

Algorithms are step-by-step procedures for solving problems with predictable behavior as input grows. In practice, algorithm choice is a tradeoff between runtime, memory usage, implementation complexity, and failure modes under real workloads.

Complexity analysis ([[Home/Computer Science/Big O Notation|Big O]]) is the primary tool for comparing algorithms without benchmarking. It captures growth rate: O(n log n) sorting scales to millions of items where O(n²) does not. But Big O ignores constant factors, cache behavior, and real-world input distributions — so production decisions combine theoretical analysis with profiling on representative data.

Concrete example: for repeated membership checks in a large list of ids, sorting once and using binary search gives fast lookups with low memory overhead. For one-off checks on unsorted data, a linear scan is usually simpler and can be faster overall because there is no preprocessing cost.

# Algorithms as system-design mechanisms

System-design diagrams often hide the algorithm inside a box labelled “cache,” “scheduler,” or “database.” Naming the mechanism exposes the cost you are accepting:

| Mechanism | System use | Cost or failure boundary |
| --- | --- | --- |
| Hashing | Cache keys, partition selection, deduplication | Collisions require equality checks; changing a naive modulo shard count remaps most keys |
| Consistent hashing | Distributing keys across changing node sets | Reduces remapping; virtual nodes or another weighted ownership scheme can reduce skew, which still requires load observation |
| Trees and prefix search | Database indexes, routing tables, autocomplete | Shape and storage model determine update cost and range behavior |
| Graph traversal | Dependency analysis, routing, recommendations | Cycles require visited-state; dense graphs can dominate memory |
| Heap-backed priority queues | Scheduling, timers, top-k selection | Efficient best-item access does not provide sorted iteration |
| Bloom filters | Skipping absent database or object-store reads | False positives perform unnecessary work; false negatives are forbidden by construction |
| Token buckets | Rate limiting with bounded bursts | A shared bucket needs atomic coordination; per-node buckets only approximate a global limit |
| Consensus | Replicated metadata and leader election | Safety requires quorum communication; a partition that cannot form a quorum loses progress while the quorum side can continue |

![[System Design 101/06a50eddfed4615e1bfd8c65bfd61dbe7d4ce0c405fa587317803bd8ea2262f2.jpg]]

The visual is a topic inventory. Its priority stars are editorial, not a workload-independent ranking; use the mechanism, invariant, and failure boundary above to decide what a design actually needs.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

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

# References

- [Big O notation (Wikipedia)](https://en.wikipedia.org/wiki/Big_O_notation) — orientation to asymptotic upper bounds and the related big-Omega and big-Theta notation; useful terminology reference, not the primary algorithm authority.
- [Algorithm design and analysis (MIT OpenCourseWare)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — primary course lectures, notes, and exercises for designing and analyzing search, sorting, graph, and dynamic-programming algorithms.
- [Burton Bloom — Space/time trade-offs in hash coding with allowable errors](https://doi.org/10.1145/362686.362692) — the original Bloom-filter paper and its false-positive tradeoff.
- [Diego Ongaro and John Ousterhout — In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf) — the primary Raft paper describing quorum-based replicated state.
- [ByteByteGo System Design 101 — Algorithms you should know before system design interviews](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/algorithms-you-should-know-before-taking-system-design-interviews.md) — editorial inventory behind the embedded visual; the mechanism table supplies the operational boundaries.
- [Nearly all binary searches and mergesorts are broken](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/) — Google engineering analysis of integer overflow in a textbook midpoint calculation and why proof assumptions must match machine arithmetic.
