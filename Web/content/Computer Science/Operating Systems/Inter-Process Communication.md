---
publish: true
created: 2026-07-16T18:15:23.418Z
modified: 2026-07-18T11:30:05.879Z
published: 2026-07-18T11:30:05.879Z
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: How isolated processes exchange byte streams, messages, shared memory, and synchronization signals.
level:
  - "4"
priority: High
status: Creation
---

Processes do not share an address space by default. Inter-process communication (IPC) supplies an explicit data path or synchronization primitive across that boundary. The right mechanism follows from data shape, addressing, lifetime, throughput, and failure handling—not from a universal speed ranking.

| Mechanism | Data and addressing | Lifetime / failure boundary | Good fit |
| --- | --- | --- | --- |
| Anonymous pipe | Unidirectional byte stream between related processes | Ends when endpoints close; writers fail after readers disappear | Parent/child streaming and redirected command output |
| Named pipe | Named byte or message channel between local or remote processes | Name enables unrelated processes to rendezvous; capacity creates backpressure | Local services and simple request/response protocols |
| Local socket | Stream or datagram between local endpoints | Connection shutdown is explicit; platform addressing and credential support vary | Request/response protocols and independently restarted services |
| Message queue | Discrete prioritized messages through a named kernel queue | Queue can outlive processes until removed; finite capacity creates backpressure or failure | Small messages that must preserve boundaries |
| Shared memory | The same mapped pages in multiple processes | Fast data path, but readers can observe torn or stale state without synchronization | Large buffers and high-throughput local exchange |
| Signal | Small asynchronous notification, usually carrying no payload | Delivery and coalescing rules limit protocol complexity | Cancellation, child status, reload notification |
| Semaphore / event primitive | Synchronization state rather than application data | Owner failure can strand poorly designed protocols | Coordinating access to shared memory or resources |

Shared memory avoids copying application payloads through a pipe or socket, but it does not make a protocol safe. The processes still need ownership rules, memory ordering, bounds checks, and a recovery strategy if one participant dies while updating shared state. A socket often wins when message framing, access control, and independent restart matter more than the last copy.

# Local request/response in .NET

`NamedPipeServerStream` provides a local IPC endpoint without opening a network port:

```csharp
using System.IO.Pipes;

await using var server = new NamedPipeServerStream(
    "devbook",
    PipeDirection.InOut,
    maxNumberOfServerInstances: 16,
    PipeTransmissionMode.Byte,
    PipeOptions.Asynchronous);

await server.WaitForConnectionAsync();
byte[] buffer = new byte[4096];
int received = await server.ReadAsync(buffer);
await server.WriteAsync(buffer.AsMemory(0, received));
```

Production code must define framing for multiple messages, restrict endpoint access, handle partial reads and receiver-side message fragmentation, and set cancellation or timeouts. Named-pipe behavior differs by platform, so protocol tests must run on every deployment target.

# References

- [Interprocess communications (Windows)](https://learn.microsoft.com/windows/win32/ipc/interprocess-communications) — mechanism inventory and platform-level boundaries for pipes, shared memory, sockets, RPC, and synchronization.
- [NamedPipeServerStream](https://learn.microsoft.com/dotnet/api/system.io.pipes.namedpipeserverstream?view=net-10.0) — .NET server endpoint and asynchronous pipe API used by the example.
- [Memory-mapped files](https://learn.microsoft.com/dotnet/standard/io/memory-mapped-files) — .NET shared-memory mapping, persistence, and inter-process access guidance.
