---
publish: true
created: 2026-07-16T14:07:21.360Z
modified: 2026-07-18T11:59:15.667Z
published: 2026-07-18T11:59:15.667Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Change data capture reads committed database logs into resumable streams while preserving source order, schema, and deletion semantics.
level:
  - "4"
priority: High
status: Ready to Repeat
---

Change data capture (CDC) converts committed database changes into a resumable stream. Log-based CDC observes the same transaction log used for recovery, so the application does not need a second write for every downstream sink. It still produces an asynchronous, replayable copy—not a distributed transaction with the consumer.

# Transaction Log to Consumer

For one committed transaction, emit a stable source position, transaction ID, table, key, operation, before/after data where available, and schema version. Preserve commit order within the documented source partition. A connector stores its last acknowledged log position only after the broker accepts the record.

![[Assets/Software Architecture/Software Architecture-Change Data Capture-18120000.png]]

The visual shows a common Debezium-to-broker-to-sink path. The database log is the source boundary; snapshot bootstrapping, schema changes, deletes, retention, and duplicate delivery need separate rules.

Suppose `orders/42` changes from `PENDING` to `PAID` at log sequence `8/2A10`. A sink records that source position with its projection update. If the connector replays the event after a crash, the sink compares the position or event ID and becomes a no-op.

# Snapshot, Retention, and Schema

An initial snapshot and the live log must meet at a precise position; otherwise changes committed during the snapshot can be lost or duplicated. Retain the source log and broker records long enough for the slowest recoverable consumer. A connector that falls behind the database retention window needs a new snapshot.

Represent deletion explicitly with a tombstone or delete operation. Carry schema identity with every event, make additive changes backward compatible where possible, and stop or quarantine a consumer that cannot interpret the new schema rather than silently dropping fields.

# CDC Is Not the Outbox

CDC faithfully reports database changes. It cannot infer that three unrelated row updates mean one domain event. Use a transactional outbox when the application must atomically store business state and a deliberate integration event. CDC can then publish the outbox row without a dual write.

# References

- [Debezium documentation](https://debezium.io/documentation/reference/stable/) — official snapshot, offset, schema-change, transaction, deletion, and connector behavior.
- [PostgreSQL logical decoding](https://www.postgresql.org/docs/current/logicaldecoding.html) — official extraction of persistent database changes from the write-ahead log.
- [Kafka Connect documentation](https://kafka.apache.org/documentation/#connect) — official connector offset, task, converter, delivery, and error-handling model.
- [ByteByteGo: change data capture](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/change-data-capture-key-to-leverage-real-time-data.md) — provenance for the transaction-log, source-connector, broker, and sink topology.
