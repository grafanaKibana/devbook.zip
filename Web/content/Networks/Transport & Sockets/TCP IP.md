---
publish: true
created: 2026-08-20T20:41:15.643Z
modified: 2026-08-20T20:41:15.643Z
published: 2026-08-20T20:41:15.643Z
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

TCP/IP names a protocol suite, not one protocol. **IP** carries packets between addressed interfaces across networks. **TCP** runs above IP and turns that best-effort packet service into a reliable, ordered, connection-oriented byte stream. HTTP, gRPC, database protocols, and other application protocols then define meaning on top of that stream.

The layer boundary is practical during diagnosis. IP problems appear as reachability, routing, fragmentation, or address-family failures. TCP problems appear as handshake failure, retransmission, flow-control pressure, congestion response, or connection-state exhaustion.

# The TCP/IP Stack

```text
Application Layer   HTTP, gRPC, WebSocket, SMTP, DNS
Transport Layer     TCP (reliable) / UDP (unreliable)
Internet Layer      IP (addressing + routing)
Link Layer          Ethernet, Wi-Fi (physical transmission)
```

Each layer wraps the unit from the layer above with its own control information. The receiver reverses that encapsulation, but only after each layer has accepted the packet or segment under its own rules.

# IP Addressing and NAT

The "IP" half of TCP/IP is addressing. An **IP address** identifies an interface. A **port** (16-bit, 0–65535) selects a transport endpoint on that machine. TCP identifies a connection by the 4-tuple `(src IP, src port, dst IP, dst port)` within its protocol namespace.

- **IPv4** — 32-bit addresses (~4.3 billion), written `192.168.1.10`. Address scarcity drove widespread private addressing and **NAT**, though NAT also became embedded in operational policy and topology.
- **IPv6** — 128-bit addresses, written `2001:db8::1`. Its address space removes address-conservation as a reason for NAT, but does not remove firewall policy or every translation-based transition mechanism.
- **Private ranges** (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) are non-routable on the public internet.
- **Transport ports** are conventionally divided into system/well-known (0–1023), registered, and dynamic/private ranges. Clients normally choose an **ephemeral** source port. A client can exhaust usable source tuples when many recently closed TCP connections target the same remote endpoint.

NAPT, the common many-to-one form of NAT, rewrites both an address and a port. If `10.0.0.7:53000` sends to `203.0.113.20:443`, a gateway might record this state:

| Inside tuple | Public mapping | Remote tuple | State |
|---|---|---|---|
| `10.0.0.7:53000` | `198.51.100.8:41001` | `203.0.113.20:443` | TCP established, idle 18 s |

The server replies to `198.51.100.8:41001`. The gateway uses the mapping to demultiplex the packet back to `10.0.0.7:53000`. Mappings expire, and different devices use different endpoint filtering and timeout behavior. Unsolicited inbound traffic has no mapping, so it needs a configured port forward, a rendezvous-assisted hole punch, or a relay. Carrier-grade NAT adds another shared translation layer and makes inbound reachability and per-subscriber attribution harder.

NAT is translation, not firewall policy. A stateful firewall decides which packets may pass. A translator rewrites packet fields and maintains mappings. They are often implemented on the same gateway, which is why they are easy to confuse. IPv6 restores end-to-end addressing, but an IPv6 firewall should still deny unwanted inbound traffic.

# IP Layer: IPv4 and IPv6

| Concern | IPv4 | IPv6 | Operational consequence |
|---|---|---|---|
| Address and notation | 32-bit dotted decimal, for example `192.0.2.10` | 128-bit hexadecimal. Consecutive zero groups can be compressed once, for example `2001:db8::10` | Logs, ACLs, parsers, and metrics must handle both forms without truncation |
| Base header | Variable 20–60 bytes. Includes a header checksum | Fixed 40 bytes. No header checksum. Optional information uses extension headers | IPv6 removes per-hop checksum recomputation but extension-header handling still needs testing |
| Fragmentation | A source or router may fragment unless prohibited | Only the source fragments. Routers return ICMPv6 Packet Too Big | Broken PMTU feedback causes large-flow stalls even when small probes pass |
| Local neighbor lookup | ARP maps IPv4 addresses to link-layer addresses | Neighbor Discovery uses ICMPv6 and scoped multicast | IPv6 does not use ARP or broadcast |
| Address conservation | Private addressing plus NAPT is common | Globally unique addressing is practical | IPv6 removes the conservation need for NAPT, not the need for traffic filtering |

Do not declare dual stack universally best. It gives native reachability during migration, but it doubles policy, observability, DNS, and failure surfaces: an `AAAA` record can send clients down a broken IPv6 path while IPv4 remains healthy. Use dual stack when both paths are operated and tested. IPv6-only with DNS64/NAT64 can be simpler inside controlled client networks. IPv4-only remains a compatibility constraint, not an end state.

![[Assets/Networks/Networks-TCP IP-18120000.png]]

# TCP Connection: Three-Way Handshake

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

This handshake normally adds one round trip before application data flows. Connection reuse and HTTP/2 multiplexing amortize that cost. QUIC integrates transport and TLS. A new connection still requires a round trip under normal conditions, while a resumed connection may send 0-RTT data that the application must treat as replayable.

# Reliability Mechanisms

TCP detects loss and preserves an ordered byte stream while the connection remains viable through:

- **Sequence numbers** identify byte positions, allowing the receiver to discard duplicates and reorder data that arrives out of sequence.
- **Acknowledgments (ACKs)** report the next byte expected. Selective acknowledgments can identify additional received ranges.
- **Retransmission timers** recover when acknowledgment progress stalls.
- **Fast loss recovery** can infer a gap from acknowledgment patterns and retransmit before the timer expires.

> [!WARNING]
> **Head-of-line (HOL) blocking** is the price of in-order delivery: if segment #5 is lost, segments #6–#10 sit in the receive buffer and **cannot be delivered to the application** until #5 is retransmitted — even though they arrived fine. This is exactly why HTTP/2's many streams over one TCP connection can stall together on a single lost packet, and why **QUIC/HTTP/3** moves multiplexing into independent UDP-based streams. See [[Networks/Transport & Sockets/UDP|UDP]].

# MTU, MSS, and Keep-Alive

- **MTU (Maximum Transmission Unit)** — the largest IP packet a link can carry without IP fragmentation. Ethernet commonly carries a **1500-byte IP packet**. **MSS (Maximum Segment Size)** is the TCP payload that fits in one unfragmented packet (MTU minus IP and TCP headers, commonly about 1460 bytes for IPv4 without options). IPv4 routers may fragment unless the packet forbids it. IPv6 routers never fragment in transit. **Path MTU Discovery** relies on ICMP feedback. Filtering that feedback can produce a black hole where small probes pass and larger transfers stall.
- **TCP keep-alive** is an optional idle-connection probe, normally disabled by default at the protocol level. It can discover a peer that vanished without a FIN and can keep a middlebox mapping active, but its default operating-system intervals are often too long for application failure detection. Application deadlines and heartbeats express liveness requirements more directly.
- **Window scaling / bandwidth-delay product** — a path with high bandwidth and RTT needs enough receive-buffer space to cover roughly bandwidth × RTT. The window-scale option expands the advertised receive window beyond 65,535 bytes. Autotuning still depends on operating-system limits and application consumption.

# Flow Control and Congestion Control

**Flow control** prevents the sender from overwhelming the receiver. The receiver advertises a **receive window** for data it can accept. A stalled reader eventually shrinks that window and can stop the sender even when the network itself is healthy.

**Congestion control** limits pressure on the network. The sender maintains a **congestion window**, probes for available capacity, and reduces its rate when congestion signals appear. The usable flight size is bounded by both the receive window and the congestion window, so either the peer or the path can become the bottleneck. Algorithms such as CUBIC and BBR make different choices about how they estimate and use capacity.

# Connection Teardown: Four-Way Handshake

```text
Client → Server: FIN
Server → Client: ACK
Server → Client: FIN
Client → Server: ACK
── Connection closed ──
```

The diagram shows one common orderly close in which each direction finishes separately. TCP may combine a FIN with an ACK, both endpoints may close simultaneously, and a reset (`RST`) aborts rather than completing this exchange. `TIME_WAIT` normally belongs to the endpoint that performs the active close by sending the first FIN and later acknowledges the peer's FIN. Simultaneous close can leave both endpoints in that state.

`TIME_WAIT` lasts long enough to keep delayed packets from an old connection out of a later one. A client that repeatedly opens short-lived connections to the same destination can exhaust usable source tuples. Connection pooling and bounded connection creation are the default remedies. `SO_REUSEADDR` controls listener bind/restart behavior under operating-system-specific rules. It does not expand the outbound ephemeral-port space.

# Pitfalls

## Nagle's Algorithm Causing Latency

**What goes wrong**: a request/response protocol performs small writes while an earlier small segment remains unacknowledged. Nagle's algorithm can hold the later write until the outstanding data is acknowledged or enough data accumulates, adding a visible delay when it interacts with delayed acknowledgments.

**Why it happens**: Nagle's algorithm limits the number of tiny segments in flight. The behavior is useful for inefficient writers, but it conflicts with protocols whose correctness or latency depends on prompt delivery of each small message.

**Mitigation**: buffer application records deliberately, measure the wire behavior, and set `TCP_NODELAY` when a latency-sensitive protocol sends small messages that should not be coalesced. Disabling Nagle does not supply message framing or fix an application that writes one byte at a time.

```csharp
var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
socket.NoDelay = true;  // disables Nagle's algorithm
```

## TIME\_WAIT Port Exhaustion

**What goes wrong**: a service opens and actively closes many short-lived outbound connections to the same destination. The OS cannot allocate another usable source tuple because too many recent connections remain in `TIME_WAIT`.

**Why it happens**: TCP retains recently closed connection identity so delayed segments cannot corrupt a later connection. The exact retention time and tuple-reuse rules are platform and kernel specific. NAT gateways can impose a separate translated-port limit.

**Mitigation**: reuse connections through `HttpClient`, database pools, or another protocol-aware pool, and bound connection churn. Confirm exhaustion with socket-state, source-port, and NAT telemetry before changing kernel behavior. Linux `net.ipv4.tcp_tw_reuse` semantics vary by kernel version and do not generalize to other platforms. Treat it as a diagnosed expert action for a specific client workload, not a default mitigation. `SO_REUSEADDR` helps a listening server rebind under platform rules and does not solve outbound tuple exhaustion.

# TCP Vs UDP

| | TCP | UDP |
|---|---|---|
| Connection | Connection-oriented (handshake) | Connectionless |
| Reliability | Retransmits and orders bytes. Reports failure if delivery cannot continue | Best-effort, no ordering |
| Overhead | Higher (headers, ACKs, retransmits) | Lower |
| Latency behavior | A handshake and in-order retransmission can add delay | No transport handshake or retransmission, but application recovery, congestion control, and queueing can erase that advantage |
| Use cases | HTTP, databases, file transfer | DNS, video streaming, gaming, QUIC |

TCP fits when the workload needs one reliable ordered byte stream, provided the application still defines framing, deadlines, retry policy, and connection-failure behavior. UDP fits datagram boundaries, multicast, or replaceable stale data only when the application or another transport such as QUIC supplies recovery and congestion control.

# References

- [Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293)
- [Internet Protocol, Version 6](https://www.rfc-editor.org/rfc/rfc8200)
- [Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022)
- [Building blocks of TCP](https://hpbn.co/building-blocks-of-tcp/)
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)
