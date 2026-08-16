---
icon: network
order: 40
color: "#f59e0b"
topic:
  - Networks
subtopic: []
summary: "Protocols, latency, and reliability of how machines communicate over a network."
tags: [FolderNote]
publish: true
priority: High
level:
  - "3"
status: Done
---

Networking turns local computation into communication between failure domains. A request depends on name resolution, routing, transport state, protocol semantics, and the remote application. Along that path, data may be delayed, rejected, duplicated, reordered, or hidden behind a higher layer's recovery behavior.

The practical model starts with one question: which component last observed the request in a valid state? An HTTP timeout might begin with slow DNS, lost TCP segments, a TLS handshake, proxy queueing, or application work. Logs become useful only when they are tied to that path.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# The Layer Model

The stack separates responsibilities without pretending implementations are perfectly isolated. A single request crosses every row:

| Layer | Owns | Examples | Typical failure |
|---|---|---|---|
| Link | Frames on the local wire | Ethernet, Wi-Fi, ARP | Driver/physical issues, local congestion |
| Internet | Addressing and routing between networks | [[Home/Networks/Transport & Sockets/TCP IP\|IP]], ICMP, routing | Unreachable host, wrong route, MTU/fragmentation |
| Transport | End-to-end delivery between processes | [[Home/Networks/Transport & Sockets/TCP IP\|TCP]], [[Home/Networks/Transport & Sockets/UDP\|UDP]], ports | Refused/reset connections, retransmit-driven latency |
| Application | What the bytes mean | [[Home/Networks/Protocols/HTTP\|HTTP]], [[Home/Networks/Protocols/DNS\|DNS]], TLS, [[Home/Networks/Protocols/gRPC\|gRPC]] | Wrong status, slow handshakes, protocol mismatch |

TLS uses a transport connection to secure application protocols. DNS is itself an application-layer protocol and often precedes that connection. Resolution and handshake timings therefore belong beside application latency in any request trace.

# Delivery Modes

The destination address determines who may receive an IP packet. The transport protocol does not change that fact: UDP supports all four patterns where the network does, while a TCP connection is still a unicast conversation between two endpoints.

| Mode | Address ownership | Sender → receivers | Routing scope | Concrete use |
|---|---|---:|---|---|
| Unicast | One interface owns the destination | 1 → 1 | Local or routed | A client connects to one API address. Ordinary DNS replies are usually unicast |
| Broadcast | Every IPv4 host on the attached broadcast domain accepts the destination | 1 → all on-link | IPv4 subnet only. Routers normally do not forward it | A DHCP client without an address sends to `255.255.255.255` |
| Multicast | Receivers join a group address. No host owns it | 1 → subscribed group | Link-local or routed only where multicast is configured | mDNS uses `224.0.0.251`/`ff02::fb`. Controlled networks distribute media or market data |
| Anycast | Multiple nodes advertise the same unicast address | 1 → one topologically selected node | Routed | Public DNS and CDN edges route a client to one advertised site; separate policy may withdraw an unhealthy advertisement |

Anycast does not send a packet to every site advertising the address. Routing selects one path, and a route change can move later packets or a new connection elsewhere. Stateful services need an explicit plan for that movement. Multicast has different cardinality: the network replicates traffic toward joined receivers where multicast routing exists. IPv6 uses multicast rather than broadcast for functions such as Neighbor Discovery.

Destination ownership narrows the failure search. Unicast points to one addressed endpoint and its route. Broadcast remains on the local IPv4 link. Multicast depends on group membership and replication state. Anycast can fail selectively because different source networks choose different advertisements.

# References

- [Host Extensions for IP Multicasting](https://www.rfc-editor.org/rfc/rfc1112)
- [Multicast DNS](https://www.rfc-editor.org/rfc/rfc6762)
- [High Performance Browser Networking](https://hpbn.co/)
