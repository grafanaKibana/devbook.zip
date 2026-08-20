---
publish: true
created: 2026-08-20T20:41:15.614Z
modified: 2026-08-20T20:41:15.614Z
published: 2026-08-20T20:41:15.614Z
topic:
  - Data Persistence
subtopic: []
summary: How k+m data and parity shards trade storage efficiency for reconstruction work.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Erasure coding turns an object into `k` data shards and `m` coding shards. With a maximum-distance-separable code such as Reed-Solomon, any `k` surviving shards can reconstruct the object. A `(k, m)` layout can therefore lose as many as `m` shards when failures are independent and placement is correct. Other code families may recover from different shard combinations. The design saves capacity on large durable data sets and pays for it during encoding, degraded reads, and repair.

A `4+2` layout for a 1 GiB object produces four 256 MiB data shards and two coding shards of the same size. The six shards consume 1.5 GiB, an overhead factor of `(4 + 2) / 4 = 1.5`. Three-copy replication consumes 3 GiB. The capacity saving moves cost into the write and recovery paths.

![[Assets/Data Persistence/Data Persistence-Erasure Coding-18120000.png]]

# Write and Reconstruction Path

A full-object write crosses four boundaries:

1. Split the object into `k` equal data shards.
2. Calculate `m` independent coding shards with an erasure-code implementation such as Reed-Solomon.
3. Place all `k+m` shards in distinct failure domains.
4. Acknowledge the write only after the configured durability condition is met.

Placement supplies the fault tolerance. Six shards on six disks in one server still share one server failure. A `4+2` policy intended to tolerate two rack failures needs six suitable rack failure domains, with one shard placed in each. Ceph expresses that boundary through `crush-failure-domain`.

Suppose disks holding `d3` and `d4` fail in the `4+2` example. A reader can fetch `d1`, `d2`, `p1`, and `p2`, decode the missing values, and return the object. Repair then writes replacement `d3` and `d4` shards elsewhere. If a third independent shard disappears before repair completes, fewer than `k` shards remain and the object is lost.

Reconstruction consumes network bandwidth and healthy-disk I/O. Restoring one missing 256 MiB shard can mean reading four surviving 256 MiB shards, decoding 1 GiB, then writing the replacement. During a large failure, repair competes with foreground traffic. The nominal `m` value says little without repair bandwidth and the time spent degraded.

# Small Writes and Rebuild Cost

A small in-place update is awkward because each coding shard covers a stripe rather than one independent field. Depending on the engine, changing a few kilobytes may trigger a read-modify-write cycle across several shards. Full-stripe writes avoid part of that amplification. Current Ceph releases also offer erasure-coding optimizations for supported profiles, but profile choice and small-I/O behavior still need measurement.

Large immutable objects, backups, and colder media fit this trade. Metadata, indexes, journals, and latency-sensitive random writes often remain replicated even when the bulk payload uses erasure coding.

# Erasure Coding versus Replication

| Concern | `4+2` erasure coding | Three-copy replication |
| --- | --- | --- |
| Storage for 1 GiB logical data | 1.5 GiB | 3 GiB |
| Concurrent shard/copy losses tolerated | Any two of six shards for this Reed-Solomon `4+2` layout, if failures are independent | Any two copies, if failures are independent |
| Healthy read | Usually reads data shards. Implementation may reconstruct around slow shards | Reads one complete copy |
| Write path | Encode and place six shards | Write three complete copies |
| Degraded read and repair | Read multiple surviving shards and decode | Read one surviving copy and copy it |
| Best fit | Large objects where capacity cost dominates | Hot or small data where latency and fast repair dominate |

Neither policy supplies a durability number by itself. Correlated rack failures, latent corruption, placement mistakes, repair time, and operational response determine whether the theoretical tolerance holds. Backups still protect against deletion, bad writes, and failures that all replicas or shards faithfully preserve.

# References

- [Ceph erasure-code documentation](https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
