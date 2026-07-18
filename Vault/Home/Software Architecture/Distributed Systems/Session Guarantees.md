---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Client-scoped consistency guarantees that preserve a user's causal experience without global linearizability."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Session guarantees constrain what one client observes across requests to an eventually consistent replicated store. They preserve a coherent user journey without forcing every client and replica into one globally linearizable order.

## Four guarantees

- **Read your writes:** after a client writes `profile.name = "Ada"`, its later reads do not return the old name.
- **Monotonic reads:** once a client observes version 12, it never later observes version 11.
- **Monotonic writes:** a client's writes are applied in the order the client issued them.
- **Writes follow reads:** a write based on a value the client read is ordered after that observed version.

A product may provide only a subset. State the required guarantee rather than saying “session consistency” without semantics.

## Token mechanism

After a successful write, the store returns a version or session token. The client sends it with the next request. A replica may answer only after it has applied at least that causal position; otherwise the request waits, routes to a fresher replica, or fails within its deadline.

Example: a user updates a shipping address, receives token `region-a:1842`, then opens checkout. The checkout read carries the token and cannot use a replica still at `region-a:1839`. Other users may still see older data; the guarantee is scoped to this session.

Tokens must survive load balancing. Keeping them only in one web server's memory breaks the guarantee when the next request reaches another instance.

## References

- [Session Guarantees for Weakly Consistent Replicated Data](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/session-guarantees.pdf) — Terry et al.'s original definitions and client-centric model.
- [Azure Cosmos DB session consistency](https://learn.microsoft.com/azure/cosmos-db/consistency-levels#session-consistency) — official token-based session behavior in a production database.
- [Designing Data-Intensive Applications](https://dataintensive.net/) — source for practical causal and replica-consistency reasoning across distributed stores.
