---
topic:
  - Data Persistence
subtopic: []
summary: "How k+m data and parity shards trade storage efficiency for reconstruction work."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

Erasure coding protects data by turning an object into `k` data shards plus `m` coding shards. With a maximum-distance-separable code such as Reed-Solomon configured as `(k, m)`, any `k` surviving shards can reconstruct the original object, so the system can lose up to `m` shards without losing data. Other erasure-code families and implementations can have different recoverable shard combinations. It is a storage-efficiency choice for large, durable data sets; it is not a faster form of replication.

A `4+2` layout for a 1 GiB object produces four 256 MiB data shards and two 256 MiB coding shards. The six shards consume 1.5 GiB, an overhead factor of `(4 + 2) / 4 = 1.5`. Three-copy replication consumes 3 GiB for the same logical object. The saving is bought with encoding work on writes and reconstruction work after failures.

![[System Design 101/3977a046e208bb3d879161d73c64b9cb1962e0e8f3d59962df271589723bec54.png]]

# Write and Reconstruction Path

For a full-object write, the storage system follows four boundaries:

1. Split the object into `k` equal data shards.
2. Calculate `m` independent coding shards with an erasure-code implementation such as Reed-Solomon.
3. Place all `k+m` shards in distinct failure domains.
4. Acknowledge the write only after the configured durability condition is met.

Placement is part of the protection. Six shards on six disks in one server do not survive a server failure. A `4+2` policy intended to tolerate two rack failures needs shards placed across at least six suitable rack failure domains; Ceph expresses that boundary with `crush-failure-domain`.

Suppose disks holding `d3` and `d4` fail in the `4+2` example. A reader can fetch `d1`, `d2`, `p1`, and `p2`, decode the missing values, and return the object. Repair then writes replacement `d3` and `d4` shards elsewhere. If a third independent shard disappears before repair completes, fewer than `k` shards remain and the object is lost.

The reconstruction cost is visible on the network and healthy disks. Restoring one missing 256 MiB shard can require reading four surviving 256 MiB shards, decoding 1 GiB, and writing the replacement. During a large failure, that work competes with foreground reads and writes. Repair bandwidth, failure-domain count, and time exposed in degraded mode matter as much as the nominal `m` value.

# Small Writes and Rebuild Cost

A small in-place update is awkward because each coding shard describes a stripe, not one independent field. Depending on the storage engine, changing a few kilobytes may require a read-modify-write cycle: read the affected data/coding shards, calculate the parity delta, and write multiple shards. Full-stripe writes avoid some of this amplification.

That makes erasure coding a good fit for immutable objects, backups, media, and colder data written in large units. Metadata, indexes, journals, and latency-sensitive small random writes often remain replicated even when their bulk data uses erasure coding.

# Erasure Coding versus Replication

| Concern | `4+2` erasure coding | Three-copy replication |
| --- | --- | --- |
| Storage for 1 GiB logical data | 1.5 GiB | 3 GiB |
| Concurrent shard/copy losses tolerated | Any two of six shards for this Reed-Solomon `4+2` layout, if failures are independent | Any two copies, if failures are independent |
| Healthy read | Usually reads data shards; implementation may reconstruct around slow shards | Reads one complete copy |
| Write path | Encode and place six shards | Write three complete copies |
| Degraded read and repair | Read multiple surviving shards and decode | Read one surviving copy and copy it |
| Best fit | Large objects where capacity cost dominates | Hot or small data where latency and fast repair dominate |

Neither policy supplies a durability number by itself. Correlated rack failures, latent corruption, placement mistakes, repair time, and operational response determine whether the theoretical tolerance holds. Backups still protect against deletion, bad writes, and failures that all replicas or shards faithfully preserve.

# References

- [Ceph erasure-code documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code/) — defines `k`, `m`, failure-domain placement, space amplification, overwrite constraints, and recovery behavior in a production storage system.
- [Ceph CRUSH maps](https://docs.ceph.com/en/latest/rados/operations/crush-map/) — documents how device and rack topology controls placement across independent failure domains.
- [Erasure Coding (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/erasure-coding.md) — source `4+2` reconstruction example and imported diagram; durability depends on the placement and repair boundaries added above.
