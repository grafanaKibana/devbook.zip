---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "23 reusable object-oriented solutions to recurring design problems, giving teams a shared vocabulary for design intent and tradeoffs."
tags: [FolderNote]
priority: High
publish: true
level:
  - "3"
status: Done
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Design Patterns"
flashcard_uid: "ddaa5e07"
---

The Gang of Four catalog names 23 recurring object-oriented design problems and the collaborations that address them. A pattern communicates intent and consequences. It is not a ready-made class diagram. Strategy says that an algorithm varies behind a stable contract, while Observer says that an unknown set of dependents receives notifications. The name is useful only when that pressure exists in the code.

The catalog groups patterns by what varies. Creational patterns move construction decisions, structural patterns compose objects and interfaces, and behavioral patterns assign work or communication. The categories help with recall, but intent decides the pattern.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choose a Pattern by Intent and Cost

Start from the pressure in the code. Introduce the smallest pattern that makes a real variation or responsibility boundary explicit, then keep the condition that would justify deleting it.

| Pressure | Candidate | What it buys | What it costs | Reject it when |
|---|---|---|---|---|
| Construction selects among related product families | [[Home/Software Architecture/Patterns/Design Patterns/Creational/Abstract Factory]] | Keeps compatible products and construction policy together | Factory interfaces multiply with product families | There is one concrete family |
| Construction has many ordered or optional inputs | [[Home/Software Architecture/Patterns/Design Patterns/Creational/Builder]] | Names construction steps and protects invariants | Extra builder type and duplicated API surface | A constructor or options record stays readable |
| Existing interface does not match a consumer | [[Home/Software Architecture/Patterns/Design Patterns/Structural/Adapter]] | Localizes translation at one boundary | Another abstraction to test and maintain | Both sides are controlled and their contracts can be aligned directly |
| Add behavior around one object without subclass combinations | [[Home/Software Architecture/Patterns/Design Patterns/Structural/Decorator]] | Composes responsibilities at runtime | Nested wrappers obscure execution order | One direct implementation has no meaningful variants |
| Choose one interchangeable algorithm | [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy]] | Makes policy selection explicit and testable | More types or delegates | A small conditional is stable and clearer |
| Notify unknown dependents about state changes | [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer]] | Decouples publisher from subscriber set | Ordering, lifetime, and error handling become indirect | There is one required caller that should invoke directly |
| Encapsulate a request for queuing, undo, or dispatch | [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command]] | Turns an operation into data with explicit execution | Boilerplate around simple method calls | No delayed, logged, retried, or reversible execution exists |

Similar structure does not imply the same pattern. Proxy and Decorator both wrap an interface, but Proxy controls access while Decorator adds responsibility. State and Strategy both delegate behavior. State changes from inside the context, while a client selects a Strategy as policy. If the variation disappears, collapse the abstraction.

# Questions

<!-- qard-id: 8c5c7210-03f3-4e93-a3d4-c5db11cfc871 -->
> [!qard]- How is a GoF category chosen?
> Creational patterns organize object creation; structural patterns organize how objects or types are composed; behavioral patterns organize responsibility and communication. These labels help recall the catalog, but the concrete design problem and pattern intent determine fit. [GoF: Design Patterns](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)

<!-- qard-id: 374c4c3e-1864-4454-84c3-32aa6dac7319 -->
> [!qard]- When does using a design pattern become an anti-pattern?
> A pattern becomes harmful when its indirection costs more than the variation or change pressure it isolates. A permanent single product or a trivial construction sequence may not justify extra types. Look for actual variation, repeated decisions, or a boundary the abstraction protects; no pattern name alone pays for its complexity. [GoF: Design Patterns](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)

<!-- qard-id: f29d53c2-0b44-4cdf-9181-ab4e4a3c89f1 -->
> [!qard]- How do Adapter, Decorator, and Proxy differ despite their similar wrapper shape?
> An Adapter translates an incompatible contract into the one a client expects. A Decorator preserves an interface while adding behavior. A Proxy preserves an interface while controlling access to the underlying object. The wrapper’s responsibility—not its class shape—distinguishes them. [[Home/Software Architecture/Patterns/Design Patterns/Design Patterns#Choose a Pattern by Intent and Cost|Choose a pattern by intent and cost]]

# References

- [Refactoring.Guru design-pattern catalog](https://refactoring.guru/design-patterns)
- [Design Patterns video playlist](https://www.youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/design-patterns-elements-of-reusable-object-oriented-software/P200000009480/9780321700698)
