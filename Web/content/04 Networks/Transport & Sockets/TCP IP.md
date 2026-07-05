---
publish: true
created: 2026-07-05T10:53:36.360+03:00
modified: 2026-07-05T15:49:32.736+03:00
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

## IP Addressing, Ports, and NAT

The "IP" half of TCP/IP is addressing. An **IP address** identifies a host; a **port** (16-bit, 0–65535) identifies a process on that host. The 4-tuple `(src IP, src port, dst IP, dst port)` uniquely identifies a connection.

- **IPv4** — 32-bit addresses (~4.3 billion), written `192.168.1.10`. Exhausted, which is why **NAT** exists.
- **IPv6** — 128-bit addresses, written `2001:db8::1`. Vast space, no NAT needed, but dual-stack deployment is still ongoing.
- **Private ranges** (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are non-routable on the public internet.
- **NAT (Network Address Translation)** — a router maps many private hosts onto one public IP by rewriting addresses/ports. This is why your laptop's `192.168.x.x` reaches the internet, and why inbound connections to a host behind NAT need port-forwarding or hole-punching (relevant to [[Peer-2-Peer|peer-to-peer]]).
- **Ports** split into well-known (0–1023, e.g. 80/443), registered, and **ephemeral** (the dynamic client-side ports that `TIME_WAIT` can exhaust).

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

> [!WARNING]
> **Head-of-line (HOL) blocking** is the price of in-order delivery: if segment #5 is lost, segments #6–#10 sit in the receive buffer and **cannot be delivered to the application** until #5 is retransmitted — even though they arrived fine. This is exactly why HTTP/2's many streams over one TCP connection can stall together on a single lost packet, and why **QUIC/HTTP/3** moves multiplexing into independent UDP-based streams. See [[UDP]].

## MTU, MSS, and Keep-Alive

- **MTU (Maximum Transmission Unit)** — the largest frame a link carries, typically **1500 bytes** on Ethernet. **MSS (Maximum Segment Size)** is the TCP payload that fits in one unfragmented packet (MTU minus IP+TCP headers, ~1460). Exceed the path MTU and packets fragment (or get dropped if "don't fragment" is set), hurting throughput — **Path MTU Discovery** negotiates the largest size that traverses the whole path.
- **TCP keep-alive** sends periodic probes on an idle connection to detect a peer that vanished without a FIN (crash, cable pull). Without it, a half-open connection can sit "established" forever. Tune intervals (`SO_KEEPALIVE`) for long-lived connections behind NAT/load balancers, which silently drop idle flows.
- **Window scaling / bandwidth-delay product** — on high-latency, high-bandwidth links ("long fat networks"), the default receive window caps throughput; the window-scaling option (and a window ≥ bandwidth × RTT) is needed to keep the pipe full.

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

### TIME\_WAIT Port Exhaustion

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

## Questions

> [!QUESTION]- Why does TCP's three-way handshake exist, and when does its latency cost become a real problem?
>
> - The handshake synchronizes sequence numbers and confirms both sides are reachable before sending data.
> - It adds one full round-trip of latency before the first byte of application data can be sent.
> - For short-lived connections (single HTTP request, DNS-over-TCP), handshake latency dominates total request time.
> - HTTP/2 multiplexing amortizes the handshake across many requests on one connection. QUIC (HTTP/3) eliminates it entirely by combining transport and TLS handshakes.
> - The handshake guarantees reliable setup but costs a full round-trip; reach for connection pooling or QUIC when that overhead is unacceptable.

> [!QUESTION]- How do flow control and congestion control differ, and what happens when you confuse them?
>
> - Flow control protects the receiver: the receive window limits how much unacknowledged data the sender can push.
> - Congestion control protects the network: the congestion window limits send rate based on detected packet loss.
> - The effective send rate is the minimum of both windows.
> - Tuning only one side causes problems: a large receive window with aggressive congestion control still causes network drops; a small receive window with conservative congestion control wastes available bandwidth.
> - Flow control is endpoint-local and deterministic; congestion control is network-wide and heuristic — tune them together or one silently caps the other.

## References

- [Transmission Control Protocol (RFC 793)](https://www.rfc-editor.org/rfc/rfc793) — the original TCP specification; defines the three-way handshake, sequence numbers, flow control, and state machine.
- [TCP/IP Illustrated, Volume 1 (W. Richard Stevens)](https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/) — the definitive practitioner reference for TCP/IP internals; covers every mechanism with packet traces.
- [High Performance Browser Networking (Ilya Grigorik)](https://hpbn.co/building-blocks-of-tcp/) — free online book chapter on TCP building blocks: handshake latency, slow start, congestion control, and how HTTP/2 and QUIC address TCP's limitations.
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/) — practical socket programming guide covering TCP/UDP sockets, connection setup, and common pitfalls.
