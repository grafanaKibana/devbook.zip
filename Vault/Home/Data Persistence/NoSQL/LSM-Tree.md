---
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: "A write-optimized storage engine that buffers writes in memory and flushes immutable sorted files, trading read amplification for sequential-write throughput — the B-tree's counterpart."
level:
  - "4"
priority: High
status: Creation
publish: true
---

A [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] keeps its keys sorted on disk by updating pages in place: an insert finds the right page and eventually rewrites it where it lives. That is ideal for reads, but small updates commonly become random page writes, and ingest-heavy workloads — event logs, time-series, high-write feeds — can thrash the disk rewriting scattered pages alongside their write-ahead-log records.

An LSM-Tree (Log-Structured Merge-Tree) inverts the deal: it does not update user records inside an existing SSTable. A write is appended to a log and an in-memory buffer, then acknowledged according to the engine's configured durability policy. When the buffer fills, it is flushed to disk as one **immutable, sorted file** written in a sequential pass. An update to an existing key writes a newer version; a delete writes a small marker called a **tombstone**. Existing SSTables are not edited; older versions are shadowed by newer ones. A background process later merges these files, keeping the newest version of each key and physically discarding the rest. The result is that random user-data updates become sequential flushes and merges — the write-optimized counterpart to the B-tree, tuned for how fast you can ingest rather than how fast you can point-read.

**Core shape:** append to WAL + in-memory memtable → flush full memtable as an immutable sorted SSTable → read memtable then candidate SSTables newest→oldest (Bloom-filter pruned) → background compaction merges SSTables and eventually garbage-collects obsolete versions under engine safety rules → sequential writes, `O(n)` live-data storage plus temporary and obsolete-version overhead.

# Write path

Three steps, all sequential or in-memory:

1. **Write-ahead log (WAL).** Every mutation is appended to an on-disk log — a commit log. With synchronous durability, the engine flushes the required log record before acknowledging; weaker modes may acknowledge before that flush and accept a crash-loss window. The WAL makes the memtable write recoverable under the configured durability contract.
2. **Memtable.** The same key/value is inserted into the memtable, an in-memory *sorted* structure — commonly a skiplist — so entries stay in key order and support ordered iteration and fast merges. An update to an existing key does not search-and-overwrite; it inserts a newer entry that shadows the old one. A delete inserts a tombstone carrying the engine's ordering metadata, such as a sequence number, timestamp, or version, so reconciliation can determine which value it supersedes.
3. **Flush.** When the memtable reaches its size threshold it is frozen (made immutable) and a fresh memtable takes over new writes. The frozen memtable is written to disk as an **SSTable** (Sorted String Table): a single immutable file, keys already in sorted order, emitted in one sequential pass. Once an SSTable is durable, the WAL segments it covers can be recycled.

Because the flush is one big sequential write of pre-sorted data, the disk sees a stream of appends rather than scattered page updates — this is the whole point.

# Read path

A key can live in the memtable or in any SSTable, and newer always wins, so a read walks from newest to oldest:

1. Check the active memtable (and any frozen memtables not yet flushed) — the freshest data.
2. Then SSTables from newest to oldest, stopping at the first one that holds the key.

Naively that is one disk probe per SSTable — the source of read amplification. Two structures prune it hard:

- A **[[Home/Computer Science/Data Structures/Hash-based Structures/Bloom Filter|Bloom Filter]]** over each SSTable's keys answers "**definitely not in this file**" with no disk read, skipping the vast majority of SSTables for a key they don't contain (at the cost of occasional false positives, never false negatives).
- A **sparse block index** — one entry per data block, not per key — locates the single block that could hold the key, so a real hit reads one block and binary-searches inside it. Hot blocks are held in a block cache (see [[Home/Data Persistence/Caching|Caching]]) so repeat reads skip the disk entirely.

The first version found — a value or a tombstone — wins; a tombstone means the key is absent.

# Compaction

Left alone, SSTables would accumulate forever, every read would probe more files, and deleted or overwritten data would never leave the disk. **Compaction** merge-sorts selected SSTables into new files and discards obsolete versions only when the engine can prove no supported reader or repair path still needs them. A tombstone may need to remain while an older snapshot can observe the deleted value, while a replica is behind, or until anti-entropy/repair rules make resurrection impossible; each engine exposes different grace periods and snapshot or sequence-number checks. Compaction reclaims space and controls how many files a read may consult, but it does not make every tombstone immediately collectible.

- **Size-tiered (STCS).** Groups SSTables of similar size; when enough of one size accumulate, they merge into one bigger file. Fewer rewrites → **low write amplification**, but a key's live version can sit across several size tiers → **higher read and space amplification** (a compaction can transiently need roughly twice the data's size).
- **Leveled (LCS).** Organizes SSTables into levels L0, L1, L2…, each roughly larger than the previous. Except L0, SSTables within one level cover non-overlapping key ranges, so a point read has at most one candidate file per nonzero level. L0 files can overlap each other and may all be candidates until compaction moves them down; engines also vary in whether they use sublevels or other L0 controls. Leveled compaction therefore bounds the steady-state nonzero-level search but can still suffer an L0 read-amplification spike. The cost is higher write amplification as keys cascade down levels.

# Amplification tradeoffs

An LSM-Tree buys sequential-write throughput by paying in three amplifications, and no compaction strategy minimizes all three at once:

- **Write amplification** = bytes physically written ÷ bytes the application wrote. The initial flush writes each byte once, but compaction rewrites data repeatedly. Leveled compaction pays more here to save the other two.
- **Read amplification** = physical reads ÷ logical read. A point read may probe several SSTables; Bloom filters eliminate most, but range scans and false positives still cost extra reads.
- **Space amplification** = bytes on disk ÷ bytes of live data. Obsolete versions and tombstones linger until compaction reclaims them.

Size-tiered favors write throughput (low write amp, high space/read amp); leveled favors reads and compactness (low read/space amp, high write amp). You pick which amplification your workload can afford.

# B-tree vs LSM-Tree

This is a cross-area comparison, so it lives here rather than in the [[Home/Computer Science/Data Structures/Trees/B-tree|B-tree]] note. The two are the read-optimized and write-optimized poles of on-disk ordered storage:

| Dimension | B-tree | LSM-Tree |
| --- | --- | --- |
| Update model | in-place page update | append a new version, reconcile later |
| Disk write pattern | random-ish page writes | sequential appends + sequential compaction |
| Optimized for | reads; point and range lookups | writes; high ingest throughput |
| Read cost | one path root→leaf | memtable + several SSTables (Bloom-pruned) |
| Write amplification | page rewrite + WAL (≥2×, higher for small random updates) | flush once, then repeated compaction (strategy-dependent) |
| Space | pages ~50–70% full, fragments over time | densely packed immutable files, compresses well |
| Typical home | RDBMS indexes, most OLTP | wide-column / key-value NoSQL, time-series, logs |

Neither is strictly better: a B-tree wins read-heavy and range-scan-heavy workloads with predictable latency; an LSM-Tree wins write-heavy ingest and gets better on-disk compression from its dense, immutable files.

![[Data Persistence/Data Persistence-LSM-Tree-18120000.png]]

# Complexity

| Operation | Disk I/O | In-memory work | Cause |
| --- | --- | --- | --- |
| Point write | amortized sequential (WAL append + eventual flush) | `O(log m)` memtable insert | no in-place update; writes batched and flushed in one sequential pass |
| Point read | Strategy-dependent: candidate L0 files plus at most one file per nonzero level for leveled compaction; potentially several overlapping runs for tiered/universal compaction | Bloom check plus sparse-index search per candidate SSTable | overlap and compaction strategy determine the bound; Bloom filters skip definite misses |
| Range scan | seeks across every overlapping run | k-way merge of sorted runs | results are scattered across the memtable and multiple SSTables |
| Compaction (background) | rewrites merged SSTables sequentially | merge-sort of already-sorted runs | reclaims space, finalizes tombstones, bounds read amplification |

Here `m` is the memtable's entry count and `n` the total key count. The decisive property is that the user-data path avoids random in-place SSTable updates: writes are amortized into sequential flushes and merges. The WAL, manifest, filesystem metadata, or engine housekeeping can still issue other I/O. The LSM-Tree buys its user-data write pattern in exchange for multi-SSTable reads and background compaction load.

# Where it's used

LSM-Trees underlie many write-optimized stores. Among the wide-column and key-value families (see [[Home/Data Persistence/NoSQL/NoSQL Database Types|NoSQL Database Types]]): **Cassandra**, **ScyllaDB**, **HBase**, and Google **Bigtable**. Embeddable engines include **RocksDB** and its ancestor **LevelDB**.

# Reference drawer

> [!ABSTRACT]- Write, flush, and compaction flow
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
> A write fans out to the WAL and memtable; acknowledgement follows the configured log-flush policy. A full memtable flushes to one immutable SSTable. Compaction merges SSTables and garbage-collects a tombstone only after engine snapshot, replication, and repair rules make the delete safe to finalize. Reads walk newest→oldest, using Bloom filters to skip files that cannot hold the key.

# Questions

> [!QUESTION]- Why are SSTables immutable?
> Immutability lets the engine create SSTables and compaction outputs with sequential file writes, then install the completed files without overwriting data that concurrent readers are using. Recovery still has work to do: replay the WAL into a memtable, read the manifest or version set to identify the live SSTables, and discard incomplete output files that were never installed. Dense, static files also compress well. The price is that updates and deletes write new versions and tombstones, so background **compaction** must reconcile versions and reclaim space.

> [!QUESTION]- What is the read-vs-write amplification tradeoff, and how does compaction strategy control it?
> Write amplification is bytes written to disk per byte the app wrote; read amplification is disk reads per logical read; space amplification is on-disk bytes per byte of live data. Compaction cannot minimize all three at once. **Size-tiered** rewrites data rarely (low write amp) but leaves a key's live version spread across tiers (high read and space amp). **Leveled** keeps non-overlapping ranges per level so a read hits at most one file per level (low read and space amp) but rewrites each key as it descends levels (high write amp). You choose which amplification the workload can afford.

> [!QUESTION]- When does a B-tree beat an LSM-Tree?
> When reads dominate and latency must be predictable. A B-tree point lookup follows one root-to-leaf path; a range lookup follows that path to the first matching leaf, then traverses the required leaf pages. An LSM range scan instead performs a k-way merge across the memtable and every overlapping SSTable run, while point reads may probe several Bloom-filter candidates. That difference favors B-trees for read-heavy OLTP and range scans; LSM-Trees favor write-heavy ingest but pay multi-run read and background compaction costs.

# References

- [O'Neil, Cheng, Gawlick & O'Neil — The Log-Structured Merge-Tree (LSM-Tree), Acta Informatica 33 (1996)](https://doi.org/10.1007/s002360050048) — the original paper defining the buffer-and-merge design and its amplification analysis; the primary source for everything above.
- [RocksDB wiki — Leveled Compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction) — precise mechanics of levels, non-overlapping ranges, and the write-amplification cost of LCS in a production engine.
- [Apache Cassandra — storage engine](https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html) — memtable, commit log, and SSTable flush described from a shipping wide-column store.
- [LevelDB — implementation notes](https://github.com/google/leveldb/blob/main/doc/impl.md) — the SSTable-plus-compaction design that popularized the modern LSM layout, with the sparse-index and Bloom-filter read path.
- [B-Tree vs LSM-Tree (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/b-tree-vs.md) — visual comparison of the two storage-engine write and read paths; used as editorial provenance alongside the primary engine references above.
