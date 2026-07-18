---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "23 reusable object-oriented solutions to recurring design problems, giving teams a shared vocabulary for design intent and tradeoffs."
tags:
  - FolderNote
priority: High
publish: true
level:
  - "3"
status: Done
---
# Intro

GoF (Gang of Four) Design Patterns are 23 reusable solutions to recurring object-oriented design problems, first documented in *Design Patterns: Elements of Reusable Object-Oriented Software* (1994) by Gamma, Helm, Johnson, and Vlissides. They provide a shared vocabulary for design intent — when a team says "let's use a Strategy here," everyone immediately understands the tradeoffs without long explanations. Patterns are not copy-paste code; they're templates for solving classes of problems. This section covers all 23 GoF patterns organized by category, each with production C# examples showing the problem without the pattern, the transformation with it, and the .NET built-ins that already implement it — connecting new knowledge to things you use daily.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Choose a pattern by intent and cost

Start from the pressure in the code, not a pattern name. Introduce the smallest pattern that makes a real variation or responsibility boundary explicit.

| Pressure | Candidate | What it buys | What it costs | Reject it when |
|---|---|---|---|---|
| Construction selects among related product families | [[Abstract Factory]] | Keeps compatible products and construction policy together | Factory interfaces multiply with product families | There is one concrete family |
| Construction has many ordered or optional inputs | [[Builder]] | Names construction steps and protects invariants | Extra builder type and duplicated API surface | A constructor or options record stays readable |
| Existing interface does not match a consumer | [[Adapter]] | Localizes translation at one boundary | Another abstraction to test and maintain | You control both sides and can align the contract directly |
| Add behavior around one object without subclass combinations | [[Decorator]] | Composes responsibilities at runtime | Nested wrappers obscure execution order | One direct implementation has no meaningful variants |
| Choose one interchangeable algorithm | [[Strategy]] | Makes policy selection explicit and testable | More types or delegates | A small conditional is stable and clearer |
| Notify unknown dependents about state changes | [[Observer]] | Decouples publisher from subscriber set | Ordering, lifetime, and error handling become indirect | There is one required caller that should invoke directly |
| Encapsulate a request for queuing, undo, or dispatch | [[Command]] | Turns an operation into data with explicit execution | Boilerplate around simple method calls | No delayed, logged, retried, or reversible execution exists |

Patterns can share structure while serving different intent. Proxy and Decorator both wrap an interface, but Proxy controls access to another object while Decorator adds responsibility. State and Strategy both delegate behavior, but State transitions internally while Strategy is selected as a policy. Name the intent and deletion condition in the design review; if the second variation disappears, collapse the abstraction.

## Questions

> [!QUESTION]- How do you decide which GoF category a pattern belongs to?
> Creational if the problem is about object construction — hiding how, when, or which type to instantiate. Structural if the problem is about composing classes or adapting interfaces into larger, more convenient structures. Behavioral if the problem is about assigning responsibility or defining the communication flow between objects.
> - The category signals intent, not class structure: Proxy (Structural) and Decorator (Structural) look identical structurally but serve different behavioral intents.
> - When in doubt: ask "Is this about *making* objects, *assembling* objects, or *communicating between* objects?"
> - Tradeoff: categories help communicate design intent quickly, but the same structure can serve different intents — always explain the *why*, not just the pattern name.

> [!QUESTION]- When does using a design pattern become an anti-pattern?
> When the variation it enables doesn't exist yet and isn't clearly anticipated. Patterns add abstractions — more classes, more indirection, harder debugging — and abstraction has a cost.
> - The Rule of Three normally tolerates one duplication and refactors when a third concrete occurrence confirms a stable pattern; a measured earlier boundary can still justify action.
> - Most common offenders: Singleton hiding shared mutable state, Factory Method for a class that never has variants, Builder for objects with 2 properties.
> - Tradeoff: patterns pay off through repeated variation but cost upfront complexity. Refactor when recurring evidence makes the abstraction cheaper than another duplication, not merely because a second example exists.

## References

- [Design Patterns playlist by Christopher Okharavi](https://www.youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc) — must watch playlist for the design patterns.
- [Refactoring.Guru — Design Patterns](https://refactoring.guru/design-patterns) — comprehensive pattern catalog with intent, problem, solution, and C# examples for 22 GoF patterns (excludes Interpreter).
- [Design Patterns: Elements of Reusable Object-Oriented Software (GoF)](https://www.pearson.com/en-us/subject-catalog/p/design-patterns-elements-of-reusable-object-oriented-software/P200000009480/9780321700698) — the original 1994 book defining all 23 patterns; the authoritative primary source.
- [Martin Fowler — Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/) — enterprise-level pattern catalog extending GoF into application architecture concerns; complements GoF for service and data layer design.
- [Wikipedia — Software design pattern](https://en.wikipedia.org/wiki/Design_pattern) — overview of all 23 GoF patterns with intent summaries, the original categorization table, and historical context.
- [18 key design patterns every developer should know -- ByteByteGo intent cards used as a discovery index; consult the GoF catalog above for complete contracts and tradeoffs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/18-key-design-patterns-every-developer-should-know.md)
