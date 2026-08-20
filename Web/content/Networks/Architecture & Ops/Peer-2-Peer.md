---
publish: true
created: 2026-08-20T20:41:15.628Z
modified: 2026-08-20T20:41:15.628Z
published: 2026-08-20T20:41:15.628Z
topic:
  - Networks
subtopic:
  - Architecture & Ops
summary: An architecture where peers act as both client and server, avoiding a central bottleneck.
level:
  - "1"
priority: Medium
status: Ready to Repeat
---

Peer-to-peer architecture moves some resource discovery, storage, or transfer from dedicated servers to participating nodes. A peer can consume and provide the same resource. Central services may still handle bootstrap, identity, coordination, or relaying.

Distributing the data path can add capacity as peers join and remove one central transfer bottleneck. It also introduces churn, partial trust, uneven connectivity, and data-availability problems. The architecture is only as decentralized as its remaining control and discovery dependencies.

# How Peers Find Each Other: DHT

Distributed hash tables provide decentralized key lookup in systems such as BitTorrent and IPFS. A DHT assigns responsibility for key/value records across participating nodes without one directory:

```text
Key: SHA1("ubuntu-22.04.iso")
     → Hash determines which peer(s) are responsible for this key
     → Those peers store the list of peers that have the file
```

Each peer keeps a routing table containing only part of the network. Kademlia-style lookup repeatedly queries nodes whose identifiers are closer to the target. With a healthy, well-distributed table, the number of rounds grows logarithmically with network size. BitTorrent's DHT locates peers for an infohash without requiring a tracker. The torrent identifier still has to arrive through a magnet link, metadata exchange, or another discovery channel.

# P2P Architecture Spectrum

"Pure P2P" is one end of a spectrum, not the only option:

- **Structured vs unstructured** — structured networks route a key through an identifier space. Unstructured networks search by flooding or gossip, trading simple membership for higher and less predictable lookup cost.
- **Peer-only data path** — peers exchange payloads directly, while bootstrap information may still come from a known node or static configuration.
- **Hybrid / super-peer** — trackers, rendezvous services, or capable peers coordinate discovery while bulk data remains peer-to-peer.
- **Signaling-assisted** — WebRTC applications use an application-defined signaling channel to exchange offers, answers, and candidates before ICE checks connectivity. Media may flow directly or through a TURN relay.

Most deployed systems are hybrids. "Peer-to-peer" describes an important data or coordination path, not proof that every dependency is decentralized.

# Real-World Applications

| Application | P2P use | Why P2P |
|---|---|---|
| BitTorrent | File distribution | Scales with demand — more seeders = faster downloads |
| IPFS | Content-addressed retrieval | Verifiable content identifiers and provider-independent retrieval |
| WebRTC | Browser video/audio | Direct peer connections reduce server relay cost |
| Blockchain | Replicated transaction protocol | Agreement among mutually distrustful participants under the protocol's assumptions |
| Skype (original) | VoIP routing | Reduced server infrastructure cost |

# Tradeoffs

| Dimension | P2P | Client-Server |
|---|---|---|
| Scalability | Can gain transfer/storage capacity from peers. Control paths may still bottleneck | Capacity is provisioned by service owners |
| Single point of failure | Depends on bootstrap, discovery, identity, and relay design | Central service needs redundancy |
| Consistency | Protocol-specific. Replicas and membership make coordination expensive | Central authority can serialize decisions more directly |
| Coordination | Discovery, churn, trust, and NAT traversal are part of the design | Clients use a known service endpoint |
| Latency | Variable across peer paths and relay use | Managed infrastructure gives more control, but the network path still varies |

P2P fits workloads where participants can contribute useful bandwidth, storage, or direct connectivity and where variable membership is acceptable. Client-server remains simpler when one authority owns access control and ordering or when latency and availability require tightly managed infrastructure.

# Pitfalls

**NAT traversal failure**
NAT and firewall behavior can prevent candidate pairs from connecting directly. ICE checks available host, server-reflexive, and relay candidates, then selects a working pair. TURN must be provisioned as a supported path rather than treated as an exceptional implementation detail.

**DHT poisoning**
A malicious participant can advertise misleading routing information or surround a target in the identifier space. Defenses depend on the protocol: constrained node identifiers, diverse routing-table entries, authenticated records, and content-address verification protect different boundaries. Content addressing detects bytes that do not match an expected identifier. It does not prove that lookup results are complete or available.

**Churn instability**
Peers join and leave continuously, so routing entries and provider records become stale. Periodic bucket refresh, record expiration, replication, and parallel lookup keep the overlay usable. Exact bucket sizes and replication rules belong to the specific DHT. They are not universal Kademlia constants.

# WebRTC Connection Setup

```text
// ICE candidate exchange (simplified)
1. Peer A creates RTCPeerConnection
2. Peer A gathers ICE candidates (STUN → public IP/port)
3. Peer A sends offer + candidates to Peer B via signaling server
4. Peer B responds with answer + its own candidates
5. ICE checks prioritized candidate pairs; the controlling peer nominates a valid pair
6. A TURN relay candidate may be selected when direct checks fail or policy requires relaying
```

# References

- [Kademlia: A Peer-to-peer Information System](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf)
- [How IPFS works](https://docs.ipfs.tech/concepts/how-ipfs-works/)
- [WebRTC for the Curious](https://webrtcforthecurious.com/)
