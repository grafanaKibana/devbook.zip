---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/runtime/runtime/","tags":["FolderNote"],"noteIcon":"3"}
---


# Intro

The .NET runtime (Common Language Runtime / CLR) is the execution engine that makes managed code work: it compiles IL to native code via JIT, manages memory through garbage collection, enforces type safety, and handles threading. Understanding the runtime matters for any senior .NET developer because most production performance issues — latency spikes, memory growth, thread pool starvation — are runtime problems, not application logic bugs.

Three areas are covered here: the **CLR itself** (how code gets compiled and executed), **garbage collection** (how memory is managed, GC modes, and tuning levers), and **memory leaks** (how managed code still leaks and how to diagnose it). The common thread is that the runtime automates most things, but the edge cases where automation breaks down are exactly the scenarios that cause production incidents.

A practical example: your API handles 1000 req/s fine in testing. In production under sustained load, P99 latency spikes to 2 seconds every 30 seconds. The cause is Gen2 GC pauses from large object heap allocations you never noticed in dev. Diagnosing this requires understanding GC generations, the large object heap threshold, and how to interpret GC event traces.

## Questions

> [!QUESTION]- What does the CLR do when your application starts, and why does startup behavior matter?
> The CLR loads assemblies, verifies IL safety, JIT-compiles methods on first call (or uses tiered compilation to optimize hot paths later), sets up the GC, and initializes the thread pool.
> This matters because startup latency, JIT warmup effects, and thread pool sizing all affect real-world behavior — especially for serverless and containerized deployments with cold starts.

> [!QUESTION]- How does garbage collection affect production latency, and what are the main tuning levers?
> GC pauses application threads (in workstation GC) or background-collects (in server GC) to reclaim memory. Gen0/Gen1 collections are fast; Gen2 collections are expensive and can cause visible latency spikes.
> Main tuning levers: choose Server vs Workstation GC mode, minimize large object heap allocations (objects over 85KB), reduce Gen2 promotion rates by controlling object lifetimes, and use `GC.TryStartNoGCRegion` for latency-critical paths.
> Always measure with GC event traces (dotnet-counters, PerfView) before tuning — premature GC optimization often makes things worse.

> [!QUESTION]- Can managed code have memory leaks, and what are the common causes?
> Yes. Common causes: event handler subscriptions never unsubscribed, static collections that grow indefinitely, closures capturing references unexpectedly, and finalizer queue stalls blocking reclamation.
> These are not OS-level leaks but logical leaks — the GC cannot collect objects that are still reachable through a live reference chain, even if the application no longer needs them.

## Links

- [.NET runtime overview (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/clr) — CLR architecture and execution model.
- [Garbage collection fundamentals (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals) — GC generations, modes, and behavior.
- [Memory management and garbage collection (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/) — Full GC documentation hub.
- [Diagnosing memory leaks with dotnet-dump (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-memory-leak) — Step-by-step leak diagnosis.
- [Pro .NET Memory Management (Konrad Kokosa)](https://prodotnetmemory.com/) — Practitioner deep-dive into .NET memory internals and GC tuning.
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET\|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/Runtime/Common Language Runtime\|Common Language Runtime]]
> - [[Software Engineering/01 Programming/NET/Runtime/Garbage Collector\|Garbage Collector]]
> - [[Software Engineering/01 Programming/NET/Runtime/Memory Leaks\|Memory Leaks]]
<!-- whats-next:end -->
