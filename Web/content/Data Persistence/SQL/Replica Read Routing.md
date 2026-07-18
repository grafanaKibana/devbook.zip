---
publish: true
created: 2026-07-16T14:51:26.230Z
modified: 2026-07-16T14:51:26.230Z
published: 2026-07-16T14:51:26.230Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Routing read-only work to replicas while preserving transaction and read-after-write boundaries.
level:
  - "4"
priority: High
status: Creation
---

# Intro

Replica read routing sends eligible read-only work away from the primary without silently weakening a request's consistency contract. Statement classification is only the first boundary. The router must also pin transactions, measure replay progress, carry read-after-write tokens, handle failover timelines, and keep lag fallbacks from overwhelming the primary.

## Routing Contract

- Writes, write-capable transactions, and unclassified work use the primary.
- A read-only transaction pins one eligible replica through commit or rollback; individual statements from one transaction never hop across nodes.
- Staleness-tolerant reads may use any healthy replica inside the configured lag budget.
- A read that must observe a prior write uses the primary or a replica whose replay position reaches the request token.

A proxy can inspect statements, but it usually cannot infer the user's causal boundary. The application or API layer must mark which reads tolerate staleness and carry the token when they do not.

## Position Token

A fixed time window guesses at lag. A position token states the actual replay boundary:

1. Commit the write on the primary.
2. Return a token at or after that commit's WAL position. A later `pg_current_wal_lsn()` is conservative if concurrent commits advance it.
3. Carry the token with the next read.
4. Compare each standby's `pg_last_wal_replay_lsn()` with the required position.
5. If replay is behind, wait within a strict budget, route to the primary, or return a consistency-specific failure.

```text
required = 0/16B6C50
replica  = 0/16B6A20  -> wait or primary
replica  = 0/16B6D10  -> eligible
```

WAL positions are ordered values, not strings to compare lexicographically.

![[Assets/System Design 101/316dec0dba2634be6b17aa4254ec3ffe23cf58fa2964464e4bb956609f664728.png]]

The topology diagram omits the lag boundary. A replica is eligible for a read-after-write request only after replay reaches that request's token.

## Failover and Overload

A token from an old PostgreSQL timeline may not be directly comparable after promotion. The routing protocol must either translate that boundary through failover metadata or route consistency-sensitive reads to the new primary until it can prove eligibility.

Keep waits bounded. An unbounded replica wait turns lag into request exhaustion; routing every lagged read to the primary can overload the node needed for recovery. Track lag, wait duration, primary fallbacks, and rejected consistency-sensitive reads as separate signals.

| Failure | Required behavior |
|---|---|
| Replica behind token | Bounded wait, primary fallback, or explicit consistency failure |
| Replica fails during idempotent read | Retry another eligible replica with the same token and retry budget |
| Primary changes during transaction | Fail the pinned transaction; retry the whole transaction only when safe |
| Commit acknowledgement lost | Treat outcome as unknown; resolve by idempotency key or reconciliation |

## References

- [PostgreSQL backup control functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-BACKUP) — primary definitions for current and replay WAL-location functions.
- [PostgreSQL warm standby](https://www.postgresql.org/docs/current/warm-standby.html) — documents streaming replication, hot-standby delay, and failover behavior.
- [Amazon RDS read replicas](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html) — official managed-service routing and asynchronous-replica boundary.
- [pgpool-II load balancing](https://www.pgpool.net/docs/latest/en/html/runtime-config-load-balancing.html) — documents statement routing, transaction pinning, and delay-aware standby selection.
