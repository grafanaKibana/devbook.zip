---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Creational patterns abstract object instantiation so a system stays independent of how its objects are created, composed, and represented."
tags: [FolderNote]
level:
  - "3"
priority: High
publish: true
status: Done
---

Creational patterns move object-construction decisions away from the code that uses the result. The pressure is not the `new` keyword itself. It is construction knowledge that is repeated, varies by context, or must preserve an invariant across several objects. Factory Method and Abstract Factory choose implementations, Builder stages complex assembly, Prototype copies an existing configuration, and Singleton constrains lifetime and access.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Patterns at a Glance

The patterns solve different construction problems. The condition in the last column matters more than the pattern name.

| Pattern | Intent | Reach for it when |
| --- | --- | --- |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Factory Method]] | Define an interface for creating an object, but let subclasses decide which concrete class to instantiate. | One product type varies by context, and new variants should arrive as subclasses instead of edits to existing code. |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Abstract Factory]] | Provide an interface for creating **families** of related objects without naming their concrete classes. | Products must stay mutually compatible (a whole Stripe / PayPal provider family swapped together), with new families expected over time. |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Builder]] | Separate construction of a complex object from its representation, assembling it step by step. | Construction needs cross-field validation, computed fields, or a director-driven sequence — beyond what `required` / `init` object initializers cover. |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Prototype]] | Create new objects by copying an existing instance rather than constructing from scratch. | Construction is expensive, or many near-identical variants must be cloned from a template (idiomatically `record with { }`). |
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Singleton]] | Ensure a class has only one instance and give it a single global access point. | Exactly one shared instance should serve the whole application — in modern .NET, prefer `AddSingleton<T>()` over the classical static form. |

# Questions

> [!QUESTION]- How do Factory Method and Abstract Factory differ?
> Factory Method lets a creator subtype choose one product implementation. Abstract Factory is a composed object that supplies several related product types as one family. The former varies a creation step inside inheritance. The latter moves a family choice behind an injected factory.

# References

- [Creational design patterns](https://refactoring.guru/design-patterns/creational-patterns)
