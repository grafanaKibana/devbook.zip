---
publish: true
created: 2026-07-05T10:53:36.339+03:00
modified: 2026-07-05T15:49:32.878+03:00
---

# Intro

The OSI (Open Systems Interconnection) model is a 7-layer reference framework that describes how data moves across a network, with each layer handling one concern and talking only to the layers directly above and below it. It's a _conceptual_ model — the real internet runs on the leaner [[TCP IP|TCP/IP]] stack — but OSI is the shared vocabulary engineers use to locate a problem ("is this a Layer 4 or Layer 7 issue?") and to reason about where responsibilities belong. Knowing which layer a thing lives at is what makes phrases like "L4 vs L7 load balancer" or "TLS sits at Layer 6-ish" meaningful.

## The Seven Layers

From the wire up to the app. Mnemonic (top→down): **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing.

| # | Layer | Concern | Unit | Examples |
|---|---|---|---|---|
| 7 | **Application** | What the app actually does | Data | [[HTTP]], [[DNS]], [[SMTP]], [[gRPC]], [[WebSockets\|WebSocket]] |
| 6 | **Presentation** | Encoding, serialization, encryption | Data | TLS, JSON/Protobuf, compression, character sets |
| 5 | **Session** | Establishing/maintaining sessions | Data | session cookies, RPC sessions, TLS session resumption |
| 4 | **Transport** | End-to-end delivery between processes | Segment / Datagram | [[TCP IP\|TCP]], [[UDP]] (ports live here) |
| 3 | **Network** | Addressing & routing across networks | Packet | IP, ICMP, routers, NAT |
| 2 | **Data Link** | Node-to-node on one physical link | Frame | Ethernet, Wi-Fi (802.11), MAC addresses, switches |
| 1 | **Physical** | Bits on the medium | Bit | copper, fiber, radio, voltage/light signals |

As data goes **down** the stack each layer wraps the payload in its own header (**encapsulation**); on the way **up** the receiver strips them off (**de-encapsulation**) — the same nesting the TCP/IP note describes.

## OSI vs the Real TCP/IP Stack

Nobody implements seven discrete layers. The internet uses the 4-layer **TCP/IP model**, and OSI's layers 5–7 collapse into one "Application" layer in practice:

| OSI | TCP/IP |
|---|---|
| 7 Application / 6 Presentation / 5 Session | **Application** (HTTP, gRPC, TLS, DNS) |
| 4 Transport | **Transport** (TCP, UDP) |
| 3 Network | **Internet** (IP) |
| 2 Data Link / 1 Physical | **Link** (Ethernet, Wi-Fi) |

So in everyday use, "Layer 4" almost always means **TCP/UDP** and "Layer 7" means **HTTP and friends** — the two that matter most for the decisions engineers make.

## Why the Layer Number Matters

The whole reason to know OSI is that infrastructure operates _at_ a layer, and that determines what it can see:

- **L4 (transport) load balancer** — routes by IP/port only; fast, protocol-agnostic, but **blind to HTTP**. This is exactly why an L4 balancer pins all of a [[gRPC]] client's multiplexed calls to one backend — it can't see the individual HTTP/2 streams inside the connection.
- **L7 (application) load balancer / proxy** — parses HTTP, so it can route by path/host/header, terminate TLS, retry, and balance individual requests/streams (Envoy, NGINX, YARP). More work per request, far more capability.
- **Firewalls** — an L3/L4 firewall filters by IP/port; an L7 (application) firewall/WAF inspects HTTP payloads for attacks.
- **TLS** spans presentation/session conceptually but is negotiated just above transport — which is why it can protect any L7 protocol uniformly.
- **Troubleshooting** — "can't resolve the name" is L7 (DNS), "connection refused" is L4 (port/TCP), "no route to host" is L3 (IP), "link down" is L1/L2. Naming the layer narrows the search instantly.

## Pitfalls

- **Treating OSI as literal implementation.** Real stacks don't have crisp layers 5–7; TLS, for instance, doesn't map cleanly to one OSI layer. Use OSI as a _map_, not a spec.
- **Confusing L4 and L7 capabilities.** Expecting an L4 load balancer to do path-based routing or per-request balancing (it can't — it doesn't parse HTTP) is a common and costly mistake, especially with HTTP/2/gRPC multiplexing.
- **"It's a layer 8 problem."** Engineers jokingly call user/political/process issues "Layer 8" — a reminder that not every failure is technical.

## Questions

> [!QUESTION]- What's the practical difference between a Layer 4 and a Layer 7 load balancer?
> An **L4** balancer routes by IP and port only — it's fast and protocol-agnostic but can't see inside the connection, so it distributes whole TCP connections (and pins all multiplexed HTTP/2/gRPC streams to one backend). An **L7** balancer parses the application protocol (HTTP), so it can route by URL/host/header, balance individual requests, terminate TLS, and retry — at higher per-request cost. The choice hinges on whether you need application-aware routing.

> [!QUESTION]- How does the OSI model map onto the actual TCP/IP stack?
> TCP/IP has four layers and folds OSI 5–7 into a single Application layer: Application (HTTP/gRPC/TLS/DNS) ↔ OSI 5–7, Transport (TCP/UDP) ↔ OSI 4, Internet (IP) ↔ OSI 3, Link (Ethernet/Wi-Fi) ↔ OSI 1–2. In conversation, "Layer 4" means TCP/UDP and "Layer 7" means HTTP-level protocols.

> [!QUESTION]- At which layer do IP addresses, ports, and MAC addresses each operate?
> **MAC addresses** at Layer 2 (Data Link) identify a NIC on a local link; **IP addresses** at Layer 3 (Network) identify a host across networks and enable routing; **ports** at Layer 4 (Transport) identify the specific process/socket on that host. A connection is uniquely identified by the L3+L4 tuple (src IP:port, dst IP:port).

## References

- [OSI model (Wikipedia)](https://en.wikipedia.org/wiki/OSI_model) — the seven layers, history, and how they map to real protocols.
- [OSI model explained (Cloudflare Learning)](https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/) — accessible per-layer walkthrough with attack/defense framing.
- [TCP/IP model (Wikipedia)](https://en.wikipedia.org/wiki/Internet_protocol_suite) — the 4-layer model the internet actually uses, and how it relates to OSI.
