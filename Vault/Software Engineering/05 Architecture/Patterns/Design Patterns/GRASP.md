---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "1"
priority: High
status: Creation
dg-publish: true
---

# GRASP

GRASP (General Responsibility Assignment Software Patterns) is a set of nine principles for deciding which class or object should be responsible for a given behavior. Introduced by Craig Larman, GRASP answers the question "who should do this?" in object-oriented design. The principles don't prescribe specific class structures — they provide heuristics for assigning responsibilities in a way that keeps designs cohesive, loosely coupled, and understandable.

## The Nine Principles

**Information Expert** — assign responsibility to the class that has the information needed to fulfill it. If `Order` knows its line items and prices, `Order` should calculate its total — not a separate `OrderCalculator`.

**Creator** — assign responsibility for creating an object to the class that aggregates, contains, or closely uses it. `Order` creates `LineItem` objects because it contains them.

**Controller** — assign responsibility for handling system events to a class that represents the overall system or a use-case scenario. In MVC, the Controller receives HTTP requests and delegates to domain objects.

**Low Coupling** — assign responsibilities to minimize dependencies between classes. A class with many dependencies is hard to change, test, and reuse. Prefer injecting abstractions over concrete types.

**High Cohesion** — assign responsibilities so that each class has a focused, related set of behaviors. A class that does too many unrelated things is hard to understand and maintain.

**Polymorphism** — when behavior varies by type, assign responsibility to the type using polymorphism rather than conditional logic. Replace `if (type == "pdf") ... else if (type == "csv") ...` with an `IReportGenerator` interface and type-specific implementations.

**Pure Fabrication** — when no domain class is a natural fit for a responsibility, create a service class (a "fabrication") to hold it. `EmailSender` is not a domain concept but is a valid place to put email-sending logic.

**Indirection** — assign responsibility to an intermediate object to decouple two components. A message broker between services is an indirection that prevents direct coupling.

**Protected Variations** — identify points of variation and assign responsibilities to create a stable interface around them. If the payment provider might change, hide it behind `IPaymentGateway` so the rest of the system is protected from that variation.

## Example: Applying Information Expert

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

The `Order` class has the information (line items, prices, quantities) — it should own the calculation.

## Pitfalls

### Misapplying Information Expert (Anemic Domain Model)

**What goes wrong**: domain classes hold only data (properties) while all behavior lives in service classes. This is the Anemic Domain Model anti-pattern — it violates Information Expert by separating data from the behavior that operates on it.

**Why it happens**: developers default to putting logic in service classes because it feels more 'service-oriented.' The result is service classes that reach into domain objects to get data, creating tight coupling.

**Mitigation**: ask 'which class has the information needed to fulfill this responsibility?' If `Order` has the line items and prices, `Order.CalculateTotal()` belongs on `Order`, not on `OrderService`.


## Questions

> [!QUESTION]- What is the Information Expert principle and why does it reduce coupling?
> Information Expert assigns responsibility to the class that has the information needed to fulfill it. This keeps related data and behavior together, reducing the need for one class to reach into another to get data. The result is lower coupling and higher cohesion — each class does what it knows.

> [!QUESTION]- How does GRASP differ from SOLID?
> GRASP focuses on responsibility assignment — which class should own a behavior or data. SOLID focuses on design principles for maintainability (single responsibility, open/closed, etc.). They are complementary: GRASP guides initial design decisions; SOLID guides refactoring and long-term maintainability.


## References

- [GRASP (Wikipedia)](https://en.wikipedia.org/wiki/GRASP_(object-oriented_design)) — overview of all nine principles with definitions and examples.
- [Applying UML and Patterns (Craig Larman)](https://www.oreilly.com/library/view/applying-uml-and/0131489062/) — the book that introduced GRASP; covers all nine principles with detailed worked examples in the context of iterative OO design.
- [[Software Engineering/06 Development Practices/Paradigms/OOP|OOP]] — object-oriented programming fundamentals that GRASP principles build on: encapsulation, polymorphism, and responsibility assignment.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/Patterns/Patterns|Patterns]]
>
<!-- whats-next:end -->
