---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Uniform-interface constraints, hypermedia, and the Richardson maturity model for HTTP APIs."
level:
  - "3"
priority: Medium
status: Creation
publish: false
---

# Intro

The Richardson maturity model describes how an HTTP API adopts resource identifiers, HTTP semantics, and hypermedia. It is a teaching model, not the definition of REST and not a universal score. Fielding's REST constraints remain the architectural standard; the levels help explain which uniform-interface capabilities an API exposes.

## Uniform Interface

The REST uniform interface has four parts:

1. **Resource identification.** Stable URI references identify resources independently of one representation.
2. **Manipulation through representations.** A client transfers a representation that carries the state needed for the requested transition.
3. **Self-descriptive messages.** Method, target, fields, media type, content, and status provide the information needed to understand the message.
4. **Hypermedia as the engine of application state.** Representations expose links or controls for valid next transitions.

For example, an order representation can expose different controls by state:

```json
{
  "id": 42,
  "status": "awaiting-payment",
  "links": [
    { "rel": "self", "href": "/orders/42", "method": "GET" },
    { "rel": "pay", "href": "/orders/42/payment", "method": "POST" },
    { "rel": "cancel", "href": "/orders/42/cancellation", "method": "PUT" }
  ]
}
```

The client still needs the media type and link-relation contract. Hypermedia reduces hard-coded workflow URLs; it does not eliminate versioning, authorization, or schema evolution.

## Richardson Levels

| Level | Capability | Example | Missing boundary |
|---|---|---|---|
| 0 | One endpoint used as a message tunnel | `POST /api` with an action field | Resource identity and standard method semantics |
| 1 | Resource-oriented URI references | `/orders` and `/orders/42` | Methods and statuses may still be used as a tunnel |
| 2 | HTTP methods, statuses, fields, and representations carry intent | `GET`, conditional `PUT`, `201`, `412` | Valid next transitions remain out-of-band |
| 3 | Hypermedia controls advertise available transitions | `pay`, `cancel`, and `track` links by order state | Client and server still share media-type and relation semantics |

Level 2 is common because it works with ordinary tooling and generated clients. Level 3 earns its cost when runtime discoverability, long-lived workflow evolution, or generic clients matter. A closed application whose client and server release together may get little value from hypermedia controls.

## References

- [REST dissertation, chapter 5 (Fielding)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — primary definition of REST constraints and uniform interface.
- [Richardson Maturity Model (Martin Fowler)](https://martinfowler.com/articles/richardsonMaturityModel.html) — explains the four teaching levels with resource and hypermedia examples.
- [Web Linking (RFC 8288)](https://www.rfc-editor.org/rfc/rfc8288) — standard relation and link representation model for typed links.
