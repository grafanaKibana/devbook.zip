---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Selecting a message broker from delivery, replay, routing, ordering, and operating constraints."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Broker selection starts with workload semantics, not popularity. A work queue, a retained event log, and a Windows-integrated enterprise queue place different demands on routing, replay, ordering, and operations. [[Message Queues]] explains the common mechanism; this note owns the choice.

## Comparison

| Need | [[RabbitMQ]] classic/quorum queues | [[Kafka]] | [[MSMQ]] |
| --- | --- | --- | --- |
| Work distribution | Strong fit with acknowledgements and flexible exchanges | Possible through consumer groups, but retention/log semantics dominate | Strong fit for Windows-local and legacy enterprise workflows |
| Replay | Consumed messages are normally removed; replay needs republishing or a separate retained design | Native offset-based replay within retention | Not a retained event-log model |
| Routing | Exchanges, bindings, topics, headers | Topic and partition selection | Queue-oriented Windows integration |
| Ordering | Per queue, affected by redelivery and competing consumers | Per partition | Per queue under constrained delivery patterns |
| Operations | Queue depth, unacked messages, redelivery, node health | Partitions, replication, group rebalances, lag, retention | Windows administration and legacy platform constraints |

### RabbitMQ Streams changes the comparison

RabbitMQ Streams adds a persistent replicated append-only log beside classic and quorum queues. It is a separate queue type with non-destructive consumers, so a consumer can attach at an earlier offset and replay records until age- or size-based retention removes their segments.

| Concern | RabbitMQ Streams | Kafka |
| --- | --- | --- |
| Replay and retention | Offset or timestamp replay; retention by age and/or total bytes | Offset replay; retention by time and/or size, with compaction available for keyed state |
| Ordering and scale | Ordered within one stream; a super stream partitions traffic and preserves order only within each partition | Ordered within a partition; topics scale through partitions |
| Operations | RabbitMQ cluster plus stream replicas, disk/page-cache capacity, retention, and consumer offset tracking; the dedicated stream protocol is recommended for full features and throughput | Broker/controller operations, partitions and replicas, retention, consumer lag, and rebalances |

Choose Streams when RabbitMQ is already the operational center and the workload needs large fan-out, replay, or large backlogs. Choose Kafka when retained logs, partitioned consumer groups, and the Kafka ecosystem are the system's primary model. Super streams add partition-management cost, so use them only after one stream's throughput is measured as the limit.

## Decision examples

Use RabbitMQ classic or quorum queues for `GenerateInvoice` jobs that need acknowledgements, delay/retry topology, and routing by tenant. Use Kafka for `OrderPlaced` events consumed by billing, fraud, analytics, and replayable projections. Keep MSMQ when an existing Windows estate depends on its transactional integration and migration cost exceeds current value; do not choose it for a new cross-platform system.

Cloud services such as Azure Service Bus, Amazon SQS/SNS, and Google Pub/Sub are often better when the team wants managed operations. Compare their concrete ordering, deduplication, dead-letter, maximum-size, retention, and throughput contracts rather than assuming the same semantics as an open-source broker.

## References

- [RabbitMQ reliability guide](https://www.rabbitmq.com/docs/reliability) — official acknowledgements, confirms, redelivery, and failure behavior.
- [RabbitMQ Streams and super streams](https://www.rabbitmq.com/docs/streams) — official replay, retention, partitioning, ordering, protocol, and operational constraints.
- [Apache Kafka design](https://kafka.apache.org/documentation/#design) — official retained-log, partition, ordering, and consumer-group design.
- [MSMQ documentation](https://learn.microsoft.com/previous-versions/windows/desktop/msmq/ms711472(v=vs.85)) — official Windows Message Queuing model and feature set.
- [Azure messaging comparison](https://learn.microsoft.com/azure/service-bus-messaging/compare-messaging-services) — official comparison of Service Bus, Event Hubs, and Event Grid.
