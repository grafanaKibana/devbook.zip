---
publish: true
created: 2026-07-16T16:55:26.767Z
modified: 2026-07-16T16:55:26.767Z
published: 2026-07-16T16:55:26.767Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Client-specific backend composition and federated API ownership behind an edge gateway.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

A Backend for Frontend (BFF) gives one client type an API surface shaped around its screens, release cadence, authentication, and latency budget. API federation composes independently owned domain APIs into one graph or contract. Both sit behind the edge and reduce client fan-out, but they solve different ownership problems: a BFF follows a client; federation follows domains.

## BFF boundary

A mobile checkout screen may need order, inventory, loyalty, and payment-method data. A mobile BFF can call those services in parallel and return one payload sized for a constrained network. The BFF may translate transport contracts, enforce client-specific authorization, and apply a short-lived composition cache.

Keep domain decisions out of it. `CanRefundOrder` belongs to Orders or Payments, not to a mobile BFF. Otherwise different clients acquire different business rules.

## Federated API boundary

In a federated graph, each domain owns its schema contribution and resolver behavior. A graph gateway validates and composes those contributions, plans queries, and joins results. For example, Orders owns `Order`, Customers extends it with customer fields, and Shipping contributes delivery estimates. A schema registry checks compatibility before a change reaches the gateway.

Federation does not remove network cost. A query that crosses five subgraphs can still produce fan-out latency or an N+1 pattern. Put query limits, tracing, batching, and ownership metadata at the federation boundary.

## Choosing between them

Use one gateway when clients have similar needs. Split a BFF when mobile, web, and partner clients have materially different payloads or ownership. Use federation when domains must evolve parts of one API contract independently. They can coexist: a mobile BFF can call a federated graph, but add that extra layer only when each boundary has a distinct owner and measurable value.

## References

- [Backends for Frontends](https://samnewman.io/patterns/architectural/bff/) — Sam Newman's pattern description, ownership model, and cautions against excessive BFF proliferation.
- [API Gateway pattern](https://microservices.io/patterns/apigateway.html) — gateway and client-specific adapter forces and consequences.
- [Apollo Federation architecture](https://www.apollographql.com/docs/federation/) — official federation model for subgraphs, composition, and a graph router.
- [GraphQL specification](https://spec.graphql.org/) — primary language and execution contract underlying federated GraphQL APIs.
