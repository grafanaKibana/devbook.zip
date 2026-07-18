---
topic:
  - Networks
subtopic:
  - Protocols
summary: "A typed API query language and execution model that lets clients select response fields."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

GraphQL defines a typed query language and an execution model for APIs. A client selects fields from a server-owned schema; the server validates that selection, runs resolvers, and returns a response whose shape mirrors the query. Reach for it when several clients need different views over the same domain and coordinating a new REST representation for every screen costs more than governing a shared schema.

GraphQL is not a database protocol and does not remove backend calls. A resolver still has to load each field from a database or service, so a compact client query can trigger expensive server-side fan-out. The API needs cost controls, batching, authorization, observability, and an explicit transport contract.

```graphql
query OrderScreen($id: ID!) {
  order(id: $id) {
    id
    status
    customer { displayName }
    lines { quantity product { name } }
  }
}
```

The response repeats that selection under `data`. Errors may coexist with partial data, so clients must inspect both rather than treating every HTTP `200` as complete success.

# Schema and Execution

The schema declares object, scalar, enum, interface, and input types plus root operation fields. A **query** reads, a **mutation** requests a state transition and executes its top-level fields serially, and a **subscription** establishes a stream of application results. Subscriptions deliver application events; they do not announce schema changes.

Execution walks the selected fields and calls resolvers. The classic failure is N+1 loading: resolving 100 orders and then loading each customer separately produces 101 backend calls. Batch requests by key within one operation and cache only within that request:

```text
order.customer resolver keys: [17, 23, 17, 41]
batched load: SELECT ... WHERE customer_id IN (17, 23, 41)
request-local cache reuses customer 17
```

Global resolver caches need normal freshness and authorization boundaries; a request-local loader is not a substitute for an application cache.

# Transport, Safety, and Caching

GraphQL commonly uses HTTP. `POST` carries an operation document and variables; `GET` can carry read-only queries when the URL remains within deployment limits and cacheability matters. The GraphQL-over-HTTP contract defines media types and status behavior, while WebSocket or SSE protocols are separate choices for subscriptions.

Protect the execution engine at several boundaries:

- authenticate the request, then authorize the underlying object or field inside resolvers;
- cap parsed document size, depth, aliases, list cardinality, and computed cost;
- set backend deadlines and concurrency limits so one query cannot exhaust a dependency;
- disable unrestricted introspection only when the threat model warrants it; it is not an authorization control;
- prefer registered or allow-listed operations for fixed production clients.

HTTP caches key naturally on method, URL, and selected headers. Arbitrary GraphQL documents often share one `POST /graphql` URL, so CDN caching needs persisted-query identifiers or application-aware cache keys. Normalized client caches can reuse objects by type and ID, but they still need mutation invalidation rules.

# GraphQL Adoption Patterns

| Pattern | Ownership | Latency and operations | Choose it when |
| --- | --- | --- | --- |
| Client-side graph over existing APIs | Client team owns schema/resolvers | Backend fan-out and credentials remain in every client | A local developer-experience layer is enough and clients are trusted, controlled applications |
| Backend for Frontend (BFF) | One BFF per client family | Adds services, but moves aggregation and policy off devices | Mobile, web, and partner clients need materially different contracts |
| Shared graph service | Central or joint platform ownership | One runtime is easy to find but becomes a governance and capacity boundary | A few teams share one domain and can release the schema together |
| Federated graph | Domain teams own subgraphs; platform owns composition/router rules | Adds schema composition, query planning, registry, and cross-domain failure modes | Independent domains already need separate ownership and a single client graph pays for the control plane |

Federation is not the default end state. Start with the smallest server-owned graph that solves a client problem. Split when domain ownership and release independence are already real, not because the schema became fashionable.

# Persisted-Query Deployment without a Gateway

LinkedIn described a distributed design in which production clients send only pre-registered query IDs. The client release pipeline publishes immutable operations to a central registry; build-time metadata identifies the top-level domain, and the traffic tier routes each ID to a frontend service cluster that hosts a GraphQL execution endpoint. The endpoint resolves and caches the registered document, then performs in-process and cross-service field resolution.

This is not an API Gateway pattern. The registry and compiler are control-plane dependencies; traffic routing and distributed execution endpoints are the data plane. It avoids a universal GraphQL execution hop and central runtime bottleneck, but it constrains query shape, couples client release tooling to the registry, and requires compatibility checks before publication. The design earned its complexity from LinkedIn's existing service topology; a smaller system should usually keep one graph endpoint.

# REST and gRPC Boundary

Use [[REST]] when resources, HTTP caching, and broad external tooling are the stable contract. Use GraphQL when client-selected projections and graph-shaped aggregation dominate, accepting server-side query governance. Use [[gRPC]] when both ends are controlled services that benefit from generated contracts, binary framing, and streaming. GraphQL can reduce request count and response over-fetching, but it does not guarantee lower latency: resolver fan-out, authorization depth, and query planning often become the new cost center.

# References

- [GraphQL specification](https://spec.graphql.org/October2021/) — defines the type system, validation, execution, errors, mutations, and subscriptions.
- [GraphQL over HTTP](https://graphql.github.io/graphql-over-http/draft/) — specifies HTTP methods, media types, status codes, and request/response encoding.
- [How LinkedIn adopted a GraphQL architecture](https://www.linkedin.com/blog/engineering/architecture/how-linkedin-adopted-a-graphql-architecture-for-product-developm) — primary account of its registry, distributed execution endpoints, routing metadata, and tradeoffs.
- [ByteByteGo: What is GraphQL?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-is-graphql.md) — source prompt; its rejected visual confused subscription events with schema changes.
- [ByteByteGo: GraphQL adoption patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/graphql-adoption-patterns.md) — source comparison reframed here around ownership and operating cost.
- [ByteByteGo: GraphQL at LinkedIn](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-does-graphql-work-in-the-real-world.md) — source summary checked against LinkedIn's engineering article.
