---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Distributed identifiers trade coordination, temporal order, opacity, index locality, and failure behavior."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Unique ID Generation

Choose an identifier by its required guarantees: uniqueness scope, sort order, opacity, coordination, index locality, and behavior when clocks or allocators fail. “Globally unique and ordered” is incomplete until the system defines the namespace and ordering boundary.

## Common Designs

| Design | Coordination | Order and locality | Failure boundary |
| --- | --- | --- | --- |
| UUIDv4 | None | Random; poor locality in ordered indexes | Collision probability, entropy source |
| UUIDv7 | None for generation | Time-ordered prefix improves locality; equal timestamps need randomness | Clock quality and local monotonic handling |
| Snowflake-style | Worker-ID allocation plus local state | Roughly time ordered | Clock rollback, duplicate worker IDs, sequence exhaustion |
| Database sequence | Central database or partition | Strict allocation order, not commit order | Database availability and sequence gaps |
| Allocated ranges | Database allocates blocks to generators | Ordered within a range | Unused gaps and duplicate range assignment |

UUID uniqueness is probabilistic but extremely strong with correct randomness; it is not “non-unique.” Database and Redis allocators are not automatically single points of failure—their availability follows the deployed replication and failover design. The planned comparison visual is rejected because it states those properties as absolutes.

## .NET Example

.NET exposes RFC 9562 UUIDv7 generation:

```csharp
Guid id = Guid.CreateVersion7();
```

Use UUIDv7 when independent writers need roughly time-ordered opaque IDs. Do not infer exact event order from it: two hosts can have skewed clocks, and database commit order can differ from generation order.

For a Snowflake-style 64-bit layout, document the custom epoch, timestamp bits, worker bits, and per-tick sequence bits. Persist or coordinate worker assignment and stop generation on unhandled clock rollback. If IDs leave the trust boundary, remember that time and worker fields leak operational information.

## References

- [RFC 9562: UUIDs](https://www.rfc-editor.org/rfc/rfc9562) — IETF UUID versions, uniqueness model, layouts, monotonicity, and security considerations.
- [Twitter Snowflake](https://github.com/twitter-archive/snowflake) — original public implementation and 64-bit timestamp, worker, and sequence layout.
- [PostgreSQL sequence functions](https://www.postgresql.org/docs/current/functions-sequence.html) — official allocation semantics, concurrency behavior, and intentional gaps.
- [ByteByteGo: unique ID generators](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explaining-5-unique-id-generators-in-distributed-systems.md) — provenance for the comparison categories; its visual is rejected because several guarantee and SPOF labels are false absolutes.
