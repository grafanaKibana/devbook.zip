---
publish: true
created: 2026-07-16T08:23:58.731Z
modified: 2026-07-18T11:59:15.666Z
published: 2026-07-18T11:59:15.666Z
topic:
  - Security
subtopic:
  - Security
summary: Filters traffic at host, network, and application boundaries to constrain reachable services and record denied paths.
level:
  - "3"
priority: High
status: Ready to Repeat
---

A firewall permits or denies traffic at a defined boundary. It reduces reachable attack surface and limits lateral movement; it does not authenticate users, repair a vulnerable service, or make an allowed connection trustworthy. The design question is therefore not “do we have a firewall?” but “which identity, protocol, direction, and zone transition is allowed at each boundary?”

# Where the Control Sits

| Control | Sees | Good fit | Blind spot |
| --- | --- | --- | --- |
| Host firewall | Local process, interface, address, port, and direction | Last boundary around one workload | Cannot fix authorization inside an allowed service |
| Network firewall or cloud security group | Source/destination address, protocol, port, and connection state | Segmenting subnets and limiting east-west traffic | Dynamic identities are awkward when policy is address-based |
| Proxy or WAF | Decrypted HTTP route, method, headers, and body patterns | Blocking known web attacks and enforcing request limits | Only sees traffic routed through it and can miss business-logic abuse |
| NGFW | Connection state plus application or threat signatures | Central inspection and intrusion prevention | Classification can fail on encrypted, novel, or tunneled traffic |

![[Assets/Security/Security-Firewall-18120000.jpg]]

Use layers. An Internet-facing reverse proxy may accept TLS on 443, a network policy may allow only the proxy identity to reach the API, and the API host may accept the application port only on its private interface. A direct request to the private API address is then denied even if DNS or routing information leaks.

# Rule and Inspection Models

**Stateless rules** evaluate each packet independently from tuples such as source, destination, protocol, and port. They are predictable and fast, but return traffic needs explicit policy and spoofed or fragmented traffic needs careful handling.

**Stateful inspection** records connection state. A reply can be allowed because it belongs to an established outbound connection rather than because every ephemeral destination is open. State tables consume memory and can be exhausted, so capacity and timeout policy are part of the security design.

**Application-aware inspection** parses a protocol or terminates a connection to enforce routes, methods, identities, or signatures. It adds useful context at the cost of protocol complexity, certificate/key handling, latency, and a larger trusted component.

![[Assets/Security/Security-Firewall-18120000-1.png]]

Start with default deny and add the narrowest rule that supports a named flow:

```text
allow orders-api -> payments-api tcp/8443 in workload-zone
deny  *          -> payments-api *        log=sampled
```

Specify direction and source/destination zones; “allow 8443” is incomplete. Give rules owners and expiry dates, test both the intended path and nearby denied paths, and alert on meaningful denial changes rather than logging every dropped Internet packet. For encrypted traffic, choose deliberately between metadata-only filtering, termination at a controlled proxy, and end-to-end encryption. A firewall that cannot decrypt TLS cannot validate the HTTP body; a firewall that terminates TLS now holds keys and sees sensitive data.

# References

- [ByteByteGo — Firewall Explained](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/firewall-explained-to-kids-and-adults.md) — the pinned source for firewall placement and inspection types.
- [ByteByteGo — Top 6 Firewall Use Cases](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-6-firewall-use-cases.md) — the pinned source for tuple, time, state, and application rule examples.
- [NIST SP 800-41 Rev. 1 — Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final) — firewall technology, policy, selection, configuration, testing, deployment, and management guidance.
- [NIST SP 800-207 — Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final) — why network location alone does not establish trust and access remains resource-specific.
