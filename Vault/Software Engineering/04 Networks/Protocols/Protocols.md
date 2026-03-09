---
topic:
  - Networks
subtopic:
  - Protocols
tags:
  - FolderNote
dg-publish: true
priority: High
status: Creation
level:
  - "3"
---

# Intro

Protocols are the agreed-upon rules that let machines communicate: what to send, in what order, and what to do when things go wrong. Every layer of the stack (link, network, transport, application) has its own protocol set, and production debugging often means knowing which layer broke the contract. Example: an HTTP 502 can mean the upstream is down, or it can mean a TLS version mismatch between proxy and origin that never shows up in application logs.

## Links

- [RFC 3986: Uniform Resource Identifier (URI): Generic Syntax](https://datatracker.ietf.org/doc/html/rfc3986)
- [MDN: URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/04 Networks/04 Networks|04 Networks]]
>
> **Pages**
> - [[Software Engineering/04 Networks/Protocols/DNS|DNS]]
> - [[Software Engineering/04 Networks/Protocols/gRPC|gRPC]]
> - [[Software Engineering/04 Networks/Protocols/HTTP|HTTP]]
> - [[Software Engineering/04 Networks/Protocols/HTTP 2|HTTP 2]]
> - [[Software Engineering/04 Networks/Protocols/REST|REST]]
> - [[Software Engineering/04 Networks/Protocols/RPC|RPC]]
> - [[Software Engineering/04 Networks/Protocols/SMTP|SMTP]]
<!-- whats-next:end -->
