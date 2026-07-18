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

An operating system multiplexes hardware while preserving boundaries between programs. The kernel schedules threads on CPUs, maps each process's virtual addresses to physical memory, mediates device access, and exposes persistent files and network sockets through system calls. User-mode programs receive stable abstractions; the kernel owns the privileged mechanisms that make those abstractions safe enough to share.

A web server makes the boundary concrete. A socket accept operation creates a connection handle, a read copies received bytes into a process buffer, the scheduler runs worker threads, and a write returns a response through the network stack. A blocked disk or network operation lets another runnable thread use the CPU. A bad pointer faults inside one process instead of overwriting the kernel or an unrelated process.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [Windows kernel-mode and user-mode](https://learn.microsoft.com/windows-hardware/drivers/gettingstarted/user-mode-and-kernel-mode) — concrete explanation of privilege boundaries, process address spaces, and operating-system services.
- [Intel 64 and IA-32 Architectures Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) — hardware privilege, interrupts, task execution, and memory-protection mechanisms beneath an operating system.
