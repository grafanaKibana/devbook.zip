---
publish: true
created: 2026-07-16T16:58:44.570Z
modified: 2026-07-16T16:58:44.570Z
published: 2026-07-16T16:58:44.570Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: Governing event contracts and tracing records through regional ingestion, storage, computation, and consumption.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

Large event-driven estates need a control plane for contracts, ownership, compatibility, and lineage. Data pipelines then carry records through collection, ingestion, storage, computation, and consumption. [[Event-Driven Architecture]] owns service communication and workflow patterns; this note owns organization-scale governance and analytical pipeline mechanics.

## Governance boundary

- **Registry:** schema versions, owner, compatibility mode, lifecycle, and data classification.
- **SDK:** a narrow paved road for envelopes, trace context, serialization, and telemetry without hiding broker semantics.
- **Gateway:** optional ingress for authentication, quotas, and routing; internal producers do not all need an extra hop.
- **Domain ownership:** producers own event meaning and availability. The platform owns guardrails and shared infrastructure.
- **Regional isolation:** replication declares lag, ordering, conflict, residency, and failover behavior.

For `MenuItemPriceChanged`, the Restaurant domain owns semantics and its producer SLO. CI checks the schema against the registry. Regional brokers keep local consumers running during a remote outage; a global consumer accepts delayed and duplicate replicated events.

## Record trace

Trace `checkout-42` through the pipeline:

1. **Collect:** checkout emits an event ID, trace ID, schema ID, tenant, and event time.
2. **Ingest:** the broker assigns partition and offset and exposes lag.
3. **Store:** object storage writes immutable raw records partitioned by event date and schema version.
4. **Compute:** a stateful job checkpoints offsets and derives `DailyRevenue`; malformed records enter an owned quarantine path.
5. **Consume:** warehouse and alerting outputs declare separate freshness and correctness SLOs.

Preserve source event IDs in derived records and publish lineage from input dataset through job to output. Low broker lag does not prove a warehouse table is fresh or correct.

“Exactly once” must name a boundary. A stream processor may atomically checkpoint input offsets and write one managed sink, while an external email or payment call remains at-least-once and needs idempotency.

## References

- [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/latest) — primary contract model for channels, messages, operations, and reusable schemas.
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md) — CNCF event-envelope attributes for identity, source, type, time, and data.
- [Apache Flink checkpointing](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/state/checkpoints/) — official state and source-position recovery boundary.
- [OpenLineage specification](https://openlineage.io/docs/spec/) — open model connecting datasets, jobs, and runs.
