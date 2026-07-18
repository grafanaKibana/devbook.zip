---
topic:
  - Computer Science
subtopic:
  - Operating Systems
summary: "How isolated processes exchange byte streams, messages, shared memory, and synchronization signals on Linux."
level:
  - "4"
priority: High
status: Creation
publish: true
---

# Intro

Processes do not share an address space by default. Inter-process communication (IPC) supplies an explicit data path or synchronization primitive across that boundary. The right mechanism follows from data shape, addressing, lifetime, throughput, and failure handling—not from a universal speed ranking.

| Mechanism | Data and addressing | Lifetime / failure boundary | Good fit |
| --- | --- | --- | --- |
| Anonymous pipe | Unidirectional byte stream between related processes | Ends when descriptors close; writer receives an error or signal after readers disappear | Shell pipelines and parent/child streaming |
| FIFO | Named byte stream through a filesystem path | Kernel object persists while open; pathname names rendezvous | Simple local producer/consumer pairs |
| Unix-domain socket | Stream or datagram between local endpoints; can pass credentials and descriptors | Connection shutdown is explicit; pathname or abstract address enables unrelated processes | Request/response protocols and local services |
| Message queue | Discrete prioritized messages through a named kernel queue | Queue can outlive processes until removed; finite capacity creates backpressure or failure | Small messages that must preserve boundaries |
| Shared memory | The same mapped pages in multiple processes | Fast data path, but readers can observe torn or stale state without synchronization | Large buffers and high-throughput local exchange |
| Signal | Small asynchronous notification, usually carrying no payload | Delivery and coalescing rules limit protocol complexity | Cancellation, child status, reload notification |
| Semaphore / event primitive | Synchronization state rather than application data | Owner failure can strand poorly designed protocols | Coordinating access to shared memory or resources |

Shared memory avoids copying application payloads through a pipe or socket, but it does not make a protocol safe. The processes still need ownership rules, memory ordering, bounds checks, and a recovery strategy if one participant dies while updating shared state. A socket often wins when message framing, access control, and independent restart matter more than the last copy.

## Local request/response in .NET

`UnixDomainSocketEndPoint` lets a .NET service use the socket API without opening a network port:

```csharp
using System.Net.Sockets;

var endpoint = new UnixDomainSocketEndPoint("/tmp/devbook.sock");
using var listener = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
listener.Bind(endpoint);
listener.Listen(16);

using Socket peer = await listener.AcceptAsync();
byte[] buffer = new byte[4096];
int received = await peer.ReceiveAsync(buffer);
await peer.SendAsync(buffer.AsMemory(0, received));
```

Production code must remove stale socket paths safely, define framing for multiple messages, restrict filesystem permissions, handle partial reads/writes, and set cancellation or timeouts.

## References

- [pipe(7)](https://man7.org/linux/man-pages/man7/pipe.7.html) — authoritative Linux pipe/FIFO capacity, blocking, and lifecycle semantics.
- [unix(7)](https://man7.org/linux/man-pages/man7/unix.7.html) — authoritative Unix-domain socket addressing and ancillary-data behavior.
- [shm_overview(7)](https://man7.org/linux/man-pages/man7/shm_overview.7.html) — authoritative POSIX shared-memory lifecycle and mapping overview.
- [mq_overview(7)](https://man7.org/linux/man-pages/man7/mq_overview.7.html) — authoritative POSIX message-queue semantics.
- [UnixDomainSocketEndPoint](https://learn.microsoft.com/en-us/dotnet/api/system.net.sockets.unixdomainsocketendpoint?view=net-10.0) — .NET endpoint API for local Unix-domain sockets.
- [ByteByteGo System Design 101 — Linux inter-process communication](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-processes-talk-to-each-other-on-linux.md) — editorial inventory used for provenance; its unsafe command and incomplete source diagram are intentionally excluded.
