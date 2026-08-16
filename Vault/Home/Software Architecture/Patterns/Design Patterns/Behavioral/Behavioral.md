---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Behavioral patterns assign responsibilities and coordinate communication between objects without tightly coupling them."
tags: [FolderNote]
level:
  - "3"
priority: High
publish: true
status: Done
---

Behavioral patterns decide where work belongs and how objects pass control between one another. A sender need not know the receiver, a client need not own every algorithm, and a publisher need not depend on every subscriber. The patterns make those collaborations explicit.

The catalog covers request pipelines, deferred operations, traversal, coordination, snapshots, notifications, state-dependent behavior, interchangeable algorithms, fixed workflows, operations over object structures, and small languages. The names differ, but each pattern answers the same practical question: which object owns the next decision?

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Patterns at a Glance

The patterns are grouped by intent, not by quality or complexity. Several often appear in one design because they solve different parts of the same interaction.

| Pattern | Intent | Reach for it when |
| --- | --- | --- |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Chain of Responsibility]] | Pass a request along a chain of handlers, each choosing to handle it or forward it | Several objects might handle a request and the handler isn't known in advance (middleware, escalation) |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command]] | Encapsulate a request as an object bundling action, parameters, and receiver | Operations need queuing, logging, undo/redo, or replay |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Interpreter]] | Define a grammar and an interpreter that evaluates sentences of a language | A simple, stable language needs evaluation (rules, expressions, DSLs) |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Iterator]] | Provide sequential access to a collection's elements without exposing its structure | Clients must traverse a collection without depending on its internal representation |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Mediator]] | Centralize how a set of components interact, replacing a many-to-many web with one-to-many routing | Objects communicate in complex ways and direct references have become tangled |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Memento]] | Capture and externalize an object's state so it can be restored later, without breaking encapsulation | Snapshots are needed for undo, checkpoints, or rollback |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer]] | Define a one-to-many dependency so a subject's change notifies all subscribers | State changes in one object must fan out to many decoupled listeners (events) |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/State]] | Extract state-specific behavior into classes. The context delegates to its current state | Behavior changes with an internal mode and sprawling conditionals obscure the transitions |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy]] | Define a family of interchangeable algorithms behind a common interface | The client must select or swap an algorithm at runtime |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Template Method]] | Define an algorithm's skeleton in a base class, letting subclasses override specific steps | Multiple variants share a fixed overall structure but differ in individual steps |
| [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Visitor]] | Add new operations to an object hierarchy without modifying its classes, via double dispatch | Operations change often while the class hierarchy changes rarely |

# References

- [Behavioral design patterns](https://refactoring.guru/design-patterns/behavioral-patterns)
