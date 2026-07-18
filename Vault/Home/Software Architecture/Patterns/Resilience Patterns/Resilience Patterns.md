---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Patterns that keep distributed systems stable when dependencies degrade by controlling how failure propagates."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "3"
status: Done
---

# Intro

Resilience patterns protect distributed systems from cascading failures by controlling how services behave when dependencies degrade. The core insight is that partial failure is the normal state — something is always slow, overloaded, or down — and uncontrolled failure propagation turns a single slow dependency into a system-wide outage. Without explicit resilience boundaries, threads, sockets, and retries pile up until healthy parts of the system also degrade.

The two foundational patterns here are [[Circuit Breaker]] (stop calling a failing dependency and fail fast instead of waiting) and [[Rate Limiting]] (cap request volume so one caller cannot exhaust shared resources). In production .NET systems, these compose into a resilience stack together with timeouts, retries with exponential backoff, and fallbacks — each layer handling a different failure mode. Polly and `Microsoft.Extensions.Resilience` wire these layers into a single `HttpClient` pipeline.

## Choose a response by failure and overload

![[System Design 101/3bd4751a389d429287b23198ee7fbd906f1c994ec01b88dd3d079bc1a5e6d64f.jpg]]

| Signal | Response | Failure contained | New cost |
|---|---|---|---|
| One call exceeds its latency budget | Timeout | Releases caller capacity and bounds tail latency | Can abandon work that still completes downstream |
| A safe operation fails transiently | Retry with capped exponential backoff and jitter | Hides brief transport or overload faults | Adds load and latency; can duplicate unsafe writes |
| A dependency fails persistently | [[Circuit Breaker]] | Stops repeated calls and lets the dependency recover | Fast failures during the open interval |
| One workload exhausts shared resources | Bulkhead | Preserves capacity for other workloads | Reserved capacity may sit idle |
| Incoming demand exceeds safe throughput | [[Rate Limiting]] or load shedding | Rejects work before queues and latency grow without bound | Some valid work receives `429` or degraded service |
| Producer outruns consumer | Backpressure | Makes demand follow downstream capacity | Propagates slowdown or requires bounded buffering |
| Optional capability fails | Fallback or graceful degradation | Keeps the critical path available | Stale, partial, or lower-quality output |

"Let it crash" is a supervision choice, not permission to ignore a dependency failure. It is safe only when a supervisor restarts an isolated unit, state recovery is defined, crash loops are bounded, and the caller still receives a controlled outcome.

## Map mechanisms to failure domain and recovery

Fault tolerance starts by naming the unit that may fail and the recovery objective:

| Failure domain | Mechanism | Continues during failure? | Recovery requirement |
|---|---|---|---|
| Process or instance | Multiple instances plus health-aware load balancing | Yes, if capacity remains and health checks remove the failed instance | Replace capacity and preserve request idempotency |
| Availability zone | Replicas spread across zones | Yes, if quorum and routing tolerate one zone loss | Rebuild replicas without overloading survivors |
| Region | Active-passive or active-active regional design | Depends on failover mode and data replication | Define RTO, RPO, DNS/routing convergence, and split-brain controls |
| Storage device | Mirroring, erasure coding, or replicated storage | Depends on redundancy level; RAID 0 provides none | Replace media and rebuild before another failure |
| Dependency overload | Admission control, queues, backpressure, and degradation | Critical functions can continue | Drain bounded work and restore optional features gradually |
| Software defect | Isolation, canary rollout, rollback, and feature flag | Only outside the affected blast radius | Stop rollout, revert safely, and preserve compatible state |

Replication is not a backup: replicas can copy deletion, corruption, or a bad deployment. Monitoring is not fault tolerance either; it detects conditions so automated or human recovery can act. Prove each mechanism by exercising the stated failure domain and measuring recovery time and data loss.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Release It! Second Edition -- foundational patterns for production resilience covering circuit breakers, bulkheads, timeouts, and steady-state design (Michael Nygard, Pragmatic Bookshelf)](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Resiliency patterns -- cloud design patterns for retry, circuit breaker, bulkhead, and health endpoint monitoring (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/category/resiliency)
- [Resiliency patterns -- ByteByteGo visual orientation to timeouts, retries, circuit breakers, load control, bulkheads, and backpressure; the table above supplies their safety conditions](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/resiliency-patterns.md)
- [A cheat sheet for designing fault-tolerant systems -- ByteByteGo inventory used here to separate redundancy, failover, degradation, and observability by failure domain](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/a-cheat-sheet-for-designing-fault-tolerant-systems.md)
