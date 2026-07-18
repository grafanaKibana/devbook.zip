---
publish: true
created: 2026-07-16T07:10:34.939Z
modified: 2026-07-18T11:59:15.653Z
published: 2026-07-18T11:59:15.653Z
topic:
  - Cloud
subtopic: []
level:
  - "2"
priority: High
status: Ready to Repeat
---

Disaster recovery (DR) is the tested ability to restore a business flow after a severe failure, corruption event, or regional outage. Start with the business limit, not a topology. If checkout may lose at most 10 minutes of accepted orders and must return within 45 minutes, its recovery point objective is 10 minutes and its recovery time objective is 45 minutes. Those targets determine replication, backup frequency, standby capacity, automation, and cost.

# Recovery Objectives

- **Recovery point objective (RPO)** is the maximum acceptable data loss measured in time. A 10-minute RPO requires a recoverable copy no more than 10 minutes behind the protected flow, including its dependencies.
- **Recovery time objective (RTO)** is the maximum acceptable interruption before the flow is restored to its defined service level. Provisioning, data recovery, validation, DNS or traffic changes, and operator decisions all consume that window.

Define both per user flow. An API can recover while its identity provider, queue backlog, encryption keys, or database remains unavailable; the business flow is still down.

# Backup, Replica, Failover, and Recovery

These mechanisms solve different failures:

| Mechanism | What it provides | What it does not prove |
| --- | --- | --- |
| Backup | A separate recoverable copy, often with retention and point-in-time history | That the copy can be restored within RTO |
| Replica | A current or near-current serving copy | Protection from corruption or deletion replicated from the primary |
| Failover | A controlled switch to another serving environment | That application dependencies and data are consistent after the switch |
| Recovery test | Evidence that people, automation, data, and dependencies restore the flow | Future success after the architecture or runbook changes |

A sound design usually combines them: replicas reduce outage duration, backups preserve earlier clean states, failover moves traffic, and exercises prove the whole path.

# Strategy Traces

![[Assets/Cloud/Cloud-Disaster Recovery-18120000.png]]

## Backup and Restore

1. The primary region becomes unavailable or data is corrupted.
2. Operators provision the recovery stack from versioned infrastructure definitions.
3. They restore the newest clean backup that satisfies the RPO, replay any durable log if available, validate invariants, then open traffic.

This has the lowest idle infrastructure cost and usually the longest RTO. It fits flows that tolerate hours of recovery, provided restore time is measured against realistic data volume.

## Pilot Light

1. Data and a minimal set of core services remain ready in the recovery region.
2. A disaster declaration starts the missing compute, networking, and application layers.
3. Operators validate dependencies and capacity, then move traffic.

Pilot light shortens provisioning compared with pure restore, but the dormant layers can still fail to start or lack regional capacity. Test the full scale-up path.

## Warm Standby

1. A reduced but functional copy serves health checks or a small safe workload.
2. Replication keeps its data within the RPO.
3. On failure, the standby scales to production capacity and traffic shifts after validation.

Warm standby buys a shorter RTO with continuous infrastructure cost. Its real limit is the time to scale and drain backlogs, not merely the time to change DNS.

## Multi-Site Active-Active or Hot Standby

1. Multiple sites already have production-capable infrastructure and current data.
2. Health automation removes the failed site and surviving sites absorb traffic.
3. Operators check consistency, capacity, and downstream dependencies before declaring recovery complete.

This can produce the shortest RTO, but it adds data-consistency, conflict-resolution, deployment, observability, and cost complexity. It does not protect against a bad deployment or destructive write sent to every site.

# Proving Recovery

A DR plan needs named owners, activation criteria, dependency order, credentials, communication paths, validation queries, rollback or failback steps, and a record of the last exercise. Test distinct failure classes: regional loss, accidental deletion, corrupted data, lost credentials, and an unavailable downstream provider.

Measure the exercise from incident declaration to verified business flow. Record the restored data timestamp, actual RPO and RTO, manual interventions, capacity gaps, and any assumption that failed. A successful failover with unrecoverable or inconsistent data is not a successful recovery.

# References

- [NIST SP 800-34 Rev. 1 — Contingency Planning Guide](https://csrc.nist.gov/pubs/sp/800/34/r1/final) — primary guidance for business impact analysis, recovery strategies, plan development, testing, and maintenance.
- [AWS Well-Architected — Use defined recovery strategies](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_planning_for_recovery_disaster_recovery.html) — defines backup/restore, pilot light, warm standby, and multi-site approaches with their recovery tradeoffs.
- [Azure Reliability — Business continuity, high availability, and disaster recovery](https://learn.microsoft.com/en-us/azure/reliability/concept-business-continuity-high-availability-disaster-recovery) — defines RTO/RPO and separates day-to-day availability from disaster recovery.
- [Azure Well-Architected — Develop a disaster recovery plan](https://learn.microsoft.com/en-us/azure/well-architected/design-guides/disaster-recovery) — current guidance for criticality, runbooks, multi-region dependencies, exercises, and failback.
- [System Design 101 — Cloud Disaster Recovery Strategies](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cloud-disaster-recovery-strategies.md) — visual comparison of the four common recovery postures, used here without treating its example times as guarantees.
