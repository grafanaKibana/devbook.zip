---
icon: network
order: 40
color: "#f59e0b"
topic:
  - Networks
subtopic: []
summary: "Protocols, latency, and reliability of how machines communicate over a network."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "3"
status: Done
---

# Intro

Networking is how software becomes a system: protocols, latency, reliability, and the failure modes between machines. Most production bugs are distributed bugs in disguise, so a solid network model is a force multiplier. Example: an HTTP timeout can be caused by DNS, TCP congestion, TLS negotiation, or the application itself.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Computer network (Wikipedia)](https://en.wikipedia.org/wiki/Computer_network)
