---
topic:
  - Networks
subtopic:
  - Protocols
summary: "The agreed rules that let machines communicate, with each layer's protocols and debugging."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "3"
status: Done
---

# Intro

Protocols are the agreed-upon rules that let machines communicate: what to send, in what order, and what to do when things go wrong. Every layer of the stack (link, network, transport, application) has its own protocol set, and production debugging often means knowing which layer broke the contract. Example: an HTTP 502 can mean the upstream is down, or it can mean a TLS version mismatch between proxy and origin that never shows up in application logs.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [RFC 3986: Uniform Resource Identifier (URI): Generic Syntax](https://datatracker.ietf.org/doc/html/rfc3986)
- [MDN: URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)
