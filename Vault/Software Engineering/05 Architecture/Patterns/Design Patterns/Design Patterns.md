---
topic:
  - Architecture
subtopic:
  - Patterns
tags:
  - FolderNote
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---
# GoF Design Patterns

GoF (Gang of Four) Design Patterns are 23 reusable solutions to recurring object-oriented design problems, first documented in *Design Patterns: Elements of Reusable Object-Oriented Software* (1994) by Gamma, Helm, Johnson, and Vlissides. They provide a shared vocabulary for design intent — when a team says "let's use a Strategy here," everyone immediately understands the tradeoffs without long explanations. Patterns are not copy-paste code; they're templates for solving classes of problems. This section covers all 23 GoF patterns organized by category, each with production C# examples showing the problem without the pattern, the transformation with it, and the .NET built-ins that already implement it — connecting new knowledge to things you use daily.

## The Three Categories

**[[Software Engineering/05 Architecture/Patterns/Design Patterns/Creational/Creational|Creational Patterns]]** (5 patterns) abstract the instantiation process, making systems independent of how objects are created. Reach for them when construction logic becomes complex or needs to vary by context.

**[[Software Engineering/05 Architecture/Patterns/Design Patterns/Structural/Structural|Structural Patterns]]** (7 patterns) deal with how classes and objects compose into larger, flexible structures. Reach for them when you need to adapt incompatible interfaces, wrap objects transparently, or simplify complex subsystems.

**[[Software Engineering/05 Architecture/Patterns/Design Patterns/Behavioral/Behavioral|Behavioral Patterns]]** (11 patterns) are concerned with algorithms and communication between objects. Reach for them when you need to decouple senders from receivers, make algorithms swappable, or orchestrate complex workflows without tight coupling.

## How to Use This Section

Each pattern page shows the same e-commerce scenario coded **without** the pattern — with inline comments highlighting the exact coupling, duplication, or rigidity — then **with** the pattern applied, showing what improved. Every page closes with the .NET framework implementations of that pattern you already use without realising it's a design pattern.

## Questions

> [!QUESTION]- How do you decide which GoF category a pattern belongs to?
> Creational if the problem is about object construction — hiding how, when, or which type to instantiate. Structural if the problem is about composing classes or adapting interfaces into larger, more convenient structures. Behavioral if the problem is about assigning responsibility or defining the communication flow between objects.
> - The category signals intent, not class structure: Proxy (Structural) and Decorator (Structural) look identical structurally but serve different behavioral intents.
> - When in doubt: ask "Is this about *making* objects, *assembling* objects, or *communicating between* objects?"
> - Tradeoff: categories help communicate design intent quickly, but the same structure can serve different intents — always explain the *why*, not just the pattern name.

> [!QUESTION]- When does using a design pattern become an anti-pattern?
> When the variation it enables doesn't exist yet and isn't clearly anticipated. Patterns add abstractions — more classes, more indirection, harder debugging — and abstraction has a cost.
> - Introduce a pattern at the second variation point (rule of three / YAGNI), not speculatively.
> - Most common offenders: Singleton hiding shared mutable state, Factory Method for a class that never has variants, Builder for objects with 2 properties.
> - Tradeoff: patterns pay off over time through extension without modification; they cost upfront in complexity. The break-even is when the second concrete variant appears or when the roadmap makes variation certain.

## References

- [Refactoring.Guru — Design Patterns](https://refactoring.guru/design-patterns) — comprehensive pattern catalog with intent, problem, solution, and C# examples for all 22 GoF patterns (excludes Interpreter).
- [Design Patterns: Elements of Reusable Object-Oriented Software (GoF)](https://www.pearson.com/en-us/subject-catalog/p/design-patterns-elements-of-reusable-object-oriented-software/P200000009480/9780321700698) — the original 1994 book defining all 23 patterns; the authoritative primary source.
- [Martin Fowler — Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/) — enterprise-level pattern catalog extending GoF into application architecture concerns; complements GoF for service and data layer design.
- [Wikipedia — Software design pattern](https://en.wikipedia.org/wiki/Design_pattern) — overview of all 23 GoF patterns with intent summaries, the original categorization table, and historical context.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/Patterns/Patterns|Patterns]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns/GRASP|GRASP]]
<!-- whats-next:end -->
