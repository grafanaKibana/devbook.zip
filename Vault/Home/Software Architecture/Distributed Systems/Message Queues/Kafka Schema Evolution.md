---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Evolving Kafka event schemas while retained old records and independently deployed consumers remain readable."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Kafka retains records, so a schema change must work not only with today's producers and consumers but also with old data replayed months later. A schema registry records versions and enforces a compatibility policy before deployment. Registry-aware serializers attach a schema identifier to each record rather than embedding the full schema: Confluent's wire format uses a magic byte followed by a four-byte schema ID, while newer header mode carries a schema GUID in Kafka headers. The consumer extracts that ID or GUID, resolves and caches the writer schema from the registry, then Avro reconciles it with the consumer's reader schema.

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

The lookup is part of the deserialize path, but it should not become a registry call per message. Client serializers and deserializers cache schemas by identifier; after the first lookup, records using the same writer schema resolve locally. Registry availability still matters for cold consumers and newly introduced schema versions, so deploy and failure-test it as shared messaging infrastructure.

## Compatibility policy

- **Backward:** new consumers can read records produced by the prior schema.
- **Forward:** old consumers can read records produced by the new schema.
- **Full:** both directions hold.
- **Transitive:** compatibility is checked against every relevant historical version, not only the latest.

Use full transitive compatibility for long-retained contracts when independent consumers can lag several versions. For a real breaking change, publish a new event type or topic and run both contracts through a migration window.

## References

- [Apache Avro specification: schema resolution](https://avro.apache.org/docs/current/specification/#schema-resolution) — primary writer/reader resolution rules and defaults.
- [Confluent Schema Registry compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) — official compatibility modes and operational examples.
- [Confluent serializers and wire format](https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/overview.html) — official schema ID/GUID placement, writer-schema lookup, and serializer/deserializer behavior.
