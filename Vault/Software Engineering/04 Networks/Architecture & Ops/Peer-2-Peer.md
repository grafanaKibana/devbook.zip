---
topic:
  - Networks
subtopic:
  - Architecture & Ops
level:
  - "1"
priority: Medium
status: Creation
dg-publish: true
---

# Peer-to-Peer (P2P)

Peer-to-Peer (P2P) is a network architecture where participants (peers) communicate directly with each other rather than through a central server. Each peer acts as both client and server — it consumes resources from other peers and contributes resources back. This contrasts with the client-server model where clients consume and servers provide.

P2P eliminates the central server as a bottleneck and single point of failure. The tradeoff is coordination complexity: without a central authority, peers must discover each other, agree on data consistency, and handle churn (peers joining and leaving).

## How Peers Find Each Other: DHT

Distributed Hash Tables (DHT) are the standard mechanism for peer discovery in large P2P networks (BitTorrent, IPFS). A DHT maps keys to values across all peers without a central directory:

```text
Key: SHA1("ubuntu-22.04.iso")
     → Hash determines which peer(s) are responsible for this key
     → Those peers store the list of peers that have the file
```

Each peer knows a subset of other peers (its "routing table"). Lookups route through O(log N) hops to find the peer responsible for a key. BitTorrent's DHT (Kademlia) allows torrent discovery without a central tracker.

## Real-World Applications

| Application | P2P use | Why P2P |
|---|---|---|
| BitTorrent | File distribution | Scales with demand — more seeders = faster downloads |
| IPFS | Content-addressed storage | Censorship resistance, no central hosting cost |
| WebRTC | Browser video/audio | Direct peer connections reduce server relay cost |
| Blockchain | Transaction ledger | No central authority, tamper-evident |
| Skype (original) | VoIP routing | Reduced server infrastructure cost |

## Tradeoffs

| Dimension | P2P | Client-Server |
|---|---|---|
| Scalability | Scales with peers (more peers = more capacity) | Scales with server investment |
| Single point of failure | None (distributed) | Central server is SPOF |
| Consistency | Hard (eventual consistency, no central authority) | Easy (server is source of truth) |
| Coordination | Complex (peer discovery, churn handling) | Simple (clients talk to server) |
| Latency | Variable (depends on peer proximity) | Predictable (server location known) |

**Decision rule**: use P2P when you need to distribute large files at scale (BitTorrent), build censorship-resistant systems (IPFS, blockchain), or reduce server costs for direct communication (WebRTC). Use client-server when you need strong consistency, predictable latency, or centralized access control.

## References

- [Kademlia: A Peer-to-peer Information System (Maymounkov & Mazières)](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf) — the original Kademlia DHT paper; the algorithm used by BitTorrent and IPFS for peer discovery.
- [WebRTC (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) — browser P2P API for real-time audio, video, and data channels; includes ICE/STUN/TURN for NAT traversal.
- [IPFS documentation](https://docs.ipfs.tech/concepts/how-ipfs-works/) — content-addressed P2P storage: how content IDs, DHT routing, and Bitswap work together.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/04 Networks/04 Networks|04 Networks]]
>
> **Pages**
> - [[Software Engineering/04 Networks/Architecture & Ops/VPN|VPN]]
<!-- whats-next:end -->
