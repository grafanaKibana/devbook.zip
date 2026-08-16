---
topic:
  - Networks
subtopic:
  - Transport & Sockets
summary: "The practical network interface: ports, connections, streams, datagrams, and TCP vs UDP."
tags: [FolderNote]
publish: true
status: Creation
priority: Medium
level:
  - "3"
---

Transport protocols decide how application data moves between endpoints. Sockets expose that machinery to programs. TCP presents a reliable, ordered byte stream while a connection remains viable. UDP sends independent datagrams and leaves loss recovery, ordering, and pacing to the application.

That distinction matters most when a network degrades. TCP hides isolated loss through retransmission, which can delay later bytes. UDP does not delay later datagrams to recover an earlier one; an application protocol can detect a missing or stale sample only when it adds sequence or timing metadata, then decide whether recovery is still worthwhile.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# TCP vs UDP

[[Sockets]] describes the operating-system API used to program either transport. It is an endpoint abstraction, not a third transport.

| Property | [[TCP IP\|TCP]] | [[UDP]] |
| --- | --- | --- |
| Connection | Connection-oriented. An ordinary connection starts with a three-way handshake | Connectionless. No transport handshake |
| Delivery | Retransmits loss and reports connection failure when recovery cannot continue | Best-effort. Datagrams may be lost, duplicated, or reordered |
| Ordering | In-order via sequence numbers | None. Datagrams can arrive out of order |
| Flow / congestion control | Built in | None in UDP itself. Sustained senders must pace traffic above it |
| Framing | Byte stream. The application defines message boundaries | Datagrams. Each received datagram keeps its boundary |
| Overhead | At least a 20-byte TCP header plus connection state | An 8-byte UDP header with little transport state |
| Latency | Connection setup and in-order recovery can delay data | No transport setup or retransmission delay, though the application may add both |
| Fan-out | Point-to-point only | Unicast, plus broadcast and multicast |
| Reach for it when | One reliable ordered stream fits the workload: HTTP, databases, file transfer | The application needs datagrams, multicast, independent recovery, or a different transport built above UDP |

TCP is the usual starting point because many applications want one ordered stream and do not benefit from owning transport recovery. UDP fits real-time samples that expire quickly, small retryable exchanges such as DNS, and multicast delivery. QUIC also uses UDP, but supplies its own security, congestion control, and reliable streams above it.

# References

- [POSIX socket() specification](https://pubs.opengroup.org/onlinepubs/9799919799/functions/socket.html)
