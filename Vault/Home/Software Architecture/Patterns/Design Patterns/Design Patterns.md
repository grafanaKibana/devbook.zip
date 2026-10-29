---
topic: [Software Architecture]
subtopic: [Patterns]
summary: "23 reusable object-oriented solutions to recurring design problems, giving teams a shared vocabulary for design intent and tradeoffs."
tags: [FolderNote]
priority: High
publish: true
level: ["3"]
status: Done
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/Design Patterns"
flashcard_uid: "ddaa5e07"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

The Gang of Four catalog names 23 recurring object-oriented design problems and the collaborations that address them. A pattern communicates intent and consequences. It is not a ready-made class diagram. Strategy says that an algorithm varies behind a stable contract, while Observer says that an unknown set of dependents receives notifications. The name is useful only when that pressure exists in the code.

The catalog groups patterns by what varies. Creational patterns move construction decisions, structural patterns compose objects and interfaces, and behavioral patterns assign work or communication. The categories help with recall, but intent decides the pattern.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choose a Pattern by Intent and Cost

Pattern selection starts from the pressure in the code. The smallest pattern that makes a real variation or responsibility boundary explicit is the candidate, and the condition that would justify deleting it is kept with that decision.

| Pressure | Candidate | What it buys | What it costs | Reject it when |
|---|---|---|---|---|
| Construction selects among related product families | [[Home/Software Architecture/Patterns/Design Patterns/Creational/Abstract Factory]] | Keeps compatible products and construction policy together | Each new family adds a concrete factory; each new product kind adds a product interface and an abstract-factory operation that every concrete factory must implement | There is one concrete family |
| Construction has many ordered or optional inputs | [[Home/Software Architecture/Patterns/Design Patterns/Creational/Builder]] | Names construction steps and protects invariants | Extra builder type and duplicated API surface | A constructor or options record stays readable |
| Existing interface does not match a consumer | [[Home/Software Architecture/Patterns/Design Patterns/Structural/Adapter]] | Localizes translation at one boundary | Another abstraction to test and maintain | Both sides are controlled and their contracts can be aligned directly |
| Add behavior around one object without subclass combinations | [[Home/Software Architecture/Patterns/Design Patterns/Structural/Decorator]] | Composes responsibilities at runtime | Nested wrappers obscure execution order | One direct implementation has no meaningful variants |
| Choose one interchangeable algorithm | [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Strategy]] | Makes policy selection explicit and testable | More types or delegates | A small conditional is stable and clearer |
| Notify unknown dependents about state changes | [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer]] | Decouples publisher from subscriber set | Ordering, lifetime, and error handling become indirect | There is one required caller that should invoke directly |
| Encapsulate a request for queuing, undo, or dispatch | [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Command]] | Turns an operation into data with explicit execution | Boilerplate around simple method calls | No delayed, logged, retried, or reversible execution exists |

Similar structure does not imply the same pattern. Proxy and Decorator both wrap an interface, but Proxy controls access while Decorator adds responsibility. State and Strategy both delegate behavior. They differ by intent rather than by who selects the delegate: State transitions may be defined by the context or by the concrete states, while a client usually supplies a Strategy as policy. When the variation disappears, the abstraction no longer earns its cost and can be collapsed.

# Questions

> [!qard]- What is a design pattern?
> A design pattern is a named, reusable solution to a recurring design problem. It describes the problem, how a set of objects collaborates to address it, and the consequences of using it. It is not ready-made code or a fixed class diagram.
>
> - **Name:** a shared word for the design. Saying Strategy communicates that an algorithm varies behind a stable contract.
> - **Problem:** the pressure the pattern responds to, such as an unknown set of dependents that must be notified of state changes (Observer).
> - **Solution:** the roles and their collaboration, adapted to each codebase rather than copied literally.
> - **Consequences:** what the pattern buys, such as replaceable behavior, and what it costs, such as extra types and indirection.
> 
> The best-known catalog is the Gang of Four book, which describes 23 object-oriented patterns grouped as creational, structural and behavioral. A pattern is justified only when its problem actually exists in the code; otherwise its indirection is pure cost.
>
> [GoF: Design Patterns: Elements of Reusable Object-Oriented Software](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/) · [[Home/Software Architecture/Patterns/Design Patterns/Design Patterns|Design Patterns overview]] · [[Home/Software Architecture/Patterns/Design Patterns/Design Patterns#Choose a Pattern by Intent and Cost|Choose a pattern by intent and cost]]

<!-- qard-id: 8c5c7210-03f3-4e93-a3d4-c5db11cfc871 -->
> [!qard]- How do the GoF categories (creational, structural, behavioral) relate to choosing a design pattern?
> The three categories group the GoF patterns by the kind of problem they address. They narrow where to look, but the concrete design pressure and each pattern's intent decide which pattern fits.
>
> | Category | Problem it addresses | Examples |
> |---|---|---|
> | Creational | Where construction decisions live: which concrete class is created, how a complex object is assembled, or how instances are copied or limited. | Factory Method, Abstract Factory, Builder, Prototype, Singleton |
> | Structural | How objects and types are composed into larger structures, and how interfaces are adapted or wrapped. | Adapter, Composite, Decorator, Facade, Proxy |
> | Behavioral | How responsibilities and communication are distributed among objects. | Strategy, Observer, Command, State, Template Method |
>
> A category alone cannot decide, because patterns with a similar structure serve different intents. State and Strategy both delegate behavior to another object, but they differ by intent rather than by who selects the delegate: State lets behavior follow the context's current state, with transitions defined by the context or by the state objects, while Strategy makes an interchangeable algorithm a policy that a client usually supplies. The useful starting point is the pressure in the code, such as an algorithm that must vary or an interface that does not match. The pattern whose intent addresses that pressure is the candidate.
>
> [GoF: Design Patterns: Elements of Reusable Object-Oriented Software](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/) · [[Home/Software Architecture/Patterns/Design Patterns/Creational/Creational#Patterns at a Glance|Creational patterns at a glance]] · [[Home/Software Architecture/Patterns/Design Patterns/Design Patterns#Choose a Pattern by Intent and Cost|Choose a pattern by intent and cost]]

<!-- qard-id: 374c4c3e-1864-4454-84c3-32aa6dac7319 -->
> [!qard]- When does using a design pattern become an anti-pattern?
> A pattern becomes an anti-pattern when the indirection it adds costs more than the variation or responsibility boundary it protects. The pattern name alone never pays for the extra complexity.
>
> Every pattern adds cost:
>
> - more types or delegates to read and maintain
> - an extra hop between a caller and the behavior
> - execution order, lifetime or error handling that becomes harder to follow
> 
> Typical signs that the cost is not repaid:
>
> - **No real variation:** an Abstract Factory with only one product family, or a Strategy replacing a small conditional that is stable and clearer.
> - **Trivial construction:** a Builder around values that a readable constructor or options record already handles.
> - **No boundary to protect:** an Adapter between two contracts that the same team controls and could simply align.
> - **Flexibility nobody uses:** a Command wrapper where nothing is delayed, logged, retried or undone, or an Observer with one required dependent that could be called directly.
> 
> When the variation that justified a pattern disappears, collapsing the abstraction back into direct code removes its cost.
>
> [GoF: Design Patterns: Elements of Reusable Object-Oriented Software](https://cs.gonzaga.edu/faculty/crandall/misc/GoF.pdf) · [[Home/Software Architecture/Patterns/Design Patterns/Design Patterns#Choose a Pattern by Intent and Cost|Choose a pattern by intent and cost]]

<!-- qard-id: f29d53c2-0b44-4cdf-9181-ab4e4a3c89f1 -->
> [!qard]- How do Adapter, Decorator, and Proxy differ despite their similar wrapper shape?
> An object Adapter, a Decorator and a Proxy all wrap another object, but for different reasons. An Adapter translates an incompatible contract into the one a client expects. A Decorator keeps the same interface and adds behavior. A Proxy keeps the same interface and controls access to the real object. A class Adapter adapts through inheritance instead of wrapping an object, so the wrapper comparison describes the object form.
>
> | Aspect | Object Adapter | Decorator | Proxy |
> |---|---|---|---|
> | Interface toward the client | A different interface from the wrapped object's: the one the client expects. | The same interface as the wrapped object. | The same interface as the real object. |
> | Responsibility | Translating calls and data between two incompatible contracts at one boundary. | Adding a responsibility around the call. Several decorators can be stacked at runtime, and their order affects behavior. | Deciding whether, when or how a call reaches the real object. |
> | Effect on a call | It is converted into the wrapped object's operations, and results are converted back. | It normally reaches the wrapped object, with extra behavior before or after. | It may be forwarded, deferred or refused according to the access rule. |
>
> Because their class shapes look alike, the wrapper's responsibility, not its structure, identifies the pattern.
>
> [GoF: Design Patterns: Elements of Reusable Object-Oriented Software](https://cs.gonzaga.edu/faculty/crandall/misc/GoF.pdf) · [GoF: Adapter (InformIT excerpt)](https://www.informit.com/articles/article.aspx?p=1398600) · [[Home/Software Architecture/Patterns/Design Patterns/Design Patterns#Choose a Pattern by Intent and Cost|Choose a pattern by intent and cost]]

# References

- [Refactoring.Guru design-pattern catalog](https://refactoring.guru/design-patterns)
- [Design Patterns video playlist](https://www.youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc)
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/design-patterns-elements-of-reusable-object-oriented-software/P200000009480/9780321700698)
