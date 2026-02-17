---
{"dg-publish":true,"permalink":"/software-engineering/04-networks/architecture-and-ops/vpn/","noteIcon":"1"}
---


# Intro

A VPN (virtual private network) creates an encrypted tunnel so a device or network can communicate as if it were on a private network.
You reach for it to access private resources, connect offices, or secure traffic over untrusted networks.
The key engineering work is routing, DNS, identity, and safe split tunnel policy.

## Deeper Explanation

### Mental Model

```mermaid
flowchart LR
  D[Device] --> T[Tunnel]
  T --> G[Gateway]
  G --> P[Private network]
```

Common types:

- Client VPN: individual device to gateway
- Site to site VPN: network to network

## Questions

> [!QUESTION]- What is the difference between client VPN and site to site VPN?
> Client VPN connects a single device.
> Site to site connects two networks.

## Links

- [WireGuard](https://www.wireguard.com/)
- [IPsec architecture RFC 4301](https://www.rfc-editor.org/rfc/rfc4301)
- [VPN](https://en.wikipedia.org/wiki/Virtual_private_network)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/04 Networks/04 Networks\|04 Networks]]
>
> **Pages**
> - [[Software Engineering/04 Networks/Architecture & Ops/Peer-2-Peer\|Peer-2-Peer]]
<!-- whats-next:end -->
