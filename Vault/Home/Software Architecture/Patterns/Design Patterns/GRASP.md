---
topic: [Software Architecture]
subtopic: [Patterns]
summary: "Nine principles for deciding which class or object should be responsible for a given behavior in object-oriented design."
level: ["1"]
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Design Patterns/GRASP"
flashcard_uid: "216293bb"
---

GRASP (General Responsibility Assignment Software Patterns) is a set of nine responsibility-assignment principles described by Craig Larman. They answer a concrete design question: which object should know, create, coordinate, or vary this behavior?

The principles are heuristics, so they can point in different directions. Information Expert may place behavior beside the data it needs, while Low Coupling may argue against importing a dependency into that object. The design work is choosing which pressure matters at that boundary.

GRASP applies [[Home/Software Design/Paradigms/OOP]] encapsulation and polymorphism to responsibility assignment rather than prescribing a fixed class structure.

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

Putting every calculation on the object that holds the data can produce a domain object that also performs I/O, coordinates other aggregates, or imports infrastructure concerns. Information Expert identifies a strong candidate, not an automatic winner. Behavior that depends on `Order` state stays on `Order`. Cross-aggregate policy or external communication belongs behind a separate collaborator.

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

<!-- qard-id: 71b3b8bb-0597-491f-99ec-b6c24e7cf3ed -->
> [!qard]- How does Information Expert reduce coupling, and when should another principle override it?
> Information Expert assigns a responsibility to the object that already holds the information needed to perform it. This reduces coupling because callers no longer reach into that object's data to apply its rule themselves. They depend only on the result, and the rule lives in one place instead of being duplicated by each caller.
>
> **Example:** `Order` owns its line items, so `Order.Total` calculates the total. An `OrderService` that summed `order.LineItems` itself would depend on the internal structure of `Order`, and other callers could repeat the same calculation.
>
> Information Expert identifies a strong candidate, not an automatic winner. Another principle should prevail when keeping the behavior on the data holder would:
>
> - **Pull infrastructure into a domain object:** behavior that needs I/O, such as persistence or sending email, belongs in a separate collaborator. Pure Fabrication justifies such a non-domain object, for example a mapper or a gateway.
> - **Coordinate several aggregates:** a policy that needs information beyond one object's boundary fits a separate collaborator that coordinates them.
> - **Add a dependency across a module or layer boundary:** Low Coupling favors keeping that dependency out of the object, even though the object has the data.
> - **Give the object unrelated responsibilities:** High Cohesion favors keeping its responsibilities closely related.
> 
> Behavior that depends only on the object's own state and invariants stays with that object.
>
> [Craig Larman: Applying UML and Patterns, Information Expert (sample chapter)](https://www.informit.com/content/images/0130925691/samplechapter/0130925691.pdf) · [[Home/Software Architecture/Patterns/Design Patterns/GRASP#The Nine Principles|GRASP principles]] · [[Home/Software Architecture/Patterns/Design Patterns/GRASP#Treating Information Expert as an Absolute|Information Expert limits]] · [[Home/Software Architecture/Patterns/Design Patterns/GRASP#Tradeoffs|GRASP tradeoffs]]

<!-- qard-id: 0743ad5d-e901-45e4-8fc2-a194248e031c -->
> [!qard]- How does GRASP differ from SOLID?
> GRASP and SOLID start from different questions. GRASP, described by Craig Larman, asks which object should own a responsibility: knowing, creating, coordinating or varying a behavior. SOLID asks whether classes, interfaces and their dependencies are shaped so that change stays contained.
>
> | Aspect | GRASP | SOLID |
> |---|---|---|
> | Starting question | Which object should be responsible for this behavior? | Are this class's responsibilities, interfaces, inheritance and dependency direction designed so that change stays contained? |
> | Focus | Assigning responsibilities among collaborating objects while designing how they work together. | Properties of individual classes and interfaces and the direction of dependencies between them. |
> | Content | Nine heuristics: Information Expert, Creator, Controller, Low Coupling, High Cohesion, Polymorphism, Pure Fabrication, Indirection, Protected Variations. | Five principles: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. |
> | Typical decision | `Order` creates its line items and calculates its own total, because it holds that data. | A class that changes for several unrelated reasons is split, or high-level code depends on an abstraction rather than a concrete detail. |
>
> The two overlap in their goals: low coupling, high cohesion and protection from expected variation. For example, Polymorphism and Protected Variations in GRASP pursue the same goal as Open/Closed in SOLID. They complement each other: GRASP helps decide where behavior goes, and SOLID helps check the shape of the resulting classes and dependencies.
>
> [Craig Larman: Applying UML and Patterns (sample chapter)](https://www.informit.com/content/images/0130925691/samplechapter/0130925691.pdf) · [Robert C. Martin: SOLID course notes](https://cleancoder.com/files/solid.md) · [[Home/Software Architecture/Patterns/Design Patterns/GRASP#The Nine Principles|GRASP principles]] · [[Home/Software Architecture/Patterns/Design Patterns/GRASP#Tradeoffs|GRASP tradeoffs]] · [[Home/Software Design/Principles/SOLID|SOLID principles]]

# References

- [Applying UML and Patterns](https://www.oreilly.com/library/view/applying-uml-and/0131489062/)
