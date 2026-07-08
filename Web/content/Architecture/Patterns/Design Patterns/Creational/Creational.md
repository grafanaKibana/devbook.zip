---
publish: true
created: 2026-07-08T16:14:17.449+03:00
modified: 2026-07-08T16:14:17.450+03:00
published: 2026-07-08T16:14:17.450+03:00
tags:
  - FolderNote
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "3"
priority: High
status: Done
---

# Creational Patterns

Creational patterns abstract the instantiation process, making a system independent of how its objects are created, composed, and represented. They matter because scattered `new` calls couple code to concrete types — a Creational pattern moves that decision to one place, making the system easy to extend without changing client code. Reach for them when object construction logic becomes complex, needs to vary by context, or creates unwanted coupling to a specific class: **Factory Method**, **Abstract Factory**, **Builder**, **Prototype**, and **Singleton**.
