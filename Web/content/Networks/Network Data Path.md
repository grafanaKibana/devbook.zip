---
publish: true
created: 2026-08-20T20:41:15.628Z
modified: 2026-08-20T20:41:15.628Z
published: 2026-08-20T20:41:15.628Z
topic:
  - Networks
subtopic: []
summary: The packet path from an application socket through the kernel, NIC, network, and receiving process.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

A network write crosses several ownership boundaries before another process can read it. The application gives bytes to a socket. The kernel applies transport and IP processing, queues packets, and prepares device descriptors. The NIC transfers packet data with DMA and emits frames. The receive path reverses those transformations and schedules the destination process.

Application logs expose only part of that path. A successful `send()` may mean only that the kernel accepted bytes. An MTU failure can drop packets after they leave the host, and a receiver that stops reading eventually pushes back through TCP flow control.

# One TCP Write across the Path

Suppose a service writes a 4 KiB response to an established TCP socket:

1. **User space → socket buffer.** `send()` copies or references the bytes into the kernel send buffer. Success means the kernel accepted them, not that the peer received them. A blocking socket waits when this buffer is full. A non-blocking socket returns `EAGAIN`/`EWOULDBLOCK`.
2. **TCP and IP.** TCP assigns sequence numbers and divides the byte stream according to MSS. IP adds source and destination addresses. The route lookup selects an egress interface and next hop.
3. **Queueing discipline.** On Linux, the qdisc schedules packets for the device. A growing queue increases latency. Overflow can drop packets, which TCP later infers from acknowledgment behavior and retransmits.
4. **Driver and NIC.** After the stack prepends the link-layer header, the driver places descriptors in a transmit ring. The NIC reads packet data with DMA, performs configured segmentation/checksum offloads, and emits the physical frame.
5. **Network hops.** Switches forward frames within a link domain. Routers process the IP packet, decrement the hop limit or TTL, select a next hop, and emit a new link-layer frame. Congestion, filtering, or an MTU mismatch can drop the packet along this path.
6. **Receive NIC → kernel.** The receiving NIC DMA-writes bytes into memory and signals work. Linux NAPI polls batches from the receive ring, reducing interrupt overhead under load.
7. **Decapsulation and delivery.** The kernel validates headers, applies policy, reassembles the TCP stream, acknowledges bytes, and queues in-order data in the socket receive buffer. The receiving process gets those bytes only when `read()`/`recv()` runs.

![[Assets/Networks/Networks-Network Data Path-18120000.png]]

The 4 KiB write is not a 4 KiB packet. With a 1500-byte Ethernet MTU, IPv4 and TCP headers often leave an MSS near 1460 bytes, so TCP sends several segments. TCP options, tunnels, IPv6, or a smaller downstream MTU change that value. Path MTU discovery lets the sender size packets for the path and avoids depending on IPv4 fragmentation.

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

That feedback bounds the amount of receive data the peer advertises, but buffers at every layer can still accumulate delay. Increasing buffer sizes postpones pressure and may convert a short slowdown into stale queued work. Applications still need deadlines and bounded work queues. Socket flow control cannot decide when a response has lost business value.

UDP has no transport receive window or retransmission. When the receive path cannot keep up, datagrams may be dropped. Reliability, pacing, and reconstruction belong to the application protocol when it needs them.

# Failure Trace

Consider a 1500-byte packet sent through a tunnel whose effective path MTU is 1400 bytes. If the packet cannot be fragmented and ICMP fragmentation-needed or Packet Too Big feedback is filtered, TCP keeps retransmitting a segment that never fits. Small requests work, but larger responses stall: a classic PMTU black hole. A packet capture at the sender shows retransmissions. Interface counters may remain clean because the drop occurs later in the path.

The repair is to restore Packet Too Big feedback or apply a justified TCP MSS clamp at the tunnel boundary. A longer application timeout only waits longer for a segment that cannot cross the path.

# References

- [Path MTU Discovery for IPv6](https://www.rfc-editor.org/rfc/rfc8201)
- [NAPI](https://docs.kernel.org/networking/napi.html)
- [socket(7)](https://man7.org/linux/man-pages/man7/socket.7.html)
