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

Choose an identifier by its required guarantees: uniqueness scope, sort order, opacity, coordination, index locality, and behavior when clocks or allocators fail. “Globally unique and ordered” is incomplete until the system defines the namespace and ordering boundary.

# Common Designs

| Design | Coordination | Order and locality | Failure boundary |
| --- | --- | --- | --- |
| UUIDv4 | None | Random. Poor locality in ordered indexes | Collision probability, entropy source |
| UUIDv7 | None for generation | Time-ordered prefix improves locality. Equal timestamps need randomness | Clock quality and local monotonic handling |
| Snowflake-style | Worker-ID allocation plus local state | Roughly time ordered | Clock rollback, duplicate worker IDs, sequence exhaustion |
| Database sequence | Central database or partition | Strict allocation order, not commit order | Database availability and sequence gaps |
| Allocated ranges | Database allocates blocks to generators | Ordered within a range | Unused gaps and duplicate range assignment |

UUID uniqueness is probabilistic but extremely strong with correct randomness. It is not “non-unique.” Database and Redis allocators are not automatically single points of failure. Their availability follows the deployed replication and failover design; any comparison that labels them as single points of failure unconditionally is misleading.

# .NET Example

.NET exposes RFC 9562 UUIDv7 generation:

```csharp
Guid id = Guid.CreateVersion7();
```

Use UUIDv7 when independent writers need coordination-free IDs with useful time locality and timestamp exposure is acceptable. Do not infer exact event order from it. Two hosts can have skewed clocks, values created in the same millisecond need an implementation-defined monotonic method if creation order matters, and database commit order can differ from generation order.

For a Snowflake-style 64-bit layout, document the custom epoch, timestamp bits, worker bits, and per-tick sequence bits. Persist or coordinate worker assignment and stop generation on unhandled clock rollback. If IDs leave the trust boundary, remember that time and worker fields leak operational information.

# References

- [RFC 9562: Universally Unique Identifiers](https://www.rfc-editor.org/rfc/rfc9562)
- [Twitter Snowflake](https://github.com/twitter-archive/snowflake)
- [PostgreSQL sequence functions](https://www.postgresql.org/docs/current/functions-sequence.html)
