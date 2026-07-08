---
topic:
  - Architecture
subtopic:
  - Patterns
tags:
  - FolderNote
level:
  - "3"
priority: High
publish: true
status: Done
---
# Creational Patterns

Creational patterns abstract the instantiation process, making a system independent of how its objects are created, composed, and represented. They matter because scattered `new` calls couple code to concrete types — a Creational pattern moves that decision to one place, making the system easy to extend without changing client code. Reach for them when object construction logic becomes complex, needs to vary by context, or creates unwanted coupling to a specific class: **Factory Method**, **Abstract Factory**, **Builder**, **Prototype**, and **Singleton**.
