---
topic: [Programming]
subtopic: [NET]
summary: "The CLR's automatic memory manager reclaiming unreachable objects generationally."
level: ["4"]
priority: High
status: Ready to Repeat

publish: true
qard-deck: "Programming"
qard-topic: "NET/Runtime/Garbage Collector"
flashcard_uid: "4b72550a"
created: "2026-02-10T16:03:55.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

The .NET garbage collector manages memory for objects on the managed heap. It traces references from roots known to the runtime, keeps reachable objects, and reuses space occupied by unreachable ones. Cycles need no special treatment: two objects that reference each other are still collectible when nothing reachable points to either of them.

Automatic memory management removes manual `free` calls from ordinary managed code, but it does not remove lifetime design. Allocation rate affects how often collections run. Long-lived references keep entire object graphs alive, and moving collectors must occasionally pause managed execution while roots and references are made consistent.

The collector is generational because new objects usually become unreachable quickly. Most new heap objects enter generation 0. Survivors may move to generation 1 and later generation 2. Large objects normally enter the Large Object Heap (LOH), which is collected with generation 2 and is not compacted during ordinary collections. Reference stores also pass through a write barrier so younger generations can be collected without scanning every old object. See [[#Card tables and write barriers]].

The GC tracks managed memory, not the lifetime contract of an operating-system handle or native allocation. `IDisposable`, `using`, and `await using` release those resources deterministically. A finalizer is a delayed safety net for missed disposal, not normal cleanup. An unreachable finalizable object whose finalization has not been suppressed requires extra processing and normally survives until finalization has occurred and a later collection can reclaim it.

# Managed Heap

The managed heap is virtual memory reserved and committed by the runtime for managed objects. Workstation GC normally has one heap. Server GC can use multiple heaps so allocation and collection work scale across processors. With DATAS, the runtime can adapt the active heap count and budgets to application size. Application threads allocate from thread-local allocation contexts backed by those heaps rather than taking one global lock for every object.

Allocation on the Small Object Heap is usually a bump-pointer operation: advance the allocation pointer and initialize the object. The expensive part is retaining too much data or allocating fast enough to force frequent collections, not the pointer increment itself.

> [!INFO]
> **Segments and regions.** GC implementation details have changed across runtime versions and modes. Current runtimes can manage heap memory in smaller regions rather than relying only on a fixed segment layout. Generations, the SOH, the LOH, and the pinned object heap remain the stable application-level model. Segment or region size is not an application contract.

> [!TIP]
> Segment and region sizes are implementation-dependent. Performance decisions should use runtime counters and traces rather than inferred heap geometry.

Reducing temporary allocation can reduce generation 0 collection frequency. Reducing retained graphs matters more for full collections because every reachable object must still be considered. A low allocation rate does not compensate for an unbounded cache.

Compacting collections move survivors together and update references, which restores contiguous free space and often improves locality. Some heaps or regions are swept instead, leaving survivors in place and recording reusable gaps. Pinning can also prevent an otherwise movable object from being relocated.

The [Large Object Heap](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/large-object-heap) normally receives allocations of at least 85,000 bytes. Arrays are common LOH occupants, though any sufficiently large managed object can qualify. Smaller objects normally use the SOH.

> [!TIP]
> The runtime exposes a [**configurable LOH threshold**](https://learn.microsoft.com/en-us/dotnet/core/runtime-config/garbage-collector#large-object-heap-threshold). Raising it changes placement policy. It does not make large allocation or copy costs disappear.

# Reclaiming Memory

The runtime reports roots such as references in static fields, active stack frames, registers, and GC handles. The collector walks object-reference fields from those roots. Anything it cannot reach is eligible for reclamation, subject to finalization and other runtime lifetime rules.

For a compacting collection, the collector marks survivors, plans their new locations, fixes references, and moves the objects. The exact phase ordering and concurrency depend on GC mode and heap type. Code should depend on object identity and managed references, never a stable address unless a narrowly scoped pin explicitly provides one.

## Conditions that Trigger Garbage Collection

Collections can be triggered when:

- allocation crosses a generation's dynamically adjusted budget.
- the operating system or host reports memory pressure.
- the [GC.Collect](https://learn.microsoft.com/en-us/dotnet/api/system.gc.collect) API requests a collection.

Manual collection is rarely a repair for high memory use. It can promote survivors, interrupt background work, and add pauses while the references keeping memory alive remain unchanged. It belongs in measured, bounded cases such as coordinating one-time LOH compaction.

# GC Execution Model

```mermaid
graph TD
    subgraph ROOTS[GC Roots]
        R1[Static fields]
        R2[Stack variables]
        R3[CPU registers]
    end

    subgraph HEAP[Managed Heap before GC]
        A[Object A]
        B[Object B]
        C[Object C - unreachable]
        D[Object D]
        E[Object E - unreachable]
    end

    R1 --> A
    R2 --> B
    A --> D
    B --> D

    subgraph MARK[1 - Mark Phase]
        M1{Walk from roots}
        M1 -->|reachable| M2[Mark A B D as live]
        M1 -->|no references| M3[C and E stay unmarked]
    end

    subgraph RELOCATE[2 - Relocate Phase]
        R4[Compute new address for A B D]
        R4 --> R5[Rewrite every reference to point there]
        R5 --> R6[Nothing has moved yet]
    end

    subgraph COMPACT[3 - Compact Phase]
        CP1[Slide A B D down over the gaps]
        CP1 --> CP3[Space from C and E is reclaimed]
    end

    MARK --> RELOCATE --> COMPACT
```

## Generational Heap

```mermaid
graph LR
    subgraph GEN0[Gen 0 - Nursery]
        N1[New object X]
        N2[New object Y]
        N3[Temp variable Z]
    end

    subgraph GEN1[Gen 1 - Buffer]
        S1[Survived 1 GC]
    end

    subgraph GEN2[Gen 2 - Long-lived]
        L1[App-lifetime services]
        L2[Static caches]
    end

    GEN0 -->|X survives GC 0| GEN1
    GEN1 -->|Survives GC 1| GEN2
    N3 -.->|Unreachable - collected| GONE([Freed])

```

Collection duration has no useful universal range. It depends on the live graph, heap size, GC mode, allocation history, processor count, and memory pressure. A generation 0 collection on one workload can still matter less than a generation 2 collection on another, but measurements must come from the running application.

A compacting collection can be understood as four operations:

1. **Mark:** trace references from roots and identify the reachable objects.
2. **Plan relocation:** choose new addresses for survivors in the regions being compacted.
3. **Fix references and move:** update roots and object fields, then place survivors at their new addresses.
4. **Reclaim:** reuse the space left by unreachable objects. A swept region reclaims dead blocks without moving survivors, trading copy work for possible fragmentation.

# Root Objects

Roots are references supplied directly by the runtime rather than discovered by walking another managed object. They include references reported from active thread stacks and registers, static fields, GC handles, and runtime-owned structures.

A local variable is a root only while the JIT reports its reference as live. Lexical scope does not guarantee lifetime to the closing brace, and the JIT can extend or shorten the effective lifetime when doing so preserves observable behavior.

Finalization adds another lifetime step when an unreachable object is still registered for finalization. The runtime schedules it and keeps it reachable long enough for the finalizer to run. Reclamation normally requires a later collection. A successful dispose path can call `GC.SuppressFinalize` and avoid that pending-finalization path. The extra lifetime therefore applies to missed disposal or another path where finalization remains registered, not every disposed instance of a finalizable type.

# Object Generations

Generations let the collector examine a small, recently allocated part of the heap more often than long-lived data:

- **Generation 0** holds new SOH objects and is collected most frequently.
- **Generation 1** buffers objects between short-lived and long-lived populations.
- **Generation 2** holds long-lived objects and is included in full collections.

A generation 1 collection includes generations 0 and 1. A generation 2 collection includes all generations. Survivors often promote, although pinning and collector heuristics can keep an object in its current generation. The LOH and pinned object heap are logically collected with generation 2 even though their placement and compaction rules differ from the ordinary SOH.

## Card tables and write barriers

An old object can point to a young object, so roots alone are not enough for an ephemeral collection. The JIT inserts a **write barrier** around managed reference stores. When a store might create an old-to-young reference, the barrier marks the corresponding range in a **card table**. The next generation 0 or 1 collection scans the relevant dirty cards instead of walking the whole older generation. This remembered-set work is a small cost on reference writes that buys much cheaper young-generation collections.

## Boxing as a Hidden Allocation Source

Converting a value type to `object` or to an interface it implements usually creates a boxed heap object. Non-generic APIs and `params object[]` are common places for this allocation to hide. Modern interpolated-string handlers and generic formatting paths can avoid boxing, so string interpolation is not evidence by itself. A generic API can preserve the concrete value type and use constrained calls, but its implementation can still box by converting `T` to `object` or an interface value. Traces or allocation benchmarks confirm what the actual call path does.

## Latency Modes and Low-pause Regions

GC controls trade collection intrusiveness against throughput and memory use:

- **`GCSettings.LatencyMode`** selects a throughput- or latency-oriented policy. Low-latency modes belong around bounded critical windows because delaying some collections can increase memory use.
- **`GC.TryStartNoGCRegion(totalBytes)`** attempts to reserve enough allocation budget for a critical region. It can fail to enter the mode, and exceeding the budget can end the no-GC guarantee. `GC.EndNoGCRegion()` is valid only while that mode remains active.
- **DATAS** adapts server GC to application size and long-lived data. It is enabled by default starting with .NET 9, but explicit heap settings, runtime version, and deployment constraints still matter.

# Pitfalls

**LOH fragmentation.** Large objects are normally swept rather than compacted, so changing allocation sizes can leave gaps that later requests cannot reuse. `ArrayPool<T>` helps only when ownership, clearing, and retention are controlled. `CompactOnce` plus an induced collection is a measured maintenance action, not a routine allocation strategy.

**Finalizer backlog.** A blocking or expensive finalizer delays other finalizable objects and keeps their graphs alive. Deterministic disposal should perform normal cleanup, call `GC.SuppressFinalize` where the dispose pattern requires it, and leave the finalizer with the smallest safe native-resource release.

**Treating every pause as an allocation problem.** A large retained graph can make a full collection expensive even at a modest allocation rate. Traces should separate allocation pressure, survival, fragmentation, finalization, and suspension time before pooling or changing GC policy.

**Long-lived pins.** `fixed` and pinned `GCHandle` instances stop selected objects from moving and can obstruct compaction around them. Pins should be short-lived where possible. The pinned object heap is useful for objects allocated with a long-lived pinning intent. It does not make pinning free.

# Tradeoffs

| Mode | Operating behavior | Main cost | Useful fit |
| --- | --- | --- | --- |
| **Workstation** | Centers GC work around a single managed heap | Less parallel collection work | Smaller or interactive processes where footprint and responsiveness dominate |
| **Server** | Can use multiple heaps and dedicated GC threads. DATAS can adapt the active heap count and budgets | More memory and processor resources when parallelism expands | Multi-core workloads where collection throughput matters |
| **Background** | Performs much of generation 2 collection concurrently while foreground ephemeral collections can still run | Concurrent CPU and memory work. Some suspensions remain | Workloads where long blocking generation 2 pauses are disruptive |
| **SustainedLowLatency** | Avoids some blocking generation 2 collections while background collection remains available | Higher memory pressure if used too long | A bounded latency-critical window with a tested fallback |

The runtime defaults are the starting point. A mode change is justified only when production-like counters and traces show that its tradeoff addresses the measured bottleneck. Reducing unnecessary retention is often more effective than forcing collections or changing a switch.

# Questions

<!-- qard-id: 43db5943-c33e-4a19-9cb1-dbbdacc1e6ec -->
> [!qard]- How does the .NET garbage collector decide what managed memory it can reclaim?
> The GC can reclaim any managed object that is no longer reachable from a root. Reachability alone decides: an object that is still reachable stays, even if the program will never use it again.
>
> 1. **Start from roots.** Roots are references the runtime knows about directly. They include static fields, local variables and CPU registers of running methods while the JIT reports them as live, and GC handles.
> 2. **Mark reachable objects.** The GC follows reference fields from the roots, then from every object it reaches. Each object found this way is live.
> 3. **Treat everything else as reclaimable.** An object that was not reached is eligible for reclamation. Cycles do not keep objects alive: two objects that refer only to each other are collectible once nothing reachable points to either.
> 
> Qualifications:
>
> - **Generations:** a collection reclaims objects only in the generations it collects. A young-generation collection also inspects the older-heap ranges that CoreCLR's write barriers recorded in a card table as possibly pointing to young objects. It does not scan the whole older generation, and it does not reclaim older objects. An unreachable generation 2 object is therefore reclaimed only by a collection that includes generation 2.
> - **Finalization:** an unreachable object whose finalizer is still registered survives until its finalizer has run. A later collection normally reclaims it.
> - **Timing:** eligibility does not mean immediate reclamation or memory returned to the operating system.
> 
> The reachability decision covers managed memory only. Native handles and buffers need explicit cleanup, typically through `IDisposable` and `using`.
>
> [Microsoft: Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) · [dotnet/runtime: CoreCLR GC write barriers](https://github.com/dotnet/runtime/blob/1bde9a53cb55127c1e154a2e98a7332477280abf/docs/design/coreclr/jit/GC-write-barriers.md#L25-L62)

<!-- qard-id: 2ba4053d-0180-4c76-895f-5d1c1d3b988a -->
> [!qard]- How do generations make .NET garbage collection more efficient?
> Generations let the GC collect the small, recently allocated part of the heap often and the large, long-lived part rarely. This pays off because most objects become unreachable soon after allocation. A collection limited to new objects reclaims much of the garbage while examining little of the heap.
>
> - **Generation 0:** most new objects start here. It is collected most often, and a collection typically finds many of its objects already unreachable.
> - **Generation 1:** objects that survived a generation 0 collection. It buffers between short-lived and long-lived objects. A generation 1 collection also collects generation 0.
> - **Generation 2:** long-lived objects, such as application-lifetime services and caches. A generation 2 collection is a full collection. It includes every generation and must consider every reachable object, so its work grows with the whole live heap. Its actual cost depends on the workload, heap size and GC mode.
> 
> Survivors of a generation 0 or 1 collection usually move up one generation, although pinning and collector heuristics can keep an object in its current generation. Objects that survive a generation 2 collection stay in generation 2. Large objects, normally 85,000 bytes or more, go to the Large Object Heap, which is collected together with generation 2.
>
> The design has two consequences:
>
> - A young collection does not walk the whole older generation, so references from old objects to young ones must be recorded separately. The runtime records them with write barriers and a card table, and the young collection inspects only the recorded older-heap ranges.
> - An object that lives just long enough to be promoted is then reclaimed only by a less frequent collection that includes its new generation.
> 
> [Microsoft: Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) · [dotnet/runtime: CoreCLR GC write barriers](https://github.com/dotnet/runtime/blob/1bde9a53cb55127c1e154a2e98a7332477280abf/docs/design/coreclr/jit/GC-write-barriers.md#L25-L62)

<!-- qard-id: 4712e926-745d-4522-ae9e-bf0116b7f914 -->
> [!qard]- How does the .NET GC find old-to-young references during a young-generation collection?
> The GC relies on write barriers that maintain a card table. When code stores a reference into a heap object, the write barrier can mark the area of the older heap that now points to young objects. A young-generation collection scans those marked areas, in addition to the roots, instead of walking the entire older generation.
>
> This is needed because a young object can be reachable only through a field of an older object. Roots alone would miss that reference, and the collector would reclaim a live object. Scanning every older object on each young collection would make it nearly as expensive as a full collection.
>
> In CoreCLR the process is:
>
> 1. The JIT inserts a write barrier around managed reference stores into heap objects.
> 2. When a store may create a reference from an older generation to a younger one, the barrier marks the matching card-table entry. Each entry covers a small range of heap memory.
> 3. A generation 0 or 1 collection scans the objects in dirty card ranges, follows the young references found there, and keeps those young objects alive.
> 
> The cost is a little extra work on reference writes, in exchange for young collections that do not walk the whole older heap. Which stores the barrier marks, how much memory each card covers and the exact scanning work are CoreCLR implementation details. They depend on runtime version and collection type and are not a .NET API contract.
>
> [dotnet/runtime: CoreCLR GC write barriers](https://github.com/dotnet/runtime/blob/1bde9a53cb55127c1e154a2e98a7332477280abf/docs/design/coreclr/jit/GC-write-barriers.md#L25-L62) · [Microsoft: Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)

<!-- qard-id: d0ed692f-3776-4bd9-9f1a-c5d28faaf4d7 -->
> [!qard]- Why can process memory stay high after a generation 2 collection?
> A generation 2 collection frees space only from unreachable managed objects, and freed space is not necessarily returned to the operating system. Memory can stay high for several independent reasons:
>
> - **Live retention:** objects still reachable from roots, such as caches or static fields, survive every collection. The memory stays until the reference keeping the graph alive is removed.
> - **Fragmentation:** pinned objects, and areas that are swept rather than compacted, can leave free gaps between survivors. The Large Object Heap in ordinary collections is one such area. The heap keeps that space, but new allocations may not fit into it.
> - **Retained capacity:** the GC can keep memory committed after a collection so later allocations can reuse it. Committed heap size can therefore exceed the size of live objects.
> - **Memory outside the GC heap:** native allocations and other non-GC memory in the process are not reclaimed by a managed collection.
> 
> Live object bytes, committed GC memory and process working set are different measurements, so a drop in one need not appear in another. Runtime counters and memory traces separate these causes before code or GC settings are changed. A large live heap points to retention. Much free or committed space relative to live objects points to fragmentation or retained capacity.
>
> [Microsoft: Garbage collection and performance](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/performance)

# References

- [Fundamentals of garbage collection](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals)
- [Pro .NET Memory Management](https://prodotnetmemory.com/)
- [Maoni Stephens' blog](https://maoni0.medium.com/)
