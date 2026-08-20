---
publish: true
created: 2026-08-20T20:41:15.509Z
modified: 2026-08-20T20:41:15.509Z
published: 2026-08-20T20:41:15.509Z
topic:
  - Cloud
subtopic: []
summary: Turning RPO and RTO targets into recoverable data, compatible application state, and tested user flows.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Disaster recovery (DR) is the tested ability to restore a business flow after severe failure, data corruption, or regional loss. The target comes before the topology. If checkout may lose at most 10 minutes of accepted orders and must return within 45 minutes, its recovery point objective is 10 minutes and its recovery time objective is 45 minutes.

# Recovery Objectives

- **Recovery point objective (RPO)** is the maximum acceptable data loss measured in time. Every authoritative state store on the critical flow must be restorable or replayable to within that window. Disposable state needs a bounded rebuild path, while external systems need recovery and data-loss contracts compatible with the flow.
- **Recovery time objective (RTO)** is the maximum acceptable interruption before the flow returns to its defined service level. Provisioning, restore, validation, traffic changes, and dependency recovery all consume it.

Define both per user flow. An API process can be running while identity, encryption keys, a database, a queue backlog, or a payment provider remains unavailable. The flow is still down.

# Mechanisms Solve Different Failures

| Mechanism | What it provides | What it does not prove |
| --- | --- | --- |
| Backup | A separate recoverable copy with retention or point-in-time history | That restore completes within RTO |
| Replica | A current or near-current serving copy | Protection from corruption or deletion replicated from the primary |
| Failover | A switch to another serving environment | That dependencies and data are consistent after the switch |
| Recovery exercise | Evidence that the complete flow can return | That the next architecture or schema change preserves recovery |

A sound design usually combines them. Replicas shorten interruption, backups retain earlier clean states, failover moves traffic, and exercises test the complete path.

# Recovery Strategy Tradeoffs

| Strategy | Architecture | Best fit | Main cost or risk |
| --- | --- | --- | --- |
| Backup and restore | Recreate the stack and restore a clean copy after failure | Flows that tolerate a longer RTO | Restore time grows with data and provisioning work |
| Pilot light | Keep data and a minimal core ready in another location | Moderate RTO without a full standby | Dormant components and scale-up paths can fail when first needed |
| Warm standby | Keep a smaller functional copy running | Short RTO for critical flows | Continuous cost and unproven scale-up capacity |
| Active-active or hot standby | Keep production-capable capacity and current data in multiple locations | The shortest justified RTO | Conflict handling, coordinated change, wider failure propagation, and highest steady cost |

Use the least complex strategy that meets the business target. Multi-region architecture is not automatically safer: a destructive deployment, invalid migration, or corrupted write can reach every region.

# Application Design for Recovery

- **Make side effects idempotent.** Queue replay, client retry, and failover can repeat accepted work.
- **Preserve schema compatibility.** A standby or restored dataset may run against a different application version during recovery or failback.
- **Separate recoverable state from disposable state.** Caches can be rebuilt; orders and identity records cannot. This distinction changes backup and validation work.
- **Externalize environment-specific configuration.** Region names, endpoints, credentials, and feature flags must not require a code rewrite during recovery.
- **Include every critical dependency.** Identity, keys, DNS, queues, object storage, third-party APIs, and deployment artifacts can block the user flow even when the main database is healthy.
- **Define degraded behavior.** A read-only mode, queued write, or disabled optional feature may restore useful service before the entire topology returns.

# Proving Recovery

Test the user flow, not only infrastructure health. A useful exercise records the restored data timestamp, actual RPO and RTO, duplicate or missing side effects, manual interventions, capacity gaps, and failed assumptions. Repeat after material changes to data volume, schema, identity, topology, or deployment automation.

# References

- [NIST SP 800-34 Rev. 1: Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/final)
- [AWS Well-Architected: Use defined recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html)
