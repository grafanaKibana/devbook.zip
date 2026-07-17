---
publish: true
created: 2026-07-16T16:57:20.359Z
modified: 2026-07-16T16:57:20.360Z
published: 2026-07-16T16:57:20.360Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Selecting a message broker from delivery, replay, routing, ordering, and operating constraints.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

Broker selection starts with workload semantics, not popularity. A work queue, a retained event log, and a Windows-integrated enterprise queue place different demands on routing, replay, ordering, and operations. [[Message Queues]] explains the common mechanism; this note owns the choice.

## Comparison

| Need | [[RabbitMQ]] | [[Kafka]] | [[MSMQ]] |
| --- | --- | --- | --- |
| Work distribution | Strong fit with acknowledgements and flexible exchanges | Possible through consumer groups, but retention/log semantics dominate | Strong fit for Windows-local and legacy enterprise workflows |
| Replay | Limited unless messages are republished or retained through another design | Native offset-based replay within retention | Not a retained event-log model |
| Routing | Exchanges, bindings, topics, headers | Topic and partition selection | Queue-oriented Windows integration |
| Ordering | Per queue, affected by redelivery and competing consumers | Per partition | Per queue under constrained delivery patterns |
| Operations | Queue depth, unacked messages, redelivery, node health | Partitions, replication, group rebalances, lag, retention | Windows administration and legacy platform constraints |

## Decision examples

Use RabbitMQ for `GenerateInvoice` jobs that need acknowledgements, delay/retry topology, and routing by tenant. Use Kafka for `OrderPlaced` events consumed by billing, fraud, analytics, and replayable projections. Keep MSMQ when an existing Windows estate depends on its transactional integration and migration cost exceeds current value; do not choose it for a new cross-platform system.

Cloud services such as Azure Service Bus, Amazon SQS/SNS, and Google Pub/Sub are often better when the team wants managed operations. Compare their concrete ordering, deduplication, dead-letter, maximum-size, retention, and throughput contracts rather than assuming the same semantics as an open-source broker.

## References

- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability) — official acknowledgements, confirms, redelivery, and failure behavior.
- [Apache Kafka design](https://kafka.apache.org/documentation/#design) — official retained-log, partition, ordering, and consumer-group design.
- [MSMQ documentation](https://learn.microsoft.com/previous-versions/windows/desktop/msmq/ms711472\(v=vs.85\)) — official Windows Message Queuing model and feature set.
- [Azure messaging comparison](https://learn.microsoft.com/azure/service-bus-messaging/compare-messaging-services) — official comparison of Service Bus, Event Hubs, and Event Grid.
