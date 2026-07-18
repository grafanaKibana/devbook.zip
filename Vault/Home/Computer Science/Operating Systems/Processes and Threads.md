---
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: "The isolation owned by a process, the execution state owned by a thread, and how .NET tasks map onto both."
level:
  - "4"
priority: High
status: Creation
publish: true
---

# Intro

A process is a resource and isolation boundary. It owns a virtual address space, credentials, and references to kernel objects such as file descriptors. A thread is a schedulable execution context inside that process: it has its own instruction pointer, register state, and stack while sharing the process's code, heap, and open resources with peer threads.

![[System Design 101/3581c2ad15495200f20850f0056513ac93cd5c037e22209d35d3b4bdcccef580.png]]

A program is executable code on storage; executing it creates or replaces a process image; one or more threads run that image. The visual captures that relationship, while the operating-system details below define the boundaries.

## Isolation versus coordination

| Boundary | Process | Thread |
| --- | --- | --- |
| Address space | Separate by default | Shared with peer threads |
| Stack and registers | Contains at least one thread's state | Private per thread |
| Communication | Explicit [[Inter-Process Communication]] | Shared memory plus synchronization |
| Creation/context-switch cost | Usually higher | Usually lower within one process |
| Failure blast radius | Kernel isolation usually contains memory corruption | Corruption or an unhandled fatal failure can terminate the whole process |

Thread sharing makes communication cheap and data races possible. A lock, channel, immutable message, or atomic operation is not ceremony: it defines when one thread's writes become valid input to another. Process isolation gives a stronger fault boundary but moves the protocol into IPC, serialization, and independent lifecycle management.

## A .NET `Task` is not a thread

`Task` represents an asynchronous operation. CPU-bound work submitted with `Task.Run` normally executes on a .NET thread-pool worker, which is an OS thread. An asynchronous I/O operation can remain incomplete without occupying a worker thread; when the operating system reports completion, its continuation is scheduled according to the captured context or task scheduler. A task may therefore execute on several threads over time, or complete without owning a dedicated thread at all.

Use a dedicated `Thread` only when thread identity or lifetime is itself required—for example, a native API with thread affinity. Use tasks for composable completion, cancellation, and error propagation; use bounded channels or other admission control when producing tasks faster than the system can service them.

## References

- [pthreads(7)](https://man7.org/linux/man-pages/man7/pthreads.7.html) — authoritative Linux/POSIX thread model and shared process attributes.
- [proc_pid_maps(5)](https://www.man7.org/linux/man-pages/man5/proc_pid_maps.5.html) — primary Linux interface for observing a process's mapped address space.
- [System.Threading.Tasks.Task](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task?view=net-10.0) — .NET task representation, scheduling, and continuation API.
- [ByteByteGo System Design 101 — Process vs thread](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-is-the-difference-between-process-and-thread.md) — editorial relationship overview and embedded visual; primary OS and .NET references supply the execution semantics.
