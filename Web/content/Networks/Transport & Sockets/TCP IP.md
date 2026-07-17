---
publish: true
created: 2026-07-11T21:46:14.260Z
modified: 2026-07-16T07:51:47.192Z
published: 2026-07-16T07:51:47.192Z
topic:
  - Networks
subtopic:
  - Transport & Sockets
summary: "The internet's core protocol suite: IP handles addressing, TCP adds reliable delivery."
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# TCP/IP

TCP/IP is the foundational protocol suite of the internet. **IP** (Internet Protocol) operates at the Internet layer and handles addressing and routing between networks. **TCP** (Transmission Control Protocol) operates at the Transport layer on top of IP and provides reliable, ordered, connection-oriented byte-stream delivery. They are distinct layers in the TCP/IP suite that application protocols such as HTTP, gRPC, and database protocols depend on.

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

The "IP" half of TCP/IP is addressing. An **IP address** identifies an interface; a **port** (16-bit, 0–65535) selects a transport endpoint on that machine. TCP identifies a connection by the 4-tuple `(src IP, src port, dst IP, dst port)` within its protocol namespace.

- **IPv4** — 32-bit addresses (~4.3 billion), written `192.168.1.10`. Exhausted, which is why **NAT** exists.
- **IPv6** — 128-bit addresses, written `2001:db8::1`. Its address space removes address-conservation as a reason for NAT, but does not remove firewall policy or every translation-based transition mechanism.
- **Private ranges** (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are non-routable on the public internet.
- **Ports** split into well-known (0–1023, e.g. 80/443), registered, and **ephemeral** (the dynamic client-side ports that `TIME_WAIT` can exhaust).

NAPT, the common many-to-one form of NAT, rewrites both an address and a port. If `10.0.0.7:53000` sends to `203.0.113.20:443`, a gateway might record this state:

| Inside tuple | Public mapping | Remote tuple | State |
|---|---|---|---|
| `10.0.0.7:53000` | `198.51.100.8:41001` | `203.0.113.20:443` | TCP established, idle 18 s |

The server replies to `198.51.100.8:41001`; the gateway uses the mapping to demultiplex the packet back to `10.0.0.7:53000`. Mappings expire, and different devices use different endpoint filtering and timeout behavior. Unsolicited inbound traffic has no mapping, so it needs a configured port forward, a rendezvous-assisted hole punch, or a relay. Carrier-grade NAT adds another shared translation layer and makes inbound reachability and per-subscriber attribution harder.

NAT is translation, not firewall policy. A stateful firewall decides which packets may pass; a translator rewrites packet fields and maintains mappings. They are often implemented on the same gateway, which is why they are easy to confuse. IPv6 restores end-to-end addressing, but an IPv6 firewall should still deny unwanted inbound traffic.

The NAT diagram from the reviewed source is intentionally absent: it links an unrelated HTTP-header image.

## IPv4 and IPv6

| Concern | IPv4 | IPv6 | Operational consequence |
|---|---|---|---|
| Address and notation | 32-bit dotted decimal, for example `192.0.2.10` | 128-bit hexadecimal; consecutive zero groups can be compressed once, for example `2001:db8::10` | Logs, ACLs, parsers, and metrics must handle both forms without truncation |
| Base header | Variable 20–60 bytes; includes a header checksum | Fixed 40 bytes; no header checksum; optional information uses extension headers | IPv6 removes per-hop checksum recomputation but extension-header handling still needs testing |
| Fragmentation | A source or router may fragment unless prohibited | Only the source fragments; routers return ICMPv6 Packet Too Big | Broken PMTU feedback causes large-flow stalls even when small probes pass |
| Local neighbor lookup | ARP maps IPv4 addresses to link-layer addresses | Neighbor Discovery uses ICMPv6 and scoped multicast | IPv6 does not use ARP or broadcast |
| Address conservation | Private addressing plus NAPT is common | Globally unique addressing is practical | IPv6 removes the conservation need for NAPT, not the need for traffic filtering |

Do not declare dual stack universally best. It gives native reachability during migration, but it doubles policy, observability, DNS, and failure surfaces: an `AAAA` record can send clients down a broken IPv6 path while IPv4 remains healthy. Use dual stack when both paths are operated and tested. IPv6-only with DNS64/NAT64 can be simpler inside controlled client networks; IPv4-only remains a compatibility constraint, not an end state.

![[Assets/System Design 101/1a2b1ca4763c8fe5a07b020a13be48328cb31ca47be3bf4a964ee3ca7a61466e.png]]

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

This handshake adds one round-trip before an ordinary TCP connection can carry application data. Connection reuse and HTTP/2 multiplexing amortize that cost. QUIC combines transport security and connection establishment; a new connection still takes a round trip, while a previously authenticated session may send replayable 0-RTT data.

## Reliability Mechanisms

TCP detects loss and preserves an ordered byte stream while the connection remains viable through:

- **Sequence numbers**: every byte is numbered. The receiver reorders out-of-order segments.
- **Acknowledgments (ACK)**: the receiver acknowledges received bytes. Unacknowledged segments are retransmitted.
- **Retransmission timeout (RTO)**: if no ACK arrives within the timeout, the segment is retransmitted.
- **Duplicate ACKs / Fast Retransmit**: three duplicate ACKs signal a lost segment; TCP retransmits without waiting for the timeout.

> [!WARNING]
> **Head-of-line (HOL) blocking** is the price of in-order delivery: if segment #5 is lost, segments #6–#10 sit in the receive buffer and **cannot be delivered to the application** until #5 is retransmitted — even though they arrived fine. This is exactly why HTTP/2's many streams over one TCP connection can stall together on a single lost packet, and why **QUIC/HTTP/3** moves multiplexing into independent UDP-based streams. See [[UDP]].

## MTU, MSS, and Keep-Alive

- **MTU (Maximum Transmission Unit)** — the largest packet a link carries, typically **1500 bytes** for an Ethernet IP payload. **MSS (Maximum Segment Size)** is the TCP payload that fits in one unfragmented packet (MTU minus IP+TCP headers, commonly ~1460 for IPv4 without options). IPv4 routers may fragment packets unless prohibited; IPv6 routers never do. **Path MTU Discovery** uses ICMP feedback to find the largest packet the path accepts. Filtering that feedback can create a black hole where small packets work and large transfers repeatedly time out.
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
| Reliability | Retransmits and orders bytes; reports failure if delivery cannot continue | Best-effort, no ordering |
| Overhead | Higher (headers, ACKs, retransmits) | Lower |
| Latency behavior | A handshake and in-order retransmission can add delay | No transport handshake or retransmission, but application recovery, congestion control, and queueing can erase that advantage |
| Use cases | HTTP, databases, file transfer | DNS, video streaming, gaming, QUIC |

**Decision rule**: default to TCP when one reliable ordered byte stream fits the workload (web APIs, databases, file transfer), while still setting deadlines and handling connection failure. Use UDP when the application defines its own loss/recovery behavior, needs datagram boundaries or multicast, or builds a different transport such as QUIC.

## Questions

> [!QUESTION]- Why does TCP's three-way handshake exist, and when does its latency cost become a real problem?
>
> - The handshake synchronizes sequence numbers and confirms both sides are reachable before sending data.
> - It adds one full round-trip of latency before the first byte of application data can be sent.
> - For short-lived connections (single HTTP request, DNS-over-TCP), handshake latency dominates total request time.
> - HTTP/2 multiplexing amortizes the handshake across many requests on one connection. QUIC combines transport and TLS setup; a new connection normally needs one round trip, and 0-RTT is available only for resumptions whose replay risk the application accepts.
> - The handshake guarantees reliable setup but costs a full round-trip; reach for connection pooling or QUIC when that overhead is unacceptable.

> [!QUESTION]- How do flow control and congestion control differ, and what happens when you confuse them?
>
> - Flow control protects the receiver: the receive window limits how much unacknowledged data the sender can push.
> - Congestion control protects the network: the congestion window limits send rate based on detected packet loss.
> - The effective send rate is the minimum of both windows.
> - Tuning only one side causes problems: a large receive window with aggressive congestion control still causes network drops; a small receive window with conservative congestion control wastes available bandwidth.
> - Flow control is endpoint-local and deterministic; congestion control is network-wide and heuristic — tune them together or one silently caps the other.

## References

- [Internet Protocol, Version 6 specification (RFC 8200)](https://www.rfc-editor.org/rfc/rfc8200) — IPv6 base header, extension headers, packet-size, and fragmentation rules.
- [IPv6 Addressing Architecture (RFC 4291)](https://www.rfc-editor.org/rfc/rfc4291) — address representation, compression, scopes, unicast, anycast, and multicast.
- [IPv6 Neighbor Discovery (RFC 4861)](https://www.rfc-editor.org/rfc/rfc4861) — router and neighbor discovery, address resolution, and reachability detection over ICMPv6.
- [Traditional IP Network Address Translator (RFC 3022)](https://www.rfc-editor.org/rfc/rfc3022) — NAT/NAPT terminology, mapping behavior, and limitations.
- [NAT Behavioral Requirements for TCP (RFC 5382)](https://www.rfc-editor.org/rfc/rfc5382) — mapping, filtering, timeout, and hairpinning requirements for TCP NATs.
- [ByteByteGo: IPv4 vs IPv6](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/ipv4-vs-ipv6.md) — comparison source for the imported IPv4/IPv6 diagram.
- [ByteByteGo: How NAT Made the Growth of the Internet Possible](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-nat-made-the-growth-of-the-internet-possible.md) — source used to expand the translation-state walkthrough; its unrelated visual is excluded.
- [Transmission Control Protocol (RFC 9293)](https://www.rfc-editor.org/rfc/rfc9293) — the current TCP specification for the handshake, sequence space, flow control, and state machine.
- [TCP/IP Illustrated, Volume 1 (W. Richard Stevens)](https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/) — the definitive practitioner reference for TCP/IP internals; covers every mechanism with packet traces.
- [High Performance Browser Networking (Ilya Grigorik)](https://hpbn.co/building-blocks-of-tcp/) — free online book chapter on TCP building blocks: handshake latency, slow start, congestion control, and how HTTP/2 and QUIC address TCP's limitations.
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/) — practical socket programming guide covering TCP/UDP sockets, connection setup, and common pitfalls.
