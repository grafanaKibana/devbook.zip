---
publish: true
created: 2026-08-20T20:41:15.620Z
modified: 2026-08-25T13:45:27.873Z
published: 2026-08-25T13:45:27.873Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Keeping copies of data on multiple nodes to spread reads and survive failures.
level:
  - "4"
priority: High
status: Ready to Repeat
---

Replication maintains copies of data on multiple nodes for availability, disaster recovery, and read distribution. Copying the initial state is the easy part. The lasting contract is how each later write is ordered, acknowledged, replayed, and exposed while nodes fail and networks partition. A weakly specified boundary produces stale reads, acknowledged-write loss, or two writable primaries.

# Replication Models

## Single-Leader (Leader-Follower)

One designated leader accepts writes. Followers receive an ordered change stream and may serve eligible reads after applying it. PostgreSQL streaming replication, MySQL binlog replication, SQL Server Always On Availability Groups, and MongoDB replica sets use this broad shape. In a Windows high-availability SQL Server availability group, the group moves log records to secondary replicas while Windows Server Failover Clustering (WSFC) supplies health detection, quorum, and failover orchestration. A Linux high-availability availability group instead uses `CLUSTER_TYPE = EXTERNAL` with Pacemaker as the external cluster manager.

SQL Server can route connections marked with `ApplicationIntent=ReadOnly` through a configured availability-group listener and read-only routing list. Other systems expose replica endpoints or leave routing to middleware. Adding followers increases only the read capacity that can tolerate their replay boundary. Write throughput remains bounded by the leader.

Failover requires electing a new leader. SQL Server high-availability availability groups use WSFC on Windows or Pacemaker on Linux. PostgreSQL commonly relies on an external manager such as Patroni or repmgr. A SQL Server availability group created with `CLUSTER_TYPE = NONE` has no cluster manager, is intended primarily for read scale, and supports only manual failover. It therefore supplies replication and readable replicas, not automatic high availability or cluster-managed fencing.

A voting quorum prevents two candidates in the same voting configuration from both winning a majority. It does not stop an isolated former leader from continuing to serve stale endpoints or accept writes. Leases, endpoint ownership, and fencing must revoke that old leader before the replacement is writable. In a clusterless `NONE` configuration, the operator must establish that ownership boundary during manual failover rather than assuming the availability group will arbitrate it.

## Multi-Leader

Multiple leaders accept writes independently and exchange changes. CouchDB deployments and SQL Server peer-to-peer transactional replication can use this shape. A regional write need not wait for every remote leader, improving write locality and partition availability.

The cost is unavoidable conflict semantics when two leaders change the same logical value concurrently:

- **Last-write-wins (LWW)** keeps the write selected by a timestamp or product-specific ordering rule. It converges, but silently discards another update and is unsafe for quantities such as money or inventory.
- **CRDTs** merge concurrent operations according to a data type's algebra. They work only when the domain can be represented by those merge rules.
- **Application-level resolution** exposes competing versions to domain logic. It preserves context at the cost of more state and recovery work.

In SQL Server peer-to-peer transactional replication, the recommended practice is write partitioning (each node owns a non-overlapping subset of rows). Peer-to-peer replication offers conflict detection but is not a general-purpose conflict resolution platform like CRDTs. Avoiding same-row writes across nodes is the primary design constraint.

## Leaderless (Dynamo-style)

In Dynamo-style systems such as the original Amazon Dynamo, Cassandra, and Riak, several replicas can accept an operation and the client or coordinator can use tunable `N`, `W`, and `R` quorums. `W + R > N` creates overlap between the acknowledged write and read sets, but overlap alone does not serialize concurrent writes or prove linearizability. Version reconciliation, sloppy quorums, membership changes, and failure handling still matter. Read repair and anti-entropy reconcile divergent replicas under product-specific rules.

Amazon DynamoDB's contract should not be inferred from the Dynamo name. DynamoDB does not expose client-selected `R` and `W` values. Single-Region operations document eventual or strong reads where supported, while transactions have their own contract. Global tables now offer multi-Region eventual consistency (MREC) and, in supported configurations, multi-Region strong consistency (MRSC). Those documented modes are the boundary. The generic quorum formula is not a DynamoDB API guarantee.

## Model Comparison

| Dimension | Single-Leader | Multi-Leader | Leaderless |
|---|---|---|---|
| Write scaling | Bounded by leader | Multiple write points | Any node |
| Conflict handling | Leader orders writes. Failover still needs fencing | Mandatory | Version/conflict handling plus repair |
| Acknowledgement and reads | Sync acknowledgement can protect commit durability. Replica observation still depends on replay and routing | Cross-leader acknowledgement and conflict policy are separate | Quorum settings influence overlap but do not remove concurrent-write reconciliation |
| Failover complexity | Election, endpoint ownership, and fencing | Per-leader failure and conflict recovery | No leader election, but membership and quorum availability still matter |
| Typical use | PostgreSQL, SQL Server AG | CouchDB, geo-distributed write topologies | Cassandra, Riak, original Dynamo-style systems |

# Replication Lag

With asynchronous acknowledgement, the leader confirms a write without waiting for a standby. A follower may already have the change or may be behind. Once reads are distributed across that gap, three recurring anomalies appear:

**1. Read-your-writes**: a form is submitted and immediately reloaded through a stale follower, making the committed change appear to disappear. Route the follow-up read to the leader or carry the write position and wait for a follower to reach it. PostgreSQL has no built-in `pg_wait_for_lsn`. Application or custom database logic must poll and compare `pg_last_wal_replay_lsn()` (or an equivalent replay-position signal) with the required commit LSN. MongoDB exposes causal-consistency tokens for the same boundary.

**2. Monotonic reads**: one read returns newer data and the next is routed to a follower that has applied less. Carry the highest observed commit or replay position, then use the primary or a follower that has reached it. Sticky routing is only an optimization while the chosen follower remains available and does not move backward. It does not preserve monotonicity across failover by itself.

**3. Consistent prefix reads**: causally related writes appear out of order, such as a reply appearing before its original message. Preserve the dependency in one ordered commit stream or explicit causal metadata, and read from a position that includes the prerequisite. A shared partition key helps only when the partition supplies that ordering contract through failover.

**Sync vs async tradeoff**: synchronous acknowledgement adds a configured standby to the commit path. With the required `synchronous_commit`, standby selection, and storage settings, the acknowledgement can protect the commit across failover to an eligible standby. It does not make every follower read linearizable: WAL may be durable on a standby before that standby has replayed it. A read that must observe the commit still needs the primary or a replay position at or beyond the commit token. Asynchronous acknowledgement removes the standby wait. An acknowledged commit is then at risk on leader failure only when no eligible survivor received it.

# Replica Read Boundary

Single-leader replication can offload only reads whose consistency contract the selected follower can satisfy. Writes, write-capable transactions, and work with unknown intent stay on the primary. An explicitly read-only transaction pins one eligible follower. A read that must observe a prior commit uses the primary or a follower whose replay position has reached that commit token. Middleware can classify statements, but the application usually knows whether a causal dependency exists.

![[Assets/Data Persistence/Data Persistence-Replication-18120000-1.png|theme-aware]]

The diagram shows the middleware topology but not its lag or transaction boundary. A safe routing contract is stricter:

- A read-only transaction pins one eligible replica until commit or rollback. Its statements never hop between nodes.
- Staleness-tolerant reads may use a healthy replica inside the configured lag budget.
- A read that must observe a prior write uses the primary or a replica whose replay position reaches the request token.
- The application or API marks the causal requirement because a SQL proxy usually cannot infer it from statement text.

# Position Token

A fixed time window only guesses at lag. A position token states the required boundary:

1. Commit the write on the primary.
2. Return a token at or after that commit's WAL position.
3. Carry the token with the next read.
4. Compare each standby's replay position with the required position.
5. If replay is behind, wait within a strict budget, route to the primary, or return an explicit consistency failure.

```text
required = 0/16B6C50
replica  = 0/16B6A20  -> wait or primary
replica  = 0/16B6D10  -> eligible
```

WAL positions are ordered values, not strings for lexicographic comparison. A later `pg_current_wal_lsn()` is conservative when concurrent commits advance the primary beyond the target commit. `pg_last_wal_replay_lsn()` reports a standby's replay boundary.

![[Assets/Data Persistence/Data Persistence-Replication-18120000.png|theme-aware]]

The topology image still omits the causal condition: a replica is eligible for a read-after-write request only after replay reaches that request's token.

# Failover and Overload

A PostgreSQL position from an old timeline may not be directly comparable after promotion. The routing protocol must translate the boundary through failover metadata or send consistency-sensitive reads to the new primary until follower eligibility can be proved.

Follower waits need a strict budget. An unbounded wait turns replication lag into request exhaustion, while sending every lagged read to the primary can overload the node needed for recovery. Lag, wait duration, primary fallback, and rejected consistency-sensitive reads are separate operational signals.

| Failure | Required behavior |
| --- | --- |
| Replica behind token | Bounded wait, primary fallback, or explicit consistency failure |
| Replica fails during an idempotent read | Retry another eligible replica with the same token and retry budget |
| Primary changes during a transaction | Fail the pinned transaction. Retry the whole transaction only when safe |
| Commit acknowledgement is lost | Treat the result as unknown. Resolve by idempotency key or reconciliation |

# CAP and PACELC

**CAP** applies to an operation when a network **P**artition prevents replicas from coordinating. Preserving **C**onsistency means rejecting or delaying an operation that cannot meet the required single-copy behavior. Preserving **A**vailability means returning a non-error response from every non-failing node and accepting that replicas may diverge. Topology alone does not make a system CP or AP. A quorum-protected write that is refused without enough voters chooses consistency for that operation, while a write accepted on both sides for later reconciliation chooses availability. Synchronous versus asynchronous durability acknowledgement is a separate contract.

CAP describes the partition case. **PACELC** adds the normal-operation choice between latency and coordination. Synchronous commit pays latency for an acknowledgement boundary. It is not, by itself, a linearizable follower-read protocol. Observing that commit still requires primary routing or proof that the chosen follower replayed the required position. See [[Software Architecture/Distributed Systems/CAP theorem|CAP theorem]] for the theorem's full boundary.

# Tradeoffs

Replication and sharding solve different bottlenecks. Replication copies ownership. Sharding divides it.

| Dimension | Replication | Sharding |
|---|---|---|
| What it solves | Read throughput, HA, DR | Write throughput, dataset size |
| Write scaling | Writes still bottleneck at leader | Writes distributed across shards |
| Durability and observation | Async acknowledgement can expose an acknowledged commit to failover loss when no eligible survivor received it. Sync acknowledgement can protect durability, while replica reads still need replay-aware routing | Each shard has its own replication and read-consistency boundary |
| Operational complexity | Medium | High |
| When to reach for | Read bottleneck, HA requirement | Write or storage bottleneck |

The measured bottleneck and consistency contract determine the mechanism. Followers scale eligible reads. A cache removes repeated origin work at a freshness cost. Sharding distributes ownership and creates cross-shard coordination. These are alternatives and combinations, not mandatory stages of one progression.

# Pitfalls

**Split-brain**: a network partition leaves the old primary accepting writes while a new primary is promoted elsewhere. A voting quorum limits who can be elected in the current configuration. Fencing is the separate act that revokes the old leader's ability to write. Promotion must couple both boundaries.

**Replication lag as a silent consistency violation**: a follower passes a basic health check while remaining behind the primary. Reads return stale data without an error. Mitigation: monitor replication positions and time-based lag (`pg_stat_replication` in PostgreSQL, `sys.dm_hadr_database_replica_states` in SQL Server), alert when the workload's budget is exceeded, and include eligibility rather than mere connectivity in routing health.

**Connection pool not refreshing after failover**: infrastructure promotes a new primary, but the application keeps pooled connections to the old endpoint. Requests continue to fail after the database is available. Mitigation: use the product's failover-aware endpoint and driver behavior, retire broken pooled connections promptly, and bound retries so reconnection does not amplify the outage.

**Replication slot accumulation (PostgreSQL)**: a follower goes offline while its replication slot remains. PostgreSQL retains WAL needed from the slot's confirmed position and can exhaust primary storage. Mitigation: monitor inactive slots in `pg_replication_slots`, set `max_slot_wal_keep_size` so an abandoned slot cannot retain WAL without limit, and remove slots whose consumers have exceeded the recovery policy. Exceeding that limit can invalidate the slot, so the consumer may need to be rebuilt.

**Last-write-wins data loss**: in multi-leader or leaderless setups using LWW, concurrent writes to the same key silently discard one of them. No error is returned to the client. Mitigation: use CRDTs for data shapes that support them, or implement application-level conflict detection (version vectors, conditional writes) for critical data like account balances or inventory counts.

# References

- [SQL Server Always On availability groups](https://learn.microsoft.com/sql/database-engine/availability-groups/windows/overview-of-always-on-availability-groups-sql-server?view=sql-server-ver17)
- [DynamoDB read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
- [PostgreSQL warm standby](https://www.postgresql.org/docs/current/warm-standby.html)
