---
topic:
  - Networks
subtopic:
  - Transport & Sockets
summary: "The practical network interface: ports, connections, streams, datagrams, and TCP vs UDP."
tags:
  - FolderNote
publish: true
status: Creation
priority: Medium
level:
  - '3'
---

# Intro

Transport and sockets are the practical interface to the network: ports, connections, streams, datagrams, and backpressure. Understanding TCP vs UDP and basic socket behavior prevents a lot of subtle production issues. Example: TCP guarantees ordered delivery but can amplify latency under loss; UDP trades guarantees for control and speed.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## TCP vs UDP

The two transports are the real choice at this layer; [[Sockets]] is the file-like API you program either one through, not a third option.

| Property | [[TCP IP\|TCP]] | [[UDP]] |
| --- | --- | --- |
| Connection | Connection-oriented — 3-way handshake before data | Connectionless — no handshake, no state |
| Delivery | Guaranteed; retransmits lost segments | Best-effort; a lost datagram is gone |
| Ordering | In-order via sequence numbers | None; datagrams can arrive out of order |
| Flow / congestion control | Yes — sliding window, slow-start, AIMD | None; the app must pace itself |
| Framing | Byte stream — no message boundaries (handle partial reads) | Datagrams — message boundaries preserved |
| Overhead | 20+ byte header plus per-connection state | 8-byte header, no state |
| Latency | Higher — handshake round-trip and ACK waits | Lower — send and forget |
| Fan-out | Point-to-point only | Unicast, plus broadcast and multicast |
| Reach for it when | Correctness needs delivery: HTTP, databases, file transfer | Latency beats reliability, or the app handles loss: streaming, gaming, DNS, QUIC, telemetry |

Default to TCP: most applications need its ordered, reliable byte stream and can absorb the handshake cost. Reach for UDP when a late packet is worse than a lost one (real-time media, gaming), when the payload is a single small request/response (DNS), or when you need one-to-many fan-out — accepting that any reliability or ordering you still want must be built on top, as QUIC (HTTP/3) does.

## References

- [Network socket (Wikipedia)](https://en.wikipedia.org/wiki/Network_socket)
