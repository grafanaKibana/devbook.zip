---
topic:
  - Security
subtopic:
  - Security
summary: "Filters traffic at host, network, and application boundaries to constrain reachable services and record denied paths."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

A firewall permits or denies traffic at a defined boundary. It constrains which services can communicate and supplies evidence about rejected paths. It does not authenticate an application user, repair a vulnerable service, or make an allowed connection trustworthy. The useful question is which source, destination, protocol, direction, and zone transition a named workload requires.

# Where the Control Sits

| Control | Sees | Good fit | Blind spot |
| --- | --- | --- | --- |
| Host firewall | Local process, interface, address, port, and direction | Last boundary around one workload | Cannot fix authorization inside an allowed service |
| Network firewall or cloud security group | Source/destination address, protocol, port, and connection state | Segmenting subnets and limiting east-west traffic | Dynamic identities are awkward when policy is address-based |
| Proxy or WAF | Decrypted HTTP route, method, headers, and body patterns | Blocking known web attacks and enforcing request limits | Only sees traffic routed through it and can miss business-logic abuse |
| NGFW | Connection state plus application or threat signatures | Central inspection and intrusion prevention | Classification can fail on encrypted, novel, or tunneled traffic |

![[Security/Security-Firewall-18120000.jpg|theme-aware]]

Layer the boundaries around the intended flow. An Internet-facing reverse proxy may accept TLS on 443, a network policy may allow only the proxy identity to reach the API, and the API host may accept the application port only on its private interface. A direct request to the private API address is then denied even if DNS or routing information leaks. Egress rules matter as well: a compromised workload should not gain unrestricted access to internal control planes or arbitrary Internet destinations.

# Rule and Inspection Models

**Stateless rules** evaluate each packet independently from tuples such as source, destination, protocol, and port. They are predictable and fast, but return traffic needs explicit policy and spoofed or fragmented traffic needs careful handling.

**Stateful inspection** records connection state. A reply can be allowed because it belongs to an established outbound connection rather than because every ephemeral destination is open. State tables consume memory and can be exhausted, so capacity and timeout policy are part of the security design.

**Application-aware inspection** parses a protocol or terminates a connection to enforce routes, methods, identities, or signatures. It adds useful context at the cost of protocol complexity, certificate/key handling, latency, and a larger trusted component.

![[Security/Security-Firewall-18120000-1.png|theme-aware]]

Start with default deny and add the narrowest rule that supports a named flow:

```text
allow orders-api -> payments-api tcp/8443 in workload-zone
deny  *          -> payments-api *        log=sampled
```

Specify direction and source/destination zones. “allow 8443” is incomplete. Give rules owners and expiry dates, test both the intended path and nearby denied paths, and alert on meaningful denial changes rather than logging every dropped Internet packet. For encrypted traffic, choose deliberately between metadata-only filtering, termination at a controlled proxy, and end-to-end encryption. A firewall that cannot decrypt TLS cannot validate the HTTP body. A firewall that terminates TLS now holds keys and sees sensitive data.

Address translation is not an access-control policy. NAT can hide internal addresses or map endpoints, but only explicit filtering determines which traffic is allowed. Likewise, a zero-trust design does not remove firewalls. It stops treating network location as sufficient authority and combines segmentation with identity- and resource-specific decisions.

# References

- [NIST SP 800-41 Rev. 1: Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final)
- [NIST SP 800-207: Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final)
