---
topic:
  - Networks
subtopic:
  - Protocols
summary: "HTTP freshness, validation, cache keys, and shared-cache authorization boundaries."
level:
  - "3"
priority: High
status: Creation
publish: false
---

# Intro

HTTP caching reuses a stored response when the request matches its cache key and the response is fresh or validates successfully. The performance win is avoiding origin work and transfer; the cost is a correctness contract around staleness, authorization, representation variants, and invalidation.

## Freshness Policy

```http
Cache-Control: public, max-age=60, s-maxage=300, must-revalidate
```

| Directive | Effect |
|---|---|
| `max-age=60` | A cache can reuse the response for 60 seconds from its calculated age |
| `s-maxage=300` | A shared cache uses 300 seconds instead of `max-age` |
| `no-cache` | Storage is allowed, but every reuse requires successful validation |
| `no-store` | The cache must not store the response |
| `private` | Shared caches must not store the response; a private cache may |
| `must-revalidate` | A stale response cannot be reused without successful validation, except where the specification explicitly permits it |

If explicit freshness is absent, a cache can apply heuristic freshness to eligible responses. APIs should state the intended policy rather than rely on inference.

## Validators and Preconditions

An entity tag lets a cache ask whether its stored representation is still current:

```http
GET /catalog/42 HTTP/1.1
If-None-Match: "catalog-v9"

HTTP/1.1 304 Not Modified
ETag: "catalog-v9"
Cache-Control: private, max-age=0, must-revalidate
```

`304` carries no representation content; the cache updates stored metadata and reuses its prior content. `If-None-Match` takes precedence over `If-Modified-Since` when both are present. Weak entity tags can validate semantic equivalence for caching but are unsuitable for `If-Match` lost-update protection.

## Cache Keys and Vary

The primary cache key includes the target URI and method according to cache rules. `Vary` adds selected request fields:

```http
Vary: Accept-Encoding, Accept-Language
```

Omitting a relevant field can cross-serve the wrong representation. Adding a high-cardinality field such as a raw `User-Agent` can fragment the cache until reuse disappears. Normalize only according to an explicit application or intermediary contract; arbitrary query sorting or decoding can change the resource identity.

A shared cache normally cannot reuse a response to a request carrying `Authorization` unless the response explicitly permits shared reuse under RFC 9111. Even then, the cache key and representation must not mix identities. Private user data should normally stay in a private cache or use `no-store` when storage itself is unacceptable.

## Pitfalls

- **Using `no-cache` for secrecy.** It allows storage. Use `no-store` when the response must not be retained.
- **Caching errors without intent.** Some status codes are heuristically cacheable. Declare a short explicit policy or `no-store` for transient failures.
- **Forgetting invalidation ownership.** A long `max-age` trades origin load for a longer stale window unless versioned URLs or purge controls provide a separate invalidation path.

## References

- [HTTP Caching (RFC 9111)](https://www.rfc-editor.org/rfc/rfc9111) — primary definition of cache keys, freshness, validation, authorization, and cache-control directives.
- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — defines validators, conditional requests, entity tags, and status semantics used by caches.
- [MDN HTTP caching guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) — practical browser and shared-cache examples for freshness and validation.
