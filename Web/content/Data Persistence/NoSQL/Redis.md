---
publish: true
created: 2026-08-20T20:41:15.616Z
modified: 2026-08-25T13:45:27.876Z
published: 2026-08-25T13:45:27.876Z
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: Redis data structures, persistence, replication, clustering, and the failure contracts behind common use cases.
level:
  - "3"
priority: High
status: Ready to Repeat
---

Redis keeps a working data set in memory and exposes atomic commands over typed values such as strings, hashes, sets, sorted sets, streams, and bitmaps. A `GET`, counter increment, or leaderboard update is cheap, but memory speed says nothing about durability or consistency. The design must still identify the authoritative system, the meaning of an acknowledged write, the failover loss window, and the application's behavior when Redis is unavailable.

A product catalog can treat Redis as a disposable [[Data Persistence/Caching|cache]] because a miss reloads PostgreSQL. A checkout idempotency key is different: losing it can repeat a payment. Although both workloads may use `SET`, only the first is safely reconstructable. The second needs an explicit persistence, replication, expiry, and recovery contract.

# Data Structures and Workload Contracts

| Workload | Redis structure or command | Contract to make explicit |
| --- | --- | --- |
| Cache or session | String or hash with `EX`/`PX` expiry | Authority, maximum staleness, logout/revocation behavior, and miss handling |
| Counter or rate limit | `INCR`, expiry, or a Lua/function operation | Window semantics, atomicity boundary, and fail-open versus fail-closed behavior |
| Leaderboard | Sorted set (`ZADD`, `ZRANGE`) | Score update ordering, tie handling, and rebuild path |
| Membership or retention | Set, HyperLogLog, or bitmap | Exact versus approximate count and retention horizon |
| Work queue or event stream | Stream (`XADD`, consumer groups) | Retention, acknowledgement, replay, duplicate handling, and dead-letter policy |
| Coordination lease | `SET key token NX PX ...` plus token-checked release | Lease expiry, clock/partition behavior, fencing, and what stale owners must not modify |

```redis
SET session:7f2 '{"userId":"u42","tenantId":"t9"}' EX 1800
INCR rate:tenant:t9:minute:2026-07-16T12:04
EXPIRE rate:tenant:t9:minute:2026-07-16T12:04 120
ZADD leaderboard:weekly 9280 user:u42
XADD orders * orderId o-1842 status accepted
```

Each command is atomic by itself. The sequence does not create a transaction with an external database, and a successful response says nothing about disk or replica acknowledgement unless the deployment contract requires those guarantees.

![[Assets/Data Persistence/Data Persistence-Redis-18120000.png|theme-aware]]

> [!WARNING] Use-case inventory, not a safety contract
> The visual maps structures to possible workloads, but a string does not by itself make a safe distributed lock or global ID service, and a list is not a durable queue contract. Use fencing for coordination, define durability and replay for messaging, and test every workload against failover and eviction.

# Persistence

Redis supports four broad modes:

| Mode | What is stored | Typical loss window | Operational cost |
| --- | --- | --- | --- |
| None | Memory only | Entire data set after process/node loss | Fastest recovery is an origin rebuild. Appropriate only for disposable data |
| RDB | Point-in-time snapshots | Writes since the last completed snapshot | Compact files and fast restart, but `fork()` and copy-on-write can pause or inflate memory use |
| AOF | Write commands replayed at restart | Depends on `appendfsync`: `always`, `everysec`, or OS-managed `no` | More disk traffic and longer replay. Rewrites compact obsolete history |
| RDB + AOF | Snapshot-style AOF base plus incremental commands in current Redis | Usually governed by the AOF policy | Better restart shape, with both persistence and rewrite capacity costs |

RDB is a backup-friendly snapshot, not a continuous log. AOF is appended after Redis applies a command in memory. `appendfsync always` waits for each flush, `everysec` commonly accepts roughly one second of crash loss, and `no` delegates flush timing to the operating system. Since Redis 7, multipart AOF uses one base file plus incremental files tracked by a manifest. A rewrite creates a new compact base while new writes continue into an incremental file.

Background does not mean free. `BGSAVE` and AOF rewrite fork a child. Fork latency grows with page-table size, and writes during the child process trigger copy-on-write pages. A large write or delete still consumes main-thread time, network bandwidth, allocator work, and AOF buffer capacity before any background `fsync`. Monitor `latest_fork_usec`, `rdb_bgsave_in_progress`, `aof_rewrite_in_progress`, copy-on-write bytes, disk latency, and memory headroom.

## AOF Persistence and Big Keys

A five-megabyte value makes several costs visible at once: the client sends and Redis parses a large command. The main thread mutates a large object. The AOF path copies a large command into buffers. Replication sends it again. And a rewrite or snapshot may copy additional memory pages. `appendfsync everysec` moves the durability flush off the request path, but it does not remove those costs.

Prefer bounded values and incremental structures. Inspect `MEMORY USAGE`, `--bigkeys`, slow logs, command latency, network bytes, and persistence copy-on-write metrics. Delete large values asynchronously with `UNLINK` when delayed reclamation is acceptable, and load-test snapshot/rewrite overlap rather than testing only steady-state commands.

Persistence is local durability, replication is another copy, and backup is a recoverable historical artifact. None substitutes for the other. Keep tested off-host backups when Redis owns non-reconstructable state.

# Topology and Availability

**Replication** streams commands from one primary to replicas asynchronously. A replica can be behind when the primary fails. `WAIT` asks for replica acknowledgements and reduces the loss window, but Redis documents that it does not turn asynchronous replication into a strongly consistent consensus system.

**Sentinel** monitors a non-clustered primary/replica deployment, promotes a replica, and provides clients with the current primary address. A configured quorum is needed to agree that the primary is objectively down, while failover authorization also requires a majority of the configured Sentinel processes. Clients must support Sentinel discovery and reconnect. A network partition can still lose acknowledged writes when the old primary's unreplicated history is discarded after failover.

**Redis Cluster** partitions keys across 16,384 hash slots. Each primary owns a slot range and may have replicas. Clients follow `MOVED`/`ASK` redirections during normal routing and resharding. Multi-key commands, transactions, and scripts require all participating keys to share one slot. Hash tags such as `cart:{u42}` and `inventory:{u42}` deliberately colocate keys, which can also create a hot slot.

| Need | Default choice | Cost to accept |
| --- | --- | --- |
| Disposable cache on one node | Standalone Redis with expiry and origin protection | Cold starts and node loss become origin load |
| Automatic failover without sharding | Primary, replicas, and Sentinel | Eventual consistency, client discovery, and possible acknowledged-write loss |
| Memory/write scale beyond one primary | Redis Cluster | Slot-aware keys, resharding, cross-slot limits, and per-shard failover |
| No acknowledged-write loss | A consensus-backed durable system of record | Higher latency and a different operating model. Redis replication alone is insufficient |

# Pitfalls

- **Mixing disposable and authoritative keys under one eviction policy.** A pure cache can use `allkeys-lfu`. Authoritative workflow state cannot tolerate eviction. Separate deployments or enforce non-evicting capacity controls.
- **No expiry on unbounded key spaces.** Sessions, idempotency keys, and versioned cache keys accumulate until `maxmemory` causes eviction or writes fail.
- **Assuming replicas are backups.** Replication copies accidental deletes and corruption. Backups preserve older states and need restore tests.
- **Unsafe distributed locks.** A client can pause past its lease and continue writing after another client acquires it. Use fencing tokens at the protected resource or choose a consensus system.
- **Cross-slot surprises.** A script that works on one node fails with `CROSSSLOT` after clustering unless its keys share a slot.

# References

- [Redis documentation](https://redis.io/docs/latest/)
