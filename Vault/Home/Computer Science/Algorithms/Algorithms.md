---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Step-by-step problem-solving procedures compared by runtime, memory, and complexity using Big O."
tags: [FolderNote]
publish: true
level:
  - "4"
status: Creation
priority: High
---

An algorithm is a finite procedure that turns an input into an output. Choosing one means deciding which costs matter for the workload: running time, memory, implementation risk, or behavior on hostile input.

Complexity analysis ([[Home/Computer Science/Big O Notation|Big O]]) compares growth rates before any code is benchmarked. An O(n log n) sort can remain practical at input sizes where O(n²) work does not. Big O says nothing about constant factors or cache behavior, though, and it cannot predict the data a production system will receive. The final choice still needs measurements on representative inputs.

Consider membership checks against a large list of IDs. Repeated queries can justify sorting once and using binary search. A single query usually cannot: the preprocessing costs more than a plain linear scan saves.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Algorithms Inside Systems

System-design diagrams hide algorithms inside boxes labelled “cache,” “scheduler,” or “database.” Naming the mechanism makes its cost and failure boundary visible.

| Mechanism | System use | Cost or failure boundary |
| --- | --- | --- |
| Hashing | Cache keys, partition selection, deduplication | Collisions require equality checks. Changing a naive modulo shard count remaps most keys |
| Consistent hashing | Distributing keys across changing node sets | Reduces remapping. Virtual nodes or another weighted ownership scheme can reduce skew, which still requires load observation |
| Trees and prefix search | Database indexes, routing tables, autocomplete | Shape and storage model determine update cost and range behavior |
| Graph traversal | Dependency analysis, routing, recommendations | Cycles require visited-state. Dense graphs can dominate memory |
| Heap-backed priority queues | Scheduling, timers, top-k selection | Efficient best-item access does not provide sorted iteration |
| Bloom filters | Skipping absent database or object-store reads | False positives perform unnecessary work. False negatives are forbidden by construction |
| Token buckets | Rate limiting with bounded bursts | A shared bucket needs atomic coordination. Per-node buckets only approximate a global limit |
| Consensus | Replicated metadata and leader election | Safety requires quorum communication. A partition that cannot form a quorum loses progress while the quorum side can continue |

![[Computer Science/Computer Science-Algorithms-18120000.jpg]]

The visual is a topic inventory, not a universal priority ranking. A design decision depends on the mechanism's invariant and where it fails under the actual workload.

# References

- [MIT 6.006 Introduction to Algorithms](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)
