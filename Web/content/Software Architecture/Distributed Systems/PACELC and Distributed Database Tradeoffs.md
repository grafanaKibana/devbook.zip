---
publish: true
created: 2026-07-16T16:55:27.094Z
modified: 2026-07-16T16:55:27.094Z
published: 2026-07-16T16:55:27.094Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Using PACELC to reason about partition behavior and normal-time latency versus consistency.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

[[CAP theorem]] constrains behavior during a network partition. PACELC adds the normal case: if there is a partition, choose availability or consistency; else, choose latency or consistency. The model is useful because database configuration changes both failure behavior and everyday request latency.

## Operation-first classification

Do not label an entire product `CP` or `AP`. Classify an operation and its chosen consistency level.

| Operation | Correctness requirement | Reasonable posture |
| --- | --- | --- |
| Reserve inventory | Do not confirm overlapping reservations | Quorum or leader confirmation; reject when safety cannot be proved |
| Read product recommendations | A stale result is acceptable | Read a nearby replica and repair asynchronously |
| Read own profile after update | The user should see their write | Session guarantee without global linearizability |
| Append a ledger entry | Preserve ordering and uniqueness | Strong write coordination, idempotency, and an authoritative store |

## Product mappings are configurations

SQL Server Availability Groups with synchronous commit lean toward consistency for protected writes, but failover mode and read routing change operation behavior. Cosmos DB exposes several consistency levels, so the same account can make different latency/freshness choices by configuration. Cassandra quorum values and topology determine whether a request favors local latency, overlap between read/write replica sets, or continued service during failures. Redis used as a cache often accepts staleness because an authoritative database repairs truth.

These are not permanent product labels. Record the concrete topology, quorum, read mode, region, and fallback policy.

## Concrete decision

For a multi-region profile service, writes go to the primary region and the writer receives a session token. The next read carries that token, preserving read-your-writes without waiting for every region. Anonymous recommendation reads use the nearest region and tolerate a five-minute freshness window. One product therefore uses two PACELC positions for two operations.

## References

- [Consistency Tradeoffs in Modern Distributed Database System Design](https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf) — Daniel Abadi's paper introducing the PACELC framing.
- [Azure Cosmos DB consistency levels](https://learn.microsoft.com/azure/cosmos-db/consistency-levels) — official product semantics for strong, bounded staleness, session, consistent prefix, and eventual consistency.
- [SQL Server availability modes](https://learn.microsoft.com/sql/database-engine/availability-groups/windows/availability-modes-always-on-availability-groups) — official synchronous and asynchronous commit behavior.
- [Apache Cassandra consistency](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#tunable-consistency) — official quorum and tunable-consistency model.
