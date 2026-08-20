---
publish: true
created: 2026-08-20T20:41:15.630Z
modified: 2026-08-20T20:41:15.630Z
published: 2026-08-20T20:41:15.630Z
topic:
  - Networks
subtopic:
  - Protocols
summary: The internet's distributed directory mapping hostnames to records like IP addresses.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

DNS (Domain Name System) maps names to typed records in a distributed hierarchy. Before opening a transport connection, an application usually resolves a name through local caches, static host mappings, and a recursive resolver.

Most lookups end in a cache. A miss can send the recursive resolver through referrals from a root server to a TLD server and finally to the zone's authoritative server.

```mermaid
sequenceDiagram
  participant Client
  participant Resolver as Recursive Resolver
  participant Root as Root Server
  participant TLD as .com TLD Server
  participant Auth as Authoritative Server

  Client->>Resolver: Query api.example.com
  Resolver->>Root: Where are .com zones?
  Root->>Resolver: TLD server address
  Resolver->>TLD: Where is example.com?
  TLD->>Resolver: Authoritative server address
  Resolver->>Auth: What is api.example.com?
  Auth->>Resolver: 203.0.113.42 (TTL 300)
  Resolver->>Client: 203.0.113.42
```

When a name is a CNAME, the resolver follows the alias chain toward the requested terminal record, bounded by loop and implementation limits. NXDOMAIN and NODATA answers can also be cached for SOA-derived intervals, so creating a missing name does not become visible everywhere at once.

![[Assets/Networks/Networks-DNS-18120000-1.png]]

# Resolution and Transport

Classic DNS often uses UDP for ordinary queries, but TCP is a full protocol transport rather than an optional afterthought. General-purpose implementations must support it. Resolvers use it for truncated responses (`TC=1`), and zone transfers use it as well. Encrypted resolver protocols have separate mappings: DoT runs DNS over TLS, while DoH carries DNS messages over HTTPS.

| Type | Lookup direction | Payload | Example |
|---|---|---|---|
| `A` | Name → address | IPv4 | `api.example.com → 203.0.113.42` |
| `AAAA` | Name → address | IPv6 | `api.example.com → 2001:db8::1` |
| `CNAME` | Alias → target | Name | `www.example.com → example.com` |
| `MX` | Mail domain → exchanger | Hostnames with preference | `example.com → 10 mail.example.com` |
| `TXT` | Name → text values | One or more strings | SPF, DKIM selectors, verification |
| `NS` | Zone → nameserver | Hostname | Delegates `example.com` |
| `SOA` | Zone metadata | Serial, refresh, retry timers | Drives negative TTL behavior |
| `PTR` | Reversed name → host | Domain name | `42.113.0.203.in-addr.arpa → api.example.com` |
| `SRV` | Service locator | Target, port, priority | `_sip._tcp.example.com → 10 5 5060 sip1.example.com` |

![[Assets/Networks/Networks-DNS-18120000.png]]

# Cache Windows, Failover, and Traffic Steering

DNS operations are cache operations. An authoritative change is only the beginning: recursive resolvers, operating systems, browsers, and applications may continue using the previous answer until its TTL expires. A safe migration controls the cache window before changing the destination and keeps the old destination healthy while stale answers remain possible.

Suppose `api.example.com` has a TTL of 86,400 seconds and must move from `203.0.113.10` to `203.0.113.20`:

1. Lower the TTL to 300 seconds while the old address is still authoritative.
2. Wait at least 86,400 seconds: one complete old-TTL window. A resolver that cached the old record immediately before the reduction can legally keep it for that long.
3. Verify the reduced TTL through several recursive resolvers with `dig @resolver api.example.com A`.
4. Change the address and keep both old and new endpoints able to serve traffic for the expected stale-answer window.
5. Monitor traffic, errors, certificate coverage, and dependencies from both destinations.
6. Raise the TTL only after rollback is no longer likely.

Negative answers have their own SOA-derived cache lifetime. Creating a previously missing name can remain invisible until cached NXDOMAIN or NODATA answers expire.

Traffic-steering mechanisms have different boundaries:

| Mechanism | What changes | Boundary to remember |
|---|---|---|
| Multiple A/AAAA records | Returns several addresses | Clients choose and cache differently. This is not health-aware by itself |
| Weighted answer | Returns destinations in configured proportions | Resolver caching and client concentration make percentages approximate |
| Geographic or latency policy | Chooses an answer from resolver or client-network signals | Resolver location may not equal user location. EDNS Client Subnet has privacy and cache costs |
| Health-aware failover | Stops returning a failed endpoint | Existing caches still contain the failed answer until TTL expiry |
| Anycast | BGP advertises one address from many sites | Routing selects the site. DNS still returns the same address |

Short TTLs speed answer changes but increase authoritative and recursive query load. Long TTLs improve cache efficiency but extend rollback and failover windows. Pick the TTL from the recovery contract, not a universal number.

## Diagnostic Sequence

```bash
dig api.example.com A
dig @1.1.1.1 api.example.com A
dig +trace api.example.com
dig example.com SOA
dig +dnssec api.example.com A
dig -x 203.0.113.20
```

Compare the local answer with a known recursive resolver, then use `+trace` to inspect delegation and authoritative data. Check the returned TTL, CNAME chain, authoritative nameservers, and SOA serial before blaming application networking. A correct authoritative answer with a stale recursive answer is a cache-window problem. Different authoritative answers usually indicate incomplete zone publication or split-horizon policy.

# DNS Security and Encrypted Transport

DNS security has two different channels. DNSSEC authenticates signed record sets so a validating resolver can detect forged or modified DNS data. DNS-over-TLS (DoT) and DNS-over-HTTPS (DoH) encrypt the connection between a client and its recursive resolver. Neither control provides the other's guarantee.

## DNSSEC Data Authentication

An authoritative zone signs record sets with a zone-signing key. The resolver obtains the corresponding DNSKEY record and validates a chain of DS delegations from a configured trust anchor, normally the DNS root. A valid signature proves that the signed answer came from the key owner and was not changed. It does not hide the queried name or make the returned service trustworthy.

```text
root trust anchor
  -> DS for .com
  -> DNSKEY for .com
  -> DS for example.com
  -> DNSKEY for example.com
  -> RRSIG over api.example.com A
```

An authenticated denial response uses NSEC or NSEC3 records to prove that a requested name or type does not exist. Operators must rotate keys without breaking the DS/DNSKEY chain, monitor signature expiry, and verify positive and negative answers before a registrar or DNS-provider migration.

## Encrypted Resolver Transport

DoT carries DNS messages over TLS, conventionally on port 853. DoH carries DNS requests over HTTPS and can share port 443 with other web traffic. Both authenticate the configured resolver's TLS endpoint and protect the client-resolver hop from passive observation and on-path modification.

After that hop, the resolver still performs recursion and contacts authoritative infrastructure. DoT or DoH does not authenticate those answers, constrain what the resolver returns, or hide queries from the resolver. DNSSEC validation at the resolver or validating client authenticates signed data across those hops.

## Threat-to-control Map

| Threat | Primary control | Residual boundary |
|---|---|---|
| Blind forged UDP response | Query-ID/source-port entropy. DNSSEC validation | Unsigned zones cannot provide DNSSEC authenticity |
| On-path observation between client and resolver | DoT or DoH | The recursive resolver still sees the query |
| Malicious or compromised resolver returning a signed-zone forgery | DNSSEC validation | The resolver can still block, delay, or alter unsigned data |
| Stale but correctly signed answer | TTL and signature validity | DNSSEC authenticates data. It does not guarantee freshness beyond protocol validity |
| Domain points to a malicious service | TLS/application authentication and authorization | DNSSEC authenticates the DNS owner, not the service's business behavior |

# Pitfalls

- Long TTLs preserve stale answers longer than expected.
- CNAME at zone apex cannot coexist with other zone-root records.
- DNSSEC is not payload confidentiality.
- Encrypted resolver transport moves trust to the configured recursive resolver. It does not make that resolver invisible or infallible.

# References

- [Domain Names: Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034)
- [DNS Security Introduction and Requirements](https://www.rfc-editor.org/rfc/rfc4033)
- [DNS Queries over HTTPS](https://www.rfc-editor.org/rfc/rfc8484)
- [Route 53 routing policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)
