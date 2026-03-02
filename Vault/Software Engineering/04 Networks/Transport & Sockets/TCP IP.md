---
topic:
  - Networks
subtopic:
  - Transport & Sockets
level:
  - "3"
priority: Medium
status: Creation
dg-publish: true
---

# TCP/IP

TCP/IP is the foundational protocol suite of the internet. **IP** (Internet Protocol) handles addressing and routing — getting packets from source to destination across networks. **TCP** (Transmission Control Protocol) runs on top of IP and provides reliable, ordered, connection-oriented byte-stream delivery. Together they form the transport layer that HTTP, gRPC, databases, and virtually every networked application depend on.

Understanding TCP/IP matters for debugging latency, connection issues, and designing systems that handle network failures correctly.

## The TCP/IP Stack

```text
Application Layer   HTTP, gRPC, WebSocket, SMTP, DNS
Transport Layer     TCP (reliable) / UDP (unreliable)
Internet Layer      IP (addressing + routing)
Link Layer          Ethernet, Wi-Fi (physical transmission)
```

Each layer adds a header and passes the packet down. On the receiving end, each layer strips its header and passes the payload up.

## TCP Connection: Three-Way Handshake

Before data flows, TCP establishes a connection with a three-way handshake:

```text
Client → Server: SYN  (seq=100)
Server → Client: SYN-ACK  (seq=200, ack=101)
Client → Server: ACK  (ack=201)
── Connection established ──
Client → Server: DATA
```

- **SYN**: client proposes a starting sequence number.
- **SYN-ACK**: server acknowledges and proposes its own sequence number.
- **ACK**: client acknowledges the server's sequence number.

This handshake adds one round-trip of latency before the first byte of data can be sent. HTTP/2 and QUIC (HTTP/3) reduce this overhead.

## Reliability Mechanisms

TCP guarantees delivery through:

- **Sequence numbers**: every byte is numbered. The receiver reorders out-of-order segments.
- **Acknowledgments (ACK)**: the receiver acknowledges received bytes. Unacknowledged segments are retransmitted.
- **Retransmission timeout (RTO)**: if no ACK arrives within the timeout, the segment is retransmitted.
- **Duplicate ACKs / Fast Retransmit**: three duplicate ACKs signal a lost segment; TCP retransmits without waiting for the timeout.

## Flow Control and Congestion Control

**Flow control** prevents the sender from overwhelming the receiver. The receiver advertises a **receive window** (how many bytes it can buffer). The sender cannot have more unacknowledged bytes in flight than the window size.

**Congestion control** prevents the sender from overwhelming the network. TCP starts with a small **congestion window** and grows it exponentially (slow start) until it detects packet loss, then backs off. Algorithms: CUBIC (Linux default), BBR (Google, latency-optimized).

## Connection Teardown: Four-Way Handshake

```text
Client → Server: FIN
Server → Client: ACK
Server → Client: FIN
Client → Server: ACK
── Connection closed ──
```

The `TIME_WAIT` state keeps the connection in memory for 2×MSL (Maximum Segment Lifetime, typically 60s) to handle delayed packets. High-throughput servers can exhaust ephemeral ports if connections are closed too frequently — use connection pooling and `SO_REUSEADDR`.

## Pitfalls

### Nagle's Algorithm Causing Latency

**What goes wrong**: small writes (e.g., sending a 10-byte command) are buffered by Nagle's algorithm until the buffer fills or an ACK arrives. This adds 40–200ms latency for interactive protocols.

**Why it happens**: Nagle's algorithm coalesces small packets to reduce network overhead. It's enabled by default.

**Mitigation**: disable Nagle's algorithm with `TCP_NODELAY` for latency-sensitive connections (database clients, real-time APIs). Most database drivers and HTTP clients do this automatically.

```csharp
var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
socket.NoDelay = true;  // disables Nagle's algorithm
```

### TIME_WAIT Port Exhaustion

**What goes wrong**: a high-throughput service opens and closes many short-lived connections. The OS runs out of ephemeral ports because they're all in `TIME_WAIT`.

**Why it happens**: each closed connection holds its port for 60s in `TIME_WAIT`.

**Mitigation**: use connection pooling (HTTP clients, database connection pools) to reuse connections instead of closing them. On Linux, tune `net.ipv4.tcp_tw_reuse = 1` to allow reuse of `TIME_WAIT` sockets for new connections.

## TCP vs UDP

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (handshake) | Connectionless |
| Reliability | Guaranteed delivery, ordered | Best-effort, no ordering |
| Overhead | Higher (headers, ACKs, retransmits) | Lower |
| Latency | Higher (handshake, retransmits) | Lower |
| Use cases | HTTP, databases, file transfer | DNS, video streaming, gaming, QUIC |

**Decision rule**: use TCP for anything where data loss is unacceptable (web APIs, databases, file transfer). Use UDP when you control reliability at the application layer or when low latency matters more than guaranteed delivery (real-time video, DNS, QUIC/HTTP/3).

## References

- [Transmission Control Protocol (RFC 793)](https://www.rfc-editor.org/rfc/rfc793) — the original TCP specification; defines the three-way handshake, sequence numbers, flow control, and state machine.
- [TCP/IP Illustrated, Volume 1 (W. Richard Stevens)](https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/) — the definitive practitioner reference for TCP/IP internals; covers every mechanism with packet traces.
- [High Performance Browser Networking (Ilya Grigorik)](https://hpbn.co/building-blocks-of-tcp/) — free online book chapter on TCP building blocks: handshake latency, slow start, congestion control, and how HTTP/2 and QUIC address TCP's limitations.
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/) — practical socket programming guide covering TCP/UDP sockets, connection setup, and common pitfalls.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/04 Networks/04 Networks|04 Networks]]
>
> **Pages**
> - [[Software Engineering/04 Networks/Transport & Sockets/Sockets|Sockets]]
> - [[Software Engineering/04 Networks/Transport & Sockets/UDP|UDP]]
<!-- whats-next:end -->
