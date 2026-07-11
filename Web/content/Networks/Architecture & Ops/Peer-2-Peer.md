---
publish: true
created: 2026-07-11T21:46:25.320Z
modified: 2026-07-11T21:46:25.320Z
published: 2026-07-11T21:46:25.320Z
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

## P2P Architecture Spectrum

"Pure P2P" is one end of a spectrum, not the only option:

- **Structured vs unstructured** — _structured_ networks place data deterministically by key (a DHT like Kademlia → O(log N) lookups), while _unstructured_ networks (early Gnutella) discover content by **flooding** queries to neighbours — simple but O(N) and bandwidth-heavy.
- **Pure P2P** — every peer is equal (classic BitTorrent swarm, blockchain). Maximum decentralization, hardest coordination.
- **Hybrid / super-peer** — a few well-resourced peers take on coordination roles: BitTorrent **trackers** and original **Skype supernodes** helped peers find each other while data still flowed peer-to-peer. This blends P2P's bandwidth scaling with a central(ish) discovery point.
- **Signaling-assisted** — WebRTC is peer-to-peer for _media_ but needs a central **signaling server** just to exchange connection info (offer/answer) before the direct link forms.

The practical takeaway: most "P2P" systems are hybrids — they use a small central or super-peer component for bootstrap/discovery, then move the heavy data transfer peer-to-peer.

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

## Questions

> [!QUESTION]- Why is consistency hard in P2P systems?
> P2P systems have no central authority to act as the source of truth. When peers hold different versions of data and there is no coordinator to resolve conflicts, the system must rely on eventual consistency — peers eventually converge to the same state through gossip or reconciliation protocols. This is acceptable for file distribution (BitTorrent) or content-addressed storage (IPFS) where data is immutable, but it makes P2P unsuitable for systems requiring strong consistency (financial transactions, inventory).

> [!QUESTION]- How does WebRTC use P2P, and what is the role of STUN/TURN servers?
> WebRTC establishes direct peer connections between browsers for audio, video, and data. The challenge is NAT traversal: most browsers are behind NAT and don't have public IP addresses. STUN servers help peers discover their public IP/port. When direct connection fails (symmetric NAT), TURN servers relay traffic. The goal is to minimize relay usage — direct P2P connections reduce latency and server cost; TURN relay is the fallback.

## Pitfalls

**NAT traversal failure**
Most peers are behind NAT and lack public IP addresses. STUN discovers the public IP/port; when symmetric NAT blocks direct connection, TURN relay is required. TURN adds latency and server cost. Mitigation: implement ICE (Interactive Connectivity Establishment) — try direct connection first, fall back to TURN relay only when necessary.

**DHT poisoning**
A malicious peer can inject false routing table entries, redirecting lookups to attacker-controlled nodes. Mitigations: Sybil resistance (proof-of-work for node IDs), content addressing (IPFS uses the hash as the content ID — poisoned data is detectable because the hash won't match).

**Churn instability**
Peers join and leave constantly. High churn degrades DHT routing — routing tables become stale, lookups fail. Kademlia's bucket refresh keeps routing tables current; replication factor (k=20 in BitTorrent) ensures data survives peer loss.

## WebRTC Connection Setup

```text
// ICE candidate exchange (simplified)
1. Peer A creates RTCPeerConnection
2. Peer A gathers ICE candidates (STUN → public IP/port)
3. Peer A sends offer + candidates to Peer B via signaling server
4. Peer B responds with answer + its own candidates
5. Both peers try all candidate pairs → select lowest-latency direct path
6. If no direct path: fall back to TURN relay
```

## References

- [Kademlia: A Peer-to-peer Information System (Maymounkov & Mazières)](https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf) — the original Kademlia DHT paper; the algorithm used by BitTorrent and IPFS for peer discovery.
- [WebRTC (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) — browser P2P API for real-time audio, video, and data channels; includes ICE/STUN/TURN for NAT traversal.
- [IPFS documentation](https://docs.ipfs.tech/concepts/how-ipfs-works/) — content-addressed P2P storage: how content IDs, DHT routing, and Bitswap work together.
- [WebRTC for the Curious](https://webrtcforthecurious.com/) — deep dive into ICE, STUN, TURN, DTLS, and SRTP written by WebRTC implementers; explains why NAT traversal is hard and how TURN relay works.
