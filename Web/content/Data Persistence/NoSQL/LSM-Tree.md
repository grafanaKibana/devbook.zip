---
publish: true
created: 2026-07-15T08:11:32.112Z
modified: 2026-07-15T08:11:32.112Z
published: 2026-07-15T08:11:32.112Z
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

# Intro

A [[B-tree]] keeps its keys sorted on disk by updating pages in place: an insert finds the right page and rewrites it where it lives. That is ideal for reads, but every write is a small random write to a specific page, and ingest-heavy workloads — event logs, time-series, high-write feeds — thrash the disk rewriting scattered pages and their write-ahead-log copies.

An LSM-Tree (Log-Structured Merge-Tree) inverts the deal: it **never updates data in place**. A write is appended — to a durable log and to an in-memory buffer — and acknowledged immediately. When the buffer fills, it is flushed to disk as one **immutable, sorted file** written in a single sequential pass. An update to an existing key just writes a newer version; a delete writes a small marker called a **tombstone**. Nothing on disk is ever edited; older versions are simply shadowed by newer ones. A background process later merges these files, keeping the newest version of each key and physically discarding the rest. The result is that random writes become sequential appends — the write-optimized counterpart to the B-tree, tuned for how fast you can ingest rather than how fast you can point-read.

**Core shape:** append to WAL + in-memory memtable → flush full memtable as an immutable sorted SSTable → read memtable then SSTables newest→oldest (Bloom-filter pruned) → background compaction merges SSTables, drops tombstones → sequential writes, `O(n)` storage.

## Write path

Three steps, all sequential or in-memory:

1. **Write-ahead log (WAL).** Every mutation is appended to an on-disk log — a commit log — before the write is acknowledged. This append is sequential and makes the write crash-durable even though the data itself is still only in memory.
2. **Memtable.** The same key/value is inserted into the memtable, an in-memory _sorted_ structure — commonly a skiplist — so entries stay in key order and support ordered iteration and fast merges. An update to an existing key does not search-and-overwrite; it inserts a newer entry that shadows the old one. A delete inserts a tombstone timestamped so later reconciliation knows it supersedes older values.
3. **Flush.** When the memtable reaches its size threshold it is frozen (made immutable) and a fresh memtable takes over new writes. The frozen memtable is written to disk as an **SSTable** (Sorted String Table): a single immutable file, keys already in sorted order, emitted in one sequential pass. Once an SSTable is durable, the WAL segments it covers can be recycled.

Because the flush is one big sequential write of pre-sorted data, the disk sees a stream of appends rather than scattered page updates — this is the whole point.

## Read path

A key can live in the memtable or in any SSTable, and newer always wins, so a read walks from newest to oldest:

1. Check the active memtable (and any frozen memtables not yet flushed) — the freshest data.
2. Then SSTables from newest to oldest, stopping at the first one that holds the key.

Naively that is one disk probe per SSTable — the source of read amplification. Two structures prune it hard:

- A **[[Bloom Filter]]** over each SSTable's keys answers "**definitely not in this file**" with no disk read, skipping the vast majority of SSTables for a key they don't contain (at the cost of occasional false positives, never false negatives).
- A **sparse block index** — one entry per data block, not per key — locates the single block that could hold the key, so a real hit reads one block and binary-searches inside it. Hot blocks are held in a block cache (see [[Data Persistence/Caching|Caching]]) so repeat reads skip the disk entirely.

The first version found — a value or a tombstone — wins; a tombstone means the key is absent.

## Compaction

Left alone, SSTables would accumulate forever, every read would probe more files, and deleted or overwritten data would never actually leave the disk. **Compaction** is the background job that merge-sorts overlapping SSTables into fewer, larger ones — keeping only the newest version of each key and physically dropping tombstones (and the versions they bury) once no older SSTable can still hold that key. It reclaims space, bounds how many SSTables a read must consult, and is where deletes are finally realized. The choice of strategy is the central tuning knob:

- **Size-tiered (STCS).** Groups SSTables of similar size; when enough of one size accumulate, they merge into one bigger file. Fewer rewrites → **low write amplification**, but a key's live version can sit across several size tiers → **higher read and space amplification** (a compaction can transiently need roughly twice the data's size).
- **Leveled (LCS).** Organizes SSTables into levels L0, L1, L2…, each roughly 10× the previous. Except L0, the SSTables within a level cover **non-overlapping** key ranges, so a key appears in **at most one SSTable per level** — a read touches at most one file per level (**bounded read amplification**) and space overhead stays small. The cost: a key is rewritten each time it cascades down a level → **higher write amplification**.

## Amplification tradeoffs

An LSM-Tree buys sequential-write throughput by paying in three amplifications, and no compaction strategy minimizes all three at once:

- **Write amplification** = bytes physically written ÷ bytes the application wrote. The initial flush writes each byte once, but compaction rewrites data repeatedly. Leveled compaction pays more here to save the other two.
- **Read amplification** = physical reads ÷ logical read. A point read may probe several SSTables; Bloom filters eliminate most, but range scans and false positives still cost extra reads.
- **Space amplification** = bytes on disk ÷ bytes of live data. Obsolete versions and tombstones linger until compaction reclaims them.

Size-tiered favors write throughput (low write amp, high space/read amp); leveled favors reads and compactness (low read/space amp, high write amp). You pick which amplification your workload can afford.

## B-tree vs LSM-Tree

This is a cross-area comparison, so it lives here rather than in the [[B-tree]] note. The two are the read-optimized and write-optimized poles of on-disk ordered storage:

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

## Complexity

| Operation | Disk I/O | In-memory work | Cause |
| --- | --- | --- | --- |
| Point write | amortized sequential (WAL append + eventual flush) | `O(log m)` memtable insert | no in-place update; writes batched and flushed in one sequential pass |
| Point read | `O(1)` to `O(levels)` block reads | `O(1)` Bloom check + `O(log b)` sparse-index binary search per candidate SSTable | must check memtable then SSTables newest→oldest; Bloom filters skip most |
| Range scan | seeks across every overlapping run | k-way merge of sorted runs | results are scattered across the memtable and multiple SSTables |
| Compaction (background) | rewrites merged SSTables sequentially | merge-sort of already-sorted runs | reclaims space, finalizes tombstones, bounds read amplification |

Here `m` is the memtable's entry count and `n` the total key count. The decisive property is that no operation issues a random in-place write: writes are amortized into sequential flushes and merges, which is exactly the cost a B-tree pays and an LSM-Tree avoids — in exchange for the multi-SSTable read and the background compaction load.

## Where it's used

LSM-Trees underlie most write-optimized stores. Among the wide-column and key-value families (see [[NoSQL Database Types]]): **Cassandra**, **ScyllaDB**, **HBase**, and Google **Bigtable**. As embeddable engines that many other systems build on: **RocksDB** (which powers state stores in Kafka Streams, TiKV, CockroachDB, and more) and its ancestor **LevelDB**, whose Bigtable-derived SSTable format popularized the design.

## Reference drawer

> [!ABSTRACT]- Write, flush, and compaction flow
>
> ```mermaid
> graph TD
>   W["write / update / delete"] --> WAL["WAL append (durable)"]
>   W --> MT["memtable (sorted skiplist)"]
>   MT -->|"full → freeze"| SS0["SSTable (immutable, sorted)"]
>   SS0 --> C{"background compaction"}
>   SS1["older SSTables"] --> C
>   C -->|"merge, keep newest, drop tombstones"| SSM["fewer, larger SSTables"]
>   R["read key"] -.->|"newest first"| MT
>   R -.->|"Bloom-filter pruned"| SS0
>   R -.-> SS1
> ```
>
> A write fans out to the WAL and memtable; a full memtable flushes to one immutable SSTable; compaction merges SSTables and finalizes deletes. Reads walk newest→oldest, using Bloom filters to skip files that cannot hold the key.

## Questions

> [!QUESTION]- Why are SSTables immutable?
> Immutability is what turns writes sequential and reads safe. Because a flushed file is never edited, the disk only ever sees appends (fast) and concurrent readers need no locks (the bytes never change under them), crash recovery is trivial (a partial file is simply discarded), and files compress well as dense, static blocks. The price is that updates and deletes cannot edit the old data in place — they write new versions and tombstones — so a background **compaction** pass is required to reconcile versions and reclaim space.

> [!QUESTION]- What is the read-vs-write amplification tradeoff, and how does compaction strategy control it?
> Write amplification is bytes written to disk per byte the app wrote; read amplification is disk reads per logical read; space amplification is on-disk bytes per byte of live data. Compaction cannot minimize all three at once. **Size-tiered** rewrites data rarely (low write amp) but leaves a key's live version spread across tiers (high read and space amp). **Leveled** keeps non-overlapping ranges per level so a read hits at most one file per level (low read and space amp) but rewrites each key as it descends levels (high write amp). You choose which amplification the workload can afford.

> [!QUESTION]- When does a B-tree beat an LSM-Tree?
> When reads dominate and latency must be predictable. A B-tree resolves a point or range lookup on a single root-to-leaf path with no read amplification and no background rewrite bursts, so read-heavy OLTP and range-scan-heavy workloads favor it. An LSM-Tree shines on write-heavy ingest (logs, time-series, high-write feeds) where its sequential appends and dense immutable files pay off, but it makes reads probe several SSTables and periodically stalls on compaction I/O.

## References

- [O'Neil, Cheng, Gawlick & O'Neil — The Log-Structured Merge-Tree (LSM-Tree), Acta Informatica 33 (1996)](https://doi.org/10.1007/s002360050048) — the original paper defining the buffer-and-merge design and its amplification analysis; the primary source for everything above.
- [RocksDB wiki — Leveled Compaction](https://github.com/facebook/rocksdb/wiki/Leveled-Compaction) — precise mechanics of levels, non-overlapping ranges, and the write-amplification cost of LCS in a production engine.
- [Apache Cassandra — storage engine](https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html) — memtable, commit log, and SSTable flush described from a shipping wide-column store.
- [LevelDB — implementation notes](https://github.com/google/leveldb/blob/main/doc/impl.md) — the SSTable-plus-compaction design that popularized the modern LSM layout, with the sparse-index and Bloom-filter read path.
- [ByteByteGo — B-Tree vs LSM-Tree (further reading)](https://blog.bytebytego.com/p/b-tree-vs-lsm-tree) — outbound overview only; not a source for any text on this page.
