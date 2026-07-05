---
publish: true
created: 2026-07-05T10:53:40.607+03:00
modified: 2026-07-05T15:49:34.447+03:00
---

# Intro

Replication means keeping copies of the same data on multiple nodes. You do it for three reasons: spread read load across replicas, survive node failures without downtime, and recover from disasters by having data in a separate region. The hard part isn't copying a static snapshot. It's propagating every subsequent write to all replicas correctly while nodes crash, networks partition, and clients read concurrently. Get it wrong and you get stale reads, lost writes, or two nodes that both think they're the primary.

## Replication Models

### Single-Leader (Leader-Follower)

All writes go to one designated node (the leader). Replicas receive a stream of changes and apply them in order, serving read traffic. This is the default model for PostgreSQL (streaming replication), MySQL (binlog replication), SQL Server Always On Availability Groups (AG replicates transaction log records to secondaries; WSFC provides health detection, quorum, and failover orchestration), and MongoDB replica sets.

Reads can be routed to replicas using `ApplicationIntent=ReadOnly` in SQL Server connection strings, or by pointing read-heavy workloads at a replica endpoint. Write throughput is bounded by the single leader; you can't scale writes by adding replicas.

Failover requires electing a new leader. SQL Server uses Windows Server Failover Clustering (WSFC) quorum; PostgreSQL uses Patroni or Repmgr. A quorum requirement (majority of nodes must agree) prevents split-brain during network partitions.

### Multi-Leader

Multiple nodes accept writes independently and propagate changes to each other. Used by CouchDB, and SQL Server's peer-to-peer transactional replication. The benefit is write availability across datacenters: a write to the EU node doesn't wait for the US node to acknowledge.

The cost is mandatory conflict resolution. If two leaders accept a write to the same row concurrently, you have a conflict. Common strategies:

- **Last-write-wins (LWW)**: keep the write with the higher timestamp. Simple, but lossy. The other write is silently discarded. Dangerous for financial or inventory data.
- **CRDTs**: data structures designed to merge automatically (counters, sets). Only works for specific data shapes.
- **Application-level resolution**: the application receives both versions and decides. Most flexible, most work.

In SQL Server peer-to-peer transactional replication, the recommended practice is write partitioning (each node owns a non-overlapping subset of rows). Peer-to-peer replication offers conflict detection but is not a general-purpose conflict resolution platform like CRDTs; avoiding same-row writes across nodes is the primary design constraint.

### Leaderless (Dynamo-style)

Any node accepts reads and writes. Consistency is achieved through quorums: with N replicas, a write must succeed on W nodes and a read must query R nodes, where W + R > N. Used by Cassandra, DynamoDB, and Riak.

Divergence between nodes is reconciled by two background processes: read repair (a read that detects a stale replica pushes the latest value back) and anti-entropy (a background process continuously compares and syncs nodes). Quorum does not guarantee strong consistency if writes overlap. Two concurrent writes can each reach a different quorum majority.

### Model Comparison

| Dimension | Single-Leader | Multi-Leader | Leaderless |
|---|---|---|---|
| Write scaling | Bounded by leader | Multiple write points | Any node |
| Conflict handling | None needed | Mandatory | Quorum + repair |
| Consistency | Strong (sync) or eventual (async) | Eventual | Tunable via W/R/N |
| Failover complexity | Leader election required | Automatic | No election needed |
| Typical use | PostgreSQL, SQL Server AG | CouchDB, geo-distributed | Cassandra, DynamoDB |

## Replication Lag

Asynchronous replication means replicas are always slightly behind the leader. This lag creates three canonical anomalies (from DDIA Ch. 5):

**1. Read-your-writes**: a user submits a form, then immediately reloads the page. The read hits a stale replica and the user sees their own write disappear. Fix: route reads to the leader for a short window after a write, or track the LSN of the last write and wait for the replica to catch up (`pg_wait_for_lsn` in PostgreSQL, causal consistency tokens in MongoDB).

**2. Monotonic reads**: a user refreshes twice and sees newer data on the first refresh, then older data on the second (two requests hit different replicas). Fix: sticky sessions. Pin a user to the same replica for the duration of a session.

**3. Consistent prefix reads**: causally related writes appear out of order on a replica. A reply appears before the original message. Fix: route causally related writes to the same partition so they're applied in order.

**Sync vs async tradeoff**: synchronous replication means the leader waits for at least one replica to confirm before acknowledging the write. Zero data loss on failover, but every write pays the round-trip latency to the replica. Asynchronous replication acknowledges immediately: lower latency, but any writes not yet replicated are lost if the leader crashes before they propagate. Most production systems use async with a semi-sync option (one synchronous replica for failover safety).

## CAP and PACELC

The sync/async and leader-model choices above are all instances of one theorem. **CAP** says that when a network **P**artition splits your replicas, you must choose between **C**onsistency (reject reads/writes that can't be coordinated) and **A**vailability (keep serving, accept divergence) — you cannot have both _during a partition_. A single-leader system that refuses writes when it can't reach a quorum is **CP**; a leaderless Dynamo-style system that keeps accepting writes and reconciles later is **AP**.

CAP only describes the partition case, which is why **PACELC** is the more useful framing: _if_ **P**artition, choose **A**vailability or **C**onsistency; **E**lse (normal operation) choose **L**atency or **C**onsistency. Synchronous replication is the "**C** over **L**" choice (pay latency for consistency); async is "**L** over **C**" (faster, but stale reads). Most SQL setups are **PC/EC**-leaning (consistency-first); Cassandra/DynamoDB default to **PA/EL** (availability- and latency-first). This is the lens behind every model and mode in this note — see [[CAP theorem]] for the full treatment.

## Tradeoffs

Replication and sharding solve different problems. Reaching for sharding before exhausting replication is a common over-engineering mistake.

| Dimension | Replication | Sharding |
|---|---|---|
| What it solves | Read throughput, HA, DR | Write throughput, dataset size |
| Write scaling | Writes still bottleneck at leader | Writes distributed across shards |
| Consistency | Eventual (async) or strong (sync) | Cross-shard transactions are complex |
| Operational complexity | Medium | High |
| When to reach for | Read bottleneck, HA requirement | Write or storage bottleneck |

Typical scaling progression: vertical scale → read replicas → caching layer → CQRS (separate read/write models) → sharding. Most applications never need sharding.

## Pitfalls

**Split-brain**: a network partition causes the old primary and a newly promoted secondary to both accept writes simultaneously. Writes diverge and reconciliation is painful or impossible. Mitigation: quorum-based leader election (a node needs majority votes to become primary), plus fencing (STONITH, Shoot The Other Node In The Head) to forcibly terminate the old primary before the new one starts accepting writes.

**Replication lag as silent data corruption**: a replica appears healthy in monitoring but is 30 seconds behind. Reads return stale data with no error. Mitigation: monitor replication lag metrics (`pg_stat_replication` in PostgreSQL, `sys.dm_hadr_database_replica_states` in SQL Server), alert on lag exceeding your SLA threshold, and expose lag in health checks.

**Connection pool not refreshing after failover**: infrastructure failover completes in 30 seconds, but the application holds pooled connections to the old primary's IP. Requests fail until the pool times out. Mitigation: short DNS TTL on the cluster endpoint, connection pool validation on borrow, or a proxy layer (PgBouncer, RDS Proxy, Azure SQL connection retry policy) that handles reconnection transparently.

**Replication slot accumulation (PostgreSQL)**: a replica goes offline but its replication slot remains active. PostgreSQL holds all WAL segments since the slot's last confirmed LSN, causing disk to fill on the primary. Mitigation: monitor `pg_replication_slots` for inactive slots, set `max_slot_wal_keep_size` to cap WAL retention, and drop slots for replicas that have been offline beyond your retention window.

**Last-write-wins data loss**: in multi-leader or leaderless setups using LWW, concurrent writes to the same key silently discard one of them. No error is returned to the client. Mitigation: use CRDTs for data shapes that support them, or implement application-level conflict detection (version vectors, conditional writes) for critical data like account balances or inventory counts.

## Questions

> [!QUESTION]- What are the three replication lag anomalies, and how do you mitigate each?
>
> - **Read-your-writes**: user writes then reads from a stale replica and sees their write missing. Fix: route post-write reads to the leader for a short window, or use LSN/timestamp tracking to wait for the replica to catch up.
> - **Monotonic reads**: user sees newer data on one request, then older data on the next (different replicas). Fix: sticky sessions. Pin the user to the same replica.
> - **Consistent prefix reads**: causally related writes appear out of order (a reply before the original message). Fix: route causally related writes to the same partition so ordering is preserved.

> [!QUESTION]- When would you choose synchronous vs asynchronous replication?
>
> - **Synchronous**: when zero data loss is a hard requirement (financial transactions, audit logs). The leader waits for replica acknowledgment before confirming the write. Cost: every write pays the replica round-trip latency.
> - **Asynchronous**: when write latency matters more than guaranteed durability. Replicas may lag; any unconfirmed writes are lost if the leader crashes.
> - Most production systems use async replication with one semi-synchronous replica for failover safety. SQL Server Always On supports both modes per replica. PostgreSQL `synchronous_standby_names` controls which standbys must confirm before commit.

> [!QUESTION]- How does split-brain occur and how is it prevented?
>
> - A network partition isolates the primary from the rest of the cluster. A quorum of remaining nodes elects a new primary. When the partition heals, both nodes believe they are primary and have accepted divergent writes.
> - Prevention: quorum-based election. A node must hold a majority of votes to become primary, so only one node can win. Fencing (STONITH) ensures the old primary is forcibly terminated before the new one starts accepting writes, eliminating the window where both are active.
> - WSFC uses quorum witnesses; Patroni uses distributed locks in etcd/Consul. Without fencing, quorum alone is not sufficient. A slow primary that loses quorum might still be processing writes for a few seconds.

## Links

- [Types of SQL Server replication](https://learn.microsoft.com/sql/relational-databases/replication/types-of-replication?view=sql-server-ver17) — official overview of snapshot, transactional, and merge replication with use-case guidance.
- [Always On availability groups overview](https://learn.microsoft.com/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-ver17) — covers synchronous vs asynchronous commit modes, failover behavior, and readable secondaries.
- [Cosmos DB consistency levels](https://learn.microsoft.com/azure/cosmos-db/consistency-levels) — explains the five consistency levels (strong, bounded staleness, session, consistent prefix, eventual) with latency and availability tradeoffs.
- [PostgreSQL High Availability and Replication](https://www.postgresql.org/docs/15/high-availability.html) — official docs covering streaming replication, WAL shipping, and standby configuration.
- [Designing Data-Intensive Applications, Ch. 5: Replication (Martin Kleppmann)](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) — deep-dive into leader-follower, multi-leader, and leaderless replication with replication lag and consistency analysis.
- [Read-your-writes on replicas: PostgreSQL WAIT FOR LSN and MongoDB causal consistency](https://dev.to/franckpachot/read-your-writes-on-replicas-postgresql-wait-for-lsn-and-mongodb-causal-consistency-4he2) — practitioner post on implementing read-your-writes consistency across replicas in PostgreSQL and MongoDB.
