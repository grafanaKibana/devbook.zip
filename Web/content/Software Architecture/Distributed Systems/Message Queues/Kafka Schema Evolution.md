---
publish: true
created: 2026-07-16T16:57:19.930Z
modified: 2026-07-16T16:57:19.930Z
published: 2026-07-16T16:57:19.930Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Evolving Kafka event schemas while retained old records and independently deployed consumers remain readable.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

Kafka retains records, so a schema change must work not only with today's producers and consumers but also with old data replayed months later. A schema registry records versions and enforces a compatibility policy before deployment. Avro commonly resolves a writer schema stored with the record against the reader schema used by the consumer.

## Writer and reader schemas

Suppose version one writes:

```json
{"type":"record","name":"OrderPlaced","fields":[{"name":"orderId","type":"string"}]}
```

Version two adds an optional field with a default:

```json
{"type":"record","name":"OrderPlaced","fields":[{"name":"orderId","type":"string"},{"name":"currency","type":["null","string"],"default":null}]}
```

An old record remains readable by the new consumer because the reader supplies the default. A new record can remain readable by an old consumer when the reader ignores fields it does not know. Renaming or changing the type of `orderId` is breaking unless aliases or a migration strategy preserve resolution.

## Compatibility policy

- **Backward:** new consumers can read records produced by the prior schema.
- **Forward:** old consumers can read records produced by the new schema.
- **Full:** both directions hold.
- **Transitive:** compatibility is checked against every relevant historical version, not only the latest.

Use full transitive compatibility for long-retained contracts when independent consumers can lag several versions. For a real breaking change, publish a new event type or topic and run both contracts through a migration window.

## References

- [Apache Avro specification: schema resolution](https://avro.apache.org/docs/current/specification/#schema-resolution) — primary writer/reader resolution rules and defaults.
- [Confluent Schema Registry compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) — official compatibility modes and operational examples.
- [Apache Kafka protocol serialization](https://kafka.apache.org/documentation/#serialization) — official producer and consumer serialization boundary.
