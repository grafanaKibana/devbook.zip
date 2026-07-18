---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Keeping copies of data on multiple nodes to spread reads and survive failures."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Replication means keeping copies of the same data on multiple nodes. You do it for three reasons: spread read load across replicas, survive node failures without downtime, and recover from disasters by having data in a separate region. The hard part isn't copying a static snapshot. It's propagating every subsequent write to all replicas correctly while nodes crash, networks partition, and clients read concurrently. Get it wrong and you get stale reads, lost writes, or two nodes that both think they're the primary.

## Replication Models

### Single-Leader (Leader-Follower)

All writes go to one designated node (the leader). Replicas receive a stream of changes and apply them in order, serving read traffic. This is the default model for PostgreSQL (streaming replication), MySQL (binlog replication), SQL Server Always On Availability Groups (AG replicates transaction log records to secondaries; WSFC provides health detection, quorum, and failover orchestration), and MongoDB replica sets.

Reads can be routed to replicas using `ApplicationIntent=ReadOnly` in SQL Server connection strings, or by pointing read-heavy workloads at a replica endpoint. Write throughput is bounded by the single leader; you can't scale writes by adding replicas.

Failover requires electing a new leader. SQL Server uses Windows Server Failover Clustering (WSFC) quorum; PostgreSQL commonly relies on an external manager such as Patroni or repmgr. A voting quorum prevents two candidates in the same voting configuration from both winning a majority. It does not stop an isolated former leader from continuing to serve stale endpoints or accept writes; leases, endpoint ownership, and fencing must revoke that old leader before the replacement is writable.

### Multi-Leader

Multiple nodes accept writes independently and propagate changes to each other. Used by CouchDB, and SQL Server's peer-to-peer transactional replication. The benefit is write availability across datacenters: a write to the EU node doesn't wait for the US node to acknowledge.

The cost is mandatory conflict resolution. If two leaders accept a write to the same row concurrently, you have a conflict. Common strategies:

- **Last-write-wins (LWW)**: keep the write with the higher timestamp. Simple, but lossy. The other write is silently discarded. Dangerous for financial or inventory data.
- **CRDTs**: data structures designed to merge automatically (counters, sets). Only works for specific data shapes.
- **Application-level resolution**: the application receives both versions and decides. Most flexible, most work.

In SQL Server peer-to-peer transactional replication, the recommended practice is write partitioning (each node owns a non-overlapping subset of rows). Peer-to-peer replication offers conflict detection but is not a general-purpose conflict resolution platform like CRDTs; avoiding same-row writes across nodes is the primary design constraint.

### Leaderless (Dynamo-style)

In Dynamo-style systems such as the original Amazon Dynamo, Cassandra, and Riak, several replicas can accept an operation and the client or coordinator can use tunable `N`, `W`, and `R` quorums. `W + R > N` creates overlap between the acknowledged write and read sets, but overlap alone does not serialize concurrent writes or prove linearizability; version reconciliation, sloppy quorums, membership changes, and failure handling still matter. Read repair and anti-entropy reconcile divergent replicas under product-specific rules.

Do not infer Amazon DynamoDB's contract from the Dynamo name. DynamoDB does not expose client-selected `R` and `W` values. Its API documents eventual or strongly consistent reads per operation for supported single-Region resources, transactional operations with their own contract, and separate consistency/replication choices for global tables. Treat those documented operations and multi-Region modes as the boundary rather than applying the generic quorum formula.

### Model Comparison

| Dimension | Single-Leader | Multi-Leader | Leaderless |
|---|---|---|---|
| Write scaling | Bounded by leader | Multiple write points | Any node |
| Conflict handling | Leader orders writes; failover still needs fencing | Mandatory | Version/conflict handling plus repair |
| Acknowledgement and reads | Sync acknowledgement can protect commit durability; replica observation still depends on replay and routing | Cross-leader acknowledgement and conflict policy are separate | Quorum settings influence overlap but do not remove concurrent-write reconciliation |
| Failover complexity | Election, endpoint ownership, and fencing | Per-leader failure and conflict recovery | No leader election, but membership and quorum availability still matter |
| Typical use | PostgreSQL, SQL Server AG | CouchDB, geo-distributed write topologies | Cassandra, Riak, original Dynamo-style systems |

## Replication Lag

Asynchronous acknowledgement means the leader does not wait for a standby before confirming a write. A replica may be caught up at that instant or may lag behind the leader. When lag exists, it creates three canonical anomalies (from DDIA Ch. 5):

**1. Read-your-writes**: a user submits a form, then immediately reloads the page. The read hits a stale replica and the user sees their own write disappear. Fix: route reads to the leader for a short window after a write, or track the LSN of the last write and wait for the replica to catch up. PostgreSQL has no built-in `pg_wait_for_lsn`; application or custom database logic must poll and compare `pg_last_wal_replay_lsn()` (or an equivalent replay-position signal) with the required commit LSN. MongoDB exposes causal consistency tokens for the same boundary.

**2. Monotonic reads**: a user refreshes twice and sees newer data on the first refresh, then older data on the second. Carry the highest observed commit/replay position or a product causal token, then route to the primary or wait for a replica that has reached at least that position. Sticky routing is only an optimization while the selected replica remains available and never moves backward; by itself it does not preserve monotonicity across failover or topology change.

**3. Consistent prefix reads**: causally related writes appear out of order on a replica. A reply appears before the original message. Preserve the dependency through one ordered commit stream or explicit causal metadata, and read from a replica whose applied position includes the prerequisite. Routing related writes to one partition helps only when that partition supplies the required ordering and failover preserves it; the partition key alone is not a causal guarantee.

**Sync vs async tradeoff**: synchronous acknowledgement means the leader waits for the configured standby acknowledgement before confirming the write. With the right `synchronous_commit`, standby selection, and storage settings, that acknowledgement protects commit durability across failover to an eligible standby. It does not make reads from every replica linearizable: WAL can be durable but not yet replayed on a readable standby. A read that must observe the commit still needs the primary or a replica whose replay position has reached the commit token. In asynchronous acknowledgement mode, the leader confirms the write without waiting for a standby. A replica may be caught up or lagging; if the leader fails, an acknowledged commit is at risk only when no eligible surviving node received it.

## Replica Read Boundary

Single-leader replication can offload reads only when routing preserves the request's contract. Writes, write-capable transactions, and unclassified work stay on the primary. An explicitly read-only transaction pins one eligible replica, while a read that must observe a prior commit uses the primary or a replica whose replay position has reached that commit token. A proxy can classify statements, but the application usually owns the causal requirement.

![[System Design 101/fad9c0171b8080e840a469ddf29a9f82d932eb2687a8d62fdb013bf9c3014ece.png]]

The diagram shows the middleware topology, not the lag or transaction boundary. [[Home/Data Persistence/SQL/Replica Read Routing|Replica Read Routing]] owns position tokens, transaction pinning, topology refresh, bounded waits, failover timelines, and overload behavior.

## CAP and PACELC

The sync/async and leader-model choices above are all instances of one theorem. **CAP** says that when a network **P**artition splits your replicas, you must choose between **C**onsistency (reject reads/writes that can't be coordinated) and **A**vailability (keep serving, accept divergence) — you cannot have both *during a partition*. A single-leader system that refuses writes when it can't reach a quorum is **CP**; a leaderless Dynamo-style system that keeps accepting writes and reconciles later is **AP**.

CAP only describes the partition case, which is why **PACELC** also asks whether normal operation favors latency or coordination. Synchronous commit pays latency for acknowledged durability; it is not by itself a linearizable-replica-read protocol. Strong observation additionally requires routing to the primary or waiting until the chosen replica has replayed the required position. See [[Home/Software Architecture/Distributed Systems/CAP theorem|CAP theorem]] for the theorem's full boundary.

## Tradeoffs

Replication and sharding solve different problems. Reaching for sharding before exhausting replication is a common over-engineering mistake.

| Dimension | Replication | Sharding |
|---|---|---|
| What it solves | Read throughput, HA, DR | Write throughput, dataset size |
| Write scaling | Writes still bottleneck at leader | Writes distributed across shards |
| Durability and observation | Async acknowledgement can expose an acknowledged commit to failover loss when no eligible survivor received it; sync acknowledgement can protect durability, while replica reads still need replay-aware routing | Each shard has its own replication and read-consistency boundary |
| Operational complexity | Medium | High |
| When to reach for | Read bottleneck, HA requirement | Write or storage bottleneck |

Choose each mechanism from the measured bottleneck and required consistency boundary. Read replicas scale eligible reads; a cache removes repeated origin work with a freshness cost; sharding distributes ownership and creates cross-shard work. They are not mandatory stages of one progression.

## Pitfalls

**Split-brain**: a network partition leaves the old primary accepting writes while a new primary is promoted elsewhere. A voting quorum limits who can be elected in the current configuration; fencing is the separate act that revokes the old leader's ability to write. Promotion must couple both boundaries.

**Replication lag as a silent consistency violation**: a replica appears healthy in monitoring but is 30 seconds behind. Reads return stale data with no error. Mitigation: monitor replication lag metrics (`pg_stat_replication` in PostgreSQL, `sys.dm_hadr_database_replica_states` in SQL Server), alert on lag exceeding your SLA threshold, and expose lag in health checks.

**Connection pool not refreshing after failover**: infrastructure failover completes in 30 seconds, but the application holds pooled connections to the old primary's IP. Requests fail until the pool times out. Mitigation: short DNS TTL on the cluster endpoint, connection pool validation on borrow, or a proxy layer (PgBouncer, RDS Proxy, Azure SQL connection retry policy) that handles reconnection transparently.

**Replication slot accumulation (PostgreSQL)**: a replica goes offline but its replication slot remains active. PostgreSQL holds all WAL segments since the slot's last confirmed LSN, causing disk to fill on the primary. Mitigation: monitor `pg_replication_slots` for inactive slots, set `max_slot_wal_keep_size` to cap WAL retention, and drop slots for replicas that have been offline beyond your retention window.

**Last-write-wins data loss**: in multi-leader or leaderless setups using LWW, concurrent writes to the same key silently discard one of them. No error is returned to the client. Mitigation: use CRDTs for data shapes that support them, or implement application-level conflict detection (version vectors, conditional writes) for critical data like account balances or inventory counts.

## Questions

> [!QUESTION]- What are the three replication lag anomalies, and how do you mitigate each?
> - **Read-your-writes**: user writes then reads from a stale replica and sees their write missing. Fix: route post-write reads to the leader for a short window, or use LSN/timestamp tracking to wait for the replica to catch up.
> - **Monotonic reads**: user sees newer data, then an older replica. Carry the highest observed position or causal token and require the next source to have reached it; stickiness alone fails after replica failover.
> - **Consistent prefix reads**: a dependent write appears before its prerequisite. Preserve one ordered stream or causal dependency token and read from a position that includes the prerequisite; a shared partition key helps only when its ordering contract covers the failover path.

> [!QUESTION]- When would you choose synchronous vs asynchronous replication?
> - **Synchronous**: when acknowledged commits must survive failover. The leader confirms only after the configured standby acknowledgement, and failover must select an eligible durable standby. This protects acknowledged durability; replica reads still need a replay-position check or primary routing to observe the commit.
> - **Asynchronous**: when avoiding the standby round trip justifies weaker failover durability. The leader does not wait for a standby, and replicas may be current or lagging. An acknowledged commit can be lost on failover only if no eligible surviving node received it.
> - SQL Server Always On configures synchronous-commit or asynchronous-commit per availability replica. PostgreSQL uses `synchronous_standby_names` to select synchronous standbys and `synchronous_commit` to choose the acknowledgement boundary; standbys not selected for synchronous confirmation remain asynchronous.

> [!QUESTION]- How does split-brain occur and how is it prevented?
> - A network partition isolates the primary from the rest of the cluster. A quorum of remaining nodes elects a new primary. When the partition heals, both nodes believe they are primary and have accepted divergent writes.
> - A majority vote prevents two candidates in the same voting configuration from both being elected. Fencing separately terminates or revokes the old primary before the new one accepts writes.
> - WSFC uses quorum witnesses; Patroni uses distributed coordination in systems such as etcd or Consul. Without endpoint revocation or fencing, election quorum alone is insufficient because a slow former leader can keep serving writes after losing authority.

## References

- [Types of SQL Server replication](https://learn.microsoft.com/sql/relational-databases/replication/types-of-replication?view=sql-server-ver17) — official overview of snapshot, transactional, and merge replication with use-case guidance.
- [Always On availability groups overview](https://learn.microsoft.com/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-ver17) — covers synchronous vs asynchronous commit modes, failover behavior, and readable secondaries.
- [Cosmos DB consistency levels](https://learn.microsoft.com/azure/cosmos-db/consistency-levels) — explains the five consistency levels (strong, bounded staleness, session, consistent prefix, eventual) with latency and availability tradeoffs.
- [DynamoDB read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html) — per-operation eventual and strong read contracts; DynamoDB does not expose client-selected quorum values.
- [DynamoDB global table consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html) — multi-Region replication and consistency modes, which are separate from single-Region read selection.
- [PostgreSQL High Availability and Replication](https://www.postgresql.org/docs/15/high-availability.html) — official docs covering streaming replication, WAL shipping, and standby configuration.
- [PostgreSQL backup control functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-BACKUP) — primary definitions for current and replay WAL-location functions used by position-aware routing.
- [Designing Data-Intensive Applications, Ch. 5: Replication (Martin Kleppmann)](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) — deep-dive into leader-follower, multi-leader, and leaderless replication with replication lag and consistency analysis.
- [Read-your-writes on replicas: PostgreSQL WAIT FOR LSN and MongoDB causal consistency](https://dev.to/franckpachot/read-your-writes-on-replicas-postgresql-wait-for-lsn-and-mongodb-causal-consistency-4he2) — practitioner post on implementing read-your-writes consistency across replicas in PostgreSQL and MongoDB.
- [Amazon RDS read replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html) — official docs on provisioning read replicas and directing read traffic to them; the primary source for the managed read/write-split pattern.
- [pgpool-II load-balancing configuration](https://www.pgpool.net/docs/latest/en/html/runtime-config-load-balancing.html) — how a middleware proxy decides which statements are load-balanced to standbys versus sent to the primary.
- [ProxySQL documentation](https://proxysql.com/documentation/) — query-rule engine and hostgroups used to route writes and reads to different backend groups.
- [Database middleware (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/database-middleware.md) — visual routing path for proxy-based read/write splitting; used here with explicit transaction and failure boundaries.
- [Read replica pattern (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/read-replica-pattern.md) — topology overview, supplemented here with the replay-position eligibility contract absent from its diagram.
