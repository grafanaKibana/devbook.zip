---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Measuring capacity, locating saturation, and proving that a scaling change improves throughput economically."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Scalability operations turn “add resources” into a measurable experiment. [[Scalability Patterns]] describes architectural moves; this note defines capacity, finds the current bottleneck, and verifies whether a change improves throughput, latency, reliability, and cost for a stated traffic mix.

## Measurement contract

- **Offered load:** work presented to the system.
- **Throughput:** completed useful work per unit time.
- **Latency:** a distribution such as p50, p95, and p99.
- **Capacity:** highest sustained offered load that still meets latency, error, and resource limits.
- **Saturation:** constrained resource or queue that stops throughput from rising.
- **Scalability:** how capacity and unit cost change after adding resources or changing architecture.

Define success before the test: `2x ASP.NET Core instances should deliver at least 1.7x completed checkout throughput, p99 below 400 ms, errors below 0.1%, and database connections below 80% of the limit for 30 minutes`.

## Bottleneck experiment

At 1,000 RPS, increase load in steps while recording request rate, completed orders, latency, errors, CPU, allocations, thread-pool queue, database connections, lock wait, cache hit ratio, dependency latency, and queue age. If application CPU reaches 85% and throughput rises when instances double, horizontal scale addressed the current bottleneck. If database lock wait becomes dominant at 2,500 RPS, more application replicas now increase contention.

Use `dotnet-counters` for runtime counters, OpenTelemetry for request/dependency traces and metrics, and the database's own wait and query telemetry. A low application CPU value does not prove spare capacity when threads are blocked on connections.

## Cost and rollback

Track cost per completed operation, not only instance count. Cache, replicas, queues, and sharding move cost into invalidation, replication, backlog, and routing. Keep a rollback threshold when the change worsens tail latency or errors. Re-run the same workload after each change because the bottleneck moves.

## References

- [Google SRE monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/) — primary latency, traffic, errors, and saturation signals.
- [OpenTelemetry metrics](https://opentelemetry.io/docs/concepts/signals/metrics/) — official metric instruments and aggregation model.
- [.NET diagnostic tools](https://learn.microsoft.com/dotnet/core/diagnostics/) — official counters, traces, dumps, and performance-investigation tools.
- [Azure load testing](https://learn.microsoft.com/azure/app-testing/load-testing/overview-what-is-azure-load-testing) — official distributed load-test and monitoring workflow.
