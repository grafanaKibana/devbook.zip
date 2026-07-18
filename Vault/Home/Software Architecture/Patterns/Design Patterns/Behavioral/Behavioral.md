---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Behavioral patterns assign responsibilities and coordinate communication between objects without tightly coupling them."
tags:
  - FolderNote
level:
  - "3"
priority: High
publish: true
status: Done
---
Behavioral patterns are concerned with algorithms and the assignment of responsibilities between objects — they describe not just patterns of objects and classes, but also the patterns of communication between them. They shift focus from flow control to collaboration, letting you compose behaviors without tightly coupling senders to receivers, algorithms to clients, or event producers to consumers. Reach for them when you need to orchestrate complex workflows, decouple notifications, make algorithms swappable at runtime, or traverse complex structures: **Chain of Responsibility**, **Command**, **Iterator**, **Mediator**, **Memento**, **Observer**, **State**, **Strategy**, **Template Method**, **Visitor**, **Interpreter**.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Patterns at a Glance

What unites the behavioral patterns is *how responsibility and communication are distributed* between objects. This is a catalog of intents, not a ranking — most compose freely.

| Pattern | Intent | Reach for it when |
| --- | --- | --- |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Chain of Responsibility]] | Pass a request along a chain of handlers, each choosing to handle it or forward it | Several objects might handle a request and the handler isn't known in advance (middleware, escalation) |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command]] | Encapsulate a request as an object bundling action, parameters, and receiver | You need to queue, log, undo/redo, or replay operations |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Interpreter]] | Define a grammar and an interpreter that evaluates sentences of a language | You have a simple, stable language to evaluate (rules, expressions, DSLs) |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Iterator]] | Provide sequential access to a collection's elements without exposing its structure | Clients must traverse a collection without depending on its internal representation |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Mediator]] | Centralize how a set of components interact, replacing a many-to-many web with one-to-many routing | Objects communicate in complex ways and direct references have become tangled |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Memento]] | Capture and externalize an object's state so it can be restored later, without breaking encapsulation | You need snapshots for undo, checkpoints, or rollback |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer]] | Define a one-to-many dependency so a subject's change notifies all subscribers | State changes in one object must fan out to many decoupled listeners (events) |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State]] | Extract state-specific behavior into classes; the context delegates to its current state | Behavior changes with an internal mode and you want to avoid sprawling conditionals |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy]] | Define a family of interchangeable algorithms behind a common interface | You want to swap an algorithm at runtime, chosen by the client |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Template Method]] | Define an algorithm's skeleton in a base class, letting subclasses override specific steps | Multiple variants share a fixed overall structure but differ in individual steps |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Visitor]] | Add new operations to an object hierarchy without modifying its classes, via double dispatch | You add operations often but change the class hierarchy rarely |

# References

- [Behavioral Patterns (Refactoring Guru)](https://refactoring.guru/design-patterns/behavioral-patterns) — example-driven walkthrough of each behavioral pattern's intent, structure, and trade-offs.
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/Gamma-Design-Patterns-Elements-of-Reusable-Object-Oriented-Software/P200000009480/9780321700698) — the original Gang of Four catalog defining behavioral pattern intent, structure, collaboration, and consequences.
