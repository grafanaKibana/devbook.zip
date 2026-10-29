---
topic: [Software Architecture]
subtopic: [Patterns]
summary: "Creational patterns abstract object instantiation so a system stays independent of how its objects are created, composed, and represented."
tags: [FolderNote]
level: ["3"]
priority: High
publish: true
status: Done
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Creational/Creational"
flashcard_uid: "0bc64c56"
created: "2026-03-05T22:12:32.000Z"
modified: "2026-10-28T12:33:42.000Z"
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
| [[Home/Software Architecture/Patterns/Design Patterns/Creational/Singleton]] | Ensure a class has only one instance and give it a single global access point. | Exactly one shared instance should serve the whole application — in modern .NET, `AddSingleton<T>()` registration is preferred over the classical static form. |

# Questions

<!-- qard-id: 2c7c6f9d-8162-43be-a7f0-4150803dcf65 -->
> [!qard]- How do Factory Method and Abstract Factory differ?
> Both hide which concrete class is created, but they vary different things. Factory Method lets a subclass decide one product by overriding a creation hook, which inherited creator code such as a shared workflow often calls. Abstract Factory is a separate object, given to its client, that creates a whole family of related products that must work together.
>
> | Aspect | Factory Method | Abstract Factory |
> |---|---|---|
> | What varies | One product returned by an overridable creation hook, often used inside a shared workflow, such as the sender a notification workflow uses. | A family of compatible products, such as a whole Stripe or PayPal provider family that is swapped together. |
> | Mechanism | Inheritance: the creator declares an overridable creation hook such as `CreateSender()`, and concrete creators override it to choose the product. This hook is what defines the pattern. | Composition: the client holds a factory object with one creation method per product and calls it without knowing which family it is. |
> | Where creation sits | In the creator's overridable hook. The same creator often also runs code that uses the product, but it need not. | In a dedicated factory, separate from the code that uses the products. |
> | Adding a variant | A new creator subclass overrides the hook to return a new product, leaving any creator code that uses it unchanged. Creator and product hierarchies grow in parallel only when each concrete product gets its own creator subclass. | A new factory implementation supplies a whole new family. Adding a new kind of product to the family changes the factory interface and every family implementation. |
> | What it protects | Creator code that uses the product, when it exists, stays unchanged while one creation decision varies. | Products obtained from one factory belong to the same family, as long as each factory creates only matching products. |
>
> When neither a subclass-overridable creation hook nor a product family is needed, a standalone factory function is usually smaller than both.
>
> [GoF: Design Patterns: Elements of Reusable Object-Oriented Software](https://cs.gonzaga.edu/faculty/crandall/misc/GoF.pdf) · [GoF: Abstract Factory (InformIT excerpt)](https://www.informit.com/articles/article.aspx?p=1398599) · [[Home/Software Architecture/Patterns/Design Patterns/Creational/Factory Method#Solution|Factory Method solution]] · [[Home/Software Architecture/Patterns/Design Patterns/Creational/Abstract Factory#Solution|Abstract Factory solution]] · [[Home/Software Architecture/Patterns/Design Patterns/Creational/Creational#Patterns at a Glance|Creational patterns at a glance]]

# References

- [Creational design patterns](https://refactoring.guru/design-patterns/creational-patterns)
