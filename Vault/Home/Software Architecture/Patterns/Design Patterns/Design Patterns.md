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

> [!QUESTION]- How is a GoF category chosen?
> Creational patterns vary how objects come into existence. Structural patterns vary how types or objects are assembled. Behavioral patterns vary responsibility and communication. The category is a recall aid. The pattern's intent still decides whether it fits.

> [!QUESTION]- When does using a design pattern become an anti-pattern?
> When its indirection costs more than the variation it isolates. A Factory Method with one permanent product, a Builder around two independent values, or a Singleton hiding request state adds vocabulary without removing design pressure. Concrete evidence of variation should pay for the abstraction.

> [!QUESTION]- How can two patterns with the same wrapper shape be distinguished?
> Name the responsibility that the wrapper owns. A Decorator adds behavior, a Proxy controls access, and an Adapter translates a contract. Class shape alone cannot identify the pattern because intent and collaboration are part of its definition.

# References

- [Refactoring.Guru design-pattern catalog](https://refactoring.guru/design-patterns)
- [Design Patterns video playlist](https://www.youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/design-patterns-elements-of-reusable-object-oriented-software/P200000009480/9780321700698)
