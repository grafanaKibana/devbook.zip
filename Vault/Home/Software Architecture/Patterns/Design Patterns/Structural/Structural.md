---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Structural patterns compose classes and objects into flexible larger structures via inheritance and composition."
tags: [FolderNote]
level:
  - "3"
priority: High
publish: true
status: Done
---

Structural patterns organize relationships between objects. They solve different boundary problems: incompatible interfaces, recursive part-whole trees, independently changing dimensions, layered behavior, simplified subsystem access, shared intrinsic state, and controlled access. The right pattern follows from the relationship that must remain stable.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Patterns at a Glance

These patterns can share nearly identical class diagrams while serving different intents. Decorator and Proxy both wrap an interface. Adapter and Facade both sit at a boundary. Selection depends on whether the design needs translation, simplification, behavior, access control, hierarchy, independent variation, or memory sharing. Several may coexist in one system.

| Pattern | Intent | Reach for it when |
| --- | --- | --- |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Adapter]] | Translate an existing interface into the contract a client expects. | A legacy or third-party API cannot be changed, but the client requires another shape. |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Bridge]] | Separate an abstraction from its implementation so both dimensions can vary. | Two independent dimensions would otherwise produce an N×M set of classes. |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Composite]] | Represent part-whole trees through one component interface. | Clients should apply the same operation to a leaf or a group. |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Decorator]] | Add behavior through same-interface wrappers. | Optional behaviors need explicit composition without subclassing. |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Facade]] | Present a high-level entry point over a complex subsystem. | Several clients repeat the same subsystem workflow. |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Flyweight]] | Share immutable intrinsic state across many fine-grained objects. | Retained duplicate state is a measured memory cost. |
| [[Home/Software Architecture/Patterns/Design Patterns/Structural/Proxy]] | Control access through a same-interface surrogate. | Access must be deferred, cached, authorized, or made remote without changing clients. |

# Questions

> [!QUESTION]- Decorator and Proxy can have the same class structure. What determines which pattern is present?
> Intent. A Decorator adds composable behavior to an object. A Proxy controls access to another object, perhaps by deferring creation or enforcing authorization. The wrapper's responsibility and the reason it exists matter more than the diagram.

# References

- [Structural Patterns (Refactoring Guru)](https://refactoring.guru/design-patterns/structural-patterns)
