---
publish: true
created: 2026-07-18T14:02:44.152Z
modified: 2026-07-18T14:02:44.153Z
published: 2026-07-18T14:02:44.153Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: High availability starts with a measured SLO and removes shared failure domains through tested detection, failover, and degradation.
level:
  - "4"
priority: High
status: Ready to Repeat
---

High availability is the probability that a service satisfies its contract when requested. It is measured through an SLO such as successful checkout requests over valid checkout attempts. It is not CAP availability, which describes whether every request receives a non-error response during a network partition.

# Derive Redundancy from the SLO

`99.95%` monthly availability permits about 21.6 minutes of unavailability in a 30-day month. Spend that budget across application instances, data stores, identity, DNS, networks, and operators. Two application replicas in one zone do not survive a zone failure or a shared database outage.

Place redundant capacity across the failure domains the service must tolerate. Health detection removes unhealthy endpoints; failover transfers ownership; fencing stops the old owner; capacity headroom absorbs the surviving load. Test the entire sequence, including failed failover.

![[Assets/Software Architecture/Software Architecture-High Availability-18120000.jpg]]

The visual is a vocabulary aid, not a correctness guarantee. A “backup” must be promoted before writes, a read replica may lag, and active-active writers require conflict or ownership rules. Shared dependencies can defeat every pictured topology.

# Recovery and Degradation

RTO bounds how long restoration may take. RPO bounds acceptable data loss measured in time or committed operations. Synchronous replication can lower RPO while increasing write latency and reducing write availability when quorum is unavailable. Asynchronous replication improves locality and write tolerance but permits loss or stale reads during failover.

Graceful degradation preserves a smaller contract: accept orders while recommendations are unavailable, serve a cached catalog while writes are paused, or queue non-urgent work. Never degrade an invariant such as charging without an idempotency fence.

Run load tests at failover capacity and inject dependency latency, zone loss, credential failure, and operator mistakes. Backups count only after restore tests prove the RTO and RPO.

# References

- [Google SRE workbook: implementing SLOs](https://sre.google/workbook/implementing-slos/) — practitioner method for defining service-level indicators, objectives, and error budgets.
- [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/final) — authoritative contingency-planning guidance for recovery objectives, alternate processing, testing, and restoration.
- [AWS reliability pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html) — official failure-domain, recovery, change-management, and capacity guidance.
- [ByteByteGo: design for high availability](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-for-high-availability.md) — provenance for the primary/secondary topology comparison, used with explicit caveats.
