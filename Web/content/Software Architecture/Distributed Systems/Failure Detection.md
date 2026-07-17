---
publish: true
created: 2026-07-16T14:07:22.084Z
modified: 2026-07-16T17:34:24.398Z
published: 2026-07-16T17:34:24.398Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Failure detectors turn missing or delayed observations into suspicion; recovery requires thresholds, ownership, and fencing.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

In an asynchronous network, a timeout cannot distinguish a crashed node from a slow node, a paused process, or a partition. A failure detector produces suspicion from observations. The system then decides whether suspicion is strong enough to stop routing, replace ownership, or page an operator.

## Observation and Decision Are Separate

Push heartbeats make nodes report liveness to observers. Pull probes make observers poll nodes. Gossip protocols spread direct and indirect probe results without every node polling every other node. Direction changes traffic shape and failure visibility; it does not make a timeout certain.

A fixed threshold might suspect a node after three missed 5-second heartbeats. A phi-accrual detector instead reports how surprising the current delay is relative to recent arrival intervals. Raise the threshold to reduce false positives at the cost of slower detection.

```text
observed: healthy -> suspected -> confirmed-unavailable -> recovering
owner:    node-7  -> unchanged -> node-9/fence-204 -> node-9
```

Do not transfer ownership on the first failed health check. Confirm through multiple observers or the coordination system, then fence the previous owner before a replacement writes. A health endpoint must also say what it measures: process loop, dependency reachability, ability to serve reads, or ability to accept writes.

## Failure Domains and Recovery

Probe from outside the failure domain being tested. A node checking itself cannot detect a rack or zone partition. Monitor dependency and quorum health separately from application liveness. Quorum is a condition for making a safe decision, not another heartbeat detector.

False positives are part of the budget. Record detection latency, suspicion reversals, failover success, and the time until capacity is restored. Test packet loss, long garbage-collection pauses, asymmetric partitions, and flapping nodes.

The source visual remains rejected because it claims pull heartbeat reduces traffic without a polling comparison and conflates quorum decisions with heartbeat detection.

## References

- [SWIM failure detector](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf) — primary protocol for scalable probing, suspicion, and gossip membership dissemination.
- [The phi accrual failure detector](https://www.researchgate.net/publication/29682135_The_Phi_accrual_failure_detector) — primary adaptive suspicion model based on heartbeat arrival distributions.
- [ByteByteGo: detecting node failures](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-detect-node-failures-in-distributed-systems.md) — provenance for the heartbeat inventory; its visual is rejected for category and traffic claims.
