---
publish: true
created: 2026-07-16T14:10:17.673Z
modified: 2026-07-18T11:59:15.657Z
published: 2026-07-18T11:59:15.657Z
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

Redis keeps a working data set in memory and exposes atomic commands over typed values such as strings, hashes, sets, sorted sets, streams, and bitmaps. That makes a `GET`, counter increment, or leaderboard update cheap, but memory speed is not a durability or consistency guarantee. Before choosing Redis, name which system is authoritative, what an acknowledged write means, what may be lost during failover, and how the application behaves when the cluster is unavailable.

A product catalog can treat Redis as a disposable [[Data Persistence/Caching|cache]] because a miss reloads PostgreSQL. A checkout idempotency key is different: losing it can repeat a payment. The second workload needs a deliberate persistence, replication, expiry, and recovery contract even if both use the same `SET` command.

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

These commands are atomic individually. They do not create a relational transaction across an external database, and a successful response says nothing about disk or replica acknowledgement unless the deployment contract adds those guarantees.

![[Assets/Data Persistence/Data Persistence-Redis-18120000.png]]

> [!WARNING] Use-case inventory, not a safety contract
> The visual maps structures to possible workloads, but a string does not by itself make a safe distributed lock or global ID service, and a list is not a durable queue contract. Use fencing for coordination, define durability and replay for messaging, and test every workload against failover and eviction.

# Persistence

Redis supports four broad modes:

| Mode | What is stored | Typical loss window | Operational cost |
| --- | --- | --- | --- |
| None | Memory only | Entire data set after process/node loss | Fastest recovery is an origin rebuild; appropriate only for disposable data |
| RDB | Point-in-time snapshots | Writes since the last completed snapshot | Compact files and fast restart, but `fork()` and copy-on-write can pause or inflate memory use |
| AOF | Write commands replayed at restart | Depends on `appendfsync`: `always`, `everysec`, or OS-managed `no` | More disk traffic and longer replay; rewrites compact obsolete history |
| RDB + AOF | Snapshot-style AOF base plus incremental commands in current Redis | Usually governed by the AOF policy | Better restart shape, with both persistence and rewrite capacity costs |

RDB is a backup-friendly snapshot, not a continuous log. AOF is appended after Redis applies a command in memory; `appendfsync always` waits for each flush, `everysec` commonly accepts roughly one second of crash loss, and `no` delegates flush timing to the operating system. Since Redis 7, multipart AOF uses one base file plus incremental files tracked by a manifest; a rewrite creates a new compact base while new writes continue into an incremental file.

Background does not mean free. `BGSAVE` and AOF rewrite fork a child. Fork latency grows with page-table size, and writes during the child process trigger copy-on-write pages. A large write or delete still consumes main-thread time, network bandwidth, allocator work, and AOF buffer capacity before any background `fsync`. Monitor `latest_fork_usec`, `rdb_bgsave_in_progress`, `aof_rewrite_in_progress`, copy-on-write bytes, disk latency, and memory headroom.

## AOF persistence and big keys

A five-megabyte value makes several costs visible at once: the client sends and Redis parses a large command; the main thread mutates a large object; the AOF path copies a large command into buffers; replication sends it again; and a rewrite or snapshot may copy additional memory pages. `appendfsync everysec` moves the durability flush off the request path, but it does not remove those costs.

Prefer bounded values and incremental structures. Inspect `MEMORY USAGE`, `--bigkeys`, slow logs, command latency, network bytes, and persistence copy-on-write metrics. Delete large values asynchronously with `UNLINK` when delayed reclamation is acceptable, and load-test snapshot/rewrite overlap rather than testing only steady-state commands.

Persistence is local durability, replication is another copy, and backup is a recoverable historical artifact. None substitutes for the other. Keep tested off-host backups when Redis owns non-reconstructable state.

# Topology and Availability

**Replication** streams commands from one primary to replicas asynchronously. A replica can be behind when the primary fails. `WAIT` asks for replica acknowledgements and reduces the loss window, but Redis documents that it does not turn asynchronous replication into a strongly consistent consensus system.

**Sentinel** monitors a non-clustered primary/replica deployment, reaches quorum for failover decisions, promotes a replica, and provides clients with the current primary address. Clients must support Sentinel discovery and reconnect. A network partition can still lose acknowledged writes when the old primary's unreplicated history is discarded after failover.

**Redis Cluster** partitions keys across 16,384 hash slots. Each primary owns a slot range and may have replicas. Clients follow `MOVED`/`ASK` redirections during normal routing and resharding. Multi-key commands, transactions, and scripts require all participating keys to share one slot; hash tags such as `cart:{u42}` and `inventory:{u42}` deliberately colocate keys, which can also create a hot slot.

| Need | Default choice | Cost to accept |
| --- | --- | --- |
| Disposable cache on one node | Standalone Redis with expiry and origin protection | Cold starts and node loss become origin load |
| Automatic failover without sharding | Primary, replicas, and Sentinel | Eventual consistency, client discovery, and possible acknowledged-write loss |
| Memory/write scale beyond one primary | Redis Cluster | Slot-aware keys, resharding, cross-slot limits, and per-shard failover |
| No acknowledged-write loss | A consensus-backed durable system of record | Higher latency and a different operating model; Redis replication alone is insufficient |

# Pitfalls

- **Mixing disposable and authoritative keys under one eviction policy.** A pure cache can use `allkeys-lfu`; authoritative workflow state cannot tolerate eviction. Separate deployments or enforce non-evicting capacity controls.
- **No expiry on unbounded key spaces.** Sessions, idempotency keys, and versioned cache keys accumulate until `maxmemory` causes eviction or writes fail.
- **Assuming replicas are backups.** Replication copies accidental deletes and corruption. Backups preserve older states and need restore tests.
- **Unsafe distributed locks.** A client can pause past its lease and continue writing after another client acquires it. Use fencing tokens at the protected resource or choose a consensus system.
- **Cross-slot surprises.** A script that works on one node fails with `CROSSSLOT` after clustering unless its keys share a slot.

# Questions

> [!QUESTION]- When is Redis safe as a system of record?
> Only when the deployment's eviction, persistence acknowledgement, replication/failover loss window, backup, restore, and capacity contracts meet the data's requirements. Enabling AOF is not enough: asynchronous failover can still lose acknowledged writes, disk and rewrite failures still need handling, and `maxmemory` must not evict authoritative keys.

> [!QUESTION]- Why can a big key hurt Redis even with `appendfsync everysec`?
> The main thread still receives, parses, mutates, and copies the large command into AOF and replication buffers. Background `fsync` removes one disk wait from the request path; it does not remove network, allocator, serialization, copy-on-write, rewrite, or deletion work.

# References

- [Redis data types](https://redis.io/docs/latest/develop/data-types/) — official command and structure semantics for strings, hashes, sets, sorted sets, bitmaps, and streams.
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) — official RDB, multipart AOF, fsync, rewrite, backup, restart, and data-loss tradeoffs.
- [Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) — asynchronous replication, partial synchronization, offsets, `WAIT`, and failover loss boundaries.
- [Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) — monitoring, quorum, promotion, discovery, and partition behavior for non-clustered deployments.
- [Redis Cluster specification](https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/) — 16,384 slots, redirections, failover, hash tags, and cross-slot constraints.
- [How can Redis be used? (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-can-redis-be-used.md) — source use-case inventory and adopted visual, bounded here by workload-specific correctness contracts.
- [How does Redis persist data? (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-redis-persist-data.md) — source persistence taxonomy; its visual is rejected because it treats persistence as outside the critical path.
- [How Redis architecture evolved (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-redis-architecture-evolve.md) — source topology inventory; its timeline is rejected because it misdates persistence and replication introduction.
- [How big keys impact Redis persistence (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-big-keys-impact-redis-persistence.md) — source big-key/AOF prompt; its visual is rejected because `everysec` does not remove main-thread big-key costs.
