---
publish: true
created: 2026-08-20T20:41:15.679Z
modified: 2026-08-25T13:45:27.885Z
published: 2026-08-25T13:45:27.885Z
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

High availability means a service continues to satisfy a defined contract despite expected failures. It is measured through an SLO such as successful checkout requests over valid checkout attempts. This differs from CAP availability, which asks whether every request receives a non-error response during a network partition.

# Derive Redundancy from the SLO

`99.95%` monthly availability permits about 21.6 minutes of unavailability in a 30-day month. Spend that budget across application instances, data stores, identity, DNS, networks, and operators. Two application replicas in one zone do not survive a zone failure or a shared database outage.

Place redundant capacity across the failure domains the service must tolerate. Health detection removes unhealthy endpoints, failover transfers ownership, and fencing stops the old owner. The remaining capacity must absorb the load. Test the entire sequence, including a failover that stalls halfway through.

![[Assets/Software Architecture/Software Architecture-High Availability-18120000.jpg|theme-aware]]

The visual is a vocabulary aid, not a correctness guarantee. A “backup” must be promoted before writes, a read replica may lag, and active-active writers require conflict or ownership rules. Shared dependencies can defeat every pictured topology.

# Recovery and Degradation

RTO bounds how long restoration may take. RPO bounds acceptable data loss measured in time or committed operations. Synchronous replication can lower RPO while increasing write latency and reducing write availability when quorum is unavailable. Asynchronous replication improves locality and write tolerance but permits loss or stale reads during failover.

Graceful degradation preserves a smaller contract: accept orders while recommendations are unavailable, serve a cached catalog while writes are paused, or queue non-urgent work. Never degrade an invariant such as charging without an idempotency fence.

Run load tests at failover capacity and inject the failures the design claims to survive. Backups count only after restore tests prove the RTO and RPO.

# References

- [Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [AWS Well-Architected reliability pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
