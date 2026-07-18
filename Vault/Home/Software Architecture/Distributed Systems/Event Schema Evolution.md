---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Evolving event schemas while retained records and independently deployed producers and consumers remain readable."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Event schema evolution keeps old records readable while producers and consumers deploy independently. The contract is broader than any broker or registry: define how a reader interprets a writer's version, which changes CI accepts, how schemas are identified, and how a consumer behaves when it cannot resolve or understand a version.

## Writer and reader schemas

Suppose version one writes:

```json
{"type":"record","name":"OrderPlaced","fields":[{"name":"orderId","type":"string"}]}
```

Version two adds an optional field with a default:

```json
{"type":"record","name":"OrderPlaced","fields":[{"name":"orderId","type":"string"},{"name":"currency","type":["null","string"],"default":null}]}
```

An old record remains readable by the new consumer because its reader schema supplies the default. A new record remains readable by an old consumer when that reader ignores fields it does not know. Renaming or changing the type of `orderId` is breaking unless aliases or a migration preserve resolution.

## Compatibility policy

- **Backward:** new consumers can read records produced by the previous schema.
- **Forward:** old consumers can read records produced by the new schema.
- **Full:** both directions hold.
- **Transitive:** compatibility is checked against every relevant historical version, not only the latest.

Use full transitive compatibility when retained records outlive several application versions or independent consumers can lag for months. Compatibility labels still depend on the serialization format and configured subject/version strategy; they are not universal guarantees across every event system.

## Registry and transport boundary

A registry is one way to distribute schema identity and enforce policy. A system can instead publish versioned contracts with the application, but it still needs deterministic writer/reader resolution and deployment checks.

![[System Design 101/d5bf9b9c1d4a6ca3ec04fe50401d2a1d12503a07179326a2abd3d6d62d2ae050.png]]

In one Kafka implementation, serializers attach a schema identifier to each record. Confluent's legacy wire format uses a magic byte followed by a four-byte schema ID, while header mode can carry a schema GUID. The consumer resolves and caches the writer schema, then applies the reader schema. Avoid a registry request per message, but treat registry availability as a dependency for cold consumers and newly introduced versions.

For an intentional breaking change, publish a new event type or channel and run both contracts through a migration window. Quarantine an unsupported version with its event ID, schema identity, and source position; silently dropping unknown fields or records makes replay unverifiable.

## References

- [Apache Avro schema resolution](https://avro.apache.org/docs/current/specification/#schema-resolution) — primary writer/reader resolution, aliases, defaults, and compatibility rules for Avro data.
- [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/latest) — implementation-neutral contract model for channels, messages, and reusable schemas.
- [Confluent Schema Registry compatibility](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html) — official compatibility modes and operational examples for one registry implementation.
- [Confluent serializers and wire format](https://docs.confluent.io/platform/current/schema-registry/fundamentals/serdes-develop/overview.html) — official schema ID/GUID placement, writer-schema lookup, and serializer/deserializer behavior.
