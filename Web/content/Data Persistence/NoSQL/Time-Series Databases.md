---
publish: true
created: 2026-07-16T14:47:47.202Z
modified: 2026-07-16T14:47:47.203Z
published: 2026-07-16T14:47:47.203Z
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: Storage engines for append-heavy series, time-range scans, retention, and rollups.
level:
  - "3"
priority: Medium
status: Creation
---

# Intro

A time-series database stores timestamped samples grouped into stable series. It earns its place when ingestion, retention, compression, and time-window aggregates dominate the workload; a timestamp column alone does not require one. PostgreSQL with time partitioning can be enough at moderate cardinality and ingestion rates. A specialized TSDB becomes useful when label indexing, compressed chunks, and long-range rollups are the bottleneck.

## Series and Cardinality

In Prometheus, a series is the metric name plus its complete label set:

```text
http_request_duration_seconds_count{service="checkout",method="POST",status="200"} 8431 1721044800000
```

Changing any label value creates a different series. Bounded labels such as `service` and `status` are useful dimensions. An unbounded label such as `user_id` creates a series per user, expanding the index and active-series memory until ingestion or queries fail.

## Storage Decisions

| Decision | Engine behavior | Failure mode when wrong |
|---|---|---|
| Series key | Index a stable metric name and bounded labels | Unbounded labels exhaust memory and index space |
| Time partition | Keep chunks or partitions ordered by time | Range reads and retention deletion scatter across storage |
| Retention | Drop whole expired chunks or partitions | Row-by-row expiry amplifies writes and compaction |
| Rollups | Persist lower-resolution aggregates | Long dashboards repeatedly scan raw samples |
| Late data | Define an allowed lateness window | Old samples rewrite sealed chunks or disappear from aggregates |

![[Assets/System Design 101/a7e57bb16b06468abfed6f61e60d15c352d8538cabb32fe4c20870ac1cb8e02c.jpg]]

The diagram is a workload selector, not a rule that every metrics system needs a dedicated TSDB. The decision turns on measured cardinality, ingest rate, retention volume, and query windows.

## Concrete Boundary

At 10,000 samples per second, a 15-day raw retention window contains about 13 billion samples. If most dashboards query 5-minute rates over 30 days, keeping only raw samples forces repeated wide scans. Time-partitioned raw chunks plus a persisted 5-minute rollup make retention a partition drop and bound the dashboard input. The cost is extra write work and the need to define how late samples repair an already-built rollup.

## References

- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/) — defines a series by metric name and label set, including the sample timestamp and value.
- [Prometheus instrumentation practices](https://prometheus.io/docs/practices/instrumentation/) — explains label cardinality and why unbounded dimensions should not become labels.
- [PostgreSQL table partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html) — primary reference for time-range partitions and dropping old partitions without row-by-row deletion.
