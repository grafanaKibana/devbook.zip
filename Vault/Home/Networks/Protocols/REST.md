---
topic:
  - Networks
subtopic:
  - Protocols
summary: "A resource-oriented architectural style built from stateless messages and a uniform interface."
level:
  - "3"
priority: High
status: Done

publish: true
---

# Intro

REST is an architectural style for networked systems, not a synonym for JSON over HTTP. It models resources through representations and constrains interactions so clients, servers, caches, and intermediaries can evolve with limited coordination. REST fits external or cross-team APIs when stable resource identities, broad HTTP interoperability, and cacheable reads matter more than client-shaped graph queries or generated RPC contracts.

## Constraint and Decision Overview

REST combines these constraints:

- **Client-server:** user-interface and data concerns evolve across a defined message boundary.
- **Stateless:** each request carries the context required to process it; server-side application sessions are not part of the interaction contract.
- **Cacheable:** responses state whether intermediaries or clients may reuse them.
- **Uniform interface:** resources, representations, self-descriptive messages, and hypermedia controls provide a consistent interaction model.
- **Layered system:** clients need not know whether a gateway, cache, or origin served the response.
- **Code on demand:** optional executable representations can extend a client.

These constraints are not an endpoint naming checklist. [[REST Maturity Model]] owns the uniform-interface sub-constraints, HATEOAS, and the Richardson maturity model. Use REST when the resource model and HTTP semantics simplify the system; do not force a workflow-shaped domain into artificial CRUD endpoints merely to look RESTful.

## Resource Contract

Name durable resources and collections, then use method semantics from [[HTTP Semantics]]:

```http
PUT /orders/42 HTTP/1.1
Content-Type: application/json
If-Match: "order-v7"

{"id":42,"status":"shipped"}
```

`PUT` is idempotent because repeating the same request has the same intended effect. It is not permission to retry blindly after an unknown outcome. If the first request committed and advanced the entity tag, a retry can return `412 Precondition Failed`; the client should reconcile the current representation rather than remove `If-Match` and overwrite a concurrent update. Non-idempotent creation normally needs a durable idempotency key or a client-selected resource identifier before automatic retry.

Return status codes that expose the actual boundary: `201` plus `Location` for creation, `409` for a current-state conflict, `412` for a failed precondition, `422` for processable syntax with invalid instructions, and `429` or `503` with a documented retry policy. Use `application/problem+json` when clients need a standard machine-readable error envelope.

## API Design and Pagination Boundaries

Resource names, authorization, idempotency storage, versioning, filtering, and rate limits are application contracts. [[API Design]] develops them through one conditional shopping-cart example. [[API Pagination]] owns offset and keyset traversal, opaque cursors, stable ordering, and consistency across page requests.

![[System Design 101/5032baef84adef8c53504b673533fcf11649adebbf0883b66d5199c997aca764.jpg]]

> [!WARNING] Conventions, not protocol requirements
> The visual mixes useful prompts with choices that are not universal rules. `POST` becomes retry-safe only with durable idempotency handling; path versioning is one compatibility option; soft-delete visibility is an authorization decision; request signatures need canonicalization, expiry, key rotation, and replay protection; and action-resource paths are legitimate when the domain operation is not a collection mutation.

## Performance Boundary

Measure payload, dependency, queue, and saturation costs before choosing pagination, caching, compression, asynchronous work, or connection pooling. Each technique moves cost and introduces a correctness contract.

![[System Design 101/74ee33387257a7a7e92285e69d60e6c69cc5c9166bc2277d8ccf94fe6806fc5b.png]]

> [!WARNING] Technique inventory, not an automatic speedup
> Pagination can make deep offset scans slower, asynchronous logging needs bounded buffers and a loss policy, caches need authorization-safe keys and invalidation, compression spends CPU and needs decompression limits, and pools must be bounded and refreshed. Apply the item that matches measured work.

## Implementation Boundary

[[NET REST APIs]] owns ASP.NET Core routing, status results, representation mapping, validation, and conditional updates. Keep implementation conventions out of the architectural definition: controller versus minimal API, Entity Framework, and JSON serializer defaults are framework choices, not REST constraints.

## REST, GraphQL, and gRPC

| Style | Strong fit | Cost to accept |
|---|---|---|
| REST | Stable resource contracts, browser reach, conditional requests, and HTTP caching | Server-owned representations can over-fetch or require composition endpoints |
| [[GraphQL]] | Client-selected projections across a governed graph | Query cost, field authorization, resolver fan-out, and cache-key ownership |
| [[gRPC]] | Controlled service-to-service calls and typed streaming | Schema/toolchain coupling and a browser bridge for ordinary web clients |

Choose REST for broad interoperability and resource semantics. Choose GraphQL when independently evolving clients need selectable graph projections and the organization can govern query execution. Choose gRPC when both ends share a release and schema discipline and streaming or binary contracts earn the tooling.

## Pitfalls

- **Chatty resource boundaries.** If one user action requires sequential calls, add a composite read model or BFF rather than making the client assemble a distributed transaction.
- **Blind write retries.** Idempotent method semantics do not remove concurrency preconditions or unknown outcomes.
- **Treating Level 2 conventions as the REST definition.** Methods and status codes are useful, but REST's architectural constraints determine whether intermediaries and clients can understand the interaction.

## Questions

> [!QUESTION]- When is an automatic `PUT` retry unsafe even though `PUT` is idempotent?
> When the first outcome is unknown and another writer can change the resource. Preserve `If-Match`; if the retry fails its precondition, read and reconcile the current representation. Dropping the precondition can overwrite newer state even though both requests use `PUT`.

> [!QUESTION]- When should you choose GraphQL instead of REST?
> Choose GraphQL when several independently evolving clients need different projections over a connected domain and the organization can own schema evolution, field authorization, query-cost limits, and resolver performance. REST remains simpler when stable resources, conditional requests, and standard HTTP cache keys match the workload.

## References

- [REST dissertation (Fielding)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — the original definition of REST constraints and uniform interface.
- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — primary method, status, conditional request, and representation semantics used by HTTP APIs.
- [Problem Details for HTTP APIs (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) — standard machine-readable error format and extension rules.
- [ByteByteGo: Effective and safe APIs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-effective-and-safe-apis.md) — shopping-cart checklist converted here into a conditional resource and idempotency contract.
- [ByteByteGo: REST versus GraphQL](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/rest-api-vs-graphql.md) — comparison reframed here around contract ownership, caching, authorization, and operating cost.
- [ByteByteGo: API performance](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-5-common-ways-to-improve-api-performance.md) — technique inventory retained here behind measurement and correctness gates.
- [ByteByteGo: API pagination](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-perform-pagination-in-api-design.md) — pagination taxonomy routed here to the focused cursor and consistency note.
- [ByteByteGo: REST API design tips](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/8-tips-for-efficient-api-design.md) — absolutes corrected here for PATCH, POST idempotency, and earned versioning.
