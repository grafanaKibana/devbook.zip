---
topic:
  - Networks
subtopic:
  - Protocols
summary: "HTTP methods, status codes, fields, content, and conditional request behavior."
level:
  - "3"
priority: High
status: Creation
publish: false
---

# Intro

HTTP semantics describe what a request asks for and what a response means independently of whether the message uses HTTP/1.1, HTTP/2, or HTTP/3 framing. Correct clients separate protocol properties from application policy: `PUT` is idempotent, but retrying an unknown outcome can still require a precondition and reconciliation.

## Methods and Retry Boundaries

| Method | Intended semantics | Safe | Idempotent | Retry boundary |
|---|---|---|---|---|
| `GET` | Transfer a current representation | Yes | Yes | Retry within the request deadline when replay is acceptable |
| `HEAD` | Transfer GET metadata without response content | Yes | Yes | Same boundary as `GET` |
| `POST` | Process content according to the target resource | No | No | Retry only with an application idempotency contract or proof it was not processed |
| `PUT` | Create or replace the target state with the supplied representation | No | Yes | Preserve preconditions; reconcile an unknown first outcome before overwriting newer state |
| `PATCH` | Apply a media-type-defined patch | No | Depends on patch | Retry only when the patch operation is idempotent or deduplicated |
| `DELETE` | Remove the target association | No | Yes | Repetition has the same intended effect, although later responses may differ |

Idempotency describes the intended server effect of repeated identical requests, not identical responses or freedom from races. Consider a conditional replacement:

```http
PUT /orders/42 HTTP/1.1
Host: api.example.com
Content-Type: application/json
If-Match: "v7"

{"id":42,"status":"shipped"}
```

If the server commits the change but its response is lost, an identical retry can return `412 Precondition Failed` because the first request advanced the entity tag. The client should fetch or otherwise reconcile the current representation instead of dropping `If-Match` and overwriting a concurrent change.

## Status Codes

| Code | Boundary |
|---|---|
| `201 Created` | A resource was created; `Location` identifies a relevant new resource when available |
| `400 Bad Request` | The server cannot process the request because of malformed syntax or framing |
| `401 Unauthorized` | Authentication credentials are required; include an applicable `WWW-Authenticate` challenge |
| `403 Forbidden` | The server understood the request and refuses it; authentication is not a prerequisite |
| `409 Conflict` | The request conflicts with current resource state |
| `412 Precondition Failed` | A request precondition such as `If-Match` evaluated false |
| `422 Unprocessable Content` | Syntax is understood, but the instructions cannot be processed |
| `429 Too Many Requests` | The client exceeded a rate policy; `Retry-After` may bound the next attempt |
| `502 Bad Gateway` | A gateway or proxy received an invalid upstream response |
| `503 Service Unavailable` | The server is temporarily unable to handle the request |

Unknown status codes are interpreted by class, but clients must not invent retry or security meaning from an unregistered value. Log the raw code and the intermediary or product that generated it.

## Fields and Content

Representation fields such as `Content-Type` describe content. Negotiation fields such as `Accept` and `Accept-Encoding` describe client preferences. Validators such as `ETag`, `If-None-Match`, and `If-Match` make cache validation and optimistic concurrency explicit.

HTTP/1.1 uses `Content-Length`, chunked transfer coding, or connection closure to delimit content according to the message rules. HTTP/2 and HTTP/3 carry content in frames instead. Range requests use `Range`, `206 Partial Content`, and `Content-Range` for resumable downloads and media seeking.

Connection-specific fields are scoped to one hop. A proxy must remove fields named by `Connection` and must not forward HTTP/1.1-only connection metadata into HTTP/2 or HTTP/3.

## References

- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — primary definition of methods, status codes, fields, content, conditions, and range requests.
- [HTTP/1.1 (RFC 9112)](https://www.rfc-editor.org/rfc/rfc9112) — primary definition of HTTP/1.1 message framing and connection handling.
- [IANA HTTP Status Code Registry](https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml) — current registered, provisional, and reserved status values.
- [Problem Details for HTTP APIs (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) — standard machine-readable error representation and extension rules.
