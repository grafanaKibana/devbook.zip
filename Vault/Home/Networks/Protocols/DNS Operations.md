---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Operating DNS changes safely through TTL windows, traffic steering, and resolver-aware diagnostics."
level:
  - "3"
priority: Medium
status: Creation
publish: false
---

# Intro

DNS operations are cache operations. An authoritative change is only the beginning: recursive resolvers, operating systems, browsers, and applications may continue using the previous answer until its TTL expires. A safe migration therefore controls the cache window before it changes the destination, and it keeps the old destination healthy while stale answers remain possible.

## Migration Runbook

Suppose `api.example.com` has a TTL of 86,400 seconds and must move from `203.0.113.10` to `203.0.113.20`:

1. Lower the TTL to 300 seconds while the old address is still authoritative.
2. Wait at least 86,400 seconds: one complete **old-TTL window**. A resolver that cached the old record immediately before the TTL reduction can legally keep it for that long.
3. Verify the reduced TTL through several recursive resolvers with `dig @resolver api.example.com A`.
4. Change the address and keep both old and new endpoints able to serve traffic for the expected stale-answer window.
5. Monitor traffic, errors, certificate coverage, and dependencies from both destinations.
6. Raise the TTL only after rollback is no longer likely.

Negative answers have their own SOA-derived cache lifetime. Creating a previously missing name can therefore remain invisible until cached NXDOMAIN or NODATA answers expire.

## Traffic Steering

| Mechanism | What changes | Boundary to remember |
| --- | --- | --- |
| Multiple A/AAAA records | Returns several addresses | Clients choose and cache differently; this is not health-aware by itself |
| Weighted answer | Returns destinations in configured proportions | Resolver caching and client concentration make percentages approximate |
| Geographic or latency policy | Chooses an answer from resolver or client-network signals | Resolver location may not equal user location; EDNS Client Subnet has privacy and cache costs |
| Health-aware failover | Stops returning a failed endpoint | Existing caches still contain the failed answer until TTL expiry |
| Anycast | BGP advertises one address from many sites | Routing selects the site; DNS still returns the same address |

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

Compare the local answer with a known recursive resolver, then use `+trace` to inspect delegation and authoritative data. Check the returned TTL, CNAME chain, authoritative nameservers, and SOA serial before blaming application networking. A correct authoritative answer with a stale recursive answer is a cache-window problem; different authoritative answers usually indicate incomplete zone publication or split-horizon policy.

## References

- [DNS concepts and facilities (RFC 1034)](https://www.rfc-editor.org/rfc/rfc1034) — defines caching, referrals, recursive service, and TTL behavior.
- [Negative caching (RFC 2308)](https://www.rfc-editor.org/rfc/rfc2308) — specifies how NXDOMAIN and NODATA answers derive cache lifetime from SOA data.
- [Route 53 routing policies](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html) — concrete weighted, latency, geolocation, failover, and multivalue answer policies with their operating boundaries.
