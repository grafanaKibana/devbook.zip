---
publish: true
created: 2026-07-16T18:15:22.560Z
modified: 2026-07-16T18:16:43.905Z
published: 2026-07-16T18:16:43.905Z
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: A working map of the Linux kernel boundaries behind processes, memory, filesystems, networking, and devices.
level:
  - "4"
priority: High
status: Creation
---

# Intro

Linux is a monolithic kernel with loadable modules: scheduling, virtual memory, filesystems, networking, and most device drivers execute in one privileged address space. User programs cross that boundary through system calls. The interfaces look separate—files, sockets, processes—but the implementation shares memory management, wait queues, interrupts, and the virtual filesystem.

![[Assets/System Design 101/29c31d4c8c8f08fb10a68f33f56f160af14271b031e2c52a0a0d36d3b1948a30.png]]

The visual is a learning route, not an exact kernel-boundary diagram. Real operations cross several subsystems. Reading a file, for example, resolves a path through the VFS, checks permissions, consults the page cache, may ask a filesystem for blocks, and may wait for a storage driver and device interrupt.

## Five subsystem routes

| Route | Input and output | Observable failure |
| --- | --- | --- |
| Process and scheduler | Runnable threads become CPU time | Starvation, priority inversion, excessive context switching |
| Virtual memory | Virtual addresses become page mappings and physical frames | Page fault, out-of-memory kill, swap or storage latency |
| VFS and storage | Path and file descriptor operations become cached or device I/O | `EACCES`, `ENOENT`, filesystem error, blocked I/O |
| Network stack | Socket operations become protocol packets and device queues | Timeout, reset, dropped packet, exhausted buffers |
| Device model and drivers | Generic kernel operations become device-specific commands | Driver error, interrupt storm, unavailable hardware |

The system-call boundary is the useful debugging anchor. `strace` reveals calls and error codes; `/proc/<pid>` exposes process state; `journalctl -k` shows kernel messages; `perf` attributes CPU samples across user and kernel code. Start from the failed boundary, then follow the owning subsystem rather than treating “Linux” as one opaque layer.

Related mechanisms are expanded in [[Processes and Threads]], [[Memory Management]], [[Linux File Permissions]], and [[Network Data Path]].

## References

- [Linux kernel documentation](https://docs.kernel.org/) — primary documentation index for Linux subsystems and administration.
- [Linux kernel documentation — Core API](https://docs.kernel.org/core-api/index.html) — primary reference for shared kernel mechanisms used across subsystems.
- [Linux man-pages project — syscalls(2)](https://man7.org/linux/man-pages/man2/syscalls.2.html) — inventory of the Linux system-call interface.
- [ByteByteGo System Design 101 — Five components to learn Linux](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/5-important-components-of-linux.md) — editorial route map behind the embedded visual; kernel documentation remains authoritative for subsystem behavior.
