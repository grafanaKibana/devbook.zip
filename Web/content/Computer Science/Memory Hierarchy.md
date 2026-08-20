---
publish: true
created: 2026-08-20T20:41:15.611Z
modified: 2026-08-20T20:41:15.612Z
published: 2026-08-20T20:41:15.612Z
topic:
  - Computer Science
subtopic: []
summary: The latency, capacity, and persistence layers between CPU registers and durable storage.
level:
  - "4"
priority: High
status: Creation
---

A memory hierarchy keeps the fastest storage closest to the CPU and trades speed for capacity farther away. A load may be satisfied by a register, an L1/L2/L3 cache, or DRAM. A page fault can also bring file-backed or swapped data from local storage into DRAM. No single layer offers register latency, DRAM capacity, and durable storage at an acceptable cost.

The layers are connected, but they do not form one universal fallback chain. Hardware moves cache lines between CPU caches and DRAM. The operating system maps virtual pages to physical frames and uses spare DRAM for the filesystem page cache. A miss at one CPU-cache level checks lower cache levels and, if needed, DRAM. A page fault may only install a mapping, or it may wait for file or swap I/O. Object storage sits outside that automatic path. Application or filesystem-client code reaches it over a network and may populate local caches afterward.

| Layer | Managed by | Unit moved | Main constraint |
| --- | --- | --- | --- |
| Registers | Compiler and CPU | Scalar/vector operand | Tiny architectural set |
| L1/L2/L3 cache | CPU hardware | Cache line | Capacity and sharing increase with distance from a core |
| DRAM | OS and memory controller | Cache line below, page above | Volatile and slower than cache |
| Page cache / mapped files | OS | Page and filesystem block | Reclaims memory and may require storage I/O |
| Local SSD/HDD | Filesystem and block driver | Filesystem block / device sector | Durable. A file-backed or swapped page fault can wait on this I/O |
| Object storage | Application, filesystem client, and remote service | Network request / object | Durable remote service. Accessed explicitly over a network, not as the CPU or page-fault hierarchy's automatic next layer |

# Locality is the Lever Software Controls

Temporal locality means recently accessed data is likely to be accessed again. Spatial locality means nearby addresses are likely to follow. Contiguous arrays exploit both. Pointer-rich structures trade that locality for cheaper structural updates.

For example, summing a `int[]` walks adjacent values that share cache lines. Walking the same values through individually allocated linked nodes adds a pointer load per element and scatters accesses across the heap. Both algorithms are O(n), but the array gives the prefetcher and cache hierarchy a predictable stream.

# References

- [Linux kernel documentation — Memory Management Concepts](https://www.kernel.org/doc/html/latest/admin-guide/mm/concepts.html)
- [Intel 64 and IA-32 Architectures Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
