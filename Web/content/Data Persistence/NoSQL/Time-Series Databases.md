---
publish: true
created: 2026-08-20T20:41:15.617Z
modified: 2026-08-25T13:45:27.874Z
published: 2026-08-25T13:45:27.874Z
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

A time-series database organizes timestamped observations for ordered range reads and time-window calculations. It earns its place when ingest rate, retention, compression, or repeated window queries dominate storage cost. A timestamp column alone is not enough. PostgreSQL with time partitioning may handle a moderate workload cleanly. A specialized engine becomes useful when series indexing, compressed chunks, and rollups are the limiting work.

# Series and Cardinality

In Prometheus, a series is the metric name plus its complete label set:

```text
http_request_duration_seconds_count{service="checkout",method="POST",status="200"} 8431 1721044800000
```

Changing one label value creates another series. Bounded labels such as `service` and `status` make useful dimensions. An unbounded label such as `user_id` can create a series per user, growing the index and active-series memory until ingestion or queries become too expensive.

# Storage Decisions

| Decision | Engine behavior | Failure mode when wrong |
|---|---|---|
| Series key | Index a stable metric name and bounded labels | Unbounded labels exhaust memory and index space |
| Time partition | Keep chunks or partitions ordered by time | Range reads and retention deletion scatter across storage |
| Retention | Drop whole expired chunks or partitions | Row-by-row expiry amplifies writes and compaction |
| Rollups | Persist lower-resolution aggregates | Long dashboards repeatedly scan raw samples |
| Late data | Define an allowed lateness window | Old samples rewrite sealed chunks or disappear from aggregates |

![[Assets/Data Persistence/Data Persistence-Time-Series Databases-18120000.jpg|theme-aware]]

The diagram is a workload selector. A metrics system does not automatically need a dedicated TSDB. Measured series cardinality, ingest rate, retention volume, and query windows decide.

# Rollups Cap Repeated Scans

At 10,000 samples per second, 15 days of raw retention contains about 13 billion samples. Recomputing every 5-minute rate from that raw history makes each dashboard revisit the same data. Time-partitioned raw chunks plus a persisted 5-minute rollup bound the query input, and expired raw data can leave as a whole partition. That saves read work but adds write amplification and a repair rule for samples that arrive after a rollup was built.

# References

- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [PostgreSQL table partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
