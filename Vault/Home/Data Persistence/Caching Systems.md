---
topic:
  - Data Persistence
subtopic:
  - Caching
summary: "Choosing EVCache, Redis, or Memcached by authority, durability, capacity, and failure contract."
level:
  - "4"
priority: High
status: Ready to Repeat

publish: true
---

# Intro

EVCache, Redis, and Memcached can all return values from memory, but they do not promise the same thing when a node fills, restarts, or fails over. A disposable product-card cache can repopulate after loss; an acknowledged session or payment-state write may not be allowed to disappear. Product choice starts with that authority and loss contract, not with a feature checklist.

For example, a team may use Redis safely as an evicting cache with five-minute TTLs and a database authority, then accidentally reuse the same deployment for authoritative workflow state. The second use needs a different `maxmemory` policy, persistence acknowledgement, replication analysis, backup path, and failover test. The cache patterns and correctness boundaries remain in [[Caching]]; this note compares the product-specific mechanics.

## Netflix EVCache: four data contracts

Netflix's EVCache example is useful because the same in-memory technology can play four roles:

| Role | Authority and rebuild path | Loss and freshness contract |
| --- | --- | --- |
| Lookaside cache | Cassandra or a backend service remains authoritative; a miss reloads it | Eviction is expected; TTL and invalidation bound staleness |
| Transient session state | EVCache may hold the only short-lived coordination value | Loss changes session behavior, so clients need an explicit restart or recovery path |
| Precomputed primary read store | An offline job computes profile homepages and publishes a new generation | Online reads depend on the published generation; retain or regenerate the last good output before replacing it |
| High-volume distribution plane | A publisher computes UI strings or translations from an upstream authority | Readers need versioned publication, rollback, and a policy for an unavailable or partial generation |

![[System Design 101/99db2205a756cc262763e054b626babd0b0033a72a64d2ae5d97dfbcfed2f6b0.png]]

The EVCache project describes stored values as ephemeral and volatile: TTL expiry and eviction are part of the product contract. Calling a use "primary store" therefore means the online read path is primary, not that an evictable value suddenly has database durability.

## Redis and Memcached

Choose between them by the state contract:

| Dimension | Memcached | Redis |
| --- | --- | --- |
| Core model | Ephemeral opaque values distributed in memory | Typed in-memory structures with atomic commands |
| Capacity behavior | Slab classes and segmented LRU reclaim expired or unexpired items | Configurable `maxmemory-policy`; `noeviction` rejects memory-growing writes at the limit |
| Persistence and failover | The application treats loss as a miss and repopulates | Optional RDB snapshots and/or AOF plus asynchronous replication; loss window depends on configuration |
| Coordination features | CAS supports compare-and-set of a cached value | Atomic commands, scripts, streams, Pub/Sub, replication, Sentinel, and Cluster add capability and operating surface |
| Scaling shape | Clients usually distribute keys; simple nodes are easy to replace | Redis Cluster shards key slots and requires cluster-aware multi-key design |

Use Memcached for a plain, disposable object cache when simple replacement and predictable memory use are the goal. Use Redis when the workload benefits from server-side data structures or atomic operations and the team accepts the persistence, replication, and cluster choices those roles introduce. Redis commands are atomic at command execution; that is not the same guarantee as a relational transaction spanning arbitrary reads and writes.

## Redis as a cache or system of record

For a cache, `maxmemory`, an eviction policy, TTLs, and origin protection define success. For a system of record, eviction must not discard authoritative keys, and the write acknowledgement must name its data-loss window:

- **RDB** takes point-in-time snapshots. It starts and restores compactly but can lose writes since the last snapshot.
- **AOF** records write operations. `appendfsync everysec` commonly accepts about a second of crash loss; stricter syncing costs latency. AOF and RDB can be combined.
- **Replication** is asynchronous by default. `WAIT` reduces the chance that a failover loses a write, but Redis documents that it does not turn the deployment into a strongly consistent CP system.
- **Pub/Sub** is at-most-once and has no replay: a disconnected subscriber loses the message. **Streams** retain entries and consumer-group state, but their durability still inherits AOF/RDB and asynchronous-replication settings.
- **Cluster** partitions keys across hash slots. Multi-key operations, transactions, and scripts need keys in the same slot; failover and resharding are operational behavior, not transparent capacity.

If losing an acknowledged value is unacceptable, test the exact Redis persistence and failover configuration under process kill, host loss, and replica promotion. Do not infer durability from the fact that persistence is enabled.

## Why Redis is fast—and when it stalls

Redis serves the working set from memory, multiplexes many client sockets, and executes most commands in a mostly serialized command path. This avoids per-key disk seeks and much lock coordination, while compact encodings and specialized data structures keep common operations cheap. Network round trips often dominate a small command, so pipelining or aggregate commands improve throughput by batching socket work.

The same execution model makes one slow command visible to other clients. Large-key deletion or traversal, an `O(N)` command, Lua or module work, fork and copy-on-write pressure during persistence, AOF flushing, swapping, and network queues can create tail-latency spikes. Redis uses background threads for some I/O work and supports threaded network I/O in current releases; "Redis is single-threaded" is therefore too broad. Benchmark the actual command mix and payload sizes, then watch slow-command, latency, big-key, memory, persistence, and replication-lag metrics.

The source performance graphic is not embedded because it presents all read/write processing as single-threaded and shows the obsolete ziplist encoding as a current general implementation. Those details are version-sensitive and cannot support the broader performance claim.

## References

- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) — RDB, AOF, combined, and no-persistence modes with their data-loss and recovery tradeoffs.
- [Redis replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/) — asynchronous replication, partial/full resynchronization, `WAIT`, and remaining failover loss windows.
- [Redis Pub/Sub](https://redis.io/docs/latest/develop/pubsub/) and [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/) — at-most-once transient delivery versus retained entries and consumer-group state.
- [Redis pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/) and [latency diagnosis](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/) — round-trip batching and the command, persistence, fork, swapping, and network sources of latency.
- [Memcached performance](https://docs.memcached.org/serverguide/performance/) — multithreaded event processing, slab allocation, segmented LRU, expiry, and capacity eviction.
- [Netflix EVCache](https://github.com/Netflix/EVCache) — primary project documentation for EVCache's ephemeral, volatile, TTL-bound contract.
