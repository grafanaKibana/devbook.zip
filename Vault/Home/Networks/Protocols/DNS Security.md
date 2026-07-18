---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Authenticating DNS data with DNSSEC and protecting client-resolver transport with DoT or DoH."
level:
  - "3"
priority: Medium
status: Creation
publish: false
---

# Intro

DNS security has two different channels. DNSSEC authenticates signed record sets so a validating resolver can detect forged or modified DNS data. DNS-over-TLS (DoT) and DNS-over-HTTPS (DoH) encrypt the connection between a client and its recursive resolver. Neither control provides the other's guarantee.

## DNSSEC Data Authentication

An authoritative zone signs record sets with a zone-signing key. The resolver obtains the corresponding DNSKEY record and validates a chain of DS delegations from a configured trust anchor, normally the DNS root. A valid signature proves that the signed answer came from the key owner and was not changed; it does not hide the queried name or make the returned service trustworthy.

```text
root trust anchor
  -> DS for .com
  -> DNSKEY for .com
  -> DS for example.com
  -> DNSKEY for example.com
  -> RRSIG over api.example.com A
```

An authenticated denial response uses NSEC or NSEC3 records to prove that a requested name or type does not exist. Operators must rotate keys without breaking the DS/DNSKEY chain, monitor signature expiry, and verify both positive and negative answers before a registrar or DNS-provider migration.

## Encrypted Resolver Transport

DoT carries DNS messages over TLS, conventionally on port 853. DoH carries DNS requests over HTTPS and can share port 443 with other web traffic. Both authenticate the configured resolver's TLS endpoint and protect the client-resolver hop from passive observation and on-path modification.

After that hop, the resolver still performs recursion and contacts authoritative infrastructure. DoT or DoH does not by itself authenticate those answers, constrain what the resolver returns, or hide queries from the resolver. DNSSEC validation at the resolver or validating client authenticates signed data across those hops.

## Threat-to-Control Map

| Threat | Primary control | Residual boundary |
| --- | --- | --- |
| Blind forged UDP response | Query-ID/source-port entropy; DNSSEC validation | Unsigned zones cannot provide DNSSEC authenticity |
| On-path observation between client and resolver | DoT or DoH | The recursive resolver still sees the query |
| Malicious or compromised resolver returning signed-zone forgery | DNSSEC validation | Resolver can still block, delay, or alter unsigned data |
| Stale but correctly signed answer | TTL and signature validity | DNSSEC authenticates the data; it does not guarantee freshness beyond protocol validity |
| Domain points to a malicious service | TLS/application authentication and authorization | DNSSEC authenticates the DNS owner, not the service's business behavior |

## References

- [DNS Security Introduction and Requirements (RFC 4033)](https://www.rfc-editor.org/rfc/rfc4033) — defines DNSSEC's authenticity and integrity guarantees and its explicit non-goals.
- [DNS over TLS (RFC 7858)](https://www.rfc-editor.org/rfc/rfc7858) — specifies TLS transport between a DNS client and server.
- [DNS Queries over HTTPS (RFC 8484)](https://www.rfc-editor.org/rfc/rfc8484) — defines DoH request and response mapping over HTTP.
