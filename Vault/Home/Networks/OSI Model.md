---
topic: [Networks]
subtopic: []
summary: "The 7-layer reference model for how data moves across a network."
level: ["3"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Networks"
qard-topic: "OSI Model"
flashcard_uid: "0dc6300d"
created: "2026-06-20T08:45:59.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

The OSI model is a seven-layer reference model for separating communication responsibilities. It provides vocabulary for standards and diagnosis. It is not the implementation architecture of the Internet. Production stacks follow the [[TCP IP|TCP/IP]] suite and often cross or collapse OSI boundaries.

Layer numbers remain useful when they name what a component can inspect. An L4 load balancer sees transport endpoints. An L7 proxy understands an application protocol. The label is shorthand for capability, not proof that software contains seven discrete modules.

# The Seven Layers

From physical transmission to application semantics:

| # | Layer | Concern | Unit | Examples |
|---|---|---|---|---|
| 7 | **Application** | What the app actually does | Data | [[HTTP]], [[DNS]], [[SMTP]], [[gRPC]], [[WebSockets\|WebSocket]] |
| 6 | **Presentation** | Conceptual encoding, serialization, and encryption responsibility | Data | Often folded into application protocols and libraries |
| 5 | **Session** | Conceptual dialog establishment and maintenance | Data | Often folded into application protocols and libraries |
| 4 | **Transport** | End-to-end delivery between processes | Segment / Datagram | [[TCP IP\|TCP]], [[UDP]] (ports live here) |
| 3 | **Network** | Addressing & routing across networks | Packet | IP, ICMP, routers, NAT |
| 2 | **Data Link** | Node-to-node on one physical link | Frame | Ethernet, Wi-Fi (802.11), MAC addresses, switches |
| 1 | **Physical** | Bits on the medium | Bit | copper, fiber, radio, voltage/light signals |

As data moves down a protocol stack, each applicable protocol adds information needed by its peer. The receiver interprets and removes those headers while delivering the remaining payload upward. The nesting is real even though its boundaries do not map perfectly to all seven OSI layers.

# OSI Vs the Real TCP/IP Stack

Internet architecture is commonly described with four TCP/IP layers. OSI layers 5–7 map into its application layer, while OSI's physical and data-link responsibilities map into the link layer:

| OSI | TCP/IP |
|---|---|
| 7 Application / 6 Presentation / 5 Session | **Application** (HTTP, gRPC, TLS, DNS) |
| 4 Transport | **Transport** (TCP, UDP) |
| 3 Network | **Internet** (IP) |
| 2 Data Link / 1 Physical | **Link** (Ethernet, Wi-Fi) |

In infrastructure discussions, "Layer 4" usually means transport-aware handling and "Layer 7" means application-protocol-aware handling. The terms are useful only when the actual inspected fields and state are also clear.

# Why the Layer Number Matters

The operating layer bounds what infrastructure can observe and change:

- **L4 (transport) load balancer** — selects a backend using connection-level information and cannot independently route HTTP requests inside one TCP connection. A multiplexed [[gRPC]] connection therefore remains one balancing unit unless another application-aware hop terminates it.
- **L7 (application) load balancer / proxy** — terminates and parses the application protocol, enabling host, path, header, or stream-aware routing. That capability adds protocol state and a larger failure surface.
- **Firewalls** — an L3/L4 firewall filters by IP/port. An L7 (application) firewall/WAF inspects HTTP payloads for attacks.
- **TLS** sits between an application protocol and its underlying reliable transport in common Internet stacks. Assigning it to one OSI layer is less useful than naming where TLS terminates and which hop remains protected.
- **Troubleshooting** — "can't resolve the name" points to DNS, "connection refused" points to a transport endpoint, "no route to host" points to IP routing, and "link down" points to the local interface or medium. Layer labels narrow the search only when paired with direct evidence.

# Pitfalls

- **Treating OSI as literal implementation.** Real stacks do not expose crisp layers 5–7, and TLS does not map cleanly to one of them. OSI is a reference model, not an implementation specification.
- **Confusing L4 and L7 capabilities.** Expecting an L4 load balancer to do path-based routing or per-request balancing (it can't — it doesn't parse HTTP) is a common and costly mistake, especially with HTTP/2/gRPC multiplexing.
- **"It's a layer 8 problem."** Engineers jokingly call user/political/process issues "Layer 8" — a reminder that not every failure is technical.

# Questions

<!-- qard-id: bd632caa-baae-4d34-a5e2-349468993f29 -->
> [!qard]- What is the practical difference between a Layer 4 and a Layer 7 load balancer?
> A Layer 4 load balancer chooses a backend once per transport connection, using connection details such as IP addresses, ports and protocol. A Layer 7 load balancer terminates and parses the application protocol, usually HTTP, so it can route each request by its content.
>
> | Aspect | Layer 4 | Layer 7 |
> |---|---|---|
> | What it can see | Connection details only. It does not parse HTTP, so a request's host, path and headers are invisible to it. | The parsed request, including its host, path and headers. |
> | Unit of balancing | The connection. Every request sent on that connection reaches the same backend for the connection's lifetime. | The individual request. Requests from one client connection can reach different backends. |
> | Routing rules | Limited to connection details, so path-based or header-based routing is not possible. | Content-based rules, such as sending `/api/*` to one group of backends and other paths to another. |
> | Cost | Forwards traffic without parsing the application protocol, so it keeps little protocol state. | Terminating and parsing HTTP adds processing, protocol state and more ways to fail. |
>
> The unit of balancing matters for multiplexed protocols such as HTTP/2 and gRPC, where one long-lived connection carries many requests. An L4 balancer sends all of those requests to one backend. An L7 balancer that terminates HTTP/2 can spread them across backends.
>
> Request awareness does not make retries safe. When an L7 proxy is configured to retry failed requests, a retry is safe only if the application tolerates the same request being replayed.
>
> [AWS: How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) · [AWS: Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html) · [RFC 9110: Idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

<!-- qard-id: 04e4e31f-c817-4c9d-a68d-77203a082c12 -->
> [!qard]- How does the OSI model map onto the TCP/IP stack?
> In the common four-layer TCP/IP view, OSI layers 5–7 are grouped as application, layer 4 maps to transport, layer 3 to Internet, and layers 1–2 to link. This is a teaching and diagnostic mapping, not a strict protocol-by-protocol equivalence: real protocols can span or blur those responsibilities. [RFC 1122: Internet architecture](https://www.rfc-editor.org/rfc/rfc1122.html#section-1.1.3) · [ISO/IEC 7498-1: OSI reference model](https://www.iso.org/standard/20269.html)

<!-- qard-id: 0cd775c4-4d95-4cfd-b76a-e5d545f21b33 -->
> [!qard]- What do a MAC address, an IP address and a port each identify?
> A MAC address identifies a network interface on its local link, such as an Ethernet or Wi-Fi network. An IP address identifies a host's interface across interconnected networks, and routers forward packets by it. A port identifies an endpoint, such as a listening application, inside one host for a transport protocol such as TCP.
>
> The three work together when a packet travels to a server:
>
> 1. The sender addresses the IP packet to the server's IP address and the TCP segment inside it to the server's port.
> 2. On each hop, the packet travels inside a link-layer frame for that link. On an Ethernet or Wi-Fi link, the frame is addressed to the MAC address of the next device on that link, usually a router.
> 3. Each router reads the destination IP address, chooses the next link and places the packet in a new frame for that link. When the next link also uses MAC addressing, the new frame carries new MAC addresses.
> 4. On the destination host, TCP uses the destination port to deliver the data to the right socket.
> 
> A MAC address therefore matters only within one link, while the IP address guides the packet across networks. A port number is meaningful only within one host's, or one network namespace's, port space for that transport protocol.
>
> [RFC 1122: Internet architecture](https://www.rfc-editor.org/rfc/rfc1122.html#section-1.1.3) · [RFC 9293: TCP](https://www.rfc-editor.org/rfc/rfc9293.html)

<!-- qard-id: f316e517-3ca8-44f0-b55e-971e726e7329 -->
> [!qard]- Which values identify a TCP connection?
> A TCP connection is identified by four values: the local IP address and port, and the remote IP address and port. Each IP address and port pair is a socket, and the pair of sockets distinguishes one connection from every other TCP connection in the host, or network namespace, that holds it. The combination is often called the 4-tuple.
>
> Because the remote address and port are part of the identity, one local socket can take part in many connections. A server listening on port 443 can hold many connections at once, because each differs by client IP address or client port. For the same reason, one client can open several connections to the same server port by using different local ports.
>
> [RFC 9293: TCP](https://www.rfc-editor.org/rfc/rfc9293.html)

# References

- [ISO/IEC 7498-1:1994](https://www.iso.org/standard/20269.html)
- [What is the OSI model?](https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/)
