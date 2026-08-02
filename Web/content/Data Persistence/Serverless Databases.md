---
publish: true
created: 2026-07-18T14:02:44.068Z
modified: 2026-07-18T14:02:44.069Z
published: 2026-07-18T14:02:44.069Z
topic:
  - Data Persistence
subtopic: []
summary: How managed databases autoscale compute while preserving engine, connection, storage, and failover constraints.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

This note uses **serverless database** in the narrower managed relational sense represented by Aurora Serverless v2 and Azure SQL Database serverless: compute capacity adjusts within configured bounds while the service preserves a SQL engine and separately managed storage. The broader label also covers products with different architectures, including request-billed document and key-value databases; their partitioning, consistency, transaction, and scaling contracts must be evaluated separately. "Serverless" removes some capacity provisioning from the application team; it does not remove servers, schema design, query plans, connections, transactions, backups, or service limits.

Use it for variable or intermittent demand when idle capacity would dominate the bill. Prefer provisioned capacity for a steady high baseline, latency-sensitive traffic that cannot absorb scale or resume delay, or a workload whose connection and memory working set must remain warm.

# What Actually Scales

Aurora Serverless v2 scales each serverless DB instance inside a cluster's minimum and maximum Aurora Capacity Unit range while Aurora's distributed storage remains separate. Supported engine versions can use a minimum of `0` ACUs and auto-pause after an idle interval; other versions have a nonzero floor. A cluster may mix provisioned and serverless instances, so the topology and failover policy still matter independently of compute scaling.

Azure SQL Database serverless similarly scales compute between configured minimum and maximum vCores. In the General Purpose tier it can auto-pause after an inactivity delay and resume on the next login or activity; storage continues to be billed while paused. Features such as active geo-replication prevent auto-pause even though autoscaling remains available.

| Boundary | Aurora Serverless v2 | Azure SQL Database serverless |
| --- | --- | --- |
| Scaling unit | ACUs per serverless DB instance | vCores and proportional memory per database |
| Warm floor | Configured minimum; `0` only on supported versions | Configured minimum vCores |
| Scale to zero | Auto-pause when minimum is `0` and no blocking activity remains | General Purpose can auto-pause after the configured idle delay |
| Storage while paused | Cluster storage and other non-instance charges continue | Storage continues; compute charge becomes zero |
| SQL semantics | Aurora MySQL- or PostgreSQL-compatible engine | SQL Database engine |
| Availability | Reader topology and promotion tiers determine failover behavior | Service tier, replicas, zone redundancy, and failover groups determine behavior |

These products preserve their database engine's transaction model. The dangerous limit is operational: a transaction can hold locks and connections while capacity changes, a burst can exceed the configured maximum, and long-lived sessions can prevent pause. Autoscaling does not turn an unindexed query or hot row into a scalable design.

# Request and Connection Example

An internal reporting service receives traffic for ten minutes each morning and is almost idle for the rest of the day. A serverless database with a small warm floor can absorb the morning burst without paying for peak compute all day. If scale-to-zero is enabled, the first connection after a pause can wait for resume; the request needs a timeout and retry policy that permits that delay.

Now put the same database behind 500 functions. If each function opens ten direct connections, a burst can attempt 5,000 sessions before compute has caught up. The repair is bounded client concurrency plus a shared managed proxy or pooler, not a higher autoscaling ceiling alone. Keep transactions short and retry only errors the engine declares transient; replaying an unqualified payment write after a timeout can duplicate the business operation.

# Pricing and Failure Boundaries

Serverless pricing usually combines variable compute with separately billed storage, I/O, backups, replicas, and network transfer. A minimum capacity is a recurring floor. Scale-to-zero trades that floor for resume latency and eligibility constraints. For a steady workload, the per-unit provisioned rate can be lower, so compare a measured month rather than assuming serverless is cheaper.

Failover is not the same operation as scaling. Scaling changes capacity on an instance; failover promotes or reconnects to another instance or replica after a fault. Test connection recovery, DNS/endpoint behavior, transaction outcome ambiguity, and the time needed to regain the working set. An automatically scaled single failure domain is still a single failure domain.

# Selection Rule

Choose a serverless database when all of these are true:

- demand varies enough that a provisioned peak wastes material capacity;
- the minimum/maximum range covers the measured working set and burst;
- clients tolerate scaling or resume behavior through bounded queues, pooling, deadlines, and safe retries;
- engine, transaction, replication, backup, and regional limits still meet the design;
- the full bill is lower after storage, I/O, replicas, proxies, and the minimum floor are included.

If only the first condition is true, the architecture is betting correctness and latency on a pricing label.

# References

- [How Aurora Serverless v2 works](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html) — official compute, storage, cluster, capacity-range, and mixed-instance model.
- [Aurora Serverless v2 auto-pause and resume](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html) — documents zero-ACU eligibility, open-connection constraints, billing, resume behavior, and promotion-tier interactions.
- [Azure SQL Database serverless compute tier](https://learn.microsoft.com/en-us/azure/azure-sql/database/serverless-tier-overview) — official vCore range, auto-pause, billing, feature exclusions, and resume triggers.
- [What is Serverless DB? (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-is-serverless-db.md) — editorial Aurora overview; its undated diagram is intentionally excluded because v1 and v2 pause and capacity behavior differ.
