---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Choosing and operating Azure Cosmos DB consistency levels by workload, region, and client session."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Azure Cosmos DB offers five consistency levels: Strong, Bounded Staleness, Session, Consistent Prefix, and Eventual. The choice controls observable read order, staleness, regional availability, latency, and request-unit cost. Choose from an operation's invariant and user experience, not from a product-wide “strong versus eventual” label.

## Selection

| Level | Observable promise | Example |
| --- | --- | --- |
| Strong | Reads return the latest committed version | A globally ordered control record where stale reads are unacceptable |
| Bounded Staleness | Reads lag by at most configured versions or time | Inventory dashboards with an explicit maximum lag |
| Session | One client gets read-your-writes and related session guarantees | Shopping profile and cart interactions |
| Consistent Prefix | Reads never observe writes out of order, but may lag | A public activity feed where order matters more than freshness |
| Eventual | Replicas converge without ordering or freshness bounds | Derived recommendations or counters tolerant of temporary anomalies |

## Concrete client flow

The .NET SDK captures session tokens from responses and sends them on later requests made through the same client. Reuse a singleton `CosmosClient`; creating one per request discards connection pools and makes session behavior harder to preserve. When a session crosses services, explicitly propagate the relevant token only if the API contract owns that guarantee.

Consistency can also be overridden downward for an individual read when the account default permits it. Do not silently weaken a read that enforces a business invariant.

## References

- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/consistency-levels) — official semantics, availability, latency, and region constraints for all five levels.
- [Azure Cosmos DB .NET SDK best practices](https://learn.microsoft.com/azure/cosmos-db/nosql/best-practice-dotnet) — official client lifetime, connectivity, and SDK usage guidance.
- [Session tokens in Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/nosql/how-to-manage-consistency) — official guidance for reading, capturing, and propagating session tokens.
