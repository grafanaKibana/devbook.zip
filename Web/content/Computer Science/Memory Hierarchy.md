---
publish: true
created: 2026-07-18T14:02:44.055Z
modified: 2026-07-18T14:02:44.056Z
published: 2026-07-18T14:02:44.056Z
topic:
  - Computer Science
subtopic: []
summary: The latency, capacity, and persistence layers between CPU registers and durable storage.
level:
  - "4"
priority: High
status: Creation
---

A memory hierarchy places small, fast storage close to the CPU and progressively larger, slower storage farther away. A CPU load may be satisfied by a register, an L1/L2/L3 cache, or DRAM; a page fault can additionally bring file-backed or swapped data from a local SSD or HDD into DRAM. Each layer exists because no single technology simultaneously provides register latency, DRAM capacity, and storage durability at an acceptable cost.

The layers are not independent boxes. Hardware moves fixed-size cache lines between CPU caches and DRAM. The operating system maps virtual pages to physical frames and uses spare DRAM for the filesystem page cache. Local storage keeps data across power loss; DRAM and CPU caches do not. A miss consults the next backing layer defined for that mechanism, not every row in the table: a CPU-cache miss reaches DRAM, while a page fault can perform a cheap mapping operation or read local file/swap backing. Object storage is outside that automatic path. An application or filesystem client reaches it through a network API and may then populate local memory or disk caches.

| Layer | Managed by | Unit moved | Main constraint |
| --- | --- | --- | --- |
| Registers | Compiler and CPU | Scalar/vector operand | Tiny architectural set |
| L1/L2/L3 cache | CPU hardware | Cache line | Capacity and sharing increase with distance from a core |
| DRAM | OS and memory controller | Cache line below, page above | Volatile and slower than cache |
| Page cache / mapped files | OS | Page and filesystem block | Reclaims memory and may require storage I/O |
| Local SSD/HDD | Filesystem and block driver | Filesystem block / device sector | Durable; a file-backed or swapped page fault can wait on this I/O |
| Object storage | Application, filesystem client, and remote service | Network request / object | Durable remote service; accessed explicitly over a network, not as the CPU or page-fault hierarchy's automatic next layer |

# Locality is the lever software controls

Temporal locality means recently accessed data is likely to be accessed again. Spatial locality means nearby addresses are likely to follow. Contiguous arrays exploit both; pointer-rich structures trade that locality for cheaper structural updates.

For example, summing a `int[]` walks adjacent values that share cache lines. Walking the same values through individually allocated linked nodes adds a pointer load per element and scatters accesses across the heap. Both algorithms are O(n), but the array gives the prefetcher and cache hierarchy a predictable stream.

The operating-system mechanisms behind virtual pages, TLBs, and page faults live in [[Operating Systems/Memory Management|Memory Management]]. The hierarchy here is the cross-layer model: identify which layer serves the access, what unit moves, and whether a miss performs computation, memory traffic, or durable I/O.

# References

- [Linux kernel documentation — Memory Management Concepts](https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html) — primary documentation for virtual memory, physical pages, and the page cache in Linux.
- [Intel 64 and IA-32 Architectures Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) — primary architecture reference for processor caches, memory ordering, and address translation.
- [ByteByteGo System Design 101 — Types of memory and storage](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/types-of-memory.md) — editorial hierarchy overview used for provenance; its unreliable capacity labels and oversimplified access paths are intentionally excluded.
