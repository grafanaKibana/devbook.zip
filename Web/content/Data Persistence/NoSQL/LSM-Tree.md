---
publish: true
created: 2026-08-20T20:41:15.615Z
modified: 2026-08-25T13:45:27.877Z
published: 2026-08-25T13:45:27.877Z
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: A write-optimized storage engine that buffers writes in memory and flushes immutable sorted files, trading read amplification for sequential-write throughput — the B-tree's counterpart.
level:
  - "4"
priority: High
status: Creation
---

A [[Computer Science/Data Structures/Trees/B-tree|B-tree]] keeps keys ordered in pages and updates those pages in place. That gives point and range reads a short search path, but small updates can become scattered page writes alongside write-ahead-log records.

An LSM-Tree (Log-Structured Merge-Tree) changes that write path. It appends a mutation to a log and an in-memory sorted buffer, then acknowledges according to the configured durability policy. When the buffer fills, the engine writes it as an immutable, sorted SSTable in one sequential pass. Updates create newer versions and deletes create **tombstones**. Existing SSTables are never edited. Background compaction later merges files and discards obsolete entries when it is safe to do so. The design trades extra read and compaction work for high sequential-write throughput.

**Core shape:** append to WAL and memtable → flush a full memtable as an immutable sorted SSTable → collect candidates from the memtables and SSTables, then reconcile their version metadata → compact SSTables and eventually reclaim safe obsolete versions. Bloom filters and sparse indexes reduce the number and cost of SSTable reads.

# Write Path

The write path has three stages:

1. **Write-ahead log (WAL).** Every mutation is appended to an on-disk commit log. A synchronous durability mode flushes the required record before acknowledging. Weaker modes acknowledge earlier and accept a crash-loss window. The WAL makes acknowledged memtable state recoverable within that contract.
2. **Memtable.** The mutation also enters an in-memory sorted structure, commonly a skiplist. An update inserts a newer entry that shadows the old one. A delete inserts a tombstone with ordering metadata, such as a sequence number, timestamp, or version, so reconciliation can identify the value it supersedes.
3. **Flush.** At its size threshold, the memtable becomes immutable and a fresh memtable accepts new writes. The frozen memtable is emitted in key order as an **SSTable** (Sorted String Table). Once that SSTable is durable, covered WAL segments can be recycled.

The flush turns many small mutations into a sequential write of already sorted data. That conversion is the central advantage of the design.

# Read Path

A key can exist in the memtable and in several SSTables. The newest version visible to the read wins, so the generic point-read path must reconcile every candidate that might be newer:

1. Check the active memtable and any frozen memtables not yet flushed.
2. Use range metadata and Bloom filters to identify candidate SSTables.
3. Compare the candidates' sequence numbers, timestamps, or other engine-specific version metadata under the read's snapshot rules.

An implementation may stop at the first match only when its search order proves that no later source can contain a newer visible version. LevelDB and RocksDB use this kind of engine-specific ordering: memtables precede SSTables, overlapping level-zero files are searched newest first, and nonzero levels have non-overlapping key ranges. That shortcut follows from their version and level invariants. It is not a general LSM-Tree rule.

Without supporting indexes, that path could require one disk probe per SSTable. Two structures remove most of those probes:

- A **[[Computer Science/Data Structures/Hash-based Structures/Bloom Filter|Bloom Filter]]** over an SSTable's keys can prove that the key is absent without reading the file. False positives cause unnecessary checks, but false negatives do not occur.
- A **sparse block index** has one entry per data block rather than per key. It locates the block that could contain a key, after which the engine searches within that block. A block cache (see [[Data Persistence/Caching|Caching]]) avoids repeat disk reads for hot blocks.

After reconciliation, the newest visible entry wins. If that entry is a tombstone, the key is absent even when an older SSTable still contains a value.

# Compaction

Without compaction, SSTables accumulate, reads consult more files, and overwritten data remains on disk. **Compaction** merge-sorts selected SSTables into new files. It discards an obsolete version only after the engine can prove that no supported reader or repair path still needs it. Tombstones may need to survive old snapshots, lagging replicas, or anti-entropy repair windows, depending on the engine. Compaction therefore controls read and space amplification. It does not make every tombstone immediately collectible.

- **Size-tiered (STCS).** SSTables of similar size are merged into larger files. Fewer rewrites usually mean lower write amplification, but overlapping runs leave more candidate files for reads and retain more obsolete data. Compaction also needs temporary disk space for its output.
- **Leveled (LCS).** SSTables are organized into increasingly large levels. Except for L0, files within a level cover non-overlapping key ranges, so a point read has at most one candidate file per nonzero level. L0 files can overlap and may all be candidates until compaction moves them down. Leveled compaction bounds the steady-state search across later levels but pays more write amplification as keys move downward.

# Amplification Tradeoffs

An LSM-Tree buys sequential-write throughput by paying in three forms of amplification. No compaction strategy minimizes all three at once:

- **Write amplification** = bytes physically written ÷ bytes the application wrote. The initial flush writes each byte once, but compaction rewrites data repeatedly. Leveled compaction pays more here to save the other two.
- **Read amplification** = physical reads ÷ logical read. A point read may probe several SSTables. Bloom filters eliminate most, but range scans and false positives still cost extra reads.
- **Space amplification** = bytes on disk ÷ bytes of live data. Obsolete versions and tombstones linger until compaction reclaims them.

Size-tiered compaction generally favors write throughput. Leveled compaction generally favors reads and compactness. The workload determines which amplification is acceptable.

# B-tree Vs LSM-Tree

The comparison with a [[Computer Science/Data Structures/Trees/B-tree|B-tree]] exposes the decision boundary:

| Dimension | B-tree | LSM-Tree |
| --- | --- | --- |
| Update model | in-place page update | append a new version, reconcile later |
| Disk write pattern | random-ish page writes | sequential appends + sequential compaction |
| Typical strength | predictable point and range reads | high ingest throughput |
| Read cost | one path root→leaf | memtable + several SSTables (Bloom-pruned) |
| Write amplification | WAL plus page rewrites. Engine-dependent | flush once, then repeated compaction. Strategy-dependent |
| Space | depends on page fill, fragmentation, and engine maintenance | dense immutable files plus obsolete-version and compaction overhead |
| Typical home | RDBMS indexes, most OLTP | wide-column / key-value NoSQL, time-series, logs |

Neither structure is universally better. B-trees favor predictable point reads and range scans. LSM trees favor write-heavy ingestion and often compress dense immutable files well, while accepting multi-run reads and background compaction.

![[Assets/Data Persistence/Data Persistence-LSM-Tree-18120000.png|theme-aware]]

# Complexity

| Operation | Disk I/O | In-memory work | Cause |
| --- | --- | --- | --- |
| Point write | amortized sequential (WAL append + eventual flush) | `O(log m)` memtable insert | no in-place update. Writes batched and flushed in one sequential pass |
| Point read | Strategy-dependent: candidate L0 files plus at most one file per nonzero level for leveled compaction. Potentially several overlapping runs for tiered/universal compaction | Bloom check plus sparse-index search per candidate SSTable | overlap and compaction strategy determine the bound. Bloom filters skip definite misses |
| Range scan | seeks across every overlapping run | k-way merge of sorted runs | results are scattered across the memtable and multiple SSTables |
| Compaction (background) | rewrites merged SSTables sequentially | merge-sort of already-sorted runs | reclaims space, finalizes tombstones, bounds read amplification |

Here `m` is the memtable's entry count. The decisive property is that the user-data path avoids random in-place SSTable updates: writes are amortized into sequential flushes and merges. The WAL, manifest, filesystem metadata, and engine housekeeping can still issue other I/O. Multi-SSTable reads and background compaction are the cost of that write path.

# Where It's Used

LSM trees underlie many write-optimized stores. Among the wide-column and key-value families (see [[Data Persistence/NoSQL/NoSQL Database Types|NoSQL Database Types]]) are **Cassandra**, **ScyllaDB**, **HBase**, and Google **Bigtable**. Embeddable engines include **RocksDB** and its ancestor **LevelDB**.

# Write, Flush, and Compaction Flow

> [!ABSTRACT]- Write, flush, and compaction flow
>
> ```mermaid
> graph TD
>   W["write / update / delete"] --> WAL["WAL append (flush per durability policy)"]
>   W --> MT["memtable (sorted skiplist)"]
>   MT -->|"full → freeze"| SS0["SSTable (immutable, sorted)"]
>   SS0 --> C{"background compaction"}
>   SS1["older SSTables"] --> C
>   C -->|"merge; garbage-collect only safe obsolete entries"| SSM["fewer, larger SSTables"]
>   R["read key"] -.->|"newest first"| MT
>   R -.->|"Bloom-filter pruned"| SS0
>   R -.-> SS1
> ```
>
> A write fans out to the WAL and memtable. Acknowledgement follows the configured log-flush policy. A full memtable flushes to one immutable SSTable. Compaction merges SSTables and garbage-collects a tombstone only after engine snapshot, replication, and repair rules make the delete safe to finalize. Reads use Bloom filters to skip files that cannot hold the key, then reconcile every remaining candidate unless the engine's search order proves an earlier match is newest.

# References

- [The Log-Structured Merge-Tree paper](https://doi.org/10.1007/s002360050048)
- [RocksDB leveled compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction)
