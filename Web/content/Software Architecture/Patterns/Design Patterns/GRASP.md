---
publish: true
created: 2026-08-20T20:41:15.695Z
modified: 2026-08-20T20:41:15.695Z
published: 2026-08-20T20:41:15.695Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: Nine principles for deciding which class or object should be responsible for a given behavior in object-oriented design.
level:
  - "1"
priority: High
status: Ready to Repeat
---

GRASP (General Responsibility Assignment Software Patterns) is a set of nine responsibility-assignment principles described by Craig Larman. They answer a concrete design question: which object should know, create, coordinate, or vary this behavior?

The principles are heuristics, so they can point in different directions. Information Expert may place behavior beside the data it needs, while Low Coupling may argue against importing a dependency into that object. The design work is choosing which pressure matters at that boundary.

GRASP applies [[Software Design/Paradigms/OOP]] encapsulation and polymorphism to responsibility assignment rather than prescribing a fixed class structure.

# The Nine Principles

**Information Expert** assigns a responsibility to the object that already has the information required to perform it. An `Order` that owns line items can calculate its total without exposing its internals to an `OrderCalculator`.

**Creator** places construction with an object that contains, records, closely uses, or has the initialization data for the new object. `Order` is a natural creator of the line items it owns.

**Controller** receives a system operation at the boundary and coordinates the use case. It represents the system, a subsystem, or a use-case session rather than performing all domain work itself. An MVC controller can play this role, but the UI pattern and the GRASP principle are not identical.

**Low Coupling** favors assignments that limit how many elements depend on each other and how much they know. Adding an interface helps only when it creates a stable boundary. An interface with no real variation merely moves the dependency.

**High Cohesion** keeps an object's responsibilities strongly related. A controller that validates input, calculates prices, writes SQL, and sends email has absorbed several reasons to change.

**Polymorphism** assigns type-dependent behavior to the types that vary. It replaces a conditional owned by an outsider when new variants are expected to keep arriving.

**Pure Fabrication** introduces a non-domain object when no domain concept is a good home for a responsibility. A persistence mapper or email gateway can improve cohesion without pretending to be part of the business model.

**Indirection** inserts an intermediate object so two elements do not depend on each other directly. The extra hop earns its place only when it absorbs a real variation or communication rule.

**Protected Variations** puts a stable boundary around an identified point of change. A payment-provider contract protects domain code when providers genuinely vary. It is speculative overhead when there is one fixed integration with no separate policy.

# Example: Applying Information Expert

```csharp
// BAD: OrderService calculates total by reaching into Order's data
public class OrderService
{
    public decimal CalculateTotal(Order order) =>
        order.LineItems.Sum(li => li.Price * li.Quantity);
}

// GOOD: Order calculates its own total (Information Expert)
public sealed class Order
{
    private readonly List<LineItem> _lineItems = new();

    public decimal Total => _lineItems.Sum(li => li.Price * li.Quantity);
}
```

`Order` owns both the data and the invariant, so the calculation can remain inside its boundary. A separate service becomes justified when the result depends on information or policy outside that boundary.

# Pitfalls

## Treating Information Expert as an Absolute

Putting every calculation on the object that holds the data can produce a domain object that also performs I/O, coordinates other aggregates, or imports infrastructure concerns. Information Expert identifies a strong candidate, not an automatic winner. Keep behavior on `Order` when it depends on `Order` state. Move cross-aggregate policy or external communication behind a separate collaborator.

# Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **Information Expert vs Pure Fabrication** | Put behavior on the class that has the data | Create a service class for the behavior | The rule depends on state and invariants already owned by the object | The work coordinates aggregates or external I/O that does not belong in the domain object |
| **Low Coupling vs Information Expert** | Minimize dependencies via indirection | Assign to the class with the data even if it adds a dependency | When the dependency would cross module or layer boundaries | When the dependency is within the same aggregate and adding indirection adds complexity without benefit |
| **GRASP vs GoF Patterns** | GRASP heuristics for who should own this | GoF patterns for how the collaboration works | Assigning responsibility | Naming a recurring construction, composition, or communication structure |

The better assignment keeps the change-prone rule close to the information it needs without pulling unstable dependencies across a boundary. No single GRASP principle settles every case.

# Example: Polymorphism Replacing Conditionals

```csharp
// BAD: type-switch violates Polymorphism principle
public string GenerateReport(string type, ReportData data) => type switch
{
    "pdf" => GeneratePdf(data),
    "csv" => GenerateCsv(data),
    _ => throw new ArgumentException($"Unknown type: {type}")
};

// GOOD: Polymorphism — each type owns its generation logic
public interface IReportGenerator
{
    string Generate(ReportData data);
}

public sealed class PdfReportGenerator : IReportGenerator
{
    public string Generate(ReportData data) => /* PDF logic */ string.Empty;
}

public sealed class CsvReportGenerator : IReportGenerator
{
    public string Generate(ReportData data) => /* CSV logic */ string.Empty;
}

// Adding a new format = new class, no changes to existing code (Open/Closed)
```

# Questions

> [!QUESTION]- How does Information Expert reduce coupling, and when should another principle override it?
> It places behavior beside the information it needs, so another object does not have to pull data out and reproduce the rule. Low Coupling or Pure Fabrication should override it when that placement would import infrastructure, coordinate other aggregates, or give the object unrelated responsibilities.

> [!QUESTION]- How does GRASP differ from SOLID?
> GRASP focuses on assigning responsibilities among collaborating objects. SOLID describes broader properties of class and dependency design. They overlap around cohesion, coupling, and variation, but GRASP starts with ownership: who should do the work?

# References

- [Applying UML and Patterns](https://www.oreilly.com/library/view/applying-uml-and/0131489062/)
- [GRASP Patterns Explained (Baeldung) — practical walkthrough of all nine GRASP principles with code examples](https://www.baeldung.com/java-grasp-patterns)
