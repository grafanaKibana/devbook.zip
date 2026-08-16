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

GraphQL defines a typed query language and an execution model for APIs. A client selects fields from a server-owned schema. The server validates the operation, executes resolvers, and returns a response shaped like that selection. It fits domains where several clients need different projections and governing one shared schema costs less than adding a REST representation for every screen.

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

The response repeats that selection under `data`. Field errors may coexist with partial data. The current GraphQL-over-HTTP draft recommends `294 Partial Success` for a response containing both `data` and `errors` when using `application/graphql-response+json`. Many deployed and legacy `application/json` servers still return `200`. Clients therefore inspect the media type, status, and response body instead of treating `200` as proof of complete execution.

# Schema and Execution

The schema declares output and input types plus root operation fields. A **query** reads. A **mutation** requests a state transition and executes its top-level fields serially. A **subscription** establishes a stream of application results. It does not announce schema changes.

Execution walks the selected fields and calls resolvers. The classic failure is N+1 loading: resolving 100 orders and then loading each customer separately produces 101 backend calls. Batch requests by key within one operation and cache only within that request:

```text
order.customer resolver keys: [17, 23, 17, 41]
batched load: SELECT ... WHERE customer_id IN (17, 23, 41)
request-local cache reuses customer 17
```

Global resolver caches need normal freshness and authorization boundaries. A request-local loader is not a substitute for an application cache.

# Transport, Safety, and Caching

GraphQL commonly uses HTTP. `POST` carries an operation document and variables. `GET` can carry read-only queries when the URL remains within deployment limits and cacheability matters. The GraphQL-over-HTTP contract defines media types and status behavior, while WebSocket or SSE protocols are separate choices for subscriptions.

The execution engine needs explicit limits:

- authenticate the request, then authorize the underlying object or field inside resolvers.
- cap parsed document size, depth, aliases, list cardinality, and computed cost.
- set backend deadlines and concurrency limits so one query cannot exhaust a dependency.
- disable unrestricted introspection only when the threat model warrants it. It is not an authorization control.
- prefer registered or allow-listed operations for fixed production clients.

HTTP caches key naturally on method, URL, and selected headers. Arbitrary GraphQL documents often share one `POST /graphql` URL, so CDN caching needs persisted-query identifiers or application-aware cache keys. Normalized client caches can reuse objects by type and ID, but they still need mutation invalidation rules.

# GraphQL Adoption Patterns

| Pattern | Ownership | Latency and operations | Choose it when |
| --- | --- | --- | --- |
| Client-side graph over existing APIs | Client team owns schema/resolvers | Backend fan-out and credentials remain in every client | A local developer-experience layer is enough and clients are trusted, controlled applications |
| Backend for Frontend (BFF) | One BFF per client family | Adds services, but moves aggregation and policy off devices | Mobile, web, and partner clients need materially different contracts |
| Shared graph service | Central or joint platform ownership | One runtime is easy to find but becomes a governance and capacity boundary | A few teams share one domain and can release the schema together |
| Federated graph | Domain teams own subgraphs. Platform owns composition/router rules | Adds schema composition, query planning, registry, and cross-domain failure modes | Independent domains already need separate ownership and a single client graph pays for the control plane |

Federation is an ownership design, not a maturity level. A single server-owned graph is cheaper until domains genuinely need separate release authority. Schema size alone does not justify a composition registry and distributed query plan.

# Persisted-Query Deployment without a Gateway

LinkedIn described a distributed design in which production clients send only pre-registered query IDs. The client release pipeline publishes immutable operations to a central registry. Build-time metadata identifies the top-level domain, and the traffic tier routes each ID to a frontend service cluster that hosts a GraphQL execution endpoint. The endpoint resolves and caches the registered document, then performs in-process and cross-service field resolution.

This is not an API Gateway pattern. The registry and compiler are control-plane dependencies. Traffic routing and distributed execution endpoints are the data plane. It avoids a universal GraphQL execution hop and central runtime bottleneck, but it constrains query shape, couples client release tooling to the registry, and requires compatibility checks before publication. The design earned its complexity from LinkedIn's existing service topology. A smaller system should usually keep one graph endpoint.

# REST and gRPC Boundary

[[REST]] fits stable resources, ordinary HTTP caching, and broad external tooling. GraphQL fits client-selected projections and graph-shaped aggregation, with server-side query governance as part of the cost. [[gRPC]] fits controlled services that benefit from generated contracts and streaming. GraphQL may reduce request count and over-fetching without reducing latency. Resolver fan-out and authorization can simply move the cost behind one endpoint.

# References

- [GraphQL specification](https://spec.graphql.org/September2025/)
- [GraphQL over HTTP](https://graphql.github.io/graphql-over-http/draft/)
- [How LinkedIn adopted a GraphQL architecture](https://www.linkedin.com/blog/engineering/architecture/how-linkedin-adopted-a-graphql-architecture-for-product-developm)
