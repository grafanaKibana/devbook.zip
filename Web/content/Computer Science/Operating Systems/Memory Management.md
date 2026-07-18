---
publish: true
created: 2026-07-16T18:15:23.782Z
modified: 2026-07-18T11:30:05.906Z
published: 2026-07-18T11:30:05.906Z
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: How virtual pages, physical frames, page tables, TLBs, and faults turn addresses into isolated memory.
level:
  - "4"
priority: High
status: Creation
---

Virtual memory gives each process an address space independent of the current placement of bytes in physical DRAM. The memory-management unit translates a virtual page number through page tables to a physical frame number and preserves the page offset. A translation lookaside buffer (TLB) caches recent translations so every load does not require a page-table walk.

With 4 KiB pages, the low 12 address bits are the offset. For virtual address `0x12345ABC`, the virtual page number is `0x12345` and the offset is `0xABC`. If the page table maps that page to frame `0x8F2A`, the physical address is `0x8F2AABC`. Permissions attached to the mapping can reject the access even when the translation exists.

# What a page fault means

A page fault is a controlled CPU exception, not automatically a disk read. The kernel may:

- create a first anonymous page on demand;
- copy a shared page when one process writes to a copy-on-write mapping;
- load a file-backed page from the page cache or storage;
- raise a protection or page-fault exception because the address or permission is invalid; Unix-like systems may deliver `SIGSEGV`, while Windows normally reports an access violation.

When memory pressure evicts a dirty file-backed page, the kernel must write it back before reuse. Anonymous memory can be reclaimed only by discarding reconstructable state, compressing it, or writing it to swap. The [[Computer Science/Memory Hierarchy|memory hierarchy]] explains where those bytes move; this note explains how the operating system names and protects them.

# Paging and segmentation solve different problems

Paging divides virtual and physical memory into fixed-size units. It avoids external fragmentation in physical-frame allocation because any free frame can hold any page, but the last page of an allocation can contain unused space. Page tables and TLB pressure are the price.

Segmentation describes variable-size logical regions with a base, limit, and permissions. Variable placement can suffer external fragmentation as free holes become too small for later segments. Historic systems exposed segmentation as a major address-translation mechanism; modern 64-bit operating systems normally use a flat address model plus paging, while still describing mappings as code, data, heap, stack, and files.

These mechanisms can coexist: an architecture can select a segment and then translate the resulting linear address through pages. Do not infer modern process layout from a simplified “paging versus segmentation” diagram without checking the architecture and OS ABI.

# References

- [Virtual address spaces (Windows)](https://learn.microsoft.com/windows-hardware/drivers/gettingstarted/virtual-address-spaces) — concrete operating-system explanation of per-process virtual addresses and kernel mappings.
- [Intel 64 and IA-32 Architectures Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) — primary architecture reference for segmentation, paging, translation, and protection.
- [ByteByteGo System Design 101 — Paging vs segmentation](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-are-the-differences-between-paging-and-segmentation.md) — editorial comparison used for provenance; its internally inconsistent frame-count and segmentation source diagram is intentionally excluded.
