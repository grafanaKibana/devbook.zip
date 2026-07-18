---
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: "How an operating system turns hardware into isolated processes, virtual memory, files, networking, and device interfaces."
tags:
  - FolderNote
publish: true
level:
  - "4"
priority: High
status: Creation
---

# Intro

An operating system multiplexes hardware while preserving boundaries between programs. The kernel schedules threads on CPUs, maps each process's virtual addresses to physical memory, mediates device access, and exposes persistent files and network sockets through system calls. User-mode programs receive stable abstractions; the kernel owns the privileged mechanisms that make those abstractions safe enough to share.

A web server makes the boundary concrete. `accept` obtains a socket-backed file descriptor, `read` copies received bytes into a buffer supplied by the calling process, the scheduler runs worker threads, and `write` returns a response through the network stack. A blocked disk or network operation lets another runnable thread use the CPU. A bad pointer faults inside one process instead of overwriting the kernel or an unrelated process.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Linux kernel documentation](https://docs.kernel.org/) — primary documentation for kernel subsystems, administration, and internal APIs.
- [Linux man-pages project — intro(2)](https://man7.org/linux/man-pages/man2/intro.2.html) — overview of the Linux system-call interface and its error model.
