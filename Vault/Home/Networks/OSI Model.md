---
topic:
  - Networks
subtopic: []
summary: "The 7-layer reference model for how data moves across a network."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Networks"
qard-topic: "OSI Model"
flashcard_uid: "0dc6300d"
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

> [!qard]- What's the practical difference between a Layer 4 and a Layer 7 load balancer?
> An L4 balancer selects a backend using transport-level connection information, such as addresses and ports. It cannot inspect an HTTP path or route individual requests inside a multiplexed connection. An L7 proxy terminates and parses HTTP, so it can apply request-level host, path, or header rules. That inspection adds protocol state and processing; configured retries still need an application-safe replay contract. [AWS: How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) · [AWS: Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html)

> [!qard]- How does the OSI model map onto the TCP/IP stack?
> In the common four-layer TCP/IP view, OSI layers 5–7 are grouped as application, layer 4 maps to transport, layer 3 to Internet, and layers 1–2 to link. This is a teaching and diagnostic mapping, not a strict protocol-by-protocol equivalence: real protocols can span or blur those responsibilities. [RFC 1122: Internet architecture](https://www.rfc-editor.org/rfc/rfc1122.html#section-1.1.3) · [ISO/IEC 7498-1: OSI reference model](https://www.iso.org/standard/20269.html)

> [!qard]- What roles do MAC addresses, IP addresses, and transport ports play in delivery or endpoint selection, and which local and remote values identify a TCP connection?
> A link-layer address identifies an interface within the current link's delivery scope. An IP address is routed across networks. A transport port selects an endpoint within the host's transport namespace. For TCP, the local and remote IP addresses and ports identify a connection within the relevant network namespace.

# References

- [ISO/IEC 7498-1:1994](https://www.iso.org/standard/20269.html)
- [What is the OSI model?](https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/)
