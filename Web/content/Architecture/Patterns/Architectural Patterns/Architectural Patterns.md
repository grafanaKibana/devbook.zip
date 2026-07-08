---
publish: true
created: 2026-07-08T16:14:17.425+03:00
modified: 2026-07-08T16:14:17.425+03:00
published: 2026-07-08T16:14:17.425+03:00
tags:
  - FolderNote
topic:
  - Architecture
subtopic:
  - Patterns
priority: High
level:
  - "3"
status: Done
---

# Intro

Architectural patterns define how a system's components are organized, how data flows between them, and where the boundaries of responsibility lie. They matter because choosing the wrong boundary or data flow shape creates problems that no amount of refactoring within a component can fix — the pain shows up as coupling, consistency bugs, and scaling walls.

The three patterns here compose naturally: [[Domain-Driven Design]] establishes bounded contexts and a shared language so the code matches the business domain. [[CQRS]] separates the read path from the write path so each can be optimized independently. [[Event Sourcing]] stores state as an immutable event stream, giving you audit trails, temporal queries, and the ability to rebuild read models from history. You can use DDD without CQRS, and CQRS without Event Sourcing, but in complex domains teams often adopt all three because each one solves a problem the others expose.

## References

- [Patterns of Enterprise Application Architecture -- foundational catalog of enterprise patterns covering domain logic, data source, and distribution patterns (Martin Fowler)](https://martinfowler.com/eaaCatalog/)
- [Cloud design patterns -- Azure architecture center catalog covering CQRS, Event Sourcing, and related cloud-native patterns (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
