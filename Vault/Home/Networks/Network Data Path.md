---
topic:
  - Networks
subtopic: []
summary: "The packet path from an application socket through the kernel, NIC, network, and receiving process."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

A network write does not travel directly from one process to another. The application hands bytes to a socket; the operating system frames them as transport segments and IP packets, queues and routes them, and gives descriptors to a NIC that reads packet bytes with DMA. The receiver performs the same work in reverse before its application can read anything.

This path explains failures that an application log cannot: a successful `send()` can still be waiting in a socket buffer, a packet larger than the path MTU can disappear, and a receiver that stops reading eventually pushes back through TCP to the sender.

# One TCP Write across the Path

Suppose a service writes a 4 KiB response to an established TCP socket:

1. **User space → socket buffer.** `send()` copies or references the bytes into the kernel send buffer. Success means the kernel accepted them, not that the peer received them. A blocking socket waits when this buffer is full; a non-blocking socket returns `EAGAIN`/`EWOULDBLOCK`.
2. **TCP and IP.** TCP assigns sequence numbers and divides the byte stream according to MSS. IP adds source and destination addresses. The route lookup selects an egress interface and next hop.
3. **Queueing discipline.** The qdisc schedules packets for the device. A full queue increases latency; a full transmit path can drop packets, which TCP later detects and retransmits.
4. **Driver and NIC.** After the stack prepends the link-layer header, the driver places descriptors in a transmit ring. The NIC reads packet data with DMA, performs configured segmentation/checksum offloads, and emits the physical frame.
5. **Network hops.** Switches forward frames locally; routers remove the incoming link header, decrement the IP hop limit/TTL, choose the next hop, and create a new link frame. Congestion or an MTU mismatch can drop the packet here.
6. **Receive NIC → kernel.** The receiving NIC DMA-writes bytes into memory and signals work. Linux NAPI polls batches from the receive ring, reducing interrupt overhead under load.
7. **Decapsulation and delivery.** The kernel validates headers, applies policy, reassembles the TCP stream, acknowledges bytes, and queues in-order data in the socket receive buffer. The receiving process gets those bytes only when `read()`/`recv()` runs.

![[System Design 101/bd59ba7c86eb532d1da077aacb707a947ed39f305bbd34adb87340a2e04a17d7.png]]

The 4 KiB write is not a 4 KiB packet. With a 1500-byte Ethernet MTU, IPv4 and TCP headers usually leave an MSS near 1460 bytes, so TCP sends several segments. Options, tunnels, IPv6, or a smaller downstream MTU reduce that payload. Path MTU Discovery is preferable to IP fragmentation because losing one fragment discards the whole original packet.

# Backpressure Is End to End

Backpressure begins when the receiver consumes data more slowly than it arrives:

```text
receiver application pauses
  → receive socket buffer fills
  → TCP advertises a smaller receive window
  → sender has less data allowed in flight
  → sender socket buffer fills
  → send() blocks or reports EAGAIN
```

That chain is a feature: it bounds memory and makes overload visible. Raising buffers only delays the signal and can turn a short slowdown into seconds of queued stale work. The application still needs deadlines and bounded queues. A write that remains blocked past its usefulness should be cancelled; a read timeout should distinguish "peer is slow" from "no route" or "connection reset."

UDP has no receive-window feedback. If the receiver or NIC ring cannot keep up, datagrams are dropped. A UDP application must pace the sender, measure loss, and define whether to discard, retry, or reconstruct missing data.

# Failure Trace

Consider a 1500-byte packet sent through a tunnel whose effective path MTU is 1400 bytes. If the packet cannot be fragmented and the ICMP "Packet Too Big" feedback is filtered, TCP keeps retransmitting a segment that never fits. Small requests work, but larger responses stall: a classic PMTU black hole. A packet capture at the sender shows retransmissions; interface counters may remain clean because the drop occurs later in the path.

The repair is to restore PMTU feedback or clamp TCP MSS at the tunnel boundary, not to increase an application timeout. The layer that first violates the packet-size contract owns the fix.

# References

- [TCP specification (RFC 9293)](https://www.rfc-editor.org/rfc/rfc9293) — current TCP state machine, sequence, acknowledgment, flow-control, and retransmission requirements.
- [Path MTU Discovery for IPv6 (RFC 8201)](https://www.rfc-editor.org/rfc/rfc8201) — explains packet-too-big feedback and how endpoints learn a usable path MTU.
- [Linux kernel: NAPI](https://docs.kernel.org/networking/napi.html) — official description of interrupt-driven receive scheduling and packet polling.
- [Linux kernel: Scaling in the Linux Networking Stack](https://docs.kernel.org/networking/scaling.html) — receive/transmit queues, RSS/RPS/RFS, and CPU distribution along the data path.
- [socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html) — Linux socket buffers, blocking behavior, timeouts, and interface options.
- [ByteByteGo: How is Data Transmitted Between Applications?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-is-data-transmitted-between-applications.md) — source walkthrough used for the application-to-NIC path and imported diagram.
