---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Designing resource APIs around identity, retries, concurrency, compatibility, authorization, and measured cost."
level:
  - "3"
priority: High
status: Creation
publish: false
---

# Intro

API design turns domain operations into contracts that clients can retry, cache, authorize, and evolve. URI naming is the visible edge; the harder parts are resource identity, ambiguous outcomes, concurrent writes, compatibility, and bounded work. This note applies those decisions to a shopping cart over [[REST]].

## One Resource Contract

| Intent | HTTP contract | Boundary |
| --- | --- | --- |
| Create a cart | `POST /carts` with `Idempotency-Key` | Persist the key, request fingerprint, and original result atomically with creation |
| Read a cart | `GET /carts/{cartId}` | Authorize the specific cart; return validators such as `ETag` |
| Put a known item | `PUT /carts/{cartId}/items/{sku}` | Repeating the representation has the same intended effect |
| Change quantity | `PATCH ...` with a defined patch media type and `If-Match` | Reject a stale version with `412 Precondition Failed` |
| Delete a cart | `DELETE /carts/{cartId}` | Define repeat response and whether privileged reads expose tombstones |
| Search carts | `GET /carts?owner=42&status=open&limit=50&after=...` | Bind filters and page position to the authorized principal |

A creation response uses `201 Created` and `Location` when the server creates a new resource. Error responses use `application/problem+json` with stable problem type identifiers and avoid leaking whether another tenant's resource exists.

Idempotency keys solve an ambiguous retry only when their store is durable and scoped. The server must reject the same key with a different request fingerprint, return the original result for a completed request, and define expiry longer than the client's maximum retry window.

## Compatibility

Prefer additive fields, tolerant readers, and new optional capabilities before versioning. A version is earned when the old and new contracts cannot coexist safely.

| Strategy | Strength | Cost |
| --- | --- | --- |
| Path version (`/v2/carts`) | Visible and easy to route | Duplicates resource lifetimes and links |
| Media type or header | Keeps resource URI stable | Harder discovery, gateway, and cache configuration |
| New resource/operation | Makes a genuinely new capability explicit | Clients may coordinate across old and new workflows |

Pick one strategy per API surface and publish deprecation, migration, and removal dates. Do not add `v1` before a real breaking change exists.

## REST versus GraphQL

| Dimension | REST | [[GraphQL]] |
| --- | --- | --- |
| Contract owner | Server owns resources and representations | Server owns schema; clients own operation documents |
| Cache key | Method, URL, and `Vary` work with generic caches | Arbitrary operations need persisted IDs or GraphQL-aware caches |
| Authorization | Checked per endpoint and resource | Checked through nested field and object resolution |
| Cost control | Endpoint work is comparatively predictable | Depth, aliases, list sizes, and resolver fan-out need budgets |
| Best fit | Stable resource interactions and broad HTTP reach | Multiple clients need different graph projections |

Neither removes backend fan-out. Choose GraphQL only when selectable graph projections repay the schema governance and execution controls.

## Performance by Evidence

| Measured cost | Candidate | Cost paid |
| --- | --- | --- |
| Repeated stable reads | HTTP/application cache | Invalidation, staleness, authorization-safe keys |
| Large response bytes | Projection or compression | More representations, CPU, decompression limits |
| Slow data access | Index or materialized view | Write amplification, storage, freshness |
| Non-critical request work | Durable queue | Eventual completion, deduplication, backpressure |
| Connection setup | Bounded connection pool | Long-lived stale endpoints and queueing |
| Deep collection traversal | [[API Pagination|Keyset pagination]] | No arbitrary page jump and cursor governance |

State the invariant first: a cache cannot cross tenants, an acknowledged async job must survive the promised failures, and a pool cannot exceed downstream capacity.

## References

- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — primary method, status, conditional request, and representation semantics.
- [Problem Details for HTTP APIs (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) — standard error document and extension model.
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines) — concrete compatibility, resource, pagination, and error conventions from a large API estate.
