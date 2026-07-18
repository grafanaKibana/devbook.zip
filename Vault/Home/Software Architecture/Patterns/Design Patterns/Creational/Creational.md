---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Creational patterns abstract object instantiation so a system stays independent of how its objects are created, composed, and represented."
tags:
  - FolderNote
level:
  - "3"
priority: High
publish: true
status: Done
---
Creational patterns abstract the instantiation process, making a system independent of how its objects are created, composed, and represented. They matter because scattered `new` calls couple code to concrete types — a Creational pattern moves that decision to one place, making the system easy to extend without changing client code. Reach for them when object construction logic becomes complex, needs to vary by context, or creates unwanted coupling to a specific class: **Factory Method**, **Abstract Factory**, **Builder**, **Prototype**, and **Singleton**.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Patterns at a Glance

These are a catalog, not competing choices — every creational pattern decouples *how* an object is built from the code that *uses* it, but each targets a different construction problem. Use this as an intent cheat-sheet, not a ranking.

| Pattern | Intent | Reach for it when |
| --- | --- | --- |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Factory Method]] | Define an interface for creating an object, but let subclasses decide which concrete class to instantiate. | You create **one** product type whose concrete class varies by context, and want new variants added as subclasses instead of edits to existing code. |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Abstract Factory]] | Provide an interface for creating **families** of related objects without naming their concrete classes. | Products must stay mutually compatible (a whole Stripe / PayPal provider family swapped together) and you expect new families over time. |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Builder]] | Separate construction of a complex object from its representation, assembling it step by step. | Construction needs cross-field validation, computed fields, or a director-driven sequence — beyond what `required` / `init` object initializers cover. |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Prototype]] | Create new objects by copying an existing instance rather than constructing from scratch. | Construction is expensive, or you need many near-identical variants cloned from a template (idiomatically `record with { }`). |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Singleton]] | Ensure a class has only one instance and give it a single global access point. | Exactly one shared instance should serve the whole application — in modern .NET, prefer `AddSingleton<T>()` over the classical static form. |

# References

- [Creational Patterns (Refactoring Guru)](https://refactoring.guru/design-patterns/creational-patterns) — example-driven walkthrough of each creational pattern's intent, structure, and trade-offs.
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/Gamma-Design-Patterns-Elements-of-Reusable-Object-Oriented-Software/P200000009480/9780321700698) — the original Gang of Four catalog defining creational pattern intent, structure, collaboration, and consequences.
